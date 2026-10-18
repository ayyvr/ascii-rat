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
  notificationQueue.push({ message, type, duration, dismissible });
  processNotificationQueue();
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
  
  // Add to window for global access
  window.showNotification = showNotification;
  window.dismissNotification = dismissNotification;
  window.dismissAllNotifications = dismissAllNotifications;
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
