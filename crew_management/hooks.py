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
app_logo_url = "/assets/crew_management/images/z1n-logo.png"
setup_wizard_requires = "/assets/crew_management/js/setup_wizard.js"

after_migrate = ["crew_management.after_migrate.install.execute"]
home_page = "login"

website_context = {
    "favicon": "/assets/crew_management/images/z1n-logo.png",
    "splash_image": "/assets/crew_management/images/z1n-logo.png"
}
boot_session = "crew_management.startup.boot.boot_session"

app_include_css = "/assets/css/custom_crew.css"

web_include_css = "/assets/css/custom_crew_website.css"

app_include_js = [
    "/assets/js/custom_crew.js"
]

web_include_js = [
    "/assets/js/custom_crew_website.js"
]

required_apps = ['erpnext']

# this is to override default filter of a doctype
standard_queries = {
    "Site Component": "crew_management.crew_management.doctype.site_component.site_component.site_component_query"
}

domains = {
    'Crew Management': 'crew_management.domains.crew_management',
}

doc_events = {
    "File": {
        "before_insert": "crew_management.doc_events.file.before_insert",
    }
}
# This is NOT used during app installation. It is used to export data, which is created during development, into
# folder fixtures/. The data will be applied when this app is installed into a site.
# To export fixture files (json file), run: bench --site .... export-fixtures
fixtures = [
    {"dt": "Domain", "filters": [["name", "in", ["Crew Management"]]]},
    {"dt": "Role", "filters": [
        [
            "name", "in", [
            "Back Office Staff",
            "Field Lead",
            "Field Installer"
        ]
        ]
    ]},
    {"dt": "Custom DocPerm", "filters": [
        [
            "parent", "in", [
            "User",
            "Sales Order",
            "Company",
            "Customer"
        ]
        ],
        ["role", "in", ["Back Office Staff"]]
    ]}
]
