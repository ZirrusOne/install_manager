# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
from typing import Optional

from frappe.model.document import Document

class JobChecklist(Document):
    criterion: str
    criterion_type: str
    checklist_type: str
    result: Optional[str]
