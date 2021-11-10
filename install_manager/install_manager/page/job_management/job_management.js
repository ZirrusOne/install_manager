///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-management"].on_page_load = (wrapper) => {
    const job_management = new JobManagement(wrapper);
    $('#navbar-breadcrumbs').addClass('hide-item');
    $(wrapper).bind('show', () => {
        let isFieldLead = frappe.user.has_role("Field Lead");
        job_management.isFieldLead = isFieldLead;
        job_management.isEscalationView = !!isFieldLead;
        job_management.isFirstTimeLoad = true;
        job_management.initData(wrapper);
    });
    window.job_management = job_management;
};

class JobManagement {
    teamTitleElement;
    resultWrapperElement;
    teamFilterElement;
    allFilterElement;


    isFieldLead;
    isEscalationView;
    isFirstTimeLoad;
    teams = [];
    jobStatus = [];
    schedules = [];
    buildings = [];

    selectedTeam;
    selectedStatus;
    selectedSchedule;
    selectedBuilding;

    previousSearchField = '';

    constructor(wrapper) {
    }

    initData(wrapper) {
        let aThis = this;
        $(wrapper).empty();
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Management',
            single_column: true
        });

        this.isEscalationView = false;

        $(frappe.render_template('job_management', {})).appendTo($(this.page.main));

        this.teamTitleElement = $(this.page.main).find('#teamDisplayName');
        this.resultWrapperElement = $(this.page.main).find('.result-wrapper');
        this.teamFilterElement = $(this.page.main).find('#teamFilter');
        this.allFilterElement = $(this.page.main).find('#allFilter');

        this.customUI();
        this.getFilters();

        //this.getData('');
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        $(element).hasClass('collapsed') ? $(element).addClass('border-none') : $(element).removeClass('border-none')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    changeView() {
        this.isEscalationView = !this.isEscalationView;
        this.getFilters()
    }

    getFilters() {
        frappe.call({
            type: "GET",
            method: 'install_manager.install_manager.page.job_management.job_management.get_list_filter_options',
            args: {
                escalation_view: this.isEscalationView
            },
            callback: (result) => {
                this.teams = result.message.teams;
                this.schedules = result.message.schedules;
                this.jobStatus = result.message.job_statuses;

                if (this.teams.length > 0) {
                    this.selectedTeam = this.teams[0];
                } else {
                    this.selectedTeam = null;
                }
                if (this.selectedTeam) {
                    $(this.teamTitleElement).text(this.selectedTeam.label);
                } else {
                    $(this.teamTitleElement).text('Unassigned');
                }

                if (this.jobStatus.length > 0) {
                    this.jobStatus.forEach(item => {
                        item.isSelected = false;
                    })
                }

                if (this.schedules.length > 0) {
                    this.schedules.forEach(schedule => {
                        schedule.isSelected = false;
                        if (schedule.buildings.length > 0) {
                            schedule.buildings.forEach(building => {
                                building.isSelected = false;
                            })
                        }
                    })
                }

                this.getData();
            }
        });
    }

    getData() {
        $(this.resultWrapperElement).empty();
        frappe.call({
            method: 'install_manager.install_manager.page.job_management.job_management.list_active_jobs',
            args: {
                filters: this.prepareFilters()
            },
            callback: (result) => {
                let data = result.message;
                if (!frappe.user.has_role("Field Installer")){
                    this.setTitleView();
                }

                $(frappe.render_template('search_result', {
                    isEscalation: this.isEscalationView,
                    result: data
                })).appendTo($(this.resultWrapperElement));
            }
        });
    }

    setTitleView() {
        let title = this.isEscalationView ? "Escalations" : "Jobs";
        let element = $('.navbar .container').find('.job-title');
        if (element.length > 0) {
            $('.navbar .container .job-title').text(title);
        } else {
            $('.navbar .container a.navbar-brand').after("<a class='job-title' onclick='job_management.changeView()'>" + title + "</a>");
        }
    }

    openTeamFilter() {
        $(this.teamFilterElement).empty();
        $(frappe.render_template('team_filter', {
            teams: this.teams,
            selectedTeam: this.selectedTeam
        })).appendTo($(this.teamFilterElement));
        if (this.teams.length > 0) {
            $('#teamFilterModal').modal('show');
        }
    }

    openAllFilters() {
        $(this.allFilterElement).empty();
        $(frappe.render_template('all_filter', {
            jobStatus: this.jobStatus,
            schedules: this.schedules,
            building: this.buildings,
            selectedStatus: this.selectedStatus,
            selectedSchedule: this.selectedSchedule,
            selectedBuilding: this.selectedBuilding,
        })).appendTo($(this.allFilterElement));
        $('#allFilterModal').modal('show');
    }

    changeTeam(element) {
        let teamId = $(element).attr('data-value');
        if (!this.selectedTeam.id === teamId) {
            this.selectedTeam = this.teams.find(item => item.id === teamId)
            $(this.teamTitleElement).text(this.selectedTeam.label);
        }

        $('#teamFilterModal').modal('hide');
    }

    prepareFilters() {
        let args = {
            "team_id": this.selectedTeam ? this.selectedTeam.id : '',
            "statuses": [],
            "building_numbers": [],
            "schedule_ids": []
        }

        // if (this.isEscalationView) {
        //     args.statuses = this.jobStatus.map(item => item.id);
        // } else {
        //     //   args.statuses = this.jobStatus.filter(item => item.isSelected).map(item => item.id);
        // }
        //
        // args.schedule_ids = this.schedules.filter(item => item.isSelected).map(item => item.id);
        // args.building_numbers = this.schedules.filter(item => item.isSelected).map(item => item.id);
        return args;
    }

    customUI() {
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
        $('.page-head .page-actions').find('.custom-actions').removeClass('hide hidden-xs hidden-md');
        $('.page-head .page-actions .custom-actions').find('.form-group').removeClass('col-md-2');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').removeClass('dropdown-menu-right');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').addClass('dropdown-menu-left');
        $('.page-head .page-actions .menu-btn-group button.btn-default.icon-btn').removeAttr('data-original-title');
    }
}
