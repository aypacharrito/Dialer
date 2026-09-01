import type { AudioProcessor } from "@twilio/voice-sdk";

export type ClearVoiceMode = "natural" | "balanced" | "focus";
export type ClearVoiceEngine = "speex" | "rnnoise" | "gtcrn" | "adaptive";

export type ClearVoiceMetrics = {
  inputLevel: number;
  outputLevel: number;
  reduction: number;
  voiceDetected: boolean;
  engine?: ClearVoiceEngine;
};

export type ClearVoiceEngineInfo = {
  engine: ClearVoiceEngine;
  label: string;
  description: string;
};

type DestroyableAudioWorkletNode = AudioWorkletNode & { destroy?: () => void };

const ASSET_ROOT = "/clearvoice";
const binaryCache = new Map<string, Promise<ArrayBuffer>>();

export const clearVoiceModeLabels: Record<ClearVoiceMode, string> = {
  natural: "Natural",
  balanced: "Balanced",
  focus: "Max focus",
};

const engineInfo: Record<ClearVoiceMode, ClearVoiceEngineInfo> = {
  natural: {
    engine: "speex",
    label: "Speex voice cleanup",
    description: "Low-latency spectral cleanup that preserves a natural voice.",
  },
  balanced: {
    engine: "rnnoise",
    label: "RNNoise neural",
    description: "Neural speech isolation tuned for everyday offices and home calls.",
  },
  focus: {
    engine: "gtcrn",
    label: "GTCRN neural focus",
    description: "Stronger neural isolation for cars, crowds, fans, and loud spaces.",
  },
};

export function clearVoiceEngineForMode(mode: ClearVoiceMode): ClearVoiceEngine {
  return engineInfo[mode].engine;
}

export function clearVoiceEngineInfo(mode: ClearVoiceMode): ClearVoiceEngineInfo {
  return engineInfo[mode];
}

export function supportsClearVoice() {
  if (typeof window === "undefined") return false;
  return Boolean(window.AudioContext && window.WebAssembly && "audioWorklet" in AudioContext.prototype);
}

function assetUrl(name: string) {
  return new URL(`${ASSET_ROOT}/${name}`, window.location.origin).toString();
}

function supportsWasmSimd() {
  return WebAssembly.validate(new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0,
    10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
  ]));
}

function binaryName(engine: ClearVoiceEngine) {
  if (engine === "rnnoise") return supportsWasmSimd() ? "rnnoise-simd.wasm" : "rnnoise.wasm";
  if (engine === "gtcrn") return "gtcrn.wasm";
  return "speex.wasm";
}

async function loadBinary(engine: ClearVoiceEngine) {
  const name = binaryName(engine);
  let pending = binaryCache.get(name);
  if (!pending) {
    pending = fetch(assetUrl(name), { cache: "force-cache" })
      .then(async response => {
        if (!response.ok) throw new Error(`ClearVoice asset ${name} returned ${response.status}.`);
        return response.arrayBuffer();
      })
      .catch(error => {
        // A brief network or deployment hiccup should not poison the cache for
        // the rest of the browser session. Let the next call retry the model.
        binaryCache.delete(name);
        throw error;
      });
    binaryCache.set(name, pending);
  }
  return (await pending).slice(0);
}

export async function warmClearVoice(mode: ClearVoiceMode) {
  if (!supportsClearVoice()) return false;
  const engine = clearVoiceEngineForMode(mode);
  await Promise.all([
    import("@sapphi-red/web-noise-suppressor"),
    loadBinary(engine),
  ]);
  return true;
}

function levelPercent(rmsValue: number) {
  return Math.max(0, Math.min(100, Math.round(rmsValue * 900)));
}

function calculateRms(samples: Float32Array) {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  return Math.sqrt(energy / Math.max(1, samples.length));
}

export class PacificaClearVoiceProcessor implements AudioProcessor {
  readonly mode: ClearVoiceMode;
  engine: ClearVoiceEngine;
  engineLabel: string;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private highPass: BiquadFilterNode | null = null;
  private lowPass: BiquadFilterNode | null = null;
  private suppressor: DestroyableAudioWorkletNode | null = null;
  private noiseGate: AudioNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private metricsTimer: number | undefined;
  private onMetrics?: (metrics: ClearVoiceMetrics) => void;
  private onEngine?: (info: ClearVoiceEngineInfo) => void;

  constructor(
    mode: ClearVoiceMode = "balanced",
    onMetrics?: (metrics: ClearVoiceMetrics) => void,
    onEngine?: (info: ClearVoiceEngineInfo) => void,
  ) {
    this.mode = mode;
    this.engine = clearVoiceEngineForMode(mode);
    this.engineLabel = clearVoiceEngineInfo(mode).label;
    this.onMetrics = onMetrics;
    this.onEngine = onEngine;
  }

  async createProcessedStream(stream: MediaStream): Promise<MediaStream> {
    await this.teardown();
    if (!supportsClearVoice()) throw new Error("Pacifica ClearVoice requires a current Chrome or Edge browser.");

    const context = new AudioContext({ latencyHint: "interactive", sampleRate: 48_000 });
    this.context = context;
    if (context.state === "suspended") await context.resume();

    const source = context.createMediaStreamSource(stream);
    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = this.mode === "natural" ? 70 : this.mode === "balanced" ? 85 : 100;
    highPass.Q.value = 0.72;

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = this.mode === "natural" ? 12_000 : this.mode === "balanced" ? 10_500 : 9_500;
    lowPass.Q.value = 0.55;

    const inputAnalyser = context.createAnalyser();
    const outputAnalyser = context.createAnalyser();
    inputAnalyser.fftSize = 512;
    outputAnalyser.fftSize = 512;

    const { suppressor, noiseGate, info } = await this.createSuppressionNodes(context);
    this.engine = info.engine;
    this.engineLabel = info.label;
    this.onEngine?.(info);

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = this.mode === "focus" ? -21 : -18;
    compressor.knee.value = 18;
    compressor.ratio.value = this.mode === "focus" ? 3 : 2.4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    const destination = context.createMediaStreamDestination();
    source.connect(highPass);
    highPass.connect(inputAnalyser);
    inputAnalyser.connect(suppressor);
    suppressor.connect(noiseGate);
    noiseGate.connect(lowPass);
    lowPass.connect(outputAnalyser);
    outputAnalyser.connect(compressor);
    compressor.connect(destination);

    this.source = source;
    this.highPass = highPass;
    this.lowPass = lowPass;
    this.suppressor = suppressor;
    this.noiseGate = noiseGate;
    this.compressor = compressor;
    this.inputAnalyser = inputAnalyser;
    this.outputAnalyser = outputAnalyser;
    this.destination = destination;
    this.startMetrics();

    // AudioWorklet processors initialize asynchronously. This short warm-up
    // prevents the first syllable of a call from being clipped on slower PCs.
    await new Promise(resolve => window.setTimeout(resolve, 80));
    return destination.stream;
  }

  async destroyProcessedStream(): Promise<void> {
    await this.teardown();
  }

  private async createSuppressionNodes(context: AudioContext) {
    try {
      const library = await import("@sapphi-red/web-noise-suppressor");
      const info = clearVoiceEngineInfo(this.mode);
      const binary = await loadBinary(info.engine);
      const gateModule = context.audioWorklet.addModule(assetUrl("noise-gate-worklet.js"));

      let suppressor: DestroyableAudioWorkletNode;
      if (info.engine === "speex") {
        await Promise.all([gateModule, context.audioWorklet.addModule(assetUrl("speex-worklet.js"))]);
        suppressor = new library.SpeexWorkletNode(context, { wasmBinary: binary, maxChannels: 1 });
      } else if (info.engine === "gtcrn") {
        await Promise.all([gateModule, context.audioWorklet.addModule(assetUrl("gtcrn-worklet.js"))]);
        suppressor = new library.GtcrnWorkletNode(context, { wasmBinary: binary, maxChannels: 1 });
      } else {
        await Promise.all([gateModule, context.audioWorklet.addModule(assetUrl("rnnoise-worklet.js"))]);
        suppressor = new library.RnnoiseWorkletNode(context, { wasmBinary: binary, maxChannels: 1 });
      }

      const gateSettings = this.mode === "natural"
        ? { openThreshold: -70, closeThreshold: -74, holdMs: 180 }
        : this.mode === "balanced"
          ? { openThreshold: -66, closeThreshold: -72, holdMs: 220 }
          : { openThreshold: -62, closeThreshold: -70, holdMs: 260 };
      const noiseGate = new library.NoiseGateWorkletNode(context, { ...gateSettings, maxChannels: 1 });
      return { suppressor, noiseGate, info };
    } catch {
      await context.audioWorklet.addModule(assetUrl("../pacifica-clearvoice-worklet.js"));
      const suppressor = new AudioWorkletNode(context, "pacifica-clearvoice", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { mode: this.mode },
      });
      const noiseGate = context.createGain();
      const info: ClearVoiceEngineInfo = {
        engine: "adaptive",
        label: "Pacifica adaptive fallback",
        description: "Local adaptive speech cleanup used when the neural engine cannot load.",
      };
      return { suppressor, noiseGate, info };
    }
  }

  private startMetrics() {
    if (!this.onMetrics || !this.inputAnalyser || !this.outputAnalyser) return;
    const input = new Float32Array(this.inputAnalyser.fftSize);
    const output = new Float32Array(this.outputAnalyser.fftSize);
    this.metricsTimer = window.setInterval(() => {
      if (!this.inputAnalyser || !this.outputAnalyser) return;
      this.inputAnalyser.getFloatTimeDomainData(input);
      this.outputAnalyser.getFloatTimeDomainData(output);
      const inputRms = calculateRms(input);
      const outputRms = calculateRms(output);
      const reduction = inputRms > 0.0005
        ? Math.max(0, Math.min(95, Math.round((1 - outputRms / inputRms) * 100)))
        : 0;
      this.onMetrics?.({
        inputLevel: levelPercent(inputRms),
        outputLevel: levelPercent(outputRms),
        reduction,
        voiceDetected: outputRms > 0.012,
        engine: this.engine,
      });
    }, 120);
  }

  private async teardown() {
    if (this.metricsTimer !== undefined) window.clearInterval(this.metricsTimer);
    this.metricsTimer = undefined;
    this.suppressor?.destroy?.();
    for (const node of [
      this.source,
      this.highPass,
      this.inputAnalyser,
      this.suppressor,
      this.noiseGate,
      this.lowPass,
      this.outputAnalyser,
      this.compressor,
      this.destination,
    ]) {
      try { node?.disconnect(); } catch {}
    }
    this.destination?.stream.getTracks().forEach(track => track.stop());
    const context = this.context;
    this.source = null;
    this.highPass = null;
    this.lowPass = null;
    this.suppressor = null;
    this.noiseGate = null;
    this.compressor = null;
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.destination = null;
    this.context = null;
    if (context && context.state !== "closed") await context.close().catch(() => undefined);
  }
}
