// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job', {
    setup: function (jobCompForm) {
        jobCompForm.set_query('site_unit',
            function (frm, doctypeName /* it is "Job" */, currentJobUid) {
                return {
                    filters: {
                        schedule: jobCompForm.doc.schedule || '', // sent empty string when the schedule is not selected
                    }
                }
            });
        jobCompForm.set_query('assigned_team',
            function () {
                return {filters: {'team_type': 'Level I Team'}}
            });
    },

    onload: function (jobForm) {
        let is_level_1_team = (frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff");

        if (is_level_1_team) {
            $('#navbar-breadcrumbs').addClass('hide-item');
            $('.layout-side-section ul.user-actions').addClass('hide-item');
            $('.layout-side-section ul.sidebar-image-section').addClass('hide-item');
            $('.layout-side-section ul.form-schedules').addClass('hide-item');
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
            $('.layout-side-section ul.form-attachments .attachment-row .remove-btn').remove();
            $('.level-1-team-job .page-head .page-head-content .sidebar-toggle-btn').removeAttr('data-original-title');

            if (frappe.user.has_role("Field Installer")) {
                let statusField = jobForm.fields.find(item => item.df.fieldname === 'status')
                statusField.df.options = ["Ready", "Resolved - Ready", "In Progress", "Escalation - Field Lead", "Non-compliant", "Completed"];
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
    schedule: function (jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.schedule) {
            frappe.model.set_value(doctypeName, currentJobUid, 'schedule_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_name', undefined);
            frappe.model.set_value(doctypeName, currentJobUid, 'site_unit', undefined);
        }
    },

    site_unit: function (jobForm, doctypeName, currentJobUid) {
        if (!jobForm.doc.site_unit) {
            frappe.model.set_value(doctypeName, currentJobUid, 'unit_name', undefined);
        }
    }
});

function updateJobActivity() {
    let timelineItem = $('.job-activity-image').closest('div.timeline-item')
    $(timelineItem).find('.timeline-badge').addClass('hide-item');
    $(timelineItem).find('.timeline-content a').addClass('hide-item');
    $(timelineItem).find('.timeline-content span').addClass('hide-item');
}
