from typing import List, Optional

import frappe
from frappe.core.doctype.docfield.docfield import DocField
from frappe.desk.form import load


@frappe.whitelist(allow_guest=True)
def getdoctype(doctype, with_parent=False, cached_timestamp=None):
    """
    Overrides frappe.desk.form.load.getdoctype
    """

    load.getdoctype(doctype, with_parent, cached_timestamp)

    if doctype != 'User':
        return
    if frappe.session.user is None or frappe.session.user == '':
        return

    is_default_administrator = 'Administrator' == frappe.session.user
    is_field_lead = 'Field Lead' in frappe.permissions.get_roles(frappe.session.user)
    is_field_installer = 'Field Installer' in frappe.permissions.get_roles(frappe.session.user)
    is_back_office = 'Back Office Staff' in frappe.permissions.get_roles(frappe.session.user)
    is_level_1_team = not is_default_administrator and  not is_back_office and (is_field_installer or is_field_lead)

    for doc in frappe.response.docs:
        if doc.name != 'User':
            continue

        # move fields phone and mobile_no from section "More Information" into section "Basic Info"
        # rearrange the form
        # firstly, sort field list by their index
        sorted(doc.fields, key=lambda f: f.idx)

        _move_field(fields=doc.fields, field_name_to_move='first_name', to_before_field='last_name')
        _move_field(fields=doc.fields, field_name_to_move='middle_name', to_after_field='last_name')
        _move_field(fields=doc.fields, field_name_to_move='middle_name', to_after_field='last_name')

        _move_field(fields=doc.fields, field_name_to_move='phone', to_before_field='full_name')
        _move_field(fields=doc.fields, field_name_to_move='mobile_no', to_before_field='full_name')

        _move_field(fields=doc.fields, field_name_to_move='language', to_before_field='username')
        _move_field(fields=doc.fields, field_name_to_move='time_zone', to_before_field='language')

        if is_level_1_team:
            doc.allow_rename = 0

            # Hide everything except "Basic Info" and "Change Password"
            for field in doc.fields:
                if field.fieldname == 'enabled' or \
                        (field.fieldtype == 'Section Break'
                            and field.fieldname != 'section_break_3'
                            and field.fieldname != 'change_password'):
                    field.hidden = 1


def _move_field(fields: List[DocField], field_name_to_move: str, to_after_field: Optional[str] = None,
                to_before_field: Optional[str] = None):
    index_to_move = _index_of(field_name=field_name_to_move, fields=fields)
    field_to_move = fields[index_to_move]
    del fields[index_to_move]

    if to_after_field is not None:
        index_target = _index_of(field_name=to_after_field, fields=fields)
        fields.insert(index_target + 1, field_to_move)

    if to_before_field is not None:
        index_target = _index_of(field_name=to_before_field, fields=fields)
        fields.insert(index_target, field_to_move)

    # reset indexes
    for i, field in enumerate(fields):
        field.idx = i


def _index_of(field_name: str, fields: List[DocField]) -> int:
    for i, field in enumerate(fields):
        if field.fieldname == field_name:
            return i
    frappe.throw(f'field name {field_name} is not found')
