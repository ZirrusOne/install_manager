// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Site', {
    refresh: function(siteForm) {
        if (siteForm.is_new()) {
            return;
        }
        siteForm.add_custom_button(__('Site Objects'), function() {
            if (siteForm.dirty()) {
                frappe.msgprint('Please save before generating site objects.');
                return;
            }

            frappe.call({
                method: 'install_manager.install_manager.doctype.site_unit.site_unit.generate_site_units',
                args: {
                    site_id: siteForm.docname
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
