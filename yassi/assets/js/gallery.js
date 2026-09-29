/* ==========================================================================
   Yasi Show - Step 3: Lightbox Gallery + Chart Modal
   --------------------------------------------------------------------------
   Front-end-only interactions. The backend team can replace the sample
   gallery data with real data by re-calling YasiGallery.init() with a new
   items array.
   ========================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------------
       Gallery data: each item has { type, src, title, date, desc }.
       type: "image" | "video"
       For video, `src` should be an <mp4> URL; the lightbox renders a
       <video controls> element for it.
       ------------------------------------------------------------------ */
    var GALLERY_DATA = [
        { type: 'image', src: 'assets/images/people/man-1.jpg',  title: 'یادبود علی احمدی',     date: '۱۴۰۱/۰۵/۱۶', desc: 'عکس خانوادگی در مراسم یادبود سالگرد درگذشت.' },
        { type: 'video', src: 'assets/images/people/woman-1.jpg',  title: 'ویدئو مریم رضایی',     date: '۱۴۰۱/۰۵/۱۶', desc: ' Clips کوتاه از دوران جوانی مرحومه.' },
        { type: 'image', src: 'assets/images/people/man-2.jpg',  title: 'یادبود حسین فولادی',   date: '۱۴۰۱/۰۵/۱۷', desc: 'تصویر یادگاری در کنار دوستان.' },
        { type: 'image', src: 'assets/images/people/woman-2.jpg',  title: 'یادبود زهرا کریمی',    date: '۱۴۰۱/۰۵/۱۸', desc: 'عکس ساعت خوش کودکی.' },
        { type: 'image', src: 'assets/images/people/man-3.jpg',  title: 'یادبود محمود نوری',    date: '۱۴۰۱/۰۵/۲۰', desc: 'تصویری از محل کار ایشان.' },
        { type: 'image', src: 'assets/images/people/woman-3.jpg',  title: 'یادبود فاطمه عباسی',   date: '۱۴۰۱/۰۵/۲۲', desc: 'عکس یادگاری با نوه‌ها.' },
        { type: 'video', src: 'assets/images/people/man-4.jpg',  title: 'ویدئو کریم دادخواه',   date: '۱۴۰۱/۰۵/۲۵', desc: 'گفتگوی کوتاه با دوستان در مراسم.' },
        { type: 'image', src: 'assets/images/people/woman-4.jpg',  title: 'یادبود سارا موسوی',    date: '۱۴۰۱/۰۵/۲۷', desc: 'عکس طبیعت‌گردی آخرین بهار.' },
        { type: 'image', src: 'assets/images/people/man-5.jpg', title: 'یادبود رضا هاشمی',     date: '۱۴۰۱/۰۵/۲۹', desc: 'یادگاری از مراسم عروسی فرزند ایشان.' },
        { type: 'image', src: 'assets/images/people/woman-5.jpg', title: 'یادبود نرگس صادقی',    date: '۱۴۰۱/۰۶/۰۱', desc: 'تصویر خانوادگی در عید نوروز.' },
        { type: 'image', src: 'assets/images/people/man-6.jpg', title: 'یادبود امیر تهرانی',   date: '۱۴۰۱/۰۶/۰۳', desc: 'عکس آخرین سفر یادگاری.' },
        { type: 'image', src: 'assets/images/people/woman-6.jpg', title: 'یادبود هما جعفری',     date: '۱۴۰۱/۰۶/۰۵', desc: 'یادگاری از دوران جوانی.' }
    ];

    var currentIndex = 0;
    var root = null;

    /* ------------------------------------------------------------------
       Build the lightbox DOM once (lazily) and cache it.
       ------------------------------------------------------------------ */
    function ensureLightbox() {
        if (root) return root;
        root = document.createElement('div');
        root.id = 'ys-lightbox';
        root.className = 'fixed inset-0 z-[200] hidden items-center justify-center p-4';
        root.innerHTML =
            '<!-- Close -->' +
            '<button type="button" class="absolute top-4 end-4 w-11 h-11 rounded-full ys-lightbox-nav-btn text-white flex items-center justify-center z-50" data-ys-lb="close" aria-label="بستن">' +
              '<i class="fa-solid fa-xmark text-lg"></i>' +
            '</button>' +
            '<!-- Prev -->' +
            '<button type="button" class="absolute top-1/2 -translate-y-1/2 start-4 w-12 h-12 rounded-full ys-lightbox-nav-btn text-white flex items-center justify-center z-50" data-ys-lb="prev" aria-label="قبلی">' +
              '<i class="fa-solid fa-chevron-right text-lg"></i>' +
            '</button>' +
            '<!-- Next -->' +
            '<button type="button" class="absolute top-1/2 -translate-y-1/2 end-4 w-12 h-12 rounded-full ys-lightbox-nav-btn text-white flex items-center justify-center z-50" data-ys-lb="next" aria-label="بعدی">' +
              '<i class="fa-solid fa-chevron-left text-lg"></i>' +
            '</button>' +
            '<!-- Main content: image + info card -->' +
            '<div class="w-full max-w-5xl flex flex-col items-center z-40">' +
              '<!-- Image/video stage with rounded frame -->' +
              '<div class="w-full flex items-center justify-center min-h-[35vh] max-h-[60vh]">' +
                '<div id="ys-lightbox-stage" class="max-w-full max-h-[60vh] rounded-2xl overflow-hidden shadow-2xl"></div>' +
              '</div>' +
              '<!-- Info card -->' +
              '<div class="mt-4 bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 max-w-2xl w-full border border-white/10">' +
                '<div class="flex items-center justify-between mb-2">' +
                  '<h4 id="ys-lightbox-title" class="text-lg font-black text-white"></h4>' +
                  '<span id="ys-lightbox-date" class="text-[12px] text-white/50 font-bold" dir="ltr"></span>' +
                '</div>' +
                '<p id="ys-lightbox-desc" class="text-[13px] text-white/70 leading-relaxed"></p>' +
              '</div>' +
              '<!-- Thumbnail strip for quick navigation -->' +
              '<div class="mt-4 flex gap-2 max-w-2xl overflow-x-auto pb-2" id="ys-lightbox-thumbs"></div>' +
            '</div>' +
            '<!-- Counter -->' +
            '<div class="absolute bottom-4 start-4 text-white/70 text-xs font-bold bg-black/40 px-3 py-1.5 rounded-full" id="ys-lightbox-counter"></div>';
        document.body.appendChild(root);

        // Event delegation for the lightbox controls
        root.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-ys-lb]');
            if (!btn) {
                // Click on backdrop (not on the stage content) closes
                if (e.target === root) closeLightbox();
                return;
            }
            var action = btn.getAttribute('data-ys-lb');
            if (action === 'close') closeLightbox();
            else if (action === 'prev') showItem(currentIndex - 1);
            else if (action === 'next') showItem(currentIndex + 1);
        });

        // Keyboard navigation
        document.addEventListener('keydown', function (e) {
            if (root.classList.contains('hidden')) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') showItem(currentIndex + 1); // RTL: left = next
            else if (e.key === 'ArrowRight') showItem(currentIndex - 1); // RTL: right = prev
        });

        return root;
    }

    function renderStage(item) {
        var stage = root.querySelector('#ys-lightbox-stage');
        if (item.type === 'video') {
            // Video: use a <video> element. The backend team should swap the
            // sample image src with a real .mp4 URL.
            stage.innerHTML =
                '<video class="ys-lightbox-stage rounded-2xl shadow-2xl" controls autoplay ' +
                'poster="' + item.src + '">' +
                '<source src="' + item.src + '" type="video/mp4">' +
                'مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.' +
                '</video>';
        } else {
            stage.innerHTML =
                '<img src="' + item.src + '" alt="' + escapeHtml(item.title) + '" ' +
                'class="ys-lightbox-stage rounded-2xl shadow-2xl">';
        }
    }

    function renderMeta(item, idx) {
        root.querySelector('#ys-lightbox-title').textContent = item.title;
        root.querySelector('#ys-lightbox-date').textContent = item.date;
        root.querySelector('#ys-lightbox-desc').textContent = item.desc;
        root.querySelector('#ys-lightbox-counter').textContent =
            (idx + 1) + ' / ' + GALLERY_DATA.length;
        renderThumbs(idx);
    }

    function renderThumbs(activeIdx) {
        var container = root.querySelector('#ys-lightbox-thumbs');
        if (!container) return;
        container.innerHTML = '';
        GALLERY_DATA.forEach(function(item, i) {
            var thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'ys-lightbox-thumb shrink-0' + (i === activeIdx ? ' active' : '');
            thumb.style.width = '48px';
            thumb.style.height = '48px';
            thumb.style.backgroundImage = 'url("' + item.src + '")';
            thumb.style.backgroundSize = 'cover';
            thumb.style.backgroundPosition = 'center';
            thumb.setAttribute('aria-label', item.title);
            thumb.addEventListener('click', function(e) {
                e.stopPropagation();
                showItem(i);
            });
            container.appendChild(thumb);
        });
        // Scroll active thumb into view
        var active = container.children[activeIdx];
        if (active) {
            active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    }

    function showItem(idx) {
        if (GALLERY_DATA.length === 0) return;
        // Wrap around
        currentIndex = (idx + GALLERY_DATA.length) % GALLERY_DATA.length;
        var item = GALLERY_DATA[currentIndex];
        renderStage(item);
        renderMeta(item, currentIndex);
    }

    function openLightbox(startIdx) {
        ensureLightbox();
        root.classList.remove('hidden');
        root.classList.add('flex');
        document.body.classList.add('overflow-hidden');
        showItem(startIdx || 0);
    }

    function closeLightbox() {
        if (!root) return;
        // Pause any playing video
        var v = root.querySelector('video');
        if (v) v.pause();
        root.classList.add('hidden');
        root.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    /* ------------------------------------------------------------------
       Public API
       ------------------------------------------------------------------ */
    window.YasiGallery = {
        init: function (items) {
            if (items && items.length) GALLERY_DATA = items;
            ensureLightbox();
        },
        open: openLightbox,
        close: closeLightbox,
        next: function () { showItem(currentIndex + 1); },
        prev: function () { showItem(currentIndex - 1); }
    };

    /* ------------------------------------------------------------------
       Chart modal (empty UI for backend to inject the chart later).
       ------------------------------------------------------------------ */
    window.YasiChart = {
        open: function () {
            var m = document.getElementById('ys-chart-modal');
            if (!m) return;
            m.classList.remove('hidden');
            m.classList.add('flex');
            document.body.classList.add('overflow-hidden');
        },
        close: function () {
            var m = document.getElementById('ys-chart-modal');
            if (!m) return;
            m.classList.add('hidden');
            m.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
        }
    };

    // Close chart modal on backdrop click
    document.addEventListener('DOMContentLoaded', function () {
        var m = document.getElementById('ys-chart-modal');
        if (m) {
            m.addEventListener('click', function (e) {
                if (e.target === m) window.YasiChart.close();
            });
        }
        // Close gallery modal (the "View All" grid) on backdrop click
        var gm = document.getElementById('gallery-modal');
        if (gm) {
            gm.addEventListener('click', function (e) {
                if (e.target === gm) {
                    gm.classList.add('hidden');
                    gm.classList.remove('flex');
                }
            });
        }
    });
})();

    /* ------------------------------------------------------------------
       Gallery modal pagination (for "مشاهده همه" modal with many items)
       ------------------------------------------------------------------ */
    window.YasiGalleryPaged = {
        currentPage: 1,
        perPage: 8,

        init: function(gridId, items) {
            this.grid = document.getElementById(gridId);
            this.items = items || [];
            this.totalPages = Math.ceil(this.items.length / this.perPage);
            this.currentPage = 1;
            this.render();
        },

        render: function() {
            if (!this.grid) return;
            var start = (this.currentPage - 1) * this.perPage;
            var end = Math.min(start + this.perPage, this.items.length);
            var html = '';
            for (var i = start; i < end; i++) {
                var item = this.items[i];
                var idx = i;
                html += '<div class="flex flex-col gap-2 cursor-pointer" onclick="YasiGallery.open(' + idx + ')">';
                html += '<div class="aspect-square rounded-2xl overflow-hidden shadow-sm relative group border border-slate-200 bg-black">';
                if (item.type === 'video') {
                    html += '<div class="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">';
                    html += '<i class="fa-solid fa-play text-white text-3xl opacity-90 group-hover:scale-110 transition-transform"></i>';
                    html += '</div>';
                }
                html += '<img src="' + item.src + '" alt="' + (item.title || '') + '" class="w-full h-full object-cover group-hover:opacity-90 transition-opacity">';
                html += '</div>';
                html += '<div class="text-xs text-slate-600 flex justify-between px-1">';
                html += '<span class="font-bold truncate">' + (item.title || '') + '</span>';
                html += '<span class="text-slate-400 shrink-0" dir="ltr">' + (item.date || '') + '</span>';
                html += '</div>';
                html += '</div>';
            }
            this.grid.innerHTML = html;
            this.renderPagination();
        },

        renderPagination: function() {
            var existing = document.getElementById('ys-gallery-pagination');
            if (existing) existing.remove();
            if (this.totalPages <= 1) return;

            var pager = document.createElement('div');
            pager.id = 'ys-gallery-pagination';
            pager.className = 'flex items-center justify-center gap-2 mt-6';
            var self = this;
            function btn(label, page, active, disabled) {
                var b = document.createElement('button');
                b.className = 'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ' +
                    (active ? 'bg-brand-purple-dark text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50');
                if (disabled) { b.disabled = true; b.classList.add('opacity-40', 'cursor-not-allowed'); }
                b.textContent = label;
                b.onclick = function() { self.goTo(page); };
                return b;
            }
            pager.appendChild(btn('‹', self.currentPage - 1, false, self.currentPage === 1));
            for (var p = 1; p <= self.totalPages; p++) {
                pager.appendChild(btn(self.toPersian(p), p, p === self.currentPage, false));
            }
            pager.appendChild(btn('›', self.currentPage + 1, false, self.currentPage === self.totalPages));
            this.grid.parentElement.appendChild(pager);
        },

        toPersian: function(n) {
            var d = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
            return String(n).replace(/\d/g, function(x) { return d[x]; });
        },

        goTo: function(page) {
            if (page < 1 || page > this.totalPages) return;
            this.currentPage = page;
            this.render();
            this.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
