# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe
from frappe.model.document import Document

class Team(Document):
	def before_insert(self):
		if frappe.db.exists("Team", {"name": self.name}):
			frappe.throw(frappe._("Team '{0}' already existed").format(self.name))


