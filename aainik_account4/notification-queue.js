/**
 * NOTIFICATION QUEUE SYSTEM
 * Handles queued notifications when app is killed
 * Shows them one-by-one with 1 min gap when app resumes
 */

class NotificationQueue {
  constructor() {
    this.QUEUE_KEY = 'aainik_notification_queue';
    this.QUEUE_TIMESTAMP_KEY = 'aainik_queue_last_shown';
    this.QUEUE_INTERVAL = 60000; // 1 minute in milliseconds
    this.queueDisplayInterval = null;
  }

  /**
   * Add notification to queue (called when app is killed/closed)
   */
  addToQueue(notification) {
    try {
      const queue = this.getQueue();
      queue.push({
        ...notification,
        queuedAt: Date.now(),
        shown: false
      });
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      console.log('📦 Added to queue:', notification.title);
    } catch (e) {
      console.error('Error adding to queue:', e);
    }
  }

  /**
   * Get current queue
   */
  getQueue() {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error('Error reading queue:', e);
      return [];
    }
  }

  /**
   * Process queued notifications when app opens
   * Shows them one by one with 1 minute gap
   */
  async processQueuedNotifications() {
    const queue = this.getQueue();
    
    if (queue.length === 0) {
      console.log('📭 No queued notifications');
      return;
    }

    console.log(`📬 Processing ${queue.length} queued notifications`);

    // Clear any existing interval
    if (this.queueDisplayInterval) {
      clearInterval(this.queueDisplayInterval);
    }

    let index = 0;

    // Show first notification immediately
    if (queue[index]) {
      await this.displayQueuedNotification(queue[index], index + 1, queue.length);
      index++;
    }

    // Show remaining notifications with 1 min gap
    if (index < queue.length) {
      this.queueDisplayInterval = setInterval(async () => {
        if (index < queue.length) {
          await this.displayQueuedNotification(queue[index], index + 1, queue.length);
          index++;
        } else {
          clearInterval(this.queueDisplayInterval);
          this.clearQueue();
        }
      }, this.QUEUE_INTERVAL);
    }
  }

  /**
   * Display individual queued notification
   */
  async displayQueuedNotification(notification, current, total) {
    try {
      const { title, body, type, data } = notification;

      // Show in-app toast
      this.showNotificationToast(title, body, type, current, total);

      // Send native notification if supported
      if (window._isCapacitorApp) {
        await this.sendNativeNotification(title, body, data);
      }

      console.log(`✅ Shown queued notification ${current}/${total}`);
    } catch (e) {
      console.error('Error displaying queued notification:', e);
    }
  }

  /**
   * Show in-app toast notification
   */
  showNotificationToast(title, body, type, current, total) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 12px;
      right: 12px;
      background: var(--card-bg);
      border: 2px solid var(--primary-color);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    `;

    const emoji = type === 'ego' ? '🧠' : type === 'josh' ? '💪' : '🔔';
    
    toast.innerHTML = `
      <div style="display: flex; gap: 12px;">
        <div style="font-size: 24px; flex-shrink: 0;">${emoji}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">${title}</div>
          <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.4;">${body}</div>
          <div style="color: var(--text-tertiary); font-size: 12px; margin-top: 8px;">📬 Queued: ${current}/${total}</div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 6 seconds
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 6000);
  }

  /**
   * Clear all queued notifications
   */
  clearQueue() {
    try {
      localStorage.removeItem(this.QUEUE_KEY);
      localStorage.removeItem(this.QUEUE_TIMESTAMP_KEY);
      console.log('✅ Queue cleared');
    } catch (e) {
      console.error('Error clearing queue:', e);
    }
  }

  /**
   * Send native notification (Capacitor)
   */
  async sendNativeNotification(title, body, data) {
    try {
      if (window._isCapacitorApp && window.Capacitor.Plugins.LocalNotifications) {
        const { LocalNotifications } = window.Capacitor.Plugins;
        await LocalNotifications.schedule({
          notifications: [{
            title,
            body,
            id: Date.now(),
            extra: data
          }]
        });
      }
    } catch (e) {
      console.error('Native notif error:', e);
    }
  }
}

// Global instance
const notificationQueue = new NotificationQueue();
