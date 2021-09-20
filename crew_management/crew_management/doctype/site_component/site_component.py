# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class SiteComponent(Document):

    def db_insert(self):
        self.full_name = f'{self.label} {self.component_name}'
        super(SiteComponent, self).db_insert()

    def db_update(self):
        self.full_name = f'{self.label} {self.component_name}'
        is_full_name_changed = self.full_name != self.get_db_value('full_name')

        super(SiteComponent, self).db_update()

        if is_full_name_changed:
            self._update_parent_site_component_name()

    def _update_parent_site_component_name(self):
        conditions, values = frappe.db.build_conditions({'parent_site_component': ('=', self.name)})

        values['full_name'] = self.full_name

        return frappe.db.sql("UPDATE `tab{doctype}` SET parent_site_component_name =  %(full_name)s WHERE {conditions}".format(
            doctype=self.doctype,
            conditions=conditions
        ), values, debug=False)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_component_query(doctype, keyword, searchfield, start, page_len, filters):
    """
    Custom (override) default query for doctype Site Component
    :param doctype:
    :param keyword:
    :param searchfield:
    :param start:
    :param page_len:
    :param filters:
    :return:
    """
    from frappe.desk.reportview import get_match_cond

    # filters is None when calling from the assignment's Job

    site_uid = filters.get('site') if filters is not None else ''
    component_of_same_site_condition = ''
    if site_uid is not None and site_uid != '':
        component_of_same_site_condition = 'AND site = %(site_uid)s'

    exclude_current_component_condition = ''
    current_component_uid = filters.get('self_uid') if filters is not None else ''
    if current_component_uid is not None and current_component_uid != '':
        exclude_current_component_condition = 'AND name <> %(current_component_uid)s'

    component_name_condition = ''
    if keyword is not None and keyword != '':
        component_name_condition = 'AND component_name LIKE %(keyword)s'

    return frappe.db.sql("""
        SELECT name, full_name, site_name
        FROM `tabSite Component`
        WHERE
            docstatus < 2
            {component_name_condition}
            {component_of_same_site_condition}
            {exclude_current_component_condition}
            {mcond}
        ORDER BY
            label, component_name
        LIMIT %(start)s, %(page_len)s
    """.format(**{
        'mcond': get_match_cond(doctype),
        'exclude_current_component_condition': exclude_current_component_condition,
        'component_of_same_site_condition': component_of_same_site_condition,
        'component_name_condition': component_name_condition
    }), {
         'keyword': "%{}%".format(keyword),
         'site_uid': site_uid,
         'current_component_uid': current_component_uid,
         'start': start,
         'page_len': page_len
         })
