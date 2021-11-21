let url = location.href;

$(document).ready(function () {
    checkLevel1TeamWhiteList();
});

document.body.addEventListener('click', () => {
    requestAnimationFrame(() => {
        let currentRoute = location.href;
        checkLevel1TeamWhiteList();
        if (url !== currentRoute) {
            url = location.href;
            if (!currentRoute.includes('job-management')) {
                $('#navbar-breadcrumbs').removeClass('hide-item');
                $('.navbar .container .job-title').addClass('hide-item')
            } else {
                $('.navbar .container .job-title').removeClass('hide-item')
                $('#navbar-breadcrumbs').addClass('hide-item');
            }
        }
    });
}, true);

function checkLevel1TeamWhiteList() {
    const level1TeamUrlWhitelist = [
        "app/user-profile",
        "app/job-management",
        "app/user/",
        "app/job-detail/",
    ]
    if ((frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff")) {
        let inWhiteListUrl = false;
        for (let item of level1TeamUrlWhitelist) {
            let currentPath = location.pathname;
            if (currentPath === '/app' || currentPath === '/app/' // home_page will be use which is controll by boot.py
                || currentPath.includes(item)) {

                inWhiteListUrl = true;
                break;
            }
        }

        if (!inWhiteListUrl) {
            frappe.router.push_state('/app/job-management');
        }
    }
}
