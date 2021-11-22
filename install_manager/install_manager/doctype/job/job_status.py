import frappe

from install_manager.install_manager.doctype.team import team_type

READY='Ready'
RESOLVED='Resolved - Ready'
IN_PROGRESS='In Progress'
ESCALATE_LEVEL_1='Escalation - Field Lead'
ESCALATE_LEVEL_2='Escalation - Level II'
ESCALATE_LEVEL_3='Escalation - Level III'
NON_COMPLIANT='Non-compliant'
COMPLETED='Completed'

def is_escalation_status(status) -> bool:
    return status is not None and status.startswith('Escalation')


def get_escalation_team_type(status) -> str:
    if not is_escalation_status(status):
        frappe.throw(f'Job status "{status}" is not an escalation status. Cannot determine escalation level')

    if status == ESCALATE_LEVEL_1:
        return team_type.LEVEL_1
    if status == ESCALATE_LEVEL_2:
        return team_type.LEVEL_2
    if status == ESCALATE_LEVEL_3:
        return team_type.LEVEL_3

    frappe.throw(f'Unhandled Job escalation status "{status}"')
