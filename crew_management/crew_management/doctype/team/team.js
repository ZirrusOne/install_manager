// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Team', {
    onload: function(frm) {
        set_team_member_query(frm);
    },
    validate: function (frm){},
});

let set_team_member_query = function(frm) {
    frm.set_query('team_member', function (){
        return {
            query: "crew_management.crew_management.controllers.queries.team_member_query",
            filters: {
                'team_type': frm.doc.team_type
            }
        }
    })
}