// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Team', {
    setup: function (frm) {
        // frm.trigger('set_team_member_query')
        frm.set_query('team_member', function () {
            return {
                query: "crew_management.crew_management.doctype.team.team.team_member_query",
                filters: {
                    'team_type': frm.doc.team_type
                }
            }
        })
    },
});
