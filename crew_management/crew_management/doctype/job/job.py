# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe.utils
from frappe.model.document import Document


class Job(Document):

    def validate(self):
        self._validate_site_component()
        self._validate_team_type()

    def db_update(self):
        self._handle_escalation()
        self._handle_non_compliant()
        super(Job, self).db_update()

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
        elif self._is_status_changed():
            # TODO ticket #16 send notification
            if self.status == 'Escalation - Field Lead':
                frappe.log('TODO to notify field lead')
            elif self.status == 'Escalation - Back Office':
                frappe.log('TODO to notify Back office')
            elif self.status == 'Escalation - Property':
                frappe.log('TODO to notify Property')
            elif self.status == 'Escalation - Vendor':
                # This classification is used solely for tracking purposes.
                # It does not generate notifications and no further action is required.
                pass
            else:
                frappe.log(f'Unknown escalation status {self.status}')

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
