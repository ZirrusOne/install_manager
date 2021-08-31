///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages['job-management'].on_page_load = function (wrapper) {
    let aThis = this;
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Job Management',
        single_column: true
    });

    page.main.html(frappe.render_template('job_management', {}));
    get_data(aThis);
}

let get_data = function (aThis) {
    let content = "";
    aThis.page.main.find('.job-wrapper').html('');

    frappe.call({
        'method': 'crew_management.crew_management.page.job_management.job_management.get_job_base_team',
        args: {
            searchValue: '',
        },
        callback: function (r) {
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
                aThis.page.main.find('.job-wrapper').append(content);
            } else {
                aThis.page.main.find('.job-wrapper').append('No result');
            }
        }
    });
}
