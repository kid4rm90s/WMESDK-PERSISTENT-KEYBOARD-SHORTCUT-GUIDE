# WME SDK Keyboard Shortcuts — Reference Materials

## Overview

This repository contains **production-ready reference materials** for implementing user-customizable keyboard shortcuts in WME Tampermonkey scripts, based on patterns from [WME Place Interface Enhancements (PIE)](https://greasyfork.org/scripts/26340).

**Key principles:**
- **Data-driven registration** — define shortcuts in an array, register in a single loop
- **No hardcoded defaults** — shortcuts start unassigned (
ull) to avoid key conflicts with other scripts
- **Bidirectional format handling** — normalize all shortcut formats to {raw, combo} for reliable round-tripping
- **Auto-save on page unload** — no manual console saves needed; changes persist automatically

---

## Files

### [SHORTCUT_IMPLEMENTATION_GUIDE.md](SHORTCUT_IMPLEMENTATION_GUIDE.md)
The complete written guide covering theory, patterns, best practices, and troubleshooting.

**Sections:**
- Part 1 — Core Components (initialization, PIE-style 3-function converter system)
- Part 2 — The Unified Pattern (data-driven _shortcutDefs array + single registration loop)
- Part 3 — Persistence (eforeunload + optional setInterval)
- Part 4 — Conflict Handling (try/catch instead of reShortcutKeysInUse())
- Part 5 — Dynamic Re-Registration (live shortcut description updates)
- Part 6 — Key Badge UI (displaying assigned keys in custom panels)
- Part 7 — Adapting for Your Script (copy-paste template)
- Part 8 — Best Practices
- Part 9 — Common Issues & Solutions
- Part 10 — Testing Workflow
- Part 11 — Pattern Decision Guide

### [WME-Shortcut-Demo.user.js](WME-Shortcut-Demo.user.js)
A fully working Tampermonkey demo script demonstrating the unified pattern.

**Features:**
- 4 demo actions defined in a single _shortcutDefs array
- PIE-style 3-function converter system (_comboToRaw, _rawToCombo, _normalizeShortcut)
- Single settings blob in localStorage (WMEShortcutDemo_Settings)
- Auto-save via setInterval(5000) + eforeunload
- try/catch conflict handling with null fallback
- Debug helpers on unsafeWindow for console testing

**How to test:**
1. Install into Tampermonkey and load WME
2. Go to Settings → Keyboard Shortcuts
3. Find "Demo: Action 1" through "Demo: Action 4"
4. Assign keys to any of them (e.g., Alt+Shift+Z)
5. Press the key → callback triggers
6. Reload the page → keys persist automatically

**Console debugging:**
`javascript
_demoGetAllShortcuts()         // List all registered shortcuts
_demoSettings                  // View current settings object
_demoSave()                    // Force save settings
_demoNormalize("A+8")          // Test converter: { raw: "4,56", combo: "A+8" }
localStorage.removeItem('WMEShortcutDemo_Settings'); location.reload();  // Reset all
`

---

## Quick Start

### For Beginners:
1. **Read**: [SHORTCUT_IMPLEMENTATION_GUIDE.md](SHORTCUT_IMPLEMENTATION_GUIDE.md) — Parts 1 and 2 for the core concepts
2. **Install**: [WME-Shortcut-Demo.user.js](WME-Shortcut-Demo.user.js) into Tampermonkey
3. **Test**: Assign keys in WME Settings → Keyboard Shortcuts, reload, verify persistence
4. **Copy**: Use the minimal template from Part 7 of the guide

### For Experienced Developers:
1. **Reference**: The 3-function converter system and _shortcutDefs data array
2. **Copy**: The _normalizeShortcut() function and initializeShortcuts() pattern
3. **Adapt**: To your script's architecture and settings schema

---

## Core Concepts

### Format Handling (Why 3 Functions?)
WME stores shortcuts as numeric format ("4,56" = Alt+8) but createShortcut() requires string format ("A+8"). To make matters worse, the SDK returns inconsistent formats — combo on load, raw after user edits, combo again on reload.

The PIE-style 3-function system handles every format reliably:
- **_comboToRaw(str)** — Converts any format to raw "mod,keycode"
- **_rawToCombo(raw)** — Converts raw to human-readable "A+R"
- **_normalizeShortcut(val)** — Always returns {raw, combo} for consistent comparison and storage

### Data-Driven Registration
Instead of writing a separate function per shortcut (which duplicates boilerplate), define all shortcuts in a _shortcutDefs array and register them in a single loop:

`javascript
const _shortcutDefs = [
  { id: 'MyScript_ActionOne', description: 'Do something', settingsKey: 'ActionOneShortcut', callback: () => doSomething() },
  { id: 'MyScript_ActionTwo', description: 'Do something else', settingsKey: 'ActionTwoShortcut', callback: () => doSomethingElse() },
];
`

### Why No Hardcoded Defaults?
Starting with 
ull keys avoids conflicts with other scripts and WME's built-in shortcuts. Users assign keys in WME Settings → Keyboard Shortcuts, and they persist automatically.

### Conflict Handling
Uses **try/catch** instead of reShortcutKeysInUse(). The latter can produce false positives with WME's own built-in shortcuts, causing the SDK to incorrectly clear user-assigned keys. The try/catch approach only reacts when the SDK actually rejects the registration.

---

## What's Changed (v1 → v2)

| v1 (Original) | v2 (PIE-based) | Why |
|---|---|---|
| 4 separate patterns | Single unified pattern | Less confusion, less boilerplate |
| convertNumericShortcutToString() — one-directional | _comboToRaw() + _rawToCombo() + _normalizeShortcut() — bidirectional | Handles edge cases: special keys, hybrid formats, WazeWrap formats |
| Per-shortcut localStorage keys | Single settings blob | Easier to manage, fewer localStorage entries |
| Hardcoded defaults (Alt+2, Alt+9) | All shortcuts start 
ull | Avoids key conflicts with other scripts |
| setInterval(2000) | setInterval(5000) + eforeunload | More robust — saves on page close too |
| reShortcutKeysInUse() pre-check | try/catch with null fallback | Avoids false positives with WME's built-in shortcuts |
| Per-function boilerplate (4x) | Data-driven array + one loop | DRY, easy to add/remove shortcuts |

---

## Repository Structure

`
WMESDK-KEYBOARD-SHORTCUT-IMPLEMENTATION-GUIDE/
├── README.md                               ← This file
├── SHORTCUT_IMPLEMENTATION_GUIDE.md        ← Read this first
└── WME-Shortcut-Demo.user.js               ← Test this

`

---

## Reference

- **WME SDK Docs:** https://www.waze.com/editor/sdk/classes/index.SDK.Shortcuts
- **WME SDK Mirror:** https://kid4rm90s.github.io/WME-SDK-Mirror/beta/latest/output/docs/
- **PIE Script (production):** https://greasyfork.org/scripts/26340
