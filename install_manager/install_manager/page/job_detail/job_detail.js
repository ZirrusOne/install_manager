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
    statusNonCompliantElement;
    statusEscalateElement;
    addCommentElement;
    photoViewerElement;
    addPhotoElement;
    jobDetailElement;

    form;
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
    attachment_activities = [];
    comment_activities = [];
    all_activities = [];
    reasonMessage = '';
    escalationNote = '';
    selectedInstallationType = '';
    selectedJobStatus = '';
    selectedEscalationReason = '';
    selectedNonCompliantReason = '';
    previousSelectedJobStatus = '';
    isAdditionalServiceChanged = false;
    isStatusChanged = false;

    current_checkList = "pre-install";
    current_activity = "all";

    constructor(wrapper) {
    }

    initData(wrapper) {
        sessionStorage.setItem('request_from', 'job_detail')
        var url = window.location.pathname;
        this.job_id = url.substring(url.lastIndexOf('/') + 1);
        if (this.job_id === '' || !this.job_id.startsWith('JOB-')) {
            frappe.router.push_state('/app/job-management');
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
        this.statusNonCompliantElement = $(this.page.main).find('#statusNonCompliant');
        this.statusEscalateElement = $(this.page.main).find('#statusEscalate');
        this.addCommentElement = $(this.page.main).find('#addComment');
        this.addPhotoElement = $(this.page.main).find('#addPhoto');
        this.photoViewerElement = $(this.page.main).find('#photoViewer');
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
                });

                aThis.getData();
            }
        });

        this.customUI();
    }

    onCloseJobDetail() {
        frappe.router.push_state('/app/job-management');
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
            job_statuses = this.job_statuses.filter(item => item !== "Escalation - Level II" && item !== "Escalation - Level III")
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
                this.selectedJobStatus === "Escalation - Level II" ||
                this.selectedJobStatus === "Escalation - Level III") {
                this.selectedEscalationReason = '';
                this.openEscalationModal();
            } else if (this.selectedJobStatus === "Non-compliant") {
                this.selectedNonCompliantReason = ''
                this.openNonCompliantModal();
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
        this.statusEscalateElement.empty();
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
            if (comment.length > 0) {
                this.reasonMessage = 'ESCALATION NOTE: ' + comment;
            } else {
                this.reasonMessage = '';
            }
            this.escalationNote = comment;
            this.saveJob();
        }
        $('#escalationReasonModal').modal('hide');
    }

    openNonCompliantModal() {
        this.renderNonCompliantModal();
        $('#nonCompliantReasonModal').modal('show');
    }

    renderNonCompliantModal() {
        this.statusNonCompliantElement.empty();
        $(frappe.render_template('non_compliant_reason', {
            non_compliant_reasons: this.non_compliant_reasons,
            selectedNonCompliantReason: this.selectedNonCompliantReason
        })).appendTo($(this.statusNonCompliantElement));
    }

    onChangeNonCompliantReason(element) {
        let value = $(element).attr('data-value');
        if (value !== this.selectedNonCompliantReason) {
            $("a[data-target='non-compliant']").removeClass('active');
            this.selectedNonCompliantReason = value;
            $(element).addClass('active');
        }
    }

    onCloseNonCompliant() {
        let comment = $('#nonCompliantComment').val();
        if (this.selectedNonCompliantReason === '') {
            this.isStatusChanged = false;
            this.selectedJobStatus = this.previousSelectedJobStatus;
        } else {
            if (comment.length > 0) {
                this.reasonMessage = 'NON-COMPLIANT NOTE: ' + comment;
            } else {
                this.reasonMessage = '';
            }
            this.saveJob();
        }
        $('#nonCompliantReasonModal').modal('hide');
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
                foundItem.result = value;
                this.saveJob();
            }
        }
    }

    openCommentModal() {
        this.addCommentElement.empty();
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

    openPhotoViewModal(element) {
        this.photoViewerElement.empty();
        let image = $(element).html();
        $(frappe.render_template('photo_viewer', {
            image: image
        })).appendTo($(this.photoViewerElement));
        $('#photoViewerModal').modal('show');
    }

    customUI() {
        $('.navbar').addClass('hide-item');
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
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
                    let comment = 'PHOTO COMMENT: ' + message;
                    aThis.addComment(comment);
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
            this.job_statuses = this.job_statuses.filter(item => item !== "Ready");
            this.escalations_reasons = meta.fields.find(item => item.fieldname === "escalation_reason").options.split("\n");
            this.escalations_reasons = this.escalations_reasons.filter(item => item !== "");
            this.non_compliant_reasons = meta.fields.find(item => item.fieldname === "non_compliant_reason").options.split("\n");
            this.non_compliant_reasons = this.non_compliant_reasons.filter(item => item !== "");
            this.installation_types = meta.fields.find(item => item.fieldname === "installation_type").options.split("\n");

            aThis.loadJobData();
        });
    }

    loadJobData() {
        // avoid confusing for installers due to cache
        // don't cache at all
        if (locals['Job'] && locals['Job'][this.job_id]) {
            delete locals['Job'][this.job_id];
        }

        let aThis = this;
        frappe.model.with_doc("Job", this.job_id, (id, result) => {
            aThis.job_detail = result.docs[0];

            let timelines = new JobDetailTimelines(result.docinfo, result.docs[0]);
            aThis.all_activities = timelines.getTimelines(['all']);
            aThis.comment_activities = timelines.getTimelines(['comment']);
            aThis.attachment_activities = timelines.getTimelines(['comment', 'attachment'], true);

            aThis.selectedInstallationType = aThis.job_detail.installation_type;
            aThis.selectedJobStatus = aThis.job_detail.status;
            if (aThis.job_detail.escalation_reason) {
                aThis.selectedEscalationReason = aThis.job_detail.escalation_reason;
            }

            if (aThis.job_detail.non_compliant_reasons) {
                aThis.selectedNonCompliantReason = aThis.job_detail.non_compliant_reasons;
            }

            //checklist
            aThis.check_list_pre_install = aThis.job_detail.checklist.filter(
                item => (item.checklist_type === "Pre-Install") && (item.enabled));
            aThis.check_list_post_install = aThis.job_detail.checklist.filter(
                item => (item.checklist_type === "Post-Install") && (item.enabled));

            //timer
            aThis.calculateTimer();
            if (aThis.job_detail.status === "In Progress") {
                setInterval(function () {
                    aThis.calculateTimer();
                    $("#timer_hours").text(aThis.job_detail.timer_hours);
                    $("#timer_min").text(aThis.job_detail.timer_min);
                }, 30000);
            }
            if (aThis.job_detail.additional_services.length > 0) {
                aThis.job_detail.additional_services.forEach(item => {
                    let foundItem = aThis.additional_services.find(service => service.name === item.service);
                    if (foundItem)
                        foundItem.isSelected = true;
                })
            }
            if (aThis.job_detail.in_progress_installer && aThis.job_detail.in_progress_installer.length > 0) {
                aThis.job_detail.in_progress_installer_full_name = aThis.getUserName(aThis.job_detail.in_progress_installer);
                aThis.job_detail.start_at = moment(aThis.job_detail.in_progress_start_time).format('MMM. DD,YYYY')
            }


            let siteUnit = frappe.model.with_doc("Site Unit", aThis.job_detail.site_unit)
            let schedule = frappe.model.with_doc("Schedule", aThis.job_detail.schedule)
            Promise.all([siteUnit, schedule]).then((result) => {
                aThis.site_unit = result[0];
                aThis.schedule = result[1];
                let site = frappe.model.with_doc("Site", aThis.schedule.site)
                Promise.all([site]).then((siteResult) => {
                    aThis.site = siteResult[0];
                    aThis.renderJobDetail();
                })
            });
        });
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
                    aThis.selectedJobStatus === "Escalation - Level II" ||
                    aThis.selectedJobStatus === "Escalation - Level III" ||
                    aThis.selectedJobStatus === "Non-compliant") {
                    if (aThis.reasonMessage.length > 0)
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
                this.selectedJobStatus === "Escalation - Level II" ||
                this.selectedJobStatus === "Escalation - Level III") {
                job_detail.escalation_reason = this.selectedEscalationReason;
                job_detail.escalation_note = this.escalationNote;
            } else if (this.selectedJobStatus === "Non-compliant") {
                job_detail.non_compliant_reason = this.selectedNonCompliantReason;
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
            all_activities: this.all_activities,
            comment_activities: this.comment_activities,
            attachment_activities: this.attachment_activities,
            site: this.site
        })).appendTo($(this.jobDetailElement));
    }


    resetVariable() {
        this.previousSelectedJobStatus = '';
        this.selectedNonCompliantReason = '';
        this.selectedEscalationReason = '';
        this.reasonMessage = '';
        this.isAdditionalServiceChanged = false;
        this.isStatusChanged = false;
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

    getUserName(user) {
        return frappe.user_info(user).fullname || '';
    }
}


class JobDetailTimelines {

    constructor(docInfo, docData) {
        this.docInfo = docInfo;
        this.docData = docData;
        this.timelineItems = [];
        this.fieldsDict = {};
        this.buildFieldDict();
        this.prepareTimelineContents();
    }

    getTimelines(types, photoCommentOnly = false) {
        if (!types || types[0] === 'all') {
            return this.timelineItems;
        }
        let results = [];
        for (let item of this.timelineItems) {
            if (types.indexOf(item.timelineType) >= 0) {
                if (item.timelineType === 'comment' && photoCommentOnly) {
                    if (item.content.includes("PHOTO COMMENT:")) {
                        results.push(item);
                    }
                } else {
                    results.push(item);
                }
            }
        }
        return results;
    }

    buildFieldDict() {
        for (let field of frappe.get_meta("Job").fields) {
            this.fieldsDict[field['fieldname']] = {
                label: field.label,
                link_doctype: field.fieldtype === 'Link' || field.fieldtype === 'Table' ? field.options : null
            }
        }
    }

    prepareTimelineContents() {
        // based on form_timeline.js

        // skip the following as they are not relevant in Installer Manager
        // - get_communication_timeline_contents
        // - get_auto_messages_timeline_contents
        // - get_view_timeline_contents
        // - get_energy_point_timeline_contents
        // - get_share_timeline_contents
        // - get_workflow_timeline_contents
        // - get_like_timeline_contents
        // - get_custom_timeline_contents
        // - get_assignment_timeline_contents
        // - get_info_timeline_contents
        // - get_milestone_timeline_contents
        this.timelineItems.push(...this.getCommentTimelineContents());
        this.timelineItems.push(...this.getVersionTimelineContents());
        this.timelineItems.push(...this.getAttachmentTimelineContents());

        this.timelineItems.sort((item1, item2) => new Date(item2.creation) - new Date(item1.creation));
    }

    getCommentTimelineContents() {
        let contents = [];
        (this.docInfo.comments || []).forEach(comment => {
            contents.push(this.getCommentTimelineItem(comment));
        });
        return contents;
    }

    getCommentTimelineItem(comment) {
        return {
            timelineType: 'comment',
            icon: 'small-message',
            creation: comment.creation,
            content: this.getCommentTimelineContent(comment),
        };
    }

    getCommentTimelineContent(doc) {
        doc.content = frappe.dom.remove_script_and_style(doc.content);
        // based on timeline_message_box.html
        return `<div class="activity-item-header">
                        <div class='activity-owner'>
                            ${this.getUserFullName(doc.owner)}
                        </div>
                        <div class='activity-title'> commented <div class="text-muted">${comment_when(doc.creation)}</div></div>
                    </div>
                     <div class="activity-item-content">
                        ${doc.content}
                     </div>`
    }

    getVersionTimelineContents() {
        let jobDocTypeInfo = {
            doctype: "Job",
            docname: 'TODO',
            perm: {
                0: {read: 1}
            },
            fields_dict: this.fieldsDict
        }

        let versionContents = [];

        let creation_message = __("{0} created this {1}", [
            this.getUserFullName(this.docData.owner),
            comment_when(this.docData.creation)
        ]);
        let modified_message = __("{0} edited this {1}", [
            this.getUserFullName(this.docData.modified_by),
            comment_when(this.docData.modified),
        ])

        versionContents.push({
            timelineType: 'version',
            creation: this.docData.creation,
            content: `${creation_message} • ${modified_message}`
        });

        (this.docInfo.versions || []).forEach(version => {
            const contents = this.getVersionTimelineContent(version, jobDocTypeInfo);
            contents.forEach((content) => {
                versionContents.push({
                    timelineType: 'version',
                    creation: version.creation,
                    content: `${content} <span class="text-muted">${comment_when(version.creation)}</span>`,
                });
            });
        });
        return versionContents;
    }

    // based on version_timeline_content_builder.js but no hyperlink at all as hyperlinks are not relevant for field crew views
    getVersionTimelineContent(versionDoc, frm) {
        if (!versionDoc.data) {
            return [];
        }
        const data = JSON.parse(versionDoc.data);

        // comment
        if (data.comment) {
            return [data.comment];
        }

        let out = [];

        let updaterReferenceLink = null;
        let updaterReference = data.updater_reference;
        if (!$.isEmptyObject(updaterReference)) {
            updaterReferenceLink = updaterReference.label || __('via {0}', [updaterReference.doctype]);
        }

        let getUserFullName = this.getUserFullName;

        function formatContentForTimeline(content) {
            // text to HTML
            // limits content to 40 characters
            // escapes HTML
            // and makes it bold
            content = frappe.utils.html2text(content);
            content = frappe.ellipsis(content, 40) || '""';
            content = frappe.utils.escape_html(content);
            return content.bold();
        }

        // value changed in parent
        if (data.changed && data.changed.length) {
            let parts = [];
            data.changed.every(function (p) {
                if (p[0] === 'docstatus') {
                    if (p[2] === 1) {
                        let message = updaterReferenceLink
                            ? __('{0} submitted this document {1}', [getUserFullName(versionDoc.owner), updaterReferenceLink])
                            : __('{0} submitted this document', [getUserFullName(versionDoc.owner)]);
                        out.push(message);
                    } else if (p[2] === 2) {
                        let message = updaterReferenceLink
                            ? __('{0} cancelled this document {1}', [getUserFullName(versionDoc.owner), updaterReferenceLink])
                            : __('{0} cancelled this document', [getUserFullName(versionDoc.owner)]);
                        out.push(message);
                    }
                } else {
                    const df = frappe.meta.get_docfield(frm.doctype, p[0], frm.docname);
                    if (df && !df.hidden) {
                        const field_display_status = frappe.perm.get_field_display_status(df, null,
                            frm.perm);
                        if (field_display_status === 'Read' || field_display_status === 'Write') {
                            parts.push(__('{0} from {1} to {2}', [
                                __(df.label),
                                formatContentForTimeline(p[1]),
                                formatContentForTimeline(p[2])
                            ]));
                        }
                    }
                }
                return parts.length < 3;
            });
            if (parts.length) {
                let message;
                if (updaterReferenceLink) {
                    message = __("{0} changed value of {1} {2}", [getUserFullName(versionDoc.owner), parts.join(', '), updaterReferenceLink]);
                } else {
                    message = __("{0} changed value of {1}", [getUserFullName(versionDoc.owner), parts.join(', ')]);
                }
                out.push(message);
            }
        }

        // value changed in table field
        if (data.row_changed && data.row_changed.length) {
            let parts = [];
            data.row_changed.every(function (row) {
                row[3].every(function (p) {
                    let df = frm.fields_dict[row[0]] &&
                        frappe.meta.get_docfield(frm.fields_dict[row[0]].link_doctype,
                            p[0], frm.docname);

                    if (df && !df.hidden) {
                        let field_display_status = frappe.perm.get_field_display_status(df,
                            null, frm.perm);

                        if (field_display_status === 'Read' || field_display_status === 'Write') {
                            parts.push(__('{0} from {1} to {2} in row #{3}', [
                                frappe.meta.get_label(frm.fields_dict[row[0]].link_doctype,
                                    p[0]),
                                formatContentForTimeline(p[1]),
                                formatContentForTimeline(p[2]),
                                row[1]
                            ]));
                        }
                    }
                    return parts.length < 3;
                });
                return parts.length < 3;
            });
            if (parts.length) {
                let message;
                if (updaterReferenceLink) {
                    message = __("{0} changed values for {1} {2}", [getUserFullName(versionDoc.owner), parts.join(', '), updaterReferenceLink]);
                } else {
                    message = __("{0} changed values for {1}", [getUserFullName(versionDoc.owner), parts.join(', ')]);
                }
                out.push(message);
            }
        }

        // rows added / removed
        // __('added'), __('removed') # for translation, don't remove
        ['added', 'removed'].forEach(function (key) {
            if (data[key] && data[key].length) {
                let parts = (data[key] || []).map(function (p) {
                    let df = frappe.meta.get_docfield(frm.doctype, p[0], frm.docname);
                    if (df && !df.hidden) {
                        let field_display_status = frappe.perm.get_field_display_status(df, null,
                            frm.perm);

                        if (field_display_status === 'Read' || field_display_status === 'Write') {
                            return frappe.meta.get_label(frm.doctype, p[0]);
                        }
                    }
                });
                parts = parts.filter(function (p) {
                    return p;
                });
                if (parts.length) {
                    let message = '';

                    if (key === 'added') {
                        message = __("added rows for {0}", [parts.join(', ')]);
                    } else if (key === 'removed') {
                        message = __("removed rows for {0}", [parts.join(', ')]);
                    }

                    out.push(`${getUserFullName(versionDoc.owner)} ${message}`);
                }
            }
        });

        return out;
    }

    getUserFullName(user) {
        return (
            (frappe.session.user === user ? __("You") : frappe.user_info(user).fullname) || ''
        ).bold();
    }

    getAttachmentTimelineContents() {
        let contents = [];
        (this.docInfo.attachment_logs || []).forEach(attachmentLog => {

            let is_file_upload = attachmentLog.comment_type === 'Attachment';
            if (attachmentLog.content.startsWith("<img class=")) {
                contents.push({
                    timelineType: 'attachment',
                    icon: is_file_upload ? 'upload' : 'delete',
                    icon_size: 'sm',
                    creation: attachmentLog.creation,
                    content:
                        `<div class="activity-item-header">
                        <div class='activity-owner'>
                            ${this.getUserFullName(attachmentLog.owner)}
                        </div>
                        <div class='activity-title'> added a photo <div class="text-muted">${comment_when(attachmentLog.creation)}</div></div>
                    </div>
                     <div class="activity-item-content">
                            <a onclick="job_detail.openPhotoViewModal(this)">${attachmentLog.content}</a>   
                     </div>`,
                });
            }
        });
        return contents;
    }

}
