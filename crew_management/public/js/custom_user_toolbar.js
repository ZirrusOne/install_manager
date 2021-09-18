$(document).ready(function () {
    if (frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator")) {
        $('.navbar-home').attr("href", "/app")
    } else if (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) {
        $('.navbar-home').attr("href", "/app/job-management")
    } else if (frappe.user.has_role("Back Office Staff")) {
        // set default url for back office staff
    }

    $("#toolbar-user .dropdown-item:contains('Session Defaults')").remove();
    $("#toolbar-user .dropdown-item:contains('View Website')").remove();
    $("#toolbar-user .dropdown-item:contains('Toggle Full Width')").remove();
    $("#toolbar-user .dropdown-item:contains('Background Jobs')").remove();
})
