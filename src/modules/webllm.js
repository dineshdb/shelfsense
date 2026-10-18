// @mlc-ai/web-llm is ~6.5 MB minified; loading it statically put the whole
// library in the initial bundle for everyone. It is fetched only when an
// on-device model is actually started or its cache is touched.
let webllm = null;
const loadWebLLM = async () => (webllm ??= await import("@mlc-ai/web-llm"));

export const MOBILE_LOCAL_MODELS = {
  "gemma3-1b-it-q4f16_1-MLC": {
    id: "gemma3-1b-it-q4f16_1-MLC",
    name: "Google Gemma 3 1B (Recommended On-Device)",
    badge: "⭐ Recommended Mobile",
    badgeCls: "b-ok",
    size: "~700 MB",
    vram: "711 MB",
    tag: "Google Gemma 3 · Compact & Multilingual",
    desc: "Google’s state-of-the-art compact open model. Excellent for multi-language grocery billing with low battery draw.",
  },
  "gemma-2-2b-it-q4f16_1-MLC": {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    name: "Google Gemma 2 2B (High Accuracy)",
    badge: "🚀 High Accuracy (Wi-Fi)",
    badgeCls: "b-slow",
    size: "~1.4 GB",
    vram: "1.9 GB",
    tag: "Google Gemma 2 · Full Accuracy",
    desc: "Higher capacity Google Gemma model for complex store analytics. Recommended for 8GB+ RAM phones, tablets, or PC.",
  },
};

let engineInstance = null;
let currentLoadedModelId = null;

export const engineState = {
  status: "idle", // 'idle' | 'downloading' | 'ready' | 'unloaded' | 'error'
  progress: 0,
  text: "",
  error: null,
  modelId: "gemma3-1b-it-q4f16_1-MLC",
};

/**
 * Checks whether WebGPU is supported on this browser/device.
 */
export function checkWebGPUSupport() {
  if (typeof window === "undefined") {
    return { supported: false, reason: "SSR / Server environment" };
  }
  if (!("gpu" in navigator) || !navigator.gpu) {
    return {
      supported: false,
      reason:
        "WebGPU is not supported in this browser. To use on-device local AI on mobile, use Chrome for Android with Vulkan or a WebGPU-enabled browser.",
    };
  }
  return { supported: true, reason: "WebGPU ready" };
}

/**
 * Checks if a given model is already downloaded in browser IndexedDB/CacheStorage.
 */
export async function isModelCached(modelId) {
  if (typeof window === "undefined") return false;
  try {
    return await (await loadWebLLM()).hasModelInCache(modelId);
  } catch (e) {
    console.warn("Cache check failed:", e);
    return false;
  }
}

/**
 * Loads and initializes the WebLLM engine with progress callback.
 */
export async function initWebLLMEngine(modelId, onProgress) {
  const gpuCheck = checkWebGPUSupport();
  if (!gpuCheck.supported) {
    engineState.status = "error";
    engineState.error = gpuCheck.reason;
    if (onProgress) onProgress(engineState);
    throw new Error(gpuCheck.reason);
  }

  // If already loaded with the same model, return immediately
  if (engineInstance && currentLoadedModelId === modelId && engineState.status === "ready") {
    return engineInstance;
  }

  // If a different model is loaded, unload it first to free VRAM
  if (engineInstance && currentLoadedModelId !== modelId) {
    await unloadWebLLMEngine();
  }

  engineState.status = "downloading";
  engineState.modelId = modelId;
  engineState.progress = 0;
  engineState.text = "Initializing WebGPU...";
  engineState.error = null;
  if (onProgress) onProgress(engineState);

  // Configure overrides so only context_window_size is positive, avoiding WindowSizeConfigurationError
  const { CreateMLCEngine, prebuiltAppConfig } = await loadWebLLM();
  const customAppConfig = {
    ...prebuiltAppConfig,
    model_list: (prebuiltAppConfig?.model_list || []).map((m) => ({
      ...m,
      overrides: {
        ...m.overrides,
        sliding_window_size: -1,
      },
    })),
  };

  const chatOpts = {
    sliding_window_size: -1,
  };

  try {
    engineInstance = await CreateMLCEngine(
      modelId,
      {
        appConfig: customAppConfig,
        initProgressCallback: (report) => {
          engineState.progress = Math.round(report.progress * 100);
          engineState.text = report.text || `Loading model weights (${engineState.progress}%)...`;
          if (onProgress) onProgress(engineState);
        },
      },
      chatOpts,
    );

    currentLoadedModelId = modelId;
    engineState.status = "ready";
    engineState.progress = 100;
    engineState.text = "🟢 Local Model Active (Zero Cost · 100% Offline)";
    if (onProgress) onProgress(engineState);
    return engineInstance;
  } catch (err) {
    console.error("WebLLM init failed:", err);
    engineState.status = "error";
    engineState.error = err.message || "Failed to initialize WebGPU model";
    engineState.text = "Initialization error: " + (err.message || "Check WebGPU");
    if (onProgress) onProgress(engineState);
    throw err;
  }
}

/**
 * Unloads the model from WebGPU memory, freeing 100% of RAM/VRAM.
 */
export async function unloadWebLLMEngine() {
  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch (e) {
      console.warn("Error during engine unload:", e);
    }
    engineInstance = null;
  }
  currentLoadedModelId = null;
  engineState.status = "unloaded";
  engineState.progress = 0;
  engineState.text = "Model unloaded (Memory freed)";
  return true;
}

/**
 * Completely removes the downloaded model weights from browser storage.
 */
export async function deleteLocalModelStorage(modelId) {
  await unloadWebLLMEngine();
  try {
    await (await loadWebLLM()).deleteModelAllInfoInCache(modelId);
    return true;
  } catch (e) {
    console.warn("Failed to delete model cache:", e);
    return false;
  }
}

/**
 * Returns whether an on-device local engine is currently ready to serve queries.
 */
export function isLocalEngineReady() {
  return engineInstance !== null && engineState.status === "ready";
}

/**
 * Parses a cashier voice command using the local on-device WebLLM model.
 */
export async function webllmParseVoiceCommand(text, productCatalog = []) {
  if (!isLocalEngineReady()) {
    throw new Error("Local WebLLM engine is not loaded");
  }

  const catalogContext =
    productCatalog && productCatalog.length
      ? productCatalog.slice(0, 30).join(", ")
      : "Common grocery items";

  const systemPrompt = `You are a grocery store cashier assistant. Parse retail sales commands into JSON.
Store Catalog Sample: ${catalogContext}.
Return ONLY a valid JSON object matching this schema without markdown:
{
  "customer": "Customer Name or null",
  "paymentMode": "cash" or "khata",
  "items": [
    {
      "product": "catalog item name or closest matching product",
      "heard": "exact word spoken",
      "name": "item name",
      "qty": 1,
      "unit": "kg" | "g" | "L" | "ml" | "unit" | "pack",
      "intent": "sale" or "restock"
    }
  ]
}`;

  let completion;
  try {
    completion = await engineInstance.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });
  } catch (err) {
    if (err && err.message && err.message.includes("Model not loaded")) {
      engineState.status = "unloaded";
      engineInstance = null;
    }
    throw err;
  }

  const raw = completion.choices?.[0]?.message?.content || "{}";
  let clean = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) clean = jsonMatch[0];
  let parsed = {};
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    try {
      const relaxed = clean.replace(/,\s*([\]}])/g, "$1");
      parsed = JSON.parse(relaxed);
    } catch (err2) {
      console.warn("Direct and relaxed JSON parse failed on WebLLM output:", clean);
    }
  }
  return parsed;
}
