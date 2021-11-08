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
    isFieldLead;
    isEscalationView;
    isFirstTimeLoad;
    teams = [];
    selectedTeam;
    previousSearchField = '';
    displayFilterTeamName = 'Test';

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

        $('.page-head-content').remove();

        $('.main-section').find('footer').remove();
        $('.page-head').find('.page-title').remove();
        $('.layout-main-section').find('.page-form').remove();
        $('.page-head .page-actions').find('.custom-actions').removeClass('hide hidden-xs hidden-md');
        $('.page-head .page-actions .custom-actions').find('.form-group').removeClass('col-md-2');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').removeClass('dropdown-menu-right');
        $('.page-head .page-actions .menu-btn-group').find('ul.dropdown-menu').addClass('dropdown-menu-left');
        $('.page-head .page-actions .menu-btn-group button.btn-default.icon-btn').removeAttr('data-original-title');
        this.getTeams();
        this.getData('');
    }

    toggleCollapse(element) {
        $(element).toggleClass('collapsed')
        $(element).hasClass('collapsed') ? $(element).addClass('border-none') : $(element).removeClass('border-none')
        let nextElementSibling = element.nextElementSibling;
        $(nextElementSibling).toggleClass('collapsed')
    }

    changeView() {
        this.isEscalationView = !this.isEscalationView;
        this.getData('');
    }

    getTeams() {
        frappe.call({
            method: 'install_manager.install_manager.page.job_management.job_management.get_teams',
            callback: (result) => {
                this.teams = result.message;
                if (this.teams.length > 0) {
                    this.selectedTeam = this.teams[0];
                } else {
                    this.selectedTeam = null;
                }
                if (this.selectedTeam) {
                    this.displayFilterTeamName = this.selectedTeam.teamName
                } else {
                    this.displayFilterTeamName = 'Unassigned';
                }
                $(frappe.render_template('team_filter', {
                    teams: this.teams,
                    selectedTeam: this.selectedTeam.teamName
                })).appendTo($(this.page.main));
            }
        })
    }

    getData(filter) {
        $(this.page.main).find('.job-wrapper').remove();

        frappe.call({
            method: 'install_manager.install_manager.page.job_management.job_management.get_job_base_team',
            args: {
                searchValue: filter,
                isEscalation: this.isEscalationView
            },
            callback: (r) => {
                let data = JSON.parse(r.message);
                if (this.isFirstTimeLoad && this.isEscalationView) {
                    this.isFirstTimeLoad = false;
                    if (data.length === 0) {
                        this.isEscalationView = false;
                        this.getData(filter)
                    } else {
                        this.setTitleView();
                        $(frappe.render_template('job_management', {
                            isEscalation: this.isEscalationView,
                            result: data,
                            displayFilterTeamName: this.displayFilterTeamName,
                        })).appendTo($(this.page.main));
                    }
                } else {
                    this.setTitleView();
                    $(frappe.render_template('job_management', {
                        isEscalation: this.isEscalationView,
                        displayFilterTeamName: this.displayFilterTeamName,
                        result: data,
                    })).appendTo($(this.page.main));
                }
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
        $('#teamFilterModal').modal('show');
    }

    changeTeam(element) {
        let teamName = $(element).attr('data-value');
        if (!this.selectedTeam.teamName === teamName) {
            this.selectedTeam = this.teams.find(item => item.teamName === teamName)
            this.displayFilterTeamName = teamName;
        }
    }

    openAllFilters() {

    }
}
