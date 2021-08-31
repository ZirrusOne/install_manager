# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from crew_management.crew_management.controllers.states import POSTAL_CODES

class Site(Document):
	def validate(self):
		self.validate_zip_code()

	def validate_zip_code(self):
		zip_codes = [code for code in POSTAL_CODES if code[0] == self.state and code[1].lower() == self.city.strip().lower()]
		for code in zip_codes:
			if self.zip_code >= code[2] and self.zip_code <= code[3]:
				return


		frappe.msgprint(_("Zip code invalid. ({0})").format(self.zip_code),
						title='Error',
						indicator='red',
						raise_exception=1)


@frappe.whitelist()
def get_state_options():
	states = []
	states.append('')
	for code in POSTAL_CODES:
		if code[0] not in states:
			states.append(code[0])
	return states

