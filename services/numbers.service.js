/**
 * numbers.service.js
 * تحويل الأرقام العربية إلى إنجليزية فور الإدخال (يقبل الحقل كلا
 * الشكلين أثناء الكتابة، لكن القيمة المخزّنة والمرسلة دائمًا إنجليزية).
 */

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toEnglishDigits(value) {
  if (value === null || value === undefined) return value;
  return String(value).replace(/[٠-٩]/g, (ch) => String(ARABIC_INDIC_DIGITS.indexOf(ch)));
}

/** يربط حقل إدخال بتحويل تلقائي للأرقام العربية إلى إنجليزية أثناء الكتابة */
export function attachDigitNormalizer(inputEl) {
  inputEl.classList.add('numeric');
  inputEl.addEventListener('input', () => {
    const converted = toEnglishDigits(inputEl.value);
    if (converted !== inputEl.value) {
      const pos = inputEl.selectionStart;
      inputEl.value = converted;
      if (pos !== null) inputEl.setSelectionRange(pos, pos);
    }
  });
}
