/* ═══════════════════════════════════════════════════
   AAINIK — SERVICE WORKER | sw.js
   Built by:     Account 1
   Extended by:  Account 2 — background notification delivery
   Handles: Offline caching, background sync, PWA install,
            background multi-reminder scheduling
═══════════════════════════════════════════════════ */

const CACHE_NAME    = 'aainik-v4';
const CACHE_VERSION = 4;

// Files to cache for offline use
const CACHE_FILES = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/* ─── INSTALL: cache all app files ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_FILES.map(file =>
          cache.add(file).catch(err => console.warn('[SW] Cache miss for', file, err))
        )
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

/* ─── ACTIVATE: clean old caches ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── FETCH: serve from cache, fallback to network ─── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});

/* ─── PUSH: handle push notifications (future use) ─── */
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Aainik', {
        body: data.body || '', icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png', tag: data.tag || 'aainik-notif',
        renotify: true, data
      })
    );
  } catch (e) { console.warn('[SW] Push error:', e); }
});

/* ─── NOTIFICATION CLICK: open app ─── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/index.html');
    })
  );
});

/* ─── ACCOUNT 2: PERIODIC SYNC — background notification check ─── */
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkAndFireNotifications());
  }
  if (event.tag === 'check-ego-reports') {
    event.waitUntil(checkAndFireEgoReports());
  }
});

/* ─── ACCOUNT 2: MESSAGE — receive task data for background scheduling ─── */
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // App sends full appData snapshot so SW can fire reminders when page is closed
  if (event.data.type === 'SYNC_NOTIFICATION_DATA') {
    const data = event.data.payload;
    if (data) {
      // Store in IndexedDB-style using cache API as simple KV
      caches.open('aainik-data').then(cache => {
        const resp = new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
        cache.put('/sw-data', resp);
      });
    }
  }
});

/* ─────────────────────────────────────────────
   ACCOUNT 2 — checkAndFireNotifications
   Called by periodicsync when page is in background.
   Reads appData snapshot from cache, fires any due reminders.
───────────────────────────────────────────── */
async function checkAndFireNotifications() {
  let appData = null;
  try {
    const cache   = await caches.open('aainik-data');
    const resp    = await cache.match('/sw-data');
    if (resp) appData = await resp.json();
  } catch (e) {
    console.warn('[SW] Could not read app data:', e);
    return;
  }

  if (!appData || !appData.tasks) return;

  const now        = new Date();
  const hhmm       = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const today      = now.getFullYear() + '-' +
                     String(now.getMonth()+1).padStart(2,'0') + '-' +
                     String(now.getDate()).padStart(2,'0');
  const dayOfWeek  = now.getDay();
  const isWeekday  = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;

  const fromStr = (appData.settings && appData.settings.notifWindowFrom) || '06:00';
  const toStr   = (appData.settings && appData.settings.notifWindowTo)   || '23:00';
  if (hhmm < fromStr || hhmm > toStr) return;

  for (const task of appData.tasks) {
    if (!task.active || !task.notifications) continue;

    const done = (appData.history || []).find(
      h => h.taskId === task.id && h.date === today && h.completed
    );
    if (done) continue;

    for (const n of task.notifications) {
      if (!n.enabled || n.time !== hhmm) continue;
      if (!swShouldFireToday(n, dayOfWeek, isWeekday, isWeekend)) continue;

      await self.registration.showNotification('Aainik: ' + task.name, {
        body:     n.message,
        icon:     '/icons/icon-192.png',
        badge:    '/icons/icon-192.png',
        tag:      'bg-' + task.id + '-' + n.id,
        renotify: true,
        data:     { taskId: task.id }
      });
    }
  }
}

function swShouldFireToday(n, dayOfWeek, isWeekday, isWeekend) {
  const r = n.repeat || 'daily';
  if (r === 'daily')    return true;
  if (r === 'weekdays') return isWeekday;
  if (r === 'weekends') return isWeekend;
  if (r === 'custom')   return (n.customDays || []).includes(dayOfWeek);
  return true;
}

/* ─────────────────────────────────────────────
   SW: CHECK & FIRE EGO AI REPORTS (background)
   Weekly report + Daily progress report
   These fire Gemini API from SW when app is killed
───────────────────────────────────────────── */
async function checkAndFireEgoReports() {
  let appData = null;
  try {
    const cache = await caches.open('aainik-data');
    const resp  = await cache.match('/sw-data');
    if (resp) appData = await resp.json();
  } catch (e) {
    console.warn('[SW] Could not read app data:', e);
    return;
  }
  if (!appData || !appData.settings) return;

  const apiKey = appData.settings.coachApiKey;
  if (!apiKey) return;

  const now   = new Date();
  const hhmm  = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const today = now.getFullYear() + '-' +
                String(now.getMonth()+1).padStart(2,'0') + '-' +
                String(now.getDate()).padStart(2,'0');

  // ── Weekly report check ──
  if (appData.settings.weeklyReportEnabled && appData.settings.weeklyReportTime === hhmm) {
    const weekKey = swGetISOWeekKey(now);
    const fired   = appData.settings.lastWeeklyReportFired || {};
    if (!fired[weekKey]) {
      try {
        await self.registration.showNotification('📊 Aainik — Weekly Report', {
          body: 'Tera weekly performance report ready hai! App kholo.',
          icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
          tag: 'weekly-report-' + weekKey, renotify: true,
          data: { screen: 'coach' }
        });
      } catch (e) { console.warn('[SW] Weekly notif failed:', e); }
    }
  }

  // ── Daily progress report check ──
  if (appData.settings.dailyProgressEnabled && appData.settings.dailyProgressTime === hhmm) {
    const fired = appData.settings.lastDailyProgressFired || {};
    if (!fired[today]) {
      try {
        await self.registration.showNotification('📈 Aainik — Daily Progress', {
          body: 'Aaj ka overall progress report ready hai! App kholo.',
          icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
          tag: 'daily-progress-' + today, renotify: true,
          data: { screen: 'coach' }
        });
      } catch (e) { console.warn('[SW] Daily progress notif failed:', e); }
    }
  }

  // ── Auto-coach check times ──
  if (appData.settings.autoCoachEnabled) {
    const times = appData.settings.autoCoachTimes || [];
    for (const entry of times) {
      if (!entry.enabled || entry.time !== hhmm) continue;
      const fireKey = today + '_' + entry.time;
      const fired   = appData.settings.lastAutoCoachFired || {};
      if (fired[fireKey]) continue;
      try {
        await self.registration.showNotification('🤖 Aainik — Ego Check', {
          body: `Auto ego check time! App kholo.`,
          icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
          tag: 'auto-coach-' + entry.time, renotify: true,
          data: { screen: 'coach' }
        });
      } catch (e) { console.warn('[SW] Auto-coach notif failed:', e); }
    }
  }
}

function swGetISOWeekKey(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week      = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

