# Copyright (c) 2013, Zirrus One and contributors
# For license information, please see license.txt
from typing import List

import frappe

from crew_management.crew_management.report.utilities import report_utils


def execute(filters=None):
    """
    Counts number of Jobs in every status.

    :param filters:
    :return:
    """

    db_stats_result = frappe.db.sql(query="""
            select tabJob.status, count(distinct tabJob.name) total
            from {join_active_assignment}
                 {join_back_office_team}
            where
                tabJob.docstatus < 2
            group by status
        """.format(join_active_assignment=report_utils.join_job_with_active_assignments(),
                   join_back_office_team=report_utils.join_job_with_assignment_back_office_on_team()),
                                    values={},
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
                    'name': 'Total',
                    'values': values
                }
            ]
        },
        'valuesOverPoints': 1,
        'type': 'bar',
        'colors': ['#ED7D31'],
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
