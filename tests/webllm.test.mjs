import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_LOCAL_MODELS, checkWebGPUSupport, isLocalEngineReady, engineState } from '../src/modules/webllm.js';
import { DEF } from '../src/modules/constants.js';

test('WebLLM: curated mobile models list contains Google Gemma models only', () => {
  assert.ok(MOBILE_LOCAL_MODELS['gemma3-1b-it-q4f16_1-MLC']);
  assert.ok(MOBILE_LOCAL_MODELS['gemma-2-2b-it-q4f16_1-MLC']);
  assert.equal(MOBILE_LOCAL_MODELS['SmolLM2-360M-Instruct-q4f16_1-MLC'], undefined);
  assert.equal(MOBILE_LOCAL_MODELS['Qwen2.5-0.5B-Instruct-q4f16_1-MLC'], undefined);

  const gemma3 = MOBILE_LOCAL_MODELS['gemma3-1b-it-q4f16_1-MLC'];
  assert.equal(gemma3.size, '~700 MB');
  assert.equal(gemma3.vram, '711 MB');

  const gemma2 = MOBILE_LOCAL_MODELS['gemma-2-2b-it-q4f16_1-MLC'];
  assert.equal(gemma2.size, '~1.4 GB');
  assert.equal(gemma2.vram, '1.9 GB');
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
