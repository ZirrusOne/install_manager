$(document).ready(function () {
    let isBackOffice = frappe.user.has_role("Back Office Staff") && !frappe.user.has_role("Administrator");
    let moduleNodeElm = $('.standard-sidebar-label:contains("Modules")');
    let sideBarModuleSectionElm = moduleNodeElm.parent();

    if (isBackOffice) {
        removeChildren(sideBarModuleSectionElm, 'Install Manager', 'DASHBOARD');

        moduleNodeElm.text(frappe.defaults.get_user_default("Company"));
        moduleNodeElm.css('text-transform', 'none');

        let installManagerElm = sideBarModuleSectionElm.children('a[href^="/app/install-manager"]');
        installManagerElm
            .after([
                getSideBarItemHtml('TEAMS', '/app/team', 'users'),
                getSideBarItemHtml('SCHEDULES', '/app/schedule', 'calendar'),
                getSideBarItemHtml('SITES', '/app/site', 'organization')
            ].join(''));
        installManagerElm.html(getSideBarItemInner('DASHBOARD', 'crm'));  // icon dashboard

        let administrationElm = $('.standard-sidebar-label:contains("Administration")');
        removeChildren(administrationElm.parent(), 'Users');
        administrationElm.parent().children('a[href^="/app/users"]').children('.sidebar-item-label').html('USERS');
    } else {
        let installManagerElm = sideBarModuleSectionElm.children('a[href^="/app/install-manager"]');
        installManagerElm
            .after([
                getSideBarItemHtml('Teams', '/app/team', 'users'),
                getSideBarItemHtml('Schedules', '/app/schedule', 'calendar'),
                getSideBarItemHtml('Sites', '/app/site', 'organization')
            ].join(''));
        installManagerElm.html(getSideBarItemInner('Install Manager', 'projects'));
    }

})

function removeChildren(containerElm, keepItemWithText) {
    containerElm.each(function() {
        let removeItems = [];
        this.childNodes.forEach(item => {
            if (item.classList.contains('desk-sidebar-item') && item.innerText.toLowerCase() !== keepItemWithText.toLowerCase()) {
                removeItems.push(item);
            }
        })

        removeItems.forEach(item => {
            this.removeChild(item);
        })
    });
}

function getSideBarItemHtml(name, uri, icon) {
    return [
        '<a href="', uri, '" class="desk-sidebar-item standard-sidebar-item">',
        getSideBarItemInner(name, icon),
        '</a>'
    ].join('');
}

function getSideBarItemInner(name, icon) {
    return [
        '   <span>',
        frappe.utils.icon(icon || "folder-normal", "md"),
        '   </span>',
        '   <span class="sidebar-item-label">', name, '</span>',
    ].join('');
}
