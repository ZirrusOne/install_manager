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
});
