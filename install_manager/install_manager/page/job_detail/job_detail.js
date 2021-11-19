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
    check_list_pre_install = [];
    check_list_post_install = [];

    reasonMessage = '';
    selectedInstallationType = '';
    selectedJobStatus = '';
    selectedEscalationReason = '';
    selectedNonComplaintReason = '';
    previousSelectedJobStatus = '';
    isAdditionalServiceChanged = false;
    isStatusChanged = false;

    current_checkList = "pre-install";
    current_activity = "all";

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

    onChangeChecklistType(element) {
        let value = $(element).attr('view-for');
        if (this.current_checkList !== value)
            this.current_checkList = value
    }

    onChangeActivityType(element) {
        let value = $(element).attr('view-for');
        if (this.current_activity !== value)
            this.current_activity = value
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
        } else if (frappe.user.has_role("Field Lead")) {
            job_statuses = this.job_statuses.filter(item => item !== "Escalation - Field Lead")
        }

        $(frappe.render_template('job_status', {
            job_statuses: job_statuses,
            selectedJobStatus: this.selectedJobStatus
        })).appendTo($(this.jobStatusElement));
    }

    onChangeJobStatus(element) {
        this.previousSelectedJobStatus = this.selectedJobStatus;
        this.isStatusChanged = true;
        let value = $(element).attr('data-value');
        if (value !== this.selectedJobStatus) {
            this.selectedJobStatus = value;
            if (this.selectedJobStatus === "Escalation - Field Lead" ||
                this.selectedJobStatus === "Escalation - Back Office" ||
                this.selectedJobStatus === "Escalation - Vendor") {
                this.selectedEscalationReason = '';
                this.openEscalationModal();
            } else if (this.selectedJobStatus === "Non-compliant") {
                this.selectedNonComplaintReason = ''
                this.openNonComplaintModal();
            } else {
                this.saveJob();
            }
            $('#jobStatusModal').modal('hide');
        }
    }

    openEscalationModal() {
        this.renderEscalationModal();
        $('#escalationReasonModal').modal('show');
    }

    renderEscalationModal() {
        $(frappe.render_template('escalation_reason', {
            escalations_reasons: this.escalations_reasons,
            selectedEscalationReason: this.selectedEscalationReason
        })).appendTo($(this.statusEscalateElement));
    }

    onChangeEscalationReason(element) {
        let value = $(element).attr('data-value');
        if (value !== this.selectedEscalationReason) {
            $("a[data-target='escalation']").removeClass('active');
            this.selectedEscalationReason = value;
            $(element).addClass('active');
        }
    }

    onCloseEscalation() {
        let comment = $('#escalationComment').val();
        if (this.selectedEscalationReason === '') {
            this.isStatusChanged = false;
            this.selectedJobStatus = this.previousSelectedJobStatus;
        } else {
            let message = 'ESCALATION NOTE: ';
            message += comment === '' ? '-' : comment;
            this.reasonMessage = message;
            this.saveJob();
        }
        $('#escalationReasonModal').modal('hide');
    }

    openNonComplaintModal() {
        this.renderNonComplaintModal();
        $('#nonComplaintReasonModal').modal('show');
    }

    renderNonComplaintModal() {
        $(frappe.render_template('non_complaint_reason', {
            non_compliant_reasons: this.non_compliant_reasons,
            selectedNonComplaintReason: this.selectedNonComplaintReason
        })).appendTo($(this.statusNonComplaintElement));
    }

    onChangeNonComplaintReason(element) {
        let value = $(element).attr('data-value');
        if (value !== this.selectedNonComplaintReason) {
            $("a[data-target='non-complaint']").removeClass('active');
            this.selectedNonComplaintReason = value;
            $(element).addClass('active');
        }
    }

    onCloseNonComplaint() {
        let comment = $('#nonComplaintComment').val();
        if (this.selectedNonComplaintReason === '') {
            this.isStatusChanged = false;
            this.selectedJobStatus = this.previousSelectedJobStatus;
        } else {
            let message = 'NON-COMPLIANT NOTE: ';
            message += comment === '' ? '-' : comment;
            this.reasonMessage = message;
            this.saveJob();
        }
        $('#nonComplaintReasonModal').modal('hide');
    }

    onChangeCheckboxCheckList(element) {
        let fieldName = $(element).attr('data-for-field');
        let checklistType = $(element).attr('data-for-type');
        let foundItem = this.job_detail.checklist.find(item => item.criterion === fieldName && item.criterion_type === checklistType)
        if (foundItem) {
            foundItem.result = element.checked ? "1" : "0";
            this.saveJob();
        }
    }

    onChangeInputCheckList(element) {
        let fieldName = $(element).attr('data-for-field');
        let checklistType = $(element).attr('data-for-type');
        let value = $(element).val();
        let foundItem = this.job_detail.checklist.find(item => item.criterion === fieldName && item.criterion_type === checklistType)
        if (foundItem) {
            if (foundItem.result !== value) {
                foundItem.result = value
            }
        }
    }

    openCommentModal() {
        $(frappe.render_template('comment', {})).appendTo($(this.addCommentElement));
        $('#commentModal').modal('show');
    }

    onCloseComment() {
        let comment = $('#jobComment').val();
        if (comment !== '') {
            this.addComment(comment);
            this.getData();
        }
        $('#commentModal').modal('hide');
    }

    customUI() {
        $('.navbar').addClass('hide-item');
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
    }

    resetVariable() {
        this.previousSelectedJobStatus = '';
        this.selectedNonComplaintReason = '';
        this.selectedEscalationReason = '';
        this.reasonMessage = '';
        this.isAdditionalServiceChanged = false;
        this.isStatusChanged = false;
    }


    addComment(message) {
        frappe.call({
            method: "frappe.desk.form.utils.add_comment",
            args: {
                reference_doctype: "Job",
                reference_name: this.job_id,
                content: message,
                comment_email: frappe.session.user,
                comment_by: frappe.session.user_fullname
            },
            callback: function (r) {
            }
        });
    }

    openFileUpload() {
        this.renderFileUpload()
        $("#uploadModal").modal('show');
        var $wrapper = $("#fileUploader").empty();
        let aThis = this;
        new frappe.ui.FileUploader({
            wrapper: $wrapper,
            doctype: "Job",
            docname: this.job_id,
            folder: 'Home/Attachments',
            on_success: (file_doc) => {
                let message = $("#jobPhotoComment").val();
                if (message.length > 0) {
                    aThis.addComment(message);
                }
                aThis.getData();
                $("#uploadModal").modal('hide');
            }
        });
        this.customFileUpload();
    }

    renderFileUpload() {
        $(this.addPhotoElement).empty();
        $(frappe.render_template('upload_photo', {})).appendTo($(this.addPhotoElement));
    }

    uploadPhoto() {
        let button = $("#uploadModal").find("button.btn.btn-primary.btn-sm.margin-right")
        $(button).trigger("click");
        console.log($(button).val());
    }

    customFileUpload() {
        let buttons = $(".mt-2.text-center").find(".btn-file-upload");
        $(buttons[1]).remove();
        $(buttons[2]).remove();
        let gallery = buttons[0];
        let galleryTitle = $(gallery).find('div.mt-1');
        let camera = buttons[3];
        let cameraTitle = $(camera).find('div.mt-1');
        let inputFile = $(".mt-2.text-center").find("input[type='file']");

        $(inputFile).attr("multiple", false);
        $(inputFile).attr("accept", "image/*");

        $(gallery).find('svg').remove();
        $(galleryTitle.addClass('text-uppercase'));
        $(galleryTitle).text('Gallery');
        $(galleryTitle).before("<i class=\"fa fa-picture-o\" aria-hidden=\"true\"></i>")

        $(camera).find('svg').remove();
        $(cameraTitle.addClass('text-uppercase'));
        $(cameraTitle).text('camera');
        $(cameraTitle).before("<i class=\"fa fa-camera\" aria-hidden=\"true\"></i>");
    }

    getData() {
        let aThis = this;
        this.resetVariable();
        frappe.model.with_doctype("Job", () => {
            let meta = frappe.get_meta("Job");
            this.job_statuses = meta.fields.find(item => item.fieldname === "status").options.split("\n");
            this.escalations_reasons = meta.fields.find(item => item.fieldname === "escalation_reason").options.split("\n");
            this.escalations_reasons = this.escalations_reasons.filter(item => item !== "");
            this.non_compliant_reasons = meta.fields.find(item => item.fieldname === "non_compliant_reason").options.split("\n");
            this.non_compliant_reasons = this.non_compliant_reasons.filter(item => item !== "");
            this.installation_types = meta.fields.find(item => item.fieldname === "installation_type").options.split("\n");
        });

        // avoid confusing for installers due to cache
        // don't cache at all
        if (locals['Job'] && locals['Job'][this.job_id]) {
            delete locals['Job'][this.job_id];
        }

        frappe.model.with_doc("Job", this.job_id)
            .then((result) => {
                this.job_detail = result
                this.selectedInstallationType = this.job_detail.installation_type;
                this.selectedJobStatus = this.job_detail.status;
                if (this.job_detail.escalation_reason) {
                    this.selectedEscalationReason = this.job_detail.escalation_reason;
                }

                if (this.job_detail.non_compliant_reasons) {
                    this.selectedNonComplaintReason = this.job_detail.non_compliant_reasons;
                }

                //checklist
                this.check_list_pre_install = this.job_detail.checklist.filter(preItem => preItem.checklist_type === "Pre-Install")
                this.check_list_post_install = this.job_detail.checklist.filter(preItem => preItem.checklist_type === "Post-Install")

                // this.attachments = new frappe.ui.form.Attachments({
                //     parent:aThis.addPhotoElement,
                //     frm:
                // });

                //timer
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
                if (this.job_detail.in_progress_installer && this.job_detail.in_progress_installer.length > 0) {
                    frappe.call({
                        type: "GET",
                        method: "install_manager.install_manager.doctype.job.job.get_job_installer",
                        args: {job_id: this.job_id},
                        callback: function (result) {
                            aThis.job_detail.full_name = result.message.full_name;
                        }
                    })

                    aThis.job_detail.start_at = moment(this.job_detail.in_progress_start_time).format('MMM. DD,YYYY')
                }
                let siteUnit = frappe.model.with_doc("Site Unit", this.job_detail.site_unit)
                let schedule = frappe.model.with_doc("Schedule", this.job_detail.schedule)
                Promise.all([siteUnit, schedule]).then((result) => {
                    this.site_unit = result[0];
                    this.schedule = result[1];
                    let site = frappe.model.with_doc("Site", this.schedule.site)
                    Promise.all([site]).then((siteResult) => {
                        this.site = siteResult[0];
                        this.renderJobDetail();
                    })
                })
            })
    }

    saveJob() {
        let aThis = this;
        let job_detail = this.prepareDataBeforeSave();
        frappe.call({
            freeze: true,
            method: "frappe.desk.form.save.savedocs",
            args: {doc: job_detail, action: "Save"},
            callback: function () {
                if (aThis.selectedJobStatus === "Escalation - Field Lead" ||
                    aThis.selectedJobStatus === "Escalation - Back Office" ||
                    aThis.selectedJobStatus === "Escalation - Vendor" ||
                    aThis.selectedJobStatus === "Non-compliant") {
                    aThis.addComment(aThis.reasonMessage);
                }
                aThis.getData()
            }
        })
    }

    prepareDataBeforeSave() {
        let job_detail = JSON.parse(JSON.stringify(this.job_detail));
        job_detail.installation_type = this.selectedInstallationType;

        if (this.isStatusChanged) {
            job_detail.status = this.selectedJobStatus;
            if (this.selectedJobStatus === "Escalation - Field Lead" ||
                this.selectedJobStatus === "Escalation - Back Office" ||
                this.selectedJobStatus === "Escalation - Vendor") {
                job_detail.escalation_reason = this.selectedEscalationReason;
            } else if (this.selectedJobStatus === "Non-compliant") {
                job_detail.non_compliant_reasons = this.selectedNonComplaintReason;
            }
        }

        job_detail.additional_services = [];

        // add additional_services
        this.additional_services.forEach((service, index) => {
            if (service.isSelected) {
                let newService = frappe.model.get_new_doc("Job Additional Service");
                newService.parent = this.job_id;
                newService.parentfield = "additional_services";
                newService.parenttype = "Job";
                newService.idx = index + 1;
                newService.service = service.name;
                job_detail.additional_services.push(newService);
            }
        })

        return job_detail;
    }

    renderJobDetail() {
        $(this.jobDetailElement).empty();
        $(frappe.render_template('result', {
            isInstaller: frappe.user.has_role("Field Installer"),
            result: this.job_detail,
            site_unit: this.site_unit,
            check_list_pre_install: this.check_list_pre_install,
            check_list_post_install: this.check_list_post_install,
            current_checkList: this.current_checkList,
            current_activity: this.current_activity,
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
