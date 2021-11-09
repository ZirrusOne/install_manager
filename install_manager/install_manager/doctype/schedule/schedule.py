# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document

from install_manager.install_manager.doctype.team.team_type import LEVEL_2, LEVEL_3


class Schedule(Document):

    def validate(self):
        self._validate_team_type()

    def db_insert(self):
        self._fill_default_company()
        super(Schedule, self).db_insert()

    def db_update(self):
        self._fill_default_company()
        is_schedule_name_change = self.schedule_name != self.get_db_value('schedule_name')

        super(Schedule, self).db_update()
        if is_schedule_name_change:
            self._update_linked_schedule_names()

    def _fill_default_company(self):
        if self.parent_company is None or self.parent_company == '':
            self.parent_company = frappe.db.get_value('Global Defaults', None, 'default_company')

    def _update_linked_schedule_names(self):
        conditions, values = frappe.db.build_conditions({'schedule': ('=', self.name)})
        values['schedule_name'] = self.schedule_name

        frappe.db.sql("UPDATE `tabJob` SET schedule_name =  %(schedule_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

    def _validate_team_type(self):
        # assigned_teams is a list of ScheduleTeam object
        if self.assigned_teams is not None and len(self.assigned_teams) > 0:
            count_level_2 = 0
            count_level_3 = 0
            for scheduleBo in self.assigned_teams:
                team_type = frappe.db.get_value('Team', {'name': scheduleBo.team}, 'team_type')
                if team_type == LEVEL_2:
                    count_level_2 = count_level_2 + 1
                if team_type == LEVEL_3:
                    count_level_3 = count_level_3 + 1

            if count_level_2 > 1:
                frappe.throw(f'Only one {LEVEL_2} can be assigned. Found {count_level_2}')
            if count_level_3 > 1:
                frappe.throw(f'Only one {LEVEL_3} can be assigned. Found {count_level_3}')
