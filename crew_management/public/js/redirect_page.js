$(document).on("startup", function () {
    if (frappe.user.has_role("System Manager")) {
        frappe.set_route("/home");
    } else if (frappe.user.has_role("Back Office Staff")) {
        frappe.set_route("/site");
    } else if (frappe.user.has_role("Field Installer") || frappe.user.has_role("Field Lead")) {
        frappe.set_route("/assignment")
    }
});
