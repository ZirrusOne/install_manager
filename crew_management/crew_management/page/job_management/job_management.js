///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages['job-management'].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Job Management',
        single_column: true
    });

    page.main.html(frappe.render_template('job_management', {}));

}
