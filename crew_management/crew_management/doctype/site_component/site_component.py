# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class SiteComponent(Document):

    def db_update(self):
        self.full_name = f'{self.label} {self.component_name}'
        super(SiteComponent, self).db_update()

    def db_insert(self):
        self.full_name = f'{self.label} {self.component_name}'
        super(SiteComponent, self).db_insert()


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_component_query(doctype, txt, searchfield, start, page_len, filters):
    from frappe.desk.reportview import get_match_cond

    site_uid = filters.get('site')
    if site_uid is None or site_uid == '':
        return []

    exclude_current_component_condition = ''
    current_component_uid = filters.get('self_uid')
    if current_component_uid is not None and current_component_uid != '':
        exclude_current_component_condition = 'AND name <> %(current_component_uid)s'

    return frappe.db.sql("""
        SELECT name, label, component_name
        FROM `tabSite Component`
        WHERE
            docstatus < 2
            AND component_name LIKE %(txt)s
            AND parent = %(site_uid)s
            {exclude_current_component_condition}
            {mcond}
        ORDER BY
            label, component_name
        LIMIT %(start)s, %(page_len)s
    """.format(**{
        'mcond': get_match_cond(doctype),
        'exclude_current_component_condition': exclude_current_component_condition
    }), {
         'txt': "%{}%".format(txt),
         'site_uid': site_uid,
         'current_component_uid': current_component_uid,
         'start': start,
         'page_len': page_len
         })
