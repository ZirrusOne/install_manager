# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt

import frappe

from crew_management.crew_management.utilities import db_utils
from crew_management.crew_management.utilities.common_utils import is_not_blank


def execute(filters=None):
    values = {}
    conditions = []
    if is_not_blank(filters.get('site_id', None)):
        conditions.append('tabSite.name = %(site_id)s')
        values['site_id'] = filters.get('site_id')

    if is_not_blank(filters.get('assignment_id', None)):
        conditions.append('tabAssignment.name = %(assignment_id)s')
        values['assignment_id'] = filters.get('assignment_id')

    if is_not_blank(filters.get('assignment_status', None)) and filters.get('assignment_status') != 'all statuses':
        conditions.append('tabAssignment.status = %(assignment_status)s')
        values['assignment_status'] = filters.get('assignment_status')

    if filters.get('assignment_statuses', None) is not None and len(filters.get('assignment_statuses', None)) > 0:
        conditions.append(f'tabAssignment.status IN {db_utils.in_clause(filters.get("assignment_statuses"))}')

    start_date_from = None
    if is_not_blank(filters.get('start_date_from', None)):
        start_date_from = frappe.utils.getdate(filters.get('start_date_from'))
    start_date_to = None
    if is_not_blank(filters.get('start_date_to', None)):
        start_date_to = frappe.utils.getdate(filters.get('start_date_to'))

    if start_date_from is not None and start_date_to is not None and start_date_from > start_date_to:
        frappe.throw('Start date from has to be smaller than start date to')

    if start_date_from is not None:
        conditions.append('tabAssignment.start_date >= %(start_date_from)s')
        values['start_date_from'] = start_date_from

    if start_date_to is not None:
        conditions.append('tabAssignment.start_date <= %(start_date_to)s')
        values['start_date_to'] = start_date_to

    join_back_office_team = ''
    if is_not_blank(filters.get('back_office_team', None)):
        join_back_office_team = """inner join `tabAssignment Back Office` assignmentBo 
            on assignmentBo.parent = tabAssignment.name and assignmentBo.team = %(back_office_team)s """
        values['back_office_team'] = filters.get('back_office_team')

    paging = ''
    if filters.get('limit_row', None) is not None:
        paging = 'LIMIT 0, %(limit_row)s'
        values['limit_row'] = filters.get('limit_row')

    condition_str = ''
    if len(conditions) > 0:
        condition_str = ' AND ' + ' AND '.join(conditions)

    query_results = frappe.db.sql("""
        select distinct tabSite.site_name, tabSite.street_address, tabSite.city, tabSite.state, tabSite.zip_code,
               tabAssignment.assignment_name,
               tabJob.component_name, tabJob.status
        from tabAssignment inner join tabJob on tabJob.assignment = tabAssignment.name
            inner join tabSite on tabAssignment.site = tabSite.name
            {join_back_office_team}
        where
            tabJob.docstatus < 2
            and tabAssignment.docstatus < 2
            and tabSite.docstatus < 2
            {condition_str}
        {paging}
    """.format(join_back_office_team=join_back_office_team, condition_str=condition_str, paging=paging),
                  values=values,
                  debug=True)
    data = []
    for row in query_results:
        data.append({
            "site_name": row[0],
            "site_address_street": row[1],
            "site_address_city": row[2],
            "site_address_state": row[3],
            "site_address_zip": row[4],
            "assignment_name": row[5],
            "job_name": row[6],
            "job_status": row[7]
        })

    return _columns(), data


def _columns():
    return [
        {
            "fieldname": "site_name",
            "fieldtype": "Data",
            "label": "Site Name",
        },
        {
            "fieldname": "site_address_street",
            "fieldtype": "Data",
            "label": "Street",
        },
        {
            "fieldname": "site_address_city",
            "fieldtype": "Data",
            "label": "City",
        },
        {
            "fieldname": "site_address_state",
            "fieldtype": "Data",
            "label": "State",
        },
        {
            "fieldname": "site_address_zip",
            "fieldtype": "Data",
            "label": "ZIP Code",
        },
        {
            "fieldname": "assignment_name",
            "fieldtype": "Data",
            "label": "Assignment Name",
        },
        {
            "fieldname": "job_name",
            "fieldtype": "Data",
            "label": "Job Name",
        },
        {
            "fieldname": "job_status",
            "fieldtype": "Data",
            "label": "Job Status",
        }
    ]
