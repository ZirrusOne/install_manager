import frappe


def in_clause(items) -> str:
    return "({0})".format(", ".join([frappe.db.escape(v) for v in items]))
