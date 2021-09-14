// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assignment', {
	// refresh: function(frm) {

	// },

    onload: function (frm) {
        filter_team_type(frm, 'Back Office')
        filter_job_assign_team(frm)
        filter_job_site_component(frm)
    }
});

let filter_team_type = function(frm, type) {
    frm.set_query('back_office_team', function (){
        return { filters: { 'team_type': type } }
    })
}

let filter_job_site_component = function (frm) {
    frm.fields_dict['jobs'].grid.get_field('site_component').get_query = function (doc) {
        console.log(doc);
        if (doc.parent) {
            return {
                query: "crew_management.crew_management.controllers.queries.site_component_query",
                filters: {}
            }
        } else {
            return {
                query: "crew_management.crew_management.controllers.queries.site_component_query"
            }
        }
    }
}

let filter_job_assign_team = function (frm) {
    frm.fields_dict['jobs'].grid.get_field('assigned_team').get_query = function(doc) {
        return { filters:{ 'team_type': 'Field Crew' } }
    }
}


// cur_frm.fields_dict['jobs'].grid.get_field('assigned_team').get_query = function(doc) {
//     return { filters:{ 'team_type': 'Field Crew' } }
// }
//
// cur_frm.fields_dict['jobs'].grid.get_field('site_component').get_query = function(doc) {
//     if (doc.parent) {
//         return {
//             query: "crew_management.crew_management.controllers.queries.site_component_query",
//             filters: {
//                 'parent_site': doc.parent
//             }
//         }
//     } else {
//         return {
//             query: "crew_management.crew_management.controllers.queries.site_component_query",
//         }
//     }
// }