$(document).ready(function () {
    $('html').addClass('z1n');

    // in Frappe, theme is personalized to individual users. Them "light" is default if the user
    // has not chosen any other theme for himself/herself. Frappe doesn't provide any means (as of version 13)
    // to change the default theme (see file app.py in frappe framework). What we did here is kind of hacking.
    // The drawback of this hack is that: if a user switches his preferred theme to "light",
    // it will come back to this default "dark" when he presses F5!
    $('html').attr('data-theme', 'dark');
    document.querySelector(':root').style.setProperty('--vh', window.innerHeight + 'px');

    let isLevel1Team = frappe.user && frappe.user.has_role // undefined when not login
        && (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer"))
        && !frappe.user.has_role("Back Office Staff");
    if (isLevel1Team) {
        $('body').addClass('z1n-field-crew');
    }
});

