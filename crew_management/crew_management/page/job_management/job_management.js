///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-management"].on_page_load = (wrapper) => {
    const job_management = new JobManagement(wrapper);

    $(wrapper).bind('show', () => {
        job_management.initData();
    });

    window.job_management = job_management;
};

class JobManagement {
    isEscalationView = false;

    constructor(wrapper) {
        let aThis = this;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Management',
            single_column: true
        });


        let searchField = this.page.add_field({
            label: 'Search by name',
            fieldtype: 'Data',
            fieldname: 'search',
            change() {
                aThis.getData(searchField.get_value());
            }
        });
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
                    result: data
                })).appendTo($(this.page.main));
            }
        });
    }
}
