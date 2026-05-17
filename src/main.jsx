import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 📱 PWA - Registrace Service Worker s automatickou aktualizací
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registrován:', registration.scope);

        // 🔄 Detekce nové verze
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🆕 Nová verze PWA nalezena! Stahuji...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 🎉 Nová verze je připravena!
              console.log('✅ Nová verze je připravena k aktivaci');
              showUpdateNotification();
            }
          });
        });

        // Check for updates každých 60 sekund
        setInterval(() => {
          registration.update();
        }, 60000);

        // Check for updates i když uživatel přepne tab zpět
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            registration.update();
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registrace selhala:', error);
      });
  });

  // 🔄 Reload když se aktivuje nový Service Worker
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      console.log('🔄 Service Worker aktualizován! Refreshuji stránku...');
      refreshing = true;
      window.location.reload();
    }
  });
}

// 🆕 Ukázat notifikaci o nové verzi
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(5, 150, 105, 0.4);
      z-index: 100000;
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      animation: slideDown 0.4s ease-out;
      max-width: 90%;
    ">
      <span style="font-size: 20px;">🎉</span>
      <div style="flex: 1;">
        <div style="font-weight: 700; margin-bottom: 2px;">Nová verze je dostupná!</div>
        <div style="font-size: 12px; opacity: 0.9;">Klikni pro aktualizaci aplikace</div>
      </div>
      <button id="pwa-update-btn" style="
        background: white;
        color: #047857;
        border: none;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      ">
        Aktualizovat
      </button>
    </div>
  `;

  // Animace
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    #pwa-update-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    #pwa-update-btn:active {
      transform: scale(0.98);
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(updateBanner);

  // Handler pro update button
  document.getElementById('pwa-update-btn').onclick = () => {
    console.log('🔄 Uživatel potvrdil aktualizaci...');
    
    // Pošli zprávu Service Workeru aby se aktivoval
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Fade out banner
    updateBanner.style.transition = 'opacity 0.3s';
    updateBanner.style.opacity = '0';
    setTimeout(() => updateBanner.remove(), 300);
  };

  // Auto-dismiss po 30 sekundách (ale zůstane v konzoli že je update dostupný)
  setTimeout(() => {
    if (updateBanner.parentNode) {
      updateBanner.style.transition = 'opacity 0.5s';
      updateBanner.style.opacity = '0';
      setTimeout(() => updateBanner.remove(), 500);
    }
  }, 30000);
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

