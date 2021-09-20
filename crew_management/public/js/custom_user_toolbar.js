$(document).ready(function () {
    let is_field_crew = (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff");
    let is_back_office_staff = frappe.user.has_role("Back Office Staff");

    if (is_field_crew) {
        $('.navbar-home').attr("href", "/app/job-management")
    } else if (is_back_office_staff) {
        // set default url for back office staff
    } else {
        $('.navbar-home').attr("href", "/app")
    }

    $("#toolbar-user .dropdown-item:contains('Session Defaults')").remove();
    $("#toolbar-user .dropdown-item:contains('View Website')").remove();
    $("#toolbar-user .dropdown-item:contains('Toggle Full Width')").remove();
    $("#toolbar-user .dropdown-item:contains('Background Jobs')").remove();
})
