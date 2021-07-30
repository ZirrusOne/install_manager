from __future__ import unicode_literals
import frappe


def execute():
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
