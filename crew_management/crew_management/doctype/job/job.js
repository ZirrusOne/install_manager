// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job', {
    setup: function(jobCompForm) {
        jobCompForm.set_query('site_component',
            function(frm, doctypeName /* it is "Job" */, currentJobUid) {
                return {
                    filters: {
                        assignment: jobCompForm.doc.assignment || '', // sent empty string when the assignment is not selected
                    }
                }
            });
    },

    onload: function (frm) {
        if (frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator")) {
            $('#navbar-breadcrumbs').removeClass('hide-item');
            $('.sidebar-toggle-btn').removeClass('hide-item');
            $('.layout-side-section').removeClass('hide-item');
            $('.menu-btn-group').removeClass('hide-item');
        } else if (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) {
            $('#navbar-breadcrumbs').addClass('hide-item');
            $('.sidebar-toggle-btn').addClass('hide-item');
            $('.layout-side-section').addClass('hide-item');
            $('.menu-btn-group').addClass('hide-item');
            if (frappe.user.has_role("Field Installer")) {
                let statusField = frm.fields.find(item => item.df.fieldname === 'status')
                statusField.df.options = ["Pending", "In Progress", "Non-compliant", "Completed"];
            }
        }
    },

    // on field changed
    assignment: function(jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.assignment) {
            frappe.model.set_value(doctypeName, currentJobUid, 'assignment_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_component', undefined);
        }
    },

    site_component: function(jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.site_component) {
            frappe.model.set_value(doctypeName, currentJobUid, 'component_name', undefined);
        }
    }
});
