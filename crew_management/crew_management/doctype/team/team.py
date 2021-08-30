# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

import frappe
from frappe import _
from frappe.model.document import Document

CREW_BACK_OFFICE_ROLES = ("Back Office Staff")
CREW_FIELD_ROLES = ("Field Lead", "Field Installer")

class Team(Document):
	def before_insert(self):
		self.validate_duplicate()

	def validate(self):
		self.validate_team_members()

	def validate_duplicate(self):
		if frappe.db.exists("Team", {"name": self.name}):
			frappe.msgprint(_("Team '{0}' already existed").format(self.name),
					title='Error',
					indicator='red',
					raise_exception=1)
		
	def validate_team_members(self):
		if self.team_type == "Back Office":
			team_roles = ", ".join([frappe.db.escape("Back Office Staff")])
		elif self.team_type == "Field Crew":
			team_roles = ", ".join([frappe.db.escape(u) for u in CREW_FIELD_ROLES])
		else:
			team_roles = ''

		users = frappe.db.sql("""
			SELECT DISTINCT usr.name
			FROM `tabUser` usr
			INNER JOIN `tabHas Role` usr_role ON (usr.name = usr_role.parent) 
			WHERE `enabled`=1
				AND usr_role.role IN ({team_roles})
			""".format(
				team_roles=team_roles
			), as_dict=True)

		user_list = [d.name for d in users]

		for p in self.team_member:
			if p.member not in user_list:
				frappe.msgprint(_("Team members not valid for team '{0}'").format(self.team_type),
					title='Error',
					indicator='red',
					raise_exception=1)