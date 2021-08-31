# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from itertools import groupby


@frappe.whitelist()
def get_job_base_team():
    current_user = frappe.get_doc('User', frappe.session.user)
    results = [];
    query = frappe.db.sql("""
        SELECT job.assigned_team , siteC.label, siteC.component_name, job.idx, job.status , job.parent
        FROM `tabJob` job
		INNER JOIN `tabSite Component` siteC ON (job.site_component = siteC.name) 
		WHERE job.assigned_team in (Select distinct parent 
                            from `tabTeam Member`
                            where member = %(member)s)
		ORDER BY job.assigned_team
    """, dict(member=current_user.email), as_dict=True)

    groups = groupby(query, lambda content: content['assigned_team'])
    for key, group in groups:
        item = {'team': key, 'jobs': list(group)}
        results.append(item)

    return frappe.as_json(results)
