// ==UserScript==
// @name         WME Keyboard Shortcut Demo - User Customizable Keys
// @namespace    https://github.com/kid4rm90s/WME-Shortcut-Demo
// @version      1.0.1
// @description  Reference implementation of user-customizable keyboard shortcuts using WME SDK
// @author       kid4rm90s
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @exclude      https://www.waze.com/user/*editor/*
// @exclude      https://www.waze.com/*/user/*editor/*
// @grant        unsafeWindow
// @require      https://greasyfork.org/scripts/560385/code/WazeToastr.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @license      GNU GPL(v3)
// ==/UserScript==

/**
 * WME KEYBOARD SHORTCUT DEMO
 * 
 * This script demonstrates 4 different patterns for creating user-customizable 
 * keyboard shortcuts that persist across page reloads.
 * 
 * USAGE:
 * 1. Load this script in WME
 * 2. Go to Settings → Keyboard Shortcuts
 * 
 * === SHORTCUT 1: Manual Save (User Customizable) ===
 * - Find "Demo Action 1"
 * - Assign any keys you want (e.g., Alt+1, Shift+Q)
 * - Run in console: window.saveDemoShortcut1()
 * - Reload the page - your keys persist
 * - Reset with: window.resetDemoShortcut1()
 * 
 * === SHORTCUT 2: Hardcoded Default with Auto-Save ===
 * - Find "Demo Action 2" (defaults to Alt+2)
 * - Change to any keys (e.g., Shift+X) - auto-saves every 2 seconds!
 * - Reload the page - your custom keys persist automatically
 * - Manual save also available: window.saveDemoShortcut2()
 * - Reset to default with: window.resetDemoShortcut2()
 * 
 * === SHORTCUT 3: Hardcoded Default with Override ===
 * - Find "Demo Action 3" (defaults to Alt+9)
 * - Change to any keys (e.g., Shift+X)
 * - Run in console: window.saveDemoShortcut3()
 * - Reload the page - your custom keys persist
 * - Reset to default with: window.resetDemoShortcut3()
 * 
 * === SHORTCUT 4: Auto-Save (No Manual Save Needed) ===
 * - Find "Demo Action 4"
 * - Assign any keys - automatically saved every 2 seconds!
 * - Reload the page - your keys persist without any manual save
 * - Manual save also available: window.saveDemoShortcut4()
 * - Reset with: window.resetDemoShortcut4()
 * 
 * REFERENCE: See SHORTCUT_IMPLEMENTATION_GUIDE.md for complete documentation
 */

(function() {
  'use strict';

  let wmeSDK = null;

  // Initialize via SDK_INITIALIZED promise (matches EZRoad Mod pattern)
  unsafeWindow.SDK_INITIALIZED.then(initScript);

  function initScript() {
    console.log('[DEMO] Initializing WME SDK...');
    wmeSDK = getWmeSdk({
      scriptId: 'wme-shortcut-demo',
      scriptName: 'Shortcut Demo',
    });
    initializeShortcuts();
  }

  // ===== CONVERTER FUNCTION =====
  /**
   * Converts WME numeric shortcut format to string format
   * 
   * WME stores shortcuts internally as numeric format: "modifier_bitmask,keyCode"
   * BUT createShortcut() requires string format like "A+8"
   * 
   * Examples:
   *   "4,56" (numeric) → "A+8" (string) = Alt+8
   *   "3,49" (numeric) → "SC+1" (string) = Shift+Ctrl+1
   *   "5,78" (numeric) → "SA+n" (string) = Shift+Alt+N
   * 
   * Modifier Bitmask:
   *   1 = Shift
   *   2 = Ctrl
   *   4 = Alt
   *   3 = Shift+Ctrl
   *   5 = Shift+Alt
   *   6 = Ctrl+Alt
   *   7 = Shift+Ctrl+Alt
   */
  const convertNumericShortcutToString = (numericFormat) => {
    if (!numericFormat || typeof numericFormat !== 'string') return null;
    
    const parts = numericFormat.split(',');
    if (parts.length !== 2) return null;
    
    const modifierBitmask = parseInt(parts[0], 10);
    const keyCode = parseInt(parts[1], 10);
    
    if (isNaN(modifierBitmask) || isNaN(keyCode)) return null;
    
    // Build modifier string
    let modifiers = '';
    if (modifierBitmask & 1) modifiers += 'S'; // Shift
    if (modifierBitmask & 2) modifiers += 'C'; // Ctrl
    if (modifierBitmask & 4) modifiers += 'A'; // Alt
    
    // Convert keyCode to character/representation
    let keyRepresentation;
    if (keyCode >= 48 && keyCode <= 57) {
      // Numbers 0-9 (keycodes 48-57)
      keyRepresentation = String.fromCharCode(keyCode);
    } else if (keyCode >= 65 && keyCode <= 90) {
      // Letters A-Z (keycodes 65-90)
      keyRepresentation = String.fromCharCode(keyCode).toLowerCase();
    } else {
      // Special keys - use keyCode directly
      keyRepresentation = String(keyCode);
    }
    
    // Format: "A+8" or "SA+32"
    if (modifiers) {
      return modifiers + '+' + keyRepresentation;
    } else {
      return keyRepresentation;
    }
  };

  // ===== SHORTCUT 1: Demo Action 1 =====
  const initializeShortcut1 = () => {
    const shortcutId = 'WMEShortcutDemo_Action1';
    const storageKey = 'WMEShortcutDemo_Action1_Config';

    // Step 1: Load previously saved config from localStorage
    let savedConfig = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        savedConfig = JSON.parse(saved);
        console.log(`[SHORTCUT1] Found saved config: ${saved}`);
      }
    } catch (e) {
      console.error(`[SHORTCUT1] Error reading saved config: ${e}`);
    }

    // Step 2: Delete old shortcut if restoring with different keys
    // CRITICAL: Must delete before recreating
    if (savedConfig?.shortcutKeys) {
      try {
        console.log(`[SHORTCUT1] Deleting existing shortcut to replace...`);
        wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
        console.log(`[SHORTCUT1] Successfully deleted old shortcut`);
      } catch (e) {
        // Expected on first load - shortcut doesn't exist yet
        console.log(`[SHORTCUT1] No existing shortcut to delete (expected on first load): ${e}`);
      }
    }

    // Step 3: Convert numeric format to string format if restoring
    let shortcutKeysToUse = null;
    if (savedConfig?.shortcutKeys) {
      const converted = convertNumericShortcutToString(savedConfig.shortcutKeys);
      console.log(`[SHORTCUT1] Converting "${savedConfig.shortcutKeys}" → "${converted}"`);
      shortcutKeysToUse = converted || null;
    }

    // Step 4: Create shortcut
    try {
      console.log(`[SHORTCUT1] Creating shortcut with keys=${shortcutKeysToUse}`);
      
      wmeSDK.Shortcuts.createShortcut({
        shortcutId: shortcutId,
        name: 'Demo Action 1',
        description: 'USER CUSTOMIZABLE - Assign keys, then run: window.saveDemoShortcut1() in console',
        shortcutKeys: shortcutKeysToUse, // null = user assigns via UI
        callback: () => {
          console.log('[SHORTCUT1] Callback triggered!');
          const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
          const thisShortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
          console.log(`[SHORTCUT1] Current config: ${JSON.stringify(thisShortcut)}`);
          
          if (window.WazeToastr?.Alerts) {
            WazeToastr.Alerts.info('WME Demo', 'Demo Action 1 triggered! ✓', false, false, 2000);
          }
        }
      });

      console.log(`[SHORTCUT1] Registered successfully with keys=${shortcutKeysToUse}`);
    } catch (e) {
      console.error(`[SHORTCUT1] Registration failed: ${e}`);
    }

    // Step 5: Create globally accessible save function
    unsafeWindow.saveDemoShortcut1 = function() {
      try {
        console.log('[SHORTCUT1 SAVE] Function called');
        const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
        const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
        
        if (!shortcut) {
          console.error(`[SHORTCUT1 SAVE] Shortcut not found!`);
          return;
        }
        
        // Save the shortcut config
        const configToSave = {
          shortcutId: shortcut.shortcutId,
          name: shortcut.name,
          description: shortcut.description,
          shortcutKeys: shortcut.shortcutKeys,
        };
        
        localStorage.setItem(storageKey, JSON.stringify(configToSave));
        console.log(`[SHORTCUT1 SAVE] Saved: ${JSON.stringify(configToSave)}`);
        
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.success(
            'WME Demo',
            `Action 1 shortcut saved! Keys: ${shortcut.shortcutKeys || '(none)'}`,
            false,
            false,
            3000
          );
        }
      } catch (e) {
        console.error(`[SHORTCUT1 SAVE] Error: ${e}`);
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.error('WME Demo', `Error saving: ${e}`, false, false, 3000);
        }
      }
    };

    // Reset function to clear custom and revert to no keys
    unsafeWindow.resetDemoShortcut1 = function() {
      try {
        localStorage.removeItem(storageKey);
        console.log('[SHORTCUT1 RESET] Cleared custom assignment, will have no keys on next load');
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.info('WME Demo', 'Action 1 reset to no keys. Reload page.', false, false, 2000);
        }
      } catch (e) {
        console.error(`[SHORTCUT1 RESET] Error: ${e}`);
      }
    };

    console.log('[SHORTCUT1] Setup completed. To save: window.saveDemoShortcut1() or reset: window.resetDemoShortcut1()');
  };

  // ===== SHORTCUT 2: Demo Action 2 - Hardcoded Default with Auto-Save =====
  const initializeShortcut2 = () => {
    const shortcutId = 'WMEShortcutDemo_Action2';
    const storageKey = 'WMEShortcutDemo_Action2_Config';
    const HARDCODED_DEFAULT = 'A+2'; // Fallback default

    // Step 1: Load previously saved config from localStorage
    let savedConfig = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        savedConfig = JSON.parse(saved);
        console.log(`[SHORTCUT2] Found saved config: ${saved}`);
      }
    } catch (e) {
      console.error(`[SHORTCUT2] Error reading saved config: ${e}`);
    }

    // Step 2: Delete old shortcut if restoring
    if (savedConfig?.shortcutKeys) {
      try {
        wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
        console.log(`[SHORTCUT2] Deleted old shortcut`);
      } catch (e) {
        console.log(`[SHORTCUT2] No existing shortcut to delete: ${e}`);
      }
    }

    // Step 3: Determine which keys to use - saved custom OR hardcoded default
    let shortcutKeysToUse = null;
    if (savedConfig?.shortcutKeys) {
      // User has saved a custom assignment
      const converted = convertNumericShortcutToString(savedConfig.shortcutKeys);
      console.log(`[SHORTCUT2] Using user-customized keys: ${converted}`);
      shortcutKeysToUse = converted || null;
    } else {
      // First load or user cleared saved config - use hardcoded default
      console.log(`[SHORTCUT2] Using hardcoded default: ${HARDCODED_DEFAULT}`);
      shortcutKeysToUse = HARDCODED_DEFAULT;
    }

    // Step 4: Create shortcut
    try {
      console.log(`[SHORTCUT2] Creating shortcut with keys=${shortcutKeysToUse}`);
      
      wmeSDK.Shortcuts.createShortcut({
        shortcutId: shortcutId,
        name: 'Demo Action 2',
        description: `HARDCODED DEFAULT (${HARDCODED_DEFAULT}) + AUTO-SAVE - Change keys, auto-saves every 2 seconds!`,
        shortcutKeys: shortcutKeysToUse,
        callback: () => {
          console.log('[SHORTCUT2] Callback triggered!');
          const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
          const thisShortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
          console.log(`[SHORTCUT2] Current config: ${JSON.stringify(thisShortcut)}`);
          
          if (window.WazeToastr?.Alerts) {
            WazeToastr.Alerts.info('WME Demo', 'Demo Action 2 triggered! ✓', false, false, 2000);
          }
        }
      });

      console.log(`[SHORTCUT2] Registered successfully with keys=${shortcutKeysToUse}`);
    } catch (e) {
      console.error(`[SHORTCUT2] Registration failed: ${e}`);
    }

    // Step 5: Auto-save mechanism - monitors for changes every 2 seconds
    let lastSavedKeys = savedConfig?.shortcutKeys || null; // Track last saved state
    
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
            lastSavedKeys = shortcut.shortcutKeys; // Update tracked state
            console.log(`[SHORTCUT2 AUTO-SAVE] Saved: ${shortcut.shortcutKeys}`);
            
            if (window.WazeToastr?.Alerts) {
              WazeToastr.Alerts.success(
                'WME Demo',
                `Action 2 auto-saved! Keys: ${shortcut.shortcutKeys}`,
                false,
                false,
                2000
              );
            }
          }
        }
      } catch (e) {
        console.error(`[SHORTCUT2 AUTO-SAVE] Error: ${e}`);
      }
    }, 2000); // Check every 2 seconds

    // Manual save function also available
    unsafeWindow.saveDemoShortcut2 = function() {
      try {
        console.log('[SHORTCUT2 MANUAL SAVE] Function called');
        const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
        const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
        
        if (!shortcut) {
          console.error(`[SHORTCUT2 MANUAL SAVE] Shortcut not found!`);
          return;
        }
        
        const configToSave = {
          shortcutId: shortcut.shortcutId,
          name: shortcut.name,
          description: shortcut.description,
          shortcutKeys: shortcut.shortcutKeys,
        };
        
        localStorage.setItem(storageKey, JSON.stringify(configToSave));
        lastSavedKeys = shortcut.shortcutKeys;
        console.log(`[SHORTCUT2 MANUAL SAVE] Saved: ${JSON.stringify(configToSave)}`);
        
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.success(
            'WME Demo',
            `Action 2 manually saved! Keys: ${shortcut.shortcutKeys || '(none)'}`,
            false,
            false,
            3000
          );
        }
      } catch (e) {
        console.error(`[SHORTCUT2 MANUAL SAVE] Error: ${e}`);
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.error('WME Demo', `Error saving: ${e}`, false, false, 3000);
        }
      }
    };

    // Reset function to clear custom and revert to default
    unsafeWindow.resetDemoShortcut2 = function() {
      try {
        localStorage.removeItem(storageKey);
        console.log('[SHORTCUT2 RESET] Cleared custom assignment, will use default on next load');
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.info('WME Demo', 'Action 2 reset to default. Reload page.', false, false, 2000);
        }
      } catch (e) {
        console.error(`[SHORTCUT2 RESET] Error: ${e}`);
      }
    };

    console.log('[SHORTCUT2] Setup completed. Auto-saves every 2 seconds. Manual save: window.saveDemoShortcut2() or reset to default: window.resetDemoShortcut2()');
  };

  // ===== SHORTCUT 3: Demo Action 3 - Hardcoded Default with User Override =====
  const initializeShortcut3 = () => {
    const shortcutId = 'WMEShortcutDemo_Action3';
    const storageKey = 'WMEShortcutDemo_Action3_Config';
    const HARDCODED_DEFAULT = 'A+9'; // Fallback default

    // Step 1: Load previously saved config from localStorage
    let savedConfig = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        savedConfig = JSON.parse(saved);
        console.log(`[SHORTCUT3] Found saved config: ${saved}`);
      }
    } catch (e) {
      console.error(`[SHORTCUT3] Error reading saved config: ${e}`);
    }

    // Step 2: Delete old shortcut if restoring
    if (savedConfig?.shortcutKeys) {
      try {
        wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
        console.log(`[SHORTCUT3] Deleted old shortcut`);
      } catch (e) {
        console.log(`[SHORTCUT3] No existing shortcut to delete: ${e}`);
      }
    }

    // Step 3: Determine which keys to use - saved custom OR hardcoded default
    let shortcutKeysToUse = null;
    if (savedConfig?.shortcutKeys) {
      // User has saved a custom assignment
      const converted = convertNumericShortcutToString(savedConfig.shortcutKeys);
      console.log(`[SHORTCUT3] Using user-customized keys: ${converted}`);
      shortcutKeysToUse = converted || null;
    } else {
      // First load or user cleared saved config - use hardcoded default
      console.log(`[SHORTCUT3] Using hardcoded default: ${HARDCODED_DEFAULT}`);
      shortcutKeysToUse = HARDCODED_DEFAULT;
    }

    // Step 4: Create shortcut
    try {
      console.log(`[SHORTCUT3] Creating shortcut with keys=${shortcutKeysToUse}`);
      
      wmeSDK.Shortcuts.createShortcut({
        shortcutId: shortcutId,
        name: 'Demo Action 3',
        description: `HARDCODED DEFAULT (${HARDCODED_DEFAULT}) - Change keys, then run: window.saveDemoShortcut3() or reset: window.resetDemoShortcut3()`,
        shortcutKeys: shortcutKeysToUse,
        callback: () => {
          console.log('[SHORTCUT3] Callback triggered!');
          const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
          const thisShortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
          console.log(`[SHORTCUT3] Current config: ${JSON.stringify(thisShortcut)}`);
          
          if (window.WazeToastr?.Alerts) {
            WazeToastr.Alerts.info('WME Demo', 'Demo Action 3 triggered! ✓', false, false, 2000);
          }
        }
      });

      console.log(`[SHORTCUT3] Registered successfully with keys=${shortcutKeysToUse}`);
    } catch (e) {
      console.error(`[SHORTCUT3] Registration failed: ${e}`);
    }

    // Step 5: Create save function for user override
    unsafeWindow.saveDemoShortcut3 = function() {
      try {
        console.log('[SHORTCUT3 SAVE] Function called');
        const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
        const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
        
        if (!shortcut || !shortcut.shortcutKeys) {
          console.error(`[SHORTCUT3 SAVE] Shortcut not found or no keys assigned!`);
          return;
        }
        
        // Save the user's custom assignment
        const configToSave = {
          shortcutId: shortcut.shortcutId,
          name: shortcut.name,
          description: shortcut.description,
          shortcutKeys: shortcut.shortcutKeys,
        };
        
        localStorage.setItem(storageKey, JSON.stringify(configToSave));
        console.log(`[SHORTCUT3 SAVE] Saved user custom assignment: ${JSON.stringify(configToSave)}`);
        
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.success(
            'WME Demo',
            `Action 3 custom assignment saved! Keys: ${shortcut.shortcutKeys}`,
            false,
            false,
            3000
          );
        }
      } catch (e) {
        console.error(`[SHORTCUT3 SAVE] Error: ${e}`);
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.error('WME Demo', `Error saving: ${e}`, false, false, 3000);
        }
      }
    };

    // Reset function to clear custom and revert to default
    unsafeWindow.resetDemoShortcut3 = function() {
      try {
        localStorage.removeItem(storageKey);
        console.log('[SHORTCUT3 RESET] Cleared custom assignment, will use default on next load');
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.info('WME Demo', 'Action 3 reset to default. Reload page.', false, false, 2000);
        }
      } catch (e) {
        console.error(`[SHORTCUT3 RESET] Error: ${e}`);
      }
    };

    console.log('[SHORTCUT3] Setup completed. To save custom: window.saveDemoShortcut3() or reset: window.resetDemoShortcut3()');
  };

  // ===== SHORTCUT 4: Demo Action 4 - Auto-Save =====
  const initializeShortcut4 = () => {
    const shortcutId = 'WMEShortcutDemo_Action4';
    const storageKey = 'WMEShortcutDemo_Action4_Config';

    // Step 1: Load previously saved config from localStorage
    let savedConfig = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        savedConfig = JSON.parse(saved);
        console.log(`[SHORTCUT4] Found saved config: ${saved}`);
      }
    } catch (e) {
      console.error(`[SHORTCUT4] Error reading saved config: ${e}`);
    }

    // Step 2: Delete old shortcut if restoring
    if (savedConfig?.shortcutKeys) {
      try {
        wmeSDK.Shortcuts.deleteShortcut({ shortcutId });
        console.log(`[SHORTCUT4] Deleted old shortcut`);
      } catch (e) {
        console.log(`[SHORTCUT4] No existing shortcut to delete: ${e}`);
      }
    }

    // Step 3: Convert numeric format to string format if restoring
    let shortcutKeysToUse = null;
    if (savedConfig?.shortcutKeys) {
      const converted = convertNumericShortcutToString(savedConfig.shortcutKeys);
      console.log(`[SHORTCUT4] Converting "${savedConfig.shortcutKeys}" → "${converted}"`);
      shortcutKeysToUse = converted || null;
    }

    // Step 4: Create shortcut
    try {
      console.log(`[SHORTCUT4] Creating shortcut with keys=${shortcutKeysToUse}`);
      
      wmeSDK.Shortcuts.createShortcut({
        shortcutId: shortcutId,
        name: 'Demo Action 4',
        description: 'AUTO-SAVE - Assign keys, automatically saved every 2 seconds!',
        shortcutKeys: shortcutKeysToUse,
        callback: () => {
          console.log('[SHORTCUT4] Callback triggered!');
          const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
          const thisShortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
          console.log(`[SHORTCUT4] Current config: ${JSON.stringify(thisShortcut)}`);
          
          if (window.WazeToastr?.Alerts) {
            WazeToastr.Alerts.info('WME Demo', 'Demo Action 4 triggered! ✓', false, false, 2000);
          }
        }
      });

      console.log(`[SHORTCUT4] Registered successfully with keys=${shortcutKeysToUse}`);
    } catch (e) {
      console.error(`[SHORTCUT4] Registration failed: ${e}`);
    }

    // Step 5: Auto-save mechanism - monitors for changes every 2 seconds
    let lastSavedKeys = savedConfig?.shortcutKeys || null; // Track last saved state
    
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
            lastSavedKeys = shortcut.shortcutKeys; // Update tracked state
            console.log(`[SHORTCUT4 AUTO-SAVE] Saved: ${shortcut.shortcutKeys}`);
            
            if (window.WazeToastr?.Alerts) {
              WazeToastr.Alerts.success(
                'WME Demo',
                `Action 4 auto-saved! Keys: ${shortcut.shortcutKeys}`,
                false,
                false,
                2000
              );
            }
          }
        }
      } catch (e) {
        console.error(`[SHORTCUT4 AUTO-SAVE] Error: ${e}`);
      }
    }, 2000); // Check every 2 seconds

    // Manual save function also available
    unsafeWindow.saveDemoShortcut4 = function() {
      try {
        console.log('[SHORTCUT4 MANUAL SAVE] Function called');
        const allShortcuts = wmeSDK.Shortcuts.getAllShortcuts();
        const shortcut = allShortcuts.find(s => s.shortcutId === shortcutId);
        
        if (!shortcut) {
          console.error(`[SHORTCUT4 MANUAL SAVE] Shortcut not found!`);
          return;
        }
        
        const configToSave = {
          shortcutId: shortcut.shortcutId,
          name: shortcut.name,
          description: shortcut.description,
          shortcutKeys: shortcut.shortcutKeys,
        };
        
        localStorage.setItem(storageKey, JSON.stringify(configToSave));
        lastSavedKeys = shortcut.shortcutKeys;
        console.log(`[SHORTCUT4 MANUAL SAVE] Saved: ${JSON.stringify(configToSave)}`);
        
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.success(
            'WME Demo',
            `Action 4 manually saved! Keys: ${shortcut.shortcutKeys || '(none)'}`,
            false,
            false,
            3000
          );
        }
      } catch (e) {
        console.error(`[SHORTCUT4 MANUAL SAVE] Error: ${e}`);
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.error('WME Demo', `Error saving: ${e}`, false, false, 3000);
        }
      }
    };

    // Reset function to clear custom and revert to no keys
    unsafeWindow.resetDemoShortcut4 = function() {
      try {
        localStorage.removeItem(storageKey);
        console.log('[SHORTCUT4 RESET] Cleared custom assignment, will have no keys on next load');
        if (window.WazeToastr?.Alerts) {
          WazeToastr.Alerts.info('WME Demo', 'Action 4 reset to no keys. Reload page.', false, false, 2000);
        }
      } catch (e) {
        console.error(`[SHORTCUT4 RESET] Error: ${e}`);
      }
    };

    console.log('[SHORTCUT4] Setup completed. Auto-saves every 2 seconds. Manual save: window.saveDemoShortcut4() or reset: window.resetDemoShortcut4()');
  };

  // ===== MAIN INITIALIZATION =====
  const initializeShortcuts = () => {
    console.log('[DEMO] Initializing shortcuts...');
    initializeShortcut1();
    initializeShortcut2();
    initializeShortcut3();
    initializeShortcut4();
    
    console.log('[DEMO] ==========================================');
    console.log('[DEMO] WME Keyboard Shortcut Demo Ready!');
    console.log('[DEMO] ==========================================');
    console.log('[DEMO] INSTRUCTIONS:');
    console.log('[DEMO] ');
    console.log('[DEMO] === SHORTCUT 1: Manual Save (User Customizable) ===');
    console.log('[DEMO] 1. Go to Settings → Keyboard Shortcuts');
    console.log('[DEMO] 2. Find "Demo Action 1"');
    console.log('[DEMO] 3. Assign any keys (e.g., Alt+1, Shift+Q)');
    console.log('[DEMO] 4. Run: window.saveDemoShortcut1()');
    console.log('[DEMO] 5. Reload page - your keys persist');
    console.log('[DEMO] ');
    console.log('[DEMO] === SHORTCUT 2: Hardcoded Default + Auto-Save ===');
    console.log('[DEMO] 1. Go to Settings → Keyboard Shortcuts');
    console.log('[DEMO] 2. Find "Demo Action 2" (defaults to Alt+2)');
    console.log('[DEMO] 3. Change to any keys - auto-saves every 2 seconds!');
    console.log('[DEMO] 4. Reload page - your custom keys persist automatically');
    console.log('[DEMO] 5. OR run: window.resetDemoShortcut2() to revert to default');
    console.log('[DEMO] ');
    console.log('[DEMO] === SHORTCUT 3: Hardcoded Default with Override ===');
    console.log('[DEMO] 1. Go to Settings → Keyboard Shortcuts');
    console.log('[DEMO] 2. Find "Demo Action 3" (defaults to Alt+9)');
    console.log('[DEMO] 3. Change to any keys (e.g., Shift+X)');
    console.log('[DEMO] 4. Run: window.saveDemoShortcut3()');
    console.log('[DEMO] 5. Reload page - your custom keys persist');
    console.log('[DEMO] 6. OR run: window.resetDemoShortcut3() to revert to default');
    console.log('[DEMO] ');
    console.log('[DEMO] === SHORTCUT 4: Auto-Save (No Manual Save Needed) ===');
    console.log('[DEMO] 1. Go to Settings → Keyboard Shortcuts');
    console.log('[DEMO] 2. Find "Demo Action 4"');
    console.log('[DEMO] 3. Assign any keys - automatically saved every 2 seconds!');
    console.log('[DEMO] 4. Reload page - your keys persist');
    console.log('[DEMO] 5. No manual save needed!');
    console.log('[DEMO] ');
    console.log('[DEMO] ==========================================');
  };

})();
