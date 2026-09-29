/**
 * Product Page — Interactive Behaviors
 * 
 * Features:
 * 1. Image gallery: thumbnail selection, main image swap, lightbox modal with arrow/touch/keyboard controls
 * 2. Variant chips: size & karat selection with visual feedback & label update
 * 3. Sticky tab navigation: scroll-spy + smooth scroll anchoring
 * 4. Mobile buy bar: show/hide when main buy box leaves/enters viewport
 * 5. Share functionality: Web Share API with clipboard fallback & toast feedback
 * 6. Wishlist toggle: instant visual feedback
 * 7. Related products carousel: Swiper integration
 */

(function () {
  'use strict';

  // ─── Toast Notification Helper ───
  function showToast(message, type = 'info') {
    let toast = document.getElementById('ts-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ts-toast';
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all duration-300 transform opacity-0 translate-y-2 pointer-events-none';
      document.body.appendChild(toast);
    }

    if (type === 'success') {
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all duration-300 transform bg-status-success text-white';
    } else {
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg transition-all duration-300 transform bg-primary-600 text-white';
    }

    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-y-2');
      toast.classList.add('opacity-100', 'translate-y-0');
    });

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-2');
    }, 2500);
  }

  // ─── Image Gallery & Lightbox ───
  function initGallery() {
    const images = [
      '../assets/images/products/tear-tennis-ring-1.jpg',
      '../assets/images/products/tear-tennis-ring-2.jpg',
      '../assets/images/products/tear-tennis-ring-3.jpg'
    ];
    let currentIndex = 0;

    const mainImgContainer = document.getElementById('galleryMainImage');
    const mainImg = document.getElementById('mainProductImage');
    const thumbs = document.querySelectorAll('.gallery-thumb');
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxDots = document.getElementById('lightboxDots');

    if (!mainImgContainer || !mainImg) return;

    // Build lightbox pagination dots
    if (lightboxDots) {
      lightboxDots.innerHTML = images.map((_, i) => 
        `<button class="w-2.5 h-2.5 rounded-full bg-white/40 transition-all lightbox-dot" data-index="${i}"></button>`
      ).join('');
    }

    function setActiveImage(idx) {
      if (idx < 0 || idx >= images.length) return;
      currentIndex = idx;
      mainImg.src = images[idx];
      
      thumbs.forEach((t, i) => {
        if (i === idx) {
          t.classList.add('border-primary-500', 'ring-2', 'ring-primary-500/20', 'gallery-thumb--active');
          t.classList.remove('border-border');
        } else {
          t.classList.remove('border-primary-500', 'ring-2', 'ring-primary-500/20', 'gallery-thumb--active');
          t.classList.add('border-border');
        }
      });
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(thumb.dataset.index, 10);
        setActiveImage(idx);
      });
    });

    // Lightbox Modal open
    mainImgContainer.addEventListener('click', (e) => {
      // Don't open if clicked on top action buttons (share/wishlist)
      if (e.target.closest('#btnWishlist') || e.target.closest('#btnShare')) return;
      openLightbox(currentIndex);
    });

    function openLightbox(idx) {
      if (!lightbox || !lightboxImg) return;
      currentIndex = idx;
      lightboxImg.src = images[idx];
      lightbox.classList.remove('hidden');
      lightbox.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      updateLightboxDots();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.add('hidden');
      lightbox.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }

    function updateLightboxDots() {
      if (!lightboxDots) return;
      const dots = lightboxDots.querySelectorAll('.lightbox-dot');
      dots.forEach((dot, i) => {
        if (i === currentIndex) {
          dot.classList.add('bg-gold-400', 'w-6');
          dot.classList.remove('bg-white/40', 'w-2.5');
        } else {
          dot.classList.remove('bg-gold-400', 'w-6');
          dot.classList.add('bg-white/40', 'w-2.5');
        }
      });
    }

    function navLightbox(direction) {
      currentIndex = (currentIndex + direction + images.length) % images.length;
      if (lightboxImg) lightboxImg.src = images[currentIndex];
      setActiveImage(currentIndex);
      updateLightboxDots();
    }

    lightboxClose?.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => navLightbox(-1));
    lightboxNext?.addEventListener('click', () => navLightbox(1));
    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    lightboxDots?.addEventListener('click', (e) => {
      const dot = e.target.closest('.lightbox-dot');
      if (dot) {
        const idx = parseInt(dot.dataset.index, 10);
        currentIndex = idx;
        if (lightboxImg) lightboxImg.src = images[idx];
        setActiveImage(idx);
        updateLightboxDots();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (lightbox && !lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') navLightbox(-1); // RTL right arrow = prev
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') navLightbox(1);  // RTL left arrow = next
      }
    });
  }

  // ─── Variant Selection (Karat & Size) ───
  function initVariants() {
    const sizeLabel = document.getElementById('selectedSize');

    document.querySelectorAll('.variant-chip:not([disabled])').forEach((chip) => {
      chip.addEventListener('click', () => {
        const group = chip.dataset.variant;
        document.querySelectorAll(`.variant-chip[data-variant="${group}"]`).forEach((c) => {
          c.classList.remove('variant-chip--active');
        });
        chip.classList.add('variant-chip--active');

        if (group === 'size' && sizeLabel) {
          sizeLabel.textContent = `سایز ${chip.dataset.value}`;
        }
      });
    });

    // Size guide button
    document.getElementById('sizeGuideBtn')?.addEventListener('click', () => {
      showToast('راهنمای اندازه‌گیری سایز انگشتر: قطر داخلی انگشتر خود را به میلی‌متر اندازه‌گیری کنید.');
    });
  }

  // ─── Sticky Tabs Navigation (Scroll Spy) ───
  function initStickyTabs() {
    const sections = ['description', 'specs', 'reviews', 'qa'];
    const tabs = document.querySelectorAll('.product-tab');
    if (!tabs.length) return;

    function updateActiveTab(id) {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === id;
        if (isActive) {
          tab.classList.add('product-tab--active', 'border-primary-500', 'text-primary-500');
          tab.classList.remove('border-transparent', 'text-content-muted');
        } else {
          tab.classList.remove('product-tab--active', 'border-primary-500', 'text-primary-500');
          tab.classList.add('border-transparent', 'text-content-muted');
        }
      });
    }

    // Scroll spy using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          updateActiveTab(entry.target.id);
        }
      });
    }, { rootMargin: '-165px 0px -40% 0px' });

    sections.forEach((id) => {
      const sectionEl = document.getElementById(id);
      if (sectionEl) observer.observe(sectionEl);
    });

    // Smooth scroll on tab click
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tab.dataset.tab;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const headerOffset = 165;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          updateActiveTab(targetId);
        }
      });
    });
  }

  // ─── Mobile Buy Bar Visibility Handler ───
  function initMobileBuyBar() {
    const mobileBuyBar = document.getElementById('mobileBuyBar');
    const productBuyBox = document.getElementById('productBuyBox');
    if (!mobileBuyBar || !productBuyBox) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Main buy box is visible -> hide mobile bottom bar
        mobileBuyBar.classList.add('translate-y-full');
        mobileBuyBar.classList.remove('translate-y-0');
      } else {
        // Main buy box scrolled off -> show mobile bottom bar
        mobileBuyBar.classList.remove('translate-y-full');
        mobileBuyBar.classList.add('translate-y-0');
      }
    }, { threshold: 0.1 });

    observer.observe(productBuyBox);
  }

  // ─── Share Button ───
  function initShare() {
    const btnShare = document.getElementById('btnShare');
    btnShare?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const shareData = {
        title: document.title,
        text: 'انگشتر تنیس اشک طلای ۱۸ عیار — گالری طلاشو',
        url: window.location.href,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(window.location.href);
          showToast('لینک محصول با موفقیت کپی شد', 'success');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          showToast('خطا در اشتراک‌گذاری محصول');
        }
      }
    });
  }

  // ─── Wishlist Toggle ───
  function initWishlist() {
    const btnWishlist = document.getElementById('btnWishlist');
    let isWishlisted = false;

    btnWishlist?.addEventListener('click', (e) => {
      e.stopPropagation();
      isWishlisted = !isWishlisted;

      const svgPath = btnWishlist.querySelector('path');
      if (isWishlisted) {
        btnWishlist.classList.add('text-status-error');
        btnWishlist.classList.remove('text-content-body');
        if (svgPath) svgPath.setAttribute('fill', 'currentColor');
        showToast('محصول به لیست علاقه‌مندی‌ها اضافه شد', 'success');
      } else {
        btnWishlist.classList.remove('text-status-error');
        btnWishlist.classList.add('text-content-body');
        if (svgPath) svgPath.setAttribute('fill', 'none');
        showToast('محصول از لیست علاقه‌مندی‌ها حذف شد');
      }
    });
  }

  // ─── Add to Cart Simulation ───
  function initAddToCart() {
    const desktopBtn = document.getElementById('btnAddToCart');
    const mobileBtn = document.getElementById('mobileBtnAddToCart');

    function handleAddToCart(btn) {
      if (!btn) return;
      const originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>در حال افزودن...</span>
      `;

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>به سبد اضافه شد</span>
        `;
        btn.classList.remove('bg-primary-500', 'hover:bg-primary-600');
        btn.classList.add('bg-status-success');

        showToast('انگشتر تنیس اشک به سبد خرید شما اضافه شد', 'success');

        // Update header cart count badge if exists
        const cartBadge = document.querySelector('.cart-count-badge');
        if (cartBadge) {
          const current = parseInt(cartBadge.textContent || '0', 10);
          cartBadge.textContent = String(current + 1);
        }

        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.classList.remove('bg-status-success');
          btn.classList.add('bg-primary-500', 'hover:bg-primary-600');
        }, 3000);
      }, 700);
    }

    desktopBtn?.addEventListener('click', () => handleAddToCart(desktopBtn));
    mobileBtn?.addEventListener('click', () => handleAddToCart(mobileBtn));
  }

  // ─── Related Products Carousel ───
  function initRelatedSwiper() {
    if (typeof Swiper !== 'undefined' && document.querySelector('.related-products-swiper')) {
      new Swiper('.related-products-swiper', {
        slidesPerView: 'auto',
        spaceBetween: 16,
        dir: 'rtl',
        navigation: {
          nextEl: '.related-swiper-next',
          prevEl: '.related-swiper-prev',
        }
      });
    }
  }

  // ─── DOM Ready Entry ───
  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(() => {
    initGallery();
    initVariants();
    initStickyTabs();
    initMobileBuyBar();
    initShare();
    initWishlist();
    initAddToCart();
    initRelatedSwiper();
  });

})();
