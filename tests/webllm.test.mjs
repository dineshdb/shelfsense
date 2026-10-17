import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LOCAL_MODELS, checkWebGPUSupport, isLocalEngineReady, engineState } from '../src/modules/webllm.js';
import { DEF } from '../src/modules/constants.js';

test('WebLLM: curated mobile models list contains expected lightweight models', () => {
  assert.ok(MOBILE_LOCAL_MODELS['gemma3-1b-it-q4f16_1-MLC']);
  assert.ok(MOBILE_LOCAL_MODELS['SmolLM2-360M-Instruct-q4f16_1-MLC']);
  assert.ok(MOBILE_LOCAL_MODELS['Qwen2.5-0.5B-Instruct-q4f16_1-MLC']);
  assert.ok(MOBILE_LOCAL_MODELS['gemma-2-2b-it-q4f16_1-MLC']);

  const gemma3 = MOBILE_LOCAL_MODELS['gemma3-1b-it-q4f16_1-MLC'];
  assert.equal(gemma3.size, '~700 MB');
  assert.equal(gemma3.vram, '711 MB');

  const smol = MOBILE_LOCAL_MODELS['SmolLM2-360M-Instruct-q4f16_1-MLC'];
  assert.equal(smol.size, '~230 MB');
  assert.equal(smol.vram, '376 MB');
});

test('WebLLM: checkWebGPUSupport safely handles non-browser / non-GPU environments', () => {
  const res = checkWebGPUSupport();
  assert.equal(typeof res.supported, 'boolean');
  assert.ok(res.reason);
});

test('WebLLM: initial engine state is idle and not ready without WebGPU init', () => {
  assert.equal(isLocalEngineReady(), false);
  assert.equal(engineState.status, 'idle');
});

test('WebLLM: DEF constants include localAiEnabled and default model', () => {
  assert.strictEqual(DEF.localAiEnabled, false);
  assert.strictEqual(DEF.localAiModel, 'gemma3-1b-it-q4f16_1-MLC');
});
