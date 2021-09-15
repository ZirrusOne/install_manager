# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

def get_context(context):
	pass

@frappe.whitelist()
def get_job_detail(job_id):
	query = frappe.db.sql("""
        select job.*, sitec.label, sitec.component_name, assign.assignment_name, assign.assignment_color
        from `tabJob` job
		inner join `tabSite Component` sitec on (job.site_component = sitec.name)
		inner join `tabAssignment` assign  on (job.parent = assign.name)
		where 
		     job.assigned_team in (select distinct parent 
                            from `tabTeam Member`
                            where member = %(member)s)
            and 
            job.name = %(job_id)s""", dict(job_id=job_id, member=frappe.session.user), as_dict=True)

	return query[0] if query else None
