# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document

from install_manager.install_manager.utilities import db_utils


class WorkspaceMenus(Document):
    pass


@frappe.whitelist()
def get_visible_menus():
    role_clause = f'visible_to_role in {db_utils.in_clause(frappe.permissions.get_roles(frappe.session.user))}'
    workspaces = frappe.db.sql("""
                            select workspace
                            from `tabWorkspace Menus`
                            where {role_clause}
                            """.format(role_clause=role_clause),
                               debug=False,
                               as_list=True
                               )
    return list(map(lambda row: row[0], workspaces))
