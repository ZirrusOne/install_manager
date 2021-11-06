frappe.ui.form.on("User", {
    onload: function () {
        if ((frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff")) {
            $('#page-User .page-head .page-actions .custom-actions').remove();
            $('#page-User .page-head .page-actions .standard-actions .page-icon-group').remove();
            $('#page-User .page-head .page-actions .menu-btn-group').remove();

            // hide sidebar
            $('.layout-side-section ul.user-actions').addClass('hide-item');
            $('.layout-side-section ul.form-schedules').addClass('hide-item');
            $('.layout-side-section ul.form-attachments').addClass('hide-item');
            $('.layout-side-section ul.form-reviews').addClass('hide-item');
            $('.layout-side-section ul.form-shared').addClass('hide-item');
            $('.layout-side-section ul.followed-by-section').addClass('hide-item');
            $('.layout-side-section ul.form-tags').addClass('hide-item');
            $('.layout-side-section ul.form-sidebar-stats').addClass('hide-item');
            $('.layout-side-section ul.text-muted').addClass('hide-item');
            $('.layout-side-section hr').addClass('hide-item');

            // hide timeline
            $('.form-footer').addClass('hide-item');
        }
    }
})
