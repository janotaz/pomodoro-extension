const workColorInput = document.getElementById("workColor");
const breakColorInput = document.getElementById("breakColor");
const blockedSitesInput = document.getElementById("blockedSites");
const saveButton = document.getElementById("saveButton");
const resetButton = document.getElementById("resetButton");
const statusEl = document.getElementById("status");

function loadOptions() {
  chrome.storage.local.get(
    ["workColor", "breakColor", "blockedSites"],
    (data) => {
      workColorInput.value = data.workColor ?? "#c0392b";
      breakColorInput.value = data.breakColor ?? "#27ae60";
      blockedSitesInput.value = (data.blockedSites || []).join("\n");
    }
  );
}

function saveOptions() {
  const workColor = workColorInput.value || "#c0392b";
  const breakColor = breakColorInput.value || "#27ae60";

  const blockedSites = blockedSitesInput.value
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  chrome.storage.local.set(
    { workColor, breakColor, blockedSites },
    () => {
      statusEl.textContent = "Saved ✔";
      setTimeout(() => (statusEl.textContent = ""), 1500);
    }
  );
}

function resetDefaults() {
  chrome.runtime.sendMessage({ type: "RESET_DEFAULTS" }, () => {
    loadOptions();
    statusEl.textContent = "Reset to defaults ✔";
    setTimeout(() => (statusEl.textContent = ""), 1500);
  });
}

document.addEventListener("DOMContentLoaded", loadOptions);
saveButton.addEventListener("click", saveOptions);
resetButton.addEventListener("click", resetDefaults);
