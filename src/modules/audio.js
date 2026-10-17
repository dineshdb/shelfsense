// ShelfSense AI — Audio Processing & Encoding (PCM16 WAV)

/**
 * Encodes audio chunks into 16 kHz mono PCM16 WAV.
 * MediaRecorder webm/opus is not decodable by many AI speech endpoints;
 * standard 16kHz mono PCM16 RIFF WAV is universally supported.
 *
 * @param {Float32Array[]} chunks Audio float chunks from AudioContext
 * @param {number} sampleRate Source audio context sample rate (e.g. 44100 or 48000)
 * @returns {Uint8Array} Binary WAV buffer
 */
export function encodeWav(chunks, sampleRate) {
  let n = 0;
  for (const c of chunks) n += c.length;
  const all = new Float32Array(n);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.length;
  }
  const dst = 16000;
  const ratio = dst / sampleRate;
  const outLen = Math.max(1, Math.floor(n * ratio));
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i / ratio;
    const i0 = Math.floor(pos);
    const f = pos - i0;
    const a = all[Math.min(i0, n - 1)];
    const b = all[Math.min(i0 + 1, n - 1)];
    const s = Math.max(-1, Math.min(1, a + (b - a) * f));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const buf = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(buf);
  const ws = (off, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i));
  };

  // RIFF header
  ws(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length * 2, true);
  ws(8, 'WAVE');

  // "fmt " chunk
  ws(12, 'fmt ');
  v.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  v.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  v.setUint16(22, 1, true);  // NumChannels (1 = Mono)
  v.setUint32(24, dst, true); // SampleRate (16000)
  v.setUint32(28, dst * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  v.setUint16(32, 2, true);  // BlockAlign (NumChannels * BitsPerSample/8)
  v.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // "data" chunk
  ws(36, 'data');
  v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) {
    v.setInt16(44 + i * 2, pcm[i], true);
  }

  return new Uint8Array(buf);
}

/**
 * Converts a Uint8Array buffer into a base64 string.
 * @param {Uint8Array} u8
 * @returns {string} base64 encoded string
 */
export function b64of(u8) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
