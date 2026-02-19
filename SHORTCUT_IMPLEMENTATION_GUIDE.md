# WME SDK Keyboard Shortcuts - Implementation Guidelines

## Overview

This guide documents how to implement **user-customizable keyboard shortcuts** in WME Tampermonkey scripts using the WME SDK.

**Canonical reference:** [`WME-Shortcut-Demo.user.js`](WME-Shortcut-Demo.user.js) — a fully working script demonstrating all 4 patterns below. Use it as a copy-paste library.

---

## Pattern Summary

| Pattern | Demo | Default Key | Persistence |
|---------|------|-------------|-------------|
| Manual Save | Action 1 | None (user assigns) | User must call `window.saveDemoShortcut1()` |
| Hardcoded Default + Auto-Save | Action 2 | Alt+2 | Saves automatically every 2 seconds |
| Hardcoded Default + Override | Action 3 | Alt+9 | User must call `window.saveDemoShortcut3()` to override |
| Auto-Save | Action 4 | None (user assigns) | Saves automatically every 2 seconds |

---

## Part 1: Core Components

### 1.1 Script Initialization (from `WME-Shortcut-Demo.user.js`)

All shortcuts must be initialized after WME is fully ready. The demo script uses this bootstrap pattern:

```javascript
let wmeSDK = null;

// Initialize via SDK_INITIALIZED promise
unsafeWindow.SDK_INITIALIZED.then(initScript);

  function initScript() {
    console.log('[DEMO] Initializing WME SDK...');
    wmeSDK = getWmeSdk({
      scriptId: 'wme-shortcut-demo',
      scriptName: 'Shortcut Demo',
    });
    initializeShortcuts();
  }
```

---

### 1.2 Numeric Format Converter (from `WME-Shortcut-Demo.user.js`)

WME stores shortcut keys internally as numeric format (`"4,56"` = Alt+8) but `createShortcut()` requires string format (`"A+8"`). This converter bridges the gap:

```javascript
const convertNumericShortcutToString = (numericFormat) => {
  if (!numericFormat || typeof numericFormat !== 'string') return null;
  
  const parts = numericFormat.split(',');
  if (parts.length !== 2) return null;
  
  const modifierBitmask = parseInt(parts[0], 10);
  const keyCode = parseInt(parts[1], 10);
  
  if (isNaN(modifierBitmask) || isNaN(keyCode)) return null;
  
  // Build modifier string in order: A, C, S
  let modifiers = '';
  if (modifierBitmask & 4) modifiers += 'A'; // Alt
  if (modifierBitmask & 1) modifiers += 'C'; // Ctrl
  if (modifierBitmask & 2) modifiers += 'S'; // Shift
  
  // Convert keyCode to character/representation
  let keyRepresentation;
  if (keyCode >= 48 && keyCode <= 57) {
    keyRepresentation = String.fromCharCode(keyCode);       // Numbers 0-9
  } else if (keyCode >= 65 && keyCode <= 90) {
    keyRepresentation = String.fromCharCode(keyCode).toLowerCase(); // Letters A-Z
  } else {
    keyRepresentation = String(keyCode);                    // Special keys
  }
  
  return modifiers ? modifiers + '+' + keyRepresentation : keyRepresentation;
};
```

**Modifier Bitmask Reference:**
```
1 = C         3 = CS            5 = AC           7 = ACS
2 = S         4 = A             6 = AS

Bit Positions:
  1 = Ctrl (C)
  2 = Shift (S)
  4 = Alt (A)
```

**Conversion Examples:**
```
"4,56"  → "A+8"   = Alt+8
"3,49"  → "CS+1"  = Ctrl+Shift+1
"5,78"  → "AC+n"  = Ctrl+Alt+N (Alt+Ctrl+N)
"2,81"  → "S+q"   = Shift+Q
```

**Key Codes Reference:**
- `48–57`: Numbers 0–9
- `65–90`: Letters A–Z
- `32`: Space
- Other special keys: use the keyCode number directly

---

## Part 2: The 5-Step Pattern

Every shortcut in `WME-Shortcut-Demo.user.js` follows this exact sequence:

```
Step 1: Load saved config from localStorage
Step 2: Delete old shortcut (CRITICAL - required before recreating)
Step 3: Convert saved numeric format → string format
Step 4: Create shortcut with converted keys (or null / hardcoded default)
Step 5: Register save/reset functions on unsafeWindow
```

**Why delete before create?**
- WME SDK requires the old shortcut to be removed before a new one with the same ID is created
- Skipping delete causes silent failures
- Wrap in try-catch — on first load the shortcut doesn't exist yet (that's expected)

---

## Part 3: Pattern A — Manual Save (Demo Action 1)

**Use when:** User assigns their own keys; must explicitly save via console

```javascript
const initializeShortcut1 = () => {
  const shortcutId = 'WMEShortcutDemo_Action1';
  const storageKey = 'WMEShortcutDemo_Action1_Config';

  // Step 1: Load saved config
  let savedConfig = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) savedConfig = JSON.parse(saved);
  } catch (e) {
    console.error(`[SHORTCUT1] Error reading saved config: ${e}`);
  }

  // Step 2: Delete old shortcut (only if we have saved keys to restore)
  if (savedConfig?.shortcutKeys) {
    try {
      wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
    } catch (e) {
      // Expected on first load
    }
  }

  // Step 3: Convert numeric → string
  let shortcutKeysToUse = null;
  if (savedConfig?.shortcutKeys) {
    shortcutKeysToUse = convertNumericShortcutToString(savedConfig.shortcutKeys) || null;
  }

  // Step 4: Create shortcut (null = user assigns via WME UI)
  wmeSDK.Shortcuts.createShortcut({
    shortcutId,
    name: 'Demo Action 1',
    description: 'USER CUSTOMIZABLE - Assign keys, then run: window.saveDemoShortcut1() in console',
    shortcutKeys: shortcutKeysToUse,
    callback: () => {
      console.log('[SHORTCUT1] Callback triggered!');
      // Your action code here
    }
  });

  // Step 5: Register save/reset on unsafeWindow (accessible from browser console as window.xxx)
  unsafeWindow.saveDemoShortcut1 = function() {
    const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
    const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
    if (!shortcut) return;
    localStorage.setItem(storageKey, JSON.stringify({
      shortcutId: shortcut.shortcutId,
      name: shortcut.name,
      description: shortcut.description,
      shortcutKeys: shortcut.shortcutKeys,
    }));
    console.log(`[SHORTCUT1 SAVE] Saved: ${shortcut.shortcutKeys}`);
  };

  unsafeWindow.resetDemoShortcut1 = function() {
    localStorage.removeItem(storageKey);
    console.log('[SHORTCUT1 RESET] Cleared. Reload page to apply.');
  };
};
```



**Console usage (from browser console):**
```javascript
window.saveDemoShortcut1();   // Save current assignment
window.resetDemoShortcut1();  // Clear saved assignment
```

---

## Part 4: Pattern B — Hardcoded Default with Auto-Save (Demo Action 2)

**Use when:** You want a sensible default key on first load AND automatic persistence without manual save

```javascript
const initializeShortcut2 = () => {
  const shortcutId = 'WMEShortcutDemo_Action2';
  const storageKey = 'WMEShortcutDemo_Action2_Config';
  const HARDCODED_DEFAULT = 'A+2'; // Alt+2 — works on first load with no setup

  // Step 1: Load saved config
  let savedConfig = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) savedConfig = JSON.parse(saved);
  } catch (e) {}

  // Step 2: Delete old shortcut (only if restoring saved keys)
  if (savedConfig?.shortcutKeys) {
    try {
      wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
    } catch (e) {}
  }

  // Step 3: Determine keys — saved custom OR fallback to hardcoded default
  let shortcutKeysToUse;
  if (savedConfig?.shortcutKeys) {
    shortcutKeysToUse = convertNumericShortcutToString(savedConfig.shortcutKeys) || null;
    console.log(`[SHORTCUT2] Using user-customized keys: ${shortcutKeysToUse}`);
  } else {
    shortcutKeysToUse = HARDCODED_DEFAULT;
    console.log(`[SHORTCUT2] Using hardcoded default: ${HARDCODED_DEFAULT}`);
  }

  // Step 4: Create shortcut
  wmeSDK.Shortcuts.createShortcut({
    shortcutId,
    name: 'Demo Action 2',
    description: `HARDCODED DEFAULT (${HARDCODED_DEFAULT}) + AUTO-SAVE - Change keys, auto-saves every 2 seconds!`,
    shortcutKeys: shortcutKeysToUse,
    callback: () => {
      console.log('[SHORTCUT2] Callback triggered!');
    }
  });

  // Step 5: Auto-save mechanism — monitors for changes every 2 seconds
  let lastSavedKeys = savedConfig?.shortcutKeys || null;
  
  const autoSaveInterval = setInterval(() => {
    try {
      const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
      const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
      
      if (shortcut && shortcut.shortcutKeys) {
        // If keys changed since last save, auto-save
        if (shortcut.shortcutKeys !== lastSavedKeys) {
          const configToSave = {
            shortcutId: shortcut.shortcutId,
            name: shortcut.name,
            description: shortcut.description,
            shortcutKeys: shortcut.shortcutKeys,
          };
          
          localStorage.setItem(storageKey, JSON.stringify(configToSave));
          lastSavedKeys = shortcut.shortcutKeys;
          console.log(`[SHORTCUT2 AUTO-SAVE] Saved: ${shortcut.shortcutKeys}`);
        }
      }
    } catch (e) {
      console.error(`[SHORTCUT2 AUTO-SAVE] Error: ${e}`);
    }
  }, 2000);

  // Manual save function also available
  unsafeWindow.saveDemoShortcut2 = function() {
    const shortcut = wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === shortcutId);
    if (!shortcut) return;
    localStorage.setItem(storageKey, JSON.stringify({
      shortcutId: shortcut.shortcutId,
      name: shortcut.name,
      description: shortcut.description,
      shortcutKeys: shortcut.shortcutKeys,
    }));
    console.log(`[SHORTCUT2 MANUAL SAVE] Saved: ${shortcut.shortcutKeys}`);
  };

  // Reset function to clear custom and revert to default
  unsafeWindow.resetDemoShortcut2 = function() {
    localStorage.removeItem(storageKey);
    console.log('[SHORTCUT2 RESET] Cleared. Reload page to revert to default.');
  };
};
```

**Key differences from Pattern A (Manual Save):**
- ✅ Has a **hardcoded default** that works on first load (no user setup needed)
- ✅ **Auto-saves changes** every 2 seconds — user never must remember to save
- ✅ **Manual save available** via `window.saveDemoShortcut2()` if needed
- ✅ **Reset available** via `window.resetDemoShortcut2()` to revert to default

**Behavior table:**

| State | What happens on reload |
|-------|------------------------|
| No saved config | Uses hardcoded default `A+2` (Alt+2) |
| User changed key in WME UI | Auto-saves within 2 seconds, persists on reload |
| User called `resetDemoShortcut2()` | Reverts to hardcoded default `A+2` on next load |

**Console usage:**
```javascript
window.saveDemoShortcut2();   // Manual save (usually not needed — auto-saves)
window.resetDemoShortcut2();  // Reset to hardcoded default
```

---

## Part 5: Pattern C — Hardcoded Default with User Override (Demo Action 3)

**Use when:** You want a sensible default key that works for new users, but allow customization

```javascript
const initializeShortcut3 = () => {
  const shortcutId = 'WMEShortcutDemo_Action3';
  const storageKey = 'WMEShortcutDemo_Action3_Config';
  const HARDCODED_DEFAULT = 'A+9'; // Alt+9 — works on first load with no setup

  // Step 1: Load saved config
  let savedConfig = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) savedConfig = JSON.parse(saved);
  } catch (e) {}

  // Step 2: Delete old shortcut (only if restoring saved keys)
  if (savedConfig?.shortcutKeys) {
    try {
      wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
    } catch (e) {}
  }

  // Step 3: Determine keys — saved custom OR fallback to hardcoded default
  let shortcutKeysToUse;
  if (savedConfig?.shortcutKeys) {
    shortcutKeysToUse = convertNumericShortcutToString(savedConfig.shortcutKeys) || null;
    console.log(`[SHORTCUT3] Using user-customized keys: ${shortcutKeysToUse}`);
  } else {
    shortcutKeysToUse = HARDCODED_DEFAULT;
    console.log(`[SHORTCUT3] Using hardcoded default: ${HARDCODED_DEFAULT}`);
  }

  // Step 4: Create shortcut
  wmeSDK.Shortcuts.createShortcut({
    shortcutId,
    name: 'Demo Action 3',
    description: `HARDCODED DEFAULT (${HARDCODED_DEFAULT}) - Change keys, then run: window.saveDemoShortcut3()`,
    shortcutKeys: shortcutKeysToUse,
    callback: () => {
      console.log('[SHORTCUT3] Callback triggered!');
    }
  });

  // Step 5: Register save/reset
  unsafeWindow.saveDemoShortcut3 = function() {
    const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
    const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
    if (!shortcut?.shortcutKeys) return;
    localStorage.setItem(storageKey, JSON.stringify({
      shortcutId: shortcut.shortcutId,
      name: shortcut.name,
      description: shortcut.description,
      shortcutKeys: shortcut.shortcutKeys,
    }));
    console.log(`[SHORTCUT3 SAVE] Saved custom: ${shortcut.shortcutKeys}`);
  };

  unsafeWindow.resetDemoShortcut3 = function() {
    localStorage.removeItem(storageKey);
    console.log('[SHORTCUT3 RESET] Cleared. Will revert to default on next load.');
  };
};
```

**Behavior table:**

| State | What happens on reload |
|-------|------------------------|
| No saved config | Uses hardcoded default `A+9` (Alt+9) |
| User saved custom key | Uses saved key (e.g., `AC+x`) |
| User called `resetDemoShortcut3()` | Reverts to hardcoded default on next load |

**Console usage:**
```javascript
window.saveDemoShortcut3();   // Override default with current assignment
window.resetDemoShortcut3();  // Revert to hardcoded default (Alt+9)
```

---

## Part 5: Pattern C — Auto-Save (Demo Action 4)

**Use when:** Best UX — user assigns keys and they persist with no manual steps required

```javascript
const initializeShortcut4 = () => {
  const shortcutId = 'WMEShortcutDemo_Action4';
  const storageKey = 'WMEShortcutDemo_Action4_Config';

  // Steps 1–4: identical to Pattern A (load, delete, convert, create)
  let savedConfig = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) savedConfig = JSON.parse(saved);
  } catch (e) {}

  if (savedConfig?.shortcutKeys) {
    try { wmeSDK.Shortcuts.deleteShortcut({ shortcutId }); } catch (e) {}
  }

  let shortcutKeysToUse = null;
  if (savedConfig?.shortcutKeys) {
    shortcutKeysToUse = convertNumericShortcutToString(savedConfig.shortcutKeys) || null;
  }

  wmeSDK.Shortcuts.createShortcut({
    shortcutId,
    name: 'Demo Action 4',
    description: 'AUTO-SAVE - Assign keys, automatically saved every 2 seconds!',
    shortcutKeys: shortcutKeysToUse,
    callback: () => {
      console.log('[SHORTCUT4] Callback triggered!');
    }
  });

  // Step 5: Auto-save interval — polls every 2 seconds for key changes
  let lastSavedKeys = savedConfig?.shortcutKeys || null;

  setInterval(() => {
    const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
    const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);

    if (shortcut?.shortcutKeys && shortcut.shortcutKeys !== lastSavedKeys) {
      localStorage.setItem(storageKey, JSON.stringify({
        shortcutId: shortcut.shortcutId,
        name: shortcut.name,
        description: shortcut.description,
        shortcutKeys: shortcut.shortcutKeys,
      }));
      lastSavedKeys = shortcut.shortcutKeys;
      console.log(`[SHORTCUT4 AUTO-SAVE] Saved: ${shortcut.shortcutKeys}`);
    }
  }, 2000);

  // Manual save still available as a fallback
  unsafeWindow.saveDemoShortcut4 = function() {
    const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
    const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
    if (!shortcut) return;
    localStorage.setItem(storageKey, JSON.stringify({
      shortcutId: shortcut.shortcutId,
      name: shortcut.name,
      description: shortcut.description,
      shortcutKeys: shortcut.shortcutKeys,
    }));
    lastSavedKeys = shortcut.shortcutKeys;
    console.log(`[SHORTCUT4 MANUAL SAVE] Saved: ${shortcut.shortcutKeys}`);
  };

  unsafeWindow.resetDemoShortcut4 = function() {
    localStorage.removeItem(storageKey);
    console.log('[SHORTCUT4 RESET] Cleared. Reload page to apply.');
  };
};
```

**Console usage (optional — auto-save handles it):**
```javascript
window.saveDemoShortcut4();   // Force immediate save
window.resetDemoShortcut4();  // Clear assignment
```

---

## Part 6: Adapting the Demo Script for Your Own Script

Replace these values when copying a pattern into your script:

| Demo value | Replace with |
|------------|-------------|
| `'WMEShortcutDemo_Action1'` | `'MyScript_ActionName'` (unique per shortcut) |
| `'WMEShortcutDemo_Action1_Config'` | `'MyScript_ActionName_Config'` (unique per shortcut) |
| `'Demo Action 1'` | Your shortcut's display name in WME UI |
| `unsafeWindow.saveDemoShortcut1` | `unsafeWindow.saveMyScriptAction` |
| `unsafeWindow.resetDemoShortcut1` | `unsafeWindow.resetMyScriptAction` |
| `'A+9'` (Pattern B only) | Your hardcoded default key string |
| Callback body | Your actual action code |

**Minimal template for Pattern A (copy-paste ready):**

```javascript
const initializeMyShortcut = () => {
  const shortcutId = 'MyScript_Action1';           // ← change this
  const storageKey = 'MyScript_Action1_Config';    // ← change this

  let savedConfig = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) savedConfig = JSON.parse(saved);
  } catch (e) {}

  if (savedConfig?.shortcutKeys) {
    try { wmeSDK.Shortcuts.deleteShortcut({ shortcutId }); } catch (e) {}
  }

  const shortcutKeysToUse = savedConfig?.shortcutKeys
    ? convertNumericShortcutToString(savedConfig.shortcutKeys) || null
    : null;

  wmeSDK.Shortcuts.createShortcut({
    shortcutId,
    name: 'My Action',                             // ← change this
    description: 'Run: window.saveMyAction() in console to persist keys',
    shortcutKeys: shortcutKeysToUse,
    callback: () => {
      // ← your action code here
    }
  });

  unsafeWindow.saveMyAction = function() {         // ← change this
    const shortcut = wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === shortcutId);
    if (!shortcut) return;
    localStorage.setItem(storageKey, JSON.stringify({
      shortcutId: shortcut.shortcutId,
      name: shortcut.name,
      description: shortcut.description,
      shortcutKeys: shortcut.shortcutKeys,
    }));
    console.log(`[SAVE] Saved: ${shortcut.shortcutKeys}`);
  };

  unsafeWindow.resetMyAction = function() {        // ← change this
    localStorage.removeItem(storageKey);
    console.log('[RESET] Cleared. Reload page to apply.');
  };
};
```

---

## Part 7: unsafeWindow vs window

**Inside the Tampermonkey script** — use `unsafeWindow` to expose functions to the page:
```javascript
unsafeWindow.saveDemoShortcut1 = function() { ... };
```

**From the browser console** — use `window` (they resolve to the same page context):
```javascript
window.saveDemoShortcut1();  // ✅ works in browser console
```

Do **not** try to call `unsafeWindow.xxx()` from the browser console — `unsafeWindow` is only defined inside the Tampermonkey sandbox.

---

## Part 8: Decision Guide — Which Pattern to Use?

| Scenario | Pattern | Demo |
|----------|---------|------|
| User assigns keys freely, explicitly saves | Pattern A — Manual Save | Action 1 |
| Script ships with default & auto-saves on change | Pattern B — Hardcoded Default + Auto-Save | Action 2 |
| Script ships with default, user manually overrides | Pattern C — Hardcoded Default with Override | Action 3 |
| User assigns keys freely, auto-saves on change | Pattern D — Auto-Save | Action 4 |

**Choosing a default key (Pattern B):**
- Use string format: `"A+9"` = Alt+9, `"S+q"` = Shift+Q, `"CS+1"` = Ctrl+Shift+1
- Pick combinations unlikely to conflict with WME's built-in shortcuts

---

## Part 9: Best Practices

### Do's ✅

- ✅ **Always delete before recreating** — required by WME SDK
- ✅ **Wrap delete in try-catch** — shortcut won't exist on first load
- ✅ **Only delete when you have saved keys to restore** — skip delete on fresh loads
- ✅ **Convert numeric → string before passing to `createShortcut()`**
- ✅ **Assign save/reset functions to `unsafeWindow`** — makes them callable as `window.xxx()` in console
- ✅ **Add script prefix to all IDs and storage keys** — avoids conflicts with other scripts
- ✅ **Re-attach callback on every create** — callbacks cannot be serialized/stored

### Don'ts ❌

- ❌ **Don't pass numeric format (e.g., `"4,56"`) to `createShortcut()`** — use converted string
- ❌ **Don't rely on `isShortcutRegistered()`** — use delete + try-catch instead
- ❌ **Don't call `unsafeWindow.xxx()` from the browser console** — use `window.xxx()` instead
- ❌ **Don't store callback functions in localStorage** — re-create them on every load

---

## Part 10: Common Issues & Solutions

### 10.1 Shortcut Not Working After Reload

**Symptom:** Key is shown in WME UI but pressing it does nothing

**Checklist:**
1. Confirm `convertNumericShortcutToString()` returns the correct string
2. Verify delete ran before create (check console logs)
3. Confirm callback is defined inline in `createShortcut()`, not referenced from a variable

**Debug:**
```javascript
// Check what WME sees for your shortcut
wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === 'YourShortcutId');
```

### 10.2 Function Not Found in Console

**Symptom:** `Uncaught ReferenceError: unsafeWindow is not defined` or `window.saveXxx is not a function`

**Solution:**
- From the browser console, always use `window.xxx()`, never `unsafeWindow.xxx()`
- If `window.xxx` is `undefined`, the script hasn't initialized yet — check console logs for bootstrap errors

### 10.3 Keys Revert to Default After Reload (Pattern B)

**Symptom:** User changed key in WME UI but after reload it's back to the hardcoded default

**Cause:** User did not call `window.saveDemoShortcut3()` before reloading

**Solutions:**
- Switch to Pattern C (Auto-Save) if you want zero-friction UX
- Or add a UI reminder in the shortcut description (already done in the demo)

### 10.4 Keys Not Converting Correctly

**Debug:**
```javascript
// Test the converter directly in console
// (run inside WME after the script loads)
const result = convertNumericShortcutToString("4,56");
console.log(result); // Expected: "A+8"
```

### 10.5 Script Initializes Too Early

**Symptom:** `createShortcut()` throws or shortcut doesn't appear in WME UI

**Solution:** Use the bootstrap polling pattern from Part 1.1 — wait for both `edit-panel` DOM element and `getTopCountry()` to be available before registering shortcuts.

---

## Part 11: Testing Workflow

### 11.1 Pattern A — Demo Action 1 (Manual Save)

1. Load script → "Demo Action 1" appears in Settings → Keyboard Shortcuts (no key)
2. Assign a key (e.g., Shift+Q)
3. Run in console: `window.saveDemoShortcut1()`
4. Verify: `localStorage.getItem('WMEShortcutDemo_Action1_Config')`
5. Reload → key persists, press it → callback triggers
6. Reset: `window.resetDemoShortcut1()` → reload → no key assigned

### 11.2 Pattern B — Demo Action 2 (Hardcoded Default + Auto-Save)

1. Load script → "Demo Action 2" appears with **Alt+2 already assigned**
2. Press Alt+2 → callback triggers immediately (no setup needed)
3. Change to a custom key in WME UI (e.g., Shift+X)
4. Wait 2 seconds → console shows `[SHORTCUT2 AUTO-SAVE] Saved: ...`
5. Reload → custom key persists automatically
6. **Without waiting:** reload → reverts to Alt+2 (hardcoded default)
7. Reset: `window.resetDemoShortcut2()` → reload → back to Alt+2
8. Manual save also available: `window.saveDemoShortcut2()`

### 11.3 Pattern C — Demo Action 3 (Hardcoded Default with Override)

1. Load script → "Demo Action 3" appears with **Alt+9 already assigned**
2. Press Alt+9 → callback triggers immediately (no setup needed)
3. Change to a custom key in WME UI (e.g., Shift+X)
4. Run: `window.saveDemoShortcut3()`
5. Reload → custom key persists
6. **Without saving:** reload → reverts to Alt+9 (hardcoded default)
7. Reset: `window.resetDemoShortcut3()` → reload → back to Alt+9

### 11.4 Pattern D — Demo Action 4 (Auto-Save)

1. Load script → "Demo Action 4" appears with no key
2. Assign a key (e.g., Shift+9)
3. Wait 2 seconds → console shows `[SHORTCUT4 AUTO-SAVE] Saved: 3,57`
4. Verify: `localStorage.getItem('WMEShortcutDemo_Action4_Config')`
5. Reload → key persists automatically, no console commands needed
6. Change key → auto-saves within 2 seconds
7. Reset: `window.resetDemoShortcut4()` → reload → no key assigned

### 11.5 Full Console Reference

```javascript
// ===== INSPECT =====
wmeSDK.Shortcuts.getAllShortcuts();
wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === 'WMEShortcutDemo_Action1');

// ===== SAVE =====
window.saveDemoShortcut1();
window.saveDemoShortcut2();
window.saveDemoShortcut3();
window.saveDemoShortcut4();  // Force save (usually auto-saves)

// ===== RESET =====
window.resetDemoShortcut1();
window.resetDemoShortcut2();
window.resetDemoShortcut3();  // Reverts to hardcoded default (Alt+9)
window.resetDemoShortcut4();

// ===== LOCALSTORAGE =====
localStorage.getItem('WMEShortcutDemo_Action1_Config');
localStorage.getItem('WMEShortcutDemo_Action2_Config');
localStorage.getItem('WMEShortcutDemo_Action3_Config');
localStorage.getItem('WMEShortcutDemo_Action4_Config');

// Clear all demo configs
['WMEShortcutDemo_Action1_Config','WMEShortcutDemo_Action2_Config',
 'WMEShortcutDemo_Action3_Config','WMEShortcutDemo_Action4_Config']
  .forEach(k => localStorage.removeItem(k));
```

---

## Part 12: Summary

**The formula (same for all patterns):**
```
1. Load saved config from localStorage
2. Delete old shortcut (try-catch, only if saved keys exist)
3. Convert numeric → string ("4,56" → "A+8")
4. Create shortcut with converted keys (or null / hardcoded default)
5. Register unsafeWindow.saveXxx / unsafeWindow.resetXxx
   — OR — start auto-save interval (Pattern C)
```

**Pattern choice:**
- **New users need it to "just work"** → Pattern B (hardcoded default)
- **Smoothest UX, no user steps** → Pattern C (auto-save)
- **User explicitly controls when to persist** → Pattern A (manual save) or Pattern C (manual override)
- **Auto-persist on change with hardcoded default** → Pattern B (best for new users)
- **Auto-persist on change without default** → Pattern D (most flexible)

---

## References

- **Live library:** [`WME-Shortcut-Demo.user.js`](WME-Shortcut-Demo.user.js) — all 4 patterns, fully working
- **WME SDK Docs:** https://www.waze.com/editor/sdk/classes/index.SDK.Shortcuts
- **String format examples:**
  - `"A+8"` = Alt+8
  - `"S+q"` = Shift+Q
  - `"C+a"` = Ctrl+A
  - `"AC+n"` = Alt+Ctrl+N
  - `"CS+1"` = Ctrl+Shift+1
