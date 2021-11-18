# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt
from typing import List

import frappe

from install_manager.install_manager.doctype.job import job_status
from install_manager.install_manager.report.utilities import report_utils


def execute(filters=None):
    """
    Counts number of Jobs in every status.

    :param filters:
    :return:
    """

    db_stats_result = frappe.db.sql(query="""
            select tabJob.status, count(distinct tabJob.name) total
            from {join_active_schedule}
                 {join_schedule_teams}
            where
                tabJob.docstatus < 2
            group by status
        """.format(join_active_schedule=report_utils.join_job_with_active_schedules(),
                   join_schedule_teams=report_utils.join_job_with_schedule_teams()),
                                    values={'current_date': frappe.utils.nowdate()},
                                    debug=False)
    data = []
    for row in db_stats_result:
        data.append({'job_status': row[0], 'count': row[1]})

    columns = [
        {
            'fieldname': 'job_status',
            'fieldtype': 'Data',
            'label': 'Status',
        },
        {
            'fieldname': 'count',
            'fieldtype': 'Int',
            'label': 'Count',
        }
    ]

    # can return columns, data, message, chart, report_summary, skip_total_rows
    return columns, data, None, get_chart_data(data), get_report_summary(data)


def get_chart_data(data: List):
    if not data:
        return None

    # https://frappe.io/charts/docs/basic/basic_chart
    # https://frappe.io/charts/docs/reference/configuration

    labels = []
    values = []

    for index, stats in enumerate(data):
        labels.append(stats['job_status'])
        values.append(stats['count'])

    return {
        'title': 'Job status statistic',
        'data': {
            'labels': labels,
            'datasets': [
                {
                    #'name': 'Total',
                    'values': values
                }
            ]
        },
        'valuesOverPoints': True,
        'type': 'bar',
        # different colors for different bars is not supported yet. As of Nov 18th, 2021, this pull request is not yet merged
        # https://github.com/frappe/charts/pull/179
        # Also, the "colors" attribute returned here has not effect. It always looks for "colors" attributes in the
        #   custom_options of the dashboard chart object
        # 'colors': ['#8B0000'],
        'height': 180,
        'truncateLegends': True,
        'barOptions': {
            'stacked': False
        },
        'axisOptions': {
            'xAxisMode': 'tick'  # default: 'span'
        }
    }


def get_report_summary(data: List):
    if not data:
        return None

    total = sum([stats['count'] for stats in data])

    return [
        {
            'value': total,
            'indicator': '#169CD8',
            'label': frappe._('Total Jobs'),
            'datatype': 'Int',
        }
    ]
