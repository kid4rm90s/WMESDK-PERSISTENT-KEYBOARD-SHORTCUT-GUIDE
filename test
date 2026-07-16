# WME SDK Keyboard Shortcuts — Implementation Guide

## Overview

This guide documents how to implement **user-customizable keyboard shortcuts** in WME Tampermonkey scripts using the WME SDK, based on production patterns from [WME Place Interface Enhancements (PIE)](https://greasyfork.org/scripts/26340).

**Key principles:**
- **No hardcoded defaults** — shortcuts start as null to avoid key conflicts with other scripts
- **Data-driven registration** — define shortcuts in an array, register in a single loop
- **Format-robust persistence** — normalize all shortcut formats to {raw, combo} for reliable round-tripping
- **Auto-save on page unload** — no manual console saves needed

**Reference implementations:**
- [WME-Shortcut-Demo.user.js](WME-Shortcut-Demo.user.js) — live demo with all patterns
- [WME-Place-Interface-Enhancements.user.js](https://greasyfork.org/scripts/26340) — production script using these techniques

---

## Part 1: Core Components

### 1.1 Script Initialization

All shortcuts must be initialized after WME is fully ready:

```javascript
(function main() {
  'use strict';

  let wmeSDK = null;

  unsafeWindow.SDK_INITIALIZED.then(() => {
    wmeSDK = getWmeSdk({
      scriptId: 'my-shortcut-script',
      scriptName: 'My Shortcut Script',
    });
    initializeShortcuts();
  });

  // All shortcut code follows below...
})();
```

### 1.2 Format Converters (PIE-style bidirectional system)

WME stores shortcuts internally as numeric format ("4,56" = Alt+8) but createShortcut() requires string format ("A+8"). The SDK also returns inconsistent formats — combo on load, raw after user edits, combo again on reload.

This three-function system handles every format reliably:

```javascript
// ===== KEYCODE LOOKUP TABLES =====

const _KEYCODE_TO_CHAR = {
  // A-Z
  65:'A',66:'B',67:'C',68:'D',69:'E',70:'F',71:'G',72:'H',73:'I',74:'J',75:'K',76:'L',
  77:'M',78:'N',79:'O',80:'P',81:'Q',82:'R',83:'S',84:'T',85:'U',86:'V',87:'W',88:'X',
  89:'Y',90:'Z',
  // 0-9
  48:'0',49:'1',50:'2',51:'3',52:'4',53:'5',54:'6',55:'7',56:'8',57:'9',
  // Function keys
  112:'F1',113:'F2',114:'F3',115:'F4',116:'F5',117:'F6',
  118:'F7',119:'F8',120:'F9',121:'F10',122:'F11',123:'F12',
  // Special keys
  32:'Space',13:'Enter',9:'Tab',27:'Esc',8:'Backspace',46:'Delete',
  36:'Home',35:'End',33:'PageUp',34:'PageDown',45:'Insert',
  // Arrow keys
  37:'←',38:'↑',39:'→',40:'↓',
  // Common punctuation
  188:',',190:'.',191:'/',186:';',222:"'",219:'[',221:']',220:'\\',189:'-',187:'=',192:'',
};

// Reverse map
const _CHAR_TO_KEYCODE = Object.fromEntries(
  Object.entries(_KEYCODE_TO_CHAR).map(([k, v]) => [v.toUpperCase(), Number(k)])
);

const _MOD_CHAR_TO_VAL = { C: 1, S: 2, A: 4 };

// ===== CONVERTER FUNCTIONS =====

/**
 * Converts any shortcut string to raw "modifier,keycode" format (e.g. "4,82").
 * Handles: raw "4,82", combo "A+R", hybrid "A+82", bare key "R", no-key "-1"/"None".
 * Returns null for empty / no-key values.
 */
function _comboToRaw(str) {
  if (!str || str === '' || str === '-1' || str === 'None') return null;
  if (/^\d+,-?\d+$/.test(str)) {
    const keyCode = parseInt(str.split(',')[1], 10);
    return kc < 0 ? null : str;
  }
  const s = String(str).toUpperCase();
  if (/^[A-Z0-9]$/.test(s)) return `0,${_CHAR_TO_KEYCODE[s]}`;
  if (_CHAR_TO_KEYCODE[s] !== undefined) return `0,${_CHAR_TO_KEYCODE[s]}`;

  const letterMatch = s.match(/^([ACS]+)\+([A-Z0-9])$/);
  if (letterMatch) {
    const mod = letterMatch[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
    return `${mod},${_CHAR_TO_KEYCODE[letterMatch[2]]}`;
  }
  const numericMatch = s.match(/^([ACS]+)\+(\d+)$/);
  if (numericMatch) {
    const mod = numericMatch[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
    return `${mod},${numericMatch[2]}`;
  }
  const specialMatch = s.match(/^([ACS]+)\+(.+)$/);
  if (specialMatch && _CHAR_TO_KEYCODE[specialMatch[2]] !== undefined) {
    const mod = specialMatch[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
    return `${mod},${_CHAR_TO_KEYCODE[specialMatch[2]]}`;
  }
  return null;
}

/**
 * Converts any shortcut string to human-readable combo format (e.g. "A+R").
 * Returns null if no key.
 */
function _rawToCombo(str) {
  const raw = _comboToRaw(str);
  if (!raw) return null;
  const [modStr, keyStr] = raw.split(',');
  const mod = parseInt(modStr, 10);
  const keyCode = parseInt(keyStr, 10);
  const keyChar = _KEYCODE_TO_CHAR[keyCode] || String(keyCode);
  let mods = '';
  if (mod & 1) mods += 'C';
  if (mod & 2) mods += 'S';
  if (mod & 4) mods += 'A';
  return mods ? `${mods}+${keyChar}` : keyChar;
}

/**
 * Normalizes any shortcut value to a {raw, combo} pair for consistent storage.
 * Accepts: flat string (any format), existing {raw,combo} object, or null.
 */
function _normalizeShortcut(val) {
  const src = val && typeof val === 'object' ? (val.raw ?? val.combo) : val;
  const raw = _comboToRaw(src);
  const combo = _rawToCombo(raw);
  return { raw, combo };
}
```

**Modifier Bitmask Reference:**
```
1 = C (Ctrl)    3 = CS          5 = AC           7 = ACS
2 = S (Shift)   4 = A (Alt)     6 = AS
```

**Conversion Examples:**
```
"4,56"     → "A+8"   = Alt+8
"3,49"     → "CS+1"  = Ctrl+Shift+1
"5,78"     → "AC+n"  = Ctrl+Alt+N
"2,81"     → "S+q"   = Shift+Q
"0,32"     → "Space"
"A+F5"     → "A+F5"  = Alt+F5
```

**Key Codes Reference:**
- 48–57: Numbers 0–9
- 65–90: Letters A–Z
- 32: Space
- 112–123: F1–F12
- 37–40: Arrow keys (← ↑ → ↓)
- Other keys: see _KEYCODE_TO_CHAR table above

---

## Part 2: The Unified Pattern (PIE-style)

Instead of writing a separate function per shortcut (which duplicates boilerplate), define all your shortcuts in a **data array** and register them in a **single loop**.

### 2.1 Shortcut Definitions

```javascript
const _shortcutDefs = [
  {
    id: 'MyScript_ActionOne',
    description: 'My Script: Do action one',
    settingsKey: 'ActionOneShortcut',
    callback: () => {
      console.log('[MyScript] Action One triggered!');
      // Your action code here
    },
  },
  {
    id: 'MyScript_ActionTwo',
    description: 'My Script: Do action two',
    settingsKey: 'ActionTwoShortcut',
    callback: () => {
      console.log('[MyScript] Action Two triggered!');
      // Your action code here
    },
  },
  // Add more shortcuts as needed...
];
```

Each shortcut entry:
| Property | Description |
|----------|-------------|
| id | Unique SDK shortcut ID (use script prefix to avoid conflicts) |
| `description` | Description shown in WME Settings → Keyboard Shortcuts |
| settingsKey | Key in the settings blob where the normalized {raw, combo} is stored |
| `callback` | Function that runs when the shortcut key is pressed |

### 2.2 Initialization Function

```javascript
function initializeShortcuts() {
  // On script reload, previous registrations still exist — delete them first
  for (const shortcutDef of _shortcutDefs) {
    if (wmeSDK.Shortcuts.isShortcutRegistered({ shortcutId: shortcutDef.id })) {
      wmeSDK.Shortcuts.deleteShortcut({ shortcutId: shortcutDef.id });
    }
  }

  // Register all shortcuts from the data array
  for (const shortcutDef of _shortcutDefs) {
    // Normalize stored value — handles flat strings, hybrid "A+82",
    // raw "4,82"/"-1", and already-normalized {raw,combo} objects
    settings[shortcutDef.settingsKey] = _normalizeShortcut(settings[shortcutDef.settingsKey]);

    // Register the shortcut
    try {
      wmeSDK.Shortcuts.createShortcut({
        shortcutId: shortcutDef.id,
        description: shortcutDef.description,
        callback: shortcutDef.callback,
        shortcutKeys: settings[shortcutDef.settingsKey].combo, // null = unassigned
      });
    } catch (error) {
      if (String(error).includes('already in use')) {
        // Key conflict — register without a key; user assigns in WME UI
        settings[shortcutDef.settingsKey] = { raw: null, combo: null };
        try {
          wmeSDK.Shortcuts.createShortcut({
            shortcutId: shortcutDef.id,
            description: shortcutDef.description,
            callback: shortcutDef.callback,
            shortcutKeys: null,
          });
        } catch (err) {
          console.error(`Unable to create shortcut: ${error}`);
        }
      } else {
        console.error(`Unable to create shortcut: ${error}`);
      }
    }
  }
}
```

### 2.3 The 5-Step Sequence

Behind the scenes, each shortcut goes through this sequence:

```
Step 1: Delete old shortcut (via isShortcutRegistered + deleteShortcut)
Step 2: Normalize saved value to {raw, combo}
Step 3: Create shortcut with normalized combo (or null if no key saved)
Step 4: Handle key conflicts gracefully (try/catch with null fallback)
Step 5: Persist changes (see Part 3)
```

**Why delete before create?**
- WME SDK requires the old shortcut to be removed before a new one with the same ID is created
- Skipping delete causes silent failures
- Using isShortcutRegistered() pre-check avoids unnecessary delete calls on fresh loads

**Why no hardcoded defaults?**
- Starting with nnull avoids key conflicts with other scripts
- Users assign keys in WME Settings → Keyboard Shortcuts
- They persist automatically (see Part 3)

---

## Part 3: Persistence

### 3.1 Settings Blob (Storage)

Store all shortcuts (and other settings) in a single localStorage entry:

```javascript
const STORAGE_KEY = 'MyScript_Settings';

const defaultSettings = {
  ActionOneShortcut: null,
  ActionTwoShortcut: null,
  // ... other settings ...
};

// Load
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  settings = { ...defaultSettings, ...saved };

  // Normalize all shortcut values to {raw, combo}
  const shortcutKeys = Object.keys(defaultSettings);
  for (const key of shortcutKeys) {
    settings[key] = _normalizeShortcut(settings[key]);
  }
}

// Save
function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
```

### 3.2 Auto-Save on beforeunload (PIE-style)

Saves when the page closes. Simpler and lighter than polling:

```javascript
function checkShortcutsChanged() {
  // getAllShortcuts() returns inconsistent formats depending on when called.
  // Normalize to {raw, combo} before comparing.
  let triggerSave = false;
  const shortcuts = wmeSDK.Shortcuts.getAllShortcuts();
  for (const shortcut of shortcuts) {
    const matchingDef = _shortcutDefs.find(shortcutDef => shortcutDef.id === shortcut.shortcutId);
    if (!matchingDef) continue;
    const normalized = _normalizeShortcut(shortcut.shortcutKeys);
    if (settings[matchingDef.settingsKey]?.combo !== normalized.combo) {
      triggerSave = true;
      break;
    }
  }
  if (triggerSave) {
    for (const shortcut of shortcuts) {
      const matchingDef = _shortcutDefs.find(shortcutDef => shortcutDef.id === shortcut.shortcutId);
    if (matchingDef && matchingDef.settingsKey in settings) {
        settings[matchingDef.settingsKey] = _normalizeShortcut(shortcut.shortcutKeys);
      }
    }
    saveSettings();
  }
}

// Register at init
window.addEventListener('beforeunload', checkShortcutsChanged);
```

### 3.3 Auto-Save with setInterval (Polling alternative)

For scripts that need faster persistence (e.g., before the page is closed unexpectedly):

```javascript
// Start polling after shortcut registration
setInterval(() => {
  const shortcuts = wmeSDK.Shortcuts.getAllShortcuts();
  const changed = shortcuts.some(shortcut => {
    const matchingDef = _shortcutDefs.find(shortcutDef => shortcutDef.id === shortcut.shortcutId);
    if (!matchingDef) return false;
    return settings[matchingDef.settingsKey]?.combo !== _normalizeShortcut(shortcut.shortcutKeys).combo;
  });
  if (changed) {
    for (const shortcut of shortcuts) {
      const matchingDef = _shortcutDefs.find(shortcutDef => shortcutDef.id === shortcut.shortcutId);
      if (matchingDef && matchingDef.settingsKey in settings) {
        settings[matchingDef.settingsKey] = _normalizeShortcut(shortcut.shortcutKeys);
      }
    }
    saveSettings();
  }
}, 2000);
```

| Method | Pros | Cons |
|--------|------|------|
| beforeunload | Simple, no CPU overhead | Won't save on browser crash |
| setInterval | Saves quickly after changes | Constant polling overhead |
| **Both** | Most robust | Slightly more code |

**Recommendation:** Use **both** — setInterval(..., 5000) for regular persistence + beforeunload as a safety net.

---

## Part 4: Conflict Handling

When createShortcut() is called with a key combo already in use by WME or another script, the SDK throws an "already in use" error.

**PIE approach** — try/catch with fallback (no pre-check):

```javascript
try {
  wmeSDK.Shortcuts.createShortcut({ shortcutId, description, callback, shortcutKeys: keys });
} catch (error) {
  if (String(error).includes('already in use')) {
    // Key conflict — register without a key; user can assign a different one in WME UI
    wmeSDK.Shortcuts.createShortcut({ shortcutId, description, callback, shortcutKeys: null });
  } else {
    console.error(`Failed to register shortcut: ${error}`);
  }
}
```

**Why not areShortcutKeysInUse()?**
- areShortcutKeysInUse() can produce **false positives** — WME's own built-in shortcuts may share the same key combo, causing the SDK to incorrectly report a conflict and clear the user's assigned keys
- try/catch is more reliable: it only reacts when the SDK actually rejects the registration

---

## Part 5: Dynamic Re-Registration

For shortcuts whose **description** or **behavior** can change at runtime (e.g., creating a place with a category the user selected from a dropdown), use PIE's _refreshItemShortcut pattern:

```javascript
function _refreshItemShortcut(itemNum) {
  const shortcutId = MyScript_ItemShortcut;
  const category = settings.PlaceCategories[itemNum - 1];
  const catName = getCategoryLocalizedName(category);
  const description = catName
    ? `Create ${category}`
    : `Create item ${itemNum}`;

  // Read current key from SDK (user may have assigned one)
  const sdkKey = wmeSDK.Shortcuts.getAllShortcuts()
    .find(s => s.shortcutId === shortcutId)?.shortcutKeys;
  const normalized = !category
    ? { raw: null, combo: null }
    : _normalizeShortcut(sdkKey);

  settings[shortcutId] = normalized;

  // Delete old, create new with updated description
  if (wmeSDK.Shortcuts.isShortcutRegistered({ shortcutId })) {
    wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
  }
  try {
    wmeSDK.Shortcuts.createShortcut({
      shortcutId,
      description,
      callback: () => doAction(itemNum),
      shortcutKeys: normalized.combo,
    });
  } catch (error) {
    console.error(`Unable to re-register shortcut: ${error}`);
  }
}
```

**When to use:**
- User can change what a shortcut does from a dropdown (e.g., "Create Item 1" → "Create Restaurant")
- Shortcut descriptions that include dynamic values (category names, place names, etc.)
- Toggles that change label based on state

---

## Part 6: Key Badge UI

To display assigned shortcut keys in your own settings UI (like PIE's Quick-Create panel), create a visual badge:

```javascript
function _getKeyBadgeHTML(shortcutId) {
  const normalized = settings[shortcutId];
  const keyText = normalized?.combo || '—';
  return `<span class="key-badge">${keyText}</span>`;
}

// Use in settings UI:
<div class="shortcut-row">
  <span>${description}</span>
  
</div>
```

CSS for the badge:
```css
.key-badge {
  display: inline-block;
  padding: 1px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  background: #f5f5f5;
}
```

---

## Part 7: Adapting for Your Script

### Minimal template (copy-paste ready)

```javascript
// ==UserScript==
// @name         My WME Script
// @namespace    https://greasyfork.org/users/YOUR_ID
// @version      1.0.0
// @description  Description here
// @author       You
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @grant        GM_info
// @grant        unsafeWindow
// @require      https://greasyfork.org/scripts/560385/code/WazeToastr.js
// ==/UserScript==

/* global getWmeSdk, WazeToastr */
(function main() {
  'use strict';

  const SCRIPT_NAME = GM_info.script.name;
  let wmeSDK;
  const settings = {};
  const STORAGE_KEY = 'MyScript_Settings';

  // ===== FORMAT CONVERTERS (from Part 1.2) =====
  // Paste _KEYCODE_TO_CHAR, _CHAR_TO_KEYCODE, _MOD_CHAR_TO_VAL,
  // _comboToRaw, _rawToCombo, _normalizeShortcut here

  // ===== SHORTCUT DEFINITIONS (from Part 2.1) =====
  const _shortcutDefs = [
    { id: 'MyScript_ActionOne', description: 'My Script: Action One', settingsKey: 'ActionOneShortcut', callback: () => actionOne() },
    { id: 'MyScript_ActionTwo', description: 'My Script: Action Two', settingsKey: 'ActionTwoShortcut', callback: () => actionTwo() },
  ];

  // ===== SETTINGS DEFAULTS =====
  const defaultSettings = {
    ActionOneShortcut: null,
    ActionTwoShortcut: null,
  };

  // ===== INITIALIZATION =====
  unsafeWindow.SDK_INITIALIZED.then(() => {
    wmeSDK = getWmeSdk({ scriptId: 'my-script', scriptName: SCRIPT_NAME });
    loadSettings();
    initializeShortcuts();
    window.addEventListener('beforeunload', checkShortcutsChanged);
  });

  function loadSettings() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(settings, defaultSettings, saved);
    for (const key of Object.keys(defaultSettings)) {
      settings[key] = _normalizeShortcut(settings[key]);
    }
  }

  function saveSettings() {
    const toSave = {};
    for (const key of Object.keys(defaultSettings)) {
      toSave[key] = settings[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  // ===== SHORTCUT REGISTRATION (from Part 2.2) =====
  function initializeShortcuts() {
    for (const shortcutDef of _shortcutDefs) {
      if (wmeSDK.Shortcuts.isShortcutRegistered({ shortcutId: shortcutDef.id })) {
        wmeSDK.Shortcuts.deleteShortcut({ shortcutId: shortcutDef.id });
      }
    }
    for (const shortcutDef of _shortcutDefs) {
      settings[shortcutDef.settingsKey] = _normalizeShortcut(settings[shortcutDef.settingsKey]);
      try {
        wmeSDK.Shortcuts.createShortcut({
          shortcutId: shortcutDef.id,
          description: shortcutDef.description,
          callback: shortcutDef.callback,
          shortcutKeys: settings[shortcutDef.settingsKey].combo,
        });
      } catch (error) {
        if (String(error).includes('already in use')) {
          settings[shortcutDef.settingsKey] = { raw: null, combo: null };
          try {
            wmeSDK.Shortcuts.createShortcut({ shortcutId: shortcutDef.id, description: shortcutDef.description, callback: shortcutDef.callback, shortcutKeys: null });
          } catch (err) {
            console.error(`Unable to create shortcut: ${error}`);
          }
        } else {
          console.error(`Unable to create shortcut: ${error}`);
        }
      }
    }
  }

  // ===== PERSISTENCE (from Part 3) =====
  function checkShortcutsChanged() {
    const shortcuts = wmeSDK.Shortcuts.getAllShortcuts();
    for (const shortcut of shortcuts) {
      const matchingDef = _shortcutDefs.find(shortcutDef => shortcutDef.id === shortcut.shortcutId);
      if (!matchingDef) continue;
      const normalized = _normalizeShortcut(shortcut.shortcutKeys);
      if (settings[matchingDef.settingsKey]?.combo !== normalized.combo) {
        for (const s of shortcuts) {
          const d = _shortcutDefs.find(shortcutDef => shortcutDef.id === s.shortcutId);
          if (d && d.settingsKey in settings) {
            settings[d.settingsKey] = _normalizeShortcut(s.shortcutKeys);
          }
        }
        saveSettings();
        return;
      }
    }
  }

  // ===== ACTIONS =====
  function actionOne() {
    console.log('Action One triggered!');
    WazeToastr.Alerts.info(SCRIPT_NAME, 'Action One executed');
  }
  function actionTwo() {
    console.log('Action Two triggered!');
    WazeToastr.Alerts.info(SCRIPT_NAME, 'Action Two executed');
  }
})();
```

| Template value | Replace with |
|----------------|-------------|
| 'MyScript_Settings' | Your script's unique localStorage key |
| 'my-script' | Your script ID (passed to getWmeSdk) |
| 'MyScript_ActionOne' | Unique shortcut ID per action |
| 'My Script: Action One' | User-visible description |
| actionOne() / actionTwo() | Your actual action functions |

---

## Part 8: Best Practices

### Do's ✅

- ✅ **Always delete before recreating** — required by WME SDK; use isShortcutRegistered() pre-check
- ✅ **Use _normalizeShortcut() on load** — normalizes inconsistent SDK return formats to {raw, combo}
- ✅ **Re-attach callback on every create** — callbacks cannot be serialized/stored; always pass inline or referenced functions
- ✅ **Use try/catch for "already in use"** — more reliable than areShortcutKeysInUse() pre-check
- ✅ **Start with nnull keys** — avoids conflicts with other scripts and WME's built-in shortcuts
- ✅ **Add script prefix to all IDs and storage keys** — 'MyScript_ActionOne' not just 'ActionOne'
- ✅ **Normalize before comparing** — use _normalizeShortcut().combo for comparisons, not raw strings
- ✅ **Use beforeunload + optional setInterval** — saves user changes without manual steps
- ✅ **Normalize legacy data on load** — existing plain strings get converted to {raw, combo} automatically

### Don'ts ❌

- ❌ **Don't pass numeric format (e.g., "4,56") to createShortcut()** — use _rawToCombo() first
- ❌ **Don't compare shortcut keys directly** — SDK returns inconsistent formats; always use _normalizeShortcut
- ❌ **Don't hardcode default keys** — let users assign in WME UI to avoid conflicts
- ❌ **Don't store callback functions in localStorage** — re-create them on every load
- ❌ **Don't call unsafeWindow.xxx() from the browser console** — use window.xxx() instead
- ❌ **Don't rely on single-direction converters** — PIE's bidirectional system handles edge cases (special keys, hybrid formats, WazeWrap formats)

---

## Part 9: Common Issues & Solutions

### 9.1 Shortcut Not Working After Reload

**Symptom:** Key is shown in WME UI but pressing it does nothing

**Checklist:**
1. Confirm callback is a valid function reference or inline function
2. Verify _normalizeShortcut() successfully converted saved keys to combo format
3. Check console for "already in use" errors (key conflicts)

**Debug:**
```javascript
wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === 'MyScript_ActionOne');
```

### 9.2 Shortcut Appears Without a Key

**Symptom:** Shortcut exists in WME UI but has no key assigned after reload

**Expected behavior (not a bug):** Shortcuts start unassigned — users assign keys in WME Settings → Keyboard Shortcuts. If the user already assigned keys and they're missing, check:
1. Is beforeunload registered? (checkShortcutsChanged must fire on page close)
2. Is the settings blob in localStorage? (localStorage.getItem('MyScript_Settings'))

### 9.3 "Already in use" Errors in Console

**Symptom:** Console shows "already in use" during registration

**Expected — not a bug:** The try/catch handles this gracefully by registering without a key. The user can assign a different key in WME UI.

### 9.4 Script Initializes Too Early

**Symptom:** createShortcut() throws or shortcut doesn't appear in WME UI

**Solution:** Use the bootstrap polling pattern:

```javascript
unsafeWindow.SDK_INITIALIZED.then(() => {
  wmeSDK = getWmeSdk({ scriptId: 'my-script', scriptName: SCRIPT_NAME });
  bootstrap();
});

function bootstrap() {
  if (!document.getElementById('edit-panel') || !wmeSDK.DataModel.Countries.getTopCountry()) {
    setTimeout(bootstrap, 250);
    return;
  }
  if (wmeSDK.State.isReady) init();
  else wmeSDK.Events.once({ eventName: 'wme-ready' }).then(init);
}
```

### 9.5 Keys Not Converting Correctly

**Debug:**
```javascript
// Test in browser console
_comboToRaw("A+8");   // Should return "4,56"
_rawToCombo("4,56");  // Should return "A+8"
_normalizeShortcut("A+8"); // Should return { raw: "4,56", combo: "A+8" }
```

---

## Part 10: Testing Workflow

### 10.1 First Load

1. Load script → shortcuts appear in Settings → Keyboard Shortcuts (no keys assigned)
2. Assign a key to your shortcut (e.g., Alt+Shift+Z)
3. Press the key → callback triggers
4. Reload the page → key persists (from beforeunload save)
5. Change the key → reload again → new key persists

### 10.2 Conflict Handling

1. Have another script register the same key combo
2. Reload → your shortcut appears with no key (conflict detected, fallback to null)
3. Assign a different key in WME UI → works normally

### 10.3 Dynamic Re-Registration

1. Change a shortcut's associated category/option in your script's settings UI
2. The shortcut description updates (and existing key binding is preserved)
3. Reload → updated shortcut persists with the assigned key

### 10.4 Debug Console

```javascript
// ===== INSPECT SHORTCUTS =====
wmeSDK.Shortcuts.getAllShortcuts();
wmeSDK.Shortcuts.getAllShortcuts().find(s => s.shortcutId === 'MyScript_ActionOne');

// ===== INSPECT SETTINGS =====
JSON.parse(localStorage.getItem('MyScript_Settings'));

// ===== TEST CONVERTERS =====
_comboToRaw("A+8");            // "4,56"
_rawToCombo("4,56");           // "A+8"
_normalizeShortcut("A+8");     // { raw: "4,56", combo: "A+8" }

// ===== RESET SHORTCUT =====
const s = JSON.parse(localStorage.getItem('MyScript_Settings'));
s.ActionOneShortcut = null;
localStorage.setItem('MyScript_Settings', JSON.stringify(s));
// Reload to apply
```

---

## Part 11: Pattern Decision Guide

| Scenario | Approach |
|----------|----------|
| User assigns keys freely — should just work | Unified pattern + beforeunload auto-save |
| Script has dynamic shortcut descriptions | Unified pattern + _refreshItemShortcut |
| Multi-script environment (conflicts likely) | Unified pattern + try/catch conflict handling |
| Zero-friction UX needed | Unified pattern + setInterval polling + beforeunload |

---

## References

- **Live demo:** [WME-Shortcut-Demo.user.js](WME-Shortcut-Demo.user.js) — fully working implementation
- **Production example:** [WME-Place-Interface-Enhancements.user.js](https://greasyfork.org/scripts/26340) — PIE script with 16+ shortcuts
- **WME SDK Docs:** https://www.waze.com/editor/sdk/classes/index.SDK.Shortcuts
- **WME SDK Mirror:** https://kid4rm90s.github.io/WME-SDK-Mirror/beta/latest/output/docs/

