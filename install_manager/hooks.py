from . import __version__ as app_version

# Documentation https://frappeframework.com/docs/user/en/python-api/hooks

app_name = "install_manager"
app_title = "Install Manager"
app_publisher = "Zirrus One"
app_description = "An application for the management of Field Installation technicians"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "info@zirrusone.com"
app_license = "MIT"
app_logo_url = "/assets/install_manager/images/z1n-logo.png"
setup_wizard_requires = "/assets/install_manager/js/setup_wizard.js"

after_migrate = ["install_manager.after_migrate.install.execute"]

# home_page = "login"

boot_session = "install_manager.startup.boot.boot_session"

app_include_js = [
    "/assets/js/custom_install_manager.js"
]

app_include_css = "/assets/css/custom_install_manager.css"

web_include_js = [
    "/assets/js/custom_install_manager_website.js"
]

required_apps = ['erpnext']

# this is to override default filter of a doctype
standard_queries = {
    "Site Unit": "install_manager.install_manager.doctype.site_unit.site_unit.site_unit_query"
}

domains = {
    'Install Manager': 'install_manager.domains.install_manager',
}

doc_events = {
    "File": {
        "before_insert": "install_manager.doc_events.file.before_insert",
    }
}
# This is NOT used during app installation. It is used to export data, which is created during development, into
# folder fixtures/. The data will be applied when this app is installed into a site.
# To export fixture files (json file), run: bench --site .... export-fixtures
fixtures = [
    {"dt": "Domain", "filters": [["name", "in", ["Install Manager"]]]},
    {"dt": "Role", "filters": [
        [
            "name", "in", [
            "Field Manager",
            "Field Lead",
            "Field Installer"
        ]
        ]
    ]},
    {"dt": "Custom DocPerm", "filters": [
        ["role", "in", ["Field Manager"]]
    ]}
]

override_whitelisted_methods = {
    "frappe.desk.form.load.getdoctype": "install_manager.install_manager.desk.form.load.getdoctype",
    "frappe.desk.search.search_link": "install_manager.install_manager.desk.search.search_link",
}
