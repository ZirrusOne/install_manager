$(document).ready(function () {
    if ($('#page-Workspaces:visible').length === 0) {
        return;
    }

    // remove the default "Install Manager" item
    $('.standard-sidebar-label:contains("Modules")').parent().children('a[href^="/app/install-manager"]').remove();

    insertZ1NPanel();

    //let isBackOffice = frappe.user.has_role("Back Office Staff") && !frappe.user.has_role("Administrator");
    // let moduleNodeElm = $('.standard-sidebar-label:contains("Modules")');
    // let sideBarModuleSectionElm = moduleNodeElm.parent();
    //
    // if (isBackOffice) {
    //     removeChildren(sideBarModuleSectionElm, 'Install Manager', 'DASHBOARD');
    //
    //     moduleNodeElm.text(frappe.defaults.get_user_default("Company"));
    //     moduleNodeElm.css('text-transform', 'none');
    //
    //     let installManagerElm = sideBarModuleSectionElm.children('a[href^="/app/install-manager"]');
    //     installManagerElm
    //         .after([
    //             getSideBarItemHtml('TEAMS', '/app/team', 'users'),
    //             getSideBarItemHtml('SCHEDULES', '/app/schedule', 'calendar'),
    //             getSideBarItemHtml('SITES', '/app/site', 'organization')
    //         ].join(''));
    //     installManagerElm.html(getSideBarItemInner('DASHBOARD', 'crm'));  // icon dashboard
    //
    //     let administrationElm = $('.standard-sidebar-label:contains("Administration")');
    //     removeChildren(administrationElm.parent(), 'Users');
    //     administrationElm.parent().children('a[href^="/app/users"]').children('.sidebar-item-label').html('USERS');
    // } else {
    //     let installManagerElm = sideBarModuleSectionElm.children('a[href^="/app/install-manager"]');
    //     installManagerElm
    //         .after([
    //             getSideBarItemHtml('Teams', '/app/team', 'users'),
    //             getSideBarItemHtml('Schedules', '/app/schedule', 'calendar'),
    //             getSideBarItemHtml('Sites', '/app/site', 'organization')
    //         ].join(''));
    //     installManagerElm.html(getSideBarItemInner('Install Manager', 'projects'));
    // }

})

function insertZ1NPanel() {
    let sideBarSection = $('.layout-side-section');

    let overlaySideBar = sideBarSection.children('.overlay-sidebar').first();
    overlaySideBar.before([
        '<div class="z1n-panel">',
        '   <div class="desk-sidebar list-unstyled sidebar-menu">',
        '       <div class="standard-sidebar-section">',
                    getSideBarItemHtml('Dashboard', '/app/install-manager', 'crm',
                        'Workspaces/Install Manager' === frappe.get_route_str()),
                    getSideBarItemHtml('Schedules', '/app/schedule', 'calendar', false),
                    getSideBarItemHtml('Teams', '/app/team', 'users', false),
                    getSideBarItemHtml('Sites', '/app/site', 'organization', false),
        '       </div>',
        '   </div>',
        '</div>'
    ].join(''));
    overlaySideBar.wrap('<div class="overlay-sidebar-wrapper"></div>');

    frappe.router.on('change', () => {
        if ('Workspaces/Install Manager' !== frappe.get_route_str()) {
            $('.z1n-panel a[href^="/app/install-manager"]').removeClass('selected');
        } else {
            $('.z1n-panel a[href^="/app/install-manager"]').addClass('selected');
        }
    });
}

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

function getSideBarItemHtml(name, uri, icon, selected) {
    return [
        '<a href="', uri, '" class="desk-sidebar-item standard-sidebar-item ', selected ? 'selected' : '', '">',
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
