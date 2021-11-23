# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
from datetime import datetime, timedelta
from typing import Optional, List

import frappe.utils
from frappe import msgprint
from frappe.core.doctype.sms_settings import sms_settings
from frappe.model.document import Document

from install_manager.install_manager.doctype.escalation_record.escalation_record import EscalationRecord
from install_manager.install_manager.doctype.job import job_status
from install_manager.install_manager.doctype.job.job_status import READY, NON_COMPLIANT, IN_PROGRESS, COMPLETED
from install_manager.install_manager.doctype.job_checklist.job_checklist import JobChecklist
from install_manager.install_manager.doctype.job_timer.job_timer import JobTimer
from install_manager.install_manager.doctype.team.team import Team
from install_manager.install_manager.doctype.team.team_type import LEVEL_1
from install_manager.install_manager.doctype.team.user_role import FIELD_LEAD, INSTALLER
from install_manager.install_manager.utilities import common_utils

_sms_not_configured_message = 'SMS is not configured. SMS notification will not be sent. ' \
                              'Please tell your system administrator to update SMS Settings'
_email_reply_to = 'notificatio-noreply@zirrusone.com'


# noinspection PyMethodMayBeStatic
class Job(Document):
    status: str
    schedule: str
    site_unit: str
    unit_name: str
    assigned_team: str
    checklist: List[JobChecklist]

    def validate(self):
        self._validate_site_unit()
        self._validate_team_type()
        self._validate_checklist()

    def db_update(self):
        self._authorize_update()
        old_status = self._get_old_status()
        if old_status != self.status and self.status == READY:
            frappe.throw(f'Once a Job has been moved out of {READY} state, it cannot be moved back')
        self._validate_escalation()
        self._validate_non_compliant()
        self._update_progress_start_time()
        super(Job, self).db_update()
        self._update_timer(old_status=old_status)
        self._record_escalation(old_status=old_status)

    def onload(self):
        self._authorize_update()

    def _authorize_update(self):
        if frappe.session.user == 'Administrator':
            return
        if not self._has_role(username=frappe.session.user, role=FIELD_LEAD) \
                and not self._has_role(username=frappe.session.user, role=INSTALLER):
            return
        if common_utils.is_blank(self.assigned_team):
            frappe.throw('This Job is not assigned to your team. You could not work on it')

        team = frappe.get_doc('Team', self.assigned_team)
        for tm in team.team_member:
            if tm.member == frappe.session.user:
                return
        frappe.throw('This Job is not assigned to your team. You could not work it')

    # noinspection PyAttributeOutsideInit
    def db_insert(self):
        if common_utils.is_blank(self.status):
            self.status = READY
        self._validate_escalation()
        self._validate_non_compliant()
        self._update_progress_start_time()
        self._add_checklist()
        super(Job, self).db_insert()
        self._update_timer(old_status=None)
        self._record_escalation(old_status=None)

    def _add_checklist(self):
        schedule = frappe.get_doc('Schedule', self.schedule)
        checklist = None
        if common_utils.is_not_blank(schedule.checklist):
            checklist = frappe.get_doc('Checklist', schedule.checklist)

        existing_checks = {}
        for check in self.checklist:
            existing_checks[f'{check.criterion}__{check.criterion_type}'] = check

        for check in checklist.checks:
            key = f'{check.criterion}__{check.criterion_type}'
            if key not in existing_checks:
                _append_check_to_job_checklist(check, self)

    def _update_progress_start_time(self):
        # update denormalize field
        if self.status == IN_PROGRESS:
            self.in_progress_start_time = frappe.utils.now_datetime()
            if self._has_role(username=frappe.session.user, role=FIELD_LEAD) \
                    or self._has_role(username=frappe.session.user, role=INSTALLER):
                self.in_progress_installer = frappe.session.user
            else:
                self.in_progress_installer = None
        else:
            self.in_progress_start_time = None
            self.in_progress_installer = None

    def _validate_non_compliant(self):
        if self.status != NON_COMPLIANT:
            self.non_compliant_reason = ''
        elif common_utils.is_blank(self.non_compliant_reason):
            frappe.throw('Missing Non-compliant reason')

    def _validate_escalation(self):
        if not self._is_escalating():
            self.escalation_reason = None
            self.escalation_note = None
        elif common_utils.is_blank(self.escalation_reason):
            frappe.throw('Missing Escalation Reason')

    def _is_escalating(self) -> bool:
        return job_status.is_escalation_status(self.status)

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
        if not common_utils.is_blank(self.assigned_team):
            t_type = frappe.db.get_value('Team', {'name': self.assigned_team}, 'team_type')
            if t_type != LEVEL_1:
                frappe.throw(f'Team type of team {self.assigned_team} is not {LEVEL_1}')

    def _validate_checklist(self):
        if self.checklist is not None:
            for chk in self.checklist:
                result = chk.result
                if chk.criterion_type == 'checkbox' and result is not None and result not in ['0', '1', 0, 1]:
                    frappe.throw(f'Wrong response data for checklist check {chk.criterion}')

    def _record_escalation(self, old_status: Optional[str]):
        if old_status == self.status \
                or (not job_status.is_escalation_status(old_status) and not job_status.is_escalation_status(self.status)):
            return

        last_escalation = EscalationRecord.get_escalation_record(job_id=self.name)

        if self._is_escalating():
            escalation_level = job_status.get_escalation_team_type(self.status)
            team = None
            if escalation_level == LEVEL_1:
                if common_utils.is_blank(self.assigned_team):
                    frappe.throw(f'Could not escalate to {LEVEL_1} as there is no team assigned to this Job')
                team = frappe.get_doc('Team', self.assigned_team)
            else:
                schedule = frappe.get_doc('Schedule', self.schedule)

                if not schedule.assigned_teams or len(schedule.assigned_teams) == 0:
                    self._show_messages_to_user([f"Cannot escalate because there is no {escalation_level} assigned to this job"],
                                                raise_exception=True)
                    return
                for schteam in schedule.assigned_teams:
                    team_tmp = frappe.get_doc('Team', schteam.team)
                    if team_tmp.team_type == escalation_level:
                        team = team_tmp
                        break
                if team is None:
                    self._show_messages_to_user([f"Cannot escalate because there is no {escalation_level} assigned to this job"],
                                                raise_exception=True)
                    return

            escalation_level_count = EscalationRecord.count_escalation_impacted_level(job_id=self.name, impacted_level=escalation_level)

            if last_escalation is not None and last_escalation.resolution_time is None:
                if self.status == last_escalation.escalation_status:
                    # something is wrong with the data, correct it. Consider this is a up-to-date escalation
                    last_escalation.update({
                        'escalation_time': frappe.utils.now_datetime(),
                        'from_status': old_status,
                        'escalation_status': self.status,
                        'escalation_user': frappe.session.user,
                        'escalation_level': escalation_level,
                        'escalation_reason': self.escalation_reason,
                        'escalation_team': team.name
                    })
                    last_escalation.save(ignore_permissions=True)
                else:
                    # escalate to other level, resolve last escalation
                    self._update_escalation_resolution(last_escalation)

                    # by escalation to other level
                    self._record_new_escalation(old_status=old_status, escalation_level=escalation_level,
                                                escalation_team=team.name)
            else:
                self._record_new_escalation(old_status=old_status, escalation_level=escalation_level,
                                            escalation_team=team.name)

            if escalation_level_count == 0:
                self._send_escalation_notification(to_team=team)
            else:
                _log_info(f'Job {self.name} has been escalated to {escalation_level} {escalation_level_count} time(s). Skip notification')
        elif last_escalation is not None:
            self._update_escalation_resolution(last_escalation)

    def _update_escalation_resolution(self, last_escalation: EscalationRecord):
        last_escalation.update({
            'resolution_user': frappe.session.user,
            'resolution_time': frappe.utils.now_datetime(),
            'resolution_status': self.status,
        })
        last_escalation.save(ignore_permissions=True)

    def _record_new_escalation(self, old_status: str, escalation_level: str, escalation_team: str):
        frappe.get_doc({
            'doctype': 'Escalation Record',
            'job': self.name,
            'escalation_time': frappe.utils.now_datetime(),
            'from_status': old_status,
            'escalation_status': self.status,
            'escalation_user': frappe.session.user,
            'escalation_level': escalation_level,
            'escalation_reason': self.escalation_reason,
            'escalation_team': escalation_team,
            'escalation_note': self.escalation_note,
            'resolution_user': None,
            'resolution_time': None,
            'resolution_status': None
        }).insert()

    def _send_escalation_notification(self, to_team: Team):
        pass

        # determine users to sent notification to
        notified_user_ids = []
        for tm in to_team.team_member:
            if to_team.team_type == LEVEL_1:
                if self._has_role(username=tm.member, role=FIELD_LEAD):
                    notified_user_ids.append(tm.member)
            else:
                notified_user_ids.append(tm.member)

        if len(notified_user_ids) == 0:
            _log_error(f'No eligible team member to send notification to. Team: {to_team.name}')
            return

        messages = []
        if to_team.team_type == LEVEL_1:
            messages.extend(self._send_sms_no_exception(user_ids=notified_user_ids, level=to_team.team_type))
        else:
            messages.extend(self._send_sms_no_exception(user_ids=notified_user_ids, level=to_team.team_type))
            messages.extend(self._send_email_no_exception(user_ids=notified_user_ids, level=to_team.team_type))

        if len(messages) > 0:
            self._show_messages_to_user(messages, raise_exception=False)

    # noinspection PyBroadException
    def _send_sms_no_exception(self, user_ids: List[str], level: str) -> List[str]:
        try:
            return self._send_sms_to_users(user_ids=user_ids, level=level)
        except:
            print(frappe.get_traceback())
            return ['Data changes were save but an error happened when sending escalation notifications via SMS messages']

    def _send_sms_to_users(self, user_ids: List[str], level: str) -> List[str]:
        users_has_no_phone = []
        phone_numbers = []
        messages = []
        for user_id in user_ids:
            user = frappe.get_doc('User', user_id)
            if common_utils.is_not_blank(user.mobile_no):
                phone_numbers.append(user.mobile_no)
            else:
                users_has_no_phone.append(user_id)

        if len(users_has_no_phone) == 1:
            messages.append(f"The user {users_has_no_phone[0]} has no phone number. "
                            f"No notification will be sent this user")
        if len(users_has_no_phone) > 1:
            messages.append(f"Users {', '.join(users_has_no_phone)} have no phone number. "
                            f"No notification will be sent to them")

        if len(phone_numbers) > 0:
            escalation_note = '' if self.escalation_note is None else self.escalation_note
            messages.extend(
                self._send_sms(receiver_list=phone_numbers,
                               msg=f"{self.unit_name} escalated to {level} by "
                                   f"{self._get_person_name(frappe.session.user)}. "
                                   f"Reason: {self.escalation_reason}. {escalation_note}"))
        return messages

    def _send_sms(self, receiver_list: List[str], msg: str) -> List[str]:
        _log_info(f'Sending SMS to {receiver_list}. Content: {msg}')
        is_sms_configured = frappe.db.get_value('SMS Settings', None, 'sms_gateway_url') is not None
        if not is_sms_configured:
            _log_error('SMS is not configured')
            return [_sms_not_configured_message]
        sms_settings.send_sms(receiver_list=receiver_list, msg=msg,
                              success_msg=False  # don't popup a message on the page after sent
                              )
        return []

    # noinspection PyBroadException
    def _send_email_no_exception(self, user_ids: List[str], level: str) -> List[str]:
        try:
            return self._send_email_to_users(user_ids=user_ids, level=level)
        except:
            print(frappe.get_traceback())
            return ['Data changes were save but an error happened when sending escalation notifications via email messages']

    def _send_email_to_users(self, user_ids: List[str], level: str) -> List[str]:
        emails = []
        users_has_no_email = []
        messages = []
        for user_id in user_ids:
            user = frappe.get_doc('User', user_id)
            if common_utils.is_not_blank(user.email):
                emails.append(user.email)
            else:
                users_has_no_email.append(user.name)

        if len(users_has_no_email) == 1:
            messages.append(f"The user {users_has_no_email[0]} has no phone number. "
                            f"No emails will be sent to this user")
        if len(users_has_no_email) > 1:
            messages.append(f"Users {', '.join(users_has_no_email)} have no phone number. "
                            f"No emails will be sent to them")

        if len(emails) > 0:
            schedule = frappe.get_doc('Schedule', self.schedule)
            current_datetime: datetime = frappe.utils.now_datetime()
            email_subject = f"{schedule.schedule_name} - {self.unit_name} Escalated to {level}"
            escalation_note = '' if self.escalation_note is None else f'<br>Note: {self.escalation_note}'
            email_body = f"""<html><body> 
                         <p>Schedule activity for {schedule.site_name} - {self.unit_name} 
                         was escalated to {level} at {current_datetime.strftime('%H:%M')} 
                         on {current_datetime.strftime('%m/%d/%Y')} with the following details:</p> 
                         <p>
                         <br>Reason: {self.escalation_reason}.
                         {escalation_note}
                         <br>Escalation Source: {self._get_person_name_email_phone(frappe.session.user)}
                         </p></body></html>"""

            self._send_email(recipients=emails,
                             reply_to=_email_reply_to,
                             subject=email_subject,
                             message=email_body)
        return messages

    def _send_email(self, recipients: List[str], reply_to: str, subject: str, message: str):
        _log_info(f'Sending email to {recipients}. Subject {subject}. Content: {message}')
        frappe.sendmail(recipients=recipients,
                        reply_to=reply_to,
                        subject=subject,
                        message=message,
                        delayed=False)

    # noinspection PyUnresolvedReferences
    def _has_role(self, username: str, role: str) -> bool:
        return role in frappe.permissions.get_roles(username)

    def _get_person_name(self, username: str) -> str:
        user = frappe.db.get(doctype='User', filters={'name': username})
        return user.full_name

    def _get_person_name_email_phone(self, username: str) -> str:
        user = frappe.db.get(doctype='User', filters={'name': username})
        email = user.email if common_utils.is_not_blank(user.email) else ''
        phone = user.mobile_no if common_utils.is_not_blank(user.mobile_no) else user.phone
        if phone is None:
            phone = ''

        if email != '' or phone != '':
            return f'{user.full_name}, {email} {phone}'

        return user.full_name

    def _show_messages_to_user(self, messages: List[str], raise_exception=False):
        # raise_exception=False means don't rollback
        if len(messages) == 1:
            msgprint(messages[0], raise_exception=raise_exception)
        elif len(messages) > 1:
            msgprint(f'<ul><li>{"<li> ".join(messages)}</ul>', raise_exception=raise_exception)

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
        self.finished_timer_minutes = JobTimer.get_total_finished_timer(job_id=self.name)
        frappe.db.sql("update `tabJob` set finished_timer_minutes = %(finished_timer_minutes)s where name = %(job_id)s",
                      values={'job_id': self.name, 'finished_timer_minutes': self.finished_timer_minutes},
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


def _log_info(msg):
    frappe.logger().info(msg)
    # Frappe always writes log to file. See frappe.utils.logger.get_logger
    print(repr(msg))


def _log_error(msg):
    frappe.logger().error(msg)
    # Frappe always writes log to file. See frappe.utils.logger.get_logger
    print(repr(msg))


@frappe.whitelist()
def get_job_installer(job_id):
    job = frappe.get_doc('Job', job_id)
    if job.in_progress_installer is None or job.in_progress_installer == '':
        return {
            'full_name': None,
            'user_id': None
        }

    user = frappe.db.get(doctype='User', filters={'name': job.in_progress_installer})
    # user might be deleted, no foreign key constraint in DB!
    if user is not None:
        return {
            'full_name': user.full_name,
            'user_id': job.in_progress_installer
        }

    _log_error(f'Installer {job.in_progress_installer} does not exist')
    return {
        'full_name': job.in_progress_installer,
        'user_id': job.in_progress_installer
    }


@frappe.whitelist()
def generate_jobs(schedule_id):
    if common_utils.is_blank(schedule_id):
        frappe.throw('Schedule ID is not provided')

    schedule = frappe.get_doc('Schedule', schedule_id)

    units = frappe.db.sql("""
                                select name, full_name, building_number, floor_number
                                from `tabSite Unit`
                                where site = %(site_id)s
                                """,
                          values={'site_id': schedule.site},
                          debug=False,
                          as_dict=True
                          )
    if len(units) == 0:
        frappe.throw(f'Site {schedule.site_name} has no Site Unit')

    total_inserts = 0
    total_duplications = 0
    for unit in units:
        existing_job = frappe.db.get(doctype='Job', filters={'schedule': schedule_id, 'site_unit': unit['name']})
        if existing_job is None:
            frappe.get_doc({
                'doctype': 'Job',
                'schedule': schedule_id,
                'site_unit': unit['name'],
                'installation_date': schedule.start_date,
                'schedule_name': schedule.schedule_name,
                'unit_name': unit['full_name'],
                'site_name': schedule.site_name,
                'status': job_status.READY,
                'installation_type': 'Standard',
                'building_number': unit['building_number'],
                'floor_number': unit['floor_number']
            }).insert()
            total_inserts = total_inserts + 1
        else:
            total_duplications = total_duplications + 1

    no_start_date_msg = ''
    if schedule.start_date is None and total_inserts > 0:
        no_start_date_msg = 'The schedule has no Start Date. Created Jobs will have no Installation Date either'

    if total_duplications == 0:
        return {
            'message': f'{total_inserts} new Jobs created for Schedule {schedule.schedule_name} '
                       f'from Site {schedule.site_name}. {no_start_date_msg}.'
        }

    return {
        'message': f'{total_inserts} new Jobs created. {total_duplications} duplicate Jobs were detected and skipped. '
                   f'{no_start_date_msg}.'
    }


@frappe.whitelist()
def update_checklist(checklist_id):
    if common_utils.is_blank(checklist_id):
        frappe.throw('The Checklist to update is not provided')

    checklist = frappe.get_doc('Checklist', checklist_id)

    result_list = frappe.db.sql(f"""
            select job.name as job_id
            from `tabJob` job 
            inner join `tabSchedule` schedule on job.schedule = schedule.name
    		where 
    		    schedule.status <> 'Completed' and schedule.status <> 'Cancelled'
    		    and job.status <> '{COMPLETED}' and job.status <> '{NON_COMPLIANT}'
    		    and schedule.checklist = %(checklist_id)s
        """,
                                values={'checklist_id': checklist_id},
                                debug=False,
                                as_dict=True)

    total_checks_disabled = 0
    total_checks_updated = 0
    total_check_added = 0
    number_jobs_updated = 0

    standard_checks = {}
    for check in checklist.checks:
        standard_checks[f'{check.criterion}__{check.criterion_type}'] = check

    for row in result_list:
        job = frappe.get_doc('Job', row['job_id'])

        has_update = False
        existing_checks = []
        for job_check in job.checklist:
            key = f'{job_check.criterion}__{job_check.criterion_type}'
            if key not in standard_checks:
                job_check.enabled = False
                has_update = True
                total_checks_disabled = total_checks_disabled + 1
            else:
                existing_checks.append(key)
                if job_check.checklist_type != standard_checks[key].checklist_type:
                    job_check.checklist_type = standard_checks[key].checklist_type
                    total_checks_updated = total_checks_updated + 1
                    has_update = True

        new_checks = standard_checks.keys() - existing_checks
        if len(new_checks) > 0:
            has_update = True
            for key in new_checks:
                total_check_added = total_check_added + 1
                _append_check_to_job_checklist(standard_checks[key], job)
        if has_update:
            job.save()
            number_jobs_updated = number_jobs_updated + 1

    return {
        'message': f'{number_jobs_updated} Jobs updated. {total_check_added} checks added. '
                   f'{total_checks_updated} checks updated. {total_checks_disabled} checks disabled'
    }


def _append_check_to_job_checklist(check, job):
    job.append('checklist', {
        "criterion": check.criterion,
        "criterion_type": check.criterion_type,
        "checklist_type": check.checklist_type,
        "result": None,
        "enabled": True
    })

