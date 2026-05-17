import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 📱 PWA - Registrace Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrován:', registration.scope);

        // Check for updates každých 60 sekund
        setInterval(() => {
          registration.update();
        }, 60000);
      })
      .catch((error) => {
        console.error('❌ Service Worker registrace selhala:', error);
      });
  });
}

// 📱 PWA - Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 PWA je připravena k instalaci');
  e.preventDefault();
  deferredPrompt = e;

  // Můžeš zobrazit vlastní install button
  showInstallButton();
});

function showInstallButton() {
  // Vytvoř install button (zobrazí se jen když ještě není nainstalováno)
  const installButton = document.createElement('button');
  installButton.textContent = '📱 Nainstalovat aplikaci';
  installButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
    z-index: 10000;
    animation: pulse 2s infinite;
  `;

  installButton.onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      deferredPrompt = null;
      installButton.remove();
    }
  };

  document.body.appendChild(installButton);

  // Auto-hide po 10 sekundách
  setTimeout(() => {
    if (installButton.parentNode) {
      installButton.style.opacity = '0';
      installButton.style.transition = 'opacity 0.5s';
      setTimeout(() => installButton.remove(), 500);
    }
  }, 10000);
}

window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA byla nainstalována!');
  deferredPrompt = null;
});

// 📱 Detekce iOS standalone mode
if (window.navigator.standalone === true) {
  console.log('📱 Aplikace běží v standalone režimu (iOS)');
}

// 📱 Detekce Android PWA mode
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Aplikace běží v standalone režimu (Android/Desktop)');
}

