import frappe


def execute():
    setup_system_setting()
    setup_website()


def setup_system_setting():
    frappe.db.set_value('System Settings', None, 'app_name', 'Crew Management')


def setup_website():
    frappe.db.set_value('Website Settings', None, 'disable_signup', 1)
    frappe.db.set_value('Website Settings', None, 'hide_footer_signup', 1)
    frappe.db.set_value('Website Settings', None, 'footer', '')
    frappe.db.set_value('Website Settings', None, 'copyright', '')
    frappe.db.delete('Top Bar Item')
