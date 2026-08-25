import type { AudioProcessor } from "@twilio/voice-sdk";

export type ClearVoiceMode = "natural" | "balanced" | "focus";

export type ClearVoiceMetrics = {
  inputLevel: number;
  outputLevel: number;
  reduction: number;
  voiceDetected: boolean;
};

export const clearVoiceModeLabels: Record<ClearVoiceMode, string> = {
  natural: "Natural",
  balanced: "Balanced",
  focus: "Max focus",
};

export function supportsClearVoice() {
  if (typeof window === "undefined") return false;
  return Boolean(window.AudioContext && "audioWorklet" in AudioContext.prototype);
}

export class PacificaClearVoiceProcessor implements AudioProcessor {
  readonly mode: ClearVoiceMode;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private highPass: BiquadFilterNode | null = null;
  private lowPass: BiquadFilterNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private workletModuleUrl = "";
  private onMetrics?: (metrics: ClearVoiceMetrics) => void;

  constructor(mode: ClearVoiceMode = "balanced", onMetrics?: (metrics: ClearVoiceMetrics) => void) {
    this.mode = mode;
    this.onMetrics = onMetrics;
  }

  async createProcessedStream(stream: MediaStream): Promise<MediaStream> {
    await this.teardown();
    if (!supportsClearVoice()) throw new Error("Pacifica ClearVoice requires a current Chrome or Edge browser.");

    const context = new AudioContext({ latencyHint: "interactive" });
    this.context = context;
    if (context.state === "suspended") await context.resume();
    this.workletModuleUrl = new URL("/pacifica-clearvoice-worklet.js", window.location.origin).toString();
    await context.audioWorklet.addModule(this.workletModuleUrl);

    const source = context.createMediaStreamSource(stream);
    const highPass = context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 85;
    highPass.Q.value = 0.72;

    const lowPass = context.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 10500;
    lowPass.Q.value = 0.55;

    const worklet = new AudioWorkletNode(context, "pacifica-clearvoice", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { mode: this.mode },
    });
    worklet.port.onmessage = event => {
      if (event.data?.type === "metrics" && this.onMetrics) this.onMetrics(event.data.metrics as ClearVoiceMetrics);
    };

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 2.4;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    const destination = context.createMediaStreamDestination();
    source.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(worklet);
    worklet.connect(compressor);
    compressor.connect(destination);

    this.source = source;
    this.highPass = highPass;
    this.lowPass = lowPass;
    this.worklet = worklet;
    this.compressor = compressor;
    this.destination = destination;
    return destination.stream;
  }

  async destroyProcessedStream(): Promise<void> {
    await this.teardown();
  }

  private async teardown() {
    this.worklet?.port.postMessage({ type: "shutdown" });
    for (const node of [this.source, this.highPass, this.lowPass, this.worklet, this.compressor, this.destination]) {
      try { node?.disconnect(); } catch {}
    }
    this.destination?.stream.getTracks().forEach(track => track.stop());
    const context = this.context;
    this.source = null;
    this.highPass = null;
    this.lowPass = null;
    this.worklet = null;
    this.compressor = null;
    this.destination = null;
    this.context = null;
    if (context && context.state !== "closed") await context.close().catch(() => undefined);
  }
}
