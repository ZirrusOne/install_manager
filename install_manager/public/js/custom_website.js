$(document).ready(function () {
    // change logo
    $("a.navbar-brand").empty();
    if (frappe.user && frappe.user.has_role) {
        // only when login
        $("a.navbar-brand").attr("href", "/app")
    }
    $("a.navbar-brand").append('<img src ="/assets/install_manager/images/z1n-logo.png"/>');

    $("#toolbar-user .dropdown-item:contains('View Website')").remove();

    //remove footer
    $(".web-footer").remove();
});
