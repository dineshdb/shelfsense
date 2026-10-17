// ShelfSense AI — State Container & Persistence
import { KEY, DEF } from './constants.js';
import { toast } from './utils.js';

export function loadSavedState() {
  let saved = {};
  try {
    if (typeof localStorage !== 'undefined') {
      saved = JSON.parse(localStorage.getItem(KEY)) || {};
    }
  } catch (e) {}

  const state = {
    products: saved.products || [],
    moves: saved.moves || [],
    khata: saved.khata || {},
    fetchedModels: saved.fetchedModels || null,
    settings: Object.assign({}, DEF, saved.settings || {})
  };

  // Migration: Automatically upgrade deprecated models to gemini-3.8-flash
  if (!state.settings.model || state.settings.model === 'gemini-2.5-flash' || state.settings.model === 'gemini-2.0-flash' || state.settings.model === 'gemini-1.5-flash') {
    state.settings.model = 'gemini-3.8-flash';
  }

  return state;
}

export const S = loadSavedState();

export const U = {
  tab: 'home',
  scan: {
    images: [],
    image: null,
    activeIdx: 0,
    dets: [],
    busy: false,
    status: '',
    camOn: false,
    engine: '',
    mode: 'shelf',
    rcpt: null,
    barcode: null,
    processing: {
      active: false,
      current: 0,
      total: 0,
      totalProducts: 0,
      totalUnits: 0
    }
  },
  voice: {
    transcript: '',
    busy: false,
    bill: [],
    recording: false,
    rec: null,
    customer: '',
    paymentMode: 'cash',
    view: 'bill',
    handsFree: false,
    statusMsg: ''
  },
  inv: {
    q: '',
    cat: 'All',
    sort: 'name'
  },
  ai: {
    busy: false,
    text: ''
  },
  setup: {
    mode: 'gemini',
    busy: false,
    msg: ''
  },
  edit: null
};

export const set = () => S.settings;

export const prod = id => S.products.find(p => p.id === id);

export const findByBarcode = code => {
  if (!code) return null;
  const c = String(code).trim().toLowerCase();
  return S.products.find(p =>
    (p.barcode && String(p.barcode).trim().toLowerCase() === c) ||
    (p.aliases && p.aliases.some(a => String(a).trim().toLowerCase() === c))
  ) || null;
};

export const save = (cloud = true) => {
  S.savedAt = Date.now();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(S));
    }
  } catch (e) {
    toast('Storage full — export your data', 'err');
  }
  if (cloud && typeof window !== 'undefined' && window.__cloudPut) {
    window.__cloudPut();
  }
};
