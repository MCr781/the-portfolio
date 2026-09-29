/**
 * OrdiBehesht Gold - Final JavaScript
 * Pure UI/UX: Seamless Header, Modals, Sliders, Zoom.
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --- 1. Header & Navigation ---
  const initNavigation = () => {
    const body = document.body;
    const header = document.querySelector('.site-header');
    const burgerBtn = document.querySelector('.burger-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileCloseBtn = document.querySelector('.mobile-close');
    const isInternalPage = body.classList.contains('internal-page');

    // A. Header State (Scroll/Hover)
    if (header) {
      const updateHeaderState = () => {
        // If internal page, ALWAYS active.
        if (isInternalPage) {
          header.classList.add('scrolled');
          return;
        }

        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const isHovered = header.matches(':hover');
        const isMenuOpen = document.querySelector('.nav-item.menu-is-open');

        // Active if: Scrolled OR Hovered OR Menu is Open
        if (scrollY >= 50 || isHovered || isMenuOpen) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      };

      window.addEventListener('scroll', updateHeaderState, { passive: true });
      header.addEventListener('mouseenter', updateHeaderState);
      header.addEventListener('mouseleave', updateHeaderState);

      // Init
      updateHeaderState();
    }

    // B. Mobile Drawer
    if (burgerBtn && mobileNav) {
      const toggleMenu = (isOpen) => {
        body.classList.toggle('mobile-nav-active', isOpen);
        burgerBtn.setAttribute('aria-expanded', isOpen);
        mobileNav.setAttribute('aria-hidden', !isOpen);
      };

      burgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !body.classList.contains('mobile-nav-active');
        toggleMenu(willOpen);
      });

      if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', () => toggleMenu(false));
      }

      document.addEventListener('click', (e) => {
        if (body.classList.contains('mobile-nav-active') &&
          !mobileNav.contains(e.target) &&
          !burgerBtn.contains(e.target)) {
          toggleMenu(false);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleMenu(false);
      });
    }

    // C. Mobile Accordion
    const mobileDetails = document.querySelectorAll('.mobile-nav details');
    if (mobileDetails.length) {
      mobileDetails.forEach(targetDetail => {
        const summary = targetDetail.querySelector('summary');
        const content = targetDetail.querySelector('.mobile-submenu__wrapper');

        summary.addEventListener('click', (e) => {
          // Check if the click was targeted at or inside the chevron icon
          const isChevron = e.target.closest('i');

          if (!isChevron) {
            // Clicked text or background: Navigate directly to the collection page
            e.preventDefault();
            const titleText = summary.querySelector('span')?.textContent.trim();
            const desktopLink = Array.from(document.querySelectorAll('.desktop-nav .nav-link'))
              .find(link => link.textContent.trim() === titleText);

            if (desktopLink && desktopLink.href) {
              window.location.href = desktopLink.href;
            }
            return;
          }

          // If chevron was clicked, handle the smooth accordion accordion logic
          e.preventDefault();

          // Close siblings
          mobileDetails.forEach(other => {
            if (other !== targetDetail && other.hasAttribute('open')) {
              const otherContent = other.querySelector('.mobile-submenu__wrapper');
              otherContent.style.height = '0px';
              otherContent.style.opacity = '0';
              setTimeout(() => other.removeAttribute('open'), 300);
            }
          });

          // Toggle current
          if (targetDetail.hasAttribute('open')) {
            content.style.height = '0px';
            content.style.opacity = '0';
            setTimeout(() => targetDetail.removeAttribute('open'), 300);
          } else {
            targetDetail.setAttribute('open', '');
            requestAnimationFrame(() => {
              content.style.height = content.scrollHeight + 'px';
              content.style.opacity = '1';
            });
          }
        });
      });
    }

    // D. Desktop Mega Menu (Seamless & Sticky)
    const megaMenuItems = document.querySelectorAll('.nav-item.has-megamenu');

    if (megaMenuItems.length && header) {
      // 1. Open on Hover
      megaMenuItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
          // Seamless switch: Close others immediately
          megaMenuItems.forEach(other => {
            if (other !== item) other.classList.remove('menu-is-open');
          });

          item.classList.add('menu-is-open');
          header.classList.add('menu-is-open');
        });
      });

      // 2. Close ONLY when leaving the entire Header
      header.addEventListener('mouseleave', () => {
        megaMenuItems.forEach(item => item.classList.remove('menu-is-open'));
        header.classList.remove('menu-is-open');
        // Re-check scroll state to see if we should stay white or go transparent
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        if (scrollY < 50 && !isInternalPage) {
          header.classList.remove('scrolled');
        }
      });
    }
  };

  // --- 2. Live Gold Price Widget ---
  const initGoldWidget = () => {
    const widget = document.getElementById('live-gold-price-desktop');
    if (!widget) return;
    let lastScrollY = window.scrollY;
    const toggleWidget = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        widget.classList.add('is-hidden');
      } else {
        widget.classList.remove('is-hidden');
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', toggleWidget, { passive: true });
  };

  // --- 3. Modals System ---
  const initModals = () => {
    const closeButtons = document.querySelectorAll('.modal-close, .close-cart-button, .search-close');
    const overlays = document.querySelectorAll('.modal-overlay');

    const openModal = (modalId) => {
      overlays.forEach(el => {
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.setAttribute('aria-hidden', 'true');
      });
      document.body.classList.remove('modal-is-active');

      const modal = document.getElementById(modalId);
      if (!modal) return;

      document.body.classList.add('modal-is-active');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');

      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        const content = modal.querySelector('.modal-content, .search-overlay__content');
        if (content) {
          content.style.transform = 'translateY(0) scale(1)';
          content.style.opacity = '1';
        }
      });
    };

    const closeModal = () => {
      document.body.classList.remove('modal-is-active');
      overlays.forEach(overlay => {
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.setAttribute('aria-hidden', 'true');
        const content = overlay.querySelector('.modal-content, .search-overlay__content');
        if (content) {
          content.style.transform = '';
          content.style.opacity = '';
        }
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
      });
    };

    document.addEventListener('click', (e) => {
      const target = e.target.closest('.icon-btn, .button, .nav-link');
      if (!target) return;

      if (target.classList.contains('user-btn')) {
        e.preventDefault(); openModal('loginModal');
      } else if (target.classList.contains('cart-btn')) {
        e.preventDefault(); openModal('cartModal');
      } else if (target.classList.contains('search-toggle')) {
        e.preventDefault(); openModal('searchOverlay');
      } else if (target.classList.contains('calc-btn')) {
        // --- NEW LINE TO OPEN CALCULATOR MODAL ---
        e.preventDefault(); openModal('calcModal');
      }
    });

    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
    overlays.forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  };

  // --- 4. Swiper Sliders ---
  const initSliders = () => {
    if (typeof Swiper === 'undefined') return;

    document.querySelectorAll('.collection__container.swiper, .related-products .swiper').forEach(slider => {
      new Swiper(slider, {
        dir: 'rtl',
        loop: true,
        spaceBetween: 15,
        slidesPerView: 1.4,
        centeredSlides: false,
        grabCursor: true,
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        },
        navigation: {
          nextEl: slider.parentElement.querySelector('.swiper-button-next'),
          prevEl: slider.parentElement.querySelector('.swiper-button-prev'),
        },
        breakpoints: {
          480: { slidesPerView: 2.2, spaceBetween: 20 },
          768: { slidesPerView: 3, spaceBetween: 24 },
          1024: { slidesPerView: 4, spaceBetween: 30 }
        }
      });
    });

    const testimonialEl = document.querySelector('.testimonials__slider');
    if (testimonialEl) {
      new Swiper(testimonialEl, {
        dir: 'rtl',
        loop: true,
        spaceBetween: 30,
        slidesPerView: 1,
        grabCursor: true,
        pagination: { el: '.testimonial-pagination', clickable: true },
        autoplay: { delay: 5000, disableOnInteraction: true },
        breakpoints: {
          768: { slidesPerView: 2 },
          992: { slidesPerView: 3 }
        }
      });
    }
  };

  // --- 5. Product Cards ---
  const initProductCards = () => {
    document.querySelectorAll('.product-card').forEach(card => {
      const img = card.querySelector('.product-card__image');
      if (!img) return;

      const originalSrc = img.getAttribute('src');
      const altSrc = img.getAttribute('data-alt-src');

      if (altSrc) {
        card.addEventListener('mouseenter', () => {
          if (!img.dataset.colorActive) {
            img.style.opacity = '0';
            setTimeout(() => { img.src = altSrc; img.style.opacity = '1'; }, 150);
          }
        });
        card.addEventListener('mouseleave', () => {
          if (!img.dataset.colorActive) {
            img.style.opacity = '0';
            setTimeout(() => { img.src = originalSrc; img.style.opacity = '1'; }, 150);
          }
        });
      }

      card.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const newSrc = dot.getAttribute('data-original-src') || dot.getAttribute('data-color-src');
          if (newSrc) {
            img.style.opacity = '0';
            setTimeout(() => {
              img.src = newSrc;
              img.style.opacity = '1';
              img.dataset.colorActive = 'true';
            }, 150);
          }
        });
      });
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.action-btn');
      if (!btn) return;
      const icon = btn.querySelector('.bx-heart');
      if (icon) {
        e.preventDefault();
        icon.classList.toggle('bxs-heart');
        icon.classList.toggle('bx-heart');
        icon.classList.add('is-animating');
        setTimeout(() => icon.classList.remove('is-animating'), 600);
        icon.style.color = icon.classList.contains('bxs-heart') ? '#d32f2f' : '';
      }
    });
  };

  // --- 6. Product Detail Page (PDP) ---
  const initPDP = () => {
    const galleryMain = document.querySelector('.pdp-gallery__main-image');
    const galleryImg = document.querySelector('.pdp-gallery__main-image img');
    const thumbnails = document.querySelectorAll('.pdp-thumbnail');
    const qtyInput = document.getElementById('quantity');

    // Gallery Swap
    if (galleryImg && thumbnails.length) {
      thumbnails.forEach(thumb => {
        thumb.addEventListener('click', function () {
          thumbnails.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          const thumbImage = this.querySelector('img');
          const newSrc = thumbImage?.getAttribute('data-full-src') || thumbImage?.getAttribute('src');
          if (newSrc) galleryImg.src = newSrc;
        });
      });

      const activeThumb = document.querySelector('.pdp-thumbnail.active') || thumbnails[0];
      const activeThumbImage = activeThumb?.querySelector('img');
      if (activeThumbImage) {
        const firstSrc = activeThumbImage.getAttribute('data-full-src') || activeThumbImage.getAttribute('src');
        if (firstSrc) galleryImg.src = firstSrc;
      }
    }

    // Magnifying Zoom
    if (galleryMain && galleryImg) {
      galleryMain.addEventListener('mousemove', (e) => {
        const rect = galleryMain.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        galleryMain.classList.add('is-zooming');
        galleryImg.style.transformOrigin = `${x}% ${y}%`;
        galleryImg.style.transform = 'scale(1.8)';
      });
      galleryMain.addEventListener('mouseleave', () => {
        galleryMain.classList.remove('is-zooming');
        galleryImg.style.transform = 'scale(1)';
        setTimeout(() => { galleryImg.style.transformOrigin = 'center center'; }, 300);
      });
    }

    // Quantity
    if (qtyInput) {
      document.getElementById('quantity-plus')?.addEventListener('click', () => qtyInput.value++);
      document.getElementById('quantity-minus')?.addEventListener('click', () => {
        if (qtyInput.value > 1) qtyInput.value--;
      });
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.pdp-tab-btn');
    if (tabBtns.length) {
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.pdp-tab-panel').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          document.getElementById(btn.getAttribute('data-tab'))?.classList.add('active');
        });
      });
    }
  };

  // --- 7. Map Activation ---
  const initMap = () => {
    const mapSection = document.querySelector('.contact-map');
    if (mapSection) {
      mapSection.addEventListener('click', function () { this.classList.add('active'); });
      mapSection.addEventListener('mouseleave', function () { this.classList.remove('active'); });
    }
  };

  // --- 8. Filters ---
  const initFilters = () => {
    const filterToggle = document.querySelector('.mobile-filter-toggle');
    const sidebar = document.querySelector('.filters-sidebar');
    const closeFilter = document.querySelector('.close-filters');

    if (filterToggle && sidebar) {
      const toggleSidebar = (show) => {
        sidebar.classList.toggle('active', show);
        document.body.classList.toggle('filter-is-active', show);
      };
      filterToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleSidebar(true); });
      if (closeFilter) closeFilter.addEventListener('click', () => toggleSidebar(false));
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !filterToggle.contains(e.target)) {
          toggleSidebar(false);
        }
      });
    }
    document.querySelectorAll('.filter-group__title').forEach(title => {
      title.addEventListener('click', () => title.parentElement.classList.toggle('collapsed'));
    });
  };

  // --- 9. Visual Forms ---
  const initForms = () => {
    document.querySelectorAll('.submit-btn, .form-buttons .button').forEach(btn => {
      btn.addEventListener('click', function () {
        this.classList.add('clicked');
        setTimeout(() => this.classList.remove('clicked'), 200);
      });
    });
  };

  // Init
  initNavigation();
  initGoldWidget();
  initModals();
  initSliders();
  initProductCards();
  initPDP();
  initMap();
  initFilters();
  initForms();

  // --- 10. Event Countdown Timer ---
  const initTimer = () => {
    const timerEl = document.getElementById('event-timer');
    if (!timerEl) return;

    const deadline = timerEl.getAttribute('data-deadline');
    const endTime = new Date(deadline).getTime();

    // DOM Elements
    const elDays = document.getElementById('timer-days');
    const elHours = document.getElementById('timer-hours');
    const elMinutes = document.getElementById('timer-minutes');
    const elSeconds = document.getElementById('timer-seconds');

    // Circle Elements (for progress animation)
    const circles = timerEl.querySelectorAll('.timer-circle-progress');
    // Circumference = 2 * PI * r (r=45) ≈ 283
    const circumference = 283;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = endTime - now;

      if (distance < 0) {
        // Timer Expired Logic
        timerEl.innerHTML = '<div style="font-size:1.5rem; color:var(--brand-gold); font-weight:bold;">رویداد به پایان رسید</div>';
        clearInterval(timerInterval);
        return;
      }

      // Calculations
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // Update Text
      // Helper to pad numbers (e.g. 5 -> 05)
      const pad = (n) => n < 10 ? '0' + n : n;

      elDays.innerText = pad(days);
      elHours.innerText = pad(hours);
      elMinutes.innerText = pad(minutes);
      elSeconds.innerText = pad(seconds);

      // Update Circular Progress (Optional visual flair)
      // Days (Assume max 30 days for visual scale)
      setProgress(circles[0], days, 30);
      // Hours (Max 24)
      setProgress(circles[1], hours, 24);
      // Minutes (Max 60)
      setProgress(circles[2], minutes, 60);
      // Seconds (Max 60)
      setProgress(circles[3], seconds, 60);
    };

    const setProgress = (circle, value, max) => {
      const offset = circumference - (value / max) * circumference;
      circle.style.strokeDashoffset = offset;
    };

    // Run immediately then every second
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
  };

  // Call the function
  initTimer();

  // --- 11. Reading Progress Bar ---
  const initProgressBar = () => {
    const progressBar = document.getElementById('reading-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (scrollTop / scrollHeight) * 100;
      progressBar.style.width = scrolled + '%';
    }, { passive: true });
  };

  // Call the function
  initProgressBar();

  // --- 12. FAQ Accordion Animation ---
  const initFAQ = () => {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
      const questionBtn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');

        // Optional: Close all other open FAQs
        faqItems.forEach(otherItem => {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-answer').style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('active');
          // Set max-height to the scrollHeight for a smooth slide down
          answer.style.maxHeight = answer.scrollHeight + "px";
        }
      });
    });
  };

  initFAQ();
});

/* ==================== 2.0 PROFILE PAGE TABS ==================== */
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.sidebar-menu .menu-btn[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (tabButtons.length > 0) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Only prevent default if it's a real button, not a link
        if (btn.tagName !== 'A') e.preventDefault();

        const targetTab = btn.getAttribute('data-tab');

        // 1. Update Buttons
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Update Panels
        tabPanels.forEach(panel => {
          if (panel.id === targetTab) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });

        // 3. Optional: Scroll to top of content on mobile
        if (window.innerWidth < 992) {
          const contentArea = document.querySelector('.profile-content');
          if (contentArea) {
            window.scrollTo({
              top: contentArea.offsetTop - 100,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }
});
