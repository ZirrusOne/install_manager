from __future__ import unicode_literals
import frappe
import json


def execute():
    _insert_custom_roles()
    _insert_custom_domain()
    _custom_system_settings()
    _add_users()
    _setup_user_roles()


def _insert_custom_roles():
    if not frappe.db.exists("Role", "Field Installer"):
        doc = frappe.new_doc("Role")
        doc.update({
            "role_name": "Field Installer",
            "desk_access": 0
        })
        doc.insert(ignore_permissions=True)
    if not frappe.db.exists("Role", "Field Lead"):
        doc = frappe.new_doc("Role")
        doc.update({
            "role_name": "Field Lead",
            "desk_access": 0
        })
        doc.insert(ignore_permissions=True)
    if not frappe.db.exists("Role", "Back Office Staff"):
        doc = frappe.new_doc("Role")
        doc.update({
            "role_name": "Back Office Staff",
            "desk_access": 1
        })
        doc.insert(ignore_permissions=True)


def _insert_custom_domain():
    if not frappe.db.exists("Domain", "Crew Management"):
        doc = frappe.new_doc("Domain")
        doc.update({
            "domain": "Crew Management"
        })
        doc.insert(ignore_permissions=True)


def _custom_system_settings():
    frappe.db.set_value("System Settings", "System Settings", "enable_password_policy", 0)
    frappe.db.set_value("System Settings", "System Settings", "allow_login_using_user_name", 1)


def _add_users():
    frappe.db.sql('delete from tabUser where name not in ("Guest", "Administrator")')
    for u in json.loads(open(frappe.get_app_path('crew_management', 'patches', 'data', 'user.json')).read()):
        user = frappe.new_doc("User")
        user.update(u)
        user.flags.no_welcome_mail = True
        user.new_password = 'Test@123'
        user.insert()


def _setup_user_roles():
    user = frappe.get_doc('User', 'sysadmin@zirrusone.com')
    user.add_roles('Accounts Manager', 'Auditor', 'Customer', 'Employee Self Service', 'Field Lead', 'HR Manager',
                   'Item Manager', 'Leave Approver', 'Maintenance Manager', 'Manufacturing User', 'Projects Manager',
                   'Purchase Master Manager', 'Report Manager', 'Sales User', 'Stock User', 'Accounts User',
                   'Back Office Staff', 'Dashboard Manager', 'Expense Approver', 'Fleet Manager', 'HR User',
                   'Knowledge Base Contributor', 'LMS User', 'Maintenance User', 'Newsletter Manager', 'Projects User',
                   'Purchase User', 'Sales Manager', 'Script Manager', 'Supplier', 'Translator', 'Analytics', 'Blogger',
                   'Employee', 'Field Installer', 'Fulfillment User', 'Inbox User', 'Knowledge Base Editor',
                   'Loan Manager', 'Manufacturing Manager', 'Prepared Report User', 'Purchase Manager',
                   'Quality Manager', 'Quality Manager', 'Sales Master Manager', 'Stock Manager', 'Support Team',
                   'Website Manager')

    user = frappe.get_doc('User', 'backoffice@zirrusone.com')
    user.add_roles('Field Lead', 'Back Office Staff', 'Dashboard Manager', 'Sales Manager', 'Field Installer',
                   'Website Manager')

    user = frappe.get_doc('User', 'installer@zirrusone.com')
    user.add_roles('Dashboard Manager', 'Field Installer', 'Website Manager')

    user = frappe.get_doc('User', 'lead@zirrusone.com')
    user.add_roles('Field Lead', 'Dashboard Manager', 'Website Manager')
