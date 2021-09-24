frappe.ui.form.on("User", {
    onload: function () {
        if ((frappe.user.has_role("Field Lead") || frappe.user.has_role("Field Installer")) && !frappe.user.has_role("Back Office Staff")) {
            if (location.href.includes("app/user/")) {
                $('#page-User .page-head .page-actions .custom-actions').remove();
                $('#page-User .page-head .page-actions .standard-actions .page-icon-group').remove();
                $('#page-User .page-head .page-actions .menu-btn-group').remove();
            }
        }
    }
})
