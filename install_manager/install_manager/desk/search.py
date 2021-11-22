import frappe
from frappe import desk


@frappe.whitelist()
def search_link(doctype, txt, query=None, filters=None, page_length=20, searchfield=None, reference_doctype=None, ignore_user_permissions=False):
    if doctype == 'Team' and reference_doctype == 'Job' and filters is None:
        filters = {"team_type": ["=","Level I Team"] }

    desk.search.search_link(doctype=doctype, txt=txt, query=query,
                            filters=filters, page_length=page_length,
                            searchfield=searchfield, reference_doctype=reference_doctype,
                            ignore_user_permissions=ignore_user_permissions)
