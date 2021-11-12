# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
from datetime import datetime
from typing import Optional

import frappe
from frappe.model.document import Document

class EscalationRecord(Document):
    resolution_time: datetime
    escalation_status: str

    @staticmethod
    def get_escalation_record(job_id) -> Optional['EscalationRecord']:
        last_escalation = frappe.db.sql("""
                                select name as escalation_record_id, escalation_time
                                from `tabEscalation Record`
                                where job = %(job_id)s
                                order by escalation_time desc
                                limit 1
                                """,
                                        values={'job_id': job_id},
                                        debug=False,
                                        as_dict=True
                                        )
        return None if len(last_escalation) == 0 \
            else frappe.get_doc('Escalation Record', last_escalation[0].escalation_record_id)

    @staticmethod
    def count_escalation_impacted_level(job_id, impacted_level) -> int:
        count = frappe.db.sql("""
                            select count(*) total
                            from `tabEscalation Record`
                            where job = %(job_id)s
                              and escalation_level = %(impacted_level)s
                            """,
                              values={'job_id': job_id, 'impacted_level': impacted_level},
                              debug=False,
                              as_dict=True
                              )
        if len(count) == 0 or count[0]['total'] is None:
            return 0
        return count[0]['total']
