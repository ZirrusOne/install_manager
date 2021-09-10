///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-management"].on_page_load = (wrapper) => {
    const job_management = new JobManagement(wrapper);
    $('.navbar-home').attr("href", "/app/job-management")
    $(wrapper).bind('show', () => {
        job_management.initData();
    });

    window.job_management = job_management;
};

class JobManagement {
    isEscalationView;
    previousSearchField = '';

    constructor(wrapper) {
        let aThis = this;

        let isFieldLead = frappe.user.has_role("Field Lead");
        if (isFieldLead) {
            this.isEscalationView = true;
        }
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Management',
            single_column: true
        });

        let searchField = this.page.add_field({
            label: 'Unit Search',
            fieldtype: 'Data',
            fieldname: 'search',
            className: 'search-job',
            change() {
                if (aThis.previousSearchField !== searchField.get_value()) {
                    aThis.previousSearchField = searchField.get_value();
                    aThis.getData(searchField.get_value());
                }
            }
        }, this.page.custom_actions);

        if (isFieldLead) {
            this.page.add_menu_item("Field Lead View", function () {
                aThis.isEscalationView = true;
                aThis.getData('');
            }, "Menu");
            this.page.add_menu_item("Installer View", function () {
                aThis.isEscalationView = false;
                aThis.getData('');
            }, "Menu");
        }
        $('.menu-btn-group-label').find('svg').remove();
        $('.menu-btn-group-label').append("<svg class=\"icon icon-md\"><use xlink:href=\"#icon-menu\"></use></svg>");

        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
        $('.page-head .page-actions').find('.custom-actions').removeClass('hide hidden-xs hidden-md');
        $('.page-head .page-actions .custom-actions').find('.form-group').removeClass('col-md-2');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').removeClass('dropdown-menu-right');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').addClass('dropdown-menu-left');
    }

    initData() {
        this.getData('');
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    getData(filter) {
        $(this.page.main).find('.job-wrapper').remove()
        frappe.call({
            method: 'crew_management.crew_management.page.job_management.job_management.get_job_base_team',
            args: {
                searchValue: filter,
                isEscalation: this.isEscalationView
            },
            callback: (r) => {
                let data = JSON.parse(r.message);
                $(frappe.render_template('job_management', {
                    isEscalation: this.isEscalationView,
                    result: data,
                })).appendTo($(this.page.main));
            }
        });
    }
}
