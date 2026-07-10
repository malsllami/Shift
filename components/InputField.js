/** InputField.js — حقل إدخال بحواف دائرية، يقبل الأرقام العربية والإنجليزية معًا */
import { attachDigitNormalizer } from '../services/numbers.service.js';

export function createInputField({ id, label, type = 'text', numeric = false, required = false, placeholder = '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', id);
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.id = id;
  input.name = id;
  input.type = type;
  input.required = required;
  input.placeholder = placeholder;
  if (numeric) attachDigitNormalizer(input);

  const errorEl = document.createElement('div');
  errorEl.className = 'error';
  errorEl.hidden = true;

  wrap.appendChild(labelEl);
  wrap.appendChild(input);
  wrap.appendChild(errorEl);

  return {
    element: wrap,
    input,
    setError(message) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  };
}
