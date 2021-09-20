# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe.utils
from frappe.model.document import Document


class Job(Document):

	def db_update(self):
		self._handle_escalation()
		self._handle_non_compliant()
		super(Job, self).db_update()

	def db_insert(self):
		self._handle_escalation()
		self._handle_non_compliant()
		super(Job, self).db_insert()

	def _handle_non_compliant(self):
		if not self.status.startswith('Non-compliant'):
			self.non_compliant_reason = ''

	def _handle_escalation(self):
		if not self.status.startswith('Escalation'):
			self.escalation_reason = ''
		elif self._is_status_changed():
			# TODO ticket #16 send notification
			if self.status == 'Escalation - Field Lead':
				frappe.log('TODO to notify field lead')
			elif self.status == 'Escalation - Back Office':
				frappe.log('TODO to notify Back office')
			elif self.status == 'Escalation - Property':
				frappe.log('TODO to notify Property')
			elif self.status == 'Escalation - Vendor':
				# This classification is used solely for tracking purposes.
				# It does not generate notifications and no further action is required.
				pass
			else:
				frappe.log(f'Unknown sscalation status {self.status}')

	def _is_status_changed(self) -> bool:
		if self.get("__islocal") or not self.name:  # reference: super.db_update
			return False

		old_status = self.get_db_value('status')
		return self.status != old_status
