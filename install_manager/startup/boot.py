# Copyright (c) 2021, Zirrus One and Contributors
# See license.txt

from __future__ import unicode_literals
import frappe


# Need define home page for replace default home workspaces
def boot_session(bootinfo):
    roles = frappe.get_roles(frappe.session.user)
    if "System Manager" in roles:
        return
    elif "Field Manager" in roles:
        # Don't be misled by "home_page". Don't set it to any Workspace page because they are not Page!!!!
        # Page is something you create on the doctype Page
        return
    elif "Field Installer" in roles or "Field Lead" in roles:
        bootinfo['home_page'] = "job-management"
