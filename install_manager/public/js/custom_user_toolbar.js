$(document).ready(function () {
    let is_level_1_team = (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff");
    let is_back_office_staff = frappe.user.has_role("Back Office Staff");

    if (is_level_1_team) {
        $('.navbar-home').attr("href", "/app/job-management")
    } else if (is_back_office_staff) {
        $('.navbar-home').attr("href", "/app/install-manager")
    } else {
        $('.navbar-home').attr("href", "/app")
    }

    $("#toolbar-user .dropdown-item:contains('Session Defaults')").remove();
    $("#toolbar-user .dropdown-item:contains('View Website')").remove();
    $("#toolbar-user .dropdown-item:contains('Toggle Full Width')").remove();
    $("#toolbar-user .dropdown-item:contains('Background Jobs')").remove();
})
