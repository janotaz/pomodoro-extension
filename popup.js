const modeLabel = document.getElementById("modeLabel");
const timeLabel = document.getElementById("timeLabel");
const workButton = document.getElementById("workButton");
const optionsLink = document.getElementById("optionsLink");

const taskInput = document.getElementById("taskInput");
const todaySummary = document.getElementById("todaySummary");
const todayLog = document.getElementById("todayLog");

const workDurationSelect = document.getElementById("workDurationSelect");
const breakDurationSelect = document.getElementById("breakDurationSelect");

let lastState = null;
let intervalId = null;

function formatTime(ms) {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0")
  );
}

function msToMinutes(ms) {
  return Math.round(ms / 60000);
}

function formatClock(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ensureOption(selectEl, value) {
  const valueStr = String(value);
  const exists = Array.from(selectEl.options).some(
    (opt) => opt.value === valueStr
  );
  if (!exists) {
    const opt = document.createElement("option");
    opt.value = valueStr;
    opt.textContent = `${valueStr} minutes`;
    selectEl.appendChild(opt);
  }
  selectEl.value = valueStr;
}

function updateWorkButtonLabel(state) {
  if (state.isRunning && state.mode === "work") {
    workButton.textContent = "Pause";
  } else {
    workButton.textContent = "Work";
  }
}

function updateUI(state) {
  lastState = state;

  const modeText = state.mode === "work" ? "Work" : "Break";
  modeLabel.textContent = `Mode: ${modeText}`;

  const label = formatTime(state.remainingMs || 0);
  timeLabel.textContent = label;

  updateWorkButtonLabel(state);

  if (typeof state.currentTask === "string") {
    if (document.activeElement !== taskInput) {
      taskInput.value = state.currentTask;
    }
  }
}

function loadDurations() {
  chrome.storage.local.get(["workDuration", "breakDuration"], (data) => {
    const workDuration = data.workDuration ?? 45;
    const breakDuration = data.breakDuration ?? 15;

    ensureOption(workDurationSelect, workDuration);
    ensureOption(breakDurationSelect, breakDuration);
  });
}

function loadLogs() {
  chrome.storage.local.get(["workLogs", "currentTask"], (data) => {
    const logs = data.workLogs || [];
    if (!document.activeElement || document.activeElement !== taskInput) {
      taskInput.value = data.currentTask || "";
    }
    renderLogs(logs);
  });
}

function renderLogs(logs) {
  todayLog.innerHTML = "";
  todaySummary.textContent = "";

  if (!logs.length) return;

  const today = new Date();
  const todayStr = today.toLocaleDateString();

  const todayEntries = logs.filter((entry) => {
    const d = new Date(entry.start);
    return d.toLocaleDateString() === todayStr;
  });

  if (!todayEntries.length) {
    todaySummary.textContent = "No work sessions logged yet today.";
    return;
  }

  let totalMs = 0;

  todayEntries.forEach((entry) => {
    const durationMs = entry.durationMs || Math.max(0, entry.end - entry.start);
    totalMs += durationMs;

    const li = document.createElement("li");
    li.textContent =
      `${formatClock(entry.start)}–${formatClock(entry.end)} ` +
      `(${msToMinutes(durationMs)} min): ${entry.task || "Unnamed task"}`;
    todayLog.appendChild(li);
  });

  const totalMinutes = msToMinutes(totalMs);
  // Only total minutes in the summary (tasks only in list)
  todaySummary.textContent = `Today: ${totalMinutes} min focused.`;
}

function requestState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (state) => {
    if (!state) return;
    updateUI(state);
    loadDurations();
    loadLogs();

    if (intervalId) {
      clearInterval(intervalId);
    }

    intervalId = setInterval(() => {
      if (!lastState) return;
      if (!lastState.isRunning || !lastState.sessionEnd) {
        updateUI(lastState);
        return;
      }
      lastState.remainingMs = Math.max(
        0,
        lastState.sessionEnd - Date.now()
      );
      updateUI(lastState);
    }, 1000);
  });
}

// ---------- Task handling ----------

function saveTask() {
  const value = taskInput.value.trim();
  chrome.runtime.sendMessage({ type: "SET_TASK", task: value }, () => {});
}

taskInput.addEventListener("change", saveTask);
taskInput.addEventListener("blur", saveTask);
taskInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    taskInput.blur();
  }
});

// ---------- Duration dropdowns ----------

workDurationSelect.addEventListener("change", () => {
  const workDuration = parseInt(workDurationSelect.value, 10) || 45;
  chrome.storage.local.set({ workDuration });
});

breakDurationSelect.addEventListener("change", () => {
  const breakDuration = parseInt(breakDurationSelect.value, 10) || 15;
  chrome.storage.local.set({ breakDuration });
});

// ---------- Work button control (start/pause) ----------

workButton.addEventListener("click", () => {
  if (!lastState) {
    chrome.runtime.sendMessage({ type: "SWITCH_MODE", mode: "work" }, (state) => {
      if (state) {
        updateUI(state);
        loadLogs();
      }
    });
    return;
  }

  if (!lastState.isRunning && lastState.mode !== "work") {
    chrome.runtime.sendMessage({ type: "SWITCH_MODE", mode: "work" }, (state) => {
      if (state) {
        updateUI(state);
        loadLogs();
      }
    });
  } else {
    chrome.runtime.sendMessage({ type: "TOGGLE_TIMER" }, (state) => {
      if (state) {
        updateUI(state);
        loadLogs();
      }
    });
  }
});

// ---------- Options link ----------

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.addEventListener("DOMContentLoaded", requestState);
