# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt

import frappe
from frappe import _

from install_manager.install_manager.report.utilities import report_utils
from install_manager.install_manager.utilities import db_utils


def execute(filters=None):

    schedule_unit = frappe.db.sql("""
        select count(distinct  tabSchedule.name) as total_schedule,
               count(distinct  tabSchedule.name, tabJob.site_unit) as total_unit
        from {join_active_schedule}
             {join_schedule_teams}
        where
            tabJob.docstatus < 2
            and tabSchedule.docstatus < 2
    """.format(join_active_schedule=report_utils.join_job_with_active_schedules(),
               join_schedule_teams=report_utils.join_job_with_schedule_teams()),
                                  values={'current_date': frappe.utils.nowdate()},
                                  debug=False)

    job_completion_statuses = ('Non-compliant', 'Completed')
    statuses = db_utils.in_clause(job_completion_statuses)

    total_completed_job = frappe.db.sql("""
        select count(distinct  tabSchedule.name, tabJob.site_unit) as total_job
        from {join_active_schedule}
             {join_schedule_teams}
        where
                tabJob.docstatus < 2
                and tabSchedule.docstatus < 2
                and tabJob.status in {statuses}
    """.format(join_active_schedule=report_utils.join_job_with_active_schedules(),
               join_schedule_teams=report_utils.join_job_with_schedule_teams(),
               statuses=statuses),
                                        values={'current_date': frappe.utils.nowdate()},
                                        debug=False)
    columns = [
        {
            'fieldname': 'total_active_schedules',
            'label': _('Total active Schedules'),
            'fieldtype': 'Int'
        },
        {
            'fieldname': 'total_units',
            'label': _('Total Units in Schedules'),
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
            'total_active_schedules': 0 if len(schedule_unit) == 0 or len(schedule_unit[0]) != 2
            else schedule_unit[0][0],

            'total_units': 0 if len(schedule_unit) == 0 or len(schedule_unit[0]) != 2 else schedule_unit[0][1],

            'total_completed_jobs': 0 if len(total_completed_job) == 0 or len(total_completed_job[0]) == 0
            else total_completed_job[0][0]
        }
    ]

    chart = {
        'title': 'Active Schedule report',
        'data': {
            'labels': ['Active Schedules', 'Units in Schedules', 'Completed Jobs'],
            'datasets': [
                {
                    #'name': 'Total',
                    'values': [data[0]['total_active_schedules'],
                               data[0]['total_units'],
                               data[0]['total_completed_jobs']]
                },
            ]
        },
        'valuesOverPoints': True,
        'type': 'bar',
        # different colors for different bars is not supported yet. As of Nov 18th, 2021, this pull request is not yet merged
        # https://github.com/frappe/charts/pull/179
        # Also, the "colors" attribute returned here has not effect. It always looks for "colors" attributes in the
        #   custom_options of the dashboard chart object
        'colors': ['#F1C232'],
        'height': 180,
        'truncateLegends': True,
        'barOptions': {
            'stacked': False
        },
        'axisOptions': {
            'xAxisMode': 'tick'  # default: 'span'
        }
    }

    return columns, data, None, chart
