# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

import frappe
import re
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number


zipcode_regular_expression = re.compile('(^[0-9]{5}$)|(^[0-9]{5}-[0-9]{4}$)')


class Site(Document):

	def db_update(self):
		self._validate_zip_code()
		self._validate_site_contact()
		super(Site, self).db_update()

	def db_insert(self):
		self._validate_zip_code()
		self._validate_site_contact()
		super(Site, self).db_insert()

	def _validate_zip_code(self):
		if self.zip_code is None or self.zip_code == '':
			frappe.throw("Missing ZIP code")

		if not zipcode_regular_expression.match(self.zip_code):
			frappe.throw(f'Zip code invalid: {self.zip_code}')

	def _validate_site_contact(self):
		check_email_list = []
		for contact in self.get('site_contact'):
			if contact.first_name:
				contact.first_name = contact.first_name.title()

			if contact.last_name:
				contact.last_name = contact.last_name.title()

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
