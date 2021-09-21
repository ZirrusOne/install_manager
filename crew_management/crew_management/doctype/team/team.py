# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document


class Team(Document):
    def before_insert(self):
        # TODO to remove
        if frappe.db.exists("Team", {"name": self.name}):
            frappe.throw(_("Team '{0}' already existed").format(self.name))

    def validate(self):
        self._validate_team_members()
        
    def _validate_team_members(self):
        if self.team_type == "Back Office":
            team_roles = ", ".join([frappe.db.escape("Back Office Staff")])
        elif self.team_type == "Field Crew":
            team_roles = ", ".join([frappe.db.escape(u) for u in ('Field Lead', 'Field Installer')])
        else:
            team_roles = ''

        users = frappe.db.sql("""
            SELECT DISTINCT usr.name
            FROM `tabUser` usr
            INNER JOIN `tabHas Role` usr_role ON (usr.name = usr_role.parent) 
            WHERE `enabled`=1
                AND usr_role.role IN ({team_roles})
            """.format(
                team_roles=team_roles
            ), as_dict=True)

        user_list = [d.name for d in users]

        for p in self.team_member:
            if p.member not in user_list:
                frappe.throw(_("Team members not valid for team '{0}'").format(self.team_type))


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
    """.format(conditions=conditions), values=values, debug=True)


def _in_clause(items) -> str:
    return "({0})".format(", ".join([frappe.db.escape(v) for v in items]))
