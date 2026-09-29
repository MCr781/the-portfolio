/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./product/**/*.html",
    "./assets/js/**/*.js",
    // Global shell partials — scanned so the shared header/footer/bottom-nav
    // classes are always emitted. Recompile after changing a partial.
    "./assets/partials/**/*.html",
    // PWA layer — added so Tailwind scans PWA HTML files and emits the
    // utility classes they use. Does NOT change the main site's rendered
    // output (Tailwind only adds classes, never removes). When you add a
    // new HTML file under /pwa/, run `npm run build:css` to recompile.
    "./pwa/**/*.html",
    // Wallet app — milli.gold-style gold investment wallet (Phase 2).
    // Same rationale as above: scan wallet HTML so its utility classes
    // get emitted into style.css. Recompile after adding/changing classes.
    "./wallet/**/*.html",
  ],
  /* Safelist: design-system component classes that must always be emitted,
     even before the HTML references them. This lets us build the foundation
     in Part 1 and have all classes ready for Parts 2-8. */
  safelist: [
    'container-page',
    'ts-section',
    'ts-card-lg',
    'ts-card',
    'ts-card-product',
    'ts-banner',
    'ts-pill',
    'ts-badge-discount',
    'ts-badge-success',
    'ts-badge-error',
    'ts-badge-info',
    'btn-primary',
    'btn-gold',
    'btn-secondary',
    'ts-section-head',
    'ts-section-head__left',
    'ts-section-head__icon',
    'ts-section-title',
    'ts-section-link',
    'ts-hero-title',
    'ts-product-title',
    'ts-body',
    'ts-caption',
    'ts-cat-tile',
    'ts-cat-tile__circle',
    'ts-cat-tile__label',
    'ts-product-img',
    'ts-swiper-arrow',
    'hover-scale-103',
    'ltr',
    'rtl',
    'no-scrollbar',
    'font-latin',
    // Mega menu (Part 2)
    'mega-menu-hover-area',
    'mega-menu-panel',
    // Swiper (Part 3)
    'swiper',
    'swiper-wrapper',
    'swiper-slide',
    'swiper-pagination',
    'swiper-pagination-bullet',
    'swiper-pagination-bullet-active',
    'swiper-pagination-dark',
    'swiper-button-prev-custom',
    'swiper-button-next-custom',
    'hero-swiper',
    // Hero layout (Part 3 update)
    'lg:w-[400px]',
    'lg:flex-1',
    'lg:order-1',
    'lg:order-2',
    'order-1',
    'order-2',
    // Flash sale (Part 4)
    'flash-sale-swiper',
    // Custom scrollbar
    'cat-scroll',
    // Shimmer animation
    'animate-glass-shimmer',
    // Phase A: new color tokens (sharpened gold + silver) for wallet + future pages
    'bg-gold-400', 'text-gold-400', 'border-gold-400',
    'bg-gold-300', 'text-gold-300', 'border-gold-300',
    'bg-silver-400', 'text-silver-400', 'border-silver-400',
    'bg-silver-300', 'text-silver-300', 'border-silver-300',
    'bg-silver-200', 'text-silver-200', 'border-silver-200',
    'bg-silver-100', 'text-silver-100', 'border-silver-100',
    'bg-silver-50', 'text-silver-50', 'border-silver-50',
    // Primary shades for the 3-tier system (so they're always available)
    'bg-primary-500', 'text-primary-500', 'border-primary-500',
    'bg-primary-600', 'text-primary-600', 'border-primary-600',
    'bg-primary-700', 'text-primary-700', 'border-primary-700',
    // Product page components
    'product-gallery',
    'product-gallery__main',
    'product-gallery__thumbs',
    'product-buy-box',
    'product-specs-table',
    'product-review-card',
    'variant-chip',
    'variant-chip--active',
    // Header icon dropdowns (cart, wishlist, …)
    'header-dropdown-hover-area',
    'header-dropdown-panel',
    'header-dropdown-panel--center',
    'header-dropdown-panel--left',
    'header-dropdown-panel--right',
    // Responsive fixes for header/nav overflow
    'xl:flex',
    'md:hidden',
    'lg:inline',
  ],
  theme: {
    extend: {
      /* ============================================================
         COLORS — Talasho palette mapped to Digikala-spec roles
         (Layout uses spec's structure; brand uses Talasho's purple+gold)
         ============================================================ */
      colors: {
        /* ════════════════════════════════════════════════════════════════
           PRIMARY — 3-tier purple system (per client screenshot)
           ────────────────────────────────────────────────────────────────
           Screenshot showed TWO purples in the header:
             • #6E436E (lighter, the main header band) → use EVERYWHERE as primary
             • #4A154B (darker, thin announcement strip) → use as SECONDARY accent
             • #2E0D2E (darkest, footer) → use only when a darker shade is needed
           The online-rates.jpeg reference confirms #6E436E is correct.
           ════════════════════════════════════════════════════════════════ */
        primary: {
          50:  '#F4F1F6',   /* lightest tint — bg washes */
          100: '#E8DCE8',   /* light tint — subtle backgrounds */
          200: '#D0B8D0',   /* light — borders, dividers on dark */
          300: '#A87BA8',   /* medium-light — hover states */
          400: '#8A5A8A',   /* medium — secondary text on dark */
          500: '#6E436E',   /* ← MAIN BRAND — use everywhere (screenshot header) */
          600: '#4A154B',   /* ← SECONDARY — darker accent (screenshot announcement) */
          700: '#2E0D2E',   /* ← DARKEST — footer, dark sections */
          800: '#240A24',
          900: '#1A071A',
          950: '#0D030D',
        },

        /* ════════════════════════════════════════════════════════════════
           GOLD — sharpened per voice note 3 ("طلایی‌تر، شارپ‌تر، نه زرد چرک")
           ────────────────────────────────────────────────────────────────
           Old #D4AF37 was slightly muddy. New #E8B948 is more golden/vibrant
           while still passing WCAG AA on purple. Brighter #F0D050 for accents
           on dark backgrounds (passes AAA on #6E436E).
           ════════════════════════════════════════════════════════════════ */
        gold: {
          50:  '#FDF8E8',
          100: '#FAEFC6',
          200: '#F4E08A',
          300: '#F0D050',   /* bright gold — accents on dark bg (AAA on #6E436E) */
          400: '#E8B948',   /* ← MAIN GOLD — sharper, more golden than old #D4AF37 */
          500: '#D4AF37',   /* legacy gold — kept for backward compat with existing CSS */
          600: '#B8941F',   /* darker gold — hover states, text on light bg */
          700: '#8F7019',   /* darkest gold — borders, low-contrast accents */
        },

        /* ════════════════════════════════════════════════════════════════
           SILVER — sharpened per voice note 3 ("نقره‌ای‌تر، شارپ‌تر")
           ────────────────────────────────────────────────────────────────
           For "minimal beauty" / "silver investment" style boxes.
           Cooler and more metallic than a neutral gray.
           ════════════════════════════════════════════════════════════════ */
        silver: {
          50:  '#F5F7FA',
          100: '#E8ECF2',
          200: '#D1D8E3',
          300: '#B0BAC9',
          400: '#9FA8B5',   /* ← MAIN SILVER — cooler, more metallic */
          500: '#7B8595',
          600: '#5C6573',
          700: '#3E4550',
        },

        /* Background & surface — warmed up for Talasho's gold identity */
        background: {
          DEFAULT: '#F9F6F0',  /* warm off-white with subtle gold undertone */
          surface: '#FEFEFE',   /* barely off-white, warmer than pure #FFFFFF */
          hover:   '#F4F1EC',   /* subtle warm hover surface */
        },
        /* Convenience top-level aliases */
        surface: '#FEFEFE',
        'surface-hover': '#F4F1EC',

        /* Text colors — warmed up (less blue-gray, more neutral-warm) */
        content: {
          heading: '#1E1E28',  /* warm near-black */
          body:    '#524E4A',  /* warm medium gray */
          muted:   '#948E88',  /* warm muted gray */
          invert:  '#FFFFFF',
          // Keep legacy aliases for backward compat with old HTML during migration
          main:    '#1E1E28',
        },

        /* Borders — warmed up */
        border: {
          DEFAULT: '#E8E2DC',
          strong:  '#DCD6CE',
        },

        /* Semantic / status — spec-exact */
        status: {
          success:    '#00A049',
          'success-bg': '#E8F8EF',
          error:      '#EF394E',  /* spec: discount red */
          'error-bg':   '#FEF0F2',
          warning:    '#D97706',
          'warning-bg': '#FFFBEB',
          info:       '#2563EB',
          'info-bg':    '#EFF6FF',
        },
      },

      /* ============================================================
         SPACING — strict 4px/8px grid (Tailwind defaults already fit)
         Spec: 8px spacing system, with 4px micro-adjustments allowed
         Tokens used: 1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px,
                      7=28px, 8=32px, 10=40px, 12=48px, 14=56px
         ============================================================ */

      /* ============================================================
         BORDER RADIUS — spec tier system
         ============================================================ */
      borderRadius: {
        'none': '0',
        'sm':   '8px',   /* small UI bits */
        'md':   '12px',  /* inputs, small chips */
        'lg':   '14px',  /* spec: product cards */
        'xl':   '16px',  /* spec: normal cards + images */
        '2xl':  '20px',  /* spec: large cards */
        '3xl':  '24px',  /* extra-large cards */
        'full': '999px', /* spec: pills, buttons */
      },

      /* ============================================================
         SHADOWS — spec-exact (very subtle, 2-layer)
         ============================================================ */
      boxShadow: {
        'xs':     '0 1px 2px rgba(0, 0, 0, 0.04)',                    /* spec: subtlest */
        'sm':     '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)',
        'card':   '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 20px rgba(0, 0, 0, 0.05)',  /* spec: default card */
        'hover':  '0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.08)',  /* spec: hover lift */
        'lg':     '0 4px 12px rgba(0, 0, 0, 0.05), 0 12px 32px rgba(0, 0, 0, 0.07)',
        'none':   'none',
      },

      /* ============================================================
         TYPOGRAPHY — spec type scale
         ============================================================ */
      fontSize: {
        'caption':   ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'body':      ['13px', { lineHeight: '1.6', fontWeight: '400' }],
        'product':   ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        'section':   ['20px', { lineHeight: '1.4', fontWeight: '700' }],
        'hero-sm':   ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        'hero':      ['36px', { lineHeight: '1.25', fontWeight: '700' }],
        'hero-lg':   ['40px', { lineHeight: '1.2',  fontWeight: '700' }],
      },

      fontFamily: {
        /* Persian-digit variant (default — numerals render as ۰-۹) */
        sans: ['Vazirmatn-FD', 'Vazirmatn', 'system-ui', 'sans-serif'],
        /* Latin-digit variant for price board + financial data */
        latin: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },

      maxWidth: {
        'page':    '1440px',  /* spec: max page width */
        'content': '1320px',  /* spec: content container */
      },

      transitionDuration: {
        '250': '250ms',  /* spec: hover transitions */
      },

      transitionTimingFunction: {
        'spec': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
