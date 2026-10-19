# ASCII Rat - Tests

**Core functionality tests using Playwright**

## Quick Start

```bash
npm test              # Run all tests
npm run test:headed  # Run with visible browser
npm run test:ui      # Interactive UI mode
```

## Structure

```
test/
├── README.md      # This file
├── main.test.js   # Core functionality tests
└── playwright.config.js  # Configuration
```

## Tests

### Main Page (6 tests)
- Hint bar shows only help hint
- No duplicate hint elements
- Notification button at top
- Question mark key opens help
- Escape key closes help
- Help does not close on outside click

### Settings (7 tests)
- RAT COMPOSITION label in STYLE tab
- Share button in RAT tab
- Share button navigates to SHARE tab
- ABOUT tab contains Diagnostics
- SHARE tab does not contain Diagnostics
- Speaker icon visible in PERFORMANCE tab
- Volume slider visible in PERFORMANCE tab

### Maze Game (1 test)
- Time and score display correctly

**Total: 14 tests**
