// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job', {
    setup: function (jobCompForm) {
        jobCompForm.set_query('site_component',
            function (frm, doctypeName /* it is "Job" */, currentJobUid) {
                return {
                    filters: {
                        assignment: jobCompForm.doc.assignment || '', // sent empty string when the assignment is not selected
                    }
                }
            });
        jobCompForm.set_query('assigned_team',
            function () {
                return {filters: {'team_type': 'Field Crew'}}
            });
    },

    onload: function (jobForm) {
        let is_field_crew = (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff");

        if (is_field_crew) {
            $('#page-Job').addClass("field-crew-job");
            $('#navbar-breadcrumbs').addClass('hide-item');
            $('.layout-side-section ul.user-actions').addClass('hide-item');
            $('.layout-side-section ul.sidebar-image-section').addClass('hide-item');
            $('.layout-side-section ul.form-assignments').addClass('hide-item');
            $('.layout-side-section ul.form-reviews').addClass('hide-item');
            $('.layout-side-section ul.form-shared').addClass('hide-item');
            $('.layout-side-section ul.followed-by-section').addClass('hide-item');
            $('.layout-side-section ul.form-tags').addClass('hide-item');
            $('.layout-side-section ul.form-sidebar-stats').addClass('hide-item');
            $('.layout-side-section ul.text-muted').addClass('hide-item');
            $('.layout-side-section hr').addClass('hide-item');
            $('.form-footer .timeline-actions').addClass('hide-item');
            $('.standard-actions .menu-btn-group').addClass('hide-item');
            $('.standard-actions .page-icon-group').addClass('hide-item');
            $('.layout-side-section ul.form-attachments .attachment-row button a svg').remove();

            if (frappe.user.has_role("Field Installer")) {
                let statusField = jobForm.fields.find(item => item.df.fieldname === 'status')
                statusField.df.options = ["Pending", "In Progress", "Escalation - Field Lead", "Non-compliant", "Completed"];
            }
        }
    },
    refresh: function (jobForm) {
        updateJobActivity()
    },
    timeline_refresh: function (jobForm) {
        updateJobActivity()
    },
    // on field changed
    assignment: function (jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.assignment) {
            frappe.model.set_value(doctypeName, currentJobUid, 'assignment_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_component', undefined);
        }
    },

    site_component: function (jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.site_component) {
            frappe.model.set_value(doctypeName, currentJobUid, 'component_name', undefined);
        }
    }
});

function updateJobActivity() {
    let timelineItem = $('.job-activity-image').closest('div.timeline-item')
    $(timelineItem).find('.timeline-badge').addClass('hide-item');
    $(timelineItem).find('.timeline-content a').addClass('hide-item');
    $(timelineItem).find('.timeline-content span').addClass('hide-item');
}
