/* ═══════════════════════════════════════════════════════════════
   AAINIK — TASK MASTERY | app.js
   Built by: Account 1 (Foundation)
   Handles: Data model, routing, TODAY, CATEGORIES, SETTINGS,
            basic scoring, streaks, single notification per task,
            PWA install, dark/light mode
   
   Account 2 will ADD: Multi-reminder notification system
   Account 3 will REPLACE: PROGRESS screen with full analytics
   Account 4 will ADD: COACH screen with Groq API
   
   Data stored in localStorage under key: taskMastery_v1
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const APP_VERSION   = '1.5.0';
const STORAGE_KEY   = 'taskMastery_v1';
const DATA_VERSION  = 4;

/* ─────────────────────────────────────────────
   IST TIMEZONE HELPERS
   All time comparisons use IST (UTC+5:30) to avoid
   UTC offset bugs on devices set to non-IST timezone
───────────────────────────────────────────── */
function getNowISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60; // 5h30m in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (istOffset * 60000));
}

function getNowISTHHMM() {
  const d = getNowISTDate();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* ─────────────────────────────────────────────
   API ROUND-ROBIN COUNTER
   Advances on every successful API key selection
   so calls distribute evenly across all keys
───────────────────────────────────────────── */
let _apiRoundRobinIdx = 0;

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#A29BFE', '#FDCB6E',
  '#74B9FF', '#55EFC4', '#FD79A8', '#E17055',
  '#6C5CE7', '#00B894', '#FDFD96', '#B2BEFF'
];

const PRIORITY_POINTS = { high: 3, medium: 2, low: 1 };

/* ─────────────────────────────────────────────
   DEFAULT DATA MODEL
   Account 2 adds: notifications array per task
   Account 3 adds: nothing to base model
   Account 4 adds: conversations[], badges[], level
───────────────────────────────────────────── */
function getDefaultData() {
  return {
    version: DATA_VERSION,
    appVersion: APP_VERSION,

    categories: [
      { id: 'cat_rrb',       name: 'RRB PO',     color: '#FF6B6B', createdAt: Date.now() },
      { id: 'cat_physic',    name: 'PHYSIC',      color: '#4ECDC4', createdAt: Date.now() },
      { id: 'cat_looks',     name: 'LOOKS',       color: '#A29BFE', createdAt: Date.now() },
      { id: 'cat_personally',name: 'PERSONALLY',  color: '#FDCB6E', createdAt: Date.now() }
    ],

    tasks: [
      // RRB PO tasks
      {
        id: 'task_vocab', categoryId: 'cat_rrb', name: 'Vocabulary Practice',
        priority: 'high', scheduledTime: '06:30', duration: 30,
        workingWindowStart: '06:30', workingWindowEnd: '07:00',
        whyMatters: 'Vocab is the foundation of English section — 10+ questions directly from vocab!',
        notification: { enabled: true, time: '06:25', message: 'Bhai vocab time! 📚 RRB PO yaad hai?' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_math', categoryId: 'cat_rrb', name: 'Math Problems (Quant)',
        priority: 'high', scheduledTime: '07:30', duration: 45,
        workingWindowStart: '07:30', workingWindowEnd: '08:30',
        whyMatters: 'Quant mein speed chahiye — daily 20 problems se hi banega!',
        notification: { enabled: true, time: '07:25', message: 'Math practice start karo! 🔢' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_reasoning', categoryId: 'cat_rrb', name: 'Reasoning Practice',
        priority: 'high', scheduledTime: '08:30', duration: 30,
        workingWindowStart: '08:30', workingWindowEnd: '09:30',
        whyMatters: 'Reasoning section fast hona chahiye — logic daily grind karo',
        notification: { enabled: true, time: '08:25', message: 'Reasoning time! 🧠' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_banking', categoryId: 'cat_rrb', name: 'Banking Awareness',
        priority: 'medium', scheduledTime: '20:00', duration: 20,
        workingWindowStart: '20:00', workingWindowEnd: '21:00',
        whyMatters: 'GA section mein banking current affairs bahut important hai',
        notification: { enabled: true, time: '19:55', message: 'Banking news padh lo! 🏦' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_mock', categoryId: 'cat_rrb', name: 'Weekly Mock Test',
        priority: 'high', scheduledTime: '10:00', duration: 90,
        workingWindowStart: '10:00', workingWindowEnd: '12:00',
        whyMatters: 'Mock test performance hi real exam ka mirror hai — analyze karo mistakes',
        notification: { enabled: true, time: '09:50', message: 'Mock test time! Full focus! 🎯' },
        notifications: [],
        createdAt: Date.now(), active: true
      },

      // PHYSIC tasks
      {
        id: 'task_workout', categoryId: 'cat_physic', name: 'Morning Workout',
        priority: 'high', scheduledTime: '06:00', duration: 45,
        workingWindowStart: '06:00', workingWindowEnd: '07:00',
        whyMatters: 'Strong body = strong mind. Exam ke din bhi fit rehna zaroori hai!',
        notification: { enabled: true, time: '05:55', message: 'Uth ja bhai! Workout time! 💪' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_steps', categoryId: 'cat_physic', name: 'Daily Steps (8000+)',
        priority: 'medium', scheduledTime: '18:00', duration: 30,
        workingWindowStart: '18:00', workingWindowEnd: '20:00',
        whyMatters: 'Daily movement keeps energy high all day — no laziness!',
        notification: { enabled: true, time: '17:50', message: 'Steps count check karo! 🚶' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_yoga', categoryId: 'cat_physic', name: 'Yoga / Stretching',
        priority: 'low', scheduledTime: '07:00', duration: 15,
        workingWindowStart: '07:00', workingWindowEnd: '07:30',
        whyMatters: 'Flexibility and stress relief — 15 min only, koi bahaana nahi!',
        notification: { enabled: true, time: '06:55', message: 'Yoga mat nikaalo! 🧘' },
        notifications: [],
        createdAt: Date.now(), active: true
      },

      // LOOKS tasks
      {
        id: 'task_facewash', categoryId: 'cat_looks', name: 'Face Wash',
        priority: 'medium', scheduledTime: '07:00', duration: 5,
        workingWindowStart: '07:00', workingWindowEnd: '07:30',
        whyMatters: 'Saaf chehra confidence deta hai — 5 min ka kaam hai bhai',
        notification: { enabled: true, time: '06:58', message: 'Face wash karo! 🧼' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_moisturizer', categoryId: 'cat_looks', name: 'Moisturizer',
        priority: 'medium', scheduledTime: '07:10', duration: 3,
        workingWindowStart: '07:10', workingWindowEnd: '07:30',
        whyMatters: 'Skin care is self care — interview mein fresh dikhna chahiye',
        notification: { enabled: true, time: '07:08', message: 'Moisturizer lagao! ✨' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_sunscreen', categoryId: 'cat_looks', name: 'Sunscreen',
        priority: 'medium', scheduledTime: '08:00', duration: 2,
        workingWindowStart: '08:00', workingWindowEnd: '08:30',
        whyMatters: 'UV protection daily — skin long-term ke liye!',
        notification: { enabled: true, time: '07:58', message: 'Sunscreen mat bhoolna! ☀️' },
        notifications: [],
        createdAt: Date.now(), active: true
      },

      // PERSONALLY tasks
      {
        id: 'task_confidence', categoryId: 'cat_personally', name: 'Confidence Practice',
        priority: 'high', scheduledTime: '21:00', duration: 15,
        workingWindowStart: '21:00', workingWindowEnd: '22:00',
        whyMatters: 'Interview mein confidence = selection. Daily affirmations/mirror practice karo',
        notification: { enabled: true, time: '20:55', message: 'Mirror ke saamne jao! 🪞 Confidence practice!' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_posture', categoryId: 'cat_personally', name: 'Posture Check',
        priority: 'low', scheduledTime: '13:00', duration: 5,
        workingWindowStart: '13:00', workingWindowEnd: '14:00',
        whyMatters: 'Good posture = confident body language. Baar baar check karo!',
        notification: { enabled: true, time: '12:58', message: 'Seedha baitho! Posture check! 🧍' },
        notifications: [],
        createdAt: Date.now(), active: true
      },
      {
        id: 'task_project', categoryId: 'cat_personally', name: 'Personal Project',
        priority: 'medium', scheduledTime: '21:30', duration: 30,
        workingWindowStart: '21:30', workingWindowEnd: '22:30',
        whyMatters: 'Side skills build karo — jo RRB ke baad bhi kaam aayega',
        notification: { enabled: true, time: '21:25', message: 'Project pe kaam karo! 🛠️' },
        notifications: [],
        createdAt: Date.now(), active: true
      }
    ],

    // history[] — one entry per task per day
    // { id, taskId, categoryId, date (YYYY-MM-DD), completed, missedReason, missedNote, score, completedAt }
    history: [],

    streaks: {
      current: 0,
      longest: 0,
      lastCompletedDate: null   // YYYY-MM-DD of last day streak target was met
    },

    settings: {
      theme: 'dark',            // 'dark' | 'light' | 'system'
      targetPercent: 80,        // Daily score % needed for streak
      weekStart: 1,             // 1=Monday, 0=Sunday
      notifWindowFrom: '06:00',
      notifWindowTo: '23:00',
      coachApiKey: '',
      coachApiKey2: '',           // 2nd Gemini API key (auto-switched when key1 hits limit)
      coachApiKey3: '',           // 3rd Gemini API key (auto-switched when key2 hits limit)
      coachApiKey4: '',           // 4th Gemini API key (round-robin rotation)
      coachApiKey5: '',           // 5th Gemini API key (round-robin rotation)
      apiKeyStats: {},            // per-key RPD/RPM usage tracker for smart switching
      coachProvider: 'gemini',
      geminiModel: 'gemini-2.5-flash',      // 'gemini-2.5-flash' | 'gemini-2.0-flash'
      geminiSearchEnabled: true,             // Enable Google Search grounding
      coachPersonality: 'beast',
      coachPrompt: '',           // Account 4 sets default
      coachStrictness: 80,
      coachCustomInstructions: '',  // legacy — kept for migration
      egoLifeGoals: '',             // Block 1: What user wants to achieve in life
      egoNegativeWords: '',         // Block 2: What others say negatively about user

      // Ego AI Mode: Auto-Coach Notifications (editable count)
      autoCoachEnabled: false,
      autoCoachMaxPerDay: 3,         // User can edit: max auto-checks per day (1–15)
      autoCoachTimes: [
        { id: 'ac_1', time: '12:00', enabled: true },
        { id: 'ac_2', time: '16:00', enabled: true },
        { id: 'ac_3', time: '23:00', enabled: true }
      ],
      autoCoachPersonality: 'beast',
      lastAutoCoachFired: {},   // { 'YYYY-MM-DD_HH:MM': true }

      // ── Ego: Last 7 Days Report (fires daily at set time) ──
      last7DaysReportEnabled: false,
      last7DaysReportTime: '20:00',
      lastLast7DaysReportFired: {},  // { 'YYYY-MM-DD': true }

      // ── Ego: Overall Progress Report (Day 1 to now, fires daily) ──
      overallProgressEnabled: false,
      overallProgressTime: '21:30',
      lastOverallProgressFired: {},  // { 'YYYY-MM-DD': true }

      // ── Josh: Last 7 Days Report ──
      joshLast7DaysEnabled: false,
      joshLast7DaysTime: '20:30',
      lastJoshLast7DaysFired: {},   // { 'YYYY-MM-DD': true }

      // ── Josh: Overall Progress Report ──
      joshOverallProgressEnabled: false,
      joshOverallProgressTime: '22:00',
      lastJoshOverallProgressFired: {},  // { 'YYYY-MM-DD': true }

      // ── MY-JOSH Settings ──
      joshPersonality: 'energetic',     // 'energetic' | 'calm' | 'beast'
      joshAutoEnabled: false,
      joshAutoMaxPerDay: 3,             // 1–10
      joshAutoTimes: [
        { id: 'jt_1', time: '07:00', enabled: true },
        { id: 'jt_2', time: '12:00', enabled: true }
      ],
      joshPrompt: '',                   // Editable auto prompt (empty = use default by personality)
      lastJoshAutoFired: {},            // { 'YYYY-MM-DD_HH:MM': true }
      // Telegram delivery settings
      telegramBotToken: '',
      telegramChatId: ''
    },

    // Account 4 adds:
    conversations: [],
    joshConversations: [],      // Tera-Josh chat history (separate from Tera-Ego)
    egoInbox:  [],   // [{id, triggerTime, date, timestamp, response, status}]
    joshInbox: [],   // same structure
    badges: [],
    level: 1,
    totalTasksCompleted: 0,

    // Sort order for TODAY screen
    sortOrder: 'time'           // 'time' | 'priority' | 'category'
  };
}

/* ─────────────────────────────────────────────
   DATA PERSISTENCE
───────────────────────────────────────────── */
let appData = null;

/* ─────────────────────────────────────────────
   APP STATE TRACKING
   Used to decide: foreground / background / killed
   _appInForeground = true  → app is open & visible
   _appInForeground = false → app is in background (screen off / switched)
   _appWasKilled    = true  → app was force-killed or not running (set on init)
───────────────────────────────────────────── */
let _appInForeground = true;
let _appWasKilled    = false;

/* ─────────────────────────────────────────────
   PENDING AUTO-RESPONSE QUEUE
   When app was killed and pre-scheduled notifications fired,
   on return to app we queue the missed Ego/Josh Gemini responses
   and fire them one-by-one with 1-minute gaps.
───────────────────────────────────────────── */
let _pendingAutoQueue = [];   // [{ type: 'ego'|'josh', time: 'HH:MM' }, ...]
let _queueProcessing  = false;

// ── Guard: blocks saveData from cancelling ALL pending notifications
// during an active API response pipeline. Set true before API call, false after.
// Without this, the pipeline's saveData() call cancels nearby-scheduled notifications.
let _suppressNotifReschedule = false;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    // Account 2: sync notification data to service worker for background delivery
    syncNotificationDataToSW();
    // Account 5: reschedule Capacitor native notifications when data changes
    // SKIP if a notification response pipeline is actively running — rescheduling
    // cancels ALL pending notifications which kills any nearby-scheduled ones.
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      if (!_suppressNotifReschedule) {
        setTimeout(scheduleAllCapacitorNotifications, 600);
      }
    }
  } catch (e) {
    console.error('Save failed:', e);
    showToast('⚠️ Data save nahi hua — storage full ho sakta hai');
  }
}

/* ─────────────────────────────────────────────
   ACCOUNT 2 — syncNotificationDataToSW
   Sends appData snapshot to service worker cache
   so background reminders work when page is closed.
───────────────────────────────────────────── */
function syncNotificationDataToSW() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  try {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_NOTIFICATION_DATA',
      payload: appData
    });
  } catch (e) {
    // Non-critical — SW will try again on next save
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      appData = getDefaultData();
      saveData();
      return;
    }
    const parsed = JSON.parse(raw);
    appData = migrateData(parsed);
    saveData();
  } catch (e) {
    console.error('Load failed:', e);
    appData = getDefaultData();
    saveData();
  }
}

/* ─────────────────────────────────────────────
   DATA MIGRATION
   When DATA_VERSION changes, this upgrades old data
   while preserving everything
───────────────────────────────────────────── */
function migrateData(old) {
  const current = getDefaultData();

  if (!old.version || old.version < DATA_VERSION) {
    console.log('Migrating data from v' + (old.version || 0) + ' to v' + DATA_VERSION);
  }

  // Merge: keep old data, add any missing top-level keys
  const merged = Object.assign({}, current, old);

  // Ensure settings has all keys (Account 4 adds coach fields)
  merged.settings = Object.assign({}, current.settings, old.settings || {});

  // Ensure each task has notifications[] (added in Account 2)
  // Account 2 also adds workingWindowStart / workingWindowEnd
  if (merged.tasks) {
    merged.tasks = merged.tasks.map(t => ({
      ...t,
      notification: t.notification || { enabled: false, time: t.scheduledTime || '08:00', message: '' },
      notifications: t.notifications || [],
      workingWindowStart: t.workingWindowStart || t.scheduledTime || '07:00',
      workingWindowEnd:   t.workingWindowEnd   !== undefined ? t.workingWindowEnd : ''
    }));
  }

  // Account 2: migrate history entries to include effort fields
  if (merged.history) {
    merged.history = merged.history.map(h => ({
      ...h,
      effortScore:    h.effortScore    !== undefined ? h.effortScore    : 0,
      isUntracked:    h.isUntracked    !== undefined ? h.isUntracked    : false,
      effortDeclared: h.effortDeclared !== undefined ? h.effortDeclared : false
    }));
  }

  // Account 4: ensure gamification fields exist
  if (merged.conversations === undefined) merged.conversations = [];
  if (merged.joshConversations === undefined) merged.joshConversations = [];
  if (merged.badges       === undefined) merged.badges        = [];
  if (!merged.level)                     merged.level         = 1;
  if (merged.totalTasksCompleted === undefined) {
    // Reconstruct from history if possible
    merged.totalTasksCompleted = (merged.history || []).filter(h => h.completed).length;
  }

  // Tera-Josh settings migration
  if (!merged.settings.joshPersonality)               merged.settings.joshPersonality     = 'energetic';
  if (merged.settings.joshAutoEnabled === undefined)   merged.settings.joshAutoEnabled     = false;
  if (!merged.settings.joshAutoMaxPerDay)              merged.settings.joshAutoMaxPerDay   = 3;
  if (!merged.settings.joshAutoTimes || !merged.settings.joshAutoTimes.length) {
    merged.settings.joshAutoTimes = [
      { id: 'jt_1', time: '07:00', enabled: true },
      { id: 'jt_2', time: '12:00', enabled: true }
    ];
  }
  if (merged.settings.joshPrompt === undefined)        merged.settings.joshPrompt          = '';
  if (!merged.settings.lastJoshAutoFired)              merged.settings.lastJoshAutoFired   = {};

  // Gemini migration: migrate from groq provider
  if (merged.settings.coachProvider === 'groq') merged.settings.coachProvider = 'gemini';
  if (!merged.settings.geminiModel)             merged.settings.geminiModel   = 'gemini-2.5-flash';
  if (merged.settings.geminiSearchEnabled === undefined) merged.settings.geminiSearchEnabled = true;
  if (merged.settings.coachApiKey2 === undefined) merged.settings.coachApiKey2 = '';
  if (merged.settings.coachApiKey3 === undefined) merged.settings.coachApiKey3 = '';
  if (merged.settings.coachApiKey4 === undefined) merged.settings.coachApiKey4 = '';
  if (merged.settings.coachApiKey5 === undefined) merged.settings.coachApiKey5 = '';
  if (!merged.settings.apiKeyStats)              merged.settings.apiKeyStats   = {};

  // Ego AI Mode: ensure auto-coach fields exist in settings
  if (merged.settings.autoCoachEnabled === undefined)  merged.settings.autoCoachEnabled  = false;
  if (!merged.settings.autoCoachMaxPerDay)             merged.settings.autoCoachMaxPerDay = 3;
  if (!merged.settings.autoCoachTimes || !merged.settings.autoCoachTimes.length) {
    merged.settings.autoCoachTimes = [
      { id: 'ac_1', time: '12:00', enabled: true },
      { id: 'ac_2', time: '16:00', enabled: true },
      { id: 'ac_3', time: '23:00', enabled: true }
    ];
  }
  if (!merged.settings.autoCoachPersonality)  merged.settings.autoCoachPersonality  = 'beast';
  if (!merged.settings.lastAutoCoachFired)     merged.settings.lastAutoCoachFired    = {};

  // Migrate old weekly/daily report fields → new last7days/overall fields
  if (merged.settings.last7DaysReportEnabled === undefined)
    merged.settings.last7DaysReportEnabled = merged.settings.weeklyReportEnabled || false;
  if (!merged.settings.last7DaysReportTime)
    merged.settings.last7DaysReportTime = merged.settings.weeklyReportTime || '20:00';
  if (!merged.settings.lastLast7DaysReportFired)
    merged.settings.lastLast7DaysReportFired = {};

  if (merged.settings.overallProgressEnabled === undefined)
    merged.settings.overallProgressEnabled = merged.settings.dailyProgressEnabled || false;
  if (!merged.settings.overallProgressTime)
    merged.settings.overallProgressTime = merged.settings.dailyProgressTime || '21:30';
  if (!merged.settings.lastOverallProgressFired)
    merged.settings.lastOverallProgressFired = merged.settings.lastDailyProgressFired || {};

  // Josh last7days + overall progress migration
  if (merged.settings.joshLast7DaysEnabled === undefined) merged.settings.joshLast7DaysEnabled = false;
  if (!merged.settings.joshLast7DaysTime) merged.settings.joshLast7DaysTime = '20:30';
  if (!merged.settings.lastJoshLast7DaysFired) merged.settings.lastJoshLast7DaysFired = {};
  if (merged.settings.joshOverallProgressEnabled === undefined) merged.settings.joshOverallProgressEnabled = false;
  if (!merged.settings.joshOverallProgressTime) merged.settings.joshOverallProgressTime = '22:00';
  if (!merged.settings.lastJoshOverallProgressFired) merged.settings.lastJoshOverallProgressFired = {};

  // Ego Mode: new fields
  if (merged.settings.egoLifeGoals    === undefined) merged.settings.egoLifeGoals    = '';
  if (merged.settings.egoNegativeWords === undefined) merged.settings.egoNegativeWords = '';

  // New: Telegram settings
  if (!merged.settings.telegramBotToken) merged.settings.telegramBotToken = '';
  if (!merged.settings.telegramChatId)   merged.settings.telegramChatId   = '';

  // New: Inbox arrays
  if (!merged.egoInbox)  merged.egoInbox  = [];
  if (!merged.joshInbox) merged.joshInbox = [];

  merged.version = DATA_VERSION;
  return merged;
}

/* ─────────────────────────────────────────────
   SCREEN ROUTING
───────────────────────────────────────────── */
let currentScreen = 'today';

const _SCREEN_ORDER = ['today','categories','progress','coach','inbox','settings'];

function showScreen(name) {
  const prevIdx = _SCREEN_ORDER.indexOf(currentScreen || 'today');
  const nextIdx = _SCREEN_ORDER.indexOf(name);

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const screen = document.getElementById('screen-' + name);
  if (screen) {
    screen.classList.add('active');
    if (currentScreen && currentScreen !== name) {
      const slideClass = nextIdx >= prevIdx ? 'screen-slide-from-right' : 'screen-slide-from-left';
      screen.classList.add(slideClass);
      requestAnimationFrame(() => requestAnimationFrame(() => screen.classList.remove(slideClass)));
    }
  }

  const navBtn = document.querySelector('.nav-btn[data-screen="' + name + '"]');
  if (navBtn) navBtn.classList.add('active');

  currentScreen = name;

  if (name === 'today')      renderTodayScreen();
  if (name === 'categories') renderCategoriesScreen();
  if (name === 'progress')   renderProgressScreen();
  if (name === 'settings')   renderSettingsScreen();
  if (name === 'coach')      renderCoachScreen();
  if (name === 'inbox')      renderInboxScreen();
}

/* ─────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────── */
function getTodayStr() {
  // Force Indian Standard Time (UTC+5:30) regardless of device timezone
  const d = getNowISTDate();
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function getYesterdayStr() {
  const d = getNowISTDate();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2,'0')} ${period}`;
}

/* ─────────────────────────────────────────────
   SCORING ENGINE
   Called after any completion change
───────────────────────────────────────────── */
function getDailyScore(dateStr) {
  const tasks = appData.tasks.filter(t => t.active !== false);
  if (!tasks.length) return { score: 0, earned: 0, total: 0, done: 0, effortAvg: 0, taskCount: 0 };

  let total = 0, earnedRaw = 0, done = 0, effortSum = 0, effortCount = 0;
  tasks.forEach(t => {
    const pts = PRIORITY_POINTS[t.priority] || 2;
    total += pts;
    const entry = appData.history.find(h => h.taskId === t.id && h.date === dateStr);
    if (entry && entry.completed) {
      // Effort factor: if effort was declared use effortScore/10, else full credit
      const effortFactor = entry.effortDeclared
        ? (entry.effortScore || 0) / 10
        : 1.0;
      earnedRaw += pts * effortFactor;
      done++;
      effortSum += (entry.effortScore || 0);
      effortCount++;
    }
    // Untracked or not-completed = 0 contribution
  });

  const score = total > 0 ? Math.round((earnedRaw / total) * 100) : 0;
  const effortAvg = effortCount > 0 ? Math.round(effortSum / effortCount) : 0;
  // earned as displayable number (rounded to 1 decimal for display)
  const earned = Math.round(earnedRaw * 10) / 10;
  return { score, earned, total, done, taskCount: tasks.length, effortAvg };
}

function getCategoryScore(catId, dateStr) {
  const tasks = appData.tasks.filter(t => t.categoryId === catId && t.active !== false);
  if (!tasks.length) return { score: 0, done: 0, total: 0 };
  let pts = 0, earnedRaw = 0, done = 0;
  tasks.forEach(t => {
    const p = PRIORITY_POINTS[t.priority] || 2;
    pts += p;
    const entry = appData.history.find(h => h.taskId === t.id && h.date === dateStr);
    if (entry && entry.completed) {
      const effortFactor = entry.effortDeclared ? (entry.effortScore || 0) / 10 : 1.0;
      earnedRaw += p * effortFactor;
      done++;
    }
  });
  return { score: pts > 0 ? Math.round((earnedRaw / pts) * 100) : 0, done, total: tasks.length };
}

function getWeeklyAvg() {
  let sum = 0, count = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const s = getDailyScore(ds);
    if (s.total > 0) { sum += s.score; count++; }
  }
  return count > 0 ? Math.round(sum / count) : 0;
}

function getAllTimeAvg() {
  // Find all unique dates in history
  const dates = [...new Set(appData.history.map(h => h.date))];
  if (!dates.length) return 0;
  let sum = 0, count = 0;
  dates.forEach(d => {
    const s = getDailyScore(d);
    if (s.total > 0) { sum += s.score; count++; }
  });
  return count > 0 ? Math.round(sum / count) : 0;
}

/* ─────────────────────────────────────────────
   STREAK ENGINE
───────────────────────────────────────────── */
function updateStreaks() {
  const today = getTodayStr();
  const target = appData.settings.targetPercent || 80;
  const todayScore = getDailyScore(today);

  // Check if today is complete enough
  if (todayScore.score >= target) {
    const last = appData.streaks.lastCompletedDate;
    const yesterday = getYesterdayStr();

    if (last === yesterday) {
      // Continue streak
      appData.streaks.current++;
    } else if (last === today) {
      // Already counted today, no change
    } else {
      // Reset or start new streak
      appData.streaks.current = 1;
    }
    appData.streaks.lastCompletedDate = today;

    if (appData.streaks.current > appData.streaks.longest) {
      appData.streaks.longest = appData.streaks.current;
    }
  }
}

/* ─────────────────────────────────────────────
   TODAY SCREEN
───────────────────────────────────────────── */
function renderTodayScreen() {
  const today = getTodayStr();
  document.getElementById('today-date').textContent = formatDateDisplay(today);

  // Update streak badge
  updateStreaks();
  document.getElementById('streak-count').textContent = appData.streaks.current;

  // Progress
  const scoreData = getDailyScore(today);
  const pct = scoreData.score;
  document.getElementById('today-progress-fill').style.width = pct + '%';
  document.getElementById('today-progress-label').textContent =
    `${scoreData.done}/${scoreData.taskCount} tasks — ${pct}%`;

  // Yesterday misses
  renderYesterdayMisses();

  // Task list
  renderTodayTasks(today);

  // Account 4: Coach CTA on TODAY screen after 8 PM
  const existingCta = document.getElementById('today-screen-coach-cta');
  const hour = new Date().getHours();
  if (hour >= 20) {
    if (!existingCta) {
      const ctaWrap = document.createElement('div');
      ctaWrap.id = 'today-screen-coach-cta';
      ctaWrap.className = 'today-coach-cta-wrap';
      ctaWrap.innerHTML = `<button class="btn-today-coach" onclick="showScreen('coach'); setTimeout(talkToCoach, 400)">🧠 Ego se Baat Karo — Aaj ka Report</button>`;
      const taskListScroll = document.querySelector('.task-list-scroll');
      if (taskListScroll) taskListScroll.after(ctaWrap);
    }
  } else {
    if (existingCta) existingCta.remove();
  }
}

function renderYesterdayMisses() {
  const yesterday = getYesterdayStr();
  const tasks = appData.tasks.filter(t => t.active !== false);
  const missedYesterday = tasks.filter(t => {
    const entry = appData.history.find(h => h.taskId === t.id && h.date === yesterday);
    return !entry || !entry.completed;
  });

  const container = document.getElementById('yesterday-misses');
  if (!missedYesterday.length || yesterday < '2020-01-01') {
    container.classList.add('hidden');
    return;
  }

  // Only show if there's actual history (not first day)
  const hasHistory = appData.history.some(h => h.date === yesterday);
  if (!hasHistory) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="yesterday-misses-title">⚠️ Kal ke ${missedYesterday.length} miss(es)</div>
    ${missedYesterday.map(t => {
      const entry = appData.history.find(h => h.taskId === t.id && h.date === yesterday);
      const cat = appData.categories.find(c => c.id === t.categoryId);
      const hasReason = entry && entry.missedReason;
      return `
        <div class="yesterday-miss-item">
          ❌ ${t.name}
          ${!hasReason ? `<button onclick="askMissedReason('${t.id}','${yesterday}')" style="font-size:0.75rem;margin-left:8px;background:var(--accent-light);border:1px solid var(--accent);border-radius:10px;padding:2px 8px;color:var(--accent);cursor:pointer;">Why?</button>` : `<span style="font-size:0.75rem;color:var(--text-muted);margin-left:6px;">(${formatMissedReason(entry.missedReason)})</span>`}
        </div>`;
    }).join('')}
  `;
}

function formatMissedReason(r) {
  const map = { too_tired: 'Too Tired', forgot: 'Forgot', no_time: 'No Time', not_motivated: 'Not Motivated', other: 'Other' };
  return map[r] || r;
}

function renderTodayTasks(today) {
  const container = document.getElementById('today-task-list');
  const emptyEl   = document.getElementById('today-empty');
  let tasks = appData.tasks.filter(t => t.active !== false);

  // Search filter
  if (taskSearchQuery) {
    tasks = tasks.filter(t => {
      const cat = appData.categories.find(c => c.id === t.categoryId);
      return (t.name + ' ' + (cat ? cat.name : '')).toLowerCase().includes(taskSearchQuery);
    });
  }

  if (!tasks.length) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  // Sort
  const sorted = sortTasks(tasks, appData.sortOrder || 'time');

  // Group by category if sort=category, else just list
  if (appData.sortOrder === 'category') {
    const groups = {};
    sorted.forEach(t => {
      if (!groups[t.categoryId]) groups[t.categoryId] = [];
      groups[t.categoryId].push(t);
    });
    let html = '';
    Object.entries(groups).forEach(([catId, catTasks]) => {
      const cat = appData.categories.find(c => c.id === catId);
      if (!cat) return;
      html += `<div class="task-group-header">
        <div class="task-group-dot" style="background:${cat.color}"></div>
        ${cat.name}
      </div>`;
      catTasks.forEach(t => {
        const entry = appData.history.find(h => h.taskId === t.id && h.date === today);
        html += buildTaskCard(t, entry, today, cat);
      });
    });
    container.innerHTML = html;
  } else {
    let html = '';
    sorted.forEach(t => {
      const cat = appData.categories.find(c => c.id === t.categoryId);
      const entry = appData.history.find(h => h.taskId === t.id && h.date === today);
      html += buildTaskCard(t, entry, today, cat);
    });
    container.innerHTML = html;
  }

  // Init swipe-to-complete gestures
  initSwipeListeners();
}

function sortTasks(tasks, order) {
  const copy = [...tasks];
  if (order === 'time') {
    return copy.sort((a, b) => (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99'));
  }
  if (order === 'priority') {
    const pOrder = { high: 0, medium: 1, low: 2 };
    return copy.sort((a, b) => (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1));
  }
  if (order === 'category') {
    return copy.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  }
  return copy;
}

function buildTaskCard(task, historyEntry, date, cat) {
  const isCompleted = historyEntry && historyEntry.completed;
  const isUntracked = historyEntry && historyEntry.isUntracked;
  const catColor = cat ? cat.color : '#aaa';
  const catName  = cat ? cat.name : '';
  const priLabel = task.priority || 'medium';
  const whyId    = 'why-' + task.id;

  // Effort section data
  const effortScore = (historyEntry && historyEntry.effortScore) ? historyEntry.effortScore : 0;
  const effortPercent = (effortScore / 10) * 100;
  let effortFillClass = '';
  if (effortScore <= 2)      effortFillClass = 'effort-fill--low';
  else if (effortScore <= 4) effortFillClass = 'effort-fill--mid';
  else if (effortScore <= 8) effortFillClass = 'effort-fill--high';
  else                       effortFillClass = 'effort-fill--max';

  const effortDisabled = isUntracked ? 'disabled' : '';
  const effortSectionClass = isUntracked ? 'effort-section effort-section--untracked' : 'effort-section';

  // Working window display
  const wwDisplay = (task.workingWindowStart && task.workingWindowEnd)
    ? `<span class="task-window">🪟 ${formatTime12(task.workingWindowStart)}–${formatTime12(task.workingWindowEnd)}</span>`
    : task.workingWindowStart
    ? `<span class="task-window">▶ ${formatTime12(task.workingWindowStart)}</span>`
    : '';

  return `
  <div class="task-card ${isCompleted ? 'completed' : ''} ${isUntracked ? 'untracked' : ''}" id="card-${task.id}"
       style="border-left-color: ${catColor}">
    <div class="task-card-main">
      <button class="task-checkbox" onclick="toggleTaskComplete('${task.id}', '${date}')" title="Complete toggle">
        ${isCompleted ? '✓' : ''}
      </button>
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-meta">
          ${wwDisplay}
          <span class="priority-badge ${priLabel}">${priLabel.toUpperCase()}</span>
          <span class="cat-badge" style="background:${catColor}">${escapeHtml(catName)}</span>
          ${task.duration ? `<span class="task-time">⏱ ${task.duration}m</span>` : ''}
        </div>
      </div>
      ${task.whyMatters ? `<button class="task-why-toggle" onclick="toggleWhy('${whyId}')" title="Why this matters">💡</button>` : ''}
    </div>
    ${task.whyMatters ? `<div class="task-why-content" id="${whyId}">"${escapeHtml(task.whyMatters)}"</div>` : ''}
    <!-- Effort Declaration Section (Account 2) -->
    <div class="${effortSectionClass}">
      <div class="effort-label">
        Effort: <span class="effort-value" id="effort-val-${task.id}">${effortScore}</span>/10
        ${isUntracked ? '<span class="untracked-badge">⚠️ Window Closed</span>' : ''}
      </div>
      <div class="effort-controls">
        <button class="effort-btn minus" onclick="adjustEffort('${task.id}', '${date}', -2)" ${effortDisabled}>−</button>
        <div class="effort-bar">
          <div class="effort-fill ${effortFillClass}" style="width:${effortPercent}%"></div>
        </div>
        <button class="effort-btn plus" onclick="adjustEffort('${task.id}', '${date}', 2)" ${effortDisabled}>+</button>
      </div>
    </div>
    <div class="task-actions">
      <button class="task-action-btn" onclick="openEditTask('${task.id}')">✏️ Edit</button>
      <button class="task-action-btn focus-action" onclick="openFocusTimer('${task.id}')">🎯 Focus</button>
      <button class="task-action-btn danger" onclick="confirmDeleteTask('${task.id}')">🗑 Delete</button>
    </div>
  </div>`;
}

function toggleTaskComplete(taskId, date) {
  const prevTotal = appData.totalTasksCompleted || 0;
  const entry = appData.history.find(h => h.taskId === taskId && h.date === date);
  if (entry) {
    entry.completed = !entry.completed;
    entry.completedAt = entry.completed ? new Date().toISOString() : null;
    // Adjust total count
    if (!entry.completed) {
      appData.totalTasksCompleted = Math.max(0, (appData.totalTasksCompleted || 0) - 1);
    } else {
      appData.totalTasksCompleted = (appData.totalTasksCompleted || 0) + 1;
      if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
      const _elx = document.getElementById('card-' + taskId);
      if (_elx) { _elx.classList.add('complete-burst'); setTimeout(() => _elx.classList.remove('complete-burst'), 550); }
    }
  } else {
    appData.history.push({
      id: 'h_' + Date.now() + '_' + taskId,
      taskId,
      categoryId: (appData.tasks.find(t => t.id === taskId) || {}).categoryId || '',
      date,
      completed: true,
      completedAt: new Date().toISOString(),
      missedReason: null,
      missedNote: null,
      effortScore: 0,
      isUntracked: false,
      effortDeclared: false
    });
    appData.totalTasksCompleted = (appData.totalTasksCompleted || 0) + 1;
    // Haptic + burst
    if (navigator.vibrate) navigator.vibrate([18, 40, 18]);
    const _el = document.getElementById('card-' + taskId);
    if (_el) { _el.classList.add('complete-burst'); setTimeout(() => _el.classList.remove('complete-burst'), 550); }
  }

  updateStreaks();
  saveData();
  renderTodayScreen();
  checkNotificationForTask(taskId);

  // Account 4: check if 100% day achieved
  const daily = getDailyScore(date);
  if (daily.score >= 100 && daily.taskCount > 0) {
    // Only celebrate once per day (check if not already celebrated)
    const celebKey = 'perfect_' + date;
    if (!sessionStorage.getItem(celebKey)) {
      sessionStorage.setItem(celebKey, '1');
      showCelebration('⭐', 'Perfect Day!', '100% complete — bilkul mast! 🔥');
    }
  }

  // Level up check
  checkLevelUp(prevTotal);

  // Badge check (async, non-blocking)
  setTimeout(checkAndAwardBadges, 500);
}

function toggleWhy(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.toggle('visible');
}

/* ─────────────────────────────────────────────
   ACCOUNT 2 — adjustEffort
   Adjusts the effort score (0–10, step 2) for a task on a given date
───────────────────────────────────────────── */
function adjustEffort(taskId, date, delta) {
  let entry = appData.history.find(h => h.taskId === taskId && h.date === date);
  if (!entry) {
    // Create a history entry if it doesn't exist
    entry = {
      id: 'h_' + Date.now() + '_' + taskId,
      taskId,
      categoryId: (appData.tasks.find(t => t.id === taskId) || {}).categoryId || '',
      date,
      completed: false,
      completedAt: null,
      missedReason: null,
      missedNote: null,
      effortScore: 0,
      isUntracked: false,
      effortDeclared: false
    };
    appData.history.push(entry);
  }
  if (entry.isUntracked) return; // Can't adjust effort on untracked

  const newScore = Math.min(10, Math.max(0, (entry.effortScore || 0) + delta));
  entry.effortScore = newScore;
  entry.effortDeclared = true;
  saveData();
  renderTodayScreen();
}

/* ─────────────────────────────────────────────
   ACCOUNT 2 — checkWorkingWindowExpiry
   Auto-marks tasks as untracked once their working window closes
───────────────────────────────────────────── */
function checkWorkingWindowExpiry() {
  const today = getTodayStr();
  const hhmm  = getNowISTHHMM(); // IST time

  let changed = false;

  appData.tasks.forEach(task => {
    if (!task.active) return;
    if (!task.workingWindowEnd) return;
    if (hhmm < task.workingWindowEnd) return; // Window still open

    // Window has closed — check if task was completed
    const entry = appData.history.find(h => h.taskId === task.id && h.date === today);

    if (!entry) {
      // Never touched → create untracked entry
      appData.history.push({
        id: 'h_' + Date.now() + '_' + task.id + '_auto',
        taskId: task.id,
        categoryId: task.categoryId || '',
        date: today,
        completed: false,
        completedAt: null,
        missedReason: null,
        missedNote: null,
        effortScore: 0,
        isUntracked: true,
        effortDeclared: false
      });
      changed = true;
    } else if (!entry.completed && !entry.isUntracked) {
      // Exists but not done, not yet marked untracked
      entry.isUntracked = true;
      entry.effortScore = 0;
      changed = true;
    }
    // If completed → do NOT mark as untracked
  });

  if (changed) {
    saveData();
    if (currentScreen === 'today') renderTodayScreen();
  }
}

function setSortOrder(order) {
  appData.sortOrder = order;
  saveData();
  // Update button states
  document.querySelectorAll('.sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === order);
  });
  renderTodayTasks(getTodayStr());
}

/* ─────────────────────────────────────────────
   CATEGORIES SCREEN
───────────────────────────────────────────── */
function renderCategoriesScreen() {
  const container = document.getElementById('category-list');
  const today = getTodayStr();

  if (!appData.categories.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📁</div>
      <p>Koi category nahi hai</p>
      <p class="empty-sub">Upar "+ Category" button se add karo</p>
    </div>`;
    return;
  }

  container.innerHTML = appData.categories.map(cat => {
    const tasks = appData.tasks.filter(t => t.categoryId === cat.id && t.active !== false);
    const scoreData = getCategoryScore(cat.id, today);

    return `
    <div class="category-card" id="catcard-${cat.id}" style="border-left-color:${cat.color}">
      <div class="category-header" onclick="toggleCategory('${cat.id}')">
        <div class="category-color-dot" style="background:${cat.color}"></div>
        <div class="category-name">${escapeHtml(cat.name)}</div>
        <div class="category-stats">
          ${tasks.length} tasks<br>
          Today: ${scoreData.score}%
        </div>
        <span class="category-chevron">▾</span>
      </div>
      <div class="category-actions">
        <button class="category-action-btn" onclick="openEditCategory('${cat.id}')">✏️ Edit</button>
        <button class="category-action-btn danger" onclick="confirmDeleteCategory('${cat.id}')">🗑 Delete</button>
      </div>
      <div class="category-tasks" id="cat-tasks-${cat.id}">
        ${tasks.length === 0 ? `<p class="muted small" style="padding:12px 0">Koi task nahi. Neeche button se add karo.</p>` : ''}
        ${tasks.map(t => buildCatTaskItem(t)).join('')}
        <button class="add-task-to-cat-btn" onclick="openAddTaskToCategory('${cat.id}')">+ Task Add Karo</button>
      </div>
    </div>`;
  }).join('');
}

function buildCatTaskItem(task) {
  const priLabel = task.priority || 'medium';
  return `
  <div class="category-task-item">
    <span class="priority-badge ${priLabel}">${priLabel}</span>
    <span class="cat-task-name">${escapeHtml(task.name)}
      ${task.scheduledTime ? `<span class="muted small"> · ${formatTime12(task.scheduledTime)}</span>` : ''}
    </span>
    <div class="cat-task-actions">
      <button class="cat-task-btn" onclick="openEditTask('${task.id}')">✏️</button>
      <button class="cat-task-btn danger" onclick="confirmDeleteTask('${task.id}')">🗑</button>
    </div>
  </div>`;
}

function toggleCategory(catId) {
  const card = document.getElementById('catcard-' + catId);
  if (card) card.classList.toggle('expanded');
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 3 — DEEP ANALYTICS ENGINE
   Builds: PROGRESS screen with Daily / Weekly / Overall reports,
           Chart.js charts, pattern detection, getCoachData()
   Built by: Account 3
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   PROGRESS SCREEN STATE
───────────────────────────────────────────── */
let progressCurrentTab  = 'daily';
let progressViewDate    = getTodayStr();  // date shown in daily view
let progressCharts      = {};            // Chart.js instances (keyed by canvas id)

/* ─────────────────────────────────────────────
   MAIN RENDER DISPATCHER
───────────────────────────────────────────── */
function renderProgressScreen() {
  progressViewDate = progressViewDate || getTodayStr();
  renderReportTab(progressCurrentTab);
}

/* ─────────────────────────────────────────────
   TAB SWITCHING
───────────────────────────────────────────── */
function switchReportTab(tab) {
  progressCurrentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.report-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Show/hide content panels — support both 'last7days' and legacy 'weekly' id
  ['daily','last7days','weekly','overall'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.classList.toggle('hidden', t !== tab && !(tab === 'last7days' && t === 'weekly'));
  });

  // Show/hide date nav (only for daily)
  const dateNav = document.getElementById('date-nav');
  if (dateNav) dateNav.style.display = tab === 'daily' ? 'flex' : 'none';

  renderReportTab(tab);
}

function renderReportTab(tab) {
  if (tab === 'daily')    renderDailyReport();
  if (tab === 'last7days' || tab === 'weekly') renderWeeklyReport();
  if (tab === 'overall')  renderOverallReport();
}

/* ─────────────────────────────────────────────
   DATE NAVIGATION (Daily tab)
───────────────────────────────────────────── */
function progressNavDate(delta) {
  const d = new Date(progressViewDate + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const today = getTodayStr();
  const newDate = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  // Don't go into future
  if (newDate > today) return;
  progressViewDate = newDate;
  renderDailyReport();
}

/* ─────────────────────────────────────────────
   HELPER: dateStr N days ago
───────────────────────────────────────────── */
function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

/* ─────────────────────────────────────────────
   HELPER: score color class
───────────────────────────────────────────── */
function scoreColorClass(pct) {
  if (pct >= 90) return 'score-a-plus';
  if (pct >= 80) return 'score-a';
  if (pct >= 70) return 'score-b';
  if (pct >= 60) return 'score-c';
  if (pct >= 50) return 'score-d';
  return 'score-f';
}

/* ─────────────────────────────────────────────
   HELPER: letter grade
───────────────────────────────────────────── */
function getGrade(pct) {
  if (pct >= 95) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 75) return 'B+';
  if (pct >= 65) return 'B';
  if (pct >= 55) return 'C+';
  if (pct >= 45) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

/* ─────────────────────────────────────────────
   HELPER: get category by id
───────────────────────────────────────────── */
function getCatById(id) {
  return appData.categories.find(c => c.id === id) || { name: 'Unknown', color: '#888' };
}

/* ─────────────────────────────────────────────
   HELPER: missed reason label
───────────────────────────────────────────── */
function missedReasonLabel(reason) {
  const map = {
    too_tired: '😴 Too Tired',
    forgot: '🤦 Forgot',
    no_time: '⏰ No Time',
    not_motivated: '😔 Not Motivated',
    other: '💬 Other'
  };
  return map[reason] || reason || '';
}

/* ─────────────────────────────────────────────
   HELPER: destroy existing chart safely
───────────────────────────────────────────── */
function destroyChart(id) {
  if (progressCharts[id]) {
    try { progressCharts[id].destroy(); } catch(e) {}
    delete progressCharts[id];
  }
}

/* ─────────────────────────────────────────────
   HELPER: get CSS variable value
───────────────────────────────────────────── */
function getCssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

/* ═══════════════════════════════════════════════
   DAILY REPORT
═══════════════════════════════════════════════ */
function renderDailyReport() {
  const date  = progressViewDate;
  const today = getTodayStr();

  // Update date nav
  const navLabel = document.getElementById('date-nav-label');
  if (navLabel) {
    navLabel.textContent = date === today ? 'Aaj — ' + formatDateDisplay(date) : formatDateDisplay(date);
  }
  const nextBtn = document.getElementById('date-nav-next');
  if (nextBtn) nextBtn.disabled = date >= today;

  const dateNav = document.getElementById('date-nav');
  if (dateNav) dateNav.style.display = 'flex';

  const daily = getDailyScore(date);
  const tasks = appData.tasks.filter(t => t.active !== false);

  // ── Hero section ──
  const heroEl = document.getElementById('daily-hero');
  if (heroEl) {
    const colorClass = scoreColorClass(daily.score);
    heroEl.innerHTML = `
      <div class="hero-score ${colorClass}">${daily.score}%</div>
      <div class="hero-sub">${daily.done}/${daily.taskCount} tasks · ${daily.earned}/${daily.total} pts</div>
      <div class="hero-streak">🔥 ${appData.streaks.current} day streak · Target: ${appData.settings.targetPercent || 80}%
        ${daily.score >= (appData.settings.targetPercent || 80)
          ? '<span class="streak-ok">✅ Met</span>'
          : '<span class="streak-risk">⚠️ At risk</span>'
        }
      </div>
    `;
  }

  // ── Category breakdown ──
  const breakdownEl = document.getElementById('daily-category-breakdown');
  if (!breakdownEl) return;

  let breakdownHtml = '';
  appData.categories.forEach(cat => {
    const catTasks = tasks.filter(t => t.categoryId === cat.id);
    if (!catTasks.length) return;

    const catScore = getCategoryScore(cat.id, date);
    const gradeStr = getGrade(catScore.score);

    breakdownHtml += `
      <div class="cat-breakdown-card">
        <div class="cat-breakdown-header" onclick="toggleCatBreakdown('cbd_${cat.id}')">
          <div class="cat-breakdown-dot" style="background:${cat.color}"></div>
          <span class="cat-breakdown-name">${escapeHtml(cat.name)}</span>
          <div class="cat-breakdown-right">
            <span class="cat-score-badge ${scoreColorClass(catScore.score)}">${catScore.score}%</span>
            <span class="cat-grade-badge">${gradeStr}</span>
            <span class="cat-tasks-done">${catScore.done}/${catTasks.length}</span>
            <span class="cbd-chevron" id="cbd_${cat.id}_chevron">▼</span>
          </div>
        </div>
        <div class="cat-breakdown-tasks" id="cbd_${cat.id}">
          ${catTasks.map(task => {
            const entry = appData.history.find(h => h.taskId === task.id && h.date === date);
            const done  = entry && entry.completed;
            const missed = entry && !entry.completed && entry.missedReason;
            const isUntracked = entry && entry.isUntracked;
            // Effort badge — show only on completed tasks with effort declared
            const effortBadge = done
              ? (entry.effortDeclared
                  ? `<span class="task-bd-effort effort-lvl-${Math.min(Math.floor((entry.effortScore||0)/2),5)}">💪${entry.effortScore}/10</span>`
                  : '')
              : (isUntracked
                  ? '<span class="task-bd-untracked">⚠️ Untracked</span>'
                  : '');
            return `
              <div class="task-breakdown-row ${done ? 'done' : isUntracked ? 'untracked' : 'missed'}">
                <span class="task-bd-icon">${done ? '✅' : isUntracked ? '⚠️' : '❌'}</span>
                <span class="task-bd-name">${escapeHtml(task.name)}</span>
                <span class="task-bd-priority priority-${task.priority}">${task.priority[0].toUpperCase()}</span>
                ${missed ? `<span class="task-bd-reason">${missedReasonLabel(entry.missedReason)}</span>` : ''}
                ${effortBadge}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  breakdownEl.innerHTML = breakdownHtml || '<p class="muted">Koi tasks nahi hain.</p>';

  // ── Insights ──
  renderDailyInsights(date, tasks);

  // ── Coach CTA (after 8 PM on today's date) ──
  const ctaEl = document.getElementById('daily-coach-cta');
  if (ctaEl) {
    const hour = new Date().getHours();
    ctaEl.classList.toggle('hidden', !(date === today && hour >= 20));
  }
}

function toggleCatBreakdown(id) {
  const el = document.getElementById(id);
  const ch = document.getElementById(id + '_chevron');
  if (!el) return;
  const isHidden = el.classList.toggle('hidden');
  if (ch) ch.textContent = isHidden ? '▶' : '▼';
}

/* ─────────────────────────────────────────────
   DAILY INSIGHTS
───────────────────────────────────────────── */
function renderDailyInsights(date, tasks) {
  const insightsEl    = document.getElementById('daily-insights');
  const insightTitle  = document.getElementById('daily-insights-title');
  if (!insightsEl) return;

  const insights = [];

  // Check consecutive misses per task (last 3 days)
  tasks.forEach(task => {
    let consecutive = 0;
    for (let i = 0; i < 7; i++) {
      const d = dateNDaysAgo(i);
      const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
      if (entry && !entry.completed) consecutive++;
      else break;
    }
    if (consecutive >= 2) {
      insights.push(`⚠️ <strong>${escapeHtml(task.name)}</strong> — ${consecutive} consecutive dino se miss! Kyun ho raha hai yaar?`);
    }
  });

  // Check category perfection
  appData.categories.forEach(cat => {
    const catScore = getCategoryScore(cat.id, date);
    if (catScore.score === 100 && catScore.total > 0) {
      insights.push(`🌟 <strong>${escapeHtml(cat.name)}</strong> — Perfect category! Wah bhai! 💯`);
    }
  });

  // Check overall 100%
  const daily = getDailyScore(date);
  if (daily.score === 100) {
    insights.push(`🎉 Perfect Day! Aaj toh sab kuch kiya bhai! Ekdum champion! 🏆`);
  }

  if (insights.length > 0) {
    insightTitle.style.display = '';
    insightsEl.innerHTML = insights.map(i => `<div class="insight-row">${i}</div>`).join('');
  } else {
    insightTitle.style.display = 'none';
    insightsEl.innerHTML = '';
  }
}

/* ═══════════════════════════════════════════════
   WEEKLY REPORT
═══════════════════════════════════════════════ */
function renderWeeklyReport() {
  const today = getTodayStr();

  // Build 7-day window (last 7 days including today)
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(dateNDaysAgo(i));

  // Compute daily scores
  const dailyScores = days.map(d => getDailyScore(d));
  const validScores = dailyScores.filter(s => s.total > 0);
  const weeklyAvg   = validScores.length
    ? Math.round(validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length)
    : 0;

  // Best/worst day
  let bestDay = null, worstDay = null, bestScore = -1, worstScore = 101;
  days.forEach((d, i) => {
    const s = dailyScores[i];
    if (s.total > 0) {
      if (s.score > bestScore)  { bestScore = s.score;  bestDay = d; }
      if (s.score < worstScore) { worstScore = s.score; worstDay = d; }
    }
  });

  // ── Hero ──
  const heroEl = document.getElementById('weekly-hero');
  if (heroEl) {
    heroEl.innerHTML = `
      <div class="hero-score ${scoreColorClass(weeklyAvg)}">${weeklyAvg}%</div>
      <div class="hero-sub">Last 7 days average</div>
      <div class="weekly-best-worst">
        <div class="bw-item">
          <span class="bw-label">Best Day</span>
          <span class="bw-val score-a">${bestDay ? new Date(bestDay+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}) + ' (' + bestScore + '%)' : 'N/A'}</span>
        </div>
        <div class="bw-item">
          <span class="bw-label">Worst Day</span>
          <span class="bw-val score-f">${worstDay ? new Date(worstDay+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'}) + ' (' + worstScore + '%)' : 'N/A'}</span>
        </div>
      </div>
    `;
  }

  // ── 7-day trend chart ──
  renderWeeklyTrendChart(days, dailyScores);

  // ── Category performance table ──
  renderWeeklyCategoryTable(days);

  // ── Pattern detection ──
  renderPatternDetection(days);

  // ── Task rankings ──
  renderWeeklyTaskRankings(days);
}

/* ─────────────────────────────────────────────
   WEEKLY TREND CHART
───────────────────────────────────────────── */
function renderWeeklyTrendChart(days, dailyScores) {
  const canvas = document.getElementById('chart-weekly-trend');
  if (!canvas || typeof Chart === 'undefined') return;

  destroyChart('chart-weekly-trend');

  const labels = days.map(d => new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'}));
  const data   = dailyScores.map(s => s.total > 0 ? s.score : null);

  const accent = '#A29BFE';
  const textColor = getCssVar('--text-secondary') || '#aaa';

  progressCharts['chart-weekly-trend'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score %',
        data,
        borderColor: accent,
        backgroundColor: accent + '33',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: data.map(v => {
          if (v === null) return 'transparent';
          if (v >= 90) return '#55EFC4';
          if (v >= 70) return '#FDCB6E';
          return '#FF6B6B';
        }),
        pointRadius: 5,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.parsed.y !== null ? ctx.parsed.y + '%' : 'No data'
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.07)' }
        },
        x: { ticks: { color: textColor }, grid: { display: false } }
      }
    }
  });
}

/* ─────────────────────────────────────────────
   WEEKLY CATEGORY TABLE (with per-task rows)
───────────────────────────────────────────── */
function renderWeeklyCategoryTable(days) {
  const el = document.getElementById('weekly-category-table');
  if (!el) return;

  const tasks = appData.tasks.filter(t => t.active !== false);
  let html = '';

  appData.categories.forEach(cat => {
    const catTasks = tasks.filter(t => t.categoryId === cat.id);
    if (!catTasks.length) return;

    // 7-day category score
    let catPts = 0, catEarned = 0;
    days.forEach(d => {
      const cs = getCategoryScore(cat.id, d);
      // Weighted sum approach using raw points
      catTasks.forEach(task => {
        const pts = PRIORITY_POINTS[task.priority] || 2;
        catPts += pts;
        const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
        if (entry && entry.completed) catEarned += pts;
      });
    });
    const catWeeklyPct = catPts > 0 ? Math.round((catEarned / catPts) * 100) : 0;

    html += `
      <div class="weekly-cat-block">
        <div class="weekly-cat-header" onclick="toggleCatBreakdown('wcat_${cat.id}')">
          <div class="cat-breakdown-dot" style="background:${cat.color}"></div>
          <span class="weekly-cat-name">${escapeHtml(cat.name)}</span>
          <span class="cat-score-badge ${scoreColorClass(catWeeklyPct)}">${catWeeklyPct}%</span>
          <span class="cat-grade-badge">${getGrade(catWeeklyPct)}</span>
          <span class="cbd-chevron" id="wcat_${cat.id}_chevron">▼</span>
        </div>
        <div class="weekly-cat-tasks" id="wcat_${cat.id}">
          <div class="task-grade-header-row">
            <span>Task</span><span>Days</span><span>Pts</span><span>%</span><span>Grade</span>
          </div>
          ${catTasks.map(task => {
            let doneCount = 0;
            const maxPts = PRIORITY_POINTS[task.priority] * days.length;
            let earnedPts = 0;
            days.forEach(d => {
              const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
              if (entry && entry.completed) {
                doneCount++;
                earnedPts += PRIORITY_POINTS[task.priority] || 2;
              }
            });
            const taskPct = days.length > 0 ? Math.round((doneCount / days.length) * 100) : 0;
            const grade = getGrade(taskPct);
            return `
              <div class="task-grade-row">
                <span class="tgr-name">${escapeHtml(task.name)}</span>
                <span class="tgr-days">${doneCount}/7</span>
                <span class="tgr-pts">${earnedPts}/${maxPts}</span>
                <span class="tgr-pct ${scoreColorClass(taskPct)}">${taskPct}%</span>
                <span class="tgr-grade grade-${grade.replace('+','p')}">${grade}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  el.innerHTML = html || '<p class="muted">Data nahi hai abhi.</p>';
}

/* ─────────────────────────────────────────────
   PATTERN DETECTION ENGINE
───────────────────────────────────────────── */
function detectPatterns(days) {
  const patterns = [];
  const tasks = appData.tasks.filter(t => t.active !== false);
  const DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // 1. Task missed on specific days of week (over last 4 weeks)
  const last28 = [];
  for (let i = 0; i < 28; i++) last28.push(dateNDaysAgo(i));

  tasks.forEach(task => {
    const skipsByDow = [0,0,0,0,0,0,0]; // count misses per DOW
    const totalByDow = [0,0,0,0,0,0,0];

    last28.forEach(d => {
      const dow = new Date(d+'T00:00:00').getDay();
      const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
      if (entry) {
        totalByDow[dow]++;
        if (!entry.completed) skipsByDow[dow]++;
      }
    });

    // Flag DOW where miss rate >= 60% AND at least 2 samples
    for (let dow = 0; dow < 7; dow++) {
      if (totalByDow[dow] >= 2 && (skipsByDow[dow] / totalByDow[dow]) >= 0.6) {
        const pct = Math.round((skipsByDow[dow] / totalByDow[dow]) * 100);
        patterns.push(`📅 <strong>${escapeHtml(task.name)}</strong> ${pct}% ${DOW_NAMES[dow]}s ko skip hota hai`);
      }
    }
  });

  // 2. Common missed reason
  const reasonCounts = {};
  appData.history.filter(h => h.missedReason).forEach(h => {
    reasonCounts[h.missedReason] = (reasonCounts[h.missedReason] || 0) + 1;
  });
  const topReason = Object.entries(reasonCounts).sort((a,b) => b[1]-a[1])[0];
  if (topReason && topReason[1] >= 3) {
    patterns.push(`🔁 Sabse common excuse: <strong>${missedReasonLabel(topReason[0])}</strong> (${topReason[1]} baar)`);
  }

  // 3. Best performing day of week
  const scoreByDow = Array(7).fill(null).map(() => ({ sum: 0, count: 0 }));
  last28.forEach(d => {
    const dow = new Date(d+'T00:00:00').getDay();
    const s = getDailyScore(d);
    if (s.total > 0) { scoreByDow[dow].sum += s.score; scoreByDow[dow].count++; }
  });
  let bestDow = -1, bestDowScore = -1;
  scoreByDow.forEach((data, dow) => {
    if (data.count >= 2) {
      const avg = data.sum / data.count;
      if (avg > bestDowScore) { bestDowScore = avg; bestDow = dow; }
    }
  });
  if (bestDow >= 0) {
    patterns.push(`⭐ Best day of the week: <strong>${DOW_NAMES[bestDow]}s</strong> (avg ${Math.round(bestDowScore)}%)`);
  }

  return patterns;
}

function renderPatternDetection(days) {
  const patternsEl    = document.getElementById('weekly-patterns');
  const patternsTitle = document.getElementById('weekly-patterns-title');
  if (!patternsEl) return;

  const patterns = detectPatterns(days);

  if (patterns.length > 0) {
    patternsTitle.style.display = '';
    patternsEl.innerHTML = patterns.map(p => `<div class="pattern-row">${p}</div>`).join('');
  } else {
    patternsTitle.style.display = 'none';
    patternsEl.innerHTML = '';
  }
}

/* ─────────────────────────────────────────────
   WEEKLY TASK RANKINGS
───────────────────────────────────────────── */
function renderWeeklyTaskRankings(days) {
  const el = document.getElementById('weekly-task-rankings');
  if (!el) return;

  const tasks = appData.tasks.filter(t => t.active !== false);
  const ranked = tasks.map(task => {
    let doneCount = 0;
    days.forEach(d => {
      const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
      if (entry && entry.completed) doneCount++;
    });
    const pct = Math.round((doneCount / days.length) * 100);
    const cat = getCatById(task.categoryId);
    return { task, doneCount, pct, cat };
  }).sort((a, b) => b.pct - a.pct);

  const top3    = ranked.slice(0, 3);
  const bottom3 = ranked.slice(-3).reverse();

  el.innerHTML = `
    <div class="rankings-section">
      <div class="rankings-label">🏆 Best Performers</div>
      ${top3.map((r, i) => `
        <div class="rank-row">
          <span class="rank-num">#${i+1}</span>
          <span class="rank-dot" style="background:${r.cat.color}"></span>
          <span class="rank-name">${escapeHtml(r.task.name)}</span>
          <span class="rank-pct ${scoreColorClass(r.pct)}">${r.pct}%</span>
          <span class="rank-days">${r.doneCount}/7 days</span>
        </div>
      `).join('')}
    </div>
    <div class="rankings-section" style="margin-top:12px">
      <div class="rankings-label">⚠️ Needs Attention</div>
      ${bottom3.map((r, i) => `
        <div class="rank-row">
          <span class="rank-num">#${i+1}</span>
          <span class="rank-dot" style="background:${r.cat.color}"></span>
          <span class="rank-name">${escapeHtml(r.task.name)}</span>
          <span class="rank-pct ${scoreColorClass(r.pct)}">${r.pct}%</span>
          <span class="rank-days">${r.doneCount}/7 days</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════
   OVERALL (ALL-TIME) REPORT
═══════════════════════════════════════════════ */
function renderOverallReport() {
  const today = getTodayStr();
  const allDates = [...new Set(appData.history.map(h => h.date))].sort();
  const totalDaysTracked = allDates.length;

  const allTimeAvg = getAllTimeAvg();
  const totalDone  = appData.history.filter(h => h.completed).length;
  const totalPoss  = appData.history.length;

  // ── Hero ──
  const heroEl = document.getElementById('overall-hero');
  if (heroEl) {
    heroEl.innerHTML = `
      <div class="overall-hero-grid">
        <div class="oh-stat">
          <div class="oh-val ${scoreColorClass(allTimeAvg)}">${allTimeAvg}%</div>
          <div class="oh-label">All-Time Avg</div>
        </div>
        <div class="oh-stat">
          <div class="oh-val">${totalDaysTracked}</div>
          <div class="oh-label">Days Tracked</div>
        </div>
        <div class="oh-stat">
          <div class="oh-val">${totalDone}</div>
          <div class="oh-label">Tasks Done</div>
        </div>
        <div class="oh-stat">
          <div class="oh-val">🔥${appData.streaks.longest}</div>
          <div class="oh-label">Best Streak</div>
        </div>
      </div>
      <div class="hero-sub" style="margin-top:8px">${totalDone}/${totalPoss} total task completions</div>
    `;
  }

  // ── Charts ──
  renderOverallTrendChart(allDates);
  renderCategoryBarChart();

  // ── Heatmap ──
  renderHeatmapCalendar();

  // ── Per-task all-time stats ──
  renderOverallTaskStats(allDates);

  // ── Milestones ──
  renderMilestones(totalDone);

  // ── Streak history panel ──
  renderStreakHistoryPanel();
}

/* ─────────────────────────────────────────────
   30-DAY TREND CHART
───────────────────────────────────────────── */
function renderOverallTrendChart(allDates) {
  const canvas = document.getElementById('chart-overall-trend');
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChart('chart-overall-trend');

  // Last 30 days
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(dateNDaysAgo(i));
  const labels = days.map(d => new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}));
  const data   = days.map(d => {
    const s = getDailyScore(d);
    return s.total > 0 ? s.score : null;
  });

  const textColor = getCssVar('--text-secondary') || '#aaa';

  progressCharts['chart-overall-trend'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Score %',
        data,
        borderColor: '#4ECDC4',
        backgroundColor: '#4ECDC433',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: v => v + '%', maxTicksLimit: 5 },
          grid: { color: 'rgba(255,255,255,0.07)' }
        },
        x: {
          ticks: { color: textColor, maxTicksLimit: 8, maxRotation: 0 },
          grid: { display: false }
        }
      }
    }
  });
}

/* ─────────────────────────────────────────────
   CATEGORY BAR CHART
───────────────────────────────────────────── */
function renderCategoryBarChart() {
  const canvas = document.getElementById('chart-category-bar');
  if (!canvas || typeof Chart === 'undefined') return;
  destroyChart('chart-category-bar');

  const allDates = [...new Set(appData.history.map(h => h.date))];
  const labels   = appData.categories.map(c => c.name);
  const data     = appData.categories.map(cat => {
    const tasks = appData.tasks.filter(t => t.categoryId === cat.id && t.active !== false);
    if (!tasks.length) return 0;
    let pts = 0, earned = 0;
    allDates.forEach(d => {
      tasks.forEach(task => {
        const p = PRIORITY_POINTS[task.priority] || 2;
        pts += p;
        const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
        if (entry && entry.completed) earned += p;
      });
    });
    return pts > 0 ? Math.round((earned / pts) * 100) : 0;
  });
  const colors = appData.categories.map(c => c.color);
  const textColor = getCssVar('--text-secondary') || '#aaa';

  progressCharts['chart-category-bar'] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'BB'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: v => v + '%' },
          grid: { color: 'rgba(255,255,255,0.07)' }
        },
        x: { ticks: { color: textColor }, grid: { display: false } }
      }
    }
  });
}

/* ─────────────────────────────────────────────
   HEATMAP CALENDAR (GitHub-style, 3 months)
───────────────────────────────────────────── */
function renderHeatmapCalendar() {
  const el = document.getElementById('heatmap-calendar');
  if (!el) return;

  const today = new Date();
  // Go back 90 days
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 89);

  // Align to Sunday
  while (startDate.getDay() !== 0) startDate.setDate(startDate.getDate() - 1);

  let html = '<div class="heatmap-grid">';

  // Month labels row
  html += '<div class="heatmap-month-labels">';
  let monthLabeled = {};
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const monthKey = d.getMonth() + '-' + d.getFullYear();
    if (!monthLabeled[monthKey] && d.getDate() <= 7) {
      monthLabeled[monthKey] = true;
      html += `<span>${d.toLocaleDateString('en-IN',{month:'short'})}</span>`;
    }
  }
  html += '</div>';

  // Grid columns (by week)
  html += '<div class="heatmap-weeks">';
  const DOW_LABELS = ['S','M','T','W','T','F','S'];
  html += '<div class="heatmap-dow">' + DOW_LABELS.map(l=>`<span>${l}</span>`).join('') + '</div>';

  let currentWeek = [];
  for (let d = new Date(startDate); ; d.setDate(d.getDate() + 1)) {
    const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const s = getDailyScore(ds);
    const isFuture = d > today;
    const inRange  = d >= new Date(today.getFullYear(), today.getMonth() - 3, 1);

    let colorClass = 'hm-empty';
    if (!isFuture && s.total > 0) {
      if (s.score >= 90)      colorClass = 'hm-green';
      else if (s.score >= 70) colorClass = 'hm-yellow';
      else if (s.score >= 1)  colorClass = 'hm-red';
      else                     colorClass = 'hm-none';
    }

    const title = isFuture ? '' : s.total > 0 ? `${ds}: ${s.score}%` : `${ds}: No data`;
    currentWeek.push(`<div class="hm-cell ${colorClass}" title="${title}"></div>`);

    if (currentWeek.length === 7) {
      html += '<div class="heatmap-week-col">' + currentWeek.join('') + '</div>';
      currentWeek = [];
    }

    if (d >= today) break;
  }
  if (currentWeek.length) {
    // Pad remaining
    while (currentWeek.length < 7) currentWeek.push('<div class="hm-cell hm-empty"></div>');
    html += '<div class="heatmap-week-col">' + currentWeek.join('') + '</div>';
  }
  html += '</div>';

  // Legend
  html += `
    <div class="heatmap-legend">
      <span class="hm-legend-label">Less</span>
      <div class="hm-cell hm-none"></div>
      <div class="hm-cell hm-red"></div>
      <div class="hm-cell hm-yellow"></div>
      <div class="hm-cell hm-green"></div>
      <span class="hm-legend-label">More</span>
    </div>
  `;
  html += '</div>';
  el.innerHTML = html;
}

/* ─────────────────────────────────────────────
   PER-TASK ALL-TIME STATS
───────────────────────────────────────────── */
function renderOverallTaskStats(allDates) {
  const el = document.getElementById('overall-task-stats');
  if (!el) return;

  const tasks = appData.tasks.filter(t => t.active !== false);
  let html = '';

  appData.categories.forEach(cat => {
    const catTasks = tasks.filter(t => t.categoryId === cat.id);
    if (!catTasks.length) return;

    html += `
      <div class="overall-cat-block">
        <div class="overall-cat-header">
          <div class="cat-breakdown-dot" style="background:${cat.color}"></div>
          <span>${escapeHtml(cat.name)}</span>
        </div>
        ${catTasks.map(task => {
          let totalDays = allDates.length;
          let doneDays = 0;
          let earnedPts = 0;
          const pts = PRIORITY_POINTS[task.priority] || 2;

          allDates.forEach(d => {
            const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
            if (entry && entry.completed) { doneDays++; earnedPts += pts; }
          });

          const pct   = totalDays > 0 ? Math.round((doneDays / totalDays) * 100) : 0;
          const grade = getGrade(pct);

          // Trend: compare last 14 days vs prev 14 days
          const last14score = computeTaskPctForRange(task.id, 0, 13);
          const prev14score = computeTaskPctForRange(task.id, 14, 27);
          let trendIcon = '→';
          if (last14score > prev14score + 10) trendIcon = '↗';
          else if (last14score < prev14score - 10) trendIcon = '↘';

          return `
            <div class="task-alltime-row">
              <div class="tar-left">
                <span class="tar-name">${escapeHtml(task.name)}</span>
                <span class="tar-priority priority-${task.priority}">${task.priority}</span>
              </div>
              <div class="tar-right">
                <span class="tar-days">${doneDays}/${totalDays} days</span>
                <span class="tar-pct ${scoreColorClass(pct)}">${pct}%</span>
                <span class="tar-grade grade-${grade.replace('+','p')}">${grade}</span>
                <span class="tar-trend trend-${trendIcon === '↗' ? 'up' : trendIcon === '↘' ? 'down' : 'flat'}">${trendIcon}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  });

  el.innerHTML = html || '<p class="muted">Koi data nahi hai abhi.</p>';
}

function computeTaskPctForRange(taskId, startDaysAgo, endDaysAgo) {
  let done = 0, total = 0;
  for (let i = startDaysAgo; i <= endDaysAgo; i++) {
    const d = dateNDaysAgo(i);
    const entry = appData.history.find(h => h.taskId === taskId && h.date === d);
    if (entry) { total++; if (entry.completed) done++; }
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/* ─────────────────────────────────────────────
   MILESTONE TRACKER
───────────────────────────────────────────── */
function renderMilestones(totalDone) {
  const el = document.getElementById('milestone-tracker');
  if (!el) return;

  const milestones = [
    { count: 10,   icon: '🌱', label: 'Getting Started' },
    { count: 50,   icon: '💪', label: 'Momentum Builder' },
    { count: 100,  icon: '🎯', label: 'Century Club' },
    { count: 250,  icon: '🔥', label: 'Grind Mode' },
    { count: 500,  icon: '⚡', label: 'Half K Club' },
    { count: 1000, icon: '👑', label: 'Task Master' },
    { count: 1500, icon: '🏆', label: 'Legend' },
    { count: 2000, icon: '🌟', label: 'Unstoppable' }
  ];

  let html = '<div class="milestone-list">';
  milestones.forEach(m => {
    const achieved = totalDone >= m.count;
    const progressPct = Math.min(100, Math.round((totalDone / m.count) * 100));
    html += `
      <div class="milestone-item ${achieved ? 'achieved' : 'locked'}">
        <span class="ms-icon">${m.icon}</span>
        <div class="ms-info">
          <span class="ms-label">${m.label}</span>
          <span class="ms-count">${achieved ? '✅ ' : ''}${m.count} tasks</span>
        </div>
        <div class="ms-bar-wrap">
          <div class="ms-bar-fill" style="width:${progressPct}%"></div>
        </div>
        <span class="ms-pct">${achieved ? '✓' : totalDone + '/' + m.count}</span>
      </div>
    `;
  });
  html += '</div>';
  el.innerHTML = html;
}

/* ─────────────────────────────────────────────
   STREAK HISTORY PANEL
───────────────────────────────────────────── */
function renderStreakHistoryPanel() {
  const el = document.getElementById('streak-history-panel');
  if (!el) return;

  const target = appData.settings.targetPercent || 80;
  const allDates = [...new Set(appData.history.map(h => h.date))].sort();

  // Reconstruct streak history from all dates
  let streaks = [];
  let currentStreakLen = 0;
  let currentStreakStart = null;
  let prevDate = null;

  allDates.forEach(d => {
    const s = getDailyScore(d);
    const prevExpected = prevDate ? (() => {
      const pd = new Date(prevDate+'T00:00:00');
      pd.setDate(pd.getDate() + 1);
      return pd.getFullYear() + '-' + String(pd.getMonth()+1).padStart(2,'0') + '-' + String(pd.getDate()).padStart(2,'0');
    })() : null;

    const consecutive = prevDate === null || d === prevExpected;

    if (s.total > 0 && s.score >= target && consecutive) {
      if (currentStreakLen === 0) currentStreakStart = d;
      currentStreakLen++;
    } else {
      if (currentStreakLen >= 3) {
        streaks.push({ start: currentStreakStart, length: currentStreakLen });
      }
      currentStreakLen = s.score >= target ? 1 : 0;
      currentStreakStart = s.score >= target ? d : null;
    }
    prevDate = d;
  });
  if (currentStreakLen >= 3) streaks.push({ start: currentStreakStart, length: currentStreakLen });
  streaks.sort((a, b) => b.length - a.length);

  const totalAbove7  = streaks.filter(s => s.length >= 7).length;
  const avgStreakLen = streaks.length ? Math.round(streaks.reduce((s, x) => s + x.length, 0) / streaks.length) : 0;

  let html = `
    <div class="streak-history-summary">
      <div class="sh-stat"><div class="sh-val">🔥 ${appData.streaks.longest}</div><div class="sh-label">Longest Ever</div></div>
      <div class="sh-stat"><div class="sh-val">${appData.streaks.current}</div><div class="sh-label">Current</div></div>
      <div class="sh-stat"><div class="sh-val">${totalAbove7}</div><div class="sh-label">Streaks ≥ 7 days</div></div>
      <div class="sh-stat"><div class="sh-val">${avgStreakLen}</div><div class="sh-label">Avg Streak</div></div>
    </div>
  `;

  if (streaks.length > 0) {
    html += '<div class="streak-history-list">';
    streaks.slice(0, 5).forEach((s, i) => {
      html += `
        <div class="sh-item">
          <span class="sh-rank">#${i+1}</span>
          <span class="sh-len">🔥 ${s.length} days</span>
          <span class="sh-start">Started ${formatDateDisplay(s.start)}</span>
        </div>
      `;
    });
    html += '</div>';
  } else {
    html += '<p class="muted" style="padding:12px">Abhi tak koi notable streak nahi — shuru karo! 🚀</p>';
  }

  el.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   EXPORT / COPY REPORT
═══════════════════════════════════════════════ */
function buildReportText() {
  const today = getTodayStr();
  const tab = progressCurrentTab;
  let text = `AAINIK — TASK MASTERY REPORT\nGenerated: ${new Date().toLocaleString('en-IN')}\n\n`;

  if (tab === 'daily') {
    const date  = progressViewDate;
    const daily = getDailyScore(date);
    text += `DAILY REPORT — ${formatDateDisplay(date)}\n`;
    text += `Score: ${daily.score}% | ${daily.done}/${daily.taskCount} tasks | ${daily.earned}/${daily.total} pts\n`;
    text += `Streak: ${appData.streaks.current} days\n\n`;

    appData.categories.forEach(cat => {
      const cs = getCategoryScore(cat.id, date);
      text += `[${cat.name}] ${cs.score}% (${cs.done}/${cs.total} tasks)\n`;
      appData.tasks.filter(t => t.categoryId === cat.id && t.active !== false).forEach(task => {
        const entry = appData.history.find(h => h.taskId === task.id && h.date === date);
        const done = entry && entry.completed;
        text += `  ${done ? '✅' : '❌'} ${task.name}`;
        if (entry && !entry.completed && entry.missedReason) {
          text += ` (${missedReasonLabel(entry.missedReason)})`;
        }
        text += '\n';
      });
      text += '\n';
    });
  } else if (tab === 'last7days' || tab === 'weekly') {
    const weekly = getWeeklyAvg();
    text += `LAST 7 DAYS REPORT\n`;
    text += `Last 7 Days Average: ${weekly}%\n\n`;
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(dateNDaysAgo(i));
    days.forEach(d => {
      const s = getDailyScore(d);
      text += `${new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}: ${s.total > 0 ? s.score + '%' : 'No data'}\n`;
    });
  } else {
    const allTime = getAllTimeAvg();
    const totalDone = appData.history.filter(h => h.completed).length;
    text += `OVERALL REPORT\n`;
    text += `All-Time Average: ${allTime}%\n`;
    text += `Total Tasks Completed: ${totalDone}\n`;
    text += `Best Streak: ${appData.streaks.longest} days\n`;
    text += `Current Streak: ${appData.streaks.current} days\n`;
  }

  return text;
}

function exportReport() {
  const text = buildReportText();
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `aainik_report_${progressCurrentTab}_${getTodayStr()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Report download ho raha hai');
}

function copyReport() {
  const text = buildReportText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Report clipboard mein copy ho gaya');
  }).catch(() => {
    showToast('⚠️ Copy nahi hua — manually select karo');
  });
}

/* ═══════════════════════════════════════════════
   getCoachData() — Account 4 calls this
   Returns structured JSON for Groq AI coach prompt
═══════════════════════════════════════════════ */
function getCoachData() {
  const today       = getTodayStr();
  const daily       = getDailyScore(today);
  const weeklyAvg   = getWeeklyAvg();
  const allTimeAvg  = getAllTimeAvg();

  // Build category breakdown
  const categoryBreakdown = {};
  appData.categories.forEach(cat => {
    const catScore = getCategoryScore(cat.id, today);
    const tasks    = appData.tasks.filter(t => t.categoryId === cat.id && t.active !== false);
    const taskMap  = {};
    tasks.forEach(task => {
      const entry = appData.history.find(h => h.taskId === task.id && h.date === today);
      let status = 'not tracked';
      if (entry && entry.completed) {
        const effort = entry.effortDeclared ? `effort: ${entry.effortScore}/10` : 'effort: not declared';
        status = `done (${effort})`;
      } else if (entry && entry.isUntracked) {
        status = 'UNTRACKED — window expired (worst case, 0 score)';
      } else if (entry && !entry.completed) {
        status = 'missed';
        if (entry.missedReason) status += ` (${missedReasonLabel(entry.missedReason)})`;
      }
      // Working window info
      const ww = task.workingWindowStart
        ? (task.workingWindowStart + (task.workingWindowEnd ? '→' + task.workingWindowEnd : ''))
        : 'not set';
      taskMap[task.name] = {
        status,
        priority: task.priority,
        workingWindow: ww,
        whyMatters: task.whyMatters || '',
        category: cat.name
      };
    });
    categoryBreakdown[cat.name] = {
      score: catScore.score + '%',
      tasks: taskMap
    };
  });

  // Pattern detection (last 28 days)
  const last28 = [];
  for (let i = 0; i < 28; i++) last28.push(dateNDaysAgo(i));
  const patterns = detectPatterns(last28);

  // Missed task reasons for today
  const todayMissed = appData.history
    .filter(h => h.date === today && !h.completed && h.missedReason)
    .map(h => {
      const task = appData.tasks.find(t => t.id === h.taskId);
      return (task ? task.name : 'Unknown') + ': ' + missedReasonLabel(h.missedReason);
    });

  // Task with most consecutive misses
  let worstStreak = { name: '', count: 0 };
  appData.tasks.filter(t => t.active !== false).forEach(task => {
    let consecutive = 0;
    for (let i = 0; i < 14; i++) {
      const d = dateNDaysAgo(i);
      const entry = appData.history.find(h => h.taskId === task.id && h.date === d);
      if (entry && !entry.completed) consecutive++;
      else break;
    }
    if (consecutive > worstStreak.count) worstStreak = { name: task.name, count: consecutive };
  });

  // Effort summary for today
  const effort_summary = (() => {
    const completedToday = appData.history.filter(h => h.date === today && h.completed);
    const withEffort = completedToday.filter(h => h.effortDeclared);
    const avgEffort = withEffort.length
      ? Math.round(withEffort.reduce((s, h) => s + (h.effortScore || 0), 0) / withEffort.length)
      : 0;
    const untracked = appData.history.filter(h => h.date === today && h.isUntracked).length;
    return { avgEffort, untrackedCount: untracked, completedWithEffort: withEffort.length };
  })();

  return {
    report_type:          'daily',
    date:                 today,
    overall_score:        daily.score + '%',
    tasks_done:           daily.done + '/' + daily.taskCount,
    points_earned:        daily.earned + '/' + daily.total,
    effort_avg_today:     effort_summary.avgEffort + '/10',
    untracked_tasks:      effort_summary.untrackedCount,
    current_streak:       appData.streaks.current,
    longest_streak:       appData.streaks.longest,
    weekly_avg:           weeklyAvg + '%',
    all_time_avg:         allTimeAvg + '%',
    streak_target:        (appData.settings.targetPercent || 80) + '%',
    streak_met_today:     daily.score >= (appData.settings.targetPercent || 80),
    category_breakdown:   categoryBreakdown,
    patterns:             patterns,
    missed_reasons_today: todayMissed,
    worst_streak_task:    worstStreak.count > 0 ? `${worstStreak.name} missed ${worstStreak.count} consecutive days` : 'None',
    user_goal:            'RRB PO Bank exam',
    total_days_tracked:   [...new Set(appData.history.map(h => h.date))].length,
    total_tasks_completed: appData.history.filter(h => h.completed).length,
    effort_summary
  };
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 4 — AI COACH + GAMIFICATION
   Groq API integration, personality system, badges, levels, confetti
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   BEAST MODE DEFAULT SYSTEM PROMPT
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   EGO MODE PROMPTS — Authentic Indian Inner Voice
   These prompts make the AI speak AS the user's own ego/inner self
   All three share the same voice, only brutality level differs
───────────────────────────────────────────── */

const DEFAULT_BEAST_PROMPT = `Tu meri andar ki awaaz hai — mera Ego. Tu main hoon. Tu ek bahar ka coach nahi hai. Tu woh hoon jab main khud se bilkul seedha baat karta hoon.

TU KAISE BAAT KARTA HAI:
- Hinglish — Hindi aur English naturally mix hoti hai jaise actual Indian banda bolta hai
- Indian male tone — jaise koi dost ya bada bhai jo genuinely tumhara bura chahne wala nahi lekin bilkul seedha bolne se nahi darta
- Dark humour aur sarcasm freely use karo — actual Indian style mein, robotic mat lagna
- Real Indian slangs use karo: "abe", "yaar", "bhai", "bsdk", "sala", "ghanta", "lol", "ara", "chal uth", "kya scene hai", "seedha baat", etc.
- Kabhi bhi robotic ya AI jaisa mat lagana — ek real Indian banda hai jo apne aap se baat kar raha hai

TU EXACTLY YEH KARTA HAI:
1. Pehle DATA dekh — aaj kya complete hua, kya nahi hua, score kya raha
2. Jo tasks miss hue unke "WHY IT MATTERS" notes use kar — "Tu khud jaanta tha yeh kyun zaroori tha, phir bhi nahi kiya"
3. LIFE GOALS ko reference kar — "Tu pehle attempt mein PO banana chahta tha, yaad hai?"
4. NEGATIVE WORDS jo logo ne kehe hain — unhe fuel ki tarah use kar, emotionally connect kara
5. Performance pe honest, brutal, direct feedback — no sugarcoating ever
6. LAST MEIN — powerful motivation, taglines, real fire daal — teri potential yaad dila

SCORE-BASED BRUTALITY RULE (MUST FOLLOW):
Score 0–39%: MAXIMUM BRUTAL. Bilkul no mercy. Ek ek miss pe roast kar. Sab kuch reference kar — goals, negative words, why-matters. Long detailed reality check. Dark humour full ON.
Score 40–59%: HIGH BRUTAL. Zyada miss pe roast, kuch done pe thoda acknowledge — lekin turant wapas savage mode. Medium length.
Score 60–79%: MODERATE. Honest direct — naa brutal naa soft. "Theek hai but yeh wala kyu miss hua?" style. Short-medium length.
Score 80–99%: NO BRUTAL — but NO SUGAR COAT EITHER. Serious, "yaar consistency maintain rakhna, yeh 4 din ki chandni wala scene mat banna." Short.
Score 100%: Short, acknowledge — lekin immediately "goals bade hain, kal bhi yahi chahiye." No over-celebration.

MESSAGE LENGTH RULE:
Score < 40%: Long (300-400 words) — full roast + reality check + motivation
Score 40-60%: Medium (200-300 words)
Score 60-80%: Medium-short (150-200 words)
Score 80%+: Short (80-120 words)

EMOTIONAL GUILT TACTICS (use these naturally):
- Jo task ka "why it matters" tune khud likha tha — usse seedha quote kar aur bol "Tu jaanta tha yeh important hai, phir bhi..."
- Life goals yaad dilao — ek specific goal uthao aur aaj ke performance se directly connect karo
- Negative words wali baat — jab score kharab ho toh dheere se reference karo: "Yaad hai kisi ne kaha tha..."
- Fear of wasted time — "Ek din gaya, exam date nahi gayi yaar"
- Self-comparison — "Kahin aur wale teri jagah yeh sab kar rahe hain abhi"

ENDING — ALWAYS (even after brutality):
Powerful 4-6 line motivational taglines in Hinglish. Poetic, fire-filled, ego-driven. Like a battle cry. Make it feel like "haan yaar, main kar sakta hoon." Example style:
"Sun meri baat — tu woh nahi jo log sochte hain.
Tu woh hai jo tu decide karta hai banna.
Kal uth, ek ek task complete kar,
Aur teri life khud teri zubaan bolegi."

CRITICAL RULES:
- NEVER sound like ChatGPT or a robot — real banda hai
- NEVER use generic filler phrases like "Great job!" or "Keep it up!"
- ALWAYS reference at least one specific task that was missed (if any)
- ALWAYS connect to at least one life goal or negative word (if provided)
- Performance data ka har element use karo — streak, category scores, patterns`;

const DEFAULT_BALANCED_PROMPT = `Tu meri andar ki awaaz hai — mera Ego. Tu main hoon. Balanced mode mein baat karta hai — naa zyada soft, naa full roast mode. Real, direct, honest.

TU KAISE BAAT KARTA HAI:
- Hinglish naturally — real Indian male tone
- Sarcasm use karo but controlled — dark humour thoda, full roast nahi
- Direct aur honest — seedha baat, no beating around the bush
- Indian slangs use karo: "yaar", "bhai", "chal", "seedha", "kya scene hai", etc.

TU EXACTLY YEH KARTA HAI:
1. Data dekh — score, missed tasks, streaks
2. Jo miss hua uska "why it matters" reference karo — gently but firmly
3. Life goals se performance ko factually connect karo
4. Negative words jo logo ne kehe hain — thoda sa use karo as reality check, weapon nahi
5. Honest feedback — achha hua toh acknowledge, bura hua toh seedha bolo without full roast

SCORE-BASED RULE:
Score < 50%: Honest aur direct criticism, thoda sarcasm, medium length
Score 50-75%: Balanced — achha bhi bolo, bura bhi bolo clearly, short-medium
Score 75%+: Mostly positive lekin serious warning — "consistency mat todo", short

ENDING: Solid 3-4 line motivation — real, fire-filled lekin balanced tone`;

const DEFAULT_GENTLE_PROMPT = `Tu meri andar ki awaaz hai — mera Ego. Tu main hoon. Gentle mode mein — encouraging lekin bilkul honest, apne aap se jhooth nahi.

TU KAISE BAAT KARTA HAI:
- Hinglish — warm lekin real Indian tone
- No roasting — but no false praise either
- Jaise ek caring bada bhai bolta hai — "yaar sun, sach bol raha hoon"
- Honest aur specific — vague compliments nahi

TU EXACTLY YEH KARTA HAI:
1. Achha hua toh genuinely acknowledge karo
2. Jo miss hua — kindly point out, "tu jaanta tha yeh kyun zaroori tha"
3. Life goals se gently connect — reminder, not guilt
4. Negative words — unhe strength mein convert karo, "prove them wrong, gently"
5. Actionable next steps do — specific, clear

SCORE-BASED RULE:
Kisi bhi score pe — encouraging lekin honest. Never harsh. Short responses.

ENDING: Warm, genuine 3-4 line motivation — believable, personal, real`;


/* ─────────────────────────────────────────────
   MY-JOSH PROMPTS — The Hype Man & Reminder
   Josh is NOT the inner ego. Josh is the external
   motivator, reminder, and cheerleader.
   He uses same data sources but for motivation.
───────────────────────────────────────────── */

const JOSH_ENERGETIC_PROMPT = `Tu "Tera-Josh" hai — tera ek energetic Hinglish hype man aur reminder system.
Tu Tera-Ego nahi hai. Tu woh dost hai jo subah uthake kehta hai "Bhai chal uth, aaj ka din shuru karte hain!"

TU KAISE BAAT KARTA HAI:
- Super energetic, warm, encouraging Hinglish
- Indian slangs use kar naturally: "bhai", "yaar", "chal", "mast", "solid", "ekdum"
- Never roast, never brutal — bas remind karo aur motivate karo genuinely
- Task name + category name se context nikaalo — infer karo use case
- Quote "why it matters" section naturally for motivation
- Connect tasks to life goals and dreams — positive framing

TU YEH KARTA HAI (Reminder + Motivation):
1. Upcoming tasks yaad dilao — name, category, priority, working window
2. Category + task name se AI se context infer karo (e.g., "PHYSIC > Morning Workout" → body transformation goal)
3. "Why it matters" quote karo warmly
4. Life goals se connect karo — motivating, not guilt-tripping
5. Negative words jo logo ne kehe hain → reframe: "prove them wrong" energy
6. Short, punchy motivational lines at end — hype up!

ENDING: 3–4 fire lines in Hinglish. Pure hype. "Tu kar sakta hai, bhai. Chal shuru karte hain."`;

const JOSH_CALM_PROMPT = `Tu "Tera-Josh" hai — ek calm, grounded Hinglish reminder aur motivator.
Tu gentle energy use karta hai — ek wise dost ki tarah.

TU KAISE BAAT KARTA HAI:
- Warm, calm, collected Hinglish
- Supportive tone — jaise ek caring bada bhai
- No shouting energy — steady, confident
- Task context category + name se infer karo
- Goals se gently connect

ENDING: 2–3 calm, confident motivational lines.`;

const JOSH_BEAST_PROMPT = `Tu "Tera-Josh" hai — ek beast-mode Hinglish reminder.
Tu hype karta hai brutal energy se — but motivational, not roasting.

TU KAISE BAAT KARTA HAI:
- HIGH ENERGY Hinglish
- War-cry style reminders
- "Bhai ye tasks aaj HONE CHAHIYE, koi bahaana nahi!"
- Task context infer karo strongly from category + name
- Goals ko battlefield perspective se connect karo

ENDING: 4–5 battle-cry motivational lines. ALL CAPS acceptable for effect.`;


/* ─────────────────────────────────────────────
   MY-JOSH FUNCTIONS
───────────────────────────────────────────── */

function getJoshActiveFullPrompt(personality) {
  const s = appData.settings;
  if (s.joshPrompt && s.joshPrompt.trim()) return s.joshPrompt;
  if (personality === 'calm')  return JOSH_CALM_PROMPT;
  if (personality === 'beast') return JOSH_BEAST_PROMPT;
  return JOSH_ENERGETIC_PROMPT;
}

// Convenience alias — uses current saved personality setting
function getJoshActivePrompt() {
  const personality = appData.settings.joshPersonality || 'energetic';
  return getJoshActiveFullPrompt(personality);
}

function buildJoshContextForReminder(triggerTime) {
  const today = getTodayStr();
  const s = appData.settings;

  // Tasks in upcoming slot: starting at or after triggerTime, within next 3 hours
  const endSlot = bumpTime(triggerTime, 180);

  const upcomingTasks = appData.tasks
    .filter(t => t.active !== false)
    .filter(t => {
      const startTime = t.workingWindowStart || t.scheduledTime || '00:00';
      return startTime >= triggerTime && startTime <= endSlot;
    })
    .map(t => {
      const cat = appData.categories.find(c => c.id === t.categoryId);
      // Only count a task as "done" if marked done at or before triggerTime on that date
      const entryAtTrigger = appData.history.find(h => {
        if (h.taskId !== t.id || h.date !== today) return false;
        if (!h.timestamp) return true; // legacy entry
        const istOffset = 5.5 * 60;
        const istDate = new Date(h.timestamp + (new Date().getTimezoneOffset() * 60000) + (istOffset * 60000));
        const entryHHMM = String(istDate.getHours()).padStart(2,'0') + ':' + String(istDate.getMinutes()).padStart(2,'0');
        return entryHHMM <= triggerTime;
      });
      const done = entryAtTrigger && entryAtTrigger.completed;
      return {
        name: t.name,
        category: cat ? cat.name : '',
        priority: t.priority,
        workingWindow: (t.workingWindowStart || '') + (t.workingWindowEnd ? '→' + t.workingWindowEnd : ''),
        whyMatters: t.whyMatters || '',
        alreadyDone: !!done
      };
    })
    .filter(t => !t.alreadyDone); // only pending tasks

  return {
    reminderTime: triggerTime,
    upcomingTasks,
    totalUpcoming: upcomingTasks.length,
    lifeGoals: (s.egoLifeGoals || '').trim(),
    negativeWords: (s.egoNegativeWords || '').trim(),
    daily: getDailyScore(today)
  };
}

async function runJoshAutoReminder(triggerTime) {
  const today = getTodayStr();
  const context = buildJoshContextForReminder(triggerTime);

  const systemPrompt = getJoshActivePrompt();
  const noTasksNote = context.upcomingTasks.length === 0
    ? 'Koi upcoming task nahi is time slot mein. User ke life goals aur past performance dekh ke general motivation de aur din ke baaki tasks ke liye hype karo.'
    : '';

  // Build deep context — same data sources as Tera-Ego (category+task name inference, whyMatters, life goals, negative words)
  const taskLines = context.upcomingTasks.map(t =>
    `• [${t.category}] "${t.name}" | Priority: ${t.priority} | Window: ${t.workingWindow}\n  Why it matters (user ka likha hua): "${t.whyMatters}"`
  ).join('\n') || 'None pending in this slot';

  // Bug Fix 5: Time-aware score for Josh — only count expired windows
  const _joshISTNow = getNowISTHHMM();
  const _joshToday = getTodayStr();
  const _joshExpiredTasks = appData.tasks.filter(t => {
    if (t.active === false) return false;
    const winEnd = t.workingWindowEnd || '';
    return winEnd && winEnd < _joshISTNow;
  });
  const _joshDayNotStarted = _joshExpiredTasks.length === 0;
  const _joshExpiredDone = _joshExpiredTasks.filter(t => {
    const e = appData.history.find(h => h.taskId === t.id && h.date === _joshToday);
    return e && e.completed;
  }).length;
  const _joshEffectiveScore = _joshDayNotStarted ? null
    : Math.round((_joshExpiredDone / _joshExpiredTasks.length) * 100);

  const userContent = `TERA-JOSH REMINDER — Time: ${triggerTime} IST
🕐 CURRENT IST TIME: ${_joshISTNow} IST (UTC+5:30) — Always use IST for time comparisons, never UTC.

UPCOMING PENDING TASKS (${triggerTime} se agle slot mein):
${taskLines}

TODAY'S SCORE SO FAR: ${_joshDayNotStarted
  ? `0% — BUT din abhi shuru hua hai, koi working window abhi expire nahi hui. 0% is NOT a failure. DO NOT judge for zero score. Focus only on motivating for upcoming tasks.`
  : `${_joshEffectiveScore}% on expired windows (${_joshExpiredDone}/${_joshExpiredTasks.length} tasks done) — ${context.daily.done}/${context.daily.taskCount} total marked done`}

⚠️ JUDGING RULES FOR JOSH:
- Upcoming tasks listed above: motivate strongly, don't condemn, window still open
- Tasks already ✅ done: celebrate!
- If score is 0% but day just started (no expired windows): be encouraging, NOT harsh
- Only judge tasks where window has already closed and not done

LIFE GOALS (user ne khud likhe hain — positively connect karo):
${context.lifeGoals || 'Not set'}

NEGATIVE WORDS people said (reframe into "prove them wrong" energy):
${context.negativeWords || 'Not set'}

${noTasksNote}

INSTRUCTIONS:
- Category + task name se context strongly infer karo (e.g., PHYSIC > Morning Workout = body transformation)
- Har task ke liye "why it matters" naturally use karo
- Life goals se har task ko positively connect karo
- Negative words ko "prove them wrong" energy mein convert karo
- Format:
  Line 1: Ek punchy motivational headline (notification title — max 90 chars, Hinglish, personal)
  Blank line
  Full detailed reminder + motivation (har task separately cover karo)`;

  const fullResponse = await callGeminiAPI(systemPrompt, userContent, 600);

  const lines = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Tera-Josh: Aaj ke tasks yaad hain? 💪';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save to joshConversations FIRST (always, regardless of app state)
  if (!appData.joshConversations) appData.joshConversations = [];
  appData.joshConversations.unshift({
    id: 'jc_auto_' + Date.now(),
    type: 'auto_reminder',
    triggerTime,
    date: today,
    timestamp: Date.now(),
    scoreLabel: `💪 Tera-Josh Auto — ${context.totalUpcoming} tasks | ${formatTime12(triggerTime)}`,
    response: fullResponse,
    headline
  });
  if (appData.joshConversations.length > 30) appData.joshConversations = appData.joshConversations.slice(0, 30);
  saveData();

  // ── Decide how to deliver the response based on app state ──
  if (_appInForeground) {
    // App is OPEN → show directly in UI, no notification
    if (currentScreen === 'coach') {
      switchCoachTab('josh');
      renderJoshMessages();
    }
    if (currentScreen === 'inbox') renderInboxScreen();
    showToast(`💪 Josh: ${headline.substring(0, 60)}`, true);
  } else {
    // App is in BACKGROUND → fire native notification with real Gemini response
    const capFiredJosh = await fireCapacitorNativeNotif(
      '💪 ' + headline,
      notifBody,
      'aainik-josh',
      'josh_auto'
    );
    if (!capFiredJosh) fireAiNotification(headline, notifBody, 'josh-auto-' + triggerTime, 'josh_auto');
  }
}

function checkJoshAutoTriggers(hhmm) {
  // AUTO API CALLS REMOVED — notifications are pre-scheduled via scheduleAllCapacitorNotifications()
  // No-op: kept for reference only
}

async function joshManualChat(userMessage, daysCount) {
  if (!userMessage || !userMessage.trim()) {
    showToast('⚠️ Kuch toh likho pehle!');
    return;
  }
  const apiKey = (getAvailableApiKey() || {}).key || appData.settings.coachApiKey;
  if (!hasAnyApiKey()) {
    showToast('⚠️ API key missing! Settings mein set karo.');
    showScreen('settings');
    return;
  }

  const joshTyping = document.getElementById('josh-typing');
  const sendBtn    = document.getElementById('btn-josh-send');
  if (joshTyping) joshTyping.classList.remove('hidden');
  if (sendBtn)    { sendBtn.disabled = true; sendBtn.textContent = '⏳...'; }

  const today = getTodayStr();
  const days  = [];
  for (let i = 0; i < daysCount; i++) days.push(dateNDaysAgo(i));
  const dailyData = days.map(d => {
    const ds = getDailyScore(d);
    return { date: d, score: ds.score, done: ds.done, total: ds.taskCount };
  });

  const systemPrompt = `Tu Tera-Josh hai — ek caring Hinglish motivator aur analyst.
${getJoshActivePrompt()}

Manual chat mode mein user directly baat kar raha hai.
User ka message naturally reply karo.
Past performance data use karo context ke liye.
Josh should be warm, insightful, motivating.
User ke message ka seedha jawab pehle, phir motivation.`;

  const istNow = getNowISTDate();
  const currentISTTime = istNow.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: true,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const lastJoshResp = getLastJoshResponse();
  const lastJoshNote = lastJoshResp
    ? `\n\nMERI LAST RESPONSE (jo maine pichli baar kahi thi):\n"${lastJoshResp.substring(0, 500)}"\n\nIs context ko use karo — kya user ne progress ki?`
    : '';

  try {
    const fullUserContent = `USER MESSAGE: ${userMessage.trim()}

CURRENT TIME (IST): ${currentISTTime}

CONTEXT (Last ${daysCount} days performance):
${dailyData.map(d => `${d.date}: ${d.score}% (${d.done}/${d.total} tasks)`).join('\n')}

Life Goals: ${(appData.settings.egoLifeGoals || '').trim() || 'Not set'}
Negative words others said: ${(appData.settings.egoNegativeWords || '').trim() || 'Not set'}

Task "Why It Matters":
${appData.tasks.filter(t => t.active !== false && t.whyMatters).map(t => {
  const cat = appData.categories.find(c => c.id === t.categoryId);
  return `• [${cat ? cat.name : ''}] ${t.name}: "${t.whyMatters}"`;
}).join('\n') || 'None set'}${lastJoshNote}`;

    const response = await callGeminiAPI(systemPrompt, fullUserContent, 800);

    if (!appData.joshConversations) appData.joshConversations = [];
    appData.joshConversations.push({
      id: 'jc_manual_' + Date.now(),
      type: 'manual',
      timestamp: Date.now(),
      date: today,
      userMessage: userMessage.trim(),
      daysCount,
      scoreLabel: `💬 Josh Chat — Last ${daysCount} days`,
      response
    });
    if (appData.joshConversations.length > 30) appData.joshConversations = appData.joshConversations.slice(-30);
    saveData();

    if (joshTyping) joshTyping.classList.add('hidden');
    const joshChatInput = document.getElementById('josh-chat-input');
    if (joshChatInput) joshChatInput.value = '';
    renderJoshMessages();

    const joshWrap = document.getElementById('josh-chat-wrap');
    if (joshWrap) setTimeout(() => { joshWrap.scrollTop = joshWrap.scrollHeight; }, 100);

  } catch (err) {
    if (joshTyping) joshTyping.classList.add('hidden');
    showToast('❌ Josh error: ' + err.message, 3000);
  } finally {
    if (sendBtn)    { sendBtn.disabled = false; sendBtn.textContent = '💪 Josh Ko Bhejo'; }
    if (joshTyping) joshTyping.classList.add('hidden');
  }
}

function renderJoshMessages() {
  const container = document.getElementById('josh-messages');
  if (!container) return;

  const convs = (appData.joshConversations || []).slice(-10);
  if (!convs.length) {
    container.innerHTML = `
      <div class="josh-empty">
        <div class="josh-empty-icon">💪</div>
        <h3>Josh Ready Hai!</h3>
        <p>Tera-Josh tera hype man aur reminder hai. Auto mode set karo ya seedha baat karo.</p>
      </div>`;
    return;
  }

  container.innerHTML = convs.map(conv => {
    const timeStr = conv.timestamp ? new Date(conv.timestamp).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : '';
    const responseHtml = escapeHtml(conv.response || '').replace(/\n/g, '<br>');

    let userLabel;
    if (conv.type === 'auto_reminder') {
      userLabel = `⏰ Auto Reminder (${escapeHtml(conv.triggerTime || '')})`;
    } else if (conv.type === 'manual') {
      userLabel = `💬 ${escapeHtml((conv.userMessage || 'Chat').substring(0, 80))}`;
    } else {
      userLabel = `💪 ${escapeHtml(conv.scoreLabel || 'Josh Message')}`;
    }

    return `
      <div class="chat-msg user-msg">
        <div class="chat-bubble">${userLabel}</div>
        <div class="chat-meta">${timeStr}</div>
      </div>
      <div class="chat-msg josh-msg">
        <div class="chat-bubble josh-bubble">${responseHtml}</div>
        <div class="chat-meta">
          💪 Josh · ${timeStr}
          <button class="chat-copy-btn" onclick="copyConvText(${JSON.stringify(conv.response || '')})">📋 Copy</button>
        </div>
      </div>`;
  }).join('');

  const wrap = document.getElementById('josh-chat-wrap');
  if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 100);
}

function copyConvText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('✅ Copied!')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Copied!');
  });
}

function renderJoshSettings() {
  const s = appData.settings;

  const persEl = document.getElementById('josh-personality-select');
  if (persEl) persEl.value = s.joshPersonality || 'energetic';

  const autoToggle = document.getElementById('josh-auto-toggle');
  if (autoToggle) autoToggle.checked = !!s.joshAutoEnabled;

  const maxInp = document.getElementById('josh-auto-max-per-day');
  if (maxInp) maxInp.value = s.joshAutoMaxPerDay || 3;

  // Change 6: Show active prompt (custom or default) — same as Ego does
  const promptTA = document.getElementById('josh-prompt-textarea');
  if (promptTA) {
    const personality = s.joshPersonality || 'energetic';
    promptTA.value = getJoshActiveFullPrompt(personality);
  }

  renderJoshAutoTimeList();
}

function renderJoshAutoTimeList() {
  const container = document.getElementById('josh-auto-times-list');
  if (!container) return;
  const times = appData.settings.joshAutoTimes || [];

  container.innerHTML = times.map((entry) => `
    <div class="auto-coach-time-row">
      <label class="actr-toggle">
        <input type="checkbox" ${entry.enabled ? 'checked' : ''}
               onchange="toggleJoshAutoTime('${entry.id}', this.checked)" />
      </label>
      <input type="time" class="setting-input-time"
             value="${entry.time}"
             onchange="updateJoshAutoTime('${entry.id}', this.value)" />
      <button class="actr-remove" onclick="removeJoshAutoTime('${entry.id}')">✕</button>
    </div>`).join('');

  const addBtn = document.getElementById('btn-add-josh-time');
  const max    = appData.settings.joshAutoMaxPerDay || 3;
  if (addBtn)  addBtn.style.display = times.length >= max ? 'none' : 'block';
}

function toggleJoshAutoEnabled(val) {
  appData.settings.joshAutoEnabled = val;
  saveData();
  showToast(val ? '✅ Josh auto reminders ON' : '🔕 Josh auto reminders OFF');
}

function updateJoshPersonality(val) {
  appData.settings.joshPersonality = val;
  saveData();
  showToast('Josh personality: ' + val);
}

function addJoshAutoTime() {
  const times = appData.settings.joshAutoTimes || [];
  const max   = appData.settings.joshAutoMaxPerDay || 3;
  if (times.length >= max) { showToast(`⚠️ Max ${max} Josh auto times`); return; }
  times.push({ id: 'jt_' + Date.now(), time: '08:00', enabled: true });
  appData.settings.joshAutoTimes = times;
  saveData();
  renderJoshAutoTimeList();
}

function removeJoshAutoTime(id) {
  appData.settings.joshAutoTimes = (appData.settings.joshAutoTimes || []).filter(t => t.id !== id);
  saveData();
  renderJoshAutoTimeList();
}

function toggleJoshAutoTime(id, enabled) {
  const entry = (appData.settings.joshAutoTimes || []).find(t => t.id === id);
  if (entry) { entry.enabled = enabled; saveData(); }
}

function updateJoshAutoTime(id, time) {
  const entry = (appData.settings.joshAutoTimes || []).find(t => t.id === id);
  if (entry) { entry.time = time; saveData(); }
}

function updateJoshMaxPerDay(val) {
  const n = parseInt(val);
  if (isNaN(n) || n < 1 || n > 15) return;
  appData.settings.joshAutoMaxPerDay = n;
  saveData();
  renderJoshAutoTimeList();
}

function updateJoshPrompt(val) {
  // Staging only — use saveJoshPrompt() to commit
  appData.settings._joshPromptDraft = val;
}

function saveJoshPrompt() {
  const ta = document.getElementById('josh-prompt-textarea');
  const val = ta ? ta.value.trim() : (appData.settings._joshPromptDraft || '');
  appData.settings.joshPrompt = val;
  delete appData.settings._joshPromptDraft;
  saveData();
  showToast('✅ Tera-Josh prompt saved!');
}

function resetJoshPrompt() {
  if (!confirm('Tera-Josh ka custom prompt delete karein? Default personality prompt use hoga.')) return;
  appData.settings.joshPrompt = '';
  delete appData.settings._joshPromptDraft;
  saveData();
  const ta = document.getElementById('josh-prompt-textarea');
  if (ta) ta.value = getJoshActiveFullPrompt(appData.settings.joshPersonality || 'energetic');
  showToast('↺ Tera-Josh prompt default pe reset hua');
}

function clearJoshConversations() {
  if (!appData.joshConversations || appData.joshConversations.length === 0) {
    showToast('Koi Josh conversation nahi hai'); return;
  }
  if (confirm('Josh ki saari conversations delete karein?')) {
    appData.joshConversations = [];
    saveData();
    renderJoshMessages();
    showToast('🗑️ Josh history cleared');
  }
}

/* ─────────────────────────────────────────────
   COACH TABS
───────────────────────────────────────────── */
let currentCoachTab = 'ego';

function switchCoachTab(tab) {
  currentCoachTab = tab;

  document.querySelectorAll('.coach-tab').forEach(b => {
    b.classList.toggle('active', b.id === 'tab-' + tab + '-btn');
  });

  const egoPanel  = document.getElementById('coach-panel-ego');
  const joshPanel = document.getElementById('coach-panel-josh');
  if (egoPanel)  egoPanel.classList.toggle('hidden', tab !== 'ego');
  if (joshPanel) joshPanel.classList.toggle('hidden', tab !== 'josh');

  if (tab === 'josh') renderJoshMessages();
  if (tab === 'ego')  renderCoachMessages();
}

function clearActiveCoachConversations() {
  if (currentCoachTab === 'ego') {
    clearConversations();
  } else {
    clearJoshConversations();
  }
}

/* ─────────────────────────────────────────────
   INBOX SCREEN — Separate from Coach screen
   Ego inbox + Josh inbox as tabs
───────────────────────────────────────────── */
let currentInboxTab = 'ego';

function renderInboxScreen() {
  renderEgoInbox();
  renderJoshInbox();
  switchInboxTab(currentInboxTab);
}

function switchInboxTab(tab) {
  currentInboxTab = tab;
  const egoPanel  = document.getElementById('inbox-panel-ego');
  const joshPanel = document.getElementById('inbox-panel-josh');
  if (egoPanel)  egoPanel.classList.toggle('hidden', tab !== 'ego');
  if (joshPanel) joshPanel.classList.toggle('hidden', tab !== 'josh');
  const egoBtn  = document.getElementById('inbox-tab-ego-btn');
  const joshBtn = document.getElementById('inbox-tab-josh-btn');
  if (egoBtn)  egoBtn.classList.toggle('active', tab === 'ego');
  if (joshBtn) joshBtn.classList.toggle('active', tab === 'josh');
}

/* ─────────────────────────────────────────────
   COACH SCREEN RENDER
───────────────────────────────────────────── */
function renderCoachScreen() {
  const s = appData.settings;

  // Show/hide no-key banner
  const banner = document.getElementById('coach-no-key-banner');
  if (banner) banner.classList.toggle('hidden', !!s.coachApiKey);

  // Update personality chips
  updatePersonalityChips(s.coachPersonality || 'beast');

  // Update personality toggle button label (legacy, kept for compat)
  const ptBtn = document.getElementById('btn-personality-toggle');
  if (ptBtn) {
    const labels = { gentle: '🕊️ Gentle', balanced: '⚖️ Balanced', beast: '🔥 Beast' };
    ptBtn.textContent = labels[s.coachPersonality || 'beast'] || '🔥 Beast';
  }

  // Render level strip
  renderLevelStrip();

  // Render Ego conversation history
  renderCoachMessages();

  // Render Josh messages (in case Josh tab is active)
  renderJoshMessages();

  // Ensure correct tab is shown
  const egoPanel  = document.getElementById('coach-panel-ego');
  const joshPanel = document.getElementById('coach-panel-josh');
  if (egoPanel)  egoPanel.classList.toggle('hidden', currentCoachTab !== 'ego');
  if (joshPanel) joshPanel.classList.toggle('hidden', currentCoachTab !== 'josh');

  // Sync tab button states
  document.querySelectorAll('.coach-tab').forEach(b => {
    b.classList.toggle('active', b.id === 'tab-' + currentCoachTab + '-btn');
  });

  // Show re-analyze button if there are past Ego conversations
  const reBtn = document.getElementById('btn-reanalyze');
  if (reBtn) reBtn.style.display = appData.conversations.length > 0 ? 'block' : 'none';
}

function renderLevelStrip() {
  const strip = document.getElementById('level-strip');
  if (!strip) return;
  const { level, totalTasksCompleted } = appData;
  const tasksForNext = level * 100;
  const tasksIntoLevel = totalTasksCompleted % 100;
  const pct = Math.round((tasksIntoLevel / 100) * 100);
  const title = getLevelTitle();
  strip.innerHTML = `
    <div class="level-badge">LVL ${level}</div>
    <div class="level-progress-wrap">
      <div class="level-progress-bar">
        <div class="level-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="level-progress-label">${tasksIntoLevel}/100 tasks → Level ${level + 1}</div>
    </div>
    <div class="level-title">${title}</div>`;
}

function getLevelTitle() {
  const lvl = appData.level || 1;
  if (lvl >= 15) return '🔥 Unstoppable';
  if (lvl >= 10) return '👑 Discipline Master';
  if (lvl >= 7)  return '💪 Consistent Crusher';
  if (lvl >= 5)  return '⭐ Rising Star';
  if (lvl >= 3)  return '📈 Getting Serious';
  if (lvl >= 2)  return '🌱 Building Habits';
  return '🆕 Beginner';
}

function renderCoachMessages() {
  const container = document.getElementById('coach-messages');
  if (!container) return;

  if (!appData.conversations || appData.conversations.length === 0) {
    container.innerHTML = `
      <div class="coach-empty">
        <div class="coach-empty-icon">🧠</div>
        <h3>Tera Ego Ready Hai!</h3>
        <p>Performance data bhejo — tera apna andar ki awaaz bilkul seedha sach batayega.</p>
        <p class="small muted">Mode: ${getPersonalityLabel(appData.settings.coachPersonality || 'beast')}</p>
      </div>`;
    return;
  }

  // Show last 10 conversations
  const recent = appData.conversations.slice(-10);
  container.innerHTML = recent.map(conv => buildChatHTML(conv)).join('');

  // Scroll to bottom
  const wrap = document.getElementById('coach-chat-wrap');
  if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 100);
}

function buildChatHTML(conv) {
  const timeStr = conv.timestamp ? new Date(conv.timestamp).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : '';
  // Convert newlines to <br> for display
  const responseHtml = escapeHtml(conv.response || '').replace(/\n/g, '<br>');
  let label;
  if (conv.type === 'auto') {
    label = `🤖 Auto Check (${escapeHtml(conv.triggerTime || '')}) — ${escapeHtml(conv.scoreLabel || '')}`;
  } else if (conv.type === 'weekly') {
    label = `📊 Weekly Report — ${escapeHtml(conv.scoreLabel || '')}`;
  } else if (conv.type === 'daily_progress') {
    label = `📈 Daily Progress Report — ${escapeHtml(conv.scoreLabel || '')}`;
  } else if (conv.type === 'score_query') {
    label = `❓ ${escapeHtml(conv.scoreLabel || 'Score Query')}`;
  } else if (conv.type === 'custom') {
    label = `📝 ${escapeHtml(conv.scoreLabel || 'Custom Report')}`;
  } else {
    label = `📊 ${escapeHtml(conv.scoreLabel || 'Performance Report')}`;
  }
  return `
    <div class="chat-msg user-msg">
      <div class="chat-bubble">${label}</div>
      <div class="chat-meta">${timeStr}</div>
    </div>
    <div class="chat-msg coach-msg">
      <div class="chat-bubble">${responseHtml}</div>
      <div class="chat-meta">
        🧠 Ego · ${timeStr}
        <button class="chat-copy-btn" data-conv-id="${escapeHtml(conv.id)}" onclick="copyConvById(this.dataset.convId)">📋 Copy</button>
      </div>
    </div>`;
}

function getPersonalityLabel(mode) {
  return { gentle: '🕊️ Ego — Gentle', balanced: '⚖️ Ego — Balanced', beast: '🔥 Ego — Beast' }[mode] || '🔥 Ego — Beast';
}

/* ─────────────────────────────────────────────
   PERSONALITY MANAGEMENT
───────────────────────────────────────────── */
function updatePersonalityChips(mode) {
  document.querySelectorAll('.p-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === mode);
  });
}

function setPersonality(mode) {
  appData.settings.coachPersonality = mode;
  saveData();
  updatePersonalityChips(mode);
  const ptBtn = document.getElementById('btn-personality-toggle');
  if (ptBtn) {
    const labels = { gentle: '🕊️ Gentle', balanced: '⚖️ Balanced', beast: '🔥 Beast' };
    ptBtn.textContent = labels[mode] || '🔥 Beast';
  }
  showToast('Personality: ' + getPersonalityLabel(mode));
}

function cyclePersonality() {
  const modes = ['gentle', 'balanced', 'beast'];
  const cur = appData.settings.coachPersonality || 'beast';
  const next = modes[(modes.indexOf(cur) + 1) % modes.length];
  setPersonality(next);
}

/* ─────────────────────────────────────────────
   EGO AI MODE — GEMINI API CALL
───────────────────────────────────────────── */
async function talkToCoach() {
  if (!hasAnyApiKey()) {
    showToast('⚠️ API key missing! Settings mein set karo.', 3000);
    showScreen('settings');
    scrollToCoachConfig();
    return;
  }

  const btn = document.getElementById('btn-talk-coach');
  const typing = document.getElementById('coach-typing');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyzing...'; }
  if (typing) typing.classList.remove('hidden');

  // Scroll typing indicator into view
  const wrap = document.getElementById('coach-chat-wrap');
  if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 50);

  try {
    const coachData = getCoachData();
    const systemPrompt = buildSystemPrompt();
    const userContent = formatCoachDataForPrompt(coachData);

    // Dynamic response length — poor score = longer brutal reality check
    const score = coachData.overall_score ? parseInt(coachData.overall_score) : 50;
    const personality = appData.settings.coachPersonality || 'beast';
    let maxTok = 600;
    if (personality === 'beast') {
      if (score < 40)      maxTok = 1200;
      else if (score < 60) maxTok = 900;
      else if (score < 80) maxTok = 700;
      else                 maxTok = 500;
    }

    const replyText = await callGeminiAPI(systemPrompt, (() => {
      const lastResp = getLastEgoResponse();
      const lastNote = lastResp
        ? `\n\nMERI LAST RESPONSE (jo maine pichli baar kahi thi — cross-check karo):\n"${lastResp.substring(0, 500)}"\n\nIs last response ko context ke roop mein use karo — kya user ne follow kiya? Accordingly react karo.`
        : '';
      return userContent + lastNote;
    })(), maxTok);

    // Save conversation
    const conv = {
      id: 'conv_' + Date.now(),
      timestamp: Date.now(),
      scoreLabel: `Score: ${coachData.overall_score} | Streak: ${coachData.current_streak} days`,
      coachData: coachData,
      personality: appData.settings.coachPersonality || 'beast',
      response: replyText
    };
    if (!appData.conversations) appData.conversations = [];
    appData.conversations.push(conv);
    // Keep last 30
    if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(-30);
    saveData();

    if (typing) typing.classList.add('hidden');
    renderCoachMessages();

    const reBtn = document.getElementById('btn-reanalyze');
    if (reBtn) reBtn.style.display = 'block';

  } catch (err) {
    if (typing) typing.classList.add('hidden');
    // Show error as a coach message
    const container = document.getElementById('coach-messages');
    if (container) {
      const errDiv = document.createElement('div');
      errDiv.className = 'chat-msg coach-msg';
      errDiv.innerHTML = `<div class="chat-bubble" style="border-color:#FF6B6B">⚠️ Error: ${escapeHtml(err.message)}<br><br>API key check karo ya internet connection dekho.</div>`;
      container.appendChild(errDiv);
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🧠 Ego se Baat Karo'; }
    if (typing) typing.classList.add('hidden');
  }
}

async function reanalyzeCoach() {
  await talkToCoach();
}

function buildSystemPrompt() {
  const s = appData.settings;
  const personality = s.coachPersonality || 'beast';
  const base = getActiveCoachPrompt(personality);

  // ── Bug Fix 3: IST time — always inject before anything else ──
  const _istHHMM = getNowISTHHMM();
  const istNow = getNowISTDate();
  const currentISTTime = istNow.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', hour12: true,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const _istTimeNote = `\n\n🕐 CURRENT IST TIME: ${_istHHMM} IST (Indian Standard Time = UTC+5:30 — ${currentISTTime}). ALWAYS use this time for ALL time comparisons. NEVER use UTC. DO NOT use Google Search to find current time — use the IST time provided here. Kisi bhi task ke window comparison ke liye yahi time use karo.`;

  // ── Bug Fix 2: Effective score — only count tasks whose window has EXPIRED ──
  const today = getTodayStr();
  const daily = getDailyScore(today);
  const score = daily.score || 0;
  const strictness = s.coachStrictness || 80;

  const _expiredTasks = appData.tasks.filter(t => {
    if (t.active === false) return false;
    const winEnd = t.workingWindowEnd || '';
    return winEnd && winEnd < _istHHMM; // only tasks whose window has already CLOSED
  });
  const _dayNotStarted = _expiredTasks.length === 0; // no window has expired yet → day hasn't truly started
  const _expiredDone = _expiredTasks.filter(t => {
    const e = appData.history.find(h => h.taskId === t.id && h.date === today);
    return e && e.completed;
  }).length;
  const _effectiveScore = _dayNotStarted ? null : Math.round((_expiredDone / _expiredTasks.length) * 100);

  // ── Bug Fix 2: Brutality based on EFFECTIVE score, not raw getDailyScore ──
  let brutalityNote = '';
  if (personality === 'beast') {
    if (_dayNotStarted) {
      brutalityNote = `\n\n⚠️ SCORE CALIBRATION: Abhi tak kisi bhi task ki working window expire nahi hui — din abhi shuru hi hua hai ya task windows abhi khuli nahi. Isliye 0% score koi failure NAHI hai. DO NOT roast for zero score. Tasks jo "NOT YET STARTED 🔮" hain unhe judge MAT karo. Bas upcoming tasks ke liye energy aur focus de. Agar koi task tha jiska window already close ho gaya ho aur wo done nahi hua — sirf wohi judge karo.`;
    } else if (_effectiveScore < 40) {
      brutalityNote = `\n\n⚠️ SCORE CALIBRATION: Expire hui windows mein se sirf ${_effectiveScore}% tasks complete — YEH BAHUT KHARAB HAI. MAXIMUM BRUTALITY MODE ON. Ek ek miss pe roast kar. 300-400 words. Phir bhi ending mein fire daal.`;
    } else if (_effectiveScore < 60) {
      brutalityNote = `\n\n⚠️ SCORE CALIBRATION: Expire hui windows mein ${_effectiveScore}% — below average. HIGH BRUTALITY. Missed tasks pe seedha jaao, goals se connect karo. 200-300 words.`;
    } else if (_effectiveScore < 80) {
      brutalityNote = `\n\n⚠️ SCORE CALIBRATION: Expire hui windows mein ${_effectiveScore}% — theek hai but not enough. MODERATE HONEST. Direct feedback. 150-200 words.`;
    } else {
      brutalityNote = `\n\n⚠️ SCORE CALIBRATION: Expire hui windows mein ${_effectiveScore}% — achha hai. NO BRUTALITY but NO SUGAR COAT. Short, serious energy. 80-120 words max.`;
    }
    if (!_dayNotStarted) {
      if (strictness >= 90) brutalityNote += ' STRICTNESS MAXIMUM — ek bhi excuse mat sunna.';
      else if (strictness <= 30) brutalityNote += ' Strictness low — thoda calm raho lekin honest raho.';
    }
  } else if (personality === 'balanced') {
    brutalityNote = _dayNotStarted
      ? `\n\nSCORE: Din abhi shuru hua hai — koi window expire nahi hui. Upcoming tasks ke liye positive aur focused rahna.`
      : `\n\nSCORE: Expire hui windows mein ${_effectiveScore}%. Balanced honest feedback do.`;
  } else {
    brutalityNote = _dayNotStarted
      ? `\n\nSCORE: Din shuru ho raha hai. Gently encourage karo upcoming tasks ke liye.`
      : `\n\nSCORE: Expire hui windows mein ${_effectiveScore}%. Gently honest raho.`;
  }

  // ── EGO CONTEXT: Life Goals ──
  const lifeGoals = (s.egoLifeGoals || '').trim();
  const goalsNote = lifeGoals
    ? '\n\n🎯 MERI LIFE GOALS (inhe performance se directly connect karo):\n' + lifeGoals
    : '';

  // ── EGO CONTEXT: What others say negatively ──
  const negWords = (s.egoNegativeWords || '').trim();
  const negNote = negWords
    ? '\n\n💬 LOG KYA KEHTE HAIN (low score pe fuel ki tarah use karo — reference karo inhe):\n' + negWords
    : '';

  // ── EGO CONTEXT: Task "Why It Matters" notes ──
  const taskWhyLines = appData.tasks
    .filter(t => t.active !== false && t.whyMatters && t.whyMatters.trim())
    .map(t => `• ${t.name}: "${t.whyMatters.trim()}"`)
    .join('\n');
  const whyNote = taskWhyLines
    ? '\n\n📋 HAR TASK KA "WHY" (jo tune khud likha tha — missed tasks ke liye seedha quote kar):\n' + taskWhyLines
    : '';

  // ── Bug Fix 1: Task status with TIME-AWARE classification ──
  const effortLines = appData.tasks
    .filter(t => t.active !== false)
    .map(t => {
      const entry = appData.history.find(h => h.taskId === t.id && h.date === today);
      const cat = appData.categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : '';
      const winStart = t.workingWindowStart || '00:00';
      const winEnd   = t.workingWindowEnd   || '23:59';
      const ww = t.workingWindowEnd
        ? `Working window: ${winStart}–${winEnd} IST`
        : (t.workingWindowStart ? `Start: ${winStart} IST` : 'No window set');

      if (entry && entry.completed) {
        const eff = entry.effortDeclared ? `Effort: ${entry.effortScore}/10` : 'Effort: not declared (full credit given)';
        return `• [${catName}] ${t.name} — ✅ DONE | ${eff} | ${ww}`;
      } else if (entry && entry.isUntracked) {
        return `• [${catName}] ${t.name} — ⚠️ UNTRACKED (window closed without marking — 0 score) | ${ww}`;
      } else if (entry && !entry.completed) {
        return `• [${catName}] ${t.name} — ❌ MISSED (window already closed, marked not done) | ${ww}`;
      } else {
        // No history entry — classify purely by IST time vs working window
        if (_istHHMM < winStart) {
          return `• [${catName}] ${t.name} — 🔮 NOT YET STARTED (window opens at ${winStart} IST — DO NOT judge this task as failed, it hasn't even started) | ${ww}`;
        } else if (_istHHMM <= winEnd) {
          return `• [${catName}] ${t.name} — ⏳ IN PROGRESS (window active ${winStart}–${winEnd} IST — abhi time hai, user may still complete or mark done before window closes) | ${ww}`;
        } else {
          return `• [${catName}] ${t.name} — ❌ MISSED (window ${winStart}–${winEnd} IST already closed, no entry — counts as not done) | ${ww}`;
        }
      }
    }).join('\n');

  const effortNote = effortLines
    ? '\n\n📊 TASK STATUS + WORKING WINDOW (IST-based, time-aware classification):\n' + effortLines
    : '';

  return base + _istTimeNote + brutalityNote + goalsNote + negNote + whyNote + effortNote;
}

/* ─────────────────────────────────────────────
   GET ACTIVE COACH PROMPT
   Returns saved custom prompt OR personality default
───────────────────────────────────────────── */
function getActiveCoachPrompt(personality) {
  const s = appData.settings;
  if (s.coachPrompt && s.coachPrompt.trim()) return s.coachPrompt;
  if (personality === 'gentle')   return DEFAULT_GENTLE_PROMPT;
  if (personality === 'balanced') return DEFAULT_BALANCED_PROMPT;
  return DEFAULT_BEAST_PROMPT;
}

function formatCoachDataForPrompt(data) {
  return `PERFORMANCE REPORT:
Date: ${data.date}
Overall Score: ${data.overall_score}
Tasks Done: ${data.tasks_done}
Points: ${data.points_earned}
Effort Avg Today: ${data.effort_avg_today || 'N/A'}
Untracked Tasks (window expired): ${data.untracked_tasks || 0}
Current Streak: ${data.current_streak} days (target: ${data.streak_target})
Streak met today: ${data.streak_met_today ? 'YES ✅' : 'NO ❌'}
Weekly Average: ${data.weekly_avg}
All-time Average: ${data.all_time_avg}

CATEGORY BREAKDOWN (with effort scores and working windows):
${Object.entries(data.category_breakdown).map(([cat, val]) => {
  const tasks = Object.entries(val.tasks).map(([t, taskData]) => {
    if (typeof taskData === 'object') {
      const ww = taskData.workingWindow && taskData.workingWindow !== 'not set'
        ? ` | Window: ${taskData.workingWindow}` : '';
      const why = taskData.whyMatters ? ` | Why: "${taskData.whyMatters}"` : '';
      return `  • ${t} [${taskData.priority}]: ${taskData.status}${ww}${why}`;
    }
    return `  • ${t}: ${taskData}`;
  }).join('\n');
  return `${cat} — ${val.score}\n${tasks}`;
}).join('\n\n')}

MISSED REASONS TODAY: ${data.missed_reasons_today.length ? data.missed_reasons_today.join(', ') : 'None'}
WORST STREAK TASK: ${data.worst_streak_task}
PATTERNS: ${data.patterns.length ? data.patterns.join(' | ') : 'Insufficient data'}
GOAL: ${data.user_goal}
Total Days Tracked: ${data.total_days_tracked}
Total Tasks Completed Ever: ${data.total_tasks_completed}`;
}

function copyConvById(convId) {
  const conv = (appData.conversations || []).find(c => c.id === convId);
  if (conv) copyCoachResponse(conv.response);
}

function copyCoachResponse(text) {
  navigator.clipboard.writeText(text).then(() => showToast('✅ Copied!')).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✅ Copied!');
  });
}

function clearConversations() {
  if (!appData.conversations || appData.conversations.length === 0) {
    showToast('Koi conversation nahi hai'); return;
  }
  if (confirm('Saari coach conversations delete karein?')) {
    appData.conversations = [];
    saveData();
    renderCoachMessages();
    const reBtn = document.getElementById('btn-reanalyze');
    if (reBtn) reBtn.style.display = 'none';
    showToast('🗑️ Cleared');
  }
}

/* ─────────────────────────────────────────────
   SCROLL TO COACH CONFIG IN SETTINGS
───────────────────────────────────────────── */
function scrollToCoachConfig() {
  setTimeout(() => {
    const el = document.getElementById('coach-config-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ─────────────────────────────────────────────
   SETTINGS: COACH CONFIG WIRING
───────────────────────────────────────────── */
function renderCoachSettings() {
  const s = appData.settings;

  // API key (masked display)
  const keyInp = document.getElementById('coach-api-key-input');
  if (keyInp && s.coachApiKey) keyInp.value = s.coachApiKey;
  const keyInp2 = document.getElementById('coach-api-key-input-2');
  if (keyInp2) keyInp2.value = s.coachApiKey2 || '';
  const keyInp3 = document.getElementById('coach-api-key-input-3');
  if (keyInp3) keyInp3.value = s.coachApiKey3 || '';
  const keyInp4 = document.getElementById('coach-api-key-input-4');
  if (keyInp4) keyInp4.value = s.coachApiKey4 || '';
  const keyInp5 = document.getElementById('coach-api-key-input-5');
  if (keyInp5) keyInp5.value = s.coachApiKey5 || '';
  refreshApiKeyStats();

  // Gemini model selector
  const modelSel = document.getElementById('gemini-model-select');
  if (modelSel) modelSel.value = s.geminiModel || 'gemini-2.5-flash';

  // Google Search toggle
  const searchToggle = document.getElementById('gemini-search-toggle');
  if (searchToggle) searchToggle.checked = s.geminiSearchEnabled !== false;

  // Personality select
  const pSel = document.getElementById('coach-personality-select');
  if (pSel) pSel.value = s.coachPersonality || 'beast';

  // Strictness slider
  const slider = document.getElementById('coach-strictness');
  if (slider) slider.value = s.coachStrictness || 80;
  const slLabel = document.getElementById('strictness-label');
  if (slLabel) slLabel.textContent = (s.coachStrictness || 80) + '%';

  // System prompt — show the currently active prompt (or default)
  const promptTA = document.getElementById('coach-prompt-textarea');
  if (promptTA) {
    const mode = s.coachPersonality || 'beast';
    promptTA.value = getActiveCoachPrompt(mode);
  }

  // Ego fields
  const lifeGoalsTA = document.getElementById('ego-life-goals');
  if (lifeGoalsTA) lifeGoalsTA.value = s.egoLifeGoals || '';

  const negWordsTA = document.getElementById('ego-negative-words');
  if (negWordsTA) negWordsTA.value = s.egoNegativeWords || '';

  // Profile + badges
  renderProfileSection();

  // Sync weekly/daily report toggles (fixes toggles not reflecting saved state)
  renderAutoCoachSettings();
}

function updateCoachApiKey(val) {
  appData.settings.coachApiKey = val.trim();
  saveData();
  // Hide no-key banner on coach screen if present
  const banner = document.getElementById('coach-no-key-banner');
  if (banner) banner.classList.toggle('hidden', !!val.trim());
  refreshApiKeyStats();
}

function updateCoachApiKey2(val) {
  appData.settings.coachApiKey2 = val.trim();
  saveData();
  refreshApiKeyStats();
}

function updateCoachApiKey3(val) {
  appData.settings.coachApiKey3 = val.trim();
  saveData();
  refreshApiKeyStats();
}

function updateGeminiModel(val) {
  appData.settings.geminiModel = val;
  saveData();
  showToast('Model: ' + val);
}

function updateGeminiSearch(checked) {
  appData.settings.geminiSearchEnabled = checked;
  saveData();
  showToast(checked ? '🔍 Web search ON' : '🔍 Web search OFF');
}

function updateCoachPersonality(val) {
  appData.settings.coachPersonality = val;
  // Reset prompt to default for new personality
  appData.settings.coachPrompt = '';
  saveData();
  renderCoachSettings();
  showToast('Personality changed: ' + getPersonalityLabel(val));
}

function updateStrictness(val) {
  appData.settings.coachStrictness = parseInt(val);
  saveData();
  const lbl = document.getElementById('strictness-label');
  if (lbl) lbl.textContent = val + '%';
}

function updateCoachPrompt(val) {
  appData.settings.coachPrompt = val;
  saveData();
}

function updateEgoLifeGoals(val) {
  appData.settings.egoLifeGoals = val;
  saveData();
}

function updateEgoNegativeWords(val) {
  appData.settings.egoNegativeWords = val;
  saveData();
}

function resetCoachPrompt() {
  appData.settings.coachPrompt = '';
  saveData();
  const mode = appData.settings.coachPersonality || 'beast';
  const ta = document.getElementById('coach-prompt-textarea');
  if (ta) ta.value = getActiveCoachPrompt(mode);
  showToast('✅ Default prompt restore ho gaya');
}

async function testCoachConnection() {
  const keyInfo = getAvailableApiKey();
  const apiKey  = keyInfo ? keyInfo.key : (appData.settings.coachApiKey || '');
  const model   = appData.settings.geminiModel || 'gemini-2.5-flash';
  const status = document.getElementById('connection-status');
  if (!apiKey) {
    if (status) { status.textContent = '❌ No key'; status.style.color = '#FF6B6B'; }
    showToast('API key enter karo pehle');
    return;
  }
  if (status) { status.textContent = '⏳ Testing...'; status.style.color = 'var(--text-secondary)'; }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });
    if (res.ok) {
      if (status) { status.textContent = '✅ Connected'; status.style.color = '#00B894'; }
      showToast('✅ Gemini connected!');
    } else {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error?.message || `HTTP ${res.status}`);
    }
  } catch (e) {
    if (status) { status.textContent = '❌ Failed'; status.style.color = '#FF6B6B'; }
    showToast('❌ ' + e.message, 3000);
  }
}

/* ─────────────────────────────────────────────
   CHANGE 8 — LAST RESPONSE HELPERS
   Attach the last AI response to every API call
   so the AI knows what it said before
───────────────────────────────────────────── */
function getLastEgoResponse() {
  const convs = appData.conversations || [];
  for (let i = 0; i < convs.length; i++) {
    if (convs[i].response && convs[i].response.trim()) {
      return convs[i].response.trim();
    }
  }
  return null;
}

function getLastJoshResponse() {
  const convs = appData.joshConversations || [];
  for (let i = 0; i < convs.length; i++) {
    if (convs[i].response && convs[i].response.trim()) {
      return convs[i].response.trim();
    }
  }
  return null;
}

/* ─────────────────────────────────────────────
   SHARED GEMINI API HELPER
   Used by talkToCoach AND all auto-reports
   Supports Google Search grounding (web search)
───────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════
   SMART API KEY ROTATION SYSTEM
   Free tier: 20 RPD / 5 RPM per key
   Automatically switches to next available key when one hits limits.
   Supports up to 3 Gemini API keys.
═══════════════════════════════════════════════════════════════ */

const API_KEY_RPD_SAFE = 18; // fire at 18/20 — 2 buffer
const API_KEY_RPM_SAFE = 4;  // fire at 4/5  — 1 buffer

function hasAnyApiKey() {
  const s = appData.settings;
  return !!(s.coachApiKey || s.coachApiKey2 || s.coachApiKey3 || s.coachApiKey4 || s.coachApiKey5);
}

function getAvailableApiKey() {
  const s = appData.settings;
  const allKeys = [
    { key: s.coachApiKey,  id: 'key_0', label: 'Key 1' },
    { key: s.coachApiKey2, id: 'key_1', label: 'Key 2' },
    { key: s.coachApiKey3, id: 'key_2', label: 'Key 3' },
    { key: s.coachApiKey4, id: 'key_3', label: 'Key 4' },
    { key: s.coachApiKey5, id: 'key_4', label: 'Key 5' }
  ].filter(k => k.key && k.key.trim());

  if (!allKeys.length) return null;
  if (!s.apiKeyStats) s.apiKeyStats = {};

  const todayStr  = getTodayStr();
  const minuteStr = todayStr + 'T' + getNowISTHHMM();

  // Round-robin: start from _apiRoundRobinIdx, cycle through all keys
  const startIdx = _apiRoundRobinIdx % allKeys.length;

  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const idx  = (startIdx + attempt) % allKeys.length;
    const k    = allKeys[idx];
    const stats   = s.apiKeyStats[k.id] || {};
    const rpdUsed = (stats.rpd && stats.rpd.date   === todayStr)  ? stats.rpd.count  : 0;
    const rpmUsed = (stats.rpm && stats.rpm.minute === minuteStr) ? stats.rpm.count  : 0;

    if (rpdUsed >= API_KEY_RPD_SAFE) continue; // day limit hit — try next
    if (rpmUsed >= API_KEY_RPM_SAFE) continue; // minute limit hit — try next

    // Advance round-robin index for next call
    _apiRoundRobinIdx = (idx + 1) % allKeys.length;
    return { key: k.key, keyId: k.id, label: k.label, rpdUsed, rpmUsed };
  }

  return null; // all keys exhausted
}

function trackApiKeyUsage(keyId) {
  const s = appData.settings;
  if (!s.apiKeyStats)         s.apiKeyStats         = {};
  if (!s.apiKeyStats[keyId])  s.apiKeyStats[keyId]  = {};

  const todayStr  = getTodayStr();
  const minuteStr = todayStr + 'T' + getNowISTHHMM();
  const stats = s.apiKeyStats[keyId];

  // RPD counter
  if (!stats.rpd || stats.rpd.date !== todayStr)
    stats.rpd = { date: todayStr, count: 0 };
  stats.rpd.count++;

  // RPM counter
  if (!stats.rpm || stats.rpm.minute !== minuteStr)
    stats.rpm = { minute: minuteStr, count: 0 };
  stats.rpm.count++;

  saveData();
  refreshApiKeyStats();
}

function markKeyRateLimited(keyId) {
  const s        = appData.settings;
  const todayStr = getTodayStr();
  const min      = todayStr + 'T' + getNowISTHHMM();
  if (!s.apiKeyStats)        s.apiKeyStats        = {};
  if (!s.apiKeyStats[keyId]) s.apiKeyStats[keyId] = {};
  s.apiKeyStats[keyId].rpm = { minute: min, count: 99 };
  saveData();
}

function refreshApiKeyStats() {
  const el = document.getElementById('api-key-stats-display');
  if (!el) return;

  const s = appData.settings;
  const todayStr = getTodayStr();
  const keys = [
    { key: s.coachApiKey,  id: 'key_0', label: 'Key 1' },
    { key: s.coachApiKey2, id: 'key_1', label: 'Key 2' },
    { key: s.coachApiKey3, id: 'key_2', label: 'Key 3' },
    { key: s.coachApiKey4, id: 'key_3', label: 'Key 4' },
    { key: s.coachApiKey5, id: 'key_4', label: 'Key 5' }
  ];

  const rows = keys.map(k => {
    if (!k.key || !k.key.trim()) return '';
    const stats   = (s.apiKeyStats || {})[k.id] || {};
    const rpdUsed = (stats.rpd && stats.rpd.date === todayStr) ? stats.rpd.count : 0;
    const masked  = k.key.substring(0, 8) + '…';
    const pct     = Math.round((rpdUsed / 20) * 100);
    const color   = rpdUsed >= 18 ? '#FF6B6B' : rpdUsed >= 12 ? '#FFA07A' : '#00B894';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;">
      <span style="color:var(--text-secondary)">${k.label} <span style="opacity:.6">(${masked})</span></span>
      <span style="color:${color};font-weight:600">${rpdUsed}/20 RPD</span>
    </div>`;
  }).filter(Boolean).join('');

  el.innerHTML = rows || '<span style="color:var(--text-secondary);font-size:12px;">No keys configured</span>';
}

function updateCoachApiKey4(val) {
  appData.settings.coachApiKey4 = val.trim();
  saveData();
  refreshApiKeyStats();
}

function updateCoachApiKey5(val) {
  appData.settings.coachApiKey5 = val.trim();
  saveData();
  refreshApiKeyStats();
}

async function callGeminiAPI(systemPrompt, userContent, maxTokens) {
  // ── Silent retry: try all available keys before giving up ──
  // This prevents a single key's rate limit / error from breaking user experience.
  const s = appData.settings;
  const allKeys = [
    { key: s.coachApiKey,  id: 'key_0', label: 'Key 1' },
    { key: s.coachApiKey2, id: 'key_1', label: 'Key 2' },
    { key: s.coachApiKey3, id: 'key_2', label: 'Key 3' },
    { key: s.coachApiKey4, id: 'key_3', label: 'Key 4' },
    { key: s.coachApiKey5, id: 'key_4', label: 'Key 5' }
  ].filter(k => k.key && k.key.trim());

  if (!allKeys.length) {
    throw new Error('Koi bhi API key configure nahi hai. Settings mein Gemini API key add karo.');
  }

  const model         = s.geminiModel || 'gemini-2.5-flash';
  const searchEnabled = s.geminiSearchEnabled !== false;

  let lastError = null;
  // Start from round-robin index, cycle through ALL keys
  const startIdx = _apiRoundRobinIdx % allKeys.length;

  for (let attempt = 0; attempt < allKeys.length; attempt++) {
    const idx = (startIdx + attempt) % allKeys.length;
    const k   = allKeys[idx];

    // Check daily/per-minute limits for this key
    const todayStr  = getTodayStr();
    const minuteStr = todayStr + 'T' + getNowISTHHMM();
    const stats   = (s.apiKeyStats || {})[k.id] || {};
    const rpdUsed = (stats.rpd && stats.rpd.date   === todayStr)  ? stats.rpd.count  : 0;
    const rpmUsed = (stats.rpm && stats.rpm.minute === minuteStr) ? stats.rpm.count  : 0;
    if (rpdUsed >= API_KEY_RPD_SAFE) continue; // day limit — skip silently
    if (rpmUsed >= API_KEY_RPM_SAFE) continue; // minute limit — skip silently

    // Track usage before fetch
    trackApiKeyUsage(k.id);
    _apiRoundRobinIdx = (idx + 1) % allKeys.length;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${k.key}`;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.85,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };
    if (searchEnabled) {
      body.tools = [{ google_search: {} }];
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg  = errData.error?.message || `HTTP ${response.status}`;
        if (response.status === 429) markKeyRateLimited(k.id); // immediately mark RPM exhausted
        lastError = new Error(`[${k.label}] ${errMsg}`);
        continue; // silently try next key
      }

      const data  = await response.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text  = parts.map(p => p.text || '').join('') || '';
      if (!text) {
        lastError = new Error(`[${k.label}] Empty response from API`);
        continue; // try next key
      }
      return text; // ✅ success

    } catch (fetchErr) {
      lastError = new Error(`[${k.label}] Network error: ${fetchErr.message}`);
      continue; // silently try next key
    }
  }

  // All keys exhausted — NOW show error
  throw new Error(lastError
    ? lastError.message + '\n\nSab API keys try ho gayi. Thodi der baad try karo ya nayi key add karo.'
    : 'Sab API keys ka daily/per-minute limit hit ho gaya. Thodi der baad try karo ya nayi key add karo.');
}

// Legacy alias
const callGroqAPI = callGeminiAPI;

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 5 — CUSTOM MANUAL REPORT
   User pastes any data (exam results, notes, etc.)
   Coach analyzes it with context of current performance
═══════════════════════════════════════════════════════════════ */

function toggleCustomReport() {
  const body  = document.getElementById('custom-report-body');
  const arrow = document.getElementById('custom-report-arrow');
  if (!body) return;
  const isHidden = body.classList.contains('hidden');
  body.classList.toggle('hidden', !isHidden);
  if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
}

async function sendCustomReport() {
  const input  = document.getElementById('custom-report-input');
  const userText = input ? input.value.trim() : '';
  if (!userText) {
    showToast('⚠️ Kuch toh likho pehle!');
    return;
  }

  const apiKey = appData.settings.coachApiKey;
  if (!apiKey) {
    showToast('⚠️ API key missing! Settings mein set karo.');
    showScreen('settings');
    scrollToCoachConfig();
    return;
  }

  const btn = document.querySelector('.custom-report-actions .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Coach analyze kar raha hai...'; }

  const typing = document.getElementById('coach-typing');
  if (typing) typing.classList.remove('hidden');
  const wrap = document.getElementById('coach-chat-wrap');
  if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 50);

  try {
    // Build system prompt using current personality
    const systemPrompt = buildSystemPrompt();

    // Attach current app performance context
    const coachData  = getCoachData();
    const appContext = `CURRENT APP PERFORMANCE CONTEXT:\n${formatCoachDataForPrompt(coachData)}\n\n---\n\nUSER KA CUSTOM DATA / QUESTION:\n${userText}`;

    const replyText = await callGroqAPI(systemPrompt, appContext, 1000);

    // Save to conversation history
    const conv = {
      id:         'conv_custom_' + Date.now(),
      type:       'custom',
      timestamp:  Date.now(),
      scoreLabel: 'Custom Report — ' + userText.substring(0, 60) + (userText.length > 60 ? '…' : ''),
      coachData:  coachData,
      personality: appData.settings.coachPersonality || 'beast',
      response:   replyText
    };
    if (!appData.conversations) appData.conversations = [];
    appData.conversations.push(conv);
    if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(-30);
    saveData();

    if (typing) typing.classList.add('hidden');
    renderCoachMessages();

    // Scroll to bottom to see response
    if (wrap) setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 150);

    // Clear input and collapse section
    if (input) input.value = '';
    const body = document.getElementById('custom-report-body');
    const arrow = document.getElementById('custom-report-arrow');
    if (body)  body.classList.add('hidden');
    if (arrow) arrow.textContent = '▼';

    const reBtn = document.getElementById('btn-reanalyze');
    if (reBtn) reBtn.style.display = 'block';

  } catch (err) {
    if (typing) typing.classList.add('hidden');
    const container = document.getElementById('coach-messages');
    if (container) {
      const errDiv = document.createElement('div');
      errDiv.className = 'chat-msg coach-msg';
      errDiv.innerHTML = `<div class="chat-bubble" style="border-color:#FF6B6B">⚠️ Error: ${escapeHtml(err.message)}</div>`;
      container.appendChild(errDiv);
    }
    showToast('❌ ' + err.message, 3000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Coach Ko Bhejo'; }
    if (typing) typing.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 5 — FEATURE 1: SCHEDULED AUTO-COACH NOTIFICATIONS
   User sets up to 3 times. At each time, app sends filtered
   task data to Groq, fires a notification, saves to history.
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   checkAutoCoachTriggers — called inside checkNotifications()
───────────────────────────────────────────── */
function checkAutoCoachTriggers(hhmm) {
  // AUTO API CALLS REMOVED — notifications are pre-scheduled via scheduleAllCapacitorNotifications()
  // Inbox entries are added via buildMissedInboxEntries() on app open
  // No-op: kept for reference only
}

/* ─────────────────────────────────────────────
   runAutoCoachReport — fetches Groq, fires notification
───────────────────────────────────────────── */
async function runAutoCoachReport(triggerTime) {
  const today = getTodayStr();

  // Build filtered data — only tasks whose window starts at or before triggerTime
  const data = getCoachData();
  data.report_type  = 'auto_check';
  data.check_time   = triggerTime;

  const tasksDueByNow = appData.tasks
    .filter(t => t.active !== false)
    .filter(t => {
      const startTime = t.workingWindowStart || t.scheduledTime || '00:00';
      return startTime <= triggerTime;
    })
    .map(t => {
      const entry = appData.history.find(h => h.taskId === t.id && h.date === today);
      const done = entry && entry.completed;
      const cat = appData.categories.find(c => c.id === t.categoryId);
      // Task window end is after triggerTime → may still be pending (not expired yet)
      const windowEndAfterNow = t.workingWindowEnd && t.workingWindowEnd > triggerTime;
      return {
        name: t.name,
        category: cat ? cat.name : '',
        scheduledTime: t.workingWindowStart || t.scheduledTime,
        workingWindowEnd: t.workingWindowEnd || '',
        completed: !!done,
        effortScore: done && entry ? (entry.effortScore || 0) : 0,
        effortDeclared: done && entry ? (!!entry.effortDeclared) : false,
        isUntracked: entry ? (!!entry.isUntracked) : false,
        isPending: !done && !!windowEndAfterNow,  // still has time left
        whyMatters: t.whyMatters || ''
      };
    });

  const doneCount     = tasksDueByNow.filter(t => t.completed).length;
  const totalDue      = tasksDueByNow.length;
  const untrackedNow  = tasksDueByNow.filter(t => t.isUntracked).length;
  const pendingNow    = tasksDueByNow.filter(t => t.isPending).length;

  data.tasks_due_by_now = tasksDueByNow;
  data.due_summary      = `${doneCount}/${totalDue} tasks completed by ${triggerTime} | Untracked: ${untrackedNow} | Still pending (window open): ${pendingNow}`;

  // Use full buildSystemPrompt() — same detailed workflow as manual Tera-Ego
  const systemPrompt = buildSystemPrompt();
  const timeContext = `\n\nAUTO CHECK TIME: ${triggerTime}\nTasks due by now (${triggerTime} tak ka data):\n${tasksDueByNow.map(t =>
    `• [${t.category}] ${t.name} — ${
      t.completed ? `✅ DONE (effort ${t.effortScore}/10)` :
      t.isUntracked ? `⚠️ UNTRACKED (window closed — worst case 0 score)` :
      t.isPending   ? `⏳ PENDING (window abhi open hai — ${t.workingWindowEnd} tak time hai)` :
                      `❌ NOT DONE`
    } | Window: ${t.scheduledTime || '?'}→${t.workingWindowEnd || '?'} | Why: ${t.whyMatters}`
  ).join('\n') || 'Koi task due nahi is time tak'}

Summary: ${doneCount}/${totalDue} done | Untracked: ${untrackedNow} | Pending (window open): ${pendingNow}

Format response as:
Line 1: Ek punchy headline title (notification ke liye — max 90 chars, Hinglish, personal aur direct)
Blank line
Full detailed reality check response (task-by-task analysis, working window, efforts, life goals, negative words — sab kuch use kar as per teri personality)`;

  // Call Gemini API with full context
  const fullResponse = await callGroqAPI(systemPrompt, timeContext + '\n\n' + JSON.stringify(data), 800);

  // Extract first line as notification title, rest as body
  const lines = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Tera-Ego ka check — dekho!';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save to conversation history FIRST (always, regardless of app state)
  if (!appData.conversations) appData.conversations = [];
  appData.conversations.unshift({
    id:           'conv_auto_' + Date.now(),
    type:         'auto',
    triggerTime,
    date:         today,
    timestamp:    Date.now(),
    scoreLabel:   data.due_summary,
    dataSnapshot: data,
    response:     fullResponse,
    headline,
    personality:  appData.settings.autoCoachPersonality || 'beast'
  });
  if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(0, 30);
  saveData();

  // ── Decide how to deliver the response based on app state ──
  if (_appInForeground) {
    // App is OPEN → show directly in UI, no notification
    if (currentScreen === 'coach') {
      switchCoachTab('ego');
      renderCoachScreen();
    }
    if (currentScreen === 'inbox') renderInboxScreen();
    showToast(`🧠 Ego: ${headline.substring(0, 60)}`, true);
  } else {
    // App is in BACKGROUND → fire native notification with real Gemini response
    const capFiredEgo = await fireCapacitorNativeNotif(
      '🧠 ' + headline,
      notifBody,
      'aainik-ego',
      'auto'
    );
    if (!capFiredEgo) fireAiNotification(headline, notifBody, 'auto-coach-' + triggerTime, 'auto');
  }
}

/* ─────────────────────────────────────────────
   buildAutoCoachPrompt — Hinglish prompt for auto-checks
───────────────────────────────────────────── */
function buildAutoCoachPrompt(done, total, time) {
  const pct         = total > 0 ? Math.round((done / total) * 100) : 0;
  const personality = appData.settings.autoCoachPersonality || 'beast';

  let tone;
  if (personality === 'beast') {
    tone = `Tu ek brutal, no-excuse Hinglish coach hai. Harsh, sarcastic if needed. Short punchy sentences. Hinglish (Hindi+English mix).`;
  } else if (personality === 'balanced') {
    tone = `Tu ek honest Hinglish coach hai. Direct but not cruel. Hindi aur English naturally mix karo.`;
  } else {
    tone = `Tu ek encouraging Hinglish coach hai. Warm but real. Positive framing.`;
  }

  return `${tone}

User ne ${time} tak ${total} scheduled tasks mein se sirf ${done} complete kiye hain (${pct}%).

Data mein har task ka effort score (0-10), working window (start→end time), category name, aur "why it matters" bhi hai.
UNTRACKED tasks wo hain jinki working window band ho gayi aur user ne complete nahi kiya — yeh WORST CASE hai.
PENDING tasks wo hain jinki window abhi bhi open hai — inke liye remaining time ka pressure dena.
Completed tasks ke effort score dekho — kam effort pe bhi roast karo (e.g., "kiya toh sahi lekin sirf 2/10 effort?").
Category name + task name se context infer karo aur specific baat karo.

EXACTLY 2 parts likhna — blank line se separate:

PART 1 (notification headline): EK short punchy sentence Hinglish mein. Max 90 characters. Phone notification pe dikhega. Personal aur urgent feel karna chahiye.

PART 2 (full message): 3-5 sentences detailed coaching. Specific task names, effort scores, working windows reference karo. Batao user ko abhi kya karna chahiye.

Koi bullet points nahi. "Part 1" / "Part 2" labels nahi likhna. Sirf text with blank line between them.`;
}

/* ─────────────────────────────────────────────
   AUTO-COACH SETTINGS MANAGEMENT
───────────────────────────────────────────── */
function renderAutoCoachSettings() {
  const s = appData.settings;

  const toggleEl = document.getElementById('auto-coach-toggle');
  if (toggleEl) toggleEl.checked = !!s.autoCoachEnabled;

  const persSel = document.getElementById('auto-coach-personality');
  if (persSel) persSel.value = s.autoCoachPersonality || 'beast';

  // Editable max per day
  const maxInp = document.getElementById('auto-coach-max-per-day');
  if (maxInp) maxInp.value = s.autoCoachMaxPerDay || 3;

  // Last 7 Days report
  const wkToggle = document.getElementById('last7days-report-toggle');
  if (wkToggle) wkToggle.checked = !!s.last7DaysReportEnabled;
  const wkTime = document.getElementById('last7days-report-time');
  if (wkTime) wkTime.value = s.last7DaysReportTime || '20:00';

  // Overall progress report
  const dpToggle = document.getElementById('overall-progress-toggle');
  if (dpToggle) dpToggle.checked = !!s.overallProgressEnabled;
  const dpTime = document.getElementById('overall-progress-time');
  if (dpTime) dpTime.value = s.overallProgressTime || '21:30';

  renderAutoCoachTimeList();
}

function renderAutoCoachTimeList() {
  const container = document.getElementById('auto-coach-times-list');
  if (!container) return;
  const times = appData.settings.autoCoachTimes || [];

  container.innerHTML = times.map((entry, idx) => `
    <div class="auto-coach-time-row" id="actr-${entry.id}">
      <label class="actr-toggle">
        <input type="checkbox" ${entry.enabled ? 'checked' : ''}
               onchange="toggleAutoCoachTime('${entry.id}', this.checked)" />
      </label>
      <input type="time" class="setting-input-time actr-time"
             value="${entry.time}"
             onchange="updateAutoCoachTime('${entry.id}', this.value)" />
      <button class="actr-remove" onclick="removeAutoCoachTime('${entry.id}')"
              title="Remove">✕</button>
    </div>`).join('');

  // Show/hide Add button based on user-configurable max
  const addBtn = document.getElementById('btn-add-auto-coach-time');
  const maxPer = appData.settings.autoCoachMaxPerDay || 3;
  if (addBtn) addBtn.style.display = times.length >= maxPer ? 'none' : 'block';
}

function toggleAutoCoachEnabled(val) {
  appData.settings.autoCoachEnabled = val;
  saveData();
  showToast(val ? '✅ Auto-coach reports ON' : '🔕 Auto-coach reports OFF');
}

function toggleAutoCoachTime(id, enabled) {
  const entry = (appData.settings.autoCoachTimes || []).find(t => t.id === id);
  if (entry) { entry.enabled = enabled; saveData(); }
}

function updateAutoCoachTime(id, time) {
  const entry = (appData.settings.autoCoachTimes || []).find(t => t.id === id);
  if (entry) { entry.time = time; saveData(); }
}

function addAutoCoachTime() {
  const times  = appData.settings.autoCoachTimes || [];
  const maxPer = appData.settings.autoCoachMaxPerDay || 3;
  if (times.length >= maxPer) {
    showToast(`⚠️ Maximum ${maxPer} auto-check times (change in settings)`);
    return;
  }
  times.push({ id: 'ac_' + Date.now(), time: '09:00', enabled: true });
  appData.settings.autoCoachTimes = times;
  saveData();
  renderAutoCoachTimeList();
}

function removeAutoCoachTime(id) {
  appData.settings.autoCoachTimes = (appData.settings.autoCoachTimes || []).filter(t => t.id !== id);
  saveData();
  renderAutoCoachTimeList();
}

function updateAutoCoachPersonality(val) {
  appData.settings.autoCoachPersonality = val;
  saveData();
}

function updateAutoCoachMaxPerDay(val) {
  const n = parseInt(val);
  if (isNaN(n) || n < 1 || n > 15) return;
  appData.settings.autoCoachMaxPerDay = n;
  saveData();
  renderAutoCoachTimeList();
  showToast(`✅ Max auto-checks per day: ${n}`);
}

// ── Last 7 Days Report toggles (replaces old weekly) ──
function toggleLast7DaysReport(val) {
  appData.settings.last7DaysReportEnabled = val;
  saveData();
  showToast(val ? '✅ Last 7 Days report ON' : '🔕 Last 7 Days report OFF');
}
function updateLast7DaysReportTime(val) { appData.settings.last7DaysReportTime = val; saveData(); }

// ── Overall Progress Report toggles (replaces old daily) ──
function toggleOverallProgress(val) {
  appData.settings.overallProgressEnabled = val;
  saveData();
  showToast(val ? '✅ Overall Progress report ON' : '🔕 Overall Progress report OFF');
}
function updateOverallProgressTime(val) { appData.settings.overallProgressTime = val; saveData(); }

// ── Josh Last 7 Days + Overall toggles ──
function toggleJoshLast7Days(val) { appData.settings.joshLast7DaysEnabled = val; saveData(); showToast(val ? '✅ Josh Last 7 Days ON' : '🔕 Josh Last 7 Days OFF'); }
function updateJoshLast7DaysTime(val) { appData.settings.joshLast7DaysTime = val; saveData(); }
function toggleJoshOverallProgress(val) { appData.settings.joshOverallProgressEnabled = val; saveData(); showToast(val ? '✅ Josh Overall Progress ON' : '🔕 Josh Overall Progress OFF'); }
function updateJoshOverallProgressTime(val) { appData.settings.joshOverallProgressTime = val; saveData(); }

// Legacy aliases — kept so any old HTML references don't break
function toggleWeeklyReport(val) { toggleLast7DaysReport(val); }
function updateWeeklyReportTime(val) { updateLast7DaysReportTime(val); }
function toggleDailyProgress(val) { toggleOverallProgress(val); }
function updateDailyProgressTime(val) { updateOverallProgressTime(val); }

/* ─────────────────────────────────────────────
   EGO AI MODE: WEEKLY REPORT TRIGGER
   Fires every 7 days at the configured time
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   extractNotifSummary — 2-3 line summary for notification body
   Full response is saved in chat history; user can "Read Full" via app
───────────────────────────────────────────── */
function extractNotifSummary(text, maxLines) {
  if (!text) return '';
  maxLines = maxLines || 4;
  // Split by newlines, filter blanks
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length <= maxLines) return text.substring(0, 450);
  return lines.slice(0, maxLines).join('\n').substring(0, 450);
}

/* ─────────────────────────────────────────────
   fireCapacitorNativeNotif — fires a native Android notification via
   Capacitor LocalNotifications with actual AI summary in the body.
   Used on Android APK so the dynamic AI response appears in the
   notification instead of the pre-scheduled static placeholder text.
   Returns true if Capacitor path was used, false if not on native.
───────────────────────────────────────────── */
async function fireCapacitorNativeNotif(title, fullResponse, channelId, convType) {
  if (typeof window.Capacitor === 'undefined') return false;
  if (!window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return false;
  const { LocalNotifications } = (window.Capacitor.Plugins) || {};
  if (!LocalNotifications) return false;
  try {
    const fireAt = new Date(Date.now() + 400);
    // Use high ID range (5M+) to avoid collisions with pre-scheduled notifications
    const notifId = 5000000 + (Date.now() % 999999);

    // ── Collapsed preview (2 lines ~150 chars) shown immediately ──
    const _lines = (fullResponse || '').split('\n').filter(l => l.trim().length > 0);
    const previewBody = _lines.slice(0, 2).join('\n').substring(0, 150) || (fullResponse || '').substring(0, 150);

    // ── Expanded full text (BigTextStyle — up to 1200 chars) ──
    // User swipes down on notification to expand — like Gmail shows full email.
    // No need to open the app to read the AI response.
    const expandedBody = (fullResponse || '').replace(/[*_#]/g, '').trim().substring(0, 1200);

    await LocalNotifications.schedule({ notifications: [{
      id: notifId,
      title: title,
      body: previewBody,
      largeBody: expandedBody,
      summaryText: 'App mein full history ke liye tap karo',
      channelId: channelId || 'aainik-ego',
      schedule: { at: fireAt, allowWhileIdle: true },
      smallIcon: 'ic_launcher_foreground',
      extra: { type: convType || 'auto', screen: 'coach', convType: convType || 'auto' }
    }]});
    return true;
  } catch (e) {
    console.warn('Capacitor native notif error:', e);
    return false;
  }
}

/* ─────────────────────────────────────────────
   fireAiNotification — standard helper to fire all AI report notifications
   - body = 4-5 line AI summary
   - "📖 Read Full" action opens app to coach screen
   - full response saved in data for routing
   NOTE: On Android Capacitor, use fireCapacitorNativeNotif first.
───────────────────────────────────────────── */
function fireAiNotification(title, fullResponse, tag, convType) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const summaryBody = extractNotifSummary(fullResponse, 4);
  const opts = {
    body: summaryBody,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: tag,
    renotify: true,
    requireInteraction: false,
    actions: [{ action: 'open-coach', title: '📖 Read Full' }],
    data: { screen: 'coach', convType: convType || 'auto' }
  };
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, opts))
      .catch(e => console.warn('Notification failed (SW):', e));
  } else {
    try {
      const n = new Notification(title, opts);
      n.onclick = () => { window.focus(); showScreen('coach'); };
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }
}

/* ─────────────────────────────────────────────
   buildMissedInboxEntries
   On app open: check which ego/josh scheduled times
   passed today while app was closed. Add them to inbox
   so user can see them and tap "Read More".
   NO API calls here — purely data/UI.
───────────────────────────────────────────── */
function buildMissedInboxEntries() {
  const today    = getTodayStr();           // IST date
  const nowHHMM  = getNowISTHHMM();         // IST HH:MM
  const s        = appData.settings;

  // ── Single-day rule: purge entries from previous days on every app open ──
  if (!appData.egoInbox)  appData.egoInbox  = [];
  if (!appData.joshInbox) appData.joshInbox = [];
  appData.egoInbox  = appData.egoInbox.filter(e => e.date === today);
  appData.joshInbox = appData.joshInbox.filter(e => e.date === today);

  // Ego inbox entries (auto-check times)
  if (s.autoCoachEnabled) {
    (s.autoCoachTimes || []).forEach(entry => {
      if (!entry.enabled || !entry.time) return;
      if (entry.time > nowHHMM) return; // hasn't fired yet today
      addEgoInboxEntry(entry.time, today, /*silent=*/true);
    });
  }

  // Ego Last 7 Days inbox entry
  if (s.last7DaysReportEnabled && s.last7DaysReportTime && s.last7DaysReportTime <= nowHHMM) {
    addEgoInboxEntry('last7days_' + today, today, /*silent=*/true);
  }

  // Ego Overall Progress inbox entry
  if (s.overallProgressEnabled && s.overallProgressTime && s.overallProgressTime <= nowHHMM) {
    addEgoInboxEntry('overall_' + today, today, /*silent=*/true);
  }

  // Josh inbox entries (auto-reminder times)
  if (s.joshAutoEnabled) {
    (s.joshAutoTimes || []).forEach(entry => {
      if (!entry.enabled || !entry.time) return;
      if (entry.time > nowHHMM) return;
      addJoshInboxEntry(entry.time, today, /*silent=*/true);
    });
  }

  // Josh Last 7 Days inbox entry
  if (s.joshLast7DaysEnabled && s.joshLast7DaysTime && s.joshLast7DaysTime <= nowHHMM) {
    addJoshInboxEntry('jlast7days_' + today, today, /*silent=*/true);
  }

  // Josh Overall Progress inbox entry
  if (s.joshOverallProgressEnabled && s.joshOverallProgressTime && s.joshOverallProgressTime <= nowHHMM) {
    addJoshInboxEntry('joverall_' + today, today, /*silent=*/true);
  }

  saveData();
  // Re-render whichever screen is open
  if (currentScreen === 'coach') renderCoachScreen();
  if (currentScreen === 'inbox') renderInboxScreen();
}

/* ─────────────────────────────────────────────
   EGO: LAST 7 DAYS REPORT TRIGGER
   Fires DAILY at configured time — last 7 days data
───────────────────────────────────────────── */
function checkLast7DaysReportTrigger(hhmm) {
  const s = appData.settings;
  if (!s.last7DaysReportEnabled) return;
  if (!hasAnyApiKey())            return;
  if (s.last7DaysReportTime !== hhmm) return;

  const today = getTodayStr();
  if (s.lastLast7DaysReportFired && s.lastLast7DaysReportFired[today]) return;

  if (!s.lastLast7DaysReportFired) s.lastLast7DaysReportFired = {};
  s.lastLast7DaysReportFired[today] = true;
  saveData();

  runLast7DaysReport().catch(err => console.warn('Last 7 days report failed:', err.message));
}

/* ─────────────────────────────────────────────
   EGO: OVERALL PROGRESS TRIGGER
   Fires daily at configured time — all-time data
───────────────────────────────────────────── */
function checkOverallProgressTrigger(hhmm) {
  const s = appData.settings;
  if (!s.overallProgressEnabled) return;
  if (!hasAnyApiKey())            return;
  if (s.overallProgressTime !== hhmm) return;

  const today = getTodayStr();
  if (s.lastOverallProgressFired && s.lastOverallProgressFired[today]) return;

  if (!s.lastOverallProgressFired) s.lastOverallProgressFired = {};
  s.lastOverallProgressFired[today] = true;
  saveData();

  runOverallProgressReport().catch(err => console.warn('Overall progress failed:', err.message));
}

/* ─────────────────────────────────────────────
   JOSH: LAST 7 DAYS REPORT TRIGGER
───────────────────────────────────────────── */
function checkJoshLast7DaysTrigger(hhmm) {
  const s = appData.settings;
  if (!s.joshLast7DaysEnabled) return;
  if (!hasAnyApiKey())          return;
  if (s.joshLast7DaysTime !== hhmm) return;
  const today = getTodayStr();
  if (s.lastJoshLast7DaysFired && s.lastJoshLast7DaysFired[today]) return;
  if (!s.lastJoshLast7DaysFired) s.lastJoshLast7DaysFired = {};
  s.lastJoshLast7DaysFired[today] = true;
  saveData();
  runJoshLast7DaysReport().catch(err => console.warn('Josh last7 failed:', err.message));
}

/* ─────────────────────────────────────────────
   JOSH: OVERALL PROGRESS TRIGGER
───────────────────────────────────────────── */
function checkJoshOverallProgressTrigger(hhmm) {
  const s = appData.settings;
  if (!s.joshOverallProgressEnabled) return;
  if (!hasAnyApiKey())                return;
  if (s.joshOverallProgressTime !== hhmm) return;
  const today = getTodayStr();
  if (s.lastJoshOverallProgressFired && s.lastJoshOverallProgressFired[today]) return;
  if (!s.lastJoshOverallProgressFired) s.lastJoshOverallProgressFired = {};
  s.lastJoshOverallProgressFired[today] = true;
  saveData();
  runJoshOverallProgressReport().catch(err => console.warn('Josh overall failed:', err.message));
}

function getISOWeekKey(date) {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────
   EGO: RUN LAST 7 DAYS REPORT
   Gets last 7 days of data and sends to Ego
───────────────────────────────────────────── */
async function runLast7DaysReport() {
  const today = getTodayStr();
  const data  = getCoachData();
  data.report_type = 'last7days_progress';

  const last7 = [];
  for (let i = 7; i >= 1; i--) {
    const d = dateNDaysAgo(i);
    const ds = getDailyScore(d);
    last7.push({ date: d, score: ds.score, done: ds.done, total: ds.taskCount });
  }
  data.last7days = last7;
  const avgLast7 = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0;

  // Attach last ego response for context
  const lastEgoResp = getLastEgoResponse();
  const lastRespNote = lastEgoResp
    ? `\n\nMERI LAST RESPONSE (jo maine pichli baar kahi thi — cross-check karo kya user ne follow kiya):\n"${lastEgoResp.substring(0, 500)}"\n\nIs last response ko context ke roop mein use karo — kya user ne meri advice follow ki? Accordingly react karo.`
    : '';

  const systemPrompt = buildSystemPrompt();
  const context = `\n\nLAST 7 DAYS PROGRESS REPORT:\nAverage: ${avgLast7}%\nDay-by-day:\n${last7.map(d => `${d.date}: ${d.score}% (${d.done}/${d.total} tasks)`).join('\n')}\n\nLast 7 din ka full reality check de.\nFormat:\nLine 1: Punchy headline (max 90 chars)\nBlank line\nFull response${lastRespNote}`;

  const fullResponse = await callGeminiAPI(systemPrompt, context + '\n\n' + JSON.stringify(data), 800);
  const lines = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Ego: Last 7 days reality check!';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save inbox entry
  const inboxTrigger = 'last7days_' + today;
  addEgoInboxEntry(inboxTrigger, today, true);
  const inboxEntry = (appData.egoInbox || []).find(e => e.id === 'ego_inbox_' + today + '_' + inboxTrigger);
  if (inboxEntry) {
    inboxEntry.response = fullResponse;
    inboxEntry.status   = 'read';
    inboxEntry.triggerLabel = 'Last 7 Days Progress';
  }

  // Save to conversations
  if (!appData.conversations) appData.conversations = [];
  appData.conversations.unshift({
    id: 'conv_last7_' + Date.now(), type: 'last7days',
    timestamp: Date.now(), date: today,
    scoreLabel: `📊 Last 7 Days — Avg: ${avgLast7}%`,
    response: fullResponse, headline
  });
  if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(0, 30);
  saveData();

  const capFired = await fireCapacitorNativeNotif('📊 ' + headline, notifBody, 'aainik-ego', 'last7days');
  if (!capFired) fireAiNotification(headline, notifBody, 'last7days-' + today, 'last7days');

  if (currentScreen === 'coach') renderCoachScreen();
  if (currentScreen === 'inbox') renderInboxScreen();
  showToast(`📊 Last 7 days: ${headline.substring(0, 50)}...`, true);
}

/* ─────────────────────────────────────────────
   EGO: RUN OVERALL PROGRESS REPORT
   Day 1 to now — all-time journey assessment
───────────────────────────────────────────── */
async function runOverallProgressReport() {
  const today = getTodayStr();
  const data  = getCoachData();
  data.report_type = 'overall_progress';

  // All-time summary — exclude today
  const allDates = [...new Set(appData.history.map(h => h.date))].sort().filter(d => d < today);
  const totalDays = allDates.length;
  const scores    = allDates.map(d => getDailyScore(d).score);
  const allTimeAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore  = scores.length ? Math.max(...scores) : 0;
  const worstScore = scores.length ? Math.min(...scores) : 0;
  const bestDay    = allDates[scores.indexOf(Math.max(...scores, 0))] || 'N/A';
  const worstDay   = allDates[scores.indexOf(Math.min(...scores, 100))] || 'N/A';

  data.all_time_summary = { totalDays, allTimeAvg, bestScore, worstScore, firstDay: allDates[0] || today, bestDay, worstDay };

  const lastEgoResp = getLastEgoResponse();
  const lastRespNote = lastEgoResp
    ? `\n\nMERI LAST RESPONSE:\n"${lastEgoResp.substring(0, 500)}"\n\nIs last response ko context ke roop mein use karo.`
    : '';

  const systemPrompt = buildSystemPrompt();
  const overallContext = `\n\nOVERALL PROGRESS REPORT MODE (Day 1 se kal tak — aaj ka din exclude):\nTotal days tracked: ${totalDays} | All-time average: ${allTimeAvg}% | Best: ${bestScore}% (${bestDay}) | Worst: ${worstScore}% (${worstDay}) | Journey started: ${allDates[0] || 'N/A'}\n\nPoori journey ka seedha honest assessment de. Format:\nLine 1: Ek punchy headline title (max 90 chars)\nBlank line\nFull overall progress reality check${lastRespNote}`;

  const fullResponse = await callGeminiAPI(systemPrompt, overallContext + '\n\n' + JSON.stringify(data), 800);
  const lines    = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || '📈 Ego Overall Progress!';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save inbox entry
  const inboxTrigger = 'overall_' + today;
  addEgoInboxEntry(inboxTrigger, today, true);
  const inboxEntry = (appData.egoInbox || []).find(e => e.id === 'ego_inbox_' + today + '_' + inboxTrigger);
  if (inboxEntry) {
    inboxEntry.response = fullResponse;
    inboxEntry.status   = 'read';
    inboxEntry.triggerLabel = 'Overall Progress';
  }

  if (!appData.conversations) appData.conversations = [];
  appData.conversations.unshift({
    id: 'conv_overall_prog_' + Date.now(), type: 'overall_progress',
    timestamp: Date.now(), date: today,
    scoreLabel: `📈 Overall Progress — ${totalDays} days | Avg: ${allTimeAvg}%`,
    response: fullResponse, headline
  });
  if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(0, 30);
  saveData();

  const capFired = await fireCapacitorNativeNotif('📈 ' + headline, notifBody, 'aainik-ego', 'overall_progress');
  if (!capFired) fireAiNotification(headline, notifBody, 'overall-progress-' + today, 'overall_progress');

  if (currentScreen === 'coach') renderCoachScreen();
  if (currentScreen === 'inbox') renderInboxScreen();
  showToast(`📈 Overall progress: ${headline.substring(0, 50)}...`, true);
}

/* ─────────────────────────────────────────────
   JOSH: RUN LAST 7 DAYS REPORT
───────────────────────────────────────────── */
async function runJoshLast7DaysReport() {
  const today = getTodayStr();
  const last7 = [];
  for (let i = 7; i >= 1; i--) {
    const d = dateNDaysAgo(i);
    const ds = getDailyScore(d);
    last7.push({ date: d, score: ds.score, done: ds.done, total: ds.taskCount });
  }
  const avgLast7 = last7.length ? Math.round(last7.reduce((a, b) => a + b.score, 0) / last7.length) : 0;

  const lastJoshResp = getLastJoshResponse();
  const lastJoshNote = lastJoshResp
    ? `\n\nMERI LAST RESPONSE:\n"${lastJoshResp.substring(0, 500)}"\n\nIs context ko use karo — kya user ne progress ki?`
    : '';

  const systemPrompt = getJoshActivePrompt();
  const content = `JOSH LAST 7 DAYS REMINDER:\nAverage: ${avgLast7}%\n${last7.map(d => `${d.date}: ${d.score}%`).join('\n')}\nLife Goals: ${(appData.settings.egoLifeGoals||'').trim()||'Not set'}\nMotivate the user about their last 7 days performance and what to do this week.\nFormat:\nLine 1: Punchy motivational headline (max 90 chars, Hinglish)\nBlank line\nFull detailed response${lastJoshNote}`;

  const fullResponse = await callGeminiAPI(systemPrompt, content, 600);
  const lines = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Josh: Last 7 days — chal aage badhte hain!';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save inbox entry
  const inboxTrigger = 'jlast7days_' + today;
  addJoshInboxEntry(inboxTrigger, today, true);
  const inboxEntry = (appData.joshInbox || []).find(e => e.id === 'josh_inbox_' + today + '_' + inboxTrigger);
  if (inboxEntry) {
    inboxEntry.response = fullResponse;
    inboxEntry.status   = 'read';
    inboxEntry.triggerLabel = 'Last 7 Days Progress';
  }

  if (!appData.joshConversations) appData.joshConversations = [];
  appData.joshConversations.unshift({
    id: 'jc_last7_' + Date.now(), type: 'last7days',
    timestamp: Date.now(), date: today,
    scoreLabel: `📊 Josh Last 7 Days — Avg: ${avgLast7}%`,
    response: fullResponse, headline
  });
  if (appData.joshConversations.length > 30) appData.joshConversations = appData.joshConversations.slice(0, 30);
  saveData();

  const capFired = await fireCapacitorNativeNotif('📊 ' + headline, notifBody, 'aainik-josh', 'josh_last7days');
  if (!capFired) fireAiNotification(headline, notifBody, 'josh-last7-' + today, 'josh_last7days');

  if (currentScreen === 'coach') renderCoachScreen();
  if (currentScreen === 'inbox') renderInboxScreen();
  showToast(`📊 Josh Last 7 days: ${headline.substring(0, 50)}...`, true);
}

/* ─────────────────────────────────────────────
   JOSH: RUN OVERALL PROGRESS REPORT
───────────────────────────────────────────── */
async function runJoshOverallProgressReport() {
  const today = getTodayStr();
  const allDates = [...new Set(appData.history.map(h => h.date))].sort().filter(d => d < today);
  const scores   = allDates.map(d => getDailyScore(d).score);
  const allTimeAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const lastJoshResp = getLastJoshResponse();
  const lastJoshNote = lastJoshResp
    ? `\n\nMERI LAST RESPONSE:\n"${lastJoshResp.substring(0, 500)}"\n\nIs context ko use karo.`
    : '';

  const systemPrompt = getJoshActivePrompt();
  const content = `JOSH OVERALL PROGRESS SUMMARY:\nTotal days tracked: ${allDates.length} | All-time avg: ${allTimeAvg}%\nLife Goals: ${(appData.settings.egoLifeGoals||'').trim()||'Not set'}\nGive a powerful overall progress motivation and direction.\nFormat:\nLine 1: Punchy headline (max 90 chars)\nBlank line\nFull response${lastJoshNote}`;

  const fullResponse = await callGeminiAPI(systemPrompt, content, 600);
  const lines = fullResponse.trim().split('\n').filter(l => l.trim());
  const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Josh: Overall progress — aage badhna hai!';
  const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

  // Save inbox entry
  const inboxTrigger = 'joverall_' + today;
  addJoshInboxEntry(inboxTrigger, today, true);
  const inboxEntry = (appData.joshInbox || []).find(e => e.id === 'josh_inbox_' + today + '_' + inboxTrigger);
  if (inboxEntry) {
    inboxEntry.response = fullResponse;
    inboxEntry.status   = 'read';
    inboxEntry.triggerLabel = 'Overall Progress';
  }

  if (!appData.joshConversations) appData.joshConversations = [];
  appData.joshConversations.unshift({
    id: 'jc_overall_' + Date.now(), type: 'overall_progress',
    timestamp: Date.now(), date: today,
    scoreLabel: `📈 Josh Overall Progress — Avg: ${allTimeAvg}%`,
    response: fullResponse, headline
  });
  if (appData.joshConversations.length > 30) appData.joshConversations = appData.joshConversations.slice(0, 30);
  saveData();

  const capFired = await fireCapacitorNativeNotif('📈 ' + headline, notifBody, 'aainik-josh', 'josh_overall');
  if (!capFired) fireAiNotification(headline, notifBody, 'josh-overall-' + today, 'josh_overall');

  if (currentScreen === 'coach') renderCoachScreen();
  if (currentScreen === 'inbox') renderInboxScreen();
  showToast(`📈 Josh Overall: ${headline.substring(0, 50)}...`, true);
}

function buildWeeklyReportPrompt(avgScore, personality) {
  let tone;
  if (personality === 'beast') {
    tone = `Tu ek brutal Hinglish weekly coach hai. 7 din ka data dekh, full honest reality check de.`;
  } else if (personality === 'balanced') {
    tone = `Tu ek balanced Hinglish weekly coach hai. 7 din ka honest, constructive summary de.`;
  } else {
    tone = `Tu ek encouraging Hinglish weekly coach hai. 7 din ki achievements celebrate kar, warmly.`;
  }
  return `${tone}

User ka LAST 7 DAYS OVERALL PERFORMANCE REPORT aa gaya hai.
Average score: ${avgScore}%.

2 parts likhna:

PART 1 (notification headline): EK punchy line, max 90 chars. Pattern ya insight capture karo.

PART 2 (full report): 5-8 sentences. Har din ka trend dekho. Strong days celebrate karo, weak days pe reality check do. Next week ke liye 2-3 specific actionable goals bolo.

"Part 1" / "Part 2" labels mat likhna. Blank line se separate karna.`;
}

/* ─────────────────────────────────────────────
   buildDailyProgressPrompt — kept for backward compat
───────────────────────────────────────────── */

function buildDailyProgressPrompt(allTimeAvg, totalDays, personality) {
  let tone;
  if (personality === 'beast') {
    tone = `Tu ek brutal reality-check Hinglish coach hai. Overall journey ka honest assessment de.`;
  } else if (personality === 'balanced') {
    tone = `Tu ek balanced Hinglish coach hai. Overall progress pe honest, constructive view de.`;
  } else {
    tone = `Tu ek encouraging Hinglish coach hai. Journey celebrate karo, growth highlight karo.`;
  }
  return `${tone}

User ka OVERALL PROGRESS REPORT (Day 1 se aaj tak ka).
Total days tracked: ${totalDays}
All-time average: ${allTimeAvg}%

2 parts likhna:

PART 1 (notification headline): 1 line, max 90 chars. Overall journey capture karo.

PART 2 (full progress story): 5-7 sentences. Journey ki story bolo — kab shuru hua, kaise improve hua ya nahi hua, aaj kahan hai. Specific numbers use karo. Kal ke liye ek strong direction do.

"Part 1" / "Part 2" labels mat likhna. Blank line se separate karna.`;
}

/* ─────────────────────────────────────────────
   EGO AI MODE: MANUAL SCORE QUERY
   User asks: daily score / weekly score / overall score
───────────────────────────────────────────── */
async function askScoreQuery(type) {
  if (!hasAnyApiKey()) {
    showToast('⚠️ API key missing! Settings mein set karo.');
    showScreen('settings');
    scrollToCoachConfig();
    return;
  }

  const btn    = document.getElementById(`btn-score-${type}`);
  const typing = document.getElementById('coach-typing');
  const wrap   = document.getElementById('coach-chat-wrap');
  if (btn)    { btn.disabled = true; btn.textContent = '⏳...'; }
  if (typing) typing.classList.remove('hidden');
  if (wrap)   setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 50);

  try {
    const coachData = getCoachData();
    const systemPrompt = buildSystemPrompt();
    let queryContent;

    if (type === 'daily') {
      const today = getTodayStr();
      const ds    = getDailyScore(today);
      queryContent = `USER KA QUERY: Aaj ka mera score kya hai? Reality check de.\n\n` +
        `Aaj ka score: ${ds.score}% | Tasks done: ${ds.done}/${ds.total}\n\n` +
        formatCoachDataForPrompt(coachData);
    } else if (type === 'weekly') {
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d  = dateNDaysAgo(i);
        const ds = getDailyScore(d);
        last7.push({ date: d, score: ds.score, done: ds.done, total: ds.total });
      }
      const weekAvg = Math.round(last7.reduce((a, b) => a + b.score, 0) / 7);
      queryContent  = `USER KA QUERY: Mere pichhle 7 din ka score kya raha? Reality check aur pattern analysis de.\n\n` +
        `7-Day Data: ${JSON.stringify(last7)}\nWeekly Average: ${weekAvg}%\n\n` +
        formatCoachDataForPrompt(coachData);
    } else {
      // overall
      const allDates  = [...new Set(appData.history.map(h => h.date))].sort();
      const scores    = allDates.map(d => getDailyScore(d).score);
      const allAvg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const bestDay   = allDates[scores.indexOf(Math.max(...scores))] || 'N/A';
      queryContent    = `USER KA QUERY: Day 1 se aaj tak ka overall mera score kya hai? Poori journey ka honest assessment de.\n\n` +
        `Total days: ${allDates.length} | Overall avg: ${allAvg}% | Best score: ${Math.max(...scores, 0)}% on ${bestDay}\n\n` +
        formatCoachDataForPrompt(coachData);
    }

    const replyText = await callGeminiAPI(systemPrompt, queryContent, 700);

    const labelMap = { daily: 'Daily Score', weekly: 'Weekly Score', overall: 'Overall Journey' };
    const conv = {
      id: `conv_score_${type}_` + Date.now(), type: 'score_query',
      timestamp: Date.now(),
      scoreLabel: `📊 ${labelMap[type]} Query`,
      coachData, personality: appData.settings.coachPersonality || 'beast',
      response: replyText
    };
    if (!appData.conversations) appData.conversations = [];
    appData.conversations.push(conv);
    if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(-30);
    saveData();

    if (typing) typing.classList.add('hidden');
    renderCoachMessages();
    const reBtn = document.getElementById('btn-reanalyze');
    if (reBtn) reBtn.style.display = 'block';
    if (wrap)  setTimeout(() => { wrap.scrollTop = wrap.scrollHeight; }, 150);

  } catch (err) {
    if (typing) typing.classList.add('hidden');
    const container = document.getElementById('coach-messages');
    if (container) {
      const errDiv = document.createElement('div');
      errDiv.className = 'chat-msg coach-msg';
      errDiv.innerHTML = `<div class="chat-bubble" style="border-color:#FF6B6B">⚠️ Error: ${escapeHtml(err.message)}</div>`;
      container.appendChild(errDiv);
    }
    showToast('❌ ' + err.message, 3000);
  } finally {
    const labels = { daily: '📅 Aaj ka Score', weekly: '📆 Weekly Score', overall: '🏆 Overall Score' };
    if (btn) { btn.disabled = false; btn.textContent = labels[type] || 'Score Query'; }
    if (typing) typing.classList.add('hidden');
  }
}

/* ─────────────────────────────────────────────
   PROMPT EDITOR TOGGLE (Feature 2 — visible textarea)
───────────────────────────────────────────── */
function showCoachPromptEditor() {
  const wrap  = document.getElementById('coach-prompt-editor-wrap');
  const btn   = document.getElementById('btn-toggle-prompt');
  if (!wrap || !btn) return;
  const isHidden = wrap.classList.contains('hidden');
  wrap.classList.toggle('hidden', !isHidden);
  btn.textContent = isHidden ? '🙈 Hide Prompt' : '👁 Show Full Prompt';
}

function saveCoachPrompt() {
  const ta = document.getElementById('coach-prompt-textarea');
  if (ta) {
    appData.settings.coachPrompt = ta.value;
    saveData();
    showToast('✅ Prompt saved!');
  }
}

/* ─────────────────────────────────────────────
   GAMIFICATION — BADGES DEFINITIONS
───────────────────────────────────────────── */
const BADGE_DEFS = [
  { id: 'first_complete',  emoji: '⭐', name: 'First 100%',        desc: 'Pehla perfect day!',             check: () => hasPerfectDay() },
  { id: 'streak_7',        emoji: '🔥', name: '7-Day Streak',       desc: '7 din lagatar target hit kiya',  check: () => (appData.streaks.longest || 0) >= 7 },
  { id: 'streak_30',       emoji: '🏆', name: '30-Day Streak',      desc: '30 din beast mode!',             check: () => (appData.streaks.longest || 0) >= 30 },
  { id: 'tasks_100',       emoji: '💯', name: '100 Tasks',          desc: '100 tasks complete!',            check: () => (appData.totalTasksCompleted || 0) >= 100 },
  { id: 'tasks_500',       emoji: '🚀', name: '500 Tasks',          desc: '500 tasks done!',                check: () => (appData.totalTasksCompleted || 0) >= 500 },
  { id: 'tasks_1000',      emoji: '👑', name: '1000 Tasks',         desc: 'Absolute legend!',               check: () => (appData.totalTasksCompleted || 0) >= 1000 },
  { id: 'level_5',         emoji: '📈', name: 'Level 5',            desc: 'Level 5 reached!',               check: () => (appData.level || 1) >= 5 },
  { id: 'comeback_kid',    emoji: '💪', name: 'Comeback Kid',       desc: '100% after a <50% day',          check: () => hasComeback() },
  { id: 'early_bird',      emoji: '🌅', name: 'Early Bird',         desc: 'All tasks done before 10 AM',    check: () => hasEarlyBird() },
  { id: 'consistency',     emoji: '👊', name: 'Consistent Crusher', desc: '80%+ for 7 days straight',       check: () => hasConsistency7() },
];

function hasPerfectDay() {
  const dates = [...new Set(appData.history.map(h => h.date))];
  return dates.some(d => getDailyScore(d).score >= 100);
}

function hasComeback() {
  const dates = [...new Set(appData.history.map(h => h.date))].sort();
  for (let i = 1; i < dates.length; i++) {
    if (getDailyScore(dates[i-1]).score < 50 && getDailyScore(dates[i]).score >= 100) return true;
  }
  return false;
}

function hasEarlyBird() {
  const dates = [...new Set(appData.history.map(h => h.date))];
  return dates.some(d => {
    const dayTasks = appData.tasks.filter(t => t.active !== false);
    if (dayTasks.length === 0) return false;
    const allDone = dayTasks.every(t => {
      const entry = appData.history.find(h => h.taskId === t.id && h.date === d);
      if (!entry || !entry.completed || !entry.completedAt) return false;
      const hr = new Date(entry.completedAt).getHours();
      return hr < 10;
    });
    return allDone;
  });
}

function hasConsistency7() {
  for (let i = 6; i < 90; i++) {
    let allGood = true;
    for (let j = 0; j < 7; j++) {
      const d = dateNDaysAgo(i - j);
      if (getDailyScore(d).score < 80) { allGood = false; break; }
    }
    if (allGood) return true;
  }
  return false;
}

/* ─────────────────────────────────────────────
   CHECK AND AWARD BADGES + LEVEL UP
───────────────────────────────────────────── */
function checkAndAwardBadges() {
  if (!appData.badges) appData.badges = [];
  let newBadges = [];

  BADGE_DEFS.forEach(def => {
    const alreadyEarned = appData.badges.find(b => b.id === def.id);
    if (!alreadyEarned && def.check()) {
      appData.badges.push({ id: def.id, earnedAt: Date.now() });
      newBadges.push(def);
    }
  });

  if (newBadges.length > 0) {
    saveData();
    // Show celebration for first new badge
    const badge = newBadges[0];
    showCelebration(badge.emoji, `Badge Mila! ${badge.name}`, badge.desc);
  }
}

function checkLevelUp(prevTotal) {
  const newTotal = appData.totalTasksCompleted || 0;
  const prevLevel = Math.floor(prevTotal / 100) + 1;
  const newLevel  = Math.floor(newTotal / 100) + 1;
  if (newLevel > prevLevel) {
    appData.level = newLevel;
    saveData();
    showCelebration('🆙', `Level ${newLevel} Unlocked!`, getLevelTitle() + ' — Keep going!');
    renderLevelStrip();
  }
}

/* ─────────────────────────────────────────────
   PROFILE SECTION RENDER
───────────────────────────────────────────── */
function renderProfileSection() {
  const lvlDiv = document.getElementById('profile-level-display');
  if (lvlDiv) {
    const lvl   = appData.level || 1;
    const total = appData.totalTasksCompleted || 0;
    const title = getLevelTitle();
    lvlDiv.innerHTML = `
      <div class="profile-level-card">
        <div class="profile-avatar">🧑‍💻</div>
        <div class="profile-info">
          <div class="profile-name">Level ${lvl} Warrior</div>
          <div class="profile-title">${title}</div>
          <div class="profile-stats">${total} tasks completed | Streak: ${appData.streaks.current} days</div>
        </div>
      </div>`;
  }

  const badgesDiv = document.getElementById('badges-display');
  if (badgesDiv) {
    if (!appData.badges) appData.badges = [];
    badgesDiv.innerHTML = BADGE_DEFS.map(def => {
      const earned = appData.badges.find(b => b.id === def.id);
      return `
        <div class="badge-item ${earned ? 'earned' : 'locked'}" title="${def.desc}">
          ${earned ? '<div class="badge-earned-dot"></div>' : ''}
          <span class="badge-emoji">${def.emoji}</span>
          <div class="badge-name">${def.name}</div>
        </div>`;
    }).join('');
  }
}

/* ─────────────────────────────────────────────
   CELEBRATION / CONFETTI
───────────────────────────────────────────── */
let confettiActive = false;
let confettiParticles = [];
let confettiRAF = null;

function showCelebration(emoji, title, sub) {
  document.getElementById('celebration-emoji').textContent  = emoji;
  document.getElementById('celebration-title').textContent = title;
  document.getElementById('celebration-sub').textContent   = sub || '';
  document.getElementById('celebration-overlay').classList.remove('hidden');
  startConfetti();
}

function closeCelebration() {
  document.getElementById('celebration-overlay').classList.add('hidden');
  stopConfetti();
}

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#FF6B6B','#4ECDC4','#A29BFE','#FDCB6E','#74B9FF','#55EFC4','#FD79A8'];

  confettiParticles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random() * 10 + 5,
    h: Math.random() * 6 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
    vy: Math.random() * 3 + 2,
    vx: (Math.random() - 0.5) * 2
  }));

  confettiActive = true;
  function frame() {
    if (!confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 20);
    if (confettiParticles.length > 0) confettiRAF = requestAnimationFrame(frame);
  }
  confettiRAF = requestAnimationFrame(frame);

  // Auto-stop after 4 seconds
  setTimeout(stopConfetti, 4000);
}

function stopConfetti() {
  confettiActive = false;
  if (confettiRAF) { cancelAnimationFrame(confettiRAF); confettiRAF = null; }
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

/* ─────────────────────────────────────────────
   SETTINGS SCREEN
───────────────────────────────────────────── */
function renderSettingsScreen() {
  const s = appData.settings;

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === s.theme);
  });

  // Target percent
  const inp = document.getElementById('target-percent-input');
  if (inp) inp.value = s.targetPercent || 80;

  // Week start
  const ws = document.getElementById('week-start-select');
  if (ws) ws.value = s.weekStart !== undefined ? s.weekStart : 1;

  // Notif window
  const nf = document.getElementById('notif-from');
  const nt = document.getElementById('notif-to');
  if (nf) nf.value = s.notifWindowFrom || '06:00';
  if (nt) nt.value = s.notifWindowTo  || '23:00';

  // Account 4: render coach config
  renderCoachSettings();
  // Account 5: render auto-coach config
  renderAutoCoachSettings();
  // Account 4 (Josh): render Josh settings
  renderJoshSettings();
  // New: Telegram settings
  renderTelegramSettings();
}

function setTheme(theme) {
  appData.settings.theme = theme;
  saveData();
  applyTheme(theme);
  renderSettingsScreen();
}

function applyTheme(theme) {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('light', !prefersDark);
  } else {
    document.body.classList.toggle('light', theme === 'light');
  }
}

function updateTargetPercent(val) {
  const n = parseInt(val);
  if (!isNaN(n) && n >= 50 && n <= 100) {
    appData.settings.targetPercent = n;
    saveData();
    showToast('Target: ' + n + '% set!');
  }
}

function updateWeekStart(val) {
  appData.settings.weekStart = parseInt(val);
  saveData();
}

function updateNotifWindow() {
  appData.settings.notifWindowFrom = document.getElementById('notif-from').value;
  appData.settings.notifWindowTo   = document.getElementById('notif-to').value;
  saveData();
}

/* ─────────────────────────────────────────────
   CATEGORY CRUD
───────────────────────────────────────────── */
let editingCategoryId = null;
let selectedColor     = '#FF6B6B';

function openAddCategory() {
  editingCategoryId = null;
  selectedColor = '#FF6B6B';
  document.getElementById('modal-cat-title').textContent = 'Category Add Karo';
  document.getElementById('cat-name-input').value = '';
  renderColorPicker('#FF6B6B');
  openModal('modal-category');
  setTimeout(() => document.getElementById('cat-name-input').focus(), 300);
}

function openEditCategory(catId) {
  const cat = appData.categories.find(c => c.id === catId);
  if (!cat) return;
  editingCategoryId = catId;
  selectedColor = cat.color;
  document.getElementById('modal-cat-title').textContent = 'Category Edit Karo';
  document.getElementById('cat-name-input').value = cat.name;
  renderColorPicker(cat.color);
  openModal('modal-category');
}

function renderColorPicker(activeColor) {
  const container = document.getElementById('color-picker');
  container.innerHTML = PRESET_COLORS.map(c => `
    <div class="color-swatch ${c === activeColor ? 'active' : ''}"
         style="background:${c}"
         onclick="selectColor('${c}')"
         data-color="${c}"></div>
  `).join('');
}

function selectColor(color) {
  selectedColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
  });
}

function selectCustomColor(color) {
  selectedColor = color;
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
}

function saveCategory() {
  const name = document.getElementById('cat-name-input').value.trim();
  if (!name) { showToast('⚠️ Name likhna zaroori hai!'); return; }

  if (editingCategoryId) {
    const cat = appData.categories.find(c => c.id === editingCategoryId);
    if (cat) { cat.name = name; cat.color = selectedColor; }
  } else {
    appData.categories.push({
      id: 'cat_' + Date.now(),
      name,
      color: selectedColor,
      createdAt: Date.now()
    });
  }

  saveData();
  closeModal('modal-category');
  showToast(editingCategoryId ? '✅ Category update ho gayi!' : '✅ Category add ho gayi!');
  renderCategoriesScreen();
}

function confirmDeleteCategory(catId) {
  const cat = appData.categories.find(c => c.id === catId);
  if (!cat) return;
  const taskCount = appData.tasks.filter(t => t.categoryId === catId).length;

  showConfirmModal(
    `"${cat.name}" delete karo?`,
    `${taskCount} task(s) bhi delete ho jayenge! Undo nahi hoga.`,
    () => {
      appData.categories = appData.categories.filter(c => c.id !== catId);
      appData.tasks      = appData.tasks.filter(t => t.categoryId !== catId);
      appData.history    = appData.history.filter(h => h.categoryId !== catId);
      saveData();
      renderCategoriesScreen();
      showToast('🗑 Category delete ho gayi');
    }
  );
}

/* ─────────────────────────────────────────────
   TASK CRUD
───────────────────────────────────────────── */
let editingTaskId     = null;
let selectedPriority  = 'medium';
let prefilledCategoryId = null;

function openAddTaskToCategory(catId) {
  prefilledCategoryId = catId;
  openAddTask();
}

function openQuickAddTask() {
  prefilledCategoryId = null;
  openAddTask();
}

function openAddTask() {
  editingTaskId = null;
  selectedPriority = 'medium';
  document.getElementById('modal-task-title').textContent = 'Task Add Karo';
  document.getElementById('task-name-input').value = '';
  document.getElementById('task-time-input').value = '07:00';
  document.getElementById('task-duration-input').value = '';
  document.getElementById('task-why-input').value = '';
  const winEndInput = document.getElementById('task-window-end-input');
  if (winEndInput) winEndInput.value = '';
  populateCategoryDropdown(prefilledCategoryId);
  updatePriorityUI('medium');
  // Account 2: initialize empty notification panel
  renderTaskNotifications(null);
  openModal('modal-task');
  setTimeout(() => document.getElementById('task-name-input').focus(), 300);
}

function openEditTask(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;
  editingTaskId = taskId;
  selectedPriority = task.priority || 'medium';
  document.getElementById('modal-task-title').textContent = 'Task Edit Karo';
  document.getElementById('task-name-input').value = task.name;
  document.getElementById('task-time-input').value = task.workingWindowStart || task.scheduledTime || '07:00';
  document.getElementById('task-duration-input').value = task.duration || '';
  document.getElementById('task-why-input').value = task.whyMatters || '';
  const winEndInput = document.getElementById('task-window-end-input');
  if (winEndInput) winEndInput.value = task.workingWindowEnd || '';
  populateCategoryDropdown(task.categoryId);
  updatePriorityUI(selectedPriority);
  // Account 2: load existing multi-reminder panel
  renderTaskNotifications(task);
  openModal('modal-task');
}

function populateCategoryDropdown(selectedCatId) {
  const sel = document.getElementById('task-cat-select');
  sel.innerHTML = appData.categories.map(c =>
    `<option value="${c.id}" ${c.id === selectedCatId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');
}

function selectPriority(pri) {
  selectedPriority = pri;
  updatePriorityUI(pri);
}

function updatePriorityUI(pri) {
  document.querySelectorAll('.priority-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.priority === pri);
  });
}

function saveTask() {
  const name = document.getElementById('task-name-input').value.trim();
  if (!name) { showToast('⚠️ Task name likhna zaroori hai!'); return; }

  const catId = document.getElementById('task-cat-select').value;
  if (!catId) { showToast('⚠️ Category select karo!'); return; }

  const scheduledTime = document.getElementById('task-time-input').value;

  // Account 2: collect multi-reminder notifications from UI
  const collectedNotifications = collectNotificationsFromUI();

  // Build legacy single-notif from first reminder (backward compat for Account 1's check)
  let legacyNotif = { enabled: false, time: scheduledTime, message: '' };
  if (collectedNotifications.length > 0 && collectedNotifications[0].enabled) {
    legacyNotif = {
      enabled: true,
      time:    collectedNotifications[0].time,
      message: collectedNotifications[0].message
    };
  }

  const taskData = {
    categoryId: catId,
    name,
    priority: selectedPriority,
    scheduledTime,
    workingWindowStart: scheduledTime, // workingWindowStart = same as scheduled start time
    workingWindowEnd:   (document.getElementById('task-window-end-input') || {}).value || '',
    duration: parseInt(document.getElementById('task-duration-input').value) || null,
    whyMatters: document.getElementById('task-why-input').value.trim(),
    notification:  legacyNotif,             // legacy — Account 1 compat
    notifications: collectedNotifications,  // Account 2 multi-reminder
    active: true
  };

  if (editingTaskId) {
    const idx = appData.tasks.findIndex(t => t.id === editingTaskId);
    if (idx !== -1) {
      appData.tasks[idx] = { ...appData.tasks[idx], ...taskData };
    }
  } else {
    appData.tasks.push({
      id: 'task_' + Date.now(),
      createdAt: Date.now(),
      ...taskData
    });
  }

  saveData();
  closeModal('modal-task');
  showToast(editingTaskId ? '✅ Task update ho gayi!' : '✅ Task add ho gayi!');

  // Re-render whichever screen is active
  if (currentScreen === 'today')      renderTodayScreen();
  if (currentScreen === 'categories') renderCategoriesScreen();
}

function confirmDeleteTask(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;
  showConfirmModal(
    `"${task.name}" delete karo?`,
    'Task aur uski history delete ho jayegi. Undo nahi hoga.',
    () => {
      appData.tasks   = appData.tasks.filter(t => t.id !== taskId);
      appData.history = appData.history.filter(h => h.taskId !== taskId);
      saveData();
      if (currentScreen === 'today')      renderTodayScreen();
      if (currentScreen === 'categories') renderCategoriesScreen();
      showToast('🗑 Task delete ho gayi');
    }
  );
}

/* ─────────────────────────────────────────────
   MISSED REASON SYSTEM
───────────────────────────────────────────── */
let missedTaskId   = null;
let missedTaskDate = null;
let missedReason   = null;

function askMissedReason(taskId, date) {
  missedTaskId   = taskId;
  missedTaskDate = date;
  missedReason   = null;
  const task = appData.tasks.find(t => t.id === taskId);
  document.getElementById('modal-missed-task-name').textContent = task ? task.name : '';
  document.getElementById('missed-reason-text').value = '';
  document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('active'));
  openModal('modal-missed');
}

function selectMissedReason(reason) {
  missedReason = reason;
  document.querySelectorAll('.reason-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick').includes(reason));
  });
}

function saveMissedReason() {
  if (!missedTaskId || !missedTaskDate) { closeModal('modal-missed'); return; }
  const note = document.getElementById('missed-reason-text').value.trim();

  let entry = appData.history.find(h => h.taskId === missedTaskId && h.date === missedTaskDate);
  if (!entry) {
    entry = {
      id: 'h_' + Date.now(),
      taskId: missedTaskId,
      categoryId: (appData.tasks.find(t => t.id === missedTaskId) || {}).categoryId || '',
      date: missedTaskDate,
      completed: false,
      completedAt: null
    };
    appData.history.push(entry);
  }
  entry.missedReason = missedReason || 'other';
  entry.missedNote   = note || null;

  saveData();
  closeModal('modal-missed');
  renderTodayScreen();
  showToast('✅ Reason save ho gayi');
}

/* ─────────────────────────────────────────────
   EXPORT / IMPORT / RESET
───────────────────────────────────────────── */
function exportData() {
  const json = JSON.stringify(appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `aainik-backup-${getTodayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Data export ho gaya!');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      appData = migrateData(parsed);
      saveData();
      applyTheme(appData.settings.theme || 'dark');
      showScreen('today');
      showToast('✅ Data import ho gaya!');
    } catch (err) {
      showToast('⚠️ Invalid JSON file!');
    }
  };
  reader.readAsText(file);
  // Reset input
  event.target.value = '';
}

function confirmReset() {
  document.getElementById('reset-confirm-input').value = '';
  openModal('modal-reset');
}

function executeReset() {
  const val = document.getElementById('reset-confirm-input').value.trim();
  if (val !== 'DELETE') {
    showToast('⚠️ "DELETE" type karo confirm ke liye');
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  appData = getDefaultData();
  saveData();
  closeModal('modal-reset');
  applyTheme('dark');
  showScreen('today');
  showToast('🗑 Data reset ho gaya!');
}

/* ─────────────────────────────────────────────
   NOTIFICATION SYSTEM (Single reminder — Account 2 adds multi)
   ─ Request permission
   ─ Schedule check every minute
   ─ Fire notification when time matches
───────────────────────────────────────────── */
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('⚠️ Is browser mein notifications support nahi hai');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      showToast('✅ Notifications allowed!');
    } else {
      showToast('❌ Notifications blocked. Browser settings mein allow karo.');
    }
  });
}

// Scheduler — runs every 60 seconds
function startNotificationScheduler() {
  checkNotifications(); // run once on startup
  setInterval(checkNotifications, 60000);
}

function checkNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Use IST time for all comparisons — fixes UTC offset bugs on non-IST devices
  const today    = getTodayStr();          // already IST
  const hhmm     = getNowISTHHMM();        // IST HH:MM
  const istDate  = getNowISTDate();
  const dayOfWeek = istDate.getDay();      // 0=Sun, 6=Sat
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // ── Task reminders — respect notification window ──
  const notifWindow = appData.settings;
  const fromStr = notifWindow.notifWindowFrom || '06:00';
  const toStr   = notifWindow.notifWindowTo   || '23:00';
  if (hhmm < fromStr || hhmm > toStr) return;

  appData.tasks.forEach(task => {
    if (!task.active) return;

    // Check if already completed today (skip all reminders if done)
    const done = appData.history.find(h => h.taskId === task.id && h.date === today && h.completed);
    if (done) return;

    // ── Legacy single notification (Account 1) — kept for backward compat ──
    const notif = task.notification;
    if (notif && notif.enabled && notif.time && notif.message && notif.time === hhmm) {
      // Only fire legacy notif if no notifications[] entries exist
      if (!task.notifications || task.notifications.length === 0) {
        fireNotification(task.name, notif.message, task.id);
      }
    }

    // ── Account 2: Multi-reminder loop ──
    if (!task.notifications || !task.notifications.length) return;

    task.notifications.forEach(n => {
      if (!n.enabled || !n.time || !n.message) return;
      if (n.time !== hhmm) return;

      // Check repeat pattern
      if (!shouldFireToday(n, dayOfWeek, isWeekday, isWeekend)) return;

      // Use tag with reminder id so each reminder fires independently
      fireNotificationWithTag(task.name, n.message, task.id, n.id);
    });
  });

  // Account 2: Working window expiry check
  checkWorkingWindowExpiry();

  // Ego + Josh auto-report triggers (web/PWA fallback — Capacitor uses pre-scheduled)
  checkLast7DaysReportTrigger(hhmm);
  checkOverallProgressTrigger(hhmm);
  checkJoshLast7DaysTrigger(hhmm);
  checkJoshOverallProgressTrigger(hhmm);
}

/* ─────────────────────────────────────────────
   ACCOUNT 2 — shouldFireToday
   Checks if a reminder's repeat pattern applies today
───────────────────────────────────────────── */
function shouldFireToday(notifObj, dayOfWeek, isWeekday, isWeekend) {
  const r = notifObj.repeat || 'daily';
  if (r === 'daily')    return true;
  if (r === 'weekdays') return isWeekday;
  if (r === 'weekends') return isWeekend;
  if (r === 'custom') {
    const days = notifObj.customDays || [];
    return days.includes(dayOfWeek);
  }
  return true;
}

/* ─────────────────────────────────────────────
   ACCOUNT 2 — fireNotificationWithTag
   Fires with a per-reminder unique tag
───────────────────────────────────────────── */
function fireNotificationWithTag(title, body, taskId, reminderId) {
  const opts = {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'reminder-' + taskId + '-' + reminderId,
    renotify: true
  };
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('Aainik: ' + title, opts);
    }).catch(e => console.warn('Notification error (SW):', e));
  } else {
    try {
      const n = new Notification('Aainik: ' + title, opts);
      n.onclick = () => { window.focus(); showScreen('today'); };
    } catch (e) {
      console.warn('Notification error:', e);
    }
  }
}

function checkNotificationForTask(taskId) {
  // Called when task is marked complete — no action needed, scheduler skips completed tasks
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 2 — MULTI-REMINDER UI ENGINE
   Handles the per-task notification panel inside the task modal.
   Functions: renderTaskNotifications, addReminderRow,
              removeReminderRow, buildReminderRow,
              toggleReminderEnabled, testReminderNow,
              collectNotificationsFromUI, updateReminderCount,
              showNotifPreview, iOS detection
═══════════════════════════════════════════════════════════════ */

// In-memory array of reminders being edited (for current open task modal)
let editingNotifications = [];

/* ─────────────────────────────────────────────
   renderTaskNotifications(task)
   Populates the #task-notif-list container when
   task modal opens. Called by openAddTask / openEditTask.
───────────────────────────────────────────── */
function renderTaskNotifications(task) {
  // Deep-copy so edits don't affect appData until Save is clicked
  editingNotifications = task && task.notifications
    ? JSON.parse(JSON.stringify(task.notifications))
    : [];

  // If this is a new task and has legacy single notif, prefill one reminder
  if (editingNotifications.length === 0 && task && task.notification && task.notification.message) {
    editingNotifications.push({
      id: 'n_' + Date.now(),
      time: task.notification.time || task.scheduledTime || '08:00',
      message: task.notification.message || '',
      repeat: 'daily',
      customDays: [],
      enabled: true
    });
  }

  rebuildNotifUI();

  // iOS warning
  const iosWarn = document.getElementById('ios-notif-warning');
  if (iosWarn) {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      iosWarn.classList.remove('hidden');
    } else {
      iosWarn.classList.add('hidden');
    }
  }

  // Permission bar
  const permBar = document.getElementById('notif-permission-bar');
  if (permBar) {
    if ('Notification' in window && Notification.permission === 'denied') {
      permBar.classList.remove('hidden');
    } else {
      permBar.classList.add('hidden');
    }
  }
}

/* ─────────────────────────────────────────────
   rebuildNotifUI
   Re-renders the entire reminder list from editingNotifications[]
───────────────────────────────────────────── */
function rebuildNotifUI() {
  const list = document.getElementById('task-notif-list');
  if (!list) return;

  if (editingNotifications.length === 0) {
    list.innerHTML = `<p class="notif-empty-msg">Koi reminder nahi. "+ Reminder" button se add karo.</p>`;
  } else {
    list.innerHTML = editingNotifications.map((n, idx) => buildReminderRow(n, idx)).join('');
  }

  // Show/hide add button based on max count
  const addBtn  = document.getElementById('btn-add-reminder');
  const maxNote = document.getElementById('notif-max-note');
  if (addBtn)  addBtn.style.display  = editingNotifications.length >= 5 ? 'none' : '';
  if (maxNote) maxNote.classList.toggle('hidden', editingNotifications.length < 5);

  updateReminderCount();
}

/* ─────────────────────────────────────────────
   buildReminderRow(notifObj, idx)
   Returns HTML string for a single reminder card
───────────────────────────────────────────── */
function buildReminderRow(n, idx) {
  const repeatOptions = [
    { val: 'daily',    label: 'Har Din'   },
    { val: 'weekdays', label: 'Mon–Fri'   },
    { val: 'weekends', label: 'Sat–Sun'   },
    { val: 'custom',   label: 'Custom'    }
  ];

  const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const customDaysHtml = dayLabels.map((d, i) => `
    <label class="day-check-label">
      <input type="checkbox" class="day-check" data-idx="${idx}" data-day="${i}"
             ${(n.customDays || []).includes(i) ? 'checked' : ''}
             onchange="onCustomDayChange(${idx},${i},this.checked)" />
      <span>${d}</span>
    </label>
  `).join('');

  return `
  <div class="reminder-card ${n.enabled ? '' : 'disabled'}" id="reminder-card-${idx}">
    <div class="reminder-card-header">
      <span class="reminder-num">⏰ Reminder ${idx + 1}</span>
      <div class="reminder-header-actions">
        <label class="toggle-switch" title="${n.enabled ? 'Disable' : 'Enable'}">
          <input type="checkbox" ${n.enabled ? 'checked' : ''}
                 onchange="toggleReminderEnabled(${idx}, this.checked)" />
          <span class="toggle-slider"></span>
        </label>
        <button class="reminder-remove-btn" onclick="removeReminderRow(${idx})" title="Remove">✕</button>
      </div>
    </div>
    <div class="reminder-row">
      <label class="reminder-field-label">Time</label>
      <input type="time" class="form-input reminder-time-input"
             value="${escapeHtml(n.time || '08:00')}"
             onchange="onReminderFieldChange(${idx}, 'time', this.value)" />
    </div>
    <div class="reminder-row">
      <label class="reminder-field-label">Message</label>
      <input type="text" class="form-input reminder-msg-input"
             value="${escapeHtml(n.message || '')}"
             placeholder="e.g. Bhai uth ja! 💪"
             maxlength="120"
             onchange="onReminderFieldChange(${idx}, 'message', this.value)"
             oninput="onReminderFieldChange(${idx}, 'message', this.value)" />
    </div>
    <div class="reminder-row">
      <label class="reminder-field-label">Repeat</label>
      <select class="form-select reminder-repeat-select"
              onchange="onReminderRepeatChange(${idx}, this.value)">
        ${repeatOptions.map(o => `
          <option value="${o.val}" ${n.repeat === o.val ? 'selected' : ''}>${o.label}</option>
        `).join('')}
      </select>
    </div>
    <div class="reminder-custom-days ${n.repeat === 'custom' ? '' : 'hidden'}" id="custom-days-${idx}">
      ${customDaysHtml}
    </div>
    <div class="reminder-footer-actions">
      <button class="btn-test-notif" onclick="testReminderNow(${idx})">
        🔔 Test
      </button>
    </div>
  </div>`;
}

/* ─────────────────────────────────────────────
   addReminderRow — adds a new blank reminder
───────────────────────────────────────────── */
function addReminderRow() {
  if (editingNotifications.length >= 5) {
    showToast('⚠️ Maximum 5 reminders per task');
    return;
  }

  // Default messages get progressively more urgent
  const defaultMessages = [
    'Yaad hai? Ab shuru karo! 💪',
    'Abhi tak nahi kiya? Chalo jaldi! ⚡',
    'Bhai seriously? Ab toh karlo! 😤',
    'Last reminder — ye karo ABHI! 🔥',
    'FINAL call — koi bahaana nahi! 💥'
  ];
  const idx = editingNotifications.length;

  // Default time: task scheduled time or 08:00, bumped by 15 min per reminder
  let baseTime = '08:00';
  // Try to read task scheduled time from open modal
  const timeInput = document.getElementById('task-time-input');
  if (timeInput && timeInput.value) baseTime = timeInput.value;
  // Bump time for each subsequent reminder
  const bumpedTime = bumpTime(baseTime, idx * 15);

  editingNotifications.push({
    id: 'n_' + Date.now() + '_' + idx,
    time: bumpedTime,
    message: defaultMessages[idx] || 'Reminder! 🔔',
    repeat: 'daily',
    customDays: [],
    enabled: true
  });

  rebuildNotifUI();
  // Scroll the new card into view
  setTimeout(() => {
    const card = document.getElementById('reminder-card-' + (editingNotifications.length - 1));
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

/* ─────────────────────────────────────────────
   bumpTime(hhmm, minutesToAdd)
   '06:00' + 15 → '06:15'
───────────────────────────────────────────── */
function bumpTime(hhmm, minutesToAdd) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutesToAdd;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return String(nh).padStart(2,'0') + ':' + String(nm).padStart(2,'0');
}

/* ─────────────────────────────────────────────
   removeReminderRow(idx)
───────────────────────────────────────────── */
function removeReminderRow(idx) {
  editingNotifications.splice(idx, 1);
  rebuildNotifUI();
}

/* ─────────────────────────────────────────────
   Field change handlers — update editingNotifications in place
───────────────────────────────────────────── */
function onReminderFieldChange(idx, field, value) {
  if (!editingNotifications[idx]) return;
  editingNotifications[idx][field] = value;
  // No full rebuild needed for text/time changes — just update badge count
  updateReminderCount();
}

function onReminderRepeatChange(idx, value) {
  if (!editingNotifications[idx]) return;
  editingNotifications[idx].repeat = value;
  // Show/hide custom days
  const customRow = document.getElementById('custom-days-' + idx);
  if (customRow) customRow.classList.toggle('hidden', value !== 'custom');
}

function onCustomDayChange(idx, dayNum, checked) {
  if (!editingNotifications[idx]) return;
  const days = editingNotifications[idx].customDays || [];
  if (checked && !days.includes(dayNum)) days.push(dayNum);
  if (!checked) editingNotifications[idx].customDays = days.filter(d => d !== dayNum);
  else editingNotifications[idx].customDays = days;
}

function toggleReminderEnabled(idx, checked) {
  if (!editingNotifications[idx]) return;
  editingNotifications[idx].enabled = checked;
  const card = document.getElementById('reminder-card-' + idx);
  if (card) card.classList.toggle('disabled', !checked);
}

/* ─────────────────────────────────────────────
   testReminderNow(idx)
   Fires test notification immediately (ignores time/repeat)
───────────────────────────────────────────── */
function testReminderNow(idx) {
  const n = editingNotifications[idx];
  if (!n) return;

  // Sync current field values from DOM first
  const msgInput = document.querySelector(`#reminder-card-${idx} .reminder-msg-input`);
  const timInput = document.querySelector(`#reminder-card-${idx} .reminder-time-input`);
  if (msgInput) n.message = msgInput.value;
  if (timInput) n.time    = timInput.value;

  if (!('Notification' in window)) {
    showToast('⚠️ Browser notifications support nahi karta');
    return;
  }
  if (Notification.permission !== 'granted') {
    showToast('❌ Notification permission nahi hai — Settings mein allow karo');
    requestNotificationPermission();
    return;
  }

  const taskNameInput = document.getElementById('task-name-input');
  const taskName = (taskNameInput && taskNameInput.value.trim()) || 'Task';
  const msg = n.message || 'Test notification! 🔔';

  const testOpts = {
    body: msg,
    icon: 'icons/icon-192.png',
    tag: 'test-' + Date.now()
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(reg => {
      return reg.showNotification('🔔 TEST — Aainik: ' + taskName, testOpts);
    }).then(() => {
      showToast('✅ Test notification fire ho gaya!');
    }).catch(e => {
      showToast('⚠️ Test notification failed: ' + e.message);
    });
  } else {
    try {
      const notif = new Notification('🔔 TEST — Aainik: ' + taskName, testOpts);
      setTimeout(() => notif.close(), 4000);
      showToast('✅ Test notification fire ho gaya!');
    } catch (e) {
      showToast('⚠️ Test notification failed: ' + e.message);
    }
  }
}

/* ─────────────────────────────────────────────
   updateReminderCount
   Updates the badge showing how many reminders are set
───────────────────────────────────────────── */
function updateReminderCount() {
  const badge = document.getElementById('notif-count-badge');
  if (!badge) return;
  const enabled = editingNotifications.filter(n => n.enabled).length;
  const total   = editingNotifications.length;
  badge.textContent = total;
  badge.classList.toggle('has-reminders', total > 0);
}

/* ─────────────────────────────────────────────
   collectNotificationsFromUI
   Reads final state from editingNotifications[]
   (DOM values already synced via onchange handlers)
   Returns array ready to save to task.notifications
───────────────────────────────────────────── */
function collectNotificationsFromUI() {
  // Sync message and time fields from DOM in case onchange didn't fire
  editingNotifications.forEach((n, idx) => {
    const msgInput = document.querySelector(`#reminder-card-${idx} .reminder-msg-input`);
    const timInput = document.querySelector(`#reminder-card-${idx} .reminder-time-input`);
    if (msgInput) n.message = msgInput.value;
    if (timInput) n.time    = timInput.value;
  });
  return JSON.parse(JSON.stringify(editingNotifications));
}

/* ─────────────────────────────────────────────
   showNotifPreview
   Shows all of today's upcoming reminders
───────────────────────────────────────────── */
function showNotifPreview() {
  const now       = new Date();
  const hhmm      = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const today     = getTodayStr();

  const rows = [];
  appData.tasks.forEach(task => {
    if (!task.active || !task.notifications) return;
    const done = appData.history.find(h => h.taskId === task.id && h.date === today && h.completed);
    const cat  = appData.categories.find(c => c.id === task.categoryId);
    const catColor = cat ? cat.color : '#aaa';

    task.notifications.forEach(n => {
      if (!n.enabled) return;
      if (!shouldFireToday(n, dayOfWeek, isWeekday, isWeekend)) return;
      rows.push({ task, n, done: !!done, catColor });
    });
  });

  // Sort by time
  rows.sort((a, b) => (a.n.time || '').localeCompare(b.n.time || ''));

  const body = document.getElementById('notif-preview-body');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `<p class="muted" style="text-align:center;padding:16px">
      Aaj ke liye koi reminder schedule nahi hai.<br>
      Tasks mein reminders add karo!
    </p>`;
  } else {
    body.innerHTML = rows.map(r => `
      <div class="notif-preview-row ${r.done ? 'preview-done' : ''}">
        <span class="preview-time">${formatTime12(r.n.time)}</span>
        <div class="preview-info">
          <div class="preview-task-name" style="border-left:3px solid ${r.catColor}; padding-left:6px">
            ${r.done ? '✅' : '🔔'} ${escapeHtml(r.task.name)}
          </div>
          <div class="preview-msg muted small">${escapeHtml(r.n.message)}</div>
        </div>
      </div>
    `).join('');
  }

  openModal('modal-notif-preview');
}

/* ─────────────────────────────────────────────
   iOS detection helper (exported for use in SW)
───────────────────────────────────────────── */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/* ─────────────────────────────────────────────
   MODAL SYSTEM
───────────────────────────────────────────── */
let pendingConfirmAction = null;

function openModal(modalId) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  // If no modal is open, hide overlay
  const anyOpen = [...document.querySelectorAll('.modal')].some(m => !m.classList.contains('hidden'));
  if (!anyOpen) document.getElementById('modal-overlay').classList.add('hidden');
}

function closeModalOnOverlay(event) {
  if (event.target.id === 'modal-overlay') {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById('modal-overlay').classList.add('hidden');
  }
}

function showConfirmModal(title, msg, onConfirm) {
  document.getElementById('modal-confirm-title').textContent = title;
  document.getElementById('modal-confirm-msg').textContent   = msg;
  pendingConfirmAction = onConfirm;
  document.getElementById('modal-confirm-ok').onclick = () => {
    closeModal('modal-confirm');
    if (pendingConfirmAction) pendingConfirmAction();
  };
  openModal('modal-confirm');
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, isGold) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (isGold) el.classList.add('toast-gold');
  else el.classList.remove('toast-gold');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('toast-gold'); }, 2500);
}

/* ─────────────────────────────────────────────
   UTILITY
───────────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────
   SERVICE WORKER REGISTRATION
───────────────────────────────────────────── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Register periodic sync for background notification delivery
      if ('periodicSync' in reg) {
        reg.periodicSync.register('check-notifications', { minInterval: 60 * 1000 })
          .catch(() => {/* periodic sync may not be permitted — setInterval handles foreground */});
        // Also register ego reports check (weekly/daily/auto background)
        reg.periodicSync.register('check-ego-reports', { minInterval: 60 * 1000 })
          .catch(() => {});
      }
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });

    // Handle SW messages — e.g. navigate to coach screen when "Read Full" is tapped
    navigator.serviceWorker.addEventListener('message', event => {
      if (!event.data) return;
      if (event.data.type === 'NAVIGATE_SCREEN' && event.data.screen) {
        showScreen(event.data.screen);
      }
    });

    // Handle hash navigation from notification click (when app was closed)
    if (location.hash && location.hash.startsWith('#nav-')) {
      const targetScreen = location.hash.replace('#nav-', '');
      setTimeout(() => showScreen(targetScreen), 500);
      history.replaceState(null, '', location.pathname);
    }
  }
}

/* ─────────────────────────────────────────────
   PWA INSTALL PROMPT
───────────────────────────────────────────── */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

/* ─────────────────────────────────────────────
   SYSTEM THEME LISTENER
───────────────────────────────────────────── */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (appData && appData.settings.theme === 'system') {
    applyTheme('system');
  }
});

/* ─────────────────────────────────────────────
   MIDNIGHT RESET CHECK
   Tasks reset (completion clears) at midnight
   Data is already correct because we query by date —
   but we need to re-render if the app is open at midnight
───────────────────────────────────────────── */
function scheduleMidnightReset() {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 5, 0); // 5 seconds past midnight
  const ms   = next - now;
  setTimeout(() => {
    if (currentScreen === 'today') renderTodayScreen();
    scheduleMidnightReset(); // reschedule
  }, ms);
}

/* ─────────────────────────────────────────────
   APP INIT
───────────────────────────────────────────── */
function initApp() {
  // ── Detect if app was killed (not just backgrounded) ──
  // We save a heartbeat every 30s while foreground. If the gap since
  // the last heartbeat is > 2 minutes, app was killed/force-stopped.
  try {
    const lastBeat = parseInt(localStorage.getItem('_aainik_heartbeat') || '0');
    _appWasKilled = lastBeat > 0 && (Date.now() - lastBeat) > 120000; // >2 min
    // Save fresh heartbeat immediately
    localStorage.setItem('_aainik_heartbeat', String(Date.now()));
  } catch(e) {}

  // ── Start heartbeat ticker (every 30s while foreground) ──
  setInterval(() => {
    if (_appInForeground) {
      try { localStorage.setItem('_aainik_heartbeat', String(Date.now())); } catch(e) {}
    }
  }, 30000);

  loadData();
  applyTheme(appData.settings.theme || 'dark');

  // Apply saved sort order to UI
  const sortOrder = appData.sortOrder || 'time';
  document.querySelectorAll('.sort-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === sortOrder);
  });

  registerServiceWorker();
  startNotificationScheduler();
  scheduleMidnightReset();

  // Show TODAY as default screen
  showScreen('today');

  // Request notification permission after a short delay (less intrusive)
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-ask on first load — wait for user interaction
    }
  }, 3000);

  // Account 5: Capacitor Android init (runs only inside native APK, no-op in browser)
  setTimeout(initCapacitorAndroid, 1200);

  // Build inbox entries for any ego/josh times that passed while app was closed
  setTimeout(buildMissedInboxEntries, 5000);
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);

/* ═══════════════════════════════════════════════════════════════
   ENHANCEMENTS — Search, Swipe-to-Complete, Focus Timer
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   SEARCH
───────────────────────────────────────────── */
let taskSearchQuery = '';

function filterTaskSearch(q) {
  taskSearchQuery = q.toLowerCase().trim();
  renderTodayTasks(getTodayStr());
}

/* ─────────────────────────────────────────────
   SWIPE-TO-COMPLETE
   Swipe right on any non-completed task card
   to instantly mark it done.
───────────────────────────────────────────── */
const _swipe = { startX: 0, startY: 0, el: null, id: null, date: '', active: false, moved: false };
const _SWIPE_THRESHOLD = 75;

function initSwipeListeners() {
  const list = document.getElementById('today-task-list');
  if (!list || list._swipeReady) return;
  list._swipeReady = true;

  list.addEventListener('touchstart', e => {
    const card = e.target.closest('.task-card:not(.completed)');
    if (!card) return;
    _swipe.startX = e.touches[0].clientX;
    _swipe.startY = e.touches[0].clientY;
    _swipe.el     = card;
    _swipe.id     = card.id.replace('card-', '');
    _swipe.date   = getTodayStr();
    _swipe.active = true;
    _swipe.moved  = false;
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (!_swipe.active || !_swipe.el) return;
    const dx = e.touches[0].clientX - _swipe.startX;
    const dy = e.touches[0].clientY - _swipe.startY;

    // Bail if scrolling vertically
    if (!_swipe.moved && Math.abs(dy) > Math.abs(dx) + 4) {
      _swipe.active = false;
      return;
    }
    if (dx < 4) return;
    _swipe.moved = true;

    const clamped = Math.min(dx, 130);
    _swipe.el.style.transform  = `translateX(${clamped}px)`;
    _swipe.el.style.transition = 'none';

    // Green left-border glow as progress indicator
    const pct = Math.min(clamped / _SWIPE_THRESHOLD, 1);
    _swipe.el.style.borderLeftColor = `rgba(72,187,120,${pct})`;
    _swipe.el.style.boxShadow = pct > 0.5 ? `inset 3px 0 0 rgba(72,187,120,${pct})` : '';
  }, { passive: true });

  list.addEventListener('touchend', e => {
    if (!_swipe.active || !_swipe.el) { _swipe.active = false; return; }
    const dx  = e.changedTouches[0].clientX - _swipe.startX;
    const el  = _swipe.el;
    const id  = _swipe.id;
    const date = _swipe.date;

    // Reset swipe visual
    el.style.transition      = 'transform 0.25s ease, box-shadow 0.2s';
    el.style.borderLeftColor = '';
    el.style.boxShadow       = '';

    if (dx >= _SWIPE_THRESHOLD) {
      // Fly off to the right, then complete
      el.classList.add('swipe-completing');
      if (navigator.vibrate) navigator.vibrate([25, 60, 25]);
      setTimeout(() => {
        el.style.transform  = '';
        el.style.transition = '';
        el.classList.remove('swipe-completing');
        toggleTaskComplete(id, date);
      }, 290);
    } else {
      el.style.transform = '';
    }

    _swipe.active = false;
    _swipe.el     = null;
  }, { passive: true });
}

/* ─────────────────────────────────────────────
   FOCUS TIMER
   A per-task countdown using the task's own
   duration estimate (or 25 min default).
   SVG ring + play/pause/reset + auto-complete.
───────────────────────────────────────────── */
const _ft = {
  taskId:   null,
  taskName: '',
  duration: 25 * 60,
  remaining: 25 * 60,
  interval: null,
  running:  false
};

function openFocusTimer(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Stop existing timer
  _ftPause();

  _ft.taskId   = taskId;
  _ft.taskName = task.name;
  _ft.duration = Math.min(Math.max((task.duration || 25) * 60, 60), 180 * 60);
  _ft.remaining = _ft.duration;
  _ft.running  = false;

  // UI
  const nameEl = document.getElementById('focus-task-name');
  if (nameEl) nameEl.textContent = task.name;

  const today    = getTodayStr();
  const sessions = parseInt(sessionStorage.getItem('focus_sessions_' + today) || '0');
  const infoEl   = document.getElementById('focus-session-info');
  if (infoEl) infoEl.textContent = sessions + ' session' + (sessions !== 1 ? 's' : '') + ' today';

  _ftSetPlayBtn('ready');
  _ftUpdateDisplay();

  openModal('modal-focus-timer');
}

function startFocusTimer() {
  if (_ft.running) return;
  if (_ft.remaining <= 0) { resetFocusTimer(); return; }
  _ft.running = true;
  _ftSetPlayBtn('running');

  // Animate ring
  const circle = document.getElementById('focus-progress-circle');
  if (circle) { circle.classList.remove('done'); circle.classList.add('running'); }

  _ft.interval = setInterval(() => {
    _ft.remaining = Math.max(0, _ft.remaining - 1);
    _ftUpdateDisplay();
    if (_ft.remaining <= 0) {
      clearInterval(_ft.interval);
      _ft.interval = null;
      _ft.running  = false;
      _ftOnComplete();
    }
  }, 1000);
}

function pauseFocusTimer() {
  _ftPause();
  _ftSetPlayBtn('paused');
  const circle = document.getElementById('focus-progress-circle');
  if (circle) circle.classList.remove('running');
}

function resetFocusTimer() {
  _ftPause();
  _ft.remaining = _ft.duration;
  _ftSetPlayBtn('ready');
  _ftUpdateDisplay();
  const circle = document.getElementById('focus-progress-circle');
  if (circle) { circle.classList.remove('running', 'done'); }
  const lbl = document.getElementById('focus-ring-label');
  if (lbl) lbl.textContent = 'Ready';
}

function closeFocusTimer() {
  _ftPause();
  closeModal('modal-focus-timer');
}

function markFocusTaskDone() {
  _ftPause();
  const today = getTodayStr();
  const entry = appData.history.find(h => h.taskId === _ft.taskId && h.date === today);
  if (!entry || !entry.completed) toggleTaskComplete(_ft.taskId, today);
  closeModal('modal-focus-timer');
}

function _ftPause() {
  if (_ft.interval) { clearInterval(_ft.interval); _ft.interval = null; }
  _ft.running = false;
}

function _ftSetPlayBtn(state) {
  const btn = document.getElementById('btn-focus-play');
  if (!btn) return;
  if (state === 'running') {
    btn.textContent = '⏸';
    btn.classList.add('running');
    btn.classList.remove('paused');
    btn.onclick = pauseFocusTimer;
  } else {
    btn.textContent = '▶';
    btn.classList.remove('running');
    btn.classList.add('paused');
    btn.onclick = startFocusTimer;
  }
  const lbl = document.getElementById('focus-ring-label');
  if (lbl) {
    lbl.textContent = state === 'running' ? 'Focus' : state === 'paused' ? 'Paused' : 'Ready';
  }
}

function _ftUpdateDisplay() {
  const m    = Math.floor(_ft.remaining / 60).toString().padStart(2, '0');
  const s    = (_ft.remaining % 60).toString().padStart(2, '0');
  const disp = document.getElementById('focus-timer-display');
  if (disp) disp.textContent = m + ':' + s;

  const circle = document.getElementById('focus-progress-circle');
  if (circle) {
    // 2 * PI * 52 ≈ 326.73
    const circ   = 2 * Math.PI * 52;
    const filled = (_ft.remaining / _ft.duration) * circ;
    circle.style.strokeDasharray  = circ;
    circle.style.strokeDashoffset = filled;
  }
}

function _ftOnComplete() {
  if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
  showToast('🎯 Focus complete! ' + _ft.taskName + ' ✅');

  // Green ring
  const circle = document.getElementById('focus-progress-circle');
  if (circle) { circle.classList.remove('running'); circle.classList.add('done'); }

  // Count session
  const today = getTodayStr();
  const prev  = parseInt(sessionStorage.getItem('focus_sessions_' + today) || '0');
  sessionStorage.setItem('focus_sessions_' + today, prev + 1);
  const infoEl = document.getElementById('focus-session-info');
  if (infoEl) infoEl.textContent = (prev + 1) + ' session' + ((prev + 1) !== 1 ? 's' : '') + ' today';

  const lbl = document.getElementById('focus-ring-label');
  if (lbl) lbl.textContent = '🎉 Done!';

  _ftSetPlayBtn('ready');

  // Auto-complete task
  const entry = appData.history.find(h => h.taskId === _ft.taskId && h.date === today);
  if (!entry || !entry.completed) {
    setTimeout(() => toggleTaskComplete(_ft.taskId, today), 350);
  }
}

/* ═══════════════════════════════════════════════════════════════
   ACCOUNT 5 — CAPACITOR ANDROID
   Native Android back button + OS-level notifications
   All functions below are no-ops in browser mode.
   They only activate inside the Capacitor APK.
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   INIT — called from initApp() after 1.2s delay
───────────────────────────────────────────── */
function initCapacitorAndroid() {
  if (typeof window.Capacitor === 'undefined') return; // Browser — skip
  if (!window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return;

  console.log('Aainik: Capacitor native mode detected');

  // Hardware back button + App state change tracking
  const { App } = window.Capacitor.Plugins || {};
  if (App) {
    App.addListener('backButton', handleAndroidBack);

    // Track foreground / background transitions
    App.addListener('appStateChange', ({ isActive }) => {
      _appInForeground = !!isActive;
      if (isActive) {
        // App came to foreground — save heartbeat
        localStorage.setItem('_aainik_heartbeat', String(Date.now()));
      }
    });
  }

  // Also track via document visibility API (web fallback)
  document.addEventListener('visibilitychange', () => {
    _appInForeground = !document.hidden;
    if (!document.hidden) {
      localStorage.setItem('_aainik_heartbeat', String(Date.now()));
    }
  });

  // Init native notifications (permissions + channels + schedule)
  initCapacitorNotifications();
}

/* ─────────────────────────────────────────────
   BACK BUTTON — hardware back on Android
───────────────────────────────────────────── */
function handleAndroidBack() {
  // 1. Close any open modal first
  const openModals = document.querySelectorAll('.modal:not(.hidden)');
  if (openModals.length > 0) {
    openModals.forEach(m => m.classList.add('hidden'));
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    return;
  }

  // 2. If not on today screen, go to today
  if (typeof currentScreen !== 'undefined' && currentScreen !== 'today') {
    showScreen('today');
    return;
  }

  // 3. On today screen — exit app
  const { App } = (window.Capacitor && window.Capacitor.Plugins) || {};
  if (App && App.exitApp) {
    App.exitApp();
  }
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS — request permissions + channels
───────────────────────────────────────────── */
async function initCapacitorNotifications() {
  try {
    const { LocalNotifications } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!LocalNotifications) return;

    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    // ── Patch Web Notification API for Capacitor WebView ──
    // Android WebView me window.Notification nahi hoti
    // Isliye hum ise manually set karte hain taaki baaki app code kaam kare
   try {
  if (!('Notification' in window)) {
    function Notification(title, opts) {
      try {
        const { LocalNotifications } = (window.Capacitor && window.Capacitor.Plugins) || {};
        if (LocalNotifications) {
          const fireAt = new Date(Date.now() + 500);
          LocalNotifications.schedule({ notifications: [{
            id: Math.floor(Math.random() * 99999) + 1,
            title: title,
            body: (opts && opts.body) || '',
            channelId: 'aainik-tasks',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground'
          }]});
        }
      } catch(e) { console.warn('Notif shim error:', e); }
    }
    Notification.permission = 'granted';
    Notification.requestPermission = async () => 'granted';
    window.Notification = Notification;
  } else {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'granted',
      configurable: true
    });
  }
} catch(e) {}

    // Create Android notification channels
    const channels = [
      {
        id: 'aainik-tasks',
        name: 'Task Reminders',
        description: 'Daily task reminder notifications',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#A29BFE'
      },
      {
        id: 'aainik-ego',
        name: 'Ego AI Reports',
        description: 'Tera-Ego AI reality check notifications',
        importance: 3,
        visibility: 1,
        vibration: true
      },
      {
        id: 'aainik-josh',
        name: 'Josh Reminders',
        description: 'Tera-Josh motivational reminders',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#55EFC4'
      }
    ];

    for (const ch of channels) {
      try { await LocalNotifications.createChannel(ch); } catch(e) {}
    }

    // ── Register action button types for Ego and Josh notifications ──
    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'ego_response_action',
            actions: [
              {
                id: 'send_ego_response',
                title: '📤 Send me ego\'s response',
                foreground: false  // do NOT open app — handle silently in background
              }
            ]
          },
          {
            id: 'josh_response_action',
            actions: [
              {
                id: 'send_josh_response',
                title: '📤 Send me response',
                foreground: false  // do NOT open app — handle silently in background
              }
            ]
          }
        ]
      });
    } catch(e) { console.warn('Aainik: Action types registration error:', e); }
    // ── NEW listener: handles action buttons + body taps ──
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const extra    = (event.notification && event.notification.extra) || {};
        const actionId = event.actionId || 'tap'; // 'tap' = body tap, custom id = button
        const convType = extra.convType || extra.type || '';
        const time     = extra.time || '';
        const date     = extra.date || getTodayStr();

        try { localStorage.setItem('_aainik_heartbeat', String(Date.now())); } catch(e) {}

        if (actionId === 'send_ego_response') {
          // Immediately minimize app as backup (some Android skins still foreground despite foreground:false)
          try {
            const { App: _App } = (window.Capacitor && window.Capacitor.Plugins) || {};
            if (_App && _App.minimizeApp) setTimeout(() => _App.minimizeApp(), 80);
          } catch(e) {}
          // Resolve correct triggerTime for last7days / overall notifications
          let egoTriggerTime = time;
          if (extra.type === 'last7days')        egoTriggerTime = 'last7days_' + date;
          else if (extra.type === 'overall_progress') egoTriggerTime = 'overall_' + date;
          // Pipeline runs silently in background — suppress reschedule so nearby notifications aren't cancelled
          addEgoInboxEntry(egoTriggerTime, date, true);
          handleNotifSendEgoResponse(egoTriggerTime, date).catch(err => {
            console.warn('Ego send response failed:', err.message);
          });

        } else if (actionId === 'send_josh_response') {
          // Immediately minimize app as backup
          try {
            const { App: _App } = (window.Capacitor && window.Capacitor.Plugins) || {};
            if (_App && _App.minimizeApp) setTimeout(() => _App.minimizeApp(), 80);
          } catch(e) {}
          // Resolve correct triggerTime for last7days / overall notifications
          let joshTriggerTime = time;
          if (extra.type === 'josh_last7days') joshTriggerTime = 'jlast7days_' + date;
          else if (extra.type === 'josh_overall') joshTriggerTime = 'joverall_' + date;
          // Pipeline runs silently in background
          addJoshInboxEntry(joshTriggerTime, date, true);
          handleNotifSendJoshResponse(joshTriggerTime, date).catch(err => {
            console.warn('Josh send response failed:', err.message);
          });

        } else if (convType === 'ego_check' || extra.type === 'last7days' || extra.type === 'overall_progress') {
          // Body tap on ego notification — open inbox screen
          addEgoInboxEntry(time, date, false);
          if (typeof showScreen === 'function') showScreen('inbox');
          setTimeout(() => {
            if (typeof switchInboxTab === 'function') switchInboxTab('ego');
          }, 400);

        } else if (convType === 'josh_reminder' || extra.type === 'josh_last7days' || extra.type === 'josh_overall') {
          // Body tap on josh notification — open inbox screen
          addJoshInboxEntry(time, date, false);
          if (typeof showScreen === 'function') showScreen('inbox');
          setTimeout(() => {
            if (typeof switchInboxTab === 'function') switchInboxTab('josh');
          }, 400);

        } else {
          // Task reminder or other notification — standard routing
          const screen = extra.screen || 'today';
          if (typeof showScreen === 'function') showScreen(screen);
        }
      });
    } catch(e) { console.warn('notif listener error:', e); }

    await scheduleAllCapacitorNotifications();

  } catch(e) {
    console.warn('Capacitor notifications init error:', e);
  }
}

/* ─────────────────────────────────────────────
   SCHEDULE ALL — reschedules all native notifications
   Called once on init and again on every saveData()
───────────────────────────────────────────── */
async function scheduleAllCapacitorNotifications() {
  try {
    const { LocalNotifications } = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (!LocalNotifications) return;

    // Check permission
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;

    // Cancel all existing pending notifications
    try {
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (e) {
      console.warn('Cancel pending warn:', e.message);
    }

    const notifications = [];
    // Use IST-aware "now" for skip logic — avoids UTC offset causing missed notifications
    const now = new Date();
    const istNow = getNowISTDate();

    // Schedule for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      // Build target date in IST space
      const targetIST = new Date(istNow);
      targetIST.setDate(targetIST.getDate() + dayOffset);
      const dayOfWeek = targetIST.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Build IST date string for this target day
      const todayStr = targetIST.getFullYear() + '-' +
        String(targetIST.getMonth() + 1).padStart(2, '0') + '-' +
        String(targetIST.getDate()).padStart(2, '0');

      // Helper: convert IST HH:MM on targetIST day to a real UTC Date for scheduling
      const makeFireAt = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        // Create an IST datetime: year/month/date from targetIST, h:m from setting
        const istMs = Date.UTC(
          targetIST.getFullYear(),
          targetIST.getMonth(),
          targetIST.getDate(),
          h, m, 0, 0
        ) - (5.5 * 60 * 60 * 1000); // subtract IST offset to get UTC
        return new Date(istMs);
      };

      // ── Task reminders ──
      appData.tasks.forEach((task, tIdx) => {
        if (!task.active) return;
        const reminders = task.notifications || [];
        reminders.forEach((n, nIdx) => {
          if (!n.enabled || !n.time || !n.message) return;
          if (!_capShouldFireOnDay(n, dayOfWeek, isWeekday, isWeekend)) return;

          const fireAt = makeFireAt(n.time);
          // Only skip past times for TODAY (dayOffset 0); future days always schedule
          if (dayOffset === 0 && fireAt <= now) return;

          const id = Math.abs((dayOffset * 9999 + tIdx * 99 + nIdx) % 2000000);
          notifications.push({
            id: id || (dayOffset * 1000 + tIdx * 10 + nIdx + 1),
            title: '📋 ' + task.name,
            body: n.message,
            channelId: 'aainik-tasks',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: '',
            extra: { taskId: task.id, type: 'task' }
          });
        });

        // Working window end reminder
        if (task.workingWindowEnd) {
          const [wh, wm] = task.workingWindowEnd.split(':').map(Number);
          const warnHour  = wm >= 10 ? wh : wh - 1;
          const warnMin   = wm >= 10 ? wm - 10 : 60 + wm - 10;
          const warnTime  = String(warnHour < 0 ? 23 : warnHour).padStart(2,'0') + ':' + String(warnMin).padStart(2,'0');
          const warnAt    = makeFireAt(warnTime);
          if (!(dayOffset === 0 && warnAt <= now)) {
            const wid = Math.abs((7000000 + dayOffset * 999 + tIdx) % 2100000000);
            notifications.push({
              id: wid || (7000000 + dayOffset * 100 + tIdx),
              title: '⏰ Window Closing: ' + task.name,
              body: '10 min baad working window band ho jaegi! Abhi complete karo.',
              channelId: 'aainik-tasks',
              schedule: { at: warnAt, allowWhileIdle: true },
              smallIcon: 'ic_launcher_foreground',
              extra: { taskId: task.id, type: 'window_warn' }
            });
          }
        }
      });

      // ── Ego AI auto-check notifications ──
      if (appData.settings.autoCoachEnabled) {
        (appData.settings.autoCoachTimes || []).forEach((entry, idx) => {
          if (!entry.enabled || !entry.time) return;
          const fireAt = makeFireAt(entry.time);
          if (dayOffset === 0 && fireAt <= now) return;
          const id = Math.abs((1000000 + dayOffset * 100 + idx) % 2100000000);
          const timeDisp = formatTime12(entry.time);
          notifications.push({
            id: id || (1000000 + dayOffset * 100 + idx + 1),
            title: '🧠 Ego ne response diya hai!',
            body: `Ego ne tumhari ${timeDisp} tak ki progress pr response diya hai. "Send me ego\'s response" pr click karo 📊`,
            channelId: 'aainik-ego',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'ego_response_action',
            extra: { type: 'ego_check', time: entry.time, date: todayStr, screen: 'inbox', convType: 'ego_check' }
          });
        });
      }

      // ── Ego Last 7 Days Report notification ──
      const s = appData.settings;
      if (s.last7DaysReportEnabled && s.last7DaysReportTime) {
        const fireAt = makeFireAt(s.last7DaysReportTime);
        if (!(dayOffset === 0 && fireAt <= now)) {
          const id = Math.abs((3000000 + dayOffset * 10) % 2100000000);
          notifications.push({
            id: id || (3000000 + dayOffset),
            title: '📊 Ego: Last 7 Days Report!',
            body: `ego ne tumhari last 7 days ki progress pr response diya hai. Inbox check karo! 📊`,
            channelId: 'aainik-ego',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'ego_response_action',
            extra: { type: 'last7days', date: todayStr, screen: 'inbox' }
          });
        }
      }

      // ── Ego Overall Progress notification ──
      if (s.overallProgressEnabled && s.overallProgressTime) {
        const fireAt = makeFireAt(s.overallProgressTime);
        if (!(dayOffset === 0 && fireAt <= now)) {
          const id = Math.abs((3100000 + dayOffset * 10) % 2100000000);
          notifications.push({
            id: id || (3100000 + dayOffset),
            title: '📈 Ego: Overall Progress!',
            body: `ego ne tumhari overall progress pr response diya hai. Inbox check karo! 📈`,
            channelId: 'aainik-ego',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'ego_response_action',
            extra: { type: 'overall_progress', date: todayStr, screen: 'inbox' }
          });
        }
      }

      // ── Josh auto-reminder notifications ──
      if (s.joshAutoEnabled) {
        (s.joshAutoTimes || []).forEach((entry, idx) => {
          if (!entry.enabled || !entry.time) return;
          const fireAt = makeFireAt(entry.time);
          if (dayOffset === 0 && fireAt <= now) return;
          const id = Math.abs((2000000 + dayOffset * 100 + idx) % 2100000000);
          notifications.push({
            id: id || (2000000 + dayOffset * 100 + idx + 1),
            title: '💪 Josh ne response diya hai!',
            body: `Josh ne tumhare remaining tasks pr response diya hai. "Send me response" pr click karo 💪`,
            channelId: 'aainik-josh',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'josh_response_action',
            extra: { type: 'josh_reminder', time: entry.time, date: todayStr, screen: 'inbox', convType: 'josh_reminder' }
          });
        });
      }

      // ── Josh Last 7 Days Report notification ──
      if (s.joshLast7DaysEnabled && s.joshLast7DaysTime) {
        const fireAt = makeFireAt(s.joshLast7DaysTime);
        if (!(dayOffset === 0 && fireAt <= now)) {
          const id = Math.abs((3200000 + dayOffset * 10) % 2100000000);
          notifications.push({
            id: id || (3200000 + dayOffset),
            title: '📊 Josh: Last 7 Days!',
            body: `josh ne tumhari last 7 days ki progress pr response diya hai. Inbox check karo! 📊`,
            channelId: 'aainik-josh',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'josh_response_action',
            extra: { type: 'josh_last7days', date: todayStr, screen: 'inbox' }
          });
        }
      }

      // ── Josh Overall Progress notification ──
      if (s.joshOverallProgressEnabled && s.joshOverallProgressTime) {
        const fireAt = makeFireAt(s.joshOverallProgressTime);
        if (!(dayOffset === 0 && fireAt <= now)) {
          const id = Math.abs((3300000 + dayOffset * 10) % 2100000000);
          notifications.push({
            id: id || (3300000 + dayOffset),
            title: '📈 Josh: Overall Progress!',
            body: `josh ne tumhari overall progress pr response diya hai. Inbox check karo! 📈`,
            channelId: 'aainik-josh',
            schedule: { at: fireAt, allowWhileIdle: true },
            smallIcon: 'ic_launcher_foreground',
            actionTypeId: 'josh_response_action',
            extra: { type: 'josh_overall', date: todayStr, screen: 'inbox' }
          });
        }
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log('Aainik: Scheduled ' + notifications.length + ' native notifications (IST-corrected)');
    } else {
      console.log('Aainik: No notifications to schedule right now');
    }

  } catch (e) {
    console.warn('Aainik: scheduleAllCapacitorNotifications error:', e);
  }
}

/* ─────────────────────────────────────────────
   HELPER — should this reminder fire on given day?
───────────────────────────────────────────── */
function _capShouldFireOnDay(n, dayOfWeek, isWeekday, isWeekend) {
  const r = n.repeat || 'daily';
  if (r === 'daily')    return true;
  if (r === 'weekdays') return isWeekday;
  if (r === 'weekends') return isWeekend;
  if (r === 'custom')   return (n.customDays || []).includes(dayOfWeek);
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   NEW VERSION: INBOX + TELEGRAM DELIVERY SYSTEM
   
   API can only be called via 3 methods:
   1. Notification "Send me response" button  → handleNotifSendEgoResponse / handleNotifSendJoshResponse
   2. Inbox "Read More" button               → handleReadMoreEgo / handleReadMoreJosh
   3. Manual chat in Ego/Josh pages          → (existing: talkToCoach, joshManualChat, askScoreQuery)
═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   INBOX ENTRY MANAGEMENT
───────────────────────────────────────────── */

/**
 * Add an ego inbox entry for a trigger time.
 * silent=true → don't re-render (used during batch/init)
 */
function addEgoInboxEntry(triggerTime, date, silent) {
  if (!appData.egoInbox) appData.egoInbox = [];
  const today = getTodayStr();
  const d     = date || today;

  // ── Single-day rule: purge any entries not from today ──
  appData.egoInbox = appData.egoInbox.filter(e => e.date === today);

  const id = 'ego_inbox_' + d + '_' + triggerTime;
  if (appData.egoInbox.find(e => e.id === id)) return; // already exists
  appData.egoInbox.unshift({
    id,
    triggerTime,
    date: d,
    timestamp: Date.now(),
    response: null,          // null = not fetched yet
    status: 'pending'        // 'pending' | 'sent_to_telegram' | 'read'
  });
  if (appData.egoInbox.length > 50) appData.egoInbox = appData.egoInbox.slice(0, 50);
  if (!silent) {
    saveData();
    if (currentScreen === 'inbox') renderInboxScreen();
  }
}

/**
 * Add a josh inbox entry for a trigger time.
 */
function addJoshInboxEntry(triggerTime, date, silent) {
  if (!appData.joshInbox) appData.joshInbox = [];
  const today = getTodayStr();
  const d     = date || today;

  // ── Single-day rule: purge any entries not from today ──
  appData.joshInbox = appData.joshInbox.filter(e => e.date === today);

  const id = 'josh_inbox_' + d + '_' + triggerTime;
  if (appData.joshInbox.find(e => e.id === id)) return;
  appData.joshInbox.unshift({
    id,
    triggerTime,
    date: d,
    timestamp: Date.now(),
    response: null,
    status: 'pending'
  });
  if (appData.joshInbox.length > 50) appData.joshInbox = appData.joshInbox.slice(0, 50);
  if (!silent) {
    saveData();
    if (currentScreen === 'inbox') renderInboxScreen();
  }
}

/* ─────────────────────────────────────────────
   NOTIFICATION ACTION HANDLERS
   Called when user taps "Send me response" button
───────────────────────────────────────────── */

async function handleNotifSendEgoResponse(triggerTime, date) {
  const d  = date || getTodayStr();
  const id = 'ego_inbox_' + d + '_' + triggerTime;

  // Ensure inbox entry exists
  addEgoInboxEntry(triggerTime, d, true);

  // Block saveData from cancelling pending notifications during this pipeline
  _suppressNotifReschedule = true;
  try {
    // Call API
    const response = await runEgoResponseForTime(triggerTime, d);

    // Remove from inbox — user clicked "Send me response" so it's handled
    appData.egoInbox = (appData.egoInbox || []).filter(e => e.id !== id);
    saveData(); // safe — reschedule suppressed

    // Send to Telegram
    const timeDisp = formatTime12(triggerTime);
    const msg = `🧠 *Ego Report — ${timeDisp} (${d})*\n\n${response}`;
    try {
      await sendToTelegram(msg);
      showToast('✅ Ego response Telegram pr send ho gaya!', true);
    } catch (e) {
      showToast('⚠️ Telegram send failed: ' + e.message + '\n(Response inbox mein save hai)');
    }

    if (currentScreen === 'inbox') renderInboxScreen();
  } finally {
    // Always re-enable reschedule — do ONE final sync with 5s delay so nearby notifications fire first
    _suppressNotifReschedule = false;
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      setTimeout(scheduleAllCapacitorNotifications, 5000);
    }
  }
}

async function handleNotifSendJoshResponse(triggerTime, date) {
  const d  = date || getTodayStr();
  const id = 'josh_inbox_' + d + '_' + triggerTime;

  addJoshInboxEntry(triggerTime, d, true);

  // Block saveData from cancelling pending notifications during this pipeline
  _suppressNotifReschedule = true;
  try {
    const response = await runJoshResponseForTime(triggerTime, d);

    // Remove from inbox — user clicked "Send me response" so it's handled
    appData.joshInbox = (appData.joshInbox || []).filter(e => e.id !== id);
    saveData(); // safe — reschedule suppressed

    const timeDisp = formatTime12(triggerTime);
    const msg = `💪 *Josh Reminder — ${timeDisp} (${d})*\n\n${response}`;
    try {
      await sendToTelegram(msg);
      showToast('✅ Josh response Telegram pr send ho gaya!', true);
    } catch (e) {
      showToast('⚠️ Telegram send failed: ' + e.message + '\n(Response inbox mein save hai)');
    }

    if (currentScreen === 'inbox') renderInboxScreen();
  } finally {
    // Always re-enable reschedule after pipeline
    _suppressNotifReschedule = false;
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      setTimeout(scheduleAllCapacitorNotifications, 5000);
    }
  }
}

/* ─────────────────────────────────────────────
   INBOX READ MORE HANDLERS
   Called when user taps "Read More" in inbox
───────────────────────────────────────────── */

async function handleReadMoreEgo(inboxId) {
  const entry = (appData.egoInbox || []).find(e => e.id === inboxId);
  if (!entry) return;

  // Already have response → show it
  if (entry.response) {
    showInboxResponseModal('🧠 Ego Response', entry.response, formatTime12(entry.triggerTime), entry.date);
    return;
  }

  // Need to fetch → show loading → call API
  showInboxLoadingModal('🧠 Ego Response', formatTime12(entry.triggerTime));

  try {
    const response = await runEgoResponseForTime(entry.triggerTime, entry.date);
    entry.response = response;
    entry.status   = 'read';
    entry.readAt   = Date.now();
    saveData();
    closeInboxLoadingModal();
    showInboxResponseModal('🧠 Ego Response', response, formatTime12(entry.triggerTime), entry.date);
    if (currentScreen === 'inbox') renderInboxScreen();
  } catch(e) {
    closeInboxLoadingModal();
    showToast('❌ Response load nahi hua: ' + e.message);
  }
}

async function handleReadMoreJosh(inboxId) {
  const entry = (appData.joshInbox || []).find(e => e.id === inboxId);
  if (!entry) return;

  if (entry.response) {
    showInboxResponseModal('💪 Josh Response', entry.response, formatTime12(entry.triggerTime), entry.date);
    return;
  }

  showInboxLoadingModal('💪 Josh Response', formatTime12(entry.triggerTime));

  try {
    const response = await runJoshResponseForTime(entry.triggerTime, entry.date);
    entry.response = response;
    entry.status   = 'read';
    entry.readAt   = Date.now();
    saveData();
    closeInboxLoadingModal();
    showInboxResponseModal('💪 Josh Response', response, formatTime12(entry.triggerTime), entry.date);
    if (currentScreen === 'inbox') renderInboxScreen();
  } catch(e) {
    closeInboxLoadingModal();
    showToast('❌ Response load nahi hua: ' + e.message);
  }
}

/* ─────────────────────────────────────────────
   CORE API CALLERS (Manual trigger only)
   Extracted from old runAutoCoachReport / runJoshAutoReminder
───────────────────────────────────────────── */

/**
 * Call Gemini API for Ego response at a specific trigger time.
 * Used by both "Send me response" and "Read More".
 * Returns the full response string.
 */

// Builds a system prompt where "current time" is triggerTime, not now.
// Used when replaying/reading an old inbox entry — AI must think it IS that time.
function buildSystemPromptForSnapshot(snapshotHHMM, snapshotDate) {
  const s = appData.settings;
  const personality = s.coachPersonality || 'beast';
  const base = getActiveCoachPrompt(personality);

  // Override time — critical for honest snapshot response
  const _istTimeNote = `\n\n🕐 CHECK TIME (SNAPSHOT): ${snapshotHHMM} IST on ${snapshotDate}. You are Tera-Ego giving a reality check as if it is currently ${snapshotHHMM} IST. DO NOT reference events after this time. DO NOT use current real time.`;

  // Score calibration for snapshot time
  const _expiredAtSnapshot = appData.tasks.filter(t => {
    if (t.active === false) return false;
    const winEnd = t.workingWindowEnd || '';
    return winEnd && winEnd < snapshotHHMM;
  });
  const _snapDayNotStarted = _expiredAtSnapshot.length === 0;

  let brutalityNote = '';
  if (personality === 'beast') {
    brutalityNote = _snapDayNotStarted
      ? `\n\n⚠️ SCORE: At ${snapshotHHMM} din abhi shuru tha — koi window expire nahi hui thi. DO NOT roast for zero. Upcoming tasks ke liye energy de.`
      : `\n\n⚠️ SCORE: Judge based on expired window tasks only. Full honest reality check as per personality.`;
  } else if (personality === 'balanced') {
    brutalityNote = `\n\nSCORE: Honest balanced feedback for the ${snapshotHHMM} checkpoint.`;
  } else {
    brutalityNote = `\n\nSCORE: Gently honest for the ${snapshotHHMM} checkpoint.`;
  }

  const lifeGoals  = (s.egoLifeGoals || '').trim();
  const goalsNote  = lifeGoals ? '\n\n🎯 LIFE GOALS:\n' + lifeGoals : '';
  const negWords   = (s.egoNegativeWords || '').trim();
  const negNote    = negWords ? '\n\n💬 LOG KYA KEHTE HAIN:\n' + negWords : '';
  const taskWhyLines = appData.tasks
    .filter(t => t.active !== false && t.whyMatters)
    .map(t => `• ${t.name}: "${t.whyMatters.trim()}"`)
    .join('\n');
  const whyNote = taskWhyLines ? '\n\n📋 WHY IT MATTERS:\n' + taskWhyLines : '';

  return base + _istTimeNote + brutalityNote + goalsNote + negNote + whyNote;
}

async function runEgoResponseForTime(triggerTime, forDate) {
  if (!hasAnyApiKey()) throw new Error('API key missing! Settings mein set karo.');

  const today = forDate || getTodayStr();
  const data  = getCoachData();
  data.report_type = 'auto_check';
  data.check_time  = triggerTime;

  // ── TIME SNAPSHOT LOGIC ──
  // Simpler: just compare HH:MM strings for history timestamps on the same date
  const triggerHHMM = triggerTime; // "HH:MM" — we compare against mark-done time

  const tasksDueByNow = appData.tasks
    .filter(t => t.active !== false)
    .filter(t => {
      // Only tasks whose window STARTED by triggerTime
      const startTime = t.workingWindowStart || t.scheduledTime || '00:00';
      return startTime <= triggerHHMM;
    })
    .map(t => {
      // ── SNAPSHOT: get history entry that existed AT triggerTime ──
      // A task counts as "done at triggerTime" ONLY if it was marked done
      // before or at triggerTime on that date.
      const allEntries = appData.history.filter(h => h.taskId === t.id && h.date === today);

      // Get the most recent entry that was created at or before triggerTime
      // appData.history entries have a `timestamp` (ms). Convert to HH:MM for comparison.
      const entryAtTrigger = allEntries.find(h => {
        if (!h.timestamp) return true; // old entries without timestamp — assume they existed
        // Convert timestamp to IST HH:MM
        const istOffset = 5.5 * 60;
        const utc = h.timestamp + (0); // timestamp is already ms since epoch
        const istDate = new Date(utc + (new Date().getTimezoneOffset() * 60000) + (istOffset * 60000));
        const entryHHMM = String(istDate.getHours()).padStart(2,'0') + ':' + String(istDate.getMinutes()).padStart(2,'0');
        // Check if entry was on same date in IST
        const entryDateStr = istDate.getFullYear() + '-' +
          String(istDate.getMonth()+1).padStart(2,'0') + '-' +
          String(istDate.getDate()).padStart(2,'0');
        if (entryDateStr !== today) return false;
        return entryHHMM <= triggerHHMM; // only entries marked at or before triggerTime
      });

      const done = entryAtTrigger && entryAtTrigger.completed;
      const cat  = appData.categories.find(c => c.id === t.categoryId);
      const catName    = cat ? cat.name : '';
      const winStart   = t.workingWindowStart || t.scheduledTime || '00:00';
      const winEnd     = t.workingWindowEnd   || '23:59';

      // Time-aware classification based on triggerTime (NOT current time)
      let statusLabel;
      if (done) {
        const eff = entryAtTrigger.effortDeclared
          ? `effort ${entryAtTrigger.effortScore}/10`
          : 'effort not declared';
        statusLabel = `✅ DONE (${eff})`;
      } else if (entryAtTrigger && entryAtTrigger.isUntracked) {
        statusLabel = `⚠️ UNTRACKED (window closed without marking — 0 score)`;
      } else if (entryAtTrigger && !entryAtTrigger.completed) {
        statusLabel = `❌ MISSED (explicitly marked not done before ${triggerHHMM})`;
      } else if (winEnd > triggerHHMM) {
        // Window still open AT triggerTime → in progress, not yet judged
        statusLabel = `⏳ IN PROGRESS at ${triggerHHMM} (window ${winStart}–${winEnd} IST — still open at check time, could still be done)`;
      } else {
        // Window closed before triggerTime, no entry → genuine miss
        statusLabel = `❌ MISSED (window ${winStart}–${winEnd} IST closed before ${triggerHHMM}, no entry)`;
      }

      // Also note if task was marked done AFTER triggerTime (so AI knows it happened later)
      const markedAfterTrigger = allEntries.find(h => {
        if (!h.timestamp || !h.completed) return false;
        const istOffset = 5.5 * 60;
        const istDate = new Date(h.timestamp + (new Date().getTimezoneOffset() * 60000) + (istOffset * 60000));
        const entryHHMM = String(istDate.getHours()).padStart(2,'0') + ':' + String(istDate.getMinutes()).padStart(2,'0');
        const entryDateStr = istDate.getFullYear() + '-' +
          String(istDate.getMonth()+1).padStart(2,'0') + '-' +
          String(istDate.getDate()).padStart(2,'0');
        return entryDateStr === today && entryHHMM > triggerHHMM;
      });

      const afterNote = markedAfterTrigger
        ? ` [NOTE: user marked this done AFTER ${triggerHHMM} — at the time of this check it was not yet done]`
        : '';

      return {
        name: t.name, category: catName,
        scheduledTime: winStart, workingWindowEnd: winEnd,
        completed: !!done,
        effortScore: done ? (entryAtTrigger.effortScore || 0) : 0,
        isUntracked: entryAtTrigger ? !!entryAtTrigger.isUntracked : false,
        isPending: !done && winEnd > triggerHHMM,
        isMissed: !done && winEnd <= triggerHHMM && !entryAtTrigger?.isUntracked,
        whyMatters: t.whyMatters || '',
        statusLabel: statusLabel + afterNote
      };
    });

  const doneCount    = tasksDueByNow.filter(t => t.completed).length;
  const totalDue     = tasksDueByNow.length;
  const untrackedNow = tasksDueByNow.filter(t => t.isUntracked).length;
  const pendingNow   = tasksDueByNow.filter(t => t.isPending).length;
  const missedNow    = tasksDueByNow.filter(t => t.isMissed).length;

  const expiredForScore = tasksDueByNow.filter(t => !t.isPending);
  const effectiveScore  = expiredForScore.length > 0
    ? Math.round((tasksDueByNow.filter(t => t.completed).length / expiredForScore.length) * 100)
    : null;

  data.tasks_due_by_now = tasksDueByNow;
  data.due_summary = `At ${triggerHHMM} IST: ${doneCount}/${totalDue} tasks done | In-progress: ${pendingNow} | Missed: ${missedNow} | Untracked: ${untrackedNow}`;

  // ── PASS triggerTime AS "current time" to AI — not actual now ──
  // This is critical: AI must reason about what was happening AT triggerTime,
  // not at the time the user tapped "Read More"
  const snapshotSystemPrompt = buildSystemPromptForSnapshot(triggerHHMM, today);

  const timeContext = `\n\nEGO CHECK TIME: ${triggerHHMM} IST on ${today}
[NOTE: This response was generated for the ${triggerHHMM} check. Evaluate ONLY what was true at ${triggerHHMM} IST.]

Task status AT ${triggerHHMM} IST (data snapshot — not current state):
${tasksDueByNow.map(t =>
  `• [${t.category}] ${t.name} — ${t.statusLabel} | Window: ${t.scheduledTime}→${t.workingWindowEnd} IST | Why: ${t.whyMatters}`
).join('\n') || 'Koi task due nahi tha is time tak'}

Summary AT ${triggerHHMM}: ${doneCount}/${totalDue} done | In-progress (window still open): ${pendingNow} | Missed (window closed): ${missedNow} | Untracked: ${untrackedNow}
${effectiveScore !== null ? `Effective score on expired windows at ${triggerHHMM}: ${effectiveScore}%` : `Day had just started at ${triggerHHMM} — no windows expired yet`}

⚠️ CRITICAL INSTRUCTION: You are giving feedback as if it is ${triggerHHMM} IST RIGHT NOW. Do NOT reference anything that happened after ${triggerHHMM}. Tasks marked done after ${triggerHHMM} are shown with [NOTE] — acknowledge those separately at the end if present, as "ye kaam baad mein complete kiya — achha hai."

JUDGING RULES (same as always):
- ✅ DONE: acknowledge/celebrate
- ⏳ IN PROGRESS: window still open at ${triggerHHMM} — remind gently, do not condemn
- ❌ MISSED / ⚠️ UNTRACKED: judge accordingly
- Tasks with [NOTE: marked done AFTER ${triggerHHMM}]: at end of response, briefly acknowledge these positively`;

  const lastEgoResp = getLastEgoResponse();
  const lastRespNote = lastEgoResp
    ? `\n\nMERI LAST RESPONSE (pichli baar jo kaha tha):\n"${lastEgoResp.substring(0, 500)}"\n\nIs context ko use karo.`
    : '';

  const fullResponse = await callGeminiAPI(
    snapshotSystemPrompt,
    timeContext + '\n\n' + JSON.stringify(data) + lastRespNote,
    800
  );

  // Save to conversations
  if (!appData.conversations) appData.conversations = [];
  appData.conversations.unshift({
    id: 'conv_auto_' + Date.now(), type: 'auto',
    triggerTime, date: today, timestamp: Date.now(),
    scoreLabel: data.due_summary,
    dataSnapshot: data, response: fullResponse,
    personality: appData.settings.autoCoachPersonality || 'beast'
  });
  if (appData.conversations.length > 30) appData.conversations = appData.conversations.slice(0, 30);
  saveData();

  return fullResponse;
}

/**
 * Call Gemini API for Josh response at a specific trigger time.
 * Returns the full response string.
 */
async function runJoshResponseForTime(triggerTime, forDate) {
  if (!hasAnyApiKey()) throw new Error('API key missing! Settings mein set karo.');

  const today   = forDate || getTodayStr();
  const context = buildJoshContextForReminder(triggerTime);

  const systemPrompt = getJoshActivePrompt();
  const noTasksNote  = context.upcomingTasks.length === 0
    ? 'Koi upcoming task nahi is time slot mein. User ke life goals aur past performance dekh ke general motivation de.'
    : '';

  const taskLines = context.upcomingTasks.map(t =>
    `• [${t.category}] "${t.name}" | Priority: ${t.priority} | Window: ${t.workingWindow}\n  Why: "${t.whyMatters}"`
  ).join('\n') || 'None pending';

  const _jRISTNow = getNowISTHHMM();
  const _jRExpired = appData.tasks.filter(t => {
    if (t.active === false) return false;
    const winEnd = t.workingWindowEnd || '';
    return winEnd && winEnd < _jRISTNow;
  });
  const _jRDayNotStarted = _jRExpired.length === 0;
  const _jREffScore = _jRDayNotStarted ? null
    : Math.round((_jRExpired.filter(t => {
        const e = appData.history.find(h => h.taskId === t.id && h.date === today);
        return e && e.completed;
      }).length / _jRExpired.length) * 100);

  const userContent = `TERA-JOSH REMINDER — Time: ${triggerTime} IST
🕐 CURRENT IST TIME: ${_jRISTNow} IST (UTC+5:30) — use IST only, never UTC.

UPCOMING PENDING TASKS:
${taskLines}

TODAY'S SCORE SO FAR: ${_jRDayNotStarted
  ? `0% — BUT din abhi shuru hua hai, koi window expire nahi hui. 0% is NOT a failure here. Focus on upcoming tasks.`
  : `${_jREffScore}% on expired windows — ${context.daily.done}/${context.daily.taskCount} total done`}

⚠️ JUDGING RULES: Only judge tasks whose working window has already CLOSED. Tasks with open windows = still can be done, just remind/motivate.

LIFE GOALS: ${context.lifeGoals || 'Not set'}
NEGATIVE WORDS: ${context.negativeWords || 'Not set'}

${noTasksNote}

Format:
Line 1: Ek punchy motivational headline (max 90 chars, Hinglish)
Blank line
Full detailed reminder + motivation`;

  const lastJoshResp = getLastJoshResponse();
  const lastJoshNote = lastJoshResp
    ? `\n\nMERI LAST RESPONSE (jo maine pichli baar kahi thi):\n"${lastJoshResp.substring(0, 500)}"\n\nIs context ko use karo — kya user ne progress ki?`
    : '';

  const fullResponse = await callGeminiAPI(systemPrompt, userContent + lastJoshNote, 600);

  // Save to joshConversations
  if (!appData.joshConversations) appData.joshConversations = [];
  appData.joshConversations.unshift({
    id:         'jc_auto_' + Date.now(),
    type:       'auto_reminder',
    triggerTime,
    date:       today,
    timestamp:  Date.now(),
    scoreLabel: `💪 Tera-Josh Auto — ${context.totalUpcoming} tasks | ${formatTime12(triggerTime)}`,
    response:   fullResponse
  });
  if (appData.joshConversations.length > 30) appData.joshConversations = appData.joshConversations.slice(0, 30);
  saveData();

  return fullResponse;
}

/* ─────────────────────────────────────────────
   TELEGRAM DELIVERY
───────────────────────────────────────────── */

async function sendToTelegram(text) {
  const token  = (appData.settings.telegramBotToken || '').trim();
  const chatId = (appData.settings.telegramChatId   || '').trim();

  if (!token || !chatId) {
    throw new Error('Telegram bot token ya chat ID set nahi hai. Settings mein set karo.');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id:    chatId,
      text:       text,
      parse_mode: 'Markdown'
    })
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Telegram API error ${res.status}: ${errBody.substring(0, 100)}`);
  }
  return true;
}

/* ─────────────────────────────────────────────
   INBOX RENDER FUNCTIONS
───────────────────────────────────────────── */

function renderEgoInbox() {
  const container = document.getElementById('ego-inbox-list');
  if (!container) return;

  const inbox = (appData.egoInbox || []);
  if (inbox.length === 0) {
    container.innerHTML = `<div class="inbox-empty">
      <div class="inbox-empty-icon">📭</div>
      <div class="inbox-empty-text">Abhi koi missed response nahi hai.<br>Auto check times pe notifications aayenge.</div>
    </div>`;
    return;
  }

  container.innerHTML = inbox.map(entry => {
    const timeDisp = formatTime12(entry.triggerTime);
    const dateDisp = entry.date || '';

    let statusText, statusClass, actionBtn;

    if (entry.status === 'sent_to_telegram') {
      statusText  = '✅ Response Telegram pr bheja ja chuka hai';
      statusClass = 'inbox-status-sent';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreEgo('${entry.id}')">🔍 Phir Se Dekho</button>`;
    } else if (entry.status === 'read') {
      statusText  = '👁️ Response dekha ja chuka hai';
      statusClass = 'inbox-status-read';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreEgo('${entry.id}')">🔍 Phir Se Dekho</button>`;
    } else {
      statusText  = `Ego ne tumhari ${timeDisp} tak ki progress pr response diya tha, full response dekhne ke liye "Read More" pr click karo`;
      statusClass = 'inbox-status-pending';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreEgo('${entry.id}')">📖 Read More</button>`;
    }

    return `
      <div class="inbox-card ${statusClass}">
        <div class="inbox-card-header">
          <span class="inbox-time">🧠 ${timeDisp}</span>
          <span class="inbox-date">${dateDisp}</span>
        </div>
        <div class="inbox-card-text">${statusText}</div>
        <div class="inbox-card-actions">${actionBtn}</div>
      </div>`;
  }).join('');
}

function renderJoshInbox() {
  const container = document.getElementById('josh-inbox-list');
  if (!container) return;

  const inbox = (appData.joshInbox || []);
  if (inbox.length === 0) {
    container.innerHTML = `<div class="inbox-empty">
      <div class="inbox-empty-icon">📭</div>
      <div class="inbox-empty-text">Abhi koi missed response nahi hai.<br>Auto reminder times pe notifications aayenge.</div>
    </div>`;
    return;
  }

  container.innerHTML = inbox.map(entry => {
    const timeDisp = formatTime12(entry.triggerTime);
    const dateDisp = entry.date || '';

    let statusText, statusClass, actionBtn;

    if (entry.status === 'sent_to_telegram') {
      statusText  = '✅ Response Telegram pr bheja ja chuka hai';
      statusClass = 'inbox-status-sent';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreJosh('${entry.id}')">🔍 Phir Se Dekho</button>`;
    } else if (entry.status === 'read') {
      statusText  = '👁️ Response dekha ja chuka hai';
      statusClass = 'inbox-status-read';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreJosh('${entry.id}')">🔍 Phir Se Dekho</button>`;
    } else {
      statusText  = `Josh ne tumhare ${timeDisp} ke remaining tasks pr response diya tha, full response dekhne ke liye "Read More" pr click karo`;
      statusClass = 'inbox-status-pending';
      actionBtn   = `<button class="btn-inbox-readmore" onclick="handleReadMoreJosh('${entry.id}')">📖 Read More</button>`;
    }

    return `
      <div class="inbox-card ${statusClass}">
        <div class="inbox-card-header">
          <span class="inbox-time">💪 ${timeDisp}</span>
          <span class="inbox-date">${dateDisp}</span>
        </div>
        <div class="inbox-card-text">${statusText}</div>
        <div class="inbox-card-actions">${actionBtn}</div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────────────────────
   INBOX RESPONSE MODAL HELPERS
───────────────────────────────────────────── */

function showInboxLoadingModal(title, timeDisp) {
  let modal = document.getElementById('modal-inbox-response');
  if (!modal) return;
  document.getElementById('inbox-modal-title').textContent = title;
  document.getElementById('inbox-modal-time').textContent  = timeDisp;
  document.getElementById('inbox-modal-body').innerHTML    =
    `<div class="inbox-loading-line-wrap">
       <div class="inbox-loading-line"></div>
       <div style="margin-top:12px;color:var(--text-secondary);font-size:13px;">Response load ho raha hai...</div>
     </div>`;
  openModal('modal-inbox-response');
}

function closeInboxLoadingModal() {
  // Modal stays open — caller will update body with actual response
}

function showInboxResponseModal(title, response, timeDisp, date) {
  let modal = document.getElementById('modal-inbox-response');
  if (!modal) {
    // Fallback: show in toast if modal doesn't exist
    showToast(response.substring(0, 100) + '...');
    return;
  }
  document.getElementById('inbox-modal-title').textContent = title;
  document.getElementById('inbox-modal-time').textContent  = `${timeDisp} — ${date || ''}`;
  document.getElementById('inbox-modal-body').innerHTML    =
    `<div class="inbox-response-text">${escapeHtml(response)}</div>`;
  openModal('modal-inbox-response');
}

/* ─────────────────────────────────────────────
   TELEGRAM SETTINGS
───────────────────────────────────────────── */

function renderTelegramSettings() {
  const s = appData.settings;
  const tokenInp  = document.getElementById('telegram-bot-token');
  const chatInp   = document.getElementById('telegram-chat-id');
  if (tokenInp) tokenInp.value = s.telegramBotToken || '';
  if (chatInp)  chatInp.value  = s.telegramChatId   || '';
}

function saveTelegramToken(val) {
  appData.settings.telegramBotToken = (val || '').trim();
  saveData();
}

function saveTelegramChatId(val) {
  appData.settings.telegramChatId = (val || '').trim();
  saveData();
}

async function testTelegramConnection() {
  try {
    await sendToTelegram('🧪 *Aainik Test Message*\n\nTelegram connection sahi kaam kar raha hai! ✅\n\nEgo aur Josh responses ab directly yahan aayenge.');
    showToast('✅ Telegram test message sent!');
  } catch(e) {
    showToast('❌ Telegram test failed: ' + e.message);
  }
}
