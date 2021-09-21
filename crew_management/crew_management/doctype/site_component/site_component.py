# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

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
        frappe.db.sql("UPDATE `tabSite Component` SET parent_site_component_name =  %(full_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

        conditions, values = frappe.db.build_conditions({'site_component': ('=', self.name)})
        values['full_name'] = self.full_name
        frappe.db.sql("UPDATE `tabJob` SET component_name =  %(full_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_component_query(doctype, keyword, searchfield, start, page_len, filters):
    """
    Custom (override) default query for doctype Site Component.
    NOTE: name of parameter must be exactly like that, it must match what is sent from the client framework code!

    :param doctype:
    :param keyword:
    :param searchfield: ignore
    :param start:
    :param page_len:
    :param filters:
    :return:
    """

    if doctype != 'Site Component':
        frappe.throw(f'In valid doctype in Site Component query: {doctype}')

    sql_filter = {}
    if filters is not None:
        if filters.get('site', None) is not None:
            sql_filter['site'] = ('=', filters.get('site'))
        if filters.get('self_uid', None) is not None:
            sql_filter['name'] = ('!=', filters.get('self_uid'))
        if filters.get('assignment', None) is not None:
            if filters.get('assignment') == '':
                return []
            site_id = frappe.db.get_value('Assignment', {'name': filters.get('assignment')}, 'site')
            sql_filter['site'] = ('=', site_id)

    if keyword is not None and keyword != '':
        sql_filter['component_name'] = ('like', f'{keyword}%')

    conditions, values = frappe.db.build_conditions(sql_filter)
    if conditions != '':
        if filters.get('self_uid', None) is not None:
            conditions = f'AND ({conditions} AND (parent_site_component is null OR parent_site_component <> %(parent_site_component)s))'
            values['parent_site_component'] = filters.get('self_uid', None)
        else:
            conditions = f'AND {conditions}'

    values['start'] = start
    values['page_len'] = page_len

    return frappe.db.sql("""
        SELECT name, full_name, site_name
        FROM `tabSite Component`
        WHERE
            docstatus < 2
            {conditions}
        ORDER BY
            full_name, site_name
        LIMIT %(start)s, %(page_len)s
    """.format(conditions=conditions), values=values, debug=False)
