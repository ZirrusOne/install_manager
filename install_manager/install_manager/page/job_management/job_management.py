# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

from __future__ import unicode_literals

from functools import cmp_to_key
from typing import Optional, List, Dict, Set

import frappe
import json

from install_manager.install_manager.doctype.job.job_status import READY, RESOLVED, IN_PROGRESS, ESCALATE_LEVEL_1, \
    NON_COMPLIANT
from install_manager.install_manager.doctype.team.team import Team
from install_manager.install_manager.doctype.team.team_type import LEVEL_1
from install_manager.install_manager.doctype.team.user_role import INSTALLER, FIELD_LEAD
from install_manager.install_manager.utilities import db_utils, common_utils


@frappe.whitelist(methods='GET')
def get_list_filter_options(escalation_view):
    _check_access_right()
    is_for_escalation_view = escalation_view is not None and str(escalation_view).lower() in ('true', 'yes', '1')
    if is_for_escalation_view:
        current_roles = frappe.get_roles(frappe.session.user)
        if FIELD_LEAD not in current_roles:
            frappe.throw(f'Only {FIELD_LEAD} can access the Escalation View')

    meta_list = _query_jobs(select_list="""
                               distinct 
                               schedule.name as schedule_id,
                               job.assigned_team as team_id,
                               unit.building_number,
                               job.status as job_status
                               """,
                            order_clause="""
                               order by schedule.start_date ASC, schedule.site, job.assigned_team, unit.building_number,
                                        unit.floor_number, unit.full_name 
                               """,
                            statuses=None if not is_for_escalation_view else [ESCALATE_LEVEL_1])
    team_ids = set()
    statuses = set()
    schedule_ids = set()
    building_ids: Dict[str, Set[int]] = {}
    for meta in meta_list:
        statuses.add(meta['job_status'])
        schedule_ids.add(meta['schedule_id'])
        if meta.get('building_number') is not None:
            if building_ids.get(meta['schedule_id']) is None:
                building_ids[meta['schedule_id']] = set()
            building_ids[meta['schedule_id']].add(meta['building_number'])
        if meta.get('team_id') is not None:
            team_ids.add(meta['team_id'])

    status_list = list(statuses)
    reference_sort_order = _get_default_statuses()
    def status_compare(s1, s2) -> int:
        idx1 = reference_sort_order.index(s1)
        idx2 = reference_sort_order.index(s2)
        idx1 = len(reference_sort_order) if idx1 < 0 else idx1
        idx2 = len(reference_sort_order) if idx2 < 0 else idx2
        return idx1 - idx2
    status_list.sort(key=cmp_to_key(status_compare))

    if len(team_ids) == 0:
        team_ids = _get_default_team_ids()

    teams = []
    for team_id in team_ids:
        team = frappe.get_doc('Team', team_id)
        teams.append({
            'id': team.name,
            'label': team.team_name
        })
    teams.sort(key=lambda item: item['label'])

    schedules = []
    for schedule_id in schedule_ids:
        schedule = frappe.get_doc('Schedule', schedule_id)
        schedules.append({
            'id': schedule.name,
            'label': schedule.schedule_name
        })
    schedules.sort(key=lambda item: item['label'])

    for schedule in schedules:
        bids = building_ids.get(schedule['id'])
        if bids is not None:
            schedule['buildings'] = sorted(list(map(lambda num: {'id': num, 'label': f'Building {num}'}, bids)),
                                           key=lambda item: item['label'])

    return {
        'teams': teams,
        'job_statuses': map(lambda s: {'id': s, 'label': s}, status_list),
        'schedules': schedules
    }


@frappe.whitelist(methods='POST')
def list_active_jobs(*args, **kwargs):
    filter_ars = frappe._dict(kwargs).get('filters')
    if isinstance(filter_ars, str):
        # called from js frappe.call
        request_json = json.loads(filter_ars)
    else:
        # called from other client that correctly send content-type: application/json
        request_json = filter_ars

    team_id: Optional[str] = request_json.get('team_id')
    statuses: Optional[List[str]] = request_json.get('statuses')
    building_numbers: Optional[List[int]] = request_json.get('building_numbers')
    schedule_ids: Optional[List[str]] = request_json.get('schedule_ids')

    _check_access_right()
    return _query_jobs(select_list="""
                           schedule.name as schedule_id,
                           schedule.schedule_color,
                           unit.full_name as site_unit_full_name,
                           unit.building_number,
                           job.name as job_id,
                           job.assigned_team as team_id,
                           job.status as job_status,
                           job.escalation_reason,
                           job.non_compliant_reason,
                           job.in_progress_start_time,
                           job.finished_timer_minutes
                           """,
                       order_clause="""
                       order by schedule.start_date ASC, schedule.site, job.assigned_team, unit.building_number,
                                unit.floor_number, unit.full_name 
                       """,
                       team_id=team_id,
                       statuses=statuses,
                       building_numbers=building_numbers,
                       schedule_ids=schedule_ids)


def _query_jobs(select_list: str,
                order_clause: str,
                team_id: Optional[str] = None,
                statuses: Optional[List[str]] = None,
                building_numbers: Optional[List[int]] = None,
                schedule_ids: Optional[List[str]] = None) -> List[dict]:

    default_statuses = _get_default_statuses()
    filter_statuses = default_statuses
    if statuses is not None and len(statuses) > 0:
        for s in statuses:
            if s not in default_statuses:
                frappe.throw(f'Invalid filter status: {s}')
        filter_statuses = statuses

    team_ids = []
    if common_utils.is_not_blank(team_id):
        team_ids.append(team_id)
    else:
        team_ids = _get_default_team_ids()
    if len(team_ids) == 0:
        frappe.throw(f'You do not belong to any {LEVEL_1}')
    team_condition = f'AND job.assigned_team in {db_utils.in_clause(team_ids)}'

    building_condition = ''
    if building_numbers is not None and len(building_numbers) > 0:
        building_condition = f'AND unit.building_number in {db_utils.in_clause(building_numbers)}'

    schedule_condition = ''
    if schedule_ids is not None and len(schedule_ids) > 0:
        schedule_condition = f'AND schedule.name in {db_utils.in_clause(schedule_ids)}'

    result_list = frappe.db.sql("""
            select {select_list}
            from `tabJob` job 
            inner join `tabSchedule` schedule on job.schedule = schedule.name
            inner join `tabSite Unit` unit on unit.name = job.site_unit
    		where 
    		    schedule.start_date <= %(current_date)s
    		    and schedule.status <> 'Completed' and schedule.status <> 'Cancelled'
    		    and job.installation_date = %(current_date)s
    		    {job_status_condition}
    		    {team_condition}
    		    {building_condition}
    		    {schedule_condition}
    		{order_clause}
        """.format(select_list=select_list,
                   order_clause=order_clause,
                   job_status_condition=f'AND job.status in {db_utils.in_clause(filter_statuses)}',
                   team_condition=team_condition,
                   building_condition=building_condition,
                   schedule_condition=schedule_condition
                   ),
                                values={'current_date': frappe.utils.nowdate()},
                                debug=False,
                                as_dict=True)
    return result_list


def _check_access_right():
    current_roles = frappe.get_roles(frappe.session.user)
    if INSTALLER not in current_roles and FIELD_LEAD not in current_roles:
        frappe.errprint(f'Denied user {frappe.session.user} having roles {current_roles}')
        frappe.throw('Permission denied! This page is not available for your role')


def _get_default_statuses() -> List[str]:
    """
    :return: sorted list
    """
    default_statuses = [READY, RESOLVED, IN_PROGRESS]
    current_roles = frappe.get_roles(frappe.session.user)
    if FIELD_LEAD in current_roles:
        default_statuses.append(ESCALATE_LEVEL_1)
        default_statuses.append(NON_COMPLIANT)
    return default_statuses

def _get_default_team_ids() -> List[str]:
    team_ids = []
    teams = Team.get_teams_of_current_user()
    for tm in teams:
        if tm.team_type == LEVEL_1:
            team_ids.append(tm.name)
    return team_ids
