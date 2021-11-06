// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Team', {
    setup: function(teamForm) {
        teamForm.set_query('team_member', function () {
            return {
                query: "install_manager.install_manager.doctype.team.team.team_member_query",
                filters: {
                    'team_type': teamForm.doc.team_type
                }
            }
        });
    },
});
