// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Schedule', {
    setup: function(scheduleForm) {
        // Now all teams can be selected
        // scheduleForm.set_query('assigned_teams',
        //     function (){
        //         return { filters: { 'team_type': 'Level II Team' } }
        //     });
    },

    refresh: function(scheduleForm) {
        if (scheduleForm.is_new()) {
            return;
        }
        scheduleForm.add_custom_button(__('Jobs from Site Units'), function() {
            if (scheduleForm.is_dirty()) {
                frappe.msgprint('Please save before creating Jobs from Site Units.');
                return;
            }

            frappe.call({
                method: 'install_manager.install_manager.doctype.job.job.generate_jobs',
                args: {
                    schedule_id: scheduleForm.docname
                },
                // freeze the screen until the request is completed
                freeze: true,
                callback: (response) => {
                    frappe.msgprint(response.message.message);
                }
            })
        }, __('Create'));
    }
});
