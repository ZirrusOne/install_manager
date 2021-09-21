// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt

frappe.ui.form.on('Assignment', {
    setup: function(assignmentForm) {
        assignmentForm.set_query('back_office_team',
            function (){
                return { filters: { 'team_type': 'Back Office' } }
            });
    },
});
