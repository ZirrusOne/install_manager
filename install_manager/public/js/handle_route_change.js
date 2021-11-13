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
    const level_1_team_url_white_list = [
        "app/user-profile",
        "app/job-management",
        "app/user/",
        "app/job-detail/",
    ]
    if ((frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff")) {
        let inWhiteListUrl = false;
        level_1_team_url_white_list.forEach(item => {
            if (location.href.includes(item)) {
                inWhiteListUrl = true;
            }
        })

        if (!inWhiteListUrl) {
            window.location.href = "/app/job-management"
        }
    }
}
