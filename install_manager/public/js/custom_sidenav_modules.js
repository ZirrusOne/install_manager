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
    let isLevel1Team = !frappe.user.has_role("Administrator")
        && (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer"))
        && !frappe.user.has_role("Field Manager");
    if (isLevel1Team) {
        return;
    }

    // Change the "Home" workspace to Install Manager when clicking on the logo on the top navbar.
    $('.main-section a.navbar-brand').attr('href', '/app/install-manager');

    // emitted by container.js#change_to
    $('#body').on('show', '.page-container', ()=> {
        customizeZ1nSidebar();
    });

    // For F5 from the installer-manage page
    customizeZ1nSidebar();

    if (!frappe.user.has_role("Administrator")) {
        hideMenus();
    }
})

function customizeZ1nSidebar() {
    if ($('#page-Workspaces').length && !$('#page-Workspaces .layout-side-section .z1n-panel').length) {
        let sidebarModules = $('.standard-sidebar-label:contains("Modules")');
        sidebarModules.remove();

        insertZ1NPanel();

        $('#page-Workspaces .layout-side-section').on('mouseenter', '.standard-sidebar-item', function() {
            let menuItem = $(this);
            if (!menuItem.attr('title')) {
                let label = menuItem.find('.sidebar-item-label').first();
                if (label[0].offsetWidth < label[0].scrollWidth) {
                    menuItem.attr('title', label.text());
                }
            }
        });
    }

    fillCurrentShortcuts();
}

function insertZ1NPanel() {
    let sideBarSection = $('#page-Workspaces .layout-side-section');

    let overlaySideBar = sideBarSection.children('.overlay-sidebar').first();
    overlaySideBar.before([
        '<div class="z1n-panel">',
        '   <div class="desk-sidebar list-unstyled sidebar-menu">',
        '       <div class="standard-sidebar-section">',
                    getSideBarItemHtml('Workspace', '#', 'crm', true, 'z1n-panel-workspace'),
        '       </div>',
        '   </div>',
        '</div>'
    ].join(''));
    overlaySideBar.wrap('<div class="overlay-sidebar-wrapper"></div>');
}

function getSideBarItemHtml(name, uri, icon, selected, additionalClass='') {
    // icon taken from symbol-defs.svg

    return [
        '<a href="', uri, '" class="desk-sidebar-item standard-sidebar-item ', selected ? 'selected' : '', ' ', additionalClass, '">',
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
            let last_visit_workspace_now_visible = false;
            let visibleUrls = [];
            visibleWorkspaces.forEach((w) => {
                visibleUrls.push('/app/' + frappe.router.slug(w));
                if (localStorage.current_workspace && localStorage.current_workspace === w) {
                    last_visit_workspace_now_visible = true;
                }
            });

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

            if (!last_visit_workspace_now_visible) {
                if (!frappe.user.has_role("Administrator") && frappe.user.has_role("Field Manager")) {
                    frappe.router.push_state('/app/' + frappe.router.slug('Install Manager'));
                } else if (visibleWorkspaces.length) {
                    frappe.router.push_state('/app/' + frappe.router.slug(visibleWorkspaces.get(0)));
                }
            }
        }
    });
}

function fillCurrentShortcuts() {
    if (!$('#page-Workspaces:visible').length) {
        // not a workspace page
        return;
    }

    $('.z1n-panel .standard-sidebar-section').find('.desk-sidebar-item')
        .each(function() {
            let item = $(this);
            if (!item.hasClass('z1n-panel-workspace')) {
                item.remove();
            }
        });

    let pageName =  frappe.get_route().length > 1 ? frappe.get_route()[1] : '';
    if (!pageName) {
        for (let page of frappe.boot.allowed_workspaces) {
            if (page.selected) {
                pageName = page.name;
                break;
            }
        }
    }
    if (!pageName) {
        console.log('Cannot determine current page');
        return;
    }

    frappe.call({
        method: 'frappe.desk.desktop.get_desktop_page',
        args: {page: pageName},
        type: 'POST',
        callback: function (result) {
            let workspacePage = result.message;
            if (Object.keys(workspacePage).length === 0) {
                return;
            }
            if (frappe.get_route() .length > 1 && frappe.get_route()[1] && frappe.get_route()[1] !== pageName) {
                // quickly clicked on various items
                console.log('Page has changed before page data arrived');
                return;
            }

            let shortcuts = workspacePage.shortcuts.items.slice(0, 3);

            shortcuts.forEach((shortcut) => {
                let route = frappe.utils.generate_route({
                    route: null,
                    name: shortcut.link_to,
                    type: shortcut.type,
                    is_query_report: false,
                    doctype: null,
                    doc_view: shortcut.doc_view
                });

                let icon;
                if (shortcut.icon) {
                    icon = shortcut.icon
                } else {
                    icon ='project';
                }

                $('.z1n-panel .standard-sidebar-section').append(
                    getSideBarItemHtml(shortcut.label, route, icon, false, '')
                );
            });
        }
    });

}
