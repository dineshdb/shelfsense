// ShelfSense AI — Local-First Google Cloud Sync Engine
// Local-first: all operations save immediately to localStorage.
// Background sync: automatically mirrors to Google Cloud Firestore ONLY when logged in.
// AES-GCM-256 Vault: Gemini API key is client-side encrypted before pushing to cloud.

import { $ } from './utils.js';
import { encryptData, decryptData } from './crypto.js';

export const cloudState = {
  loggedIn: false,
  user: null, // { uid, email, displayName, photoURL }
  syncStatus: 'local_only', // 'synced' | 'syncing' | 'offline' | 'local_only'
  lastSyncedAt: null,
  isSyncing: false,
  error: null
};

let _app = null;
let _auth = null;
let _db = null;
let _ref = null;
let _timer = null;
let _applying = false;
let _ctx = null; // { S, set, DEF, save, render, toast }

const setPill = (on, label) => {
  const pillEl = $('#cloudPill');
  if (!pillEl) return;
  pillEl.style.display = '';
  pillEl.className = 'pill ' + (on ? '' : 'off');
  pillEl.innerHTML = '<i></i>' + label;
};

export function getCloudState() {
  return cloudState;
}

export function initCloudSync(ctx) {
  _ctx = ctx;
  const { S, set, DEF, save, render, toast } = ctx;
  window.__cloudPut = push;

  const FB = window.__firebase;
  const cfg = window.FIREBASE_CONFIG || {};

  if (!FB || !cfg.apiKey) {
    cloudState.syncStatus = 'local_only';
    setPill(false, 'Local-only');
    return;
  }

  try {
    _app = FB.getApps().length ? FB.getApps()[0] : FB.initializeApp(cfg);
    _auth = FB.getAuth(_app);
    _db = FB.getFirestore(_app);
  } catch (e) {
    console.warn('Firebase init error:', e);
    cloudState.syncStatus = 'local_only';
    setPill(false, 'Local-only');
    return;
  }

  // Listen to Google Authentication State Changes
  FB.onAuthStateChanged(_auth, async (u) => {
    if (!u || u.isAnonymous) {
      // User is in Local-First Guest Mode
      cloudState.loggedIn = false;
      cloudState.user = null;
      cloudState.syncStatus = 'local_only';
      _ref = null;
      setPill(false, 'Local-only');
      render();
      return;
    }

    // User is Logged In with Google
    cloudState.loggedIn = true;
    cloudState.user = {
      uid: u.uid,
      email: u.email || '',
      displayName: u.displayName || u.email?.split('@')[0] || 'Store Owner',
      photoURL: u.photoURL || ''
    };
    cloudState.syncStatus = 'syncing';
    setPill(true, 'Syncing…');
    render();

    _ref = FB.doc(_db, 'users', u.uid);

    try {
      const snap = await FB.getDoc(_ref);
      if (snap.exists()) {
        const d = snap.data();
        // If remote has newer data, apply to local
        if ((d.savedAt || 0) > (S.savedAt || 0)) {
          S.products = d.products || [];
          S.moves = d.moves || [];
          S.khata = d.khata || {};

          let restoredApiKey = set().apiKey;
          if (d.encryptedApiKey && u.uid) {
            const dec = await decryptData(d.encryptedApiKey, u.uid);
            if (dec) restoredApiKey = dec;
          }

          S.settings = Object.assign({}, DEF, d.settings || {}, { apiKey: restoredApiKey });
          save(false);
          render();
          toast(`☁️ Synced with Google Account (${u.email})`, 'ok');
        } else {
          // Local is newer: push local state to Google Cloud
          push(true);
        }
      } else {
        // First-time cloud account: push existing local state
        push(true);
      }

      cloudState.syncStatus = 'synced';
      cloudState.lastSyncedAt = Date.now();
      setPill(true, 'Cloud Synced');
      render();

      // Realtime listener for cross-device sync
      FB.onSnapshot(_ref, async (doc2) => {
        if (!doc2.exists() || _applying) return;
        const d2 = doc2.data();
        if ((d2.savedAt || 0) > (S.savedAt || 0)) {
          _applying = true;
          S.products = d2.products || [];
          S.moves = d2.moves || [];
          S.khata = d2.khata || {};

          let restoredApiKey = set().apiKey;
          if (d2.encryptedApiKey && u.uid) {
            const dec = await decryptData(d2.encryptedApiKey, u.uid);
            if (dec) restoredApiKey = dec;
          }

          S.settings = Object.assign({}, DEF, d2.settings || {}, { apiKey: restoredApiKey });
          save(false);
          render();
          _applying = false;
          cloudState.lastSyncedAt = Date.now();
          cloudState.syncStatus = 'synced';
          setPill(true, 'Cloud Synced');
        }
      });
    } catch (err) {
      console.warn('Cloud sync error on auth:', err);
      cloudState.syncStatus = 'offline';
      setPill(false, 'Cloud Offline');
      render();
    }
  });
}

/**
 * Background Push: Debounced push to Firestore ONLY if user is logged in.
 */
export async function push(immediate = false) {
  if (!cloudState.loggedIn || !cloudState.user || !_ref || !_ctx) return;
  const FB = window.__firebase;
  if (!FB || !_db) return;

  const doSync = async () => {
    try {
      cloudState.isSyncing = true;
      cloudState.syncStatus = 'syncing';

      // 1. Encrypt Gemini API key using user's Google UID before sending to cloud
      let encryptedApiKey = null;
      const currentApiKey = _ctx.set().apiKey;
      if (currentApiKey && cloudState.user?.uid) {
        encryptedApiKey = await encryptData(currentApiKey, cloudState.user.uid);
      }

      // 2. Prepare safe payload (never stores plaintext apiKey in Firestore)
      const safeSettings = { ..._ctx.S.settings };
      delete safeSettings.apiKey; // Must not exist in map for Firestore rule: !d.settings.keys().hasAny(['apiKey'])
      const dataPayload = {
        savedAt: _ctx.S.savedAt || Date.now(),
        products: _ctx.S.products || [],
        moves: _ctx.S.moves || [],
        khata: _ctx.S.khata || {},
        settings: safeSettings,
        encryptedApiKey,
        userEmail: cloudState.user?.email || null,
        updatedAt: Date.now()
      };

      await FB.runTransaction(_db, async (tx) => {
        const snap = await tx.get(_ref);
        if (snap.exists() && (snap.data().savedAt || 0) > (_ctx.S.savedAt || 0)) return;
        tx.set(_ref, dataPayload);
      });

      cloudState.isSyncing = false;
      cloudState.syncStatus = 'synced';
      cloudState.lastSyncedAt = Date.now();
      setPill(true, 'Cloud Synced');
    } catch (err) {
      console.warn('Background sync error:', err);
      cloudState.isSyncing = false;
      cloudState.syncStatus = 'offline';
      setPill(false, 'Offline (Saved Locally)');
    }
  };

  clearTimeout(_timer);
  if (immediate) {
    await doSync();
  } else {
    _timer = setTimeout(doSync, 1500);
  }
}

/**
 * Trigger 1-Tap Google Sign-In via Firebase Auth.
 */
export async function loginWithGoogle() {
  const FB = window.__firebase;
  if (!FB || !_auth) {
    _ctx?.toast('Firebase not configured on this device', 'warn');
    return;
  }
  try {
    const provider = new FB.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const res = await FB.signInWithPopup(_auth, provider);
    const u = res.user;
    _ctx?.toast(`🎉 Welcome, ${u.displayName || u.email}! Google Cloud Sync active.`, 'ok', 4000);
  } catch (err) {
    console.error('Google Sign-In failed:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      _ctx?.toast('Sign-in cancelled', 'warn', 2000);
    } else {
      _ctx?.toast('Google Sign-In error: ' + err.message, 'err', 5000);
    }
  }
}

/**
 * Sign out and return to Local-Only mode without losing local data.
 */
export async function logoutCloud() {
  const FB = window.__firebase;
  if (!FB || !_auth) return;
  try {
    await FB.signOut(_auth);
    cloudState.loggedIn = false;
    cloudState.user = null;
    cloudState.syncStatus = 'local_only';
    setPill(false, 'Local-only');
    _ctx?.render();
    _ctx?.toast('🚪 Signed out. Running in local-only mode.', 'ok', 3000);
  } catch (err) {
    _ctx?.toast('Sign-out error: ' + err.message, 'err', 3000);
  }
}

/**
 * Manual "Sync Now" button trigger.
 */
export async function manualSyncNow() {
  if (!_ctx) return;
  _ctx.save(false);

  if (!cloudState.loggedIn) {
    _ctx.toast('💾 Local store data saved. Sign in with Google to enable cloud backup.', 'warn', 4500);
    _ctx.render();
    return;
  }

  _ctx.toast('⚡ Syncing with Google Cloud…', 'ok', 2000);
  await push(true);
  _ctx.render();
  _ctx.toast('✅ Google Cloud sync complete!', 'ok', 3000);
}
