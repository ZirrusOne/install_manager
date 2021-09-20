# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class Assignment(Document):

	def db_update(self):
		self._fill_default_company()
		super(Assignment, self).db_update()

	def db_insert(self):
		self._fill_default_company()
		super(Assignment, self).db_insert()

	def _fill_default_company(self):
		if self.parent_company is None or self.parent_company == '':
			self.parent_company = frappe.db.get_value('Global Defaults', None, 'default_company')
