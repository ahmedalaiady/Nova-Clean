// =============================
// NOVA CLEAN - Landing Page JS
// نسخة مضغوطة: صفحة واحدة + Modal للطلب
// =============================

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- إعدادات التواصل ---------- */
  const WHATSAPP_NUMBER = '9647760771719'; // رقم واتساب الرسمي
  const waBaseUrl = `https://wa.me/${WHATSAPP_NUMBER}`;

  /* ---------- إعدادات Snapchat Conversions API (إرسال مباشر لسيرفر Snapchat) ---------- */
  const SNAP_CAPI_PIXEL_ID = 'fa239526-2ba3-46d7-9c70-048c1ff934f1';
  const SNAP_CAPI_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzg1MDIwOTAxLCJzdWIiOiJkNDI2YjQ3MC1mNmI0LTQwODMtYTBjYi1mNTAwYzlmMzk3NWF-UFJPRFVDVElPTn4wNThkMzg5My1mMWI5LTQ2MzMtYjk4Ny0zOTk2MmUzZjY3ODUifQ.LligAUPYIeHZxmrZwsn5S_TBcdceuvqfOjnOyQFJuvs';
  const SNAP_CAPI_URL = `https://tr.snapchat.com/v3/${SNAP_CAPI_PIXEL_ID}/events?access_token=${SNAP_CAPI_ACCESS_TOKEN}`;

  // توليد معرّف عشوائي للحدث (يستخدم للدمج بين حدث البكسل في المتصفح وحدث Conversions API)
  function generateEventId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'evt-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  // تجزئة SHA-256 (مطلوبة من Snapchat لتشفير بيانات المستخدم مثل رقم الهاتف قبل إرسالها)
  async function sha256Hex(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // تطبيع رقم الهاتف العراقي للصيغة الدولية (964xxxxxxxxxx) قبل التجزئة
  function normalizeIraqiPhone(phone) {
    let digits = String(phone || '').replace(/[^\d]/g, '');
    if (digits.startsWith('00964')) {
      digits = digits.slice(2);
    } else if (digits.startsWith('964')) {
      // مسبقاً بصيغة دولية
    } else if (digits.startsWith('0')) {
      digits = '964' + digits.slice(1);
    } else if (digits) {
      digits = '964' + digits;
    }
    return digits;
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  // استخراج sc_click_id من رابط الإعلان إن وُجد (يضيفه Snapchat تلقائياً لرابط الإعلانات)
  function getScClickId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ScCid') || params.get('sccid') || params.get('sc_click_id') || undefined;
  }

  /**
   * إرسال حدث مباشرة إلى Snapchat Conversions API (من المتصفح مباشرة بما أن الموقع ثابت بدون سيرفر خلفي)
   * ⚠️ ملاحظة: هذا يعني أن Access Token مرئي داخل كود الصفحة (View Source) بنفس أسلوب توكن بوت تلكرام.
   */
  async function sendSnapCapiEvent(eventName, options) {
    options = options || {};
    try {
      const userData = {
        user_agent: navigator.userAgent
      };

      const clickId = getScClickId();
      if (clickId) userData.sc_click_id = clickId;

      const scCookie = getCookie('_scid');
      if (scCookie) userData.sc_cookie1 = scCookie;

      if (options.phone) {
        const normalizedPhone = normalizeIraqiPhone(options.phone);
        if (normalizedPhone) {
          userData.ph = [await sha256Hex(normalizedPhone)];
        }
      }

      const customData = {
        event_id: options.eventId || generateEventId()
      };
      if (options.contentCategory) customData.content_category = [options.contentCategory];
      if (options.offer) customData.content_ids = [options.offer];
      if (options.price !== undefined) {
        customData.value = options.price;
        customData.currency = options.currency || 'IQD';
      }

      const payload = {
        data: [{
          event_name: eventName,
          action_source: 'website',
          event_source_url: window.location.href,
          event_time: Math.floor(Date.now() / 1000),
          user_data: userData,
          custom_data: customData
        }]
      };

      await fetch(SNAP_CAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Snapchat Conversions API error:', err);
    }
  }

  /* ---------- إعدادات بوت تلكرام لاستقبال الطلبات ---------- */
  const TELEGRAM_BOT_TOKEN = '8732950003:AAHF1dDd4TG7UnpPIKc4RwKVcbcY_pVCzws';
  const TELEGRAM_CHAT_IDS = ['5549045631', '458809319', '146506609']; // المستخدمون المستقبلون للطلبات

  async function sendOrderToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const sendPromises = TELEGRAM_CHAT_IDS.map(function (chatId) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      }).catch(function (err) {
        console.error('Telegram send error for chat', chatId, err);
      });
    });
    // نحاول الإرسال لكل المستخدمين بالتوازي، وأي فشل في مستخدم واحد لا يوقف الباقي
    await Promise.allSettled(sendPromises);
  }

  document.getElementById('floatingWa').href = `${waBaseUrl}?text=${encodeURIComponent('مرحباً، أرغب بالاستفسار عن منتجات نوفا كلين')}`;

  /* ---------- تتبع الأحداث (Meta / TikTok / Snapchat Pixels) ---------- */
  const firedEvents = new Set();

  // تحويل أسماء أحداثنا الداخلية إلى أحداث Snapchat القياسية (Standard Events)
  // PAGE_VIEW يتم إرساله تلقائياً من كود Snap Pixel الأساسي في <head>، فلا نكرره هنا.
  const SNAP_EVENT_MAP = {
    'AddToCart': 'ADD_CART',
    'Lead': 'PURCHASE',
    'CompleteRegistration': 'SIGN_UP',
    'WhatsAppClick': 'AD_CLICK'
  };

  // تحويل أسماء أحداثنا الداخلية إلى أحداث Meta (Facebook) Pixel القياسية
  // PageView يتم إرساله تلقائياً من كود Meta Pixel الأساسي في <head>، فلا نكرره هنا.
  const META_EVENT_MAP = {
    'AddToCart': 'AddToCart',
    'Lead': 'Lead',
    'CompleteRegistration': 'CompleteRegistration',
    'WhatsAppClick': 'Contact'
  };

  function extractNumericPrice(priceStr) {
    if (!priceStr) return undefined;
    const digits = String(priceStr).replace(/[^\d]/g, '');
    return digits ? Number(digits) : undefined;
  }

  function trackEvent(eventName, params = {}) {
    if (firedEvents.has(eventName) && eventName !== 'ScrollDepth') {
      return;
    }
    firedEvents.add(eventName);
    console.log('[Tracking Event]', eventName, params);

    // ---- Snapchat Pixel ----
    const snapEventName = SNAP_EVENT_MAP[eventName];
    if (snapEventName && typeof snaptr === 'function') {
      const snapParams = {};
      if (params.price !== undefined) {
        const numericPrice = extractNumericPrice(params.price);
        if (numericPrice !== undefined) {
          snapParams.price = numericPrice;
          snapParams.currency = 'IQD';
        }
      }
      if (params.offer) {
        snapParams.item_ids = [params.offer];
        snapParams.description = params.offer;
      }
      snaptr('track', snapEventName, snapParams);
    }

    // ---- Meta (Facebook) Pixel ----
    const metaEventName = META_EVENT_MAP[eventName];
    if (metaEventName && typeof fbq === 'function') {
      const metaParams = {};
      if (params.price !== undefined) {
        const numericPrice = extractNumericPrice(params.price);
        if (numericPrice !== undefined) {
          metaParams.value = numericPrice;
          metaParams.currency = 'IQD';
        }
      }
      if (params.offer) {
        metaParams.content_name = params.offer;
        metaParams.content_type = 'product';
      }
      fbq('track', metaEventName, metaParams);
    }

    // ضع هنا كود TikTok Pixel عند تجهيزه
    // مثال:
    // if (typeof ttq === 'object') ttq.track(eventName, params);
  }

  trackEvent('PageView');

  // إرسال حدث SIGN_UP إلى Snapchat Conversions API عند أي ضغط على واتساب (الزر العائم + زر واتساب في رسالة النجاح)
  function handleWhatsAppClick() {
    trackEvent('WhatsAppClick');
    sendSnapCapiEvent('SIGN_UP', {});
  }

  document.getElementById('floatingWa').addEventListener('click', handleWhatsAppClick);
  document.getElementById('waLink').addEventListener('click', handleWhatsAppClick);

  /* ---------- نافذة الطلب المنبثقة (Modal) ---------- */
  const modal = document.getElementById('orderModal');
  const modalOfferName = document.getElementById('modalOfferName');
  const modalOfferPrice = document.getElementById('modalOfferPrice');
  const offerSelectedInput = document.getElementById('offer_selected');
  const form = document.getElementById('orderForm');
  const orderSuccess = document.getElementById('orderSuccess');

  function openModal(offerName, offerPrice) {
    modalOfferName.textContent = offerName;
    modalOfferPrice.textContent = offerPrice;
    offerSelectedInput.value = offerName;

    // إعادة تعيين النموذج لحالته الأصلية عند فتح عرض جديد
    form.reset();
    form.hidden = false;
    orderSuccess.hidden = true;
    ['full_name', 'phone', 'governorate', 'address'].forEach(clearError);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    trackEvent('AddToCart', { offer: offerName, price: offerPrice });
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.offer-tile').forEach(function (tile) {
    tile.addEventListener('click', function () {
      openModal(this.dataset.offer, this.dataset.price);
    });
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  /* ---------- التحقق من صحة النموذج ---------- */
  const submitBtn = document.getElementById('submitBtn');

  function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById('err-' + fieldId);
    field.classList.add('invalid');
    errEl.textContent = message;
  }

  function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById('err-' + fieldId);
    if (field) field.classList.remove('invalid');
    if (errEl) errEl.textContent = '';
  }

  function validateForm() {
    let isValid = true;
    const fullName = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const governorate = document.getElementById('governorate').value;
    const address = document.getElementById('address').value.trim();

    ['full_name', 'phone', 'governorate', 'address'].forEach(clearError);

    if (fullName.length < 3) {
      showError('full_name', 'الرجاء إدخال الاسم الكامل (3 أحرف على الأقل)');
      isValid = false;
    }

    const phoneRegex = /^(07[0-9]{9}|00964[0-9]{9,10}|\+?964[0-9]{9,10})$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      showError('phone', 'الرجاء إدخال رقم هاتف عراقي صحيح مثل 07xxxxxxxxx');
      isValid = false;
    }

    if (!governorate) {
      showError('governorate', 'الرجاء اختيار المحافظة');
      isValid = false;
    }

    if (address.length < 5) {
      showError('address', 'الرجاء كتابة العنوان بالتفصيل');
      isValid = false;
    }

    return isValid;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm()) {
      trackEvent('FormError');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال الطلب...';

    const fullName = document.getElementById('full_name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const governorate = document.getElementById('governorate').value;
    const address = document.getElementById('address').value.trim();
    const offerName = offerSelectedInput.value;
    const offerPrice = modalOfferPrice.textContent;

    const orderData = {
      full_name: fullName,
      phone: phone,
      governorate: governorate,
      address: address,
      offer_selected: offerName,
      price: offerPrice,
      status: 'جديد'
    };

    try {
      const response = await fetch('tables/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('فشل إرسال الطلب');

      trackEvent('Lead', { offer: offerName, price: offerPrice });
      trackEvent('CompleteRegistration');

      // إرسال حدث PURCHASE إلى Snapchat Conversions API عند إتمام إرسال نموذج الطلب
      sendSnapCapiEvent('PURCHASE', {
        phone: phone,
        offer: offerName,
        price: extractNumericPrice(offerPrice),
        currency: 'IQD',
        contentCategory: 'home_cleaning_products'
      });

      const messageText = `مرحباً، أرغب بتأكيد طلبي:\nالاسم: ${fullName}\nالهاتف: ${phone}\nالمحافظة: ${governorate}\nالمنطقة: ${address}\nالعرض: ${offerName} (${offerPrice})`;
      document.getElementById('waLink').href = `${waBaseUrl}?text=${encodeURIComponent(messageText)}`;

      // إرسال الطلب إلى بوت تلكرام لكل المستخدمين الثلاثة
      const telegramMessage =
        `🔔 <b>طلب جديد - NOVA CLEAN</b>\n\n` +
        `👤 <b>الاسم:</b> ${fullName}\n` +
        `📱 <b>الهاتف:</b> ${phone}\n` +
        `📍 <b>المحافظة:</b> ${governorate}\n` +
        `🏠 <b>المنطقة:</b> ${address}\n` +
        `📦 <b>العرض:</b> ${offerName}\n` +
        `💰 <b>السعر:</b> ${offerPrice}`;

      sendOrderToTelegram(telegramMessage);

      form.hidden = true;
      orderSuccess.hidden = false;

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الطلب. الرجاء المحاولة مرة أخرى أو التواصل معنا مباشرة عبر واتساب.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> تثبيت الطلب الآن';
    }
  });

});
