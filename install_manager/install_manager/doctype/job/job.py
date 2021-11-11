# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
from datetime import datetime, timedelta
from typing import Optional, List

import frappe.utils
from frappe import msgprint
from frappe.core.doctype.sms_settings import sms_settings
from frappe.model.document import Document

from install_manager.install_manager.doctype.job.job_status import READY, NO_COMPLIANT, IN_PROGRESS
from install_manager.install_manager.doctype.team.team_type import LEVEL_1, LEVEL_2
from install_manager.install_manager.doctype.team.user_role import FIELD_LEAD, INSTALLER, BACK_OFFICE
from install_manager.install_manager.utilities import common_utils

_sms_not_configured_message = 'SMS is not configured. SMS notification will not be sent. ' \
                              'Please tell your system administrator to update SMS Settings'
# TODO email reply-to address
_email_reply_to = None


# noinspection PyMethodMayBeStatic
class Job(Document):
    status: str
    schedule: str
    site_unit: str
    unit_name: str
    assigned_team: str

    def validate(self):
        self._validate_site_unit()
        self._validate_team_type()

    def db_update(self):
        self._authorize_update()
        old_status = self._get_old_status()
        is_status_changed = old_status != self.status
        if is_status_changed and self.status == READY:
            frappe.throw(f'Once a Job has been moved out of {READY} state, it cannot be moved back')
        self._validate_escalation()
        self._validate_non_compliant()
        self._update_progress_start_time()
        super(Job, self).db_update()
        if is_status_changed:
            self._update_timer(old_status)
            self._send_escalation_notification()

    def onload(self):
        self._authorize_update()

    def _authorize_update(self):
        if frappe.session.user == 'Administrator':
            return
        if not self._has_role(username=frappe.session.user, role=FIELD_LEAD) \
                and not self._has_role(username=frappe.session.user, role=INSTALLER):
            return
        if self.assigned_team is None or self.assigned_team == '':
            frappe.throw('This Job is not assigned to your team. You could not work on it')

        team = frappe.get_doc('Team', self.assigned_team)
        for tm in team.team_member:
            if tm.member == frappe.session.user:
                return
        frappe.throw('This Job is not assigned to your team. You could not work it')

    def db_insert(self):
        if self.status is None or self.status == '':
            self.status = READY
        self._validate_escalation()
        self._validate_non_compliant()
        self._update_progress_start_time()
        super(Job, self).db_insert()
        self._update_timer(old_status=None)

    def _update_progress_start_time(self):
        # update denormalize field
        if self.status == IN_PROGRESS:
            self.in_progress_start_time = frappe.utils.now_datetime()
        else:
            self.in_progress_start_time = None

    def _validate_non_compliant(self):
        if not self.status.startswith(NO_COMPLIANT):
            self.non_compliant_reason = ''

    def _validate_escalation(self):
        if not self.status.startswith('Escalation'):
            self.escalation_reason = ''

    def _get_old_status(self) -> Optional[str]:
        if self.get("__islocal") or not self.name:  # reference: super.db_update
            return None

        return self.get_db_value('status')

    def _validate_site_unit(self):
        if self.schedule is None or self.schedule == '':
            frappe.throw("Missing Schedule")
        if self.site_unit is None or self.site_unit == '':
            frappe.throw("Missing Site Unit")

        schedule_site_id = frappe.db.get_value('Schedule', {'name': self.schedule}, 'site')
        component_site_id = frappe.db.get_value('Site Unit', {'name': self.site_unit}, 'site')
        if schedule_site_id != component_site_id:
            frappe.throw(f'Component ID {self.site_unit} does not belong to '
                         f'the same Site as the Schedule {self.schedule}')

    def _validate_team_type(self):
        if self.assigned_team and self.assigned_team != '':
            team_type = frappe.db.get_value('Team', {'name': self.assigned_team}, 'team_type')
            if team_type != LEVEL_1:
                frappe.throw(f'Team type of team {self.assigned_team} is not {LEVEL_1}')

    def _send_escalation_notification(self):
        if not self.status.startswith('Escalation'):
            return

        # TODO ticket #16 send notification
        # if self.status == 'Escalation - Field Lead':
        #     self._send_notification_to_field_lead()
        # elif self.status == 'Escalation - Back Office':
        #     self._send_notification_to_back_office()
        # elif self.status == 'Escalation - Vendor':
        #     # This classification is used solely for tracking purposes.
        #     # It does not generate notifications and no further action is required.
        #     pass
        # else:
        #     frappe.log(f'Could not send escalation notification because of unknown escalation status {self.status}')

    def _send_notification_to_field_lead(self):
        if not self.assigned_team:
            self._show_messages_to_user(["No Level I Team team assigned to this job. No notification will be sent"])

        error_messages = []
        try:
            error_messages = self._send_sms_to_field_lead()
        except:
            error_messages.append('An error happened when sending SMS messages')
            print(frappe.get_traceback())

        if len(error_messages) > 0:
            self._show_messages_to_user(error_messages)

    def _send_notification_to_back_office(self):
        schedule = frappe.get_doc('Schedule', self.schedule)
        if not schedule.assigned_teams:
            self._show_messages_to_user([f"No {LEVEL_2} assigned to this job. No notification will be sent"])
            return

        error_messages = []
        try:
            error_messages.extend(self._send_sms_to_assigned_teams(schedule))
        except:
            error_messages.append('An error happened when sending SMS messages')
            print(frappe.get_traceback())

        try:
            error_messages.extend(self._send_email_to_assigned_teams(schedule))
        except:
            error_messages.append('An error happened when sending emails')
            print(frappe.get_traceback())

        if len(error_messages) > 0:
            self._show_messages_to_user(error_messages)

    def _send_sms_to_field_lead(self) -> List[str]:
        """
        :return: list of message to show to the user, if any
        """

        if not self._is_sms_configured():
            return [_sms_not_configured_message]

        phone_numbers, messages = self._extract_sms_phone_number(team_name=self.assigned_team, role=FIELD_LEAD)
        if len(phone_numbers) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''
        sms_settings.send_sms(receiver_list=phone_numbers,
                              msg=f"{self.unit_name} escalated to {FIELD_LEAD} by "
                                  f"{self._get_person_name(frappe.session.user)}. "
                                  f"Reason: {self.escalation_reason}. {escalation_note_to_set}")
        return messages

    def _is_sms_configured(self) -> bool:
        return frappe.db.get_value('SMS Settings', None, 'sms_gateway_url') is not None

    def _extract_sms_phone_number(self, team_name: str, role: str):
        team = frappe.get_doc('Team', team_name)

        users_has_no_phone = []
        phone_numbers = []
        for tm in team.team_member:
            if not self._has_role(username=tm.member, role=role):
                continue

            user = frappe.db.get(doctype='User', filters={'name': tm.member})

            number = self._get_phone_number_for_sms(user)
            if number is None:
                users_has_no_phone.append(user.name)
            else:
                phone_numbers.append(number)

        if len(users_has_no_phone) == 1:
            return phone_numbers, [f"The user {users_has_no_phone[0]} has no phone number. "
                                   f"No notification will be sent this user"]
        if len(users_has_no_phone) > 1:
            return phone_numbers, [f"Users {', '.join(users_has_no_phone)} have no phone number. "
                                   f"No notification will be sent to them"]
        return phone_numbers, []

    def _get_phone_number_for_sms(self, user) -> Optional[str]:
        if user is None:
            return None
        if common_utils.is_not_blank(user.mobile_no):
            return user.mobile_no
        return user.phone if common_utils.is_not_blank(user.phone) else None

    def _has_role(self, username: str, role: str) -> bool:
        return role in frappe.permissions.get_roles(username)

    def _get_person_name(self, username: str) -> str:
        user = frappe.db.get(doctype='User', filters={'name': username})
        return user.full_name

    def _send_sms_to_assigned_teams(self, schedule) -> List[str]:
        if not self._is_sms_configured():
            return [_sms_not_configured_message]

        phone_numbers = []
        messages = []
        for tm in schedule.assigned_teams:
            phs, msgs = self._extract_sms_phone_number(team_name=tm.team, role=BACK_OFFICE)
            phone_numbers.extend(phs)
            messages.extend(msgs)

        if len(phone_numbers) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''
        sms_settings.send_sms(receiver_list=phone_numbers,
                              msg=f"{self.unit_name} escalated to {LEVEL_2} by "
                                  f"{self._get_person_name(frappe.session.user)}. "
                                  f"Reason: {self.escalation_reason}. {escalation_note_to_set}")
        return messages

    def _send_email_to_assigned_teams(self, schedule) -> List[str]:
        emails = []
        messages = []
        for tm in schedule.assigned_teams:
            ems, msgs = self._extract_email_address(team_name=tm.team, role=BACK_OFFICE)
            emails.extend(ems)
            messages.extend(msgs)

        if len(emails) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''  # '<br>Escalation Notes: '
        current_datetime: datetime = frappe.utils.now_datetime()

        url_to_job_page = f"{frappe.utils.get_url(full_address=True)}{frappe.utils.get_absolute_url('Job', self.name)}"

        email_subject = f"{schedule.schedule_name} - {self.unit_name} Escalated to {LEVEL_2}"
        email_body = f"""<html><body> 
                     <p>Schedule activity for {schedule.site_name} - {self.unit_name} 
                     was escalated to {LEVEL_2} at {current_datetime.strftime('%HH:%M')} 
                     on {current_datetime.strftime('%m/%d/%Y')} with the following details:</p> 
                     <p>
                     <br>Reason: {self.escalation_reason}
                     {escalation_note_to_set}
                     <br>Escalation Source: {self._get_person_name_email_phone(frappe.session.user)}
                     <br><a href="{url_to_job_page}">Go to Job detail</a>
                     </p></body></html>"""

        frappe.sendmail(recipients=emails,
                        reply_to=_email_reply_to,
                        subject=email_subject,
                        message=email_body)
        return messages

    def _get_person_name_email_phone(self, username: str) -> str:
        user = frappe.db.get(doctype='User', filters={'name': username})
        email = user.email if common_utils.is_not_blank(user.email) else ''
        phone = user.mobile_no if common_utils.is_not_blank(user.mobile_no) else user.phone
        if phone is None:
            phone = ''

        if email != '' or phone != '':
            return f'{user.full_name}, {email} {phone}'

        return user.full_name

    def _extract_email_address(self, team_name: str, role: str):
        team = frappe.get_doc('Team', team_name)

        users_has_email = []
        email_addresses = []
        for tm in team.team_member:
            if not self._has_role(username=tm.member, role=role):
                continue

            user = frappe.db.get(doctype='User', filters={'name': tm.member})

            if common_utils.is_not_blank(user.email):
                email_addresses.append(user.email)
            else:
                users_has_email.append(user.name)

        if len(users_has_email) == 1:
            return email_addresses, [f"The user {users_has_email[0]} has no phone number. "
                                     f"No emails will be sent to this user"]
        if len(users_has_email) > 1:
            return email_addresses, [f"Users {', '.join(users_has_email)} have no phone number. "
                                     f"No emails will be sent to them"]
        return email_addresses, []

    def _show_messages_to_user(self, messages: List[str]):
        # raise_exception=False means don't rollback
        if len(messages) == 1:
            msgprint(messages[0], raise_exception=False)
        elif len(messages) > 1:
            msgprint(f'<ul><li>{"<li> ".join(messages)}</ul>', raise_exception=False)

    def _update_timer(self, old_status: Optional[str]):
        if old_status == self.status:
            return

        last_timer = Job.get_last_timer(job_id=self.name)

        if self.status == IN_PROGRESS:
            if last_timer is not None and last_timer.get('stop_time') is None:
                # something is wrong with the data, correct it. Consider this is a up-to-date start time
                frappe.db.sql("""
                                            update `tabJob Timer`
                                            set start_time = %(start_time)s,
                                                duration_minutes = 0,
                                                stop_status = null
                                            where name = %(timer_id)s
                                        """,
                              values={
                                  'timer_id': last_timer['timer_id'],
                                  'start_time': self.in_progress_start_time
                              },
                              debug=False)
            else:
                frappe.get_doc({
                    'doctype': 'Job Timer',
                    'job': self.name,
                    'start_time': self.in_progress_start_time,
                    'stop_time': None,
                    'stop_status': None,
                    'duration_minutes': 0
                }).insert()
        elif old_status == IN_PROGRESS:
            start_time = last_timer['start_time']
            stop_time = frappe.utils.now_datetime()
            duration: timedelta = stop_time - start_time
            frappe.db.sql("""
                                        update `tabJob Timer`
                                        set stop_time = %(stop_time)s,
                                            duration_minutes = %(duration_minutes)s,
                                            stop_status = %(stop_status)s
                                        where name = %(timer_id)s
                                    """,
                          values={
                              'timer_id': last_timer['timer_id'],
                              'stop_time': stop_time,
                              'stop_status': self.status,
                              'duration_minutes': round(duration.total_seconds() / 60)
                          },
                          debug=False)

        # update denormalize field
        self.finished_timer_minutes = Job.get_total_finished_timer(job_id=self.name)
        frappe.db.sql("update `tabJob` set finished_timer_minutes = %(finished_timer_minutes)s where name = %(job_id)s",
                      values={'job_id': self.name, 'finished_timer_minutes': Job.get_total_finished_timer(job_id=self.name)},
                      debug=False, as_dict=True)

    @staticmethod
    def get_last_timer(job_id) -> Optional[dict]:
        last_timers = frappe.db.sql("""
                                select name as timer_id, start_time, stop_time
                                from `tabJob Timer`
                                where job = %(job_id)s
                                order by start_time desc
                                limit 1
                                """,
                                    values={'job_id': job_id},
                                    debug=False,
                                    as_dict=True
                                    )
        return None if len(last_timers) == 0 else last_timers[0]

    @staticmethod
    def get_total_finished_timer(job_id) -> int:
        totals = frappe.db.sql("""
                                select sum(duration_minutes) total_minutes
                                from `tabJob Timer`
                                where job = %(job_id)s and stop_time is not null
                                """,
                               values={'job_id': job_id},
                               debug=False,
                               as_dict=True
                               )
        return 0 if len(totals) == 0 else totals[0]['total_minutes']
