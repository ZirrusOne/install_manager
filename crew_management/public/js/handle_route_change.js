let url = location.href;
document.body.addEventListener('click', () => {
    requestAnimationFrame(() => {
        let currentRoute = location.href;
        if (url !== currentRoute) {
            url = location.href;
            if (!currentRoute.includes('job-management')) {
                $('#navbar-breadcrumbs').removeClass('hide-item');
                $('.navbar .container .job-title').addClass('hide-item')
            } else {
                $('.navbar .container .job-title').removeClass('hide-item')
                $('#navbar-breadcrumbs').addClass('hide-item');
            }
            console.log('change')
        }
    });
}, true);
