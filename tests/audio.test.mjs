import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, b64of } from '../src/modules/audio.js';

test('Audio: encodeWav creates a valid 16kHz mono PCM16 WAV file structure', () => {
  // Generate 100ms of 44100Hz audio chunks (4410 samples)
  const chunk1 = new Float32Array(2205);
  const chunk2 = new Float32Array(2205);
  for (let i = 0; i < 2205; i++) {
    chunk1[i] = Math.sin((i / 44100) * 2 * Math.PI * 440);
    chunk2[i] = Math.sin(((i + 2205) / 44100) * 2 * Math.PI * 440);
  }

  const wav = encodeWav([chunk1, chunk2], 44100);
  assert.ok(wav instanceof Uint8Array);
  assert.ok(wav.length > 44);

  // Check RIFF header
  const riff = String.fromCharCode(...wav.slice(0, 4));
  assert.equal(riff, 'RIFF');

  const wave = String.fromCharCode(...wav.slice(8, 12));
  assert.equal(wave, 'WAVE');

  const fmt = String.fromCharCode(...wav.slice(12, 16));
  assert.equal(fmt, 'fmt ');

  const dataTag = String.fromCharCode(...wav.slice(36, 40));
  assert.equal(dataTag, 'data');

  // Check audio format fields via DataView
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  assert.equal(view.getUint16(20, true), 1); // PCM format
  assert.equal(view.getUint16(22, true), 1); // Mono (1 channel)
  assert.equal(view.getUint32(24, true), 16000); // Sample rate 16000 Hz
  assert.equal(view.getUint16(34, true), 16); // 16 bits per sample
});

test('Audio: b64of converts binary buffer into valid base64', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
  const b64 = b64of(bytes);
  assert.equal(b64, 'SGVsbG8=');
});
