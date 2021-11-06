# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import json
from itertools import groupby


@frappe.whitelist()
def get_job_base_team(searchValue, isEscalation):
    results = [];
    searchValue = "%{}%".format(searchValue)
    filterEscalation = ''
    if json.loads(isEscalation.lower()):
        filterEscalation = "job.status like '%%Escalation%%'"
    else:
        filterEscalation = "job.status not like '%%Escalation%%'"

    query = frappe.db.sql("""
        select job.name, job.assigned_team , job.status, job.escalation_reason , sitec.label, sitec.unit_name, assign.schedule_name, assign.schedule_color
        from `tabJob` job
		inner join `tabSite Unit` sitec on (job.site_unit = sitec.name)
		inner join `tabSchedule` assign  on (job.schedule = assign.name)
		where 
		    (sitec.label  like %(searchValue)s or concat_ws(' ', sitec.label , sitec.unit_name ) like %(searchValue)s)
		     and 
		     job.assigned_team in (select distinct parent 
                            from `tabTeam Member`
                            where member = %(member)s)
            and 
            {filterEscalation}
		order by job.assigned_team
    """.format(filterEscalation=filterEscalation),
                          dict(searchValue=searchValue, member=frappe.session.user),
                          as_dict=True)
    sort_query = sorted(query, key = lambda content: (content['assigned_team'], content['schedule_name'], content['schedule_color']))
    teams = groupby(sort_query, key=  lambda content: (content['assigned_team'], content['schedule_name'], content['schedule_color']))
    for key, items in teams:
        item = {'team': key[0],
                'schedule': key[1],
                'color': key[2],
                'jobs': list(items)}
        results.append(item)

    return frappe.as_json(results)
