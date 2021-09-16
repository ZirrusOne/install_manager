$(document).ready(function () {
    if (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) {
        $('.navbar-home').attr("href", "/app/job-management")
    }

    $("#toolbar-user .dropdown-item:contains('Session Defaults')").remove();
    $("#toolbar-user .dropdown-item:contains('View Website')").remove();
    $("#toolbar-user .dropdown-item:contains('Toggle Full Width')").remove();
    $("#toolbar-user .dropdown-item:contains('Background Jobs')").remove();
})
