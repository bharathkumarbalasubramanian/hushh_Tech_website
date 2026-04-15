/**
 * kai - Financial Intelligence Agent
 * Audio utilities for PCM audio processing and playback
 */

// Audio sample rates for input and output
export const PCM_SAMPLE_RATE = 16000; // Input sample rate for Gemini
export const AUDIO_PLAYBACK_RATE = 24000; // Output sample rate from Gemini

/**
 * Creates a PCM blob from input audio data
 * Converts Float32Array to 16-bit PCM format
 */
export const createPcmBlob = (inputData: Float32Array): { mimeType: string; data: string } => {
  // Convert Float32 to Int16
  const pcmData = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    // Clamp values between -1 and 1, then scale to Int16 range
    const s = Math.max(-1, Math.min(1, inputData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Convert to base64
  const uint8Array = new Uint8Array(pcmData.buffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  return {
    mimeType: 'audio/pcm;rate=16000',
    data: base64,
  };
};

/**
 * Converts base64 string to Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Decodes audio data from Uint8Array to AudioBuffer
 * Converts 16-bit PCM to Float32 format for Web Audio API
 */
export const decodeAudioData = async (
  audioData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number
): Promise<AudioBuffer> => {
  // Convert Int16 PCM to Float32
  const int16Array = new Int16Array(audioData.buffer);
  const float32Array = new Float32Array(int16Array.length);

  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 0x8000;
  }

  // Create audio buffer
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Array);

  return audioBuffer;
};

/**
 * Concatenates multiple Uint8Arrays into a single array
 */
export const concatenateUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

/**
 * Creates an audio visualizer analyzer node
 */
export const createAudioAnalyzer = (audioContext: AudioContext): AnalyserNode => {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  return analyser;
};

/**
 * Gets normalized volume from analyzer (0-1 range)
 */
export const getVolumeFromAnalyzer = (analyser: AnalyserNode): number => {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;

  // Normalize to 0-1 range
  return Math.min(1, average / 100);
};
