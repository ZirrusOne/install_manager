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
    constructor(wrapper) {
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Management',
            single_column: true
        });

        $(frappe.render_template('job_management')).appendTo(this.page.body);
    }

    initData() {
        this.getData('');
    }

    getData(filter) {
        let content = "";
        $(this.page.body).find('.job-wrapper').html('');

        frappe.call({
            method: 'crew_management.crew_management.page.job_management.job_management.get_job_base_team',
            args: {
                searchValue: filter,
            },
            callback: (r) => {
                let data = JSON.parse(r.message);
                if (data.length) {
                    console.log(data)
                    let i;
                    for (i = 0; i < data.length; i++) {
                        let teamWrapper = "<div class='team-wrapper'><div class='team-title'>" + data[i].team + "</div>"
                        const listJob = data[i].jobs;
                        if (listJob) {
                            let j;
                            teamWrapper += "<div class='list-job'>"
                            for (j = 0; j < listJob.length; j++) {
                                let jobItem = "<div class='job-item'>" + listJob[j].label + " " + listJob[j].component_name + " - " + listJob[j].status + "</div>"
                                teamWrapper += jobItem;
                            }
                            teamWrapper += "</div></div>"
                        }
                        content += teamWrapper;
                    }
                    $(this.page.body).find('.job-wrapper').append(content);
                } else {
                    $(this.page.body).find('.job-wrapper').append('No result');
                }
            }
        });
    }
}
