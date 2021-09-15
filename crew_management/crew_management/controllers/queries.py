# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe

STANDARD_USERS = ("Guest", "Administrator")
CREW_BACK_OFFICE_ROLES = ("Back Office Staff")
CREW_FIELD_ROLES = ("Field Lead", "Field Installer")


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def team_member_query(doctype, txt, searchfield, start, page_len, filters):
    from frappe.desk.reportview import get_match_cond, get_filters_cond
    conditions = []

    user_type_condition = "and user_type != 'Website User'"
    if filters and filters.get('ignore_user_type'):
        user_type_condition = ''
        filters.pop('ignore_user_type')

    if filters and filters.get('team_type'):
        team_type = filters.get('team_type')
        if team_type == "Back Office":
            team_roles = ", ".join([frappe.db.escape("Back Office Staff")])
        elif team_type == "Field Crew":
            team_roles = ", ".join([frappe.db.escape(u) for u in CREW_FIELD_ROLES])
        else:
            team_roles = ''
        filters.pop('team_type')

    txt = "%{}%".format(txt)
    return frappe.db.sql("""
		SELECT 
			tabUser.name, 
			CONCAT_WS(' ', tabUser.first_name, tabUser.middle_name, tabUser.last_name)
		FROM tabUser
		INNER JOIN `tabHas Role` usr_role
			ON (tabUser.name = usr_role.parent) 
		WHERE `enabled`=1
			{user_type_condition}
			AND usr_role.role IN ({team_roles})
			AND tabUser.docstatus < 2
			AND tabUser.name NOT IN ({standard_users})
			AND ({key} LIKE %(txt)s
				OR CONCAT_WS(' ', tabUser.first_name, tabUser.middle_name, tabUser.last_name) LIKE %(txt)s)
			{fcond} {mcond}
		ORDER BY
			CASE WHEN tabUser.name LIKE %(txt)s THEN 0 ELSE 1 END,
			CASE WHEN CONCAT_WS(' ', tabUser.first_name, tabUser.middle_name, tabUser.last_name) LIKE %(txt)s
				THEN 0 ELSE 1 END,
			NAME asc
		LIMIT %(page_len)s OFFSET %(start)s
	""".format(
        user_type_condition=user_type_condition,
        team_roles=team_roles,
        standard_users=", ".join([frappe.db.escape(u) for u in STANDARD_USERS]),
        key='tabUser.' + searchfield,
        fcond=get_filters_cond(doctype, filters, conditions),
        mcond=get_match_cond(doctype)
    ),
        dict(start=start, page_len=page_len, txt=txt)
    )


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_component_query(doctype, txt, searchfield, start, page_len, filters):
    from frappe.desk.reportview import get_match_cond, get_filters_cond
    conditions = []

    site_component_children = ''
    parent_site = ''
    if filters and filters.get('parent_site'):
        parent_site = filters.get('parent_site')
        site_component_children = 'AND parent = %(parent_id)s AND name <> %(parent_id)s'
        filters.pop('parent_site')

    txt = "%{}%".format(txt)

    return frappe.db.sql("""
        SELECT tblMain.component_name as `name`, tblMain.label, tblMain.parent 
        FROM `tabSite Component` tblMain
        INNER JOIN (
            SELECT component_name, parent, label, name
            FROM `tabSite Component`
            WHERE
                docstatus < 2
                {site_component_children}
                AND component_name LIKE %(txt)s
                {fcond}
                {mcond}
            
        ) AS tblSub ON tblMain.name = tblSub.name
        ORDER BY tblMain.component_name
        LIMIT %(start)s, %(page_len)s
    """.format(
        site_component_children=site_component_children,
        fcond=get_filters_cond(doctype, filters, conditions),
        mcond=get_match_cond(doctype)
    ),
        dict(start=start, page_len=page_len, txt=txt, parent_id=parent_site)
    )
