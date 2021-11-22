# Copyright (c) 2021, Zirrus One and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SiteUnit(Document):

    def db_insert(self):
        self.full_name = f'{self.label} {self.unit_name}'
        self.unique_key = f'{self.site}__{self.full_name}'
        super(SiteUnit, self).db_insert()

    def db_update(self):
        self.full_name = f'{self.label} {self.unit_name}'
        self.unique_key = f'{self.site}__{self.full_name}'
        is_full_name_changed = self.full_name != self.get_db_value('full_name')
        is_building_number_changed = self.building_number != self.get_db_value('building_number')
        is_floor_number_changed = self.floor_number != self.get_db_value('floor_number')

        super(SiteUnit, self).db_update()

        if is_full_name_changed:
            self._update_parent_site_unit_name()
        if is_building_number_changed:
            self._update_job_building_number()
        if is_floor_number_changed:
            self._update_job_floor_number()

    def _update_parent_site_unit_name(self):
        conditions, values = frappe.db.build_conditions({'parent_site_unit': ('=', self.name)})
        values['full_name'] = self.full_name
        frappe.db.sql("UPDATE `tabSite Unit` SET parent_site_unit_name =  %(full_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

        conditions, values = frappe.db.build_conditions({'site_unit': ('=', self.name)})
        values['full_name'] = self.full_name
        frappe.db.sql("UPDATE `tabJob` SET unit_name =  %(full_name)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

    def _update_job_building_number(self):
        conditions, values = frappe.db.build_conditions({'site_unit': ('=', self.name)})
        values['building_number'] = self.building_number

        frappe.db.sql("UPDATE `tabJob` SET building_number =  %(building_number)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)

    def _update_job_floor_number(self):
        conditions, values = frappe.db.build_conditions({'site_unit': ('=', self.name)})
        values['floor_number'] = self.floor_number

        frappe.db.sql("UPDATE `tabJob` SET floor_number =  %(floor_number)s WHERE {conditions}".format(
            conditions=conditions
        ), values, debug=False)


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def site_unit_query(doctype, txt, searchfield, start, page_len, filters):
    """
    Custom (override) default query for doctype Site Unit.
    NOTE: name of parameter must be exactly like that, it must match what is sent from the client framework code!

    :param doctype:
    :param txt: search keyword
    :param searchfield: ignore
    :param start:
    :param page_len:
    :param filters:
    :return:
    """

    if doctype != 'Site Unit':
        frappe.throw(f'In valid doctype in Site Unit query: {doctype}')

    sql_filter = {}
    if filters is not None:
        if filters.get('site', None) is not None:
            sql_filter['site'] = ('=', filters.get('site'))
        if filters.get('self_uid', None) is not None:
            sql_filter['name'] = ('!=', filters.get('self_uid'))
        if filters.get('schedule', None) is not None:
            if filters.get('schedule') == '':
                return []
            site_id = frappe.db.get_value('Schedule', {'name': filters.get('schedule')}, 'site')
            sql_filter['site'] = ('=', site_id)

    if txt is not None and txt != '':
        sql_filter['unit_name'] = ('like', f'{txt}%')

    conditions, values = frappe.db.build_conditions(sql_filter)
    if conditions != '':
        if filters.get('self_uid', None) is not None:
            conditions = f'AND ({conditions} AND (parent_site_unit is null OR parent_site_unit <> %(parent_site_unit)s))'
            values['parent_site_unit'] = filters.get('self_uid', None)
        else:
            conditions = f'AND {conditions}'

    values['start'] = start
    values['page_len'] = page_len

    return frappe.db.sql("""
        SELECT name, full_name, site_name
        FROM `tabSite Unit`
        WHERE
            docstatus < 2
            {conditions}
        ORDER BY
            full_name, site_name
        LIMIT %(start)s, %(page_len)s
    """.format(conditions=conditions), values=values, debug=False)


@frappe.whitelist()
def generate_site_units(site_id):
    if site_id is None or site_id == '':
        frappe.throw('Site ID is not provided')

    site = frappe.get_doc('Site', site_id)

    if site.number_of_buildings is None or site.number_of_buildings <= 0:
        frappe.throw('Number of Buildings is not defined for this site')
    if site.number_floors_per_building is None or site.number_floors_per_building <= 0:
        frappe.throw('Number Floors per Building is not defined for this site')
    if site.number_units_per_floor is None or site.number_units_per_floor <= 0:
        frappe.throw('Number Units per Floor is not defined for this site')

    unit_number = 0
    try:
        for building in range(1, site.number_of_buildings + 1):
            for floor in range(1, site.number_floors_per_building + 1):
                for unit_floor in range(1, site.number_units_per_floor + 1):
                    unit_number = unit_number + 1

                    frappe.get_doc({
                        'doctype': 'Site Unit',
                        'site': site.name,
                        'unit_name': f'{unit_number}',
                        'label': 'Unit',
                        'building_number': building,
                        'floor_number': floor,
                        'site_name': site.site_name
                    }).insert()
    except (frappe.DuplicateEntryError, frappe.UniqueValidationError):
        if frappe.message_log:
            frappe.message_log.pop()
        frappe.throw(f'{unit_number - 1} new Site Units created. Failed to create Site Unit "Unit {unit_number}". '
                   f'It has already existed')

    return {
        'message': f'{unit_number} new Site Units created for {site.site_name}'
    }
