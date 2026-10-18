import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptData, decryptData } from '../src/modules/crypto.js';

test('Crypto Vault: encrypts and decrypts Gemini API key cleanly', async () => {
  const secretUid = 'firebase_user_uid_987654321';
  const apiKey = 'AIzaSyDemoKey1234567890SecretToken';

  const encrypted = await encryptData(apiKey, secretUid);
  assert.ok(encrypted, 'Encryption should return payload');
  assert.ok(encrypted.iv, 'Payload must have IV');
  assert.ok(encrypted.cipher, 'Payload must have ciphertext');
  assert.notEqual(encrypted.cipher, apiKey, 'Ciphertext must not be plaintext');

  const decrypted = await decryptData(encrypted, secretUid);
  assert.equal(decrypted, apiKey, 'Decrypted key must match original');
});

test('Crypto Vault: wrong secret fails decryption gracefully without crashing', async () => {
  const secretUid = 'user_correct_123';
  const wrongUid = 'user_wrong_999';
  const secretData = 'ConfidentialStoreSettings';

  const encrypted = await encryptData(secretData, secretUid);
  const decrypted = await decryptData(encrypted, wrongUid);
  assert.equal(decrypted, null, 'Decryption with wrong secret should safely return null');
});

test('Crypto Vault: handles null, empty, or malformed payloads safely', async () => {
  assert.equal(await encryptData('', 'uid'), null);
  assert.equal(await encryptData(null, 'uid'), null);
  assert.equal(await decryptData(null, 'uid'), null);
  assert.equal(await decryptData({ iv: 'bad', cipher: 'junk' }, 'uid'), null);
});
