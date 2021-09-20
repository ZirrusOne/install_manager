// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Site', {
	setup: function(frm) {
        // frm.set_query('parent_site_component', 'component',
        //     function(siteForm, childDoctypeName /* it is "Site Component" */, currentSiteComponentUid) {
        //             return {
        //                 filters: {
        //                     site: frm.doc.name,
        //                     self_uid: currentSiteComponentUid
        //                 }
        //             }
        //         });
	},
});

// frappe.ui.form.on('Site Component', {
//     // on field changed
//     parent_site_component: function(siteComponentForm, childDoctypeName, currentSiteComponentUid) {
//         // void the field so that user won't confuse
//         frappe.model.set_value(childDoctypeName, currentSiteComponentUid, 'parent_site_component_name', undefined);
//
//         // update the parent component full name
//         let new_parent_component_uid = locals[childDoctypeName][currentSiteComponentUid].parent_site_component;
//         if (new_parent_component_uid != null && new_parent_component_uid !== '') {
//             let parent_compo = frappe.model.get_doc(childDoctypeName, new_parent_component_uid);
//             if (parent_compo) {
//                 frappe.model.set_value(childDoctypeName, currentSiteComponentUid, 'parent_site_component_name',
//                     parent_compo.full_name);
//             }
//         }
//     }
// });
