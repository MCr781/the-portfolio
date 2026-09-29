/* ============================================================
   TALASHO — product-icons.js
   Replaces generic SVG placeholders inside product cards with
   category-specific jewelry SVGs based on the product title's
   keywords (ring, necklace, bracelet, earring, set, bangle, etc).

   Backend integration:
     - Each product card's image area must have class `product-img-slot`
     - The product title is read from the card's <h3> element
     - If no keyword matches, falls back to a generic gem icon
   ============================================================ */

(function () {
    'use strict';

    // SVG snippets — each is a self-contained <svg>...</svg> string
    // All use currentColor stroke so they pick up Tailwind text-primary-300 from the parent
    const ICONS = {
        // Ring with solitaire diamond
        ring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="15" r="6" stroke-width="1.2"/>' +
            '<path d="M9 9 L12 3 L15 9 Z" fill="currentColor" fill-opacity="0.3" stroke-width="1.2"/>' +
            '<circle cx="12" cy="6" r="1.2" fill="currentColor"/>' +
            '</svg>',

        // Necklace with pendant
        necklace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M3 4 Q12 14 21 4" stroke-width="1.2"/>' +
            '<circle cx="12" cy="13" r="3" stroke-width="1.2"/>' +
            '<circle cx="12" cy="13" r="1" fill="currentColor"/>' +
            '</svg>',

        // Bracelet (chain)
        bracelet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<ellipse cx="12" cy="12" rx="9" ry="5" stroke-width="1.2" stroke-dasharray="3 1.5"/>' +
            '</svg>',

        // Earring (stud + drop)
        earring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="6" r="2" stroke-width="1.2"/>' +
            '<path d="M12 8 L10 14 Q12 18 14 14 Z" stroke-width="1.2"/>' +
            '<circle cx="12" cy="14" r="1" fill="currentColor"/>' +
            '</svg>',

        // Bangle (solid ring)
        bangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="12" r="8" stroke-width="2.5"/>' +
            '<circle cx="12" cy="12" r="8" stroke-width="0.5" stroke-dasharray="1 2" opacity="0.5"/>' +
            '</svg>',

        // Jewelry set (ring + necklace + earring trio)
        set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M3 4 Q7 9 11 4" stroke-width="1"/>' +
            '<circle cx="7" cy="9" r="1.5" stroke-width="1"/>' +
            '<circle cx="17" cy="6" r="2.5" stroke-width="1"/>' +
            '<circle cx="17" cy="6" r="0.8" fill="currentColor"/>' +
            '<ellipse cx="12" cy="18" rx="4" ry="3" stroke-width="1"/>' +
            '</svg>',

        // Coin (gold coin disc)
        coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="12" cy="12" r="9" stroke-width="1.5"/>' +
            '<circle cx="12" cy="12" r="6" stroke-width="0.8" opacity="0.5"/>' +
            '<path d="M9 10 Q12 8 15 10 Q15 13 12 13 Q9 13 9 16 Q12 18 15 16" stroke-width="1.2" stroke-linecap="round"/>' +
            '</svg>',

        // Generic gem (fallback)
        gem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M6 9 L12 3 L18 9 L12 21 Z" stroke-width="1.2"/>' +
            '<path d="M6 9 L18 9" stroke-width="1"/>' +
            '<path d="M12 3 L12 21" stroke-width="0.8" opacity="0.5"/>' +
            '</svg>'
    };

    // Keyword → icon mapping (Persian + English keywords)
    const KEYWORDS = [
        { re: /(انگشتر|حلقه|سولیتر|نامزدی|ring)/i, icon: 'ring' },
        { re: /(گردنبند|چوکر|زنجیر|پلاک|necklace|chain|choker)/i, icon: 'necklace' },
        { re: /(گوشواره|earring|stud)/i, icon: 'earring' },
        { re: /(دستبند|bracelet|کارتیر)/i, icon: 'bracelet' },
        { re: /(النگو|بنگل|bangle)/i, icon: 'bangle' },
        { re: /(ست|سرویس|set|collection)/i, icon: 'set' },
        { re: /(سکه|coin)/i, icon: 'coin' }
    ];

    function pickIcon(title) {
        if (!title) return ICONS.gem;
        for (var i = 0; i < KEYWORDS.length; i++) {
            if (KEYWORDS[i].re.test(title)) return ICONS[KEYWORDS[i].icon];
        }
        return ICONS.gem;
    }

    function apply() {
        // Find every product image slot — covers standard dk-card, dk-offers-card, best-seller items
        const slots = document.querySelectorAll('.product-img-slot, [data-product-img]');
        slots.forEach(function (slot) {
            // Skip if already populated
            if (slot.querySelector('svg')) return;

            // Find the product title — look upwards for the closest card container
            const card = slot.closest('article') || slot.closest('a') || slot.parentElement;
            const titleEl = card ? card.querySelector('h3, h4') : null;
            const title = titleEl ? titleEl.textContent : '';
            const svg = pickIcon(title);
            slot.innerHTML = svg;

            // Size SVG based on slot's parent context
            // - dk-offers-card / dk-card: large icon
            // - best-seller: smaller icon
            const isSmall = slot.closest('.dk-rank') || (slot.parentElement && slot.parentElement.classList.contains('w-16'));
            const sizeClass = isSmall
                ? 'w-12 h-12 text-primary-300 transition-transform duration-500'
                : 'w-20 h-20 md:w-24 md:h-24 text-primary-300 group-hover:scale-110 transition-transform duration-500';
            const svgEl = slot.querySelector('svg');
            if (svgEl) {
                svgEl.setAttribute('class', sizeClass);
            }
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    } else {
        apply();
    }

    // Re-run after a short delay so Swiper-cloned slides (loop mode) also get icons
    setTimeout(apply, 800);
    setTimeout(apply, 2000);

    // Expose for backend to re-run after AJAX product injection
    window.TALASHO = window.TALASHO || {};
    window.TALASHO.applyProductIcons = apply;
})();
