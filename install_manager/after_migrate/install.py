import frappe


def execute():
    _setup_system_setting()


def _setup_system_setting():
    frappe.db.set_value('System Settings', None, 'app_name', 'Install Manager')