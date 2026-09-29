// =======================
// Toast Helper (نسخه مستقل از CSS)
// =======================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast-root");

    // اگر اصلاً div نداشتیم، حداقل alert بده که یتیم نمونه
    if (!toast) {
        alert(message);
        return;
    }

    // پایه‌ی استایل (inline) – مستقل از هر CSS دیگه
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.maxWidth = "320px";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "0.9rem";
    toast.style.color = "#fff";
    toast.style.zIndex = "999999";
    toast.style.pointerEvents = "none";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    toast.style.transition = "all 0.3s ease";

    // رنگ بر اساس نوع
    if (type === "error") {
        toast.style.background = "linear-gradient(135deg, #e65151, #c62828)";
    } else {
        toast.style.background = "linear-gradient(135deg, #32b37b, #1e8f56)";
    }

    // متن
    toast.textContent = message;

    // اول مخفی، بعد با animation بیاد بالا
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.display = "block";

    requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    });

    // بعد از ۳.۵ ثانیه بره پایین
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
        setTimeout(() => {
            toast.style.display = "none";
        }, 300);
    }, 3500);
}


// =======================
// OTP Modal Helpers
// =======================
function openOtpModal() {
    // همه‌ی مودال‌ها را ببند
    var allOverlays = document.querySelectorAll('.modal-overlay');
    allOverlays.forEach(function (ov) {
        ov.style.display = 'none';
        ov.style.opacity = '0';
        ov.style.visibility = 'hidden';
        ov.setAttribute('aria-hidden', 'true');
    });

    var overlay = document.getElementById('otpModal');
    if (!overlay) return;

    document.body.classList.add('modal-is-active');

    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    overlay.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(function () {
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        var content = overlay.querySelector('.modal-content, .search-overlay__content');
        if (content) {
            content.style.transform = 'translateY(0) scale(1)';
            content.style.opacity = '1';
        }
    });
}

function closeOtpModal() {
    var overlay = document.getElementById('otpModal');
    if (!overlay) return;

    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-is-active');

    var content = overlay.querySelector('.modal-content, .search-overlay__content');
    if (content) {
        content.style.transform = '';
        content.style.opacity = '';
    }

    setTimeout(function () {
        overlay.style.display = 'none';
    }, 300);
}

// بستن با ضربدر یا کلیک روی پس‌زمینه‌ی خود مودال
document.addEventListener('click', function (e) {
    // اگر روی دکمه ضربدر یا بچه‌هایش کلیک شد
    var closeBtn = e.target.closest('#closeOtpModal');
    if (closeBtn) {
        e.preventDefault();
        closeOtpModal();
        return;
    }

    // کلیک روی پس‌زمینه‌ی خود مودال
    var overlay = document.getElementById('otpModal');
    if (overlay && e.target === overlay) {
        e.preventDefault();
        closeOtpModal();
    }
});

// =======================
// OTP Timer (Resend)
// =======================
var otpTimerInterval = null;

function startOtpTimer(seconds) {
    var resendLink = document.getElementById('otp-resend-link');
    var timerSpan = document.getElementById('otp-timer');
    if (!resendLink || !timerSpan) return;

    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }

    resendLink.classList.add('disabled');
    resendLink.style.pointerEvents = 'none';
    resendLink.style.opacity = '0.5';

    var remaining = seconds;
    timerSpan.textContent = '(' + remaining + ' ثانیه تا ارسال مجدد)';

    otpTimerInterval = setInterval(function () {
        remaining--;
        if (remaining <= 0) {
            clearInterval(otpTimerInterval);
            otpTimerInterval = null;
            timerSpan.textContent = '';
            resendLink.classList.remove('disabled');
            resendLink.style.pointerEvents = 'auto';
            resendLink.style.opacity = '1';
        } else {
            timerSpan.textContent = '(' + remaining + ' ثانیه تا ارسال مجدد)';
        }
    }, 1000);
}

// =======================
// عدد نرمال (فارسی/عربی/انگلیسی → انگلیسی)
// =======================
function normalizeNumeric(value) {
    if (!value) return "";

    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    let result = "";

    for (let ch of value) {
        const pIndex = persianDigits.indexOf(ch);
        if (pIndex !== -1) {
            result += pIndex.toString();
            continue;
        }

        const aIndex = arabicDigits.indexOf(ch);
        if (aIndex !== -1) {
            result += aIndex.toString();
            continue;
        }

        if (ch >= "0" && ch <= "9") {
            result += ch;
            continue;
        }
        // بقیه کاراکترها نادیده گرفته می‌شوند
    }

    return result;
}

// =======================
// فرمت مبلغ سه‌رقمی + نمایش "تومان" با ارقام فارسی و کامای انگلیسی
// =======================
(function () {
    var priceInput = document.getElementById("predict-price");
    var priceDisplay = document.getElementById("price-formatted-display");

    if (!priceInput) return;

    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

    function toPersianNumber(enStr) {
        let res = "";
        for (let ch of enStr) {
            if (ch >= "0" && ch <= "9") {
                res += persianDigits[ch.charCodeAt(0) - 48]; // '0' = 48
            } else {
                // کاما و بقیه کاراکترها همان بمانند
                res += ch;
            }
        }
        return res;
    }

    function formatWithComma(enStr) {
        // سه‌رقمی با کامای انگلیسی
        return enStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    priceInput.addEventListener("input", function () {
        var raw = normalizeNumeric(this.value); // فارسی/انگلیسی → انگلیسی

        if (!raw) {
            this.value = "";
            if (priceDisplay) priceDisplay.textContent = "";
            return;
        }

        var withComma = formatWithComma(raw);      // مثل 1234567 -> "1,234,567"
        var faNumber = toPersianNumber(withComma); // -> "۱,۲۳۴,۵۶۷"

        this.value = faNumber;

        if (priceDisplay) {
            priceDisplay.textContent = faNumber + " تومان";
        }
    });
})();


// دکمه ثبت پیش‌بینی (برای لودینگ)
var predictSubmitBtn = document.getElementById('btn-submit-predict');

// ================================
// htmx:afterOnLoad  → فقط فرم پیش‌بینی (RequestOtp)
// ================================
document.addEventListener('htmx:afterOnLoad', function (evt) {
    var elt = evt.detail.elt;

    // فقط ریکوئست مربوط به فرم پیش‌بینی
    if (!elt || elt.id !== 'prediction-form')
        return;

    // فقط روی پاسخ موفق (۲xx)
    if (evt.detail.xhr.status < 200 || evt.detail.xhr.status >= 300)
        return;

    // تلاش برای خواندن JSON
    var res;
    try {
        res = JSON.parse(evt.detail.xhr.responseText);
    } catch (e) {
        return;
    }

    // اگر success=false بود، اصلاً مودال را باز نکن
    if (!res || !res.success)
        return;

    // ذخیره otpId داخل hidden input
    if (res.otpId) {
        var otpIdInput = document.getElementById('otp-id');
        if (otpIdInput) {
            otpIdInput.value = res.otpId;
        }
    }

    // موبایل را داخل مودال ست کن
    var mobileInput = document.getElementById('predict-mobile');
    var mobileSpan = document.getElementById('otp-mobile-display');
    if (mobileInput && mobileSpan) {
        mobileSpan.textContent = mobileInput.value;
    }

    // باز کردن مودال OTP
    openOtpModal();

    // شروع تایمر OTP
    startOtpTimer(180);
});



// =======================
// htmx: بعد از ارسال درخواست‌ها
//  - برگشت دکمه فرم پیش‌بینی
//  - توست موفق برای OTP و Resend
//  - ریست فرم + رفرش کپچا بعد از ثبت موفق پیش‌بینی
// =======================
document.addEventListener('htmx:afterRequest', function (evt) {
    var elt = evt.detail.elt;

    // همیشه بعد از اتمام درخواست فرم پیش‌بینی، دکمه را برگردان
    if (elt && elt.id === 'prediction-form') {
        if (predictSubmitBtn) {
            predictSubmitBtn.disabled = false;
            predictSubmitBtn.classList.remove('is-loading');
            if (predictSubmitBtn.dataset.originalText) {
                predictSubmitBtn.innerText = predictSubmitBtn.dataset.originalText;
            }
        }
        // اگر خطایی بود، htmx:responseError جداگانه هندل می‌کند
    }

    // فرم OTP (ثبت نهایی) - فقط موفقیت
    if (elt && elt.id === 'otp-form') {
        if (evt.detail.xhr.status >= 200 && evt.detail.xhr.status < 300) {
            // ثبت موفق
            closeOtpModal();
            showToast('پیش‌بینی شما با موفقیت ثبت شد.', 'success');

            // ✅ ریست فرم اصلی
            var predictionForm = document.getElementById('prediction-form');
            if (predictionForm) {
                predictionForm.reset();
            }

            // پاک کردن نمایش مبلغ فرمت‌شده (اگر داری)
            var priceDisplay = document.getElementById('price-formatted-display');
            if (priceDisplay) {
                priceDisplay.textContent = '';
            }

            // ✅ رفرش کپچا برای شرکت مجدد
            var refreshBtn = document.getElementById('dnt_CaptchaRefreshButton');
            if (refreshBtn) {
                refreshBtn.click();
            }
        }
    }

    // لینک ارسال مجدد
    if (elt && elt.id === 'otp-resend-link') {
        if (evt.detail.xhr.status >= 200 && evt.detail.xhr.status < 300) {
            showToast('کد جدید ارسال شد.', 'success');
            startOtpTimer(180);
        }
    }
});



// =======================
// htmx: قبل از ارسال درخواست‌ها
//  - نرمال‌سازی مبلغ و موبایل برای فرم پیش‌بینی
//  - ولیدیشن موبایل: 11 رقم و شروع با 09
//  - نرمال‌سازی کد تأیید برای فرم OTP
//  - اضافه کردن OtpId برای ارسال مجدد
//  - لودینگ روی دکمه فرم پیش‌بینی
// =======================
document.addEventListener('htmx:configRequest', function (evt) {
    var elt = evt.detail.elt;

    // ---------- فرم پیش‌بینی ----------
    if (elt && elt.id === "prediction-form") {
        var form = elt;

        var priceInput = form.querySelector("#predict-price");
        var mobileInput = form.querySelector("#predict-mobile");

        // نرمال‌سازی مبلغ (اگر وجود دارد)
        if (priceInput) {
            var normalizedPrice = normalizeNumeric(priceInput.value);
            evt.detail.parameters.PredictedPrice = normalizedPrice;
        }

        // نرمال‌سازی موبایل
        var normalizedMobile = null;
        if (mobileInput) {
            normalizedMobile = normalizeNumeric(mobileInput.value);
        }

        // ولیدیشن موبایل: حتماً 11 رقم و شروع با 09
        var mobileRegex = /^09\d{9}$/;
        if (!normalizedMobile || !mobileRegex.test(normalizedMobile)) {
            // جلوگیری از ارسال ریکوئست
            evt.preventDefault();
            showToast("لطفاً یک شماره موبایل معتبر وارد کنید.", "error");
            return;
        }

        // اگر معتبر بود، روی پارامترهای htmx ست کن
        evt.detail.parameters.Mobile = normalizedMobile;

        // دکمه را در حالت لودینگ ببریم (فقط وقتی ولیدیشن اوکی شد)
        if (predictSubmitBtn) {
            if (!predictSubmitBtn.dataset.originalText) {
                predictSubmitBtn.dataset.originalText = predictSubmitBtn.innerText;
            }
            predictSubmitBtn.disabled = true;
            predictSubmitBtn.classList.add('is-loading');
            predictSubmitBtn.innerText = 'در حال ارسال...';
        }
    }

    // ---------- فرم OTP: نرمال‌سازی کد تأیید ----------
    if (elt && elt.id === 'otp-form') {
        var otpForm = elt;
        var otpInput = otpForm.querySelector('#otp-code');
        if (otpInput) {
            var normalizedOtp = normalizeNumeric(otpInput.value);

            // مقدار ورودی را آپدیت کن
            otpInput.value = normalizedOtp;

            // و پارامتر ارسالی htmx را override کن
            evt.detail.parameters = evt.detail.parameters || {};

            if (otpInput.name) {
                evt.detail.parameters[otpInput.name] = normalizedOtp;
            } else {
                evt.detail.parameters.OtpCode = normalizedOtp;
            }
        }
    }

    // ---------- لینک ارسال مجدد OTP ----------
    if (elt && elt.id === 'otp-resend-link') {
        var otpIdInput = document.getElementById('otp-id');
        if (otpIdInput) {
            evt.detail.parameters = evt.detail.parameters || {};
            evt.detail.parameters.OtpId = otpIdInput.value;
        }
    }
});


// =======================
// htmx: خطاهای ریسپانس (۴۰۰ و ...)
//  - نمایش پیام خطا
//  - رفرش کپچا برای فرم پیش‌بینی در هر BadRequest
// =======================
document.addEventListener('htmx:responseError', function (evt) {
    var elt = evt.detail.elt;

    var msg = 'خطا در پردازش درخواست.';

    // سعی می‌کنیم اگر سرور JSON برگردانده، message را بخوانیم
    if (evt.detail.xhr && evt.detail.xhr.responseText) {
        try {
            var res = JSON.parse(evt.detail.xhr.responseText);
            if (res && res.message) {
                msg = res.message;
            }
        } catch (e) {
            // اگر JSON نبود، همون متن خام را استفاده می‌کنیم
            msg = evt.detail.xhr.responseText || msg;
        }
    }

    showToast(msg, 'error');

    // ✅ هر خطای مربوط به فرم پیش‌بینی → کپچا رفرش شود
    if (elt && elt.id === 'prediction-form') {
        var refreshBtn = document.getElementById('dnt_CaptchaRefreshButton');
        if (refreshBtn) {
            refreshBtn.click();
        }
    }

    // اگر خواستی برای otp-form هم رفتار خاصی داشته باشی می‌تونی اینجا اضافه کنی
    // if (elt && elt.id === 'otp-form') { ... }
});




document.addEventListener('DOMContentLoaded', function () {
    const requiredInputs = document.querySelectorAll('#prediction-form [required]');

    requiredInputs.forEach(function (input) {
        input.addEventListener('invalid', function (e) {
            // اگر پیام سفارشی نداره، براش بذار
            if (!e.target.validity.valid) {
                if (e.target.id === 'predict-price') {
                    e.target.setCustomValidity('لطفاً مبلغ پیشنهادی را وارد کنید.');
                } else if (e.target.id === 'predict-week') {
                    e.target.setCustomValidity('لطفاً هفته شروع را انتخاب کنید.');
                } else if (e.target.id === 'predict-name') {
                    e.target.setCustomValidity('لطفاً نام و نام خانوادگی را وارد کنید.');
                } else if (e.target.id === 'predict-mobile') {
                    e.target.setCustomValidity('لطفاً شماره موبایل را وارد کنید.');
                } else if (e.target.id === 'otp-code') {
                    e.target.setCustomValidity('لطفاً کد تایید را وارد کنید.');
                } else {
                    e.target.setCustomValidity('پر کردن این فیلد الزامی است.');
                }
            }
        });

        input.addEventListener('input', function (e) {
            e.target.setCustomValidity('');
        });
    });
});

// =======================
// ولیدیشن ساده برای خالی بودن کد تأیید
// =======================
document.addEventListener('DOMContentLoaded', function () {
    var otpForm = document.getElementById('otp-form');
    var otpInput = document.getElementById('otp-code');

    if (otpForm && otpInput) {
        otpForm.addEventListener('submit', function (e) {
            // تrim برای حذف فاصله
            if (!otpInput.value || otpInput.value.trim() === '') {
                e.preventDefault(); // جلو ارسال فرم را می‌گیریم
                showToast('لطفاً کد تأیید را وارد کنید.', 'error');
            }
        });
    }
});
