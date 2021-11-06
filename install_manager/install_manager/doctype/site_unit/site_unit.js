// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Site Unit', {
    setup: function(siteCompForm) {
        // if for child table: set_query(fieldname, parent fieldname, query)
        // for non-child table: set_query(fieldname, query)
        siteCompForm.set_query('parent_site_unit',
            function(siteForm, doctypeName /* it is "Site Unit" */, currentSiteUnitUid) {
                    return {
                        filters: {
                            site: siteCompForm.doc.site,
                            self_uid: currentSiteUnitUid
                        }
                    }
                });
    },

    // on field changed
    parent_site_unit: function(siteUnitForm, doctypeName, currentSiteUnitUid) {
        if (!siteUnitForm.doc.parent_site_unit) {
            frappe.model.set_value(doctypeName, currentSiteUnitUid, 'parent_site_unit_name', undefined);
        }
    }
});
