// =============================
// NOVA CLEAN - Landing Page JS
// نسخة مضغوطة: صفحة واحدة + Modal للطلب
// =============================

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- إعدادات التواصل ---------- */
  const WHATSAPP_NUMBER = '9647760771719'; // رقم واتساب الرسمي
  const waBaseUrl = `https://wa.me/${WHATSAPP_NUMBER}`;

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

  /* ---------- تتبع Snapchat Pixel: حدث التواصل عبر واتساب ---------- */
  function trackWhatsAppContact() {
    if (typeof snaptr === 'function') {
      snaptr('track', 'SIGN_UP', { sign_up_method: 'whatsapp' });
    }
  }
  document.getElementById('floatingWa').addEventListener('click', trackWhatsAppContact);
  document.getElementById('waLink').addEventListener('click', trackWhatsAppContact);

  function extractNumericPrice(priceStr) {
    if (!priceStr) return undefined;
    const digits = String(priceStr).replace(/[^\d]/g, '');
    return digits ? Number(digits) : undefined;
  }

  /* ---------- تحويل الأرقام العربية/الفارسية إلى أرقام إنجليزية ----------
     بعض لوحات المفاتيح العربية (خصوصاً iOS) تُدخل أرقاماً هندية-عربية
     (٠١٢٣٤٥٦٧٨٩) أو فارسية ممتدة (۰۱۲۳۴۵۶۷۸۹) بدلاً من الأرقام اللاتينية،
     مما يمنع نجاح تحقق رقم الهاتف. نعالج هذا بتحويل كل الأرقام إلى صيغة
     إنجليزية قبل أي تحقق أو استخدام. */
  function normalizeDigits(input) {
    if (!input) return input;
    const arabicIndic = '٠١٢٣٤٥٦٧٨٩';   // U+0660 - U+0669
    const extendedArabicIndic = '۰۱۲۳۴۵۶۷۸۹'; // U+06F0 - U+06F9 (Persian)
    return String(input).replace(/[٠-٩۰-۹]/g, function (ch) {
      let idx = arabicIndic.indexOf(ch);
      if (idx > -1) return String(idx);
      idx = extendedArabicIndic.indexOf(ch);
      if (idx > -1) return String(idx);
      return ch;
    });
  }

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
    const phoneField = document.getElementById('phone');
    const phone = normalizeDigits(phoneField.value.trim());
    // نعيد كتابة القيمة في الحقل بالأرقام الإنجليزية بعد التطبيع
    // حتى يرى المستخدم رقمه بصيغة صحيحة ويُستخدم بشكل متسق لاحقاً
    if (phoneField.value.trim() !== phone) {
      phoneField.value = phone;
    }
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
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال الطلب...';

    const fullName = document.getElementById('full_name').value.trim();
    const phone = normalizeDigits(document.getElementById('phone').value.trim());
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

      // تتبع Snapchat Pixel: حدث إرسال نموذج الطلب بنجاح
      if (typeof snaptr === 'function') {
        snaptr('track', 'PURCHASE', {
          currency: 'IQD',
          price: extractNumericPrice(offerPrice),
          item_ids: [offerName],
          description: offerName
        });
      }

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
