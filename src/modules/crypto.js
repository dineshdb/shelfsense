// ShelfSense AI — Client-side AES-GCM Cryptographic Vault
// Encrypts sensitive store credentials (Gemini API keys) using native Web Crypto (AES-GCM-256)
// derived from user authentication UID. Zero plaintext keys are ever sent to Firestore.

const SALT_STRING = 'shelfsense-gemini-cloud-vault-v1';

/**
 * Derives an AES-GCM-256 CryptoKey from a user secret string (e.g. user.uid) via PBKDF2.
 */
async function deriveKey(secret) {
  const enc = new TextEncoder();
  const rawKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'shelfsense-default-seed'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_STRING),
      iterations: 100000,
      hash: 'SHA-256'
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex) {
  if (!hex || typeof hex !== 'string') return new Uint8Array(0);
  const bytes = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Encrypts a plaintext string with AES-GCM-256 using an IV and derived user key.
 * @param {string} plaintext - Plaintext data (e.g. Gemini API Key)
 * @param {string} secret - User identifier / secret (e.g. Firebase user.uid)
 * @returns {Promise<{ iv: string, cipher: string } | null>}
 */
export async function encryptData(plaintext, secret) {
  if (!plaintext || typeof plaintext !== 'string') return null;
  if (!secret) return null;
  try {
    const key = await deriveKey(secret);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encryptedBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    return {
      iv: bufToHex(iv),
      cipher: bufToHex(encryptedBuf)
    };
  } catch (err) {
    console.warn('encryptData error:', err);
    return null;
  }
}

/**
 * Decrypts an AES-GCM ciphertext payload using the derived user key.
 * @param {{ iv: string, cipher: string } | null} payload
 * @param {string} secret - User identifier / secret (e.g. Firebase user.uid)
 * @returns {Promise<string | null>} Decrypted plaintext string or null
 */
export async function decryptData(payload, secret) {
  if (!payload || !payload.iv || !payload.cipher || !secret) return null;
  try {
    const key = await deriveKey(secret);
    const iv = hexToBuf(payload.iv);
    const cipherBuf = hexToBuf(payload.cipher);

    const decryptedBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBuf
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuf);
  } catch (err) {
    console.warn('decryptData error:', err);
    return null;
  }
}
