# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from itertools import groupby


@frappe.whitelist()
def get_job_base_team(searchValue):
    results = [];
    searchValue = "%{}%".format(searchValue)

    query = frappe.db.sql("""
        select job.assigned_team , sitec.label, sitec.component_name, job.idx, job.status , job.parent
        from `tabJob` job
		inner join `tabSite Component` sitec on (job.site_component = sitec.name) 
		where 
		    (sitec.label  like %(searchValue)s or concat_ws(' ', sitec.label , sitec.component_name ) like %(searchValue)s)
		     and job.assigned_team in (select distinct parent 
                            from `tabTeam Member`
                            where member = %(member)s)
		order by job.assigned_team
    """, dict(searchValue=searchValue, member=frappe.session.user), as_dict=True)

    groups = groupby(query, lambda content: content['assigned_team'])
    for key, group in groups:
        item = {'team': key, 'jobs': list(group)}
        results.append(item)

    return frappe.as_json(results)
