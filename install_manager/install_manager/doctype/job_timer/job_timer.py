# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document

class JobTimer(Document):

    @staticmethod
    def get_total_finished_timer(job_id) -> int:
        totals = frappe.db.sql("""
	                            select sum(duration_minutes) total_minutes
	                            from `tabJob Timer`
	                            where job = %(job_id)s and stop_time is not null
	                            """,
                               values={'job_id': job_id},
                               debug=False,
                               as_dict=True
                               )
        return 0 if len(totals) == 0 or totals[0]['total_minutes'] is None else totals[0]['total_minutes']
