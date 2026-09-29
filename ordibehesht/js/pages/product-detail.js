(function () {
    const mainImage = document.getElementById('main-product-image');
    const priceEl = document.getElementById('pdp-price');
    const skuEl = document.getElementById('pdp-sku');
    const selectedWeightEl = document.getElementById('selected-weight');
    const selectedStoneEl = document.getElementById('selected-stone');
    const leadVariantId = document.getElementById('lead-variant-id');
    const leadVariantTitle = document.getElementById('lead-variant-title');
    const leadPriceText = document.getElementById('lead-price-text');
    const openModalButton = document.getElementById('open-piggy-bank-modal');
    const modal = document.getElementById('piggyBankLeadModal');
    const closeModalButton = document.getElementById('close-piggy-bank-modal');

    document.querySelectorAll('.pdp-thumbnail').forEach(function (button) {
        button.addEventListener('click', function () {
            const image = button.querySelector('img');
            if (!image || !mainImage) return;

            mainImage.src = image.dataset.fullSrc || image.src;
            document.querySelectorAll('.pdp-thumbnail').forEach(function (item) { item.classList.remove('active'); });
            button.classList.add('active');
        });
    });

    document.querySelectorAll('.variant-option').forEach(function (button) {
        button.addEventListener('click', function () {
            document.querySelectorAll('.variant-option').forEach(function (item) { item.classList.remove('active'); });
            button.classList.add('active');

            if (priceEl) priceEl.textContent = button.dataset.price || '';
            if (skuEl) skuEl.textContent = 'کد محصول: ' + (button.dataset.sku || '---');
            if (selectedWeightEl) selectedWeightEl.textContent = button.dataset.weight || '---';
            if (selectedStoneEl) selectedStoneEl.textContent = (button.dataset.stone || '۰') + ' تومان';
            if (leadVariantId) leadVariantId.value = button.dataset.variantId || '';
            if (leadVariantTitle) leadVariantTitle.value = button.dataset.weight || '';
            if (leadPriceText) leadPriceText.value = button.dataset.price || '';
            if (openModalButton) openModalButton.dataset.variantId = button.dataset.variantId || '';

            if (button.dataset.image && mainImage) {
                mainImage.src = button.dataset.image;
            }
        });
    });

    function openModal(event) {
        if (event) event.preventDefault();
        if (!modal) return;

        modal.classList.add('active', 'is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        window.setTimeout(function () {
            const firstInput = modal.querySelector('input:not([type="hidden"]), button, textarea, select');
            if (firstInput) firstInput.focus({ preventScroll: true });
        }, 80);
    }

    function closeModal(event) {
        if (event) event.preventDefault();
        if (!modal) return;

        modal.classList.remove('active', 'is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (openModalButton) openModalButton.focus({ preventScroll: true });
    }

    if (openModalButton) openModalButton.addEventListener('click', openModal);
    if (closeModalButton) closeModalButton.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeModal(event);
        });
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeModal(event);
        }
    });

    document.body.addEventListener('htmx:afterSwap', function (event) {
        if (event.detail.target && event.detail.target.id === 'piggy-bank-lead-result') {
            const successBox = event.detail.target.querySelector('.piggy-bank-lead-result.success');
            if (successBox) {
                const form = document.getElementById('piggy-bank-lead-form');
                if (form) form.reset();
            }
        }
    });
})();
