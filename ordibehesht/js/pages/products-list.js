(function () {
    const body = document.body;

    function getFilterForm() {
        return document.getElementById('product-filter-form');
    }

    function getResultBox() {
        return document.getElementById('products-result');
    }

    function setLoading(isLoading) {
        const result = getResultBox();
        if (!result) return;

        result.classList.toggle('is-loading', !!isLoading);
        const indicator = result.querySelector('.product-result-loading');
        if (indicator) indicator.setAttribute('aria-hidden', isLoading ? 'false' : 'true');
    }

    function resetPage() {
        const pageInput = document.getElementById('product-page-value');
        if (pageInput) pageInput.value = '1';
    }

    function submitFilterForm() {
        const form = getFilterForm();
        if (!form) return;

        setLoading(true);
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
        } else {
            form.submit();
        }
    }


    function cleanParameters(parameters) {
        if (!parameters) return;

        Object.keys(parameters).forEach(function (key) {
            const value = parameters[key];
            const isArrayEmpty = Array.isArray(value) && value.length === 0;
            const isEmptyString = value === null || value === undefined || value === '';

            if (isArrayEmpty || isEmptyString) {
                delete parameters[key];
                return;
            }

            if ((key === 'Page' || key === 'page') && String(value) === '1') {
                delete parameters[key];
                return;
            }

            if ((key === 'Sort' || key === 'sort') && String(value) === 'newest') {
                delete parameters[key];
            }
        });
    }

    function cleanCurrentUrl() {
        const url = new URL(window.location.href);
        let changed = false;

        Array.from(url.searchParams.keys()).forEach(function (key) {
            const value = url.searchParams.get(key);
            if (value === null || value === '' || ((key === 'Page' || key === 'page') && value === '1') || ((key === 'Sort' || key === 'sort') && value === 'newest')) {
                url.searchParams.delete(key);
                changed = true;
            }
        });

        if (changed) {
            const next = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
            window.history.replaceState(window.history.state, '', next);
        }
    }

    function isProductFilterElement(element) {
        if (!element) return false;
        if (element.id === 'product-filter-form') return true;
        if (typeof element.closest === 'function' && element.closest('#product-filter-form')) return true;
        if (element.classList && (element.classList.contains('product-sort-button') || element.classList.contains('product-page-button'))) return true;
        return false;
    }

    document.addEventListener('click', function (event) {
        const sortButton = event.target.closest('.product-sort-button');
        if (sortButton) {
            event.preventDefault();
            const sortInput = document.getElementById('product-sort-value');
            if (sortInput) sortInput.value = sortButton.dataset.sort || 'newest';
            resetPage();
            submitFilterForm();
            return;
        }

        const pageButton = event.target.closest('.product-page-button');
        if (pageButton) {
            event.preventDefault();
            const pageInput = document.getElementById('product-page-value');
            if (pageInput) pageInput.value = pageButton.dataset.page || '1';
            submitFilterForm();
            return;
        }

        const openButton = event.target.closest('.mobile-filter-toggle');
        if (openButton) {
            event.preventDefault();
            const sidebar = document.querySelector('.filters-sidebar');
            if (sidebar) sidebar.classList.add('active');
            body.classList.add('filters-open');
            return;
        }

        const closeButton = event.target.closest('.close-filters');
        if (closeButton) {
            event.preventDefault();
            const sidebar = document.querySelector('.filters-sidebar');
            if (sidebar) sidebar.classList.remove('active');
            body.classList.remove('filters-open');
        }
    });

    document.addEventListener('change', function (event) {
        const form = getFilterForm();
        if (!form || !event.target || !form.contains(event.target)) return;
        if (event.target.name !== 'Page') resetPage();
    });

    document.body.addEventListener('htmx:configRequest', function (event) {
        if (!isProductFilterElement(event.detail.elt)) return;
        cleanParameters(event.detail.parameters);
        cleanParameters(event.detail.unfilteredParameters);
    });

    document.body.addEventListener('htmx:beforeRequest', function (event) {
        if (!isProductFilterElement(event.detail.elt)) return;
        setLoading(true);
    });

    document.body.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target && event.detail.target.id === 'products-result') {
            setLoading(false);
            cleanCurrentUrl();
        }
    });

    document.body.addEventListener('htmx:afterRequest', function (event) {
        if (!isProductFilterElement(event.detail.elt)) return;
        setLoading(false);
        cleanCurrentUrl();
    });

    document.body.addEventListener('htmx:responseError', function () {
        setLoading(false);
    });
})();
