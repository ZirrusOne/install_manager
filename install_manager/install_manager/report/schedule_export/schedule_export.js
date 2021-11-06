// Copyright (c) 2016, Zirrus One and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Schedule export"] = {
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
            "fieldname": "schedule_id",
            "fieldtype": "Link",
            "label": "Schedule",
            "mandatory": 0,
            "options": "Schedule",
            "wildcard_filter": 0
        },
        {
            "fieldname": "schedule_status",
            "fieldtype": "Select",
            "label": "Schedule Status",
            "mandatory": 0,
            "options": "all statuses\nReady\nOpen\nIn Progress\nOn-Hold\nCompleted\nCancelled",
            "default": "Open"
        },
        /*
        The MultiSelectList has 2 issues:
            - Cannot set default values
            - Changing selected items, not always trigger report run!!!!
        {
            "fieldname": "schedule_statuses",
            "fieldtype": "MultiSelectList",
            "label": "Schedule Status",
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
            "fieldname": "assigned_teams",
            "fieldtype": "Link",
            "label": "Assigned Teams",
            "mandatory": 0,
            "options": "Team"
            //get_query: () => {
            //    return { filters: { 'team_type': 'Level II Team' } }
            //}
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
