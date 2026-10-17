// ShelfSense AI — Firebase Cloud Sync Engine
import { $ } from './utils.js';

/**
 * Initializes multi-device cloud synchronization via Firebase Firestore.
 * Anonymous auth + one Firestore doc per device-user.
 * Newest state wins on boot (savedAt); afterwards every save() mirrors to cloud (debounced)
 * and remote writes that are newer than local apply live.
 */
export function initCloudSync({ S, set, DEF, save, render, toast }) {
  window.__cloudPut = null;
  const FB = window.__firebase;
  const cfg = window.FIREBASE_CONFIG || {};
  const pillEl = $('#cloudPill');

  const setPill = (on, label) => {
    if (!pillEl) return;
    pillEl.style.display = '';
    pillEl.className = 'pill ' + (on ? '' : 'off');
    pillEl.innerHTML = '<i></i>' + label;
  };

  if (!FB || !cfg.apiKey) return; // local-only mode: pill stays hidden

  let app;
  try {
    app = FB.initializeApp(cfg);
  } catch (e) {
    return;
  }

  const db = FB.getFirestore(app);
  let timer = null;
  let uid = null;
  let ref = null;
  let applying = false;

  const payload = () => JSON.parse(JSON.stringify({ ...S, settings: { ...S.settings, apiKey: '' } }));

  const push = () => {
    if (!uid || !ref) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      FB.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists() && (snap.data().savedAt || 0) > (S.savedAt || 0)) return;
        tx.set(ref, payload());
      }).catch(() => setPill(false, 'Cloud offline'));
    }, 1200);
  };

  window.__cloudPut = push;
  setPill(false, 'Connecting…');

  FB.signInAnonymously(FB.getAuth(app)).catch(() => setPill(false, 'Local'));

  FB.onAuthStateChanged(FB.getAuth(app), async (u) => {
    if (!u) {
      uid = null;
      setPill(false, 'Local');
      return;
    }
    uid = u.uid;
    ref = FB.doc(db, 'users', uid);
    try {
      const snap = await FB.getDoc(ref);
      if (snap.exists() && (snap.data().savedAt || 0) > (S.savedAt || 0)) {
        const d = snap.data();
        S.products = d.products || [];
        S.moves = d.moves || [];
        S.khata = d.khata || {};
        S.settings = Object.assign({}, DEF, d.settings || {}, { apiKey: set().apiKey });
        save(false);
        render();
        toast('☁️ Loaded newer data from the cloud', 'ok');
      }
      setPill(true, 'Cloud');

      FB.onSnapshot(ref, (doc2) => {
        if (!doc2.exists() || applying) return;
        const d = doc2.data();
        if ((d.savedAt || 0) > (S.savedAt || 0)) {
          applying = true;
          S.products = d.products || [];
          S.moves = d.moves || [];
          S.khata = d.khata || {};
          S.settings = Object.assign({}, DEF, d.settings || {}, { apiKey: set().apiKey });
          save(false);
          render();
          applying = false;
        }
      });
    } catch (e) {
      setPill(false, 'Cloud offline');
    }
  });
}
