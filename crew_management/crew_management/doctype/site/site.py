# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number
from crew_management.crew_management.controllers.states import POSTAL_CODES


class Site(Document):
	def validate(self):
		# self.validate_zip_code()
		self.validate_site_contact()

	# TODO to rework, this doesn't work correctly
	def validate_zip_code(self):
		zip_codes = [code for code in POSTAL_CODES if code[0] == self.state and code[1].lower() == self.city.strip().lower()]
		for code in zip_codes:
			if self.zip_code >= code[2] and self.zip_code <= code[3]:
				return

		frappe.throw(_("Zip code invalid. ({0})").format(self.zip_code))

	def validate_site_contact(self):
		check_email_list = []
		for contact in self.get('site_contact'):
			if contact.first_name:
				contact.first_name = contact.first_name.capitalize()

			if contact.last_name:
				contact.last_name = contact.last_name.capitalize()

			if contact.email_address:
				if contact.email_address not in check_email_list:
					validate_email_address(contact.email_address, True)
					check_email_list.append(contact.email_address)
				else:
					frappe.throw(_("{0} entered twice in Site Contact").format(contact.email_address))

			if contact.office_phone:
				validate_phone_number(contact.office_phone, True)

			if contact.mobile_phone:
				validate_phone_number(contact.mobile_phone, True)


@frappe.whitelist()
def get_state_options():
	states = []
	states.append('')
	for code in POSTAL_CODES:
		if code[0] not in states:
			states.append(code[0])
	return states

