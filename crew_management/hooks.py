from . import __version__ as app_version

# Documentation https://frappeframework.com/docs/user/en/python-api/hooks

app_name = "crew_management"
app_title = "Crew Management"
app_publisher = "Zirrus One"
app_description = "An application for the management of Field Installation technicians"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "info@zirrusone.com"
app_license = "Proprietary"

setup_wizard_requires = "assets/crew_management/js/setup_wizard.js"

user_data_fields = [
	{
		"doctype": "{doctype_1}",
		"filter_by": "{filter_by}",
		"redact_fields": ["{field_1}", "{field_2}"],
		"partial": 1,
	},
	{
		"doctype": "{doctype_2}",
		"filter_by": "{filter_by}",
		"partial": 1,
	},
	{
		"doctype": "{doctype_3}",
		"strict": False,
	},
	{
		"doctype": "{doctype_4}"
	}
]

required_apps = ['erpnext']

standard_queries = {
	"Site Component": "crew_management.crew_management.doctype.site_component.site_component.site_component_query"
}
domains = {
	'Crew Management': 'crew_management.domains.crew_management',
}
