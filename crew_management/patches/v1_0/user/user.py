from __future__ import unicode_literals

import frappe
from frappe.model.document import Document


@frappe.whitelist()
def user_add_block_modules(doc, method=None):
    if "Back Office Staff" in [d.role for d in doc.get("roles")]:
        for d in doc.block_modules:
            doc.block_modules.remove(d)

        default_block_module = {'Printing','Data Migration','Social','Event Streaming','CRM','Manufacturing','Support'}
        for b_module in default_block_module:
            doc.append("block_modules", {"module": b_module})
