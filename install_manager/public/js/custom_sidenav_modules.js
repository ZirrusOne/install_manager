// Frappe behavior:
//  List of items shown on sidebar: is the list of Workspace (doctype) items
//  returned by desktop.py#get_desk_sidebar_items. Those items will be places on file frappe/www/app.html by
//  frappe/www/app.py
//  Sidebar and Pages are rendered by frappe/public/js/frappe/views/workspace/workspace.js sidebar toogle is done here.
//
// Everytime an item in the sidebar is clicked, an html of the page is generated and inserted to the main page.
// Previous page is hidden.
// Only Workspace pages have sidebar menu. Other pages have sidebar filters
// Each page is a frappe/public/js/frappe/ui/page.js

$(document).ready(function () {
    // emitted by container.js#change_to
    $('#body').on('show', '.page-container', ()=> {
        customizeZ1nSidebar();
    });

    frappe.router.on('change', () => {
        console.log(frappe.get_route_str());
        if ($('#page-Workspaces:visible').length) {
            if ('Workspaces/Install Manager' !== frappe.get_route_str()) {
                $('#page-Workspaces .z1n-panel a[href^="/app/install-manager"]').removeClass('selected');
            } else {
                $('#page-Workspaces .z1n-panel a[href^="/app/install-manager"]').addClass('selected');
            }
        }
    });

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

function customizeZ1nSidebar() {
    if (!$('#page-Workspaces').length || $('#page-Workspaces .layout-side-section .z1n-panel').length) {
        console.log('#page-Workspaces ' + $('#page-Workspaces:visible').length);
        console.log('#page-Workspaces .layout-side-section .z1n-panel ' + $('#page-Workspaces .layout-side-section .z1n-panel').length);
        return;
    }
    // remove the default "Install Manager" item
    let sidebarModules = $('.standard-sidebar-label:contains("Modules")');
    sidebarModules.parent().children('a[href^="/app/install-manager"]').remove();
    sidebarModules.remove();

    insertZ1NPanel();
}

function insertZ1NPanel() {
    let sideBarSection = $('#page-Workspaces .layout-side-section');

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
