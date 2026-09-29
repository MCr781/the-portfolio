/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./assets/js/**/*.js",
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
  ],
  theme: {
    extend: {
      /* ============================================================
         COLORS — Talasho palette mapped to Digikala-spec roles
         (Layout uses spec's structure; brand uses Talasho's purple+gold)
         ============================================================ */
      colors: {
        /* Primary (Royal Purple / Eggplant) — replaces spec's red #E6123D */
        primary: {
          50:  '#F4F1F6',
          100: '#E3DBE8',
          300: '#9F6BA0',
          500: '#4A154B',  /* main brand */
          600: '#3D113D',
          700: '#2E0D2E',
          800: '#240A24',
          900: '#1A071A',
          950: '#0D030D',
        },
        /* Accent (Gold) — Talasho-only premium accent */
        gold: {
          50:  '#FCFAF2',
          100: '#F6F0D8',
          200: '#EDDFB0',
          300: '#E0CB7A',
          500: '#D4AF37',
          600: '#C29F2F',
          700: '#A88926',
        },
        /* Background & surface — spec-exact */
        background: {
          DEFAULT: '#F5F5F5',  /* spec: page background */
          surface: '#FFFFFF',   /* spec: card background */
          hover:   '#FAFAFA',   /* subtle hover surface */
        },
        /* Convenience top-level aliases */
        surface: '#FFFFFF',
        'surface-hover': '#FAFAFA',

        /* Text colors — spec-exact */
        content: {
          heading: '#23254A',  /* spec: heading */
          body:    '#5E6472',  /* spec: body */
          muted:   '#8D94A5',  /* spec: muted */
          invert:  '#FFFFFF',
          // Keep legacy aliases for backward compat with old HTML during migration
          main:    '#23254A',
        },

        /* Borders — spec-exact */
        border: {
          DEFAULT: '#ECECEC',
          strong:  '#E0E0E0',
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
