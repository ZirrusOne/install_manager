# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt

import frappe
from frappe import _

from crew_management.crew_management.report.utilities import report_utils
from crew_management.crew_management.utilities import db_utils


def execute(filters=None):

    assignment_unit = frappe.db.sql("""
        select count(distinct  tabAssignment.name) as total_assignment,
               count(distinct  tabAssignment.name, tabJob.site_component) as total_unit
        from {join_active_assignment}
             {join_back_office_team}
        where
            tabJob.docstatus < 2
            and tabAssignment.docstatus < 2
    """.format(join_active_assignment=report_utils.join_job_with_active_assignments(),
               join_back_office_team=report_utils.join_job_with_assignment_back_office_on_team()),
                               values={},
                               debug=False)

    job_completion_statuses = ('Escalation - Vendor', 'Escalation - Property', 'Non-compliant', 'Completed')
    statuses = db_utils.in_clause(job_completion_statuses)

    total_completed_job = frappe.db.sql("""
        select count(distinct  tabAssignment.name, tabJob.site_component) as total_job
        from {join_active_assignment}
             {join_back_office_team}
        where
                tabJob.docstatus < 2
                and tabAssignment.docstatus < 2
                and tabJob.status in {statuses}
    """.format(join_active_assignment=report_utils.join_job_with_active_assignments(),
               join_back_office_team=report_utils.join_job_with_assignment_back_office_on_team(),
               statuses=statuses),
                                        values={},
                                        debug=False)
    columns = [
        {
            'fieldname': 'total_active_assignments',
            'label': _('Total active Assignments'),
            'fieldtype': 'Int'
        },
        {
            'fieldname': 'total_units',
            'label': _('Total Units in Assignments'),
            'fieldtype': 'Int'
        },
        {
            'fieldname': 'total_completed_jobs',
            'label': _('Total completed Jobs'),
            'fieldtype': 'int'
        },
    ]

    data = [
        {
            'total_active_assignments': 0 if len(assignment_unit) == 0 or len(assignment_unit[0]) != 2
            else assignment_unit[0][0],

            'total_units': 0 if len(assignment_unit) == 0 or len(assignment_unit[0]) != 2 else assignment_unit[0][1],

            'total_completed_jobs': 0 if len(total_completed_job) == 0 or len(total_completed_job[0]) == 0
            else total_completed_job[0][0]
        }
    ]

    chart = {
        'title': 'Active Assignment report',
        'data': {
            'labels': ['Active Assignments', 'Units in Assignments', 'Completed Jobs'],
            'datasets': [
                {
                    'name': 'Total',
                    'values': [data[0]['total_active_assignments'],
                               data[0]['total_units'],
                               data[0]['total_completed_jobs']]
                },
            ]
        },
        'valuesOverPoints': 1,
        'type': 'bar',
        'colors': ['#169CD8'],
        'truncateLegends': True,
        'barOptions': {
            'stacked': False
        },
        'axisOptions': {
            'xAxisMode': 'tick'  # default: 'span'
        }
    }

    return columns, data, None, chart
