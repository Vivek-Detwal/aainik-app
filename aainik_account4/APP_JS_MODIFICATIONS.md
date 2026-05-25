/**
 * INTEGRATION POINTS FOR NOTIFICATION QUEUE
 * Add these modifications to aainik_account4/app.js
 * 
 * KEY CHANGES:
 * 1. Add queue processor call in initApp()
 * 2. Modify runAutoCoachReport() to queue responses
 * 3. Modify runJoshAutoReminder() to queue responses
 */

// ═══════════════════════════════════════════════════════════════
// 1. IN initApp() FUNCTION (around line 5718)
// ═══════════════════════════════════════════════════════════════

function initApp() {
  loadData();
  applyTheme(appData.settings.theme || 'dark');

  // ✅ PROCESS QUEUED NOTIFICATIONS FROM WHEN APP WAS CLOSED
  setTimeout(() => {
    if (notificationQueue) {
      notificationQueue.processQueuedNotifications();
    }
  }, 500);

  // ... rest of existing initApp() code continues unchanged ...
  initLocalNotifications();
  renderTodayScreen();
  scheduleAllNotifications();
  initAppListeners();
}

// ═══════════════════════════════════════════════════════════════
// 2. MODIFY runAutoCoachReport() FUNCTION (around line 3743)
// ═══════════════════════════════════════════════════════════════

async function runAutoCoachReport(triggerTime) {
  const today = getTodayStr();
  const settings = appData.settings;

  if (!settings.coachApiKey) {
    console.warn('⚠️ No Gemini API key configured');
    return;
  }

  // ... existing data gathering code ...
  const data = {
    today,
    score: getTodayScore(),
    due_summary: `${completed}/${total} tasks`,
    completedTasks: todayTasks.filter(t => t.done),
    dueTasks: todayTasks.filter(t => !t.done)
  };

  try {
    const systemPrompt = buildCoachSystemPrompt('auto');
    const timeContext = `📅 ${today} — ${triggerTime}`;
    
    const fullResponse = await callGeminiAPI(
      systemPrompt,
      timeContext + '\n\n' + JSON.stringify(data),
      800
    );

    const lines = fullResponse.trim().split('\n').filter(l => l.trim());
    const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Tera-Ego ka check — dekho!';
    const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

    // ✅ KEY LOGIC: QUEUE IF APP NOT ACTIVE, FIRE IF ACTIVE
    if (currentScreen !== 'today' && currentScreen !== 'coach' && currentScreen !== 'progress') {
      // App is likely to close — queue it
      notificationQueue.addToQueue({
        title: '🧠 ' + headline,
        body: notifBody,
        type: 'ego',
        data: { convType: 'auto', screen: 'coach', triggerTime }
      });
      console.log('📦 Auto-coach response queued (app may close)');
    } else {
      // App is open — fire notification directly
      const capFiredEgo = await fireCapacitorNativeNotif(
        '🧠 ' + headline,
        notifBody,
        'aainik-ego',
        'auto'
      );
      if (!capFiredEgo) {
        fireAiNotification(headline, notifBody, 'auto-coach-' + triggerTime, 'auto');
      }
      console.log('✅ Auto-coach response fired immediately (app open)');
    }

    // Save to conversation history (ALWAYS — regardless of notification method)
    if (!appData.conversations) appData.conversations = [];
    appData.conversations.unshift({
      id: 'conv_auto_' + Date.now(),
      type: 'auto',
      triggerTime,
      date: today,
      timestamp: Date.now(),
      scoreLabel: data.due_summary,
      response: fullResponse,
      headline,
      personality: appData.settings.autoCoachPersonality || 'beast'
    });
    if (appData.conversations.length > 30) {
      appData.conversations = appData.conversations.slice(0, 30);
    }
    saveData();

    if (currentScreen === 'coach') renderCoachScreen();
    showToast(`🤖 Auto-coach: ${headline.substring(0, 50)}...`);

  } catch (err) {
    console.warn('Auto-coach failed:', err.message);
    
    // Queue error notification too
    notificationQueue.addToQueue({
      title: '⚠️ Auto-Coach Error',
      body: err.message,
      type: 'ego',
      data: { type: 'error' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. MODIFY runJoshAutoReminder() FUNCTION (around line 2466)
// ═══════════════════════════════════════════════════════════════

async function runJoshAutoReminder(triggerTime) {
  const today = getTodayStr();
  const settings = appData.settings;

  if (!settings.coachApiKey) {
    console.warn('⚠️ No Gemini API key for Josh');
    return;
  }

  // ... existing context building code ...
  const context = buildJoshContextForReminder(triggerTime);
  
  try {
    const systemPrompt = buildJoshSystemPrompt('auto_reminder');
    const userContent = `${context}\n\nMotivate user for upcoming tasks and performance!`;

    const fullResponse = await callGeminiAPI(
      systemPrompt,
      userContent,
      600
    );

    const lines = fullResponse.trim().split('\n').filter(l => l.trim());
    const headline = lines[0].replace(/[*_#]/g, '').substring(0, 90) || 'Tera-Josh: Aaj ke tasks! 💪';
    const notifBody = lines.slice(1).join('\n').trim() || fullResponse.trim();

    // ✅ KEY LOGIC: QUEUE IF APP NOT ACTIVE, FIRE IF ACTIVE
    if (currentScreen !== 'today' && currentScreen !== 'coach' && currentScreen !== 'progress') {
      // App is likely to close — queue it
      notificationQueue.addToQueue({
        title: '💪 ' + headline,
        body: notifBody,
        type: 'josh',
        data: { convType: 'auto_reminder', screen: 'coach', triggerTime }
      });
      console.log('📦 Josh response queued (app may close)');
    } else {
      // App is open — fire notification directly
      const capFiredJosh = await fireCapacitorNativeNotif(
        '💪 ' + headline,
        notifBody,
        'aainik-josh',
        'josh_auto'
      );
      if (!capFiredJosh) {
        fireAiNotification(headline, notifBody, 'josh-auto-' + triggerTime, 'josh_auto');
      }
      console.log('✅ Josh response fired immediately (app open)');
    }

    // Save to conversations (ALWAYS)
    if (!appData.joshConversations) appData.joshConversations = [];
    appData.joshConversations.unshift({
      id: 'jc_auto_' + Date.now(),
      type: 'auto_reminder',
      triggerTime,
      date: today,
      timestamp: Date.now(),
      scoreLabel: `💪 Tera-Josh Auto — ${context.totalUpcoming || 0} tasks`,
      response: fullResponse,
      headline
    });
    if (appData.joshConversations.length > 30) {
      appData.joshConversations = appData.joshConversations.slice(0, 30);
    }
    saveData();

    if (currentScreen === 'coach') renderJoshMessages();
    showToast(`💪 Josh: ${headline.substring(0, 50)}...`);

  } catch (err) {
    console.warn('Josh auto-reminder failed:', err.message);
    
    // Queue error notification
    notificationQueue.addToQueue({
      title: '⚠️ Josh Error',
      body: err.message,
      type: 'josh',
      data: { type: 'error' }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build Josh context for reminders
// ═══════════════════════════════════════════════════════════════

function buildJoshContextForReminder(triggerTime) {
  const today = getTodayStr();
  const todayTasks = getTodayTasks();
  const upcomingTasks = todayTasks.filter(t => !t.done);
  
  return {
    today,
    triggerTime,
    totalTasks: todayTasks.length,
    completedTasks: todayTasks.filter(t => t.done).length,
    upcomingTasks: upcomingTasks.map(t => ({
      name: t.name,
      timeWindow: t.timeWindow,
      priority: t.priority,
      category: t.category
    })),
    totalUpcoming: upcomingTasks.length,
    recentScore: getTodayScore()
  };
}

// ═══════════════════════════════════════════════════════════════
// END OF MODIFICATIONS
// All other functions remain unchanged
// ═══════════════════════════════════════════════════════════════
