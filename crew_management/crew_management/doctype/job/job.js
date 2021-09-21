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
        jobCompForm.set_query('assigned_team',
            function (){
                return { filters: { 'team_type': 'Field Crew' } }
            });
    },

    onload: function (frm) {
        let is_field_crew = (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff");
        let is_back_office_staff = frappe.user.has_role("Back Office Staff");

        if (is_field_crew) {
            // TODO to show only attachment
            // $('#navbar-breadcrumbs').addClass('hide-item');
            // $('.sidebar-toggle-btn').addClass('hide-item');
            // $('.layout-side-section').addClass('hide-item');
            // $('.menu-btn-group').addClass('hide-item');
            if (frappe.user.has_role("Field Installer")) {
                let statusField = frm.fields.find(item => item.df.fieldname === 'status')
                statusField.df.options = ["Pending", "In Progress", "Escalation - Field Lead", "Non-compliant", "Completed"];
            }
        } else {
            $('#navbar-breadcrumbs').removeClass('hide-item');
            $('.sidebar-toggle-btn').removeClass('hide-item');
            $('.layout-side-section').removeClass('hide-item');
            $('.menu-btn-group').removeClass('hide-item');
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
