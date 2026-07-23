// ==UserScript==
// @name         WME Keyboard Shortcut Demo - Unified Pattern
// @namespace    https://github.com/kid4rm90s/WME-Shortcut-Demo
// @version      2.1.0
// @description  Reference implementation of user-customizable keyboard shortcuts using PIE-style unified pattern
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
 * WME KEYBOARD SHORTCUT DEMO — Unified Pattern
 *
 * Uses the PIE-style data-driven approach:
 * - Single _shortcutDefs array -> one registration loop
 * - No hardcoded default keys (null to avoid conflicts)
 * - {raw, combo} normalization for reliable persistence
 * - beforeunload + setInterval auto-save
 * - try/catch conflict handling
 *
 * USAGE:
 * 1. Load this script in WME
 * 2. Go to Settings -> Keyboard Shortcuts
 * 3. Assign keys to "Demo: Action 1" through "Demo: Action 4"
 * 4. Keys persist automatically on page reload
 */

(function () {
  'use strict';

  const SCRIPT_NAME = 'Shortcut Demo';
  const STORAGE_KEY = 'WMEShortcutDemo_Settings';

  let wmeSDK = null;

  // ===================================================================
  // PART 1: FORMAT CONVERTERS (PIE-style bidirectional system)
  // ===================================================================

  const _KEYCODE_TO_CHAR = {
    65:'A',66:'B',67:'C',68:'D',69:'E',70:'F',71:'G',72:'H',73:'I',74:'J',75:'K',76:'L',
    77:'M',78:'N',79:'O',80:'P',81:'Q',82:'R',83:'S',84:'T',85:'U',86:'V',87:'W',88:'X',
    89:'Y',90:'Z',
    48:'0',49:'1',50:'2',51:'3',52:'4',53:'5',54:'6',55:'7',56:'8',57:'9',
    112:'F1',113:'F2',114:'F3',115:'F4',116:'F5',117:'F6',
    118:'F7',119:'F8',120:'F9',121:'F10',122:'F11',123:'F12',
    32:'Space',13:'Enter',9:'Tab',27:'Esc',8:'Backspace',46:'Delete',
    36:'Home',35:'End',33:'PageUp',34:'PageDown',45:'Insert',
    37:'←',38:'↑',39:'→',40:'↓',
    188:',',190:'.',191:'/',186:';',222:"'",219:'[',221:']',220:'\\',189:'-',187:'=',192:'',
  };

  const _CHAR_TO_KEYCODE = Object.fromEntries(
    Object.entries(_KEYCODE_TO_CHAR).map(([code, char]) => [char.toUpperCase(), Number(code)])
  );

  const _MOD_CHAR_TO_VAL = { C: 1, S: 2, A: 4 };

  function _comboToRaw(str) {
    if (!str || str === '' || str === '-1' || str === 'None') return null;
    if (/^\d+,-?\d+$/.test(str)) {
      const keyCode = parseInt(str.split(',')[1], 10);
      return keyCode < 0 ? null : str;
    }
    const upperStr = String(str).toUpperCase();
    if (/^[A-Z0-9]$/.test(upperStr)) return '0,' + upperStr.charCodeAt(0);
    if (_CHAR_TO_KEYCODE[upperStr] !== undefined) return '0,' + _CHAR_TO_KEYCODE[upperStr];

    const letterMatch = upperStr.match(/^([ACS]+)\+([A-Z0-9])$/);
    if (letterMatch) {
      const modValue = letterMatch[1].split('').reduce((acc, char) => acc | (_MOD_CHAR_TO_VAL[char] || 0), 0);
      return modValue + ',' + letterMatch[2].charCodeAt(0);
    }
    const numericMatch = upperStr.match(/^([ACS]+)\+(\d+)$/);
    if (numericMatch) {
      const modValue = numericMatch[1].split('').reduce((acc, char) => acc | (_MOD_CHAR_TO_VAL[char] || 0), 0);
      return modValue + ',' + numericMatch[2];
    }
    const specialMatch = upperStr.match(/^([ACS]+)\+(.+)$/);
    if (specialMatch && _CHAR_TO_KEYCODE[specialMatch[2]] !== undefined) {
      const modValue = specialMatch[1].split('').reduce((acc, char) => acc | (_MOD_CHAR_TO_VAL[char] || 0), 0);
      return modValue + ',' + _CHAR_TO_KEYCODE[specialMatch[2]];
    }
    return null;
  }

  function _rawToCombo(str) {
    const raw = _comboToRaw(str);
    if (!raw) return null;
    const parts = raw.split(',');
    const modValue = parseInt(parts[0], 10);
    const keyCode = parseInt(parts[1], 10);
    const keyChar = _KEYCODE_TO_CHAR[keyCode] || String(keyCode);
    let modifiers = '';
    if (modValue & 1) modifiers += 'C';
    if (modValue & 2) modifiers += 'S';
    if (modValue & 4) modifiers += 'A';
    return modifiers ? modifiers + '+' + keyChar : keyChar;
  }

  function _normalizeShortcut(value) {
    const src = value && typeof value === 'object' ? (value.raw ?? value.combo) : value;
    const raw = _comboToRaw(src);
    const combo = _rawToCombo(raw);
    return { raw: raw, combo: combo };
  }

  // ===================================================================
  // PART 2: SHORTCUT DEFINITIONS (data-driven array)
  // ===================================================================

  const _shortcutDefs = [
    {
      id: 'WMEShortcutDemo_Action1',
      description: 'Demo: Action 1 - Console log',
      settingsKey: 'Action1Shortcut',
      callback: function () {
        console.log('[DEMO] Action 1 triggered!');
        if (window.WazeToastr) WazeToastr.Alerts.info(SCRIPT_NAME, 'Action 1 executed!');
      },
    },
    {
      id: 'WMEShortcutDemo_Action2',
      description: 'Demo: Action 2 - Console log',
      settingsKey: 'Action2Shortcut',
      callback: function () {
        console.log('[DEMO] Action 2 triggered!');
        if (window.WazeToastr) WazeToastr.Alerts.info(SCRIPT_NAME, 'Action 2 executed!');
      },
    },
    {
      id: 'WMEShortcutDemo_Action3',
      description: 'Demo: Action 3 - Console log',
      settingsKey: 'Action3Shortcut',
      callback: function () {
        console.log('[DEMO] Action 3 triggered!');
        if (window.WazeToastr) WazeToastr.Alerts.info(SCRIPT_NAME, 'Action 3 executed!');
      },
    },
    {
      id: 'WMEShortcutDemo_Action4',
      description: 'Demo: Action 4 - Console log',
      settingsKey: 'Action4Shortcut',
      callback: function () {
        console.log('[DEMO] Action 4 triggered!');
        if (window.WazeToastr) WazeToastr.Alerts.info(SCRIPT_NAME, 'Action 4 executed!');
      },
    },
  ];

  // ===================================================================
  // PART 3: LEGACY KEY MIGRATION (from pre-SDK or flat-string formats)
  // ===================================================================

  /**
   * Migrate shortcut keys from a legacy localStorage blob to the new
   * {raw, combo} format used by the unified pattern.
   *
   * Handles two migration scenarios:
   *   1. Flat raw strings (e.g. "4,56") → normalized {raw, combo} objects
   *   2. Renamed settings keys (e.g. old "Action1" → new "Action1Shortcut")
   *
   * @param {Object} legacyMap - Map of { legacySettingsKey: currentSettingsKey }
   * @param {string} [legacyStorageKey] - Legacy localStorage key to read from.
   *        If omitted, reads from the current STORAGE_KEY.
   * @returns {boolean} True if any legacy data was migrated
   */
  function _migrateLegacyShortcuts(legacyMap, legacyStorageKey) {
    const sourceKey = legacyStorageKey || STORAGE_KEY;
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(sourceKey));
      if (!raw || typeof raw !== 'object') return false;
    } catch (e) {
      return false;
    }

    let migrated = false;

    for (const [legacyKey, currentKey] of Object.entries(legacyMap)) {
      const legacyValue = raw[legacyKey];
      if (legacyValue === undefined || legacyValue === null) continue;

      // Skip if current settings already has a non-null value (don't overwrite)
      if (settings[currentKey] && settings[currentKey].combo !== null) continue;

      // Normalize handles flat strings, raw "4,56", combo "A+8",
      // or already-normalized {raw, combo} objects
      settings[currentKey] = _normalizeShortcut(legacyValue);
      migrated = true;
      console.log('[DEMO] Migrated legacy key "' + legacyKey + '" → ' + currentKey + ': ' + JSON.stringify(settings[currentKey]));
    }

    return migrated;
  }

  /**
   * Scan the current settings object for any shortcut values that are still
   * flat strings (legacy format) and normalize them to {raw, combo}.
   * This catches mixed-format blobs where some values were already migrated
   * and others were not.
   */
  function _normalizeAllShortcutValues() {
    for (const key of Object.keys(defaultSettings)) {
      settings[key] = _normalizeShortcut(settings[key]);
    }
  }

  // ===================================================================
  // PART 4: SETTINGS PERSISTENCE
  // ===================================================================

  var settings = {};

  const defaultSettings = {
    Action1Shortcut: null,
    Action2Shortcut: null,
    Action3Shortcut: null,
    Action4Shortcut: null,
  };

  function loadSettings(firstCall) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      Object.assign(settings, defaultSettings, saved);
    } catch (error) {
      Object.assign(settings, defaultSettings);
    }

    // === LEGACY MIGRATION (firstCall only — runs once per page load) ===
    // Keeps migrations from re-executing on re-initializations within the
    // same session. Configure the mapping for your script:
    if (firstCall) {
      _migrateLegacyShortcuts(
        { oldAction1: 'Action1Shortcut', oldAction2: 'Action2Shortcut' },
        'OldScript_Settings'
      );
    }

    // Always normalize to ensure consistent {raw, combo} format
    _normalizeAllShortcutValues();
  }

  function saveSettings() {
    const toSave = {};
    for (const key of Object.keys(defaultSettings)) {
      toSave[key] = settings[key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    console.log('[DEMO] Settings saved');
  }

  // ===================================================================
  // PART 5: SHORTCUT REGISTRATION
  // ===================================================================

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
        if (String(error).indexOf('already in use') !== -1) {
          console.warn('[DEMO] Key conflict for ' + shortcutDef.id + ' - registering without key');
          settings[shortcutDef.settingsKey] = { raw: null, combo: null };
          try {
            wmeSDK.Shortcuts.createShortcut({
              shortcutId: shortcutDef.id,
              description: shortcutDef.description,
              callback: shortcutDef.callback,
              shortcutKeys: null,
            });
          } catch (error) {
            console.error('[DEMO] Unable to create shortcut: ' + shortcutDef.id + '. ' + error);
          }
        } else {
          console.error('[DEMO] Unable to create shortcut: ' + shortcutDef.id + '. ' + error);
        }
      }
    }

    console.log('[DEMO] Shortcuts initialized - assign keys in Settings > Keyboard Shortcuts');
  }

  // ===================================================================
  // PART 6: PERSISTENCE - beforeunload + setInterval
  // ===================================================================

  function checkShortcutsChanged() {
    let triggerSave = false;
    const shortcuts = wmeSDK.Shortcuts.getAllShortcuts();

    for (let i = 0; i < shortcuts.length; i++) {
      const shortcut = shortcuts[i];
      const matchingDef = _shortcutDefs.find(function (item) { return item.id === shortcut.shortcutId; });
      if (!matchingDef) continue;

      const normalized = _normalizeShortcut(shortcut.shortcutKeys);
      if (settings[matchingDef.settingsKey].combo !== normalized.combo) {
        triggerSave = true;
        break;
      }
    }

    if (triggerSave) {
      for (let i = 0; i < shortcuts.length; i++) {
        const shortcut = shortcuts[i];
        const matchingDef = _shortcutDefs.find(function (item) { return item.id === shortcut.shortcutId; });
        if (matchingDef && matchingDef.settingsKey in settings) {
          settings[matchingDef.settingsKey] = _normalizeShortcut(shortcut.shortcutKeys);
        }
      }
      saveSettings();
    }
  }

  setInterval(checkShortcutsChanged, 5000);
  window.addEventListener('beforeunload', checkShortcutsChanged);

  // ===================================================================
  // PART 7: INITIALIZATION
  // ===================================================================

  unsafeWindow.SDK_INITIALIZED.then(function () {
    console.log('[DEMO] Initializing...');
    wmeSDK = getWmeSdk({
      scriptId: 'wme-shortcut-demo',
      scriptName: SCRIPT_NAME,
    });

    loadSettings(true);  // firstCall = true → runs legacy migrations
    initializeShortcuts();
    console.log('[DEMO] Ready! Assign keys in Settings > Keyboard Shortcuts');
  });

  // Expose for console debugging
  unsafeWindow._demoSettings = settings;
  unsafeWindow._demoGetAllShortcuts = function () { return wmeSDK ? wmeSDK.Shortcuts.getAllShortcuts() : null; };
  unsafeWindow._demoSave = saveSettings;
  unsafeWindow._demoNormalize = _normalizeShortcut;
  unsafeWindow._demoComboToRaw = _comboToRaw;
  unsafeWindow._demoRawToCombo = _rawToCombo;

  // ===== CONSOLE REFERENCE =====
  // Inspect:  _demoGetAllShortcuts()
  // Inspect:  _demoSettings
  // Save:     _demoSave()
  // Reset:    localStorage.removeItem('WMEShortcutDemo_Settings'); location.reload();
  // Test:     _demoNormalize("A+8")   -> { raw: "4,56", combo: "A+8" }
  //           _demoComboToRaw("A+8")  -> "4,56"
  //           _demoRawToCombo("4,56") -> "A+8"

})();

