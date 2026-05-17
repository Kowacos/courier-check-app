/**
 * toast.js - Moderní toast notifikace systém
 */

let toastContainer = null;
let toastIdCounter = 0;

// Inicializuj kontejner pro toasty
function initToastContainer() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
}

const toastStyles = {
  success: {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#059669',
    icon: '✅'
  },
  error: {
    bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    border: '#dc2626',
    icon: '❌'
  },
  warning: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#d97706',
    icon: '⚠️'
  },
  info: {
    bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: '#2563eb',
    icon: 'ℹ️'
  }
};

export function toast(message, type = 'info', duration = 3000) {
  initToastContainer();

  const id = `toast-${toastIdCounter++}`;
  const style = toastStyles[type] || toastStyles.info;

  const toastEl = document.createElement('div');
  toastEl.id = id;
  toastEl.style.cssText = `
    background: ${style.bg};
    color: white;
    padding: 16px 20px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px ${style.border};
    font-size: 14px;
    font-weight: 600;
    max-width: 350px;
    pointer-events: auto;
    cursor: pointer;
    transform: translateX(400px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex;
    align-items: center;
    gap: 12px;
    backdrop-filter: blur(10px);
  `;

  toastEl.innerHTML = `
    <span style="font-size: 20px; flex-shrink: 0;">${style.icon}</span>
    <span style="flex: 1; line-height: 1.4;">${message}</span>
  `;

  toastContainer.appendChild(toastEl);

  // Animace vstupu
  requestAnimationFrame(() => {
    toastEl.style.transform = 'translateX(0)';
    toastEl.style.opacity = '1';
  });

  // Kliknutím zavřít
  toastEl.addEventListener('click', () => {
    removeToast(toastEl);
  });

  // Auto-remove
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toastEl);
    }, duration);
  }

  return id;
}

function removeToast(toastEl) {
  toastEl.style.transform = 'translateX(400px)';
  toastEl.style.opacity = '0';

  setTimeout(() => {
    if (toastEl.parentNode) {
      toastEl.parentNode.removeChild(toastEl);
    }
  }, 300);
}

// Pomocné funkce
toast.success = (msg, duration) => toast(msg, 'success', duration);
toast.error = (msg, duration) => toast(msg, 'error', duration);
toast.warning = (msg, duration) => toast(msg, 'warning', duration);
toast.info = (msg, duration) => toast(msg, 'info', duration);

