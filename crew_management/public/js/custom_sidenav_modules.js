$(document).ready(function () {
    let is_crew_role = frappe.user.has_role("Back Office Staff") && !frappe.user.has_role("Administrator");
    let module_node = $('.standard-sidebar-label:contains("Modules")');

    if (is_crew_role && module_node) {
        module_node.parent().each(function(){
            let remove_items = [];
            this.childNodes.forEach(item => {
                if (item.classList.contains('desk-sidebar-item') && item.innerText !== 'Crew Management') {
                    remove_items.push(item);
                }
            })

            remove_items.forEach(item => {
                this.removeChild(item);
            })
        });
    }
})
