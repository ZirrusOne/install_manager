frappe.listview_settings['Job'] = {
    hide_name_column: true,
    onload: function () {
        $('.page-form .standard-filter-section div[data-fieldname="name"]').remove();
    }
}
