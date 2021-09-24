# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
from datetime import datetime
from typing import Optional, List

import frappe.utils
from frappe import msgprint
from frappe.core.doctype.sms_settings import sms_settings
from frappe.model.document import Document

_sms_not_configured_message = 'SMS is not configured. SMS notification will not be sent. ' \
                              'Please tell your system administrator to update SMS Settings'
# TODO email reply-to address
_email_reply_to = None


# noinspection PyMethodMayBeStatic
class Job(Document):
    status: str
    assignment: str
    site_component: str
    component_name: str
    assigned_team: str

    def validate(self):
        self._validate_site_component()
        self._validate_team_type()

    def db_update(self):
        is_status_changed = self._is_status_changed()
        self._handle_escalation()
        self._handle_non_compliant()
        super(Job, self).db_update()
        if is_status_changed:
            self._send_escalation_notification()

    def db_insert(self):
        self._handle_escalation()
        self._handle_non_compliant()
        super(Job, self).db_insert()

    def _handle_non_compliant(self):
        if not self.status.startswith('Non-compliant'):
            self.non_compliant_reason = ''

    def _handle_escalation(self):
        if not self.status.startswith('Escalation'):
            self.escalation_reason = ''

    def _is_status_changed(self) -> bool:
        if self.get("__islocal") or not self.name:  # reference: super.db_update
            return False

        old_status = self.get_db_value('status')
        return self.status != old_status

    def _validate_site_component(self):
        if self.assignment is None or self.assignment == '':
            frappe.throw("Missing Assignment")
        if self.site_component is None or self.site_component == '':
            frappe.throw("Missing Site Component")

        assignment_site_id = frappe.db.get_value('Assignment', {'name': self.assignment}, 'site')
        component_site_id = frappe.db.get_value('Site Component', {'name': self.site_component}, 'site')
        if assignment_site_id != component_site_id:
            frappe.throw(f'Component ID {self.site_component} does not belong to '
                         f'the same Site as the Assignment {self.assignment}')

    def _validate_team_type(self):
        if self.assigned_team and self.assigned_team != '':
            team_type = frappe.db.get_value('Team', {'name': self.assigned_team}, 'team_type')
            if team_type != 'Field Crew':
                frappe.throw(f'Team type of team {self.assigned_team} is not Few Crew')

    def _send_escalation_notification(self):
        if not self.status.startswith('Escalation'):
            return

        # TODO ticket #16 send notification
        # if self.status == 'Escalation - Field Lead':
        #     self._send_notification_to_field_lead()
        # elif self.status == 'Escalation - Back Office':
        #     self._send_notification_to_back_office()
        # elif self.status == 'Escalation - Property':
        #     self._send_notification_to_property()
        # elif self.status == 'Escalation - Vendor':
        #     # This classification is used solely for tracking purposes.
        #     # It does not generate notifications and no further action is required.
        #     pass
        # else:
        #     frappe.log(f'Could not send escalation notification because of unknown escalation status {self.status}')

    def _send_notification_to_field_lead(self):
        if not self.assigned_team:
            self._show_messages_to_user(["No Field Crew team assigned to this job. No notification will be sent"])

        error_messages = []
        try:
            error_messages = self._send_sms_to_field_lead()
        except:
            error_messages.append('An error happened when sending SMS messages')
            print(frappe.get_traceback())

        if len(error_messages) > 0:
            self._show_messages_to_user(error_messages)

    def _send_notification_to_back_office(self):
        assignment = frappe.get_doc('Assignment', self.assignment)
        if not assignment.back_office_team:
            self._show_messages_to_user(["No Back Office team assigned to this job. No notification will be sent"])
            return

        error_messages = []
        try:
            error_messages.extend(self._send_sms_to_back_office_team(assignment))
        except:
            error_messages.append('An error happened when sending SMS messages')
            print(frappe.get_traceback())

        try:
            error_messages.extend(self._send_email_to_back_office_team(assignment))
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

        phone_numbers, messages = self._extract_sms_phone_number(team_name=self.assigned_team, role='Field Lead')
        if len(phone_numbers) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''
        sms_settings.send_sms(receiver_list=phone_numbers,
                              msg=f"{self.component_name} escalated to Field Lead by "
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
        if self._is_not_blank(user.mobile_no):
            return user.mobile_no
        return user.phone if self._is_not_blank(user.phone) else None

    def _is_not_blank(self, s: str) -> bool:
        return s is not None and s.strip() != ''

    def _has_role(self, username: str, role: str) -> bool:
        return role in frappe.permissions.get_roles(username)

    def _get_person_name(self, username: str) -> str:
        user = frappe.db.get(doctype='User', filters={'name': username})
        return user.full_name

    def _send_sms_to_back_office_team(self, assignment) -> List[str]:
        if not self._is_sms_configured():
            return [_sms_not_configured_message]

        phone_numbers = []
        messages = []
        for tm in assignment.back_office_team:
            phs, msgs = self._extract_sms_phone_number(team_name=tm.team, role='Back Office Staff')
            phone_numbers.extend(phs)
            messages.extend(msgs)

        if len(phone_numbers) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''
        sms_settings.send_sms(receiver_list=phone_numbers,
                              msg=f"{self.component_name} escalated to Back Office Team by "
                                  f"{self._get_person_name(frappe.session.user)}. "
                                  f"Reason: {self.escalation_reason}. {escalation_note_to_set}")
        return messages

    def _send_email_to_back_office_team(self, assignment) -> List[str]:
        emails = []
        messages = []
        for tm in assignment.back_office_team:
            ems, msgs = self._extract_email_address(team_name=tm.team, role='Back Office Staff')
            emails.extend(ems)
            messages.extend(msgs)

        if len(emails) == 0:
            return messages

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''  # '<br>Escalation Notes: '
        current_datetime: datetime = frappe.utils.now_datetime()

        url_to_job_page = f"{frappe.utils.get_url(full_address=True)}{frappe.utils.get_absolute_url('Job', self.name)}"

        email_subject = f"{assignment.assignment_name} - {self.component_name} Escalated to Back Office Team"
        email_body = f"""<html><body> 
                     <p>Assignment activity for {assignment.site_name} - {self.component_name} 
                     was escalated to Back Office Team at {current_datetime.strftime('%HH:%M')} 
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
        email = user.email if self._is_not_blank(user.email) else ''
        phone = user.mobile_no if self._is_not_blank(user.mobile_no) else user.phone
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

            if self._is_not_blank(user.email):
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

    def _send_notification_to_property(self):
        assignment = frappe.get_doc('Assignment', self.assignment)
        site = frappe.get_doc('Site', assignment.site)

        if site.site_contact is None or len(site.site_contact) == 0:
            self._show_messages_to_user([f'The Site "{site.site_name}" has no contacts. No emails will be sent'])
            return

        emails = []
        for contact in site.site_contact:
            if self._is_not_blank(contact.email_address):
                emails.append(contact.email_address)

        if len(emails) == 0:
            self._show_messages_to_user(
                [f'No contact in the Site "{site.site_name}" has email address. No emails will be sent'])
            return

        # TODO  Notes: [Escalation Note]
        escalation_note_to_set = ''  # '<br>Escalation Notes: '
        current_datetime: datetime = frappe.utils.now_datetime()

        email_subject = f"{assignment.assignment_name} - {self.component_name} Escalated to Property Management"
        email_body = f"""<html><body> 
                     <p>Assignment activity for {assignment.site_name} - {self.component_name} 
                     was escalated to Property Management at {current_datetime.strftime('%H:%M')} 
                     on {current_datetime.strftime('%m/%d/%Y')} with the following details:</p> 
                     <p>
                     <br>Reason: {self.escalation_reason}
                     {escalation_note_to_set}
                     <br>Escalation Source: {self._get_person_name_email_phone(frappe.session.user)}
                     </p></body></html>"""

        frappe.sendmail(recipients=emails,
                        reply_to=_email_reply_to,
                        subject=email_subject,
                        message=email_body)

    def _show_messages_to_user(self, messages: List[str]):
        # raise_exception=False means don't rollback
        if len(messages) == 1:
            msgprint(messages[0], raise_exception=False)
        elif len(messages) > 1:
            msgprint(f'<ul><li>{"<li> ".join(messages)}</ul>', raise_exception=False)
