# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

import frappe
import re
from frappe import _
from frappe.model.document import Document
from frappe.utils import validate_email_address, validate_phone_number

zipcode_regular_expression = re.compile('(^[0-9]{5}$)|(^[0-9]{5}-[0-9]{4}$)')


class Site(Document):

    def validate(self):
        self._validate_zip_code()
        self._validate_site_contact()
        self._validate_number_of()

    def db_update(self):
        is_site_name_change = self.site_name != self.get_db_value('site_name')
        super(Site, self).db_update()
        if is_site_name_change:
            self._update_linked_site_names()

    def db_insert(self):
        super(Site, self).db_insert()

    def _validate_number_of(self):
        if self.number_of_buildings is not None and int(self.number_of_buildings) <= 0:
            frappe.throw("Number of Buildings must be greater than zero when defined")
        if self.number_floors_per_building is not None and int(self.number_floors_per_building) <= 0:
            frappe.throw("Number of Floors per Building must be greater than zero when defined")
        if self.number_units_per_floor is not None and int(self.number_units_per_floor) <= 0:
            frappe.throw("Number of Units per Floor must be greater than zero when defined")


        if not ((self.number_floors_per_building is not None
                and self.number_of_buildings is not None
                and self.number_units_per_floor is not None) \
            or (self.number_floors_per_building is None
                and self.number_of_buildings is None
                and self.number_units_per_floor is None)):
            frappe.throw("Number of Buildings, Number of Floors per Building and Number of Units per Floor "
                         "must be either all defined or all undefined")

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

    def _update_linked_site_names(self):
        conditions, values = frappe.db.build_conditions({'site': ('=', self.name)})
        values['site_name'] = self.site_name

        frappe.db.sql("UPDATE `tabSchedule` SET site_name =  %(site_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

        frappe.db.sql("UPDATE `tabSite Unit` SET site_name =  %(site_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

        frappe.db.sql("""UPDATE tabJob SET site_name =  %(site_name)s 
			WHERE schedule IN (SELECT tabSchedule.name FROM tabSchedule WHERE {conditions})
			""".format(
            conditions=conditions
        ), values, debug=False)
