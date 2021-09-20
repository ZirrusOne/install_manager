// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Site Component', {
    setup: function(siteCompForm) {
        // if for child table: set_query(fieldname, parent fieldname, query)
        // for non-child table: set_query(fieldname, query)
        siteCompForm.set_query('parent_site_component',
            function(siteForm, doctypeName /* it is "Site Component" */, currentSiteComponentUid) {
                    return {
                        filters: {
                            site: siteCompForm.doc.site,
                            self_uid: currentSiteComponentUid
                        }
                    }
                });
    },

    // on field changed
    parent_site_component: function(siteComponentForm, doctypeName, currentSiteComponentUid) {
        // void the field so that user won't confuse
        frappe.model.set_value(doctypeName, currentSiteComponentUid, 'parent_site_component_name', undefined);

        // update the parent component full name
        let new_parent_component_uid = locals[doctypeName][currentSiteComponentUid].parent_site_component;
        if (new_parent_component_uid != null && new_parent_component_uid !== '') {
            let parent_compo = frappe.model.get_doc(doctypeName, new_parent_component_uid);
            if (parent_compo) {
                frappe.model.set_value(doctypeName, currentSiteComponentUid, 'parent_site_component_name',
                    parent_compo.full_name);
            }
        }
    }
});
