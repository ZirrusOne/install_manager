///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-management"].on_page_load = (wrapper) => {
    const job_management = new JobManagement(wrapper);
    $('#navbar-breadcrumbs').addClass('hide-item');
    $(wrapper).bind('show', () => {
        let isFieldLead = frappe.user.has_role("Field Lead");
        job_management.isFieldLead = isFieldLead;
        job_management.isEscalationView = !!isFieldLead;
        job_management.isFirstTimeLoad = true;
        job_management.initData(wrapper);
    });
    window.job_management = job_management;
};

class JobManagement {
    isFieldLead;
    isEscalationView;
    isFirstTimeLoad;
    previousSearchField = '';

    constructor(wrapper) {

    }

    initData(wrapper) {
        let aThis = this;
        $(wrapper).empty();
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

        if (this.isFieldLead) {
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
        $('.page-head .page-actions .menu-btn-group button.btn-default.icon-btn').removeAttr('data-original-title');

        this.getData('');
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        $(element).hasClass('collapsed') ? $(element).addClass('border-none') : $(element).removeClass('border-none')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    getData(filter) {
        $(this.page.main).find('.job-wrapper').remove();
        frappe.call({
            method: 'crew_management.crew_management.page.job_management.job_management.get_job_base_team',
            args: {
                searchValue: filter,
                isEscalation: this.isEscalationView
            },
            callback: (r) => {
                let data = JSON.parse(r.message);
                if (this.isFirstTimeLoad && this.isEscalationView) {
                    this.isFirstTimeLoad = false;
                    if (data.length === 0) {
                        this.isEscalationView = false;
                        this.getData(filter)
                    } else {
                        this.setTitleView();
                        $(frappe.render_template('job_management', {
                            isEscalation: this.isEscalationView,
                            result: data,
                        })).appendTo($(this.page.main));
                    }
                } else {
                    this.setTitleView();
                    $(frappe.render_template('job_management', {
                        isEscalation: this.isEscalationView,
                        result: data,
                    })).appendTo($(this.page.main));
                }
            }
        });
    }

    setTitleView() {
        let title = this.isEscalationView ? "Escalations" : "Assigned Jobs";
        let element = $('.navbar .container').find('.job-title');
        if (element.length > 0) {
            $('.navbar .container .job-title').text(title);
        } else {
            $('.navbar .container a.navbar-brand').after("<div class='job-title'>" + title + "</div>");
        }
        this.isEscalationView ? $('.navbar .container .job-title').addClass('red') : $('.navbar .container .job-title').removeClass('red')
    }
}
