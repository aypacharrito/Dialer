const CLEARVOICE_MODES = {
  natural: { threshold: 1.5, floor: 0.34, attack: 0.32, release: 0.04, hangover: 48 },
  balanced: { threshold: 1.82, floor: 0.14, attack: 0.4, release: 0.027, hangover: 62 },
  focus: { threshold: 2.12, floor: 0.055, attack: 0.48, release: 0.019, hangover: 76 },
};

class PacificaClearVoiceWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.config = CLEARVOICE_MODES[options.processorOptions?.mode] || CLEARVOICE_MODES.balanced;
    this.noiseFloor = 0.0075;
    this.gain = 1;
    this.hangover = 0;
    this.frame = 0;
    this.previousInput = 0;
    this.previousOutput = 0;
    this.active = true;
    this.port.onmessage = event => { if (event.data?.type === "shutdown") this.active = false; };
  }

  process(inputs, outputs) {
    if (!this.active) return false;
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.length || !output?.length) return true;
    const source = input[0];
    const target = output[0];
    if (!source) { target.fill(0); return true; }

    let energy = 0;
    let crossings = 0;
    let last = source[0] || 0;
    for (let i = 0; i < source.length; i++) {
      const sample = source[i];
      energy += sample * sample;
      if ((sample >= 0) !== (last >= 0)) crossings++;
      last = sample;
    }
    const rms = Math.sqrt(energy / source.length);
    const ratio = rms / Math.max(this.noiseFloor, 0.00035);
    const crossingRate = crossings / source.length;
    const speechShape = crossingRate > 0.015 && crossingRate < 0.48;
    const voiceDetected = (ratio > this.config.threshold && speechShape) || rms > 0.035;

    if (voiceDetected) this.hangover = this.config.hangover;
    else if (this.hangover > 0) this.hangover--;
    const voiceOpen = voiceDetected || this.hangover > 0;

    if (!voiceOpen || rms < this.noiseFloor * 1.35) {
      const candidate = Math.min(0.045, Math.max(0.00025, rms));
      const learnRate = rms < this.noiseFloor * 2.2 ? 0.018 : 0.002;
      this.noiseFloor += (candidate - this.noiseFloor) * learnRate;
    }

    const confidence = Math.max(0, Math.min(1, (ratio - 1) / Math.max(0.4, this.config.threshold - 0.7)));
    const targetGain = voiceOpen ? Math.max(0.72, confidence) : this.config.floor + confidence * (0.46 - this.config.floor);
    const smoothing = targetGain > this.gain ? this.config.attack : this.config.release;
    this.gain += (targetGain - this.gain) * smoothing;

    let outputEnergy = 0;
    for (let i = 0; i < target.length; i++) {
      const sample = source[i] || 0;
      const dcBlocked = sample - this.previousInput + 0.995 * this.previousOutput;
      this.previousInput = sample;
      this.previousOutput = dcBlocked;
      const cleaned = dcBlocked * this.gain;
      target[i] = cleaned;
      outputEnergy += cleaned * cleaned;
    }

    this.frame++;
    if (this.frame % 12 === 0) {
      const outputRms = Math.sqrt(outputEnergy / target.length);
      this.port.postMessage({
        type: "metrics",
        metrics: {
          inputLevel: Math.min(100, Math.round(rms * 820)),
          outputLevel: Math.min(100, Math.round(outputRms * 820)),
          reduction: Math.max(0, Math.min(95, Math.round((1 - this.gain) * 100))),
          voiceDetected: voiceOpen,
        },
      });
    }
    return true;
  }
}

registerProcessor("pacifica-clearvoice", PacificaClearVoiceWorklet);
