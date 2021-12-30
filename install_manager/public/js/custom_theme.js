$(document).ready(function () {

    let isLevel1Team = frappe.user && frappe.user.has_role // undefined when not login
        && (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer"))
        && !frappe.user.has_role("Field Manager");
    if (isLevel1Team) {
        $('body').addClass('z1n-field-crew');
    }
});

