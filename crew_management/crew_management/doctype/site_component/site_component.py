# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe.model.document import Document


class SiteComponent(Document):

    def db_update(self):
        self.override_name()
        super(SiteComponent, self).db_update()

    def db_insert(self):
        self.override_name()
        super(SiteComponent, self).db_insert()

    def autoname(self):
        self.override_name()

    def override_name(self):
        self.name = f'{self.label} {self.component_name}, {self.parent_doc.site_name}'
        if self.parent_site_component is not None:
            self.parent_site_component_name = self.parent_site_component
        # self.full_name = self.name
        # self.parent_site_component = self.name
        # self.parent_site_component_name = self.name


# @frappe.whitelist()
# @frappe.validate_and_sanitize_search_inputs
# def site_component_query(doctype, txt, searchfield, start, page_len, filters):
#     from frappe.desk.reportview import get_match_cond
#
#     # filters is None when calling from the assignment's Job
#
#     site_uid = filters.get('site') if filters is not None else ''
#     component_of_same_site_condition = ''
#     if site_uid is not None and site_uid != '':
#         component_of_same_site_condition = 'AND parent = %(site_uid)s'
#
#     exclude_current_component_condition = ''
#     current_component_uid = filters.get('self_uid') if filters is not None else ''
#     if current_component_uid is not None and current_component_uid != '':
#         exclude_current_component_condition = 'AND name <> %(current_component_uid)s'
#
#     component_name_condition = ''
#     if txt is not None and txt != '':
#         component_name_condition = 'AND component_name LIKE %(txt)s'
#
#     return frappe.db.sql("""
#         SELECT name, label, component_name
#         FROM `tabSite Component` `siteCompo`
#         INNER JOIN `tabSite` `site` ON (site.name = siteCompo.parent)
#         WHERE
#             docstatus < 2
#             {component_name_condition}
#             {component_of_same_site_condition}
#             {exclude_current_component_condition}
#             {mcond}
#         ORDER BY
#             label, component_name
#         LIMIT %(start)s, %(page_len)s
#     """.format(**{
#         'mcond': get_match_cond(doctype),
#         'exclude_current_component_condition': exclude_current_component_condition,
#         'component_of_same_site_condition': component_of_same_site_condition,
#         'component_name_condition': component_name_condition
#     }), {
#          'txt': "%{}%".format(txt),
#          'site_uid': site_uid,
#          'current_component_uid': current_component_uid,
#          'start': start,
#          'page_len': page_len
#          })
