# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

from typing import List

import frappe
import frappe.permissions
from frappe.model.document import Document

from install_manager.install_manager.doctype.team.team_type import LEVEL_2, LEVEL_3, LEVEL_1
from install_manager.install_manager.utilities import db_utils


class Team(Document):

    def after_rename(self, old: str, new: str, merge: bool):
        # update foreign keys
        # child doctype has already been taken care by frappe

        frappe.db.sql("""
                            update `tabSchedule Teams`
                            set team = %(new_name)s
                            where team = %(old_name)s
                        """,
                      values={'old_name': old, 'new_name': new},
                      debug=False)

        frappe.db.sql("""
                                update `tabJob`
                                set assigned_team = %(new_name)s
                                where assigned_team = %(old_name)s
                            """,
                  values={'old_name': old, 'new_name': new},
                  debug=False)


    def validate(self):
        self._validate_team_members()
        
    def _validate_team_members(self):
        has_at_least_one_field_lead = False
        # team_member is a list of TeamMember (doctype)
        for tm in self.team_member:
            username = tm.member
            roles = frappe.permissions.get_roles(username)
            if roles is None or len(roles) == 0:
                frappe.throw(f'User {username} has no role')
            has_back_office = 'Back Office Staff' in roles
            has_field_lead = 'Field Lead' in roles
            has_at_least_one_field_lead = has_at_least_one_field_lead or has_field_lead
            has_field_installer = 'Field Installer' in roles
            if has_back_office and has_field_lead:
                frappe.throw(f'User {username} must not have both role "Back Office Staff" and "Field Lead"')
            if has_back_office and has_field_installer:
                frappe.throw(f'User {username} must not have both role "Back Office Staff" and "Field Installer"')
            if has_field_lead and has_field_installer:
                frappe.throw(f'User {username} must not have both role "Field Lead" and "Field Installer"')

            if self.team_type == LEVEL_2 or self.team_type == LEVEL_3:
                if not has_back_office:
                    frappe.throw(f'User {username} must have both role '
                                 f'"Back Office Staff" to join {self.team_type} team')
            elif self.team_type == LEVEL_1:
                if not has_field_lead and not has_field_installer:
                    frappe.throw(f'User {username} must have either role "Field Lead" '
                                 f'or "Field Installer to join {self.team_type} team')
            else:
                frappe.throw(f'Unknown team {self.team_type}')

        if self.team_type == LEVEL_1 and not has_at_least_one_field_lead:
            frappe.throw(f'There must be at least one Field Lead in {self.team_type}')


    @staticmethod
    def get_teams_of_current_user() -> List['Team']:
        username = frappe.session.user
        team_members = frappe.db.get_list(doctype='Team Member', filters={'member': username}, fields=['parent'])
        teams = []
        if team_members is not None:
            for tm in team_members:
                teams.append(frappe.get_doc('Team', tm.parent))
        return teams


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def team_member_query(doctype, txt, searchfield, start, page_len, filters):
    """
    NOTE: name of parameter must be exactly like that, it must match what is sent from the client framework code!

    :param doctype:
    :param txt: search keyword
    :param searchfield: ignore
    :param start:
    :param page_len:
    :param filters:
    :return:
    """

    conditions = []
    values = {'start': start, 'page_len': page_len}

    ignore_usernames = ('Guest', 'Administrator')
    conditions.append(f'tabUser.name NOT IN {db_utils.in_clause(ignore_usernames)}')

    if filters is None or filters.get('team_type') is None:
        all_roles = ('in', ('Back Office Staff', 'Field Lead', 'Field Installer'))
        conditions.append(f'usrRole.role IN {db_utils.in_clause(all_roles)}')

    else:
        team_type = filters.get('team_type')
        if team_type == LEVEL_2 or team_type == LEVEL_3:
            conditions.append('usrRole.role = %(role_name)s')
            values['role_name'] = 'Back Office Staff'
        elif team_type == LEVEL_1:
            level_1_team_roles = ('Field Lead', 'Field Installer')
            conditions.append(f'usrRole.role IN {db_utils.in_clause(level_1_team_roles)}')
        else:
            frappe.errprint(f'Unknown Team Type: {team_type}')
            return []

    if txt is not None and txt != '':
        conditions.append('tabUser.full_name like %(full_name)s OR tabUser.email like %(full_name)s')
        values['full_name'] = f'%{txt}%'

    if conditions != '':
        conditions = f'AND {" AND ".join(conditions)}'

    return frappe.db.sql("""
        SELECT 
            tabUser.name, full_name
        FROM tabUser
        INNER JOIN `tabHas Role` usrRole ON tabUser.name = usrRole.parent and usrRole.parenttype = 'User'
        WHERE `enabled`=1
            AND tabUser.docstatus < 2
            {conditions}
        ORDER BY full_name ASC
        LIMIT %(start)s, %(page_len)s
    """.format(conditions=conditions), values=values, debug=False)
