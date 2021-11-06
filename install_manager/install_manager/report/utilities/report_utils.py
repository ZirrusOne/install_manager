from typing import List

import frappe

from install_manager.install_manager.utilities import db_utils


def join_job_with_schedule_teams(job_alias='tabJob',
                                 schedule_teams_alias='asgmtBaOfc') -> str:
    current_username = frappe.session.user
    teams = frappe.db.get_values('Team Member', {'member': current_username}, 'parent')

    if len(teams) > 0 and len(teams[0]) > 0:
        return f"""inner join `tabSchedule Teams` {schedule_teams_alias}
            on {schedule_teams_alias}.parent = {job_alias}.schedule 
               and {schedule_teams_alias}.team IN {db_utils.in_clause(teams[0])}
        """
    return ''


def join_job_with_active_schedules(job_alias='tabJob', schedule_alias='tabSchedule') -> str:
    return f"""tabSchedule {schedule_alias} inner join tabJob {job_alias}
            on {job_alias}.schedule = {schedule_alias}.name
                and {schedule_alias}.status IN {db_utils.in_clause(('Open', 'In Progress', 'On-Hold'))}
            """


report_colors = ['#ED7D31', '#0042A0', '#169CD8', '#449CF0', '#39E4A5', '#B4CD29', '#ECAD4B', '#29CD42', '#761ACB',
                 '#CB2929', '#ED6396', '#4463F0']


def pick_color(index: int) -> str:
    return report_colors[index % len(report_colors)]
