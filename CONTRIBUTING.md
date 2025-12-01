# Contributing to Local Pomodoro Focus Timer

First off, thank you for considering contributing to this project! 

## Code of Conduct

This project follows a simple code of conduct: Be respectful, constructive, and considerate of others.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, error messages, etc.)
- **Describe the behavior you observed** and what you expected to see
- **Include your environment details:**
  - Chrome version (`chrome://version`)
  - Operating System
  - Extension version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most users
- **List any alternatives** you've considered

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following the coding standards below
3. **Test your changes** thoroughly in Chrome
4. **Update documentation** if needed (README, code comments, etc.)
5. **Commit with clear messages** describing what and why
6. **Push to your fork** and submit a pull request

#### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Write clear, concise commit messages
- Update the CHANGELOG.md with your changes
- Ensure no console errors or warnings
- Test in Chrome with Developer mode enabled

## Development Setup

### Prerequisites

- Google Chrome (version 88+)
- A text editor (VS Code, Sublime, etc.)
- Git

### Local Development

```bash
# Fork and clone the repository
git clone https://github.com/janotaz/pomodoro-extension.git
cd pomodoro-extension

# Create a feature branch
git checkout -b feature/my-new-feature

# Make your changes...

# Load the extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the project directory
```

### Testing Your Changes

After making changes:

1. **Reload the extension** in `chrome://extensions/`
2. **Test all affected features** thoroughly
3. **Check for console errors** (F12 Developer Tools)
4. **Test edge cases** (empty values, maximum values, etc.)
5. **Verify no regressions** in existing features

### Project Structure

```
pomodoro-extension/
├── manifest.json      # Extension configuration (Manifest V3)
├── background.js      # Service worker (timer logic, blocking, state)
├── popup.html         # Main popup UI
├── popup.js           # Popup logic and event handlers
├── options.html       # Settings page
├── options.js         # Settings logic
├── icons/             # Extension icons (16, 48, 128px)
└── sounds/            # Notification sounds
```

## Coding Standards

### JavaScript Style

- Use **modern JavaScript** (ES6+)
- Use **const** and **let** (avoid var)
- Prefer **async/await** over callbacks when possible
- Use **meaningful variable names** (descriptive, not abbreviated)
- Add **comments** for complex logic
- Keep functions **small and focused** (single responsibility)

### Code Example

```javascript
// Good
async function saveUserSettings(settings) {
  try {
    await chrome.storage.local.set(settings);
    showStatusMessage("Settings saved successfully");
  } catch (error) {
    console.error("Failed to save settings:", error);
    showErrorMessage("Could not save settings");
  }
}

// Avoid
function save(s) {
  chrome.storage.local.set(s, () => {
    // nested callback...
  });
}
```

### HTML/CSS Style

- Use **semantic HTML5** elements
- Keep inline styles minimal (prefer external CSS)
- Use **consistent indentation** (2 spaces)
- Make UI **accessible** (ARIA labels, keyboard navigation)

### Chrome Extension Best Practices

- Minimize **permissions** requested
- Handle **chrome API errors** gracefully
- Use **chrome.storage** efficiently (batch updates)
- Follow **Manifest V3** standards
- Test with **service worker lifecycle** in mind

## Chrome Extension Specifics

### Manifest V3 Migration

This extension uses Manifest V3. When contributing:

- Use **service workers** instead of background pages
- Use **chrome.alarms** for scheduled tasks
- Prefer **declarativeNetRequest** over webRequest (future improvement)
- Use **chrome.scripting** for content scripts

### Common Gotchas

1. **Service workers can be terminated** - Always persist state to chrome.storage
2. **Message passing is async** - Use sendResponse or return Promise
3. **Content scripts have limited access** - Use chrome.runtime.sendMessage
4. **Alarms have minimum intervals** - 1 minute for periodic alarms

## Documentation

When adding new features:

- Update **README.md** with usage instructions
- Add **code comments** explaining complex logic
- Update **CHANGELOG.md** with your changes
- Add **JSDoc comments** for functions where helpful

Example JSDoc:

```javascript
/**
 * Starts a new Pomodoro session
 * @param {string} mode - Either "work" or "break"
 * @param {Object} options - Optional configuration
 * @param {boolean} options.silent - Skip notification if true
 */
function startSession(mode, options = {}) {
  // implementation...
}
```

## Commit Message Guidelines

Use clear, descriptive commit messages:

- **feat:** New feature (e.g., "feat: add dark mode toggle")
- **fix:** Bug fix (e.g., "fix: timer not updating in popup")
- **docs:** Documentation only (e.g., "docs: update installation steps")
- **style:** Code style changes (e.g., "style: format with prettier")
- **refactor:** Code refactoring (e.g., "refactor: convert callbacks to async/await")
- **test:** Adding tests (e.g., "test: add unit tests for time formatting")
- **chore:** Maintenance tasks (e.g., "chore: update dependencies")

Examples:
```
feat: add keyboard shortcuts for start/pause
fix: prevent duplicate notifications on session end
docs: add troubleshooting section to README
refactor: migrate to declarativeNetRequest API
```

## Feature Requests & Roadmap

Check the [README Roadmap](README.md#roadmap) for planned features. If you want to work on a roadmap item:

1. Open an issue to discuss your approach
2. Wait for maintainer feedback
3. Submit your PR when ready

## Questions?

Feel free to open an issue with the `question` label if you need help or clarification.

## Attribution

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing!
