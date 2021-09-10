///
// Copyright (c) 2021, Zirrus One and contributors
// For license information, please see license.txt
///

frappe.pages["job-detail"].on_page_load = (wrapper) => {
	const job_detail = new JobDetail(wrapper);
	$('.navbar-home').attr("href", "/app/job-management")
	$(wrapper).bind('show', () => {
		job_detail.initData();
	});

	window.job_detail = job_detail;
};

class JobDetail {

	constructor(wrapper) {
		let aThis = this;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: 'Job Detail',
			single_column: true
		});

		$('.main-section').find('footer').remove();
		$('.page-head').find('.page-title').remove();
		$('.layout-main-section').find('.page-form').remove();
	}

	initData() {
	}
}
