// Frappe behavior:
//  List of items shown on sidebar:
//      - is the list of Workspace items
//      - returned by desktop.py#get_desk_sidebar_items. Those items will be places on file frappe/www/app.html by
//          frappe/www/app.py
//      - Item to display = workspace of modules that (module) the current user has permission on:
//         user.py#build_permissions
//          build lists of what the user can read / write / create
//          If a user has permission on on doctype, he/she will have permission on that module.
//  Sidebar and Pages are rendered by frappe/public/js/frappe/views/workspace/workspace.js sidebar toggling is done here.
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

    // For F5 from the installer-manage page
    customizeZ1nSidebar();

    frappe.router.on('change', () => {
        if ($('#page-Workspaces:visible').length) {
            if ('Workspaces/Install Manager' !== frappe.get_route_str()) {
                $('#page-Workspaces .z1n-panel a[href^="/app/install-manager"]').removeClass('selected');
            } else {
                $('#page-Workspaces .z1n-panel a[href^="/app/install-manager"]').addClass('selected');
            }
        }
    });

    if (!frappe.user.has_role("Administrator")) {
        hideMenus();
    }

})

function customizeZ1nSidebar() {
    if (!$('#page-Workspaces').length || $('#page-Workspaces .layout-side-section .z1n-panel').length) {
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

function hideMenus() {
    let standardSideBarWrapper = $('.overlay-sidebar-wrapper');
    standardSideBarWrapper.css('display', 'none');

    frappe.call({
        method: 'install_manager.install_manager.doctype.workspace_menus.workspace_menus.get_visible_menus',
        args: {},
        type: 'GET',
        callback: function (result) {
            let visibleWorkspaces = result.message;
            let visibleUrls = [];
            visibleWorkspaces.forEach((w) => {
                visibleUrls.push('/app/' + frappe.router.slug(w));
            });

            console.log(visibleUrls);

            standardSideBarWrapper.find('.standard-sidebar-section')
                .each(function() {
                   let section = $(this);
                    section.find('a.desk-sidebar-item')
                        .each(function() {
                           let menuItem = $(this);
                           if (!visibleUrls.includes(menuItem.attr('href'))) {
                               menuItem.remove();
                           }
                        });
                    if (!section.find('a.desk-sidebar-item').length) {
                        section.remove();
                    }
                });
            standardSideBarWrapper.css('display', 'block');
        }
    });
}
