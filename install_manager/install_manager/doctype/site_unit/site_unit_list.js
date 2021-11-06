frappe.listview_settings['Site Unit'] = {
    hide_name_column: true,
    onload: function () {
        $('.page-form .standard-filter-section div[data-fieldname="name"]').remove();
        $('.page-form .filter-section .sort-selector .sort-selector-button ul li a[data-value="name"]').remove();
    }
}
