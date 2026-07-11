/** Toast.js — تنبيهات عابرة أسفل الشاشة */

function getStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(message, type) {
  const stack = getStack();
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
