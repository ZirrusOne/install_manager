from typing import List

import frappe

from crew_management.crew_management.utilities import db_utils


def join_job_with_assignment_back_office_on_team(job_alias='tabJob',
                                                 assignment_back_office_alias='asgmtBaOfc') -> str:
    current_username = frappe.session.user
    teams = frappe.db.get_values('Team Member', {'member': current_username}, 'parent')

    if len(teams) > 0:
        return f"""inner join `tabAssignment Back Office` {assignment_back_office_alias}
            on {assignment_back_office_alias}.parent = {job_alias}.assignment 
               and {assignment_back_office_alias}.team IN {db_utils.in_clause(teams)}'
        """
    return ''


def join_job_with_active_assignments(job_alias='tabJob', assignment_alias='tabAssignment') -> str:
    return f"""tabAssignment {assignment_alias} inner join tabJob {job_alias}
            on {job_alias}.assignment = {assignment_alias}.name
                and {assignment_alias}.status IN {db_utils.in_clause(('Open', 'In Progress', 'On-Hold'))}
            """


report_colors = ['#ED7D31', '#0042A0', '#169CD8', '#449CF0', '#39E4A5', '#B4CD29', '#ECAD4B', '#29CD42', '#761ACB',
                 '#CB2929', '#ED6396', '#4463F0']


def pick_color(index: int) -> str:
    return report_colors[index % len(report_colors)]
