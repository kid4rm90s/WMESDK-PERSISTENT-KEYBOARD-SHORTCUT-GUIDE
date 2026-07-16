// ==UserScript==
// @name         WME Keyboard Shortcut Demo - Unified Pattern
// @namespace    https://github.com/kid4rm90s/WME-Shortcut-Demo
// @version      2.0.0
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
    Object.entries(_KEYCODE_TO_CHAR).map(([k, v]) => [v.toUpperCase(), Number(k)])
  );

  const _MOD_CHAR_TO_VAL = { C: 1, S: 2, A: 4 };

  function _comboToRaw(str) {
    if (!str || str === '' || str === '-1' || str === 'None') return null;
    if (/^\d+,-?\d+$/.test(str)) {
      const kc = parseInt(str.split(',')[1], 10);
      return kc < 0 ? null : str;
    }
    const s = String(str).toUpperCase();
    if (/^[A-Z0-9]$/.test(s)) return '0,' + s.charCodeAt(0);
    if (_CHAR_TO_KEYCODE[s] !== undefined) return '0,' + _CHAR_TO_KEYCODE[s];

    const mLetter = s.match(/^([ACS]+)\+([A-Z0-9])$/);
    if (mLetter) {
      const mod = mLetter[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return mod + ',' + mLetter[2].charCodeAt(0);
    }
    const mNumeric = s.match(/^([ACS]+)\+(\d+)$/);
    if (mNumeric) {
      const mod = mNumeric[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return mod + ',' + mNumeric[2];
    }
    const mSpecial = s.match(/^([ACS]+)\+(.+)$/);
    if (mSpecial && _CHAR_TO_KEYCODE[mSpecial[2]] !== undefined) {
      const mod = mSpecial[1].split('').reduce((a, c) => a | (_MOD_CHAR_TO_VAL[c] || 0), 0);
      return mod + ',' + _CHAR_TO_KEYCODE[mSpecial[2]];
    }
    return null;
  }

  function _rawToCombo(str) {
    const raw = _comboToRaw(str);
    if (!raw) return null;
    const parts = raw.split(',');
    const mod = parseInt(parts[0], 10);
    const keyCode = parseInt(parts[1], 10);
    const keyChar = _KEYCODE_TO_CHAR[keyCode] || String(keyCode);
    let mods = '';
    if (mod & 1) mods += 'C';
    if (mod & 2) mods += 'S';
    if (mod & 4) mods += 'A';
    return mods ? mods + '+' + keyChar : keyChar;
  }

  function _normalizeShortcut(val) {
    const src = val && typeof val === 'object' ? (val.raw ?? val.combo) : val;
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
  // PART 3: SETTINGS PERSISTENCE
  // ===================================================================

  var settings = {};

  const defaultSettings = {
    Action1Shortcut: null,
    Action2Shortcut: null,
    Action3Shortcut: null,
    Action4Shortcut: null,
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      Object.assign(settings, defaultSettings, saved);
    } catch (e) {
      Object.assign(settings, defaultSettings);
    }
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
    console.log('[DEMO] Settings saved');
  }

  // ===================================================================
  // PART 4: SHORTCUT REGISTRATION
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
          } catch (err) {
            console.error('[DEMO] Unable to create shortcut: ' + shortcutDef.id + '. ' + err);
          }
        } else {
          console.error('[DEMO] Unable to create shortcut: ' + shortcutDef.id + '. ' + error);
        }
      }
    }

    console.log('[DEMO] Shortcuts initialized - assign keys in Settings > Keyboard Shortcuts');
  }

  // ===================================================================
  // PART 5: PERSISTENCE - beforeunload + setInterval
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
  // PART 6: INITIALIZATION
  // ===================================================================

  unsafeWindow.SDK_INITIALIZED.then(function () {
    console.log('[DEMO] Initializing...');
    wmeSDK = getWmeSdk({
      scriptId: 'wme-shortcut-demo',
      scriptName: SCRIPT_NAME,
    });

    loadSettings();
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

