frappe.pages['job-detail'].on_page_load = function (wrapper) {
    let job_detail = new JobDetail(wrapper);
    $('#navbar-breadcrumbs').addClass('hide-item');

    $(wrapper).bind('show', () => {
        job_detail.initData(wrapper);
    });
    window.job_detail = job_detail;
}

class JobDetail {
    //element
    jobTypeElement;
    additionalServiceElement;
    jobStatusElement;
    statusNonComplaintElement;
    statusEscalateElement;
    addCommentElement;
    addPhotoElement;

    job_id;
    job_detail;
    job_types = [];

    selectedJobType;

    constructor(wrapper) {
    }

    initData(wrapper) {
        var url = window.location.pathname;
        this.job_id = url.substring(url.lastIndexOf('/') + 1);
        if (this.job_id === '' || !this.job_id.startsWith('JOB-')) {
            window.location.href = '/app/job-management';
        }
        console.log(this.job_id)
        $(wrapper).empty();
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Details',
            single_column: true
        });

        $(frappe.render_template('job_detail', {
            isInstaller: frappe.user.has_role("Field Installer")
        })).appendTo($(this.page.main));

        this.jobTypeElement = $(this.page.main).find('#jobType');
        this.additionalServiceElement = $(this.page.main).find('#additionalService');
        this.jobStatusElement = $(this.page.main).find('#jobStatus');
        this.statusNonComplaintElement = $(this.page.main).find('#statusNonComplaint');
        this.statusEscalateElement = $(this.page.main).find('#statusEscalate');
        this.addCommentElement = $(this.page.main).find('#addComment');
        this.addPhotoElement = $(this.page.main).find('#addPhoto');

        this.getData();
        this.customUI();
    }

    openJobTypeModal() {
        this.renderJobType();
        $('#jobTypeModal').modal('show');

    }

    renderJobType() {
        $(this.jobStatusElement).empty();
        $(frappe.render_template('job_type', {
            job_types: this.job_types,
            selectedJobType: this.selectedJobType
        })).appendTo($(this.jobTypeElement));
    }

    onChangeJobType(element) {
        $('#jobTypeModal').modal('hide');
    }

    openAdditionalServiceModal() {
        this.renderAdditionalService();
        $('#additionalServiceModal').modal('show');
    }

    renderAdditionalService() {
        $(this.additionalServiceElement).empty();
        $(frappe.render_template('additional_service', {})).appendTo($(this.additionalServiceElement));
    }

    onChangeAdditionalService() {
        
    }

    onCloseAdditionalServiceModal() {
        $('#additionalServiceModal').modal('hide');
    }

    customUI() {
        $('.navbar').addClass('hide-item');
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
    }

    getData() {
        frappe.model
            .with_doc("Job", this.job_id)
            .then((result) => {
                this.job_detail = result
            });
    }

    clearData() {
        frappe.model.clear_doc("Job", this.job_id);
    }

    saveJob() {
        this.prepareDataBeforeSave();
        frappe.call({
            freeze: true,
            method: "frappe.desk.form.save.savedocs",
            args: {doc: this.jobDetail, action: "Save"},
            callback: function (result) {

            }
        })
    }

    prepareDataBeforeSave() {

    }


}
