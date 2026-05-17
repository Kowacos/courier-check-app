const CACHE_NAME = 'courier-check-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/index.css',
  '/src/toast.js',
  '/src/confetti.js',
];

// Instalace - uložení do cache
self.addEventListener('install', (event) => {
  console.log('💾 Service Worker: Instaluji...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Cache otevřena');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Chyba při cachování:', error);
      })
  );
  // Neprovádíme skipWaiting automaticky - čekáme na potvrzení uživatele
});

// Message handler - pro SKIP_WAITING od klienta
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('✅ Klient potvrdil aktualizaci - aktivuji nový Service Worker');
    self.skipWaiting();
  }
});

// Aktivace - smazání starých cache
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Aktivuji...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Mažu starou cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network First, pak cache (pro Supabase data)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase požadavky - vždy network first
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Uložit do cache pro offline
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - zkus cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Statické soubory - cache first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Uložit do cache
          if (response && response.status === 200 && event.request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push notifikace (připraveno pro budoucnost)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nová notifikace',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('Kontrola Kurýrů', options)
  );
});

// Background sync (offline úpravy se synchronizují když je net)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  // Zde bude logika pro synchronizaci offline změn
  console.log('📡 Synchronizuji offline data...');
}



