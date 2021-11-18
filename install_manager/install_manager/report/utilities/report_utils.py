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
                and {schedule_alias}.start_date <= %(current_date)s
    		    and {schedule_alias}.status <> 'Completed'
    		    and {schedule_alias}.status <> 'Cancelled'
            """
