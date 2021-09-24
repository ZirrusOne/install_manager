// Copyright (c) 2016, Zirrus One and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Assignment export"] = {
	"filters": [
        {
            "fieldname": "site_id",
            "fieldtype": "Link",
            "label": "Site",
            "mandatory": 0,
            "options": "Site",
            "wildcard_filter": 0
        },
        {
            "fieldname": "assignment_id",
            "fieldtype": "Link",
            "label": "Assignment",
            "mandatory": 0,
            "options": "Assignment",
            "wildcard_filter": 0
        },
        {
            "fieldname": "assignment_status",
            "fieldtype": "Select",
            "label": "Assignment Status",
            "mandatory": 0,
            "options": "all statuses\nOpen\nIn Progress\nOn-Hold\nCompleted\nCancelled",
            "default": "Open"
        },
        /*
        The MultiSelectList has 2 issues:
            - Cannot set default values
            - Changing selected items, not always trigger report run!!!!
        {
            "fieldname": "assignment_statuses",
            "fieldtype": "MultiSelectList",
            "label": "Assignment Status",
            "mandatory": 0,
            get_data: function(txt) {
                return [
                    {value: "Open", description: ""},
                    {value: "In Progress", description: ""},
                    {value: "On-Hold", description: ""},
                    {value: "Completed", description: ""},
                    {value: "Cancelled", description: ""}];
            }
        },
        */
        {
            "fieldname": "start_date_from",
            "fieldtype": "Date",
            "label": "Start Date from",
            "mandatory": 0,
            "wildcard_filter": 0
        },
        {
            "fieldname": "start_date_to",
            "fieldtype": "Date",
            "label": "Start Date to",
            "mandatory": 0,
            "wildcard_filter": 0
        },
        {
            "fieldname": "back_office_team",
            "fieldtype": "Link",
            "label": "Back Office Team",
            "mandatory": 0,
            "options": "Team",
            get_query: () => {
                return { filters: { 'team_type': 'Back Office' } }
            }
        },
        {
            "fieldname": "limit_row",
            "fieldtype": "Int",
            "label": "Number of Rows",
            "mandatory": 0,
            "default": 100
        }
    ]
};
