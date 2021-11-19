import frappe


def execute():
    _setup_system_setting()
    _setup_website()
    _set_logo_width()


def _setup_system_setting():
    frappe.db.set_value('System Settings', None, 'app_name', 'Install Manager')


def _setup_website():
    frappe.db.set_value('Website Settings', None, 'disable_signup', 1)
    frappe.db.set_value('Website Settings', None, 'hide_footer_signup', 1)
    frappe.db.set_value('Website Settings', None, 'footer', '')
    frappe.db.set_value('Website Settings', None, 'copyright', '')
    frappe.db.delete('Top Bar Item', {'parent': 'Website Settings'})


def _set_logo_width():
    frappe.db.sql("""
        update `tabSingles`
        set value = 48
        where  doctype = 'Navbar Settings'
           and field = 'logo_width'
           and (value is null or value = 0)
        """)
