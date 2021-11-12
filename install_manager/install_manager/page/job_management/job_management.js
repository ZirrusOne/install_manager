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
    job_statuses = [];
    schedules = [];
    buildings = [];

    selectedTeam;

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
        if (!frappe.user.has_role("Field Installer")) {
            this.setTitleView();
        }
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        $(element).hasClass('collapsed') ? $(element).addClass('border-none') : $(element).removeClass('border-none')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    changeView() {
        this.isEscalationView = !this.isEscalationView;
        this.setTitleView();
        this.getFilters();
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
                    if (this.isEscalationView) {
                        this.job_statuses.forEach(item => {
                            item.isSelected = true;
                        })
                    } else {
                        this.job_statuses.forEach(item => {
                            item.isSelected = false;
                        })
                    }
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

                if (this.job_statuses.length === 0) {
                    this.renderResult([]);
                } else {
                    this.getData();
                }
            }
        });
    }

    getData() {
        frappe.call({
            method: 'install_manager.install_manager.page.job_management.job_management.list_active_jobs',
            args: {
                filters: this.prepareFilters()
            },
            callback: (result) => {
                let data = result.message;
                this.renderResult(data);
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
        this.renderTeamFilter();
        if (this.teams.length > 0) {
            $('#teamFilterModal').modal('show');
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
                        if (item.isSelected) {
                            this.buildings = item.buildings;
                            this.buildings.forEach(building => building.isSelected = false);
                        } else {
                            this.buildings = [];
                        }
                    } else {
                        item.isSelected = false;
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
        this.buildings = [];
        this.renderAllFilter();
    }

    onResetFilterBy(element) {
        let type = $(element).attr('data-value');
        switch (type) {
            case 'job_statuses':
                this.job_statuses.forEach(item => {
                    item.isSelected = false;
                })
                break;
            case 'schedules':
                this.schedules.forEach(item => item.isSelected = false);
                this.buildings = [];
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
