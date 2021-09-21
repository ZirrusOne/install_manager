# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe
import frappe.permissions
from frappe.model.document import Document


class Team(Document):

    def validate(self):
        self._validate_team_members()
        
    def _validate_team_members(self):
        # team_member is a list of TeamMember (doctype)
        for tm in self.team_member:
            username = tm.member
            roles = frappe.permissions.get_roles(username)
            if roles is None or len(roles) == 0:
                frappe.throw(f'User {username} has no role')
            has_back_office = 'Back Office Staff' in roles
            has_field_lead = 'Field Lead' in roles
            has_field_installer = 'Field Installer' in roles
            if has_back_office and has_field_lead:
                frappe.throw(f'User {username} must not have both role "Back Office Staff" and "Field Lead"')
            if has_back_office and has_field_installer:
                frappe.throw(f'User {username} must not have both role "Back Office Staff" and "Field Installer"')
            if has_field_lead and has_field_installer:
                frappe.throw(f'User {username} must not have both role "Field Lead" and "Field Installer"')

            if self.team_type == 'Back Office':
                if not has_back_office:
                    frappe.throw(f'User {username} must have both role '
                                 f'"Back Office Staff" to join {self.team_type} team')
            elif self.team_type == 'Field Crew':
                if not has_field_lead and not has_field_installer:
                    frappe.throw(f'User {username} must have either role "Field Lead" '
                                 f'or "Field Installer to join {self.team_type} team')
            else:
                frappe.throw(f'Unknown team {self.team_type}')


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
    conditions.append(f'tabUser.name NOT IN {_in_clause(ignore_usernames)}')

    if filters is None or filters.get('team_type') is None:
        all_roles = ('in', ('Back Office Staff', 'Field Lead', 'Field Installer'))
        conditions.append(f'usrRole.role IN {_in_clause(all_roles)}')

    else:
        team_type = filters.get('team_type')
        if team_type == 'Back Office':
            conditions.append('usrRole.role = %(rol_name)s')
            values['rol_name'] = 'Back Office Staff'
        elif team_type == 'Field Crew':
            field_crew_roles = ('Field Lead', 'Field Installer')
            conditions.append(f'usrRole.role IN {_in_clause(field_crew_roles)}')
        else:
            frappe.log(f'Unknown Team Type: {team_type}')
            return []

    if txt is not None and txt != '':
        conditions.append('tabUser.full_name like %(full_name)s')
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


def _in_clause(items) -> str:
    return "({0})".format(", ".join([frappe.db.escape(v) for v in items]))
