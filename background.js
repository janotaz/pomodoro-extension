// --- Defaults (colors unchanged) ---
const DEFAULT_SETTINGS = {
  workDuration: 45,      // minutes
  breakDuration: 15,     // minutes
  workColor: "#c0392b",  // badge background for work
  breakColor: "#27ae60", // badge background for break
  blockedSites: [],
  isRunning: false,
  mode: "work",          // "work" or "break"
  sessionEnd: null,      // timestamp (ms)
  currentTask: "",
  currentWorkStart: null // timestamp (ms) of current work session
};

let state = { ...DEFAULT_SETTINGS };

const ALARM_END = "pomodoroEnd";
const ALARM_TICK = "pomodoroTick";

// ---------- Helpers ----------

function refreshState(callback) {
  chrome.storage.local.get(null, (data) => {
    state = { ...DEFAULT_SETTINGS, ...data };
    if (callback) callback();
  });
}

function saveState(keys) {
  const toSave = {};
  keys.forEach((k) => {
    toSave[k] = state[k];
  });
  chrome.storage.local.set(toSave);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showNotification(title, message) {
  if (!chrome.notifications) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    priority: 1
  });
}

function showLongNotification(title, message) {
  if (!chrome.notifications) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    priority: 2,
    requireInteraction: true // stays until user dismisses (=> >= 5s)
  });
}


function msToMinutes(ms) {
  return Math.round(ms / 60000);
}

// Play a sound in the active tab using scripting API
function playSound() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) return;
    const tabId = tabs[0].id;

    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          const audio = new Audio(chrome.runtime.getURL("sounds/finished.mp3"));
          audio.volume = 1.0;
          audio.play().catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    });
  });
}

// Show an in-page popup (JS alert) in the active tab
function showPopupMessage(message) {
  try {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (!tabs || !tabs.length) return;
      const tabId = tabs[0].id;

      chrome.scripting.executeScript({
        target: { tabId },
        func: (msg) => {
          try {
            alert(msg);
          } catch (e) {
            // ignore if alerts are blocked
          }
        },
        args: [message]
      });
    });
  } catch (e) {
    // ignore
  }
}

function updateBadge() {
  if (!state.isRunning || !state.sessionEnd) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const remainingMs = state.sessionEnd - Date.now();
  if (remainingMs <= 0) {
    chrome.action.setBadgeText({ text: "0" });
    return;
  }

  const remainingMinutes = Math.ceil(remainingMs / 60000);
  chrome.action.setBadgeText({ text: String(remainingMinutes) });

  const color = state.mode === "work" ? state.workColor : state.breakColor;
  chrome.action.setBadgeBackgroundColor({ color });
}

function scheduleAlarms() {
  chrome.alarms.clear(ALARM_END);
  chrome.alarms.clear(ALARM_TICK);

  if (!state.isRunning || !state.sessionEnd) {
    updateBadge();
    return;
  }

  const delayMs = state.sessionEnd - Date.now();
  if (delayMs <= 0) {
    chrome.alarms.create(ALARM_END, { when: Date.now() + 1000 });
  } else {
    chrome.alarms.create(ALARM_END, { when: Date.now() + delayMs });
  }

  // Minute tick for badge
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
}

function startSession(mode, options = {}) {
  const { silent = false } = options;

  state.mode = mode === "break" ? "break" : "work";
  state.isRunning = true;

  const durationMinutes =
    state.mode === "work" ? state.workDuration : state.breakDuration;

  const safeDuration = durationMinutes > 0 ? durationMinutes : 1;
  const now = Date.now();

  state.sessionEnd = now + safeDuration * 60 * 1000;

  if (state.mode === "work") {
    state.currentWorkStart = now;
  } else {
    state.currentWorkStart = null;
  }

  saveState([
    "mode",
    "isRunning",
    "sessionEnd",
    "workDuration",
    "breakDuration",
    "currentWorkStart"
  ]);
  scheduleAlarms();
  updateBadge();

  if (!silent) {
    showNotification(
      `${capitalize(state.mode)} session started`,
      `Next ${safeDuration} minutes.`
    );
  }
}


function stopTimer() {
  state.isRunning = false;
  state.sessionEnd = null;
  state.currentWorkStart = null;
  saveState(["isRunning", "sessionEnd", "currentWorkStart"]);
  chrome.alarms.clear(ALARM_END);
  chrome.alarms.clear(ALARM_TICK);
  updateBadge();
}

// Log a finished WORK session
function logFinishedWorkSession(callback) {
  const end = Date.now();

  // Try to derive start time
  let start = state.currentWorkStart;
  if (!start && state.sessionEnd && state.workDuration) {
    start = state.sessionEnd - state.workDuration * 60 * 1000;
  }
  if (!start) start = end; // fallback: zero duration

  const entry = {
    task: state.currentTask && state.currentTask.trim()
      ? state.currentTask.trim()
      : "Unnamed task",
    start,
    end,
    durationMs: Math.max(0, end - start)
  };

  chrome.storage.local.get({ workLogs: [] }, (data) => {
    const workLogs = data.workLogs || [];
    workLogs.push(entry);
    chrome.storage.local.set({ workLogs }, () => {
      if (callback) callback();
    });
  });
}

function handleSessionEnd() {
  if (!state.isRunning || !state.sessionEnd) {
    stopTimer();
    return;
  }

  const now = Date.now();
  if (now < state.sessionEnd - 1000) {
    // Not yet; reschedule to be safe
    scheduleAlarms();
    return;
  }

  const finishedMode = state.mode;

  if (finishedMode === "work") {
    // Compute actual worked time
    let start = state.currentWorkStart;
    if (!start && state.sessionEnd && state.workDuration) {
      start = state.sessionEnd - state.workDuration * 60 * 1000;
    }
    if (!start) start = now;

    const workedMinutes = msToMinutes(Math.max(0, now - start));
    const breakMinutes =
      state.breakDuration && state.breakDuration > 0
        ? state.breakDuration
        : 1;

    const message = `You've worked for ${workedMinutes} minutes. Time for a ${breakMinutes} min break!`;

    // ONE combined notification + popup + sound
    showLongNotification("Work session finished", message);
    showPopupMessage(message);
    playSound();

    // Log the work session, then start ONE break silently
    logFinishedWorkSession(() => {
      state.currentWorkStart = null;
      saveState(["currentWorkStart"]);
      startSession("break", { silent: true }); // no extra "break started" notification
    });
  } else {
    // Break finished: single notification + popup + sound, then stop
    const message = "Your break is over. Ready to work again.";

    showLongNotification("Break session finished", message);
    showPopupMessage(message);
    playSound();

    stopTimer();
  }
}


// Simple URL matcher for blocking
function isBlockedUrl(url) {
  try {
    const u = new URL(url);
    const hostname = u.hostname;

    if (!Array.isArray(state.blockedSites)) return false;

    return state.blockedSites.some((pattern) => {
      if (!pattern) return false;
      pattern = pattern.trim();
      if (!pattern) return false;

      if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
        return url.startsWith(pattern);
      }

      return (
        hostname === pattern ||
        hostname.endsWith("." + pattern.replace(/^\./, ""))
      );
    });
  } catch (e) {
    return false;
  }
}

// ---------- Init on service worker load ----------

refreshState(() => {
  updateBadge();
  if (state.isRunning && state.sessionEnd) {
    scheduleAlarms();
  }
});

// ---------- Listeners ----------

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const [key, { newValue }] of Object.entries(changes)) {
    state[key] = newValue;
  }
  updateBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_END && alarm.name !== ALARM_TICK) return;

  refreshState(() => {
    if (alarm.name === ALARM_END) {
      handleSessionEnd();
    } else if (alarm.name === ALARM_TICK) {
      if (!state.isRunning || !state.sessionEnd) {
        chrome.alarms.clear(ALARM_TICK);
        updateBadge();
        return;
      }

      if (Date.now() >= state.sessionEnd) {
        handleSessionEnd();
      } else {
        updateBadge();
      }
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  refreshState(() => {
    if (msg.type === "GET_STATE") {
      const remainingMs =
        state.isRunning && state.sessionEnd
          ? Math.max(0, state.sessionEnd - Date.now())
          : 0;
      sendResponse({ ...state, remainingMs });
      return;
    }

    if (msg.type === "TOGGLE_TIMER") {
      if (state.isRunning) {
        stopTimer();
      } else {
        startSession(state.mode || "work");
      }
      const remainingMs =
        state.isRunning && state.sessionEnd
          ? Math.max(0, state.sessionEnd - Date.now())
          : 0;
      sendResponse({ ...state, remainingMs });
      return;
    }

    if (msg.type === "SWITCH_MODE") {
      startSession(msg.mode === "break" ? "break" : "work");
      const remainingMs =
        state.isRunning && state.sessionEnd
          ? Math.max(0, state.sessionEnd - Date.now())
          : 0;
      sendResponse({ ...state, remainingMs });
      return;
    }

    if (msg.type === "SET_TASK") {
      state.currentTask = msg.task || "";
      saveState(["currentTask"]);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "RESET_DEFAULTS") {
      state = { ...DEFAULT_SETTINGS };
      chrome.storage.local.set(DEFAULT_SETTINGS, () => {
        stopTimer();
        sendResponse({ ...state, remainingMs: 0 });
      });
      return;
    }
  });

  return true; // async response
});

// Blocking during work sessions
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!state.isRunning || state.mode !== "work") return {};
    if (!isBlockedUrl(details.url)) return {};

    showNotification("Blocked during focus session", details.url);
    return { cancel: true };
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);
