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
    jobDetailElement;

    job_id;
    job_detail;
    schedule;
    site;
    site_unit;

    job_statuses = [];
    escalations_reasons = [];
    non_compliant_reasons = [];
    installation_types = [];
    additional_services = [];

    selectedInstallationType;
    selectedJobStatus;

    isAdditionalServiceChanged = false;

    constructor(wrapper) {
    }

    initData(wrapper) {
        var url = window.location.pathname;
        this.job_id = url.substring(url.lastIndexOf('/') + 1);
        if (this.job_id === '' || !this.job_id.startsWith('JOB-')) {
            window.location.href = '/app/job-management';
        }
        $(wrapper).empty();

        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Details',
            single_column: true
        });

        $(frappe.render_template('job_detail', {})).appendTo($(this.page.main));

        this.jobTypeElement = $(this.page.main).find('#jobType');
        this.additionalServiceElement = $(this.page.main).find('#additionalService');
        this.jobStatusElement = $(this.page.main).find('#jobStatus');
        this.statusNonComplaintElement = $(this.page.main).find('#statusNonComplaint');
        this.statusEscalateElement = $(this.page.main).find('#statusEscalate');
        this.addCommentElement = $(this.page.main).find('#addComment');
        this.addPhotoElement = $(this.page.main).find('#addPhoto');
        this.jobDetailElement = $(this.page.main).find('.job-detail-wrapper');
        const aThis = this;
        //get additional services
        frappe.call({
            method: 'frappe.desk.reportview.get',
            args: {
                doctype: "Installation Service",
                fields: ["name"]
            },
            type: 'GET',
            callback: function (result) {
                aThis.additional_services = [];
                let additional_services = result.message.values
                additional_services.forEach(item => {
                    let additional_service = {
                        name: item[0],
                        isSelected: false
                    }
                    aThis.additional_services.push(additional_service);
                })
            }
        });
        this.getData();
        this.customUI();
    }

    openJobTypeModal() {
        this.renderJobType();
        $('#jobTypeModal').modal('show');
    }

    renderJobType() {
        $(this.jobTypeElement).empty();
        $(frappe.render_template('job_type', {
            installation_types: this.installation_types,
            selectedInstallationType: this.selectedInstallationType
        })).appendTo($(this.jobTypeElement));
    }

    onChangeJobType(element) {
        let value = $(element).attr('data-value');
        if (value !== this.selectedInstallationType) {
            this.selectedInstallationType = value;
            this.saveJob();
            $('#jobTypeModal').modal('hide');
            this.getData();
        }
    }

    openAdditionalServiceModal() {
        this.renderAdditionalService();
        $('#additionalServiceModal').modal('show');
    }

    renderAdditionalService() {
        $(this.additionalServiceElement).empty();
        $(frappe.render_template('additional_service', {
            additional_services: this.additional_services
        })).appendTo($(this.additionalServiceElement));
    }

    onChangeAdditionalService(element) {
        let service = $(element).attr('data-value');
        this.isAdditionalServiceChanged = true;
        let foundService = this.additional_services.find(item => item.name === service);
        if (foundService) {
            foundService.isSelected = !foundService.isSelected;
            if (foundService.isSelected) {
                $(element).addClass('active');
            } else {
                $(element).removeClass('active');
            }
        }
    }

    onCloseAdditionalServiceModal() {
        if (this.isAdditionalServiceChanged) {
            this.saveJob();
            this.getData();
        }
        $('#additionalServiceModal').modal('hide');
    }

    openJobStatusModal() {
        this.renderJobStatus();
        $('#jobStatusModal').modal('show');
    }

    renderJobStatus() {
        let job_statuses = [];
        $(this.jobStatusElement).empty();

        if (frappe.user.has_role("Field Installer")) {
            job_statuses = this.job_statuses.filter(item => item !== "Escalation - Back Office" && item !== "Escalation - Vendor")
        } else {
            job_statuses = this.job_statuses;
        }

        $(frappe.render_template('job_status', {
            job_statuses: job_statuses,
            selectedJobStatus: this.selectedJobStatus
        })).appendTo($(this.jobStatusElement));
    }

    onChangeJobStatus(element) {
        let value = $(element).attr('data-value');
        if (value !== this.selectedJobStatus) {
            this.selectedJobStatus = value;
            if (this.selectedJobStatus === "Escalation - Field Lead" ||
                this.selectedJobStatus === "Escalation - Back Office" ||
                this.selectedJobStatus === "Escalation - Vendor") {
                // todo: implement escalation reason
            } else if (this.selectedJobStatus === "Non-compliant") {
                // todo: implement non-compliant reason
            } else {
                this.saveJob();
                this.getData();
            }
            $('#jobStatusModal').modal('hide');
        }
    }

    openEscalationModal() {
        this.renderEscalationModal();
        $('#jobStatusModal').modal('show');
    }

    renderEscalationModal() {
        $(frappe.render_template('job_status', {
            job_statuses: job_statuses,
            selectedJobStatus: this.selectedJobStatus
        })).appendTo($(this.jobStatusElement));
    }

    customUI() {
        $('.navbar').addClass('hide-item');
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
    }

    getData() {
        let aThis = this;
        frappe.model.with_doctype("Job", () => {
            let meta = frappe.get_meta("Job");
            this.job_statuses = meta.fields.find(item => item.fieldname === "status").options.split("\n");
            this.escalations_reasons = meta.fields.find(item => item.fieldname === "escalation_reason").options.split("\n");
            this.non_compliant_reasons = meta.fields.find(item => item.fieldname === "non_compliant_reason").options.split("\n");
            this.installation_types = meta.fields.find(item => item.fieldname === "installation_type").options.split("\n");
        });

        let result = frappe.model.with_doc("Job", this.job_id)
            .then((result) => {
                this.job_detail = result
                this.selectedInstallationType = this.job_detail.installation_type;
                this.selectedJobStatus = this.job_detail.status;
                this.calculateTimer();
                if (this.job_detail.status === "In Progress") {
                    setInterval(function () {
                        aThis.calculateTimer();
                        $("#timer_hours").text(aThis.job_detail.timer_hours);
                        $("#timer_min").text(aThis.job_detail.timer_min);
                    }, 30000);
                }
                if (this.job_detail.additional_services.length > 0) {
                    this.job_detail.additional_services.forEach(item => {
                        let foundItem = this.additional_services.find(service => service.name === item.service);
                        if (foundItem)
                            foundItem.isSelected = true;
                    })
                }

                let siteUnit = frappe.model.with_doc("Site Unit", this.job_detail.site_unit)
                let schedule = frappe.model.with_doc("Schedule", this.job_detail.schedule)
                Promise.all([siteUnit, schedule]).then((result) => {
                    this.site_unit = result[0];
                    this.schedule = result[1];
                    let site = frappe.model.with_doc("Site", this.schedule.site)
                    Promise.all([site]).then((siteResult) => {
                        this.site = siteResult[0];
                        this.renderJobDetail()
                    })
                })
            })
    }

    clearData() {
        frappe.model.clear_doc("Job", this.job_id);
    }

    saveJob() {
        this.prepareDataBeforeSave();
        frappe.call({
            freeze: true,
            method: "frappe.desk.form.save.savedocs",
            args: {doc: this.job_detail, action: "Save"},
            callback: function (result) {

            }
        })
    }

    prepareDataBeforeSave() {
        this.job_detail.installation_type = this.selectedInstallationType;
        this.job_detail.status = this.selectedJobStatus;
        this.job_detail.additional_services = [];

        // add additional_services
        this.additional_services.forEach((service, index) => {
            if (service.isSelected) {
                let newService = frappe.model.get_new_doc("Job Additional Service");
                newService.parent = this.job_id;
                newService.parentfield = "additional_services";
                newService.parenttype = "Job";
                newService.idx = index + 1;
                newService.service = service.name;
                this.job_detail.additional_services.push(newService);
            }
        })
    }

    renderJobDetail() {
        $(this.jobDetailElement).empty();
        $(frappe.render_template('result', {
            isInstaller: frappe.user.has_role("Field Installer"),
            result: this.job_detail,
            site_unit: this.site_unit,
            site: this.site
        })).appendTo($(this.jobDetailElement));
    }

    calculateTimer() {
        let currentTime = moment();
        this.job_detail.timer_hours = 0;
        this.job_detail.timer_min = 0;
        if (this.job_detail.in_progress_start_time != null && this.job_detail.status === 'In Progress') {
            let startTime = moment(this.job_detail.in_progress_start_time);
            let inProgressTime = moment.duration(currentTime.diff(startTime));
            let totalTimeInMinute = Math.round(inProgressTime.asMinutes() + this.job_detail.finished_timer_minutes);
            let hours = Math.floor(totalTimeInMinute / 60);
            let minutes = totalTimeInMinute - hours * 60;

            this.job_detail.timer_hours = hours.toLocaleString('en-US', {minimumIntegerDigits: 2});
            this.job_detail.timer_min = minutes.toLocaleString('en-US', {minimumIntegerDigits: 2});
        } else {
            let hours = Math.floor(this.job_detail.finished_timer_minutes / 60);
            let minutes = this.job_detail.finished_timer_minutes - hours * 60;

            this.job_detail.timer_hours = hours.toLocaleString('en-US', {minimumIntegerDigits: 2});
            this.job_detail.timer_min = minutes.toLocaleString('en-US', {minimumIntegerDigits: 2});
        }
    }

}
