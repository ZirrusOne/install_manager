///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-management"].on_page_load = (wrapper) => {
    const job_management = new JobManagement(wrapper);
    $('#navbar-breadcrumbs').addClass('hide-item');
    $(wrapper).bind('show', () => {
        job_management.initData(wrapper);
    });
    window.job_management = job_management;
};

class JobManagement {
    //binding element
    teamTitleElement;
    resultWrapperElement;
    teamFilterElement;
    allFilterElement;

    isEscalationView;
    teams = [];
    job_statuses = [];
    schedules = [];
    buildings = [];
    results = [];
    selectedTeam;

    constructor(wrapper) {
    }

    initData(wrapper) {
        $(wrapper).empty();
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'Job Management',
            single_column: true
        });

        this.isEscalationView = false;

        $(frappe.render_template('job_management', {
            isInstaller: frappe.user.has_role("Field Installer")
        })).appendTo($(this.page.main));

        this.teamTitleElement = $(this.page.main).find('#teamDisplayName');
        this.resultWrapperElement = $(this.page.main).find('.result-wrapper');
        this.teamFilterElement = $(this.page.main).find('#teamFilter');
        this.allFilterElement = $(this.page.main).find('#allFilter');

        this.customUI();
        this.getFilters();
        this.setTitleView();
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        $(element).hasClass('collapsed') ? $(element).addClass('border-none') : $(element).removeClass('border-none')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    changeView() {
        if (!frappe.user.has_role("Field Installer")) {
            this.isEscalationView = !this.isEscalationView;
            this.setTitleView();
            this.getFilters();
            if (this.isEscalationView) {
                $('#allFilterButton').addClass('border-red');
            } else {
                $('#allFilterButton').removeClass('border-red');
            }
        }
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
                this.job_statuses = result.message.job_statuses;

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

                if (this.job_statuses.length > 0) {
                    this.job_statuses.forEach(item => {
                        item.isSelected = true;
                    })
                }

                if (this.schedules.length > 0) {
                    this.schedules.forEach(schedule => {
                        schedule.isSelected = true;
                        if (schedule.buildings.length > 0) {
                            schedule.buildings.forEach(building => {
                                building.isSelected = true;
                            })
                        }

                        this.buildings = this.buildings.concat(schedule.buildings)
                    })
                }

                this.buildings = this.buildings.filter((building, index, tempBuilding) => tempBuilding.findIndex(tempBuildingItem => tempBuildingItem.id === building.id) === index)

                if (this.job_statuses.length === 0) {
                    this.renderResult([]);
                } else {
                    this.getData();
                }
            }
        });
    }

    getData() {
        let aThis = this;
        frappe.call({
            method: 'install_manager.install_manager.page.job_management.job_management.list_active_jobs',
            args: {
                filters: this.prepareFilters()
            },
            callback: (result) => {
                this.results = result.message;
                this.calculateTimer();
                setInterval(function () {
                    aThis.calculateTimer();
                }, 30000);
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
        if (!frappe.user.has_role("Field Installer")) {
            this.renderTeamFilter();
            if (this.teams.length > 0) {
                $('#teamFilterModal').modal('show');
            }
        }
    }

    onChangeTeam(element) {
        let teamId = $(element).attr('data-value');
        if (!this.selectedTeam.id === teamId) {
            this.selectedTeam = this.teams.find(item => item.id === teamId)
            $(this.teamTitleElement).text(this.selectedTeam.label);
            this.onResetAllFilter();
            this.getData();
        }
        $('#teamFilterModal').modal('hide');
    }

    openAllFilters() {
        if (this.job_statuses.length > 0) {
            this.renderAllFilter();
            $('#allFilterModal').modal('show');
        }
    }

    onChangeAllFilter(element) {
        let id = $(element).attr('data-value');
        let filterFor = $(element).attr('data-filter-for');
        switch (filterFor) {
            case 'job_statuses':
                this.job_statuses.forEach(item => {
                    if (item.id === id)
                        item.isSelected = !item.isSelected;
                })
                break;
            case 'schedules':
                this.schedules.forEach(item => {
                    if (item.id === id) {
                        item.isSelected = !item.isSelected;
                    }
                })
                break;
            case 'buildings':
                this.buildings.forEach(item => {
                    if (item.id.toString() === id)
                        item.isSelected = !item.isSelected;
                })
                break;
        }

        this.renderAllFilter();
    }

    onResetAllFilter() {
        this.job_statuses.forEach(item => item.isSelected = false);
        this.schedules.forEach(item => item.isSelected = false);
        this.buildings.forEach(item => item.isSelected = false);
        this.renderAllFilter();
    }

    onResetFilterBy(element) {
        let type = $(element).attr('data-value');
        switch (type) {
            case 'job_statuses':
                this.job_statuses.forEach(item => item.isSelected = false)
                break;
            case 'schedules':
                this.schedules.forEach(item => item.isSelected = false);
                break;
            case 'buildings':
                this.buildings.forEach(item => item.isSelected = false);
                break;
        }
        this.renderAllFilter();
    }

    onCloseFilter() {
        $('#allFilterModal').modal('hide');
        this.getData();
    }

    prepareFilters() {
        let args = {
            "team_id": this.selectedTeam ? this.selectedTeam.id : '',
            "statuses": [],
            "building_numbers": [],
            "schedule_ids": []
        }

        if (this.isEscalationView) {
            args.statuses = this.job_statuses.map(item => item.id);
        } else {
            args.statuses = this.job_statuses.filter(item => item.isSelected).map(item => item.id);
        }

        args.schedule_ids = this.schedules.filter(item => item.isSelected).map(item => item.id);

        if (this.buildings.length > 0) {
            args.building_numbers = this.buildings.filter(item => item.isSelected).map(item => item.id);
        }

        return args;
    }

    customUI() {
        $('.navbar').removeClass('hide-item');
        $('.navbar').addClass('job-page');
        $('.job-title').removeClass('hide-item');
        $('.page-head-content').remove();
        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
    }

    calculateTimer() {
        let currentTime = moment();
        this.results.forEach(item => {
            // count time for job with status in progress
            item.timer_hours = 0;
            item.timer_min = 0;
            if (item.in_progress_start_time != null && item.job_status === 'In Progress') {
                let startTime = moment(item.in_progress_start_time);
                let inProgressTime = moment.duration(currentTime.diff(startTime));
                let totalTimeInMinute = Math.round(inProgressTime.asMinutes() + item.finished_timer_minutes);
                let hours = Math.floor(totalTimeInMinute / 60);
                let minutes = totalTimeInMinute - hours * 60;

                item.timer_hours = hours.toLocaleString('en-US', {minimumIntegerDigits: 2});
                item.timer_min = minutes.toLocaleString('en-US', {minimumIntegerDigits: 2});
            } else {
                let hours = Math.floor(item.finished_timer_minutes / 60);
                let minutes = item.finished_timer_minutes - hours * 60;

                item.timer_hours = hours.toLocaleString('en-US', {minimumIntegerDigits: 2});
                item.timer_min = minutes.toLocaleString('en-US', {minimumIntegerDigits: 2});
            }
        });
        this.renderResult(this.results);
    }

    renderAllFilter() {
        $(this.allFilterElement).empty();
        $(frappe.render_template('all_filter', {
            job_statuses: this.job_statuses,
            schedules: this.schedules,
            buildings: this.buildings,
        })).appendTo($(this.allFilterElement));
    }

    renderTeamFilter() {
        $(this.teamFilterElement).empty();
        $(frappe.render_template('team_filter', {
            teams: this.teams,
            selectedTeam: this.selectedTeam
        })).appendTo($(this.teamFilterElement));
    }

    renderResult(data) {
        $(this.resultWrapperElement).empty();
        $(frappe.render_template('search_result', {
            isEscalation: this.isEscalationView,
            result: data
        })).appendTo($(this.resultWrapperElement));
    }
}
