"use strict";

// ---------- Notification System (F05) ----------

const NOTIFICATION_CONTAINER_ID = "notificationContainer";
const NOTIFICATION_TYPES = {
  info: { bg: "var(--panel)", border: "var(--border)", text: "var(--fg)" },
  success: { bg: "#06120b", border: "#2f7a4b", text: "#8effa5" },
  warning: { bg: "#120b04", border: "#8a6428", text: "#ffc46e" },
  error: { bg: "#110303", border: "#963a3a", text: "#ff8f8f" },
};

let notificationQueue = [];
let activeNotifications = [];
let notificationIdCounter = 0;

// Create notification container
function createNotificationContainer() {
  const container = document.createElement("div");
  container.id = NOTIFICATION_CONTAINER_ID;
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    max-width: 300px;
  `;
  document.body.appendChild(container);
  return container;
}

// Get or create notification container
function getNotificationContainer() {
  let container = document.getElementById(NOTIFICATION_CONTAINER_ID);
  if (!container) {
    container = createNotificationContainer();
  }
  return container;
}

// Create ASCII-styled notification
function createNotification(message, type = "info", duration = 3000, dismissible = true) {
  const id = ++notificationIdCounter;
  const container = getNotificationContainer();
  
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.dataset.id = id;
  notification.dataset.type = type;
  
  const styles = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
  
  // Create ASCII border
  const lines = message.split("\n");
  const maxLineLength = Math.max(...lines.map(l => l.length));
  const padding = 2;
  const width = maxLineLength + padding * 2;
  
  // Build ASCII box
  let asciiContent = "";
  asciiContent += "╔" + "═".repeat(width) + "╗\n";
  for (const line of lines) {
    const paddedLine = line.padEnd(maxLineLength);
    asciiContent += "║ " + paddedLine + " ║\n";
  }
  asciiContent += "╚" + "═".repeat(width) + "╝";
  
  notification.innerHTML = `<pre style="margin:0; font-family:inherit; font-size:12px; line-height:1.2;">${asciiContent}</pre>`;
  
  // Apply styles
  notification.style.cssText = `
    background: ${styles.bg};
    border: 2px solid ${styles.border};
    color: ${styles.text};
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.65);
    transform: translateX(100%);
    opacity: 0;
    transition: transform 0.3s ease-out, opacity 0.3s ease-out;
    position: relative;
    pointer-events: auto;
    max-width: 300px;
    overflow: hidden;
  `;
  
  // Add dismiss button if dismissible
  if (dismissible) {
    const dismissBtn = document.createElement("button");
    dismissBtn.innerHTML = "×";
    dismissBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      background: none;
      border: none;
      color: ${styles.text};
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      pointer-events: auto;
    `;
    dismissBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissNotification(id);
    });
    notification.appendChild(dismissBtn);
    
    // Pause on hover
    notification.addEventListener("mouseenter", () => {
      if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
        notification.timeoutId = null;
      }
    });
    
    notification.addEventListener("mouseleave", () => {
      if (!notification.timeoutId && duration > 0) {
        notification.timeoutId = setTimeout(() => dismissNotification(id), duration);
      }
    });
  }
  
  // Add to container
  container.appendChild(notification);
  activeNotifications.push(id);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = "translateX(0)";
    notification.style.opacity = "1";
  });
  
  // Auto-dismiss
  if (duration > 0) {
    notification.timeoutId = setTimeout(() => dismissNotification(id), duration);
  }
  
  return id;
}

// Dismiss notification
function dismissNotification(id) {
  const container = getNotificationContainer();
  const notification = container.querySelector(`.notification[data-id="${id}"]`);
  
  if (notification) {
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }
    
    // Animate out
    notification.style.transform = "translateX(100%)";
    notification.style.opacity = "0";
    
    setTimeout(() => {
      notification.remove();
      activeNotifications = activeNotifications.filter(n => n !== id);
    }, 300);
  }
}

// Dismiss all notifications
function dismissAllNotifications() {
  activeNotifications.forEach(id => dismissNotification(id));
  activeNotifications = [];
}

// Show notification (public API)
function showNotification(message, type = "info", duration = 3000, dismissible = true) {
  recordNotification(message, type); // history (F05)
  notificationQueue.push({ message, type, duration, dismissible });
  processNotificationQueue();
}

// ---------- notification history panel (F05) ----------
const NOTIFICATION_HISTORY_KEY = "asciiRat.notifications.history";
const NOTIFICATION_HISTORY_MAX = 50;
let notificationHistory = [];

function loadNotificationHistory() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (raw) notificationHistory = JSON.parse(raw) || [];
  } catch (e) { notificationHistory = []; }
}
function recordNotification(message, type) {
  notificationHistory.unshift({ t: Date.now(), m: message, y: type || "info" });
  if (notificationHistory.length > NOTIFICATION_HISTORY_MAX) notificationHistory.length = NOTIFICATION_HISTORY_MAX;
  try { localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(notificationHistory)); } catch (e) {}
}
function createHistoryButton() {
  const btn = document.createElement("button");
  btn.id = "notifHistoryBtn";
  btn.type = "button";
  btn.title = "Notification history";
  btn.textContent = "[ N ]";
  // PR1-17: Move to top to be with notifications
  btn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1001;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.1em;
    background: var(--panel);
    color: var(--fg-dim);
    border: 1px solid var(--border);
    padding: 0.2em 0.45em;
    cursor: pointer;
  `;
  btn.addEventListener("click", toggleNotificationHistory);
  document.body.appendChild(btn);
  return btn;
}
function toggleNotificationHistory() {
  const existing = document.getElementById("notifHistoryPanel");
  if (existing) { existing.remove(); return; }
  const panel = document.createElement("div");
  panel.id = "notifHistoryPanel";
  // PR1-17: Position at top with notifications
  panel.style.cssText = `
    position: fixed;
    top: 52px;
    right: 20px;
    z-index: 1001;
    background: var(--panel);
    border: 2px solid var(--border);
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.65);
    padding: 0.6em 0.8em;
    width: min(340px, 92vw);
    max-height: 50vh;
    overflow-y: auto;
    font-size: 11px;
  `;
  const head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:1em;letter-spacing:0.15em;color:var(--fg-dim);margin-bottom:0.4em;";
  const title = document.createElement("span");
  title.textContent = "NOTIFICATION HISTORY";
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "[ CLEAR ]";
  clearBtn.style.cssText = "font-family:inherit;font-size:10px;letter-spacing:0.1em;background:var(--panel);color:var(--fg-mid);border:1px solid var(--border);padding:0.15em 0.4em;cursor:pointer;";
  clearBtn.addEventListener("click", () => {
    notificationHistory = [];
    try { localStorage.removeItem(NOTIFICATION_HISTORY_KEY); } catch (e) {}
    panel.remove();
  });
  head.append(title, clearBtn);
  panel.appendChild(head);
  if (notificationHistory.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "no notifications yet";
    empty.style.color = "var(--fg-dim)";
    panel.appendChild(empty);
  } else {
    notificationHistory.forEach((h) => {
      const line = document.createElement("div");
      const when = new Date(h.t);
      const hh = String(when.getHours()).padStart(2, "0");
      const mm = String(when.getMinutes()).padStart(2, "0");
      const styles = NOTIFICATION_TYPES[h.y] || NOTIFICATION_TYPES.info;
      line.style.cssText = "margin:0.25em 0;color:" + styles.text + ";";
      line.textContent = "[" + hh + ":" + mm + "] " + h.m.replace(/\n/g, " ");
      panel.appendChild(line);
    });
  }
  document.body.appendChild(panel);
  // close on any click outside the panel and button
  setTimeout(() => {
    document.addEventListener("pointerdown", function closer(e) {
      const p = document.getElementById("notifHistoryPanel");
      const b = document.getElementById("notifHistoryBtn");
      if (p && !p.contains(e.target) && e.target !== b) {
        p.remove();
        document.removeEventListener("pointerdown", closer);
      }
    });
  }, 0);
}

// Process notification queue
function processNotificationQueue() {
  if (notificationQueue.length === 0) return;
  if (activeNotifications.length >= 3) return; // Max 3 active notifications
  
  const next = notificationQueue.shift();
  createNotification(next.message, next.type, next.duration, next.dismissible);
  
  // Check if we can process more
  setTimeout(processNotificationQueue, 100);
}

// Initialize notification system
function initNotifications() {
  // Create container
  getNotificationContainer();

  // Load persisted history + add its toggle button
  loadNotificationHistory();
  createHistoryButton();

  // Add to window for global access
  window.showNotification = showNotification;
  window.dismissNotification = dismissNotification;
  window.dismissAllNotifications = dismissAllNotifications;
  window.toggleNotificationHistory = toggleNotificationHistory;
}

// Mobile-friendly positioning
function updateNotificationPosition() {
  const container = getNotificationContainer();
  if (!container) return;
  
  const isMobile = 'ontouchstart' in window || window.innerWidth < 768;
  
  if (isMobile) {
    container.style.top = "10px";
    container.style.left = "50%";
    container.style.right = "auto";
    container.style.transform = "translateX(-50%)";
    container.style.maxWidth = "90vw";
    container.style.alignItems = "center";
  } else {
    container.style.top = "20px";
    container.style.left = "auto";
    container.style.right = "20px";
    container.style.transform = "none";
    container.style.maxWidth = "300px";
    container.style.alignItems = "flex-end";
  }
}

// Listen for resize events
window.addEventListener("resize", updateNotificationPosition);

// Initialize on DOM ready
initNotifications();
updateNotificationPosition();
