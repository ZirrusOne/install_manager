# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class Assignment(Document):

	def db_insert(self):
		self._fill_default_company()
		super(Assignment, self).db_insert()

	def db_update(self):
		self._fill_default_company()
		is_assignment_name_change = self.assignment_name != self.get_db_value('assignment_name')
		super(Assignment, self).db_update()
		if is_assignment_name_change:
			self._update_linked_assignment_names()

	def _fill_default_company(self):
		if self.parent_company is None or self.parent_company == '':
			self.parent_company = frappe.db.get_value('Global Defaults', None, 'default_company')

	def _update_linked_assignment_names(self):
		conditions, values = frappe.db.build_conditions({'assignment': ('=', self.name)})
		values['assignment_name'] = self.assignment_name

		frappe.db.sql("UPDATE `tabJob` SET assignment_name =  %(assignment_name)s WHERE {conditions}".format(
			conditions=conditions
		), values, debug=False)
