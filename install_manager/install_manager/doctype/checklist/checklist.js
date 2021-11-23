// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Checklist', {
    refresh: function(frm) {
        if (frm.is_new()) {
            return;
        }
        frm.add_custom_button(__('Update Job Checklists'), function() {
            if (frm.is_dirty()) {
                frappe.msgprint('Please save before updating related Jobs');
                return;
            }

            frappe.call({
                method: 'install_manager.install_manager.doctype.job.job.update_checklist',
                args: {
                    checklist_id: frm.docname
                },
                // freeze the screen until the request is completed
                freeze: true,
                callback: (response) => {
                    frappe.msgprint(response.message.message);
                }
            })
        }, __('Update'));
    }
});
