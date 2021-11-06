# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt

import frappe

from install_manager.install_manager.utilities import db_utils
from install_manager.install_manager.utilities.common_utils import is_not_blank


def execute(filters=None):
    values = {}
    conditions = []
    if is_not_blank(filters.get('site_id', None)):
        conditions.append('tabSite.name = %(site_id)s')
        values['site_id'] = filters.get('site_id')

    if is_not_blank(filters.get('schedule_id', None)):
        conditions.append('tabSchedule.name = %(schedule_id)s')
        values['schedule_id'] = filters.get('schedule_id')

    if is_not_blank(filters.get('schedule_status', None)) and filters.get('schedule_status') != 'all statuses':
        conditions.append('tabSchedule.status = %(schedule_status)s')
        values['schedule_status'] = filters.get('schedule_status')

    if filters.get('schedule_statuses', None) is not None and len(filters.get('schedule_statuses', None)) > 0:
        conditions.append(f'tabSchedule.status IN {db_utils.in_clause(filters.get("schedule_statuses"))}')

    start_date_from = None
    if is_not_blank(filters.get('start_date_from', None)):
        start_date_from = frappe.utils.getdate(filters.get('start_date_from'))
    start_date_to = None
    if is_not_blank(filters.get('start_date_to', None)):
        start_date_to = frappe.utils.getdate(filters.get('start_date_to'))

    if start_date_from is not None and start_date_to is not None and start_date_from > start_date_to:
        frappe.throw('Start date from has to be smaller than start date to')

    if start_date_from is not None:
        conditions.append('tabSchedule.start_date >= %(start_date_from)s')
        values['start_date_from'] = start_date_from

    if start_date_to is not None:
        conditions.append('tabSchedule.start_date <= %(start_date_to)s')
        values['start_date_to'] = start_date_to

    join_schedule_teams = ''
    if is_not_blank(filters.get('assigned_team', None)):
        join_schedule_teams = """inner join `tabSchedule Teams` scheduleBo 
            on scheduleBo.parent = tabSchedule.name and scheduleBo.team = %(assigned_team)s """
        values['assigned_team'] = filters.get('assigned_team')

    paging = ''
    if filters.get('limit_row', None) is not None:
        paging = 'LIMIT 0, %(limit_row)s'
        values['limit_row'] = filters.get('limit_row')

    condition_str = ''
    if len(conditions) > 0:
        condition_str = ' AND ' + ' AND '.join(conditions)

    query_results = frappe.db.sql("""
        select distinct tabSite.site_name, tabSite.street_address, tabSite.city, tabSite.state, tabSite.zip_code,
               tabSchedule.schedule_name,
               tabJob.unit_name, tabJob.status
        from tabSchedule inner join tabJob on tabJob.schedule = tabSchedule.name
            inner join tabSite on tabSchedule.site = tabSite.name
            {join_schedule_teams}
        where
            tabJob.docstatus < 2
            and tabSchedule.docstatus < 2
            and tabSite.docstatus < 2
            {condition_str}
        {paging}
    """.format(join_schedule_teams=join_schedule_teams, condition_str=condition_str, paging=paging),
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
            "schedule_name": row[5],
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
            "fieldname": "schedule_name",
            "fieldtype": "Data",
            "label": "Schedule Name",
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
