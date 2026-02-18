# WME Keyboard Shortcuts - Reference Materials

## Overview

This folder contains **complete, tested, production-ready** implementation of user-customizable keyboard shortcuts for WME Tampermonkey scripts.

All code has been **successfully tested** and confirmed working across page reloads.

---

## Files Included

### 1. **SHORTCUT_IMPLEMENTATION_GUIDE.md**
   **What:** Complete written guide with theory, patterns, and best practices
   
   **Contains:**
   - Core concepts and converter function
   - Implementation patterns (basic, manager class)
   - Multiple shortcuts handling
   - Best practices and common pitfalls
   - Troubleshooting guide
   - Console testing commands
   
   **When to use:** 
   - Read this for understanding the pattern
   - Reference for edge cases
   - Learning the "why" behind the approach

### 2. **WME-Shortcut-Demo.user.js**
   **What:** Standalone working demo script with two shortcuts
   
   **Contains:**
   - Complete userscript structure
   - Converter function implementation
   - Two example shortcuts (Shortcut 1 and Shortcut 2)
   - Global save functions
   - Comments explaining each step
   
   **When to use:**
   - Run this to see it working in action
   - Copy-paste code into your scripts
   - Use as template for new shortcuts
   
   **How to test - Demo Action 1 (Manual Save):**
   1. Install into WME (Tampermonkey)
   2. Go to Settings → Keyboard Shortcuts
   3. Find "Demo Action 1"
   4. Assign custom keys (e.g., Alt+1, Shift+Q)
   5. Run in console: `window.saveDemoShortcut1()`
   6. Reload the page
   7. Your assigned keys should persist and still work!
   
   **How to test - Demo Action 2 (Hardcoded Default + Auto-Save):**
   1. Open browser console (F12 → Console tab)
   2. Go to Settings → Keyboard Shortcuts and find "Demo Action 2"
   3. It already has a default key assigned: **Alt+2** - try pressing it!
   4. Optional: Change the key to something custom (e.g., Shift+X)
   5. Wait 2 seconds → console shows auto-save confirmation
   6. Reload the page
   7. If you changed the key, it will persist automatically; if you didn't change it, it uses Alt+2
   8. Try `window.resetDemoShortcut2()` to reset back to default
   
   **How to test - Demo Action 3 (Hardcoded Default with User Override):**
   1. Open browser console (F12 → Console tab)
   2. Go to Settings → Keyboard Shortcuts and find "Demo Action 3"
   3. It already has a default key assigned: **Alt+9** - try pressing it!
   4. Optional: Change the key to something custom (e.g., Shift+X)
   5. Run in console: `window.saveDemoShortcut3()` to save custom assignment
   6. Reload the page
   7. If you saved a custom key, it will persist; if not, reverts to Alt+9 (hardcoded default)
   8. Try `window.resetDemoShortcut3()` to reset back to default
   
   **How to test - Demo Action 4 (Auto-Save - No Manual Save Needed):**
   1. Open browser console (F12 → Console tab)
   2. Go to Settings → Keyboard Shortcuts and find "Demo Action 4"
   3. Assign any custom key (e.g., Shift+9)
   4. **No manual save needed** - it auto-saves within 2 seconds automatically!
   5. Check console: you'll see `[SHORTCUT4 AUTO-SAVE] Saved: ...` message
   6. Reload the page
   7. Your key assignment persists automatically - no console commands needed!
   8. Try changing the key again and reloading - it will use the new key (auto-saved)
   9. Use `window.resetDemoShortcut4()` if you want to clear the assignment

---

## Quick Start

### For Complete Beginners:

1. **Read**: First 2 sections of `SHORTCUT_IMPLEMENTATION_GUIDE.md`
2. **Install**: `WME-Shortcut-Demo.user.js` into Tampermonkey
3. **Test**: Follow the demo instructions above
4. **Copy**: Extract the parts you need for your script

### For Experienced Developers:

1. **Reference**: `SHORTCUT_IMPLEMENTATION_GUIDE.md` - Part 4 (Multiple Shortcuts Pattern)
2. **Copy**: The converter function and ShortcutManager class
3. **Adapt**: To your script's architecture

---

## The Core Formula

Every implementation follows this pattern:

```
1. Load saved config from localStorage
2. Delete old shortcut (required by WME SDK)
3. Convert numeric format → string format ("4,56" → "A+8")
4. Create shortcut with converted keys (or null for user to assign)
5. When user assigns via UI → save & reload → repeat from step 2
```

---

## Key Technical Details

### Format Conversion
- **WME stores**: `"4,56"` (numeric: modifier bitmask, key code)
- **createShortcut() needs**: `"A+8"` (string: modifiers + key)
- **Solution**: Use `convertNumericShortcutToString()` function

### Modifier Bitmask
```
1 = Shift
2 = Ctrl
4 = Alt
3 = Shift+Ctrl
5 = Shift+Alt
6 = Ctrl+Alt
7 = Shift+Ctrl+Alt
```

### Why Delete Before Create?
- WME SDK requires: delete old → create new
- Without delete, recreation fails silently
- `isShortcutRegistered()` is unreliable after reload
- Solution: Always delete with try-catch (ignore first-load errors)

---

## Common Use Cases

### Single Shortcut (Simple Script)
→ Use the basic pattern from `WME-Shortcut-Demo.user.js` (Shortcut 1)

### Multiple Shortcuts (Complex Script)
→ Use the ShortcutManager class from `SHORTCUT_IMPLEMENTATION_GUIDE.md` Part 4

### Existing Script Enhancement
→ Extract just the converter function + initialization logic

---

## Proven Working Examples

### Test Results ✅
```
Assign Alt+8 via WME UI
↓
Save config: "4,56"
↓
Page reload
↓
Convert "4,56" → "A+8"
↓
Press Alt+8 → Callback triggers ✓
```

### What We Verified
- ✅ Empty shortcuts (null) show in WME UI
- ✅ User can assign keys via WME Settings
- ✅ Numeric format persists in localStorage
- ✅ Conversion back to string works correctly
- ✅ Shortcuts work after reload with same keys
- ✅ Callbacks reattach properly
- ✅ Works with WazeToastr notifications

---

## Repository Structure

```
WMESDK-KEYBOARD-SHORTCUT-IMPLEMENTATION-GUIDE/
├── SHORTCUT_IMPLEMENTATION_GUIDE.md      ← Read this first
├── WME-Shortcut-Demo.user.js             ← Test this
└── (This file)
```

---

## Support & Questions

If questions arise while implementing:

1. **Check**: `SHORTCUT_IMPLEMENTATION_GUIDE.md` - Part 7 (Troubleshooting)
2. **Test**: Run `WME-Shortcut-Demo.user.js` with your debugging
3. **Debug**: Use console.log statements - they appear in browser devtools

---

## License

These reference materials are provided as educational resources for WME script development.

Feel free to:
- ✅ Copy code into your scripts
- ✅ Modify for your needs
- ✅ Share with other developers
- ✅ Use in open-source projects

---

## Summary

**You have everything needed to implement user-customizable keyboard shortcuts in WME scripts:**

| Need | File |
|------|------|
| Understand the pattern | `SHORTCUT_IMPLEMENTATION_GUIDE.md` |
| See working code | `WME-Shortcut-Demo.user.js` |
| Test in WME | Install demo script above |
| Implement in your script | Copy `convertNumericShortcutToString()` + pattern |

**That's it! The pattern is proven, tested, and ready for production use.** 🚀
