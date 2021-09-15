frappe.ready(function () {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    if (!params.id) {
        window.location.href = 'app/job-management';
    } else {
        getJobDetail(params.id);
    }
})

function getJobDetail(id) {
    frappe.call({
        method: 'crew_management.crew_management.web_form.job_detail.job_detail.get_job_detail',
        args: {
            job_id: id
        },
        callback: (result) => {
            //init data
            frappe.web_form.doc['parent'] = result.message.parent;
            frappe.web_form.doc['parenttype'] = result.message.parenttype;
            frappe.web_form.doc['name'] = result.message.name;

            frappe.web_form.set_value('site_component', result.message.site_component);
            frappe.web_form.set_value('status', result.message.status);
            frappe.web_form.set_value('installation_type', result.message.installation_type);
            frappe.web_form.set_value('assigned_team', result.message.assigned_team);
            frappe.web_form.set_value('escalation_reason', result.message.escalation_reason);
            frappe.web_form.set_value('non_compliant_reason', result.message.non_compliant_reason);
            frappe.web_form.set_value('cool_work', result.message.cool_work);
            frappe.web_form.set_value('heat_work', result.message.heat_work);
            frappe.web_form.set_value('parent', result.message.parent);
            frappe.web_form.set_value('initial_measure_mode', result.message.initial_measure_mode);
            frappe.web_form.set_value('parenttype', result.message.parenttype);
            frappe.web_form.set_value('name', result.message.name);
        }
    });

}
