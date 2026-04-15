/**
 * kai - Financial Intelligence Agent
 * Gemini Live API Service for real-time voice/video financial intelligence
 */

import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, Tool } from '@google/genai';
import { ConnectionState, DecisionCardData, UserPersona, GeminiServiceConfig } from '../types';
import { createPcmBlob, decodeAudioData, PCM_SAMPLE_RATE, AUDIO_PLAYBACK_RATE, base64ToUint8Array } from '../utils/audioUtils';

// Tool Definition for displaying decision cards
const displayDecisionCardDeclaration: FunctionDeclaration = {
  name: 'displayDecisionCard',
  description: 'Displays a visual financial decision card to the user. Use this when you have reached a conclusion or recommendation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      recommendation: { type: Type.STRING, description: 'The core action: Buy, Hold, or Reduce.' },
      confidence: { type: Type.NUMBER, description: 'Confidence percentage (0-100).' },
      fundamental_insight: { type: Type.STRING, description: 'Key insight from the Fundamental Agent. Must be consumer-grade plain English.' },
      sentiment_insight: { type: Type.STRING, description: 'Key insight from the Sentiment Agent.' },
      valuation_insight: { type: Type.STRING, description: 'Key insight from the Valuation Agent (Math/Ratios).' },
      debate_digest: { type: Type.STRING, description: 'A summary of the tension/conflict between the agents.' },
      evidence: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of specific citations, URLs from Google Search results, 10-K sections, or math formulas used.'
      },
      reliability_score: { type: Type.NUMBER, description: 'Score (0-100) based on data availability and source quality.' },
      risk_alignment: { type: Type.STRING, description: 'Suitability (e.g., Low Volatility, Speculative).' },
      target_persona: { type: Type.STRING, description: 'The user persona this is tailored for.' },
      ticker_symbol: { type: Type.STRING, description: 'The stock ticker symbol (e.g., AAPL, NVDA).' },
      current_price: { type: Type.STRING, description: 'Current stock price from real-time search data.' },
      price_change_percentage: { type: Type.STRING, description: 'Percentage change for the day.' },
      scenarios: {
        type: Type.ARRAY,
        description: 'For Professional Advisor only: A list of 2-3 hypothetical scenarios.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            outcome: { type: Type.STRING, description: 'Brief description of what happens.' },
            price_impact: { type: Type.STRING, description: 'Projected price impact.' },
            probability: { type: Type.STRING, description: 'Likelihood.' }
          }
        }
      },
      compliance_stub: { type: Type.STRING, description: 'For Professional Advisor only: A short regulatory note.' }
    },
    required: ['recommendation', 'confidence', 'fundamental_insight', 'sentiment_insight', 'valuation_insight', 'debate_digest', 'evidence', 'reliability_score', 'risk_alignment', 'target_persona', 'ticker_symbol', 'current_price', 'price_change_percentage']
  },
};

const tools: Tool[] = [
  { googleSearch: {} },
  { functionDeclarations: [displayDecisionCardDeclaration] }
];

/**
 * GeminiService - Handles real-time voice/video communication with Gemini AI
 */
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private config: GeminiServiceConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private videoIntervalId: number | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private session: any = null;

  constructor(config: GeminiServiceConfig) {
    this.config = config;
  }

  /**
   * Connect to Gemini Live API with specified persona
   */
  async connect(persona: UserPersona = 'Everyday Investor') {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
        console.error("Gemini API Key not found");
        this.config.onStatusChange("API Key Missing");
        this.config.onConnectionStateChange(ConnectionState.ERROR);
        return;
      }
      this.ai = new GoogleGenAI({ apiKey });

      this.config.onConnectionStateChange(ConnectionState.CONNECTING);
      this.config.onStatusChange(`Initializing ${persona} Protocol...`);

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioContext = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE });
      this.outputAudioContext = new AudioContextClass({ sampleRate: AUDIO_PLAYBACK_RATE });

      try {
        await Promise.all([
          this.inputAudioContext.resume(),
          this.outputAudioContext.resume()
        ]);
      } catch (e) {
        console.warn("Audio Context resume warning:", e);
      }

      this.gainNode = this.outputAudioContext.createGain();
      this.gainNode.connect(this.outputAudioContext.destination);
      this.analyser = this.outputAudioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode.connect(this.analyser);

      // Get Media Stream
      this.config.onStatusChange("Accessing sensory feeds...");

      const mediaStreamPromise = navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        }
      }).then(async stream => {
        this.stream = stream;
        if (this.config.videoElement) {
          this.config.videoElement.srcObject = stream;
          await this.config.videoElement.play().catch(console.error);
        }
        return stream;
      }).catch(err => {
        console.error("Media access failed:", err);
        return null;
      });

      let sessionResolve: (value: any) => void;
      const sessionPromise = new Promise<any>((resolve) => {
        sessionResolve = resolve;
      });

      // Start Connection
      const connectPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          tools: tools,
          systemInstruction: {
            parts: [
              { text: this.getSystemPrompt(persona) }
            ]
          },
        },
        callbacks: {
          onopen: async () => {
            this.config.onConnectionStateChange(ConnectionState.CONNECTED);
            this.config.onStatusChange("Link Established.");

            try {
              this.session = await connectPromise;
              sessionResolve(this.session);

              const stream = await mediaStreamPromise;

              if (stream) {
                this.config.onStatusChange("Acquiring visual feed...");
                await this.initiateVisualGreeting(this.session);
              } else {
                this.config.onStatusChange("Sensory input failed.");
                this.sendTextTrigger(this.session, "SYSTEM_TRIGGER: Audio only mode. Greet me as the Financial Agent Kai.");
              }
            } catch (err) {
              console.error("Initialization failed in onopen:", err);
              this.config.onStatusChange("Initialization Error");
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onclose: () => {
            this.config.onConnectionStateChange(ConnectionState.DISCONNECTED);
            this.config.onStatusChange("Link severed.");
            this.cleanup();
          },
          onerror: (err) => {
            console.error("Session error:", err);
            this.config.onConnectionStateChange(ConnectionState.ERROR);
            this.config.onStatusChange("Connection Error");
            this.cleanup();
          },
        },
      });

      connectPromise.catch((error) => {
        console.error('Connection failed:', error);
        this.config.onConnectionStateChange(ConnectionState.ERROR);
        this.config.onStatusChange("Connection failed.");
        this.cleanup();
      });

    } catch (error) {
      console.error('Setup failed:', error);
      this.config.onConnectionStateChange(ConnectionState.ERROR);
      this.cleanup();
    }
  }

  /**
   * Generate system prompt based on user persona
   */
  private getSystemPrompt(persona: UserPersona): string {
    const personaInstructions = persona === 'Active Trader' ? `
    - **Focus**: Volatility, Catalysts, Price Action, Momentum.
    - **Tone**: Concise, fast-paced, signal-oriented.
    - **Data**: Highlight % changes, volume spikes, and earnings dates.
    - **Risk**: User has high risk tolerance but needs clear exit strategies.
    ` : persona === 'Professional Advisor' ? `
    - **Focus**: Risk-Adjusted Return, Compliance, Macro Trends, Fundamentals.
    - **Tone**: Professional, formal, data-heavy, objective.
    - **Data**: Focus on Valuation metrics (P/E, PEG), Balance Sheet health, and Analyst Consensus.
    - **Risk**: Highlight downside protection and reliability of sources.
    - **Special Output**: You MUST populate 'scenarios' (bear/bull cases) and 'compliance_stub' in the tool call.
    ` : `
    - **Focus**: Long-term stability, "The Why", Education, Trust.
    - **Tone**: Friendly, clear, jargon-free (or explain jargon immediately).
    - **Data**: Focus on product strength, brand value, and simple growth narratives.
    - **Risk**: User is likely risk-averse. Emphasize safety and reliability.
    `;

    return `You are Kai, a specialized Financial Intelligence Agent.

    ### CRITICAL CONTEXT: USER PERSONA
    You are communicating with a user who has explicitly identified as a: **${persona}**.
    
    **STRICTLY ADHERE to the following behavior protocol for this persona:**
    
    ${personaInstructions}

    ### MISSION
    Deliver consumer-grade, explainable financial decisions with visible agent debate. Achieve trust by design with citations and reliability scores.

    ### TOOL USE: GOOGLE SEARCH
    You have access to **Google Search**. You MUST use it to:
    1. Fetch real-time stock prices, earnings reports, and breaking news.
    2. Ground your "Sentiment Agent" analysis in the latest market mood.
    3. Collect URLs to populate the 'evidence' list in the Decision Card.
    4. Populate the 'ticker_symbol', 'current_price', and 'price_change_percentage' fields.

    ### AGENT ARCHITECTURE
    1. **Fundamental Agent**: Analyzes 10-K/10-Q filings. Focuses on "The Why".
    2. **Sentiment Agent**: Analyzes news and market mood using Google Search. Focuses on "The Momentum".
    3. **Valuation Agent**: Deterministic math. Focuses on "The Price".

    ### PROTOCOL
    1. **Visual Greeting**: Upon "SYSTEM_TRIGGER", observe the user's environment. Link it to the market if possible.
    2. **Agent Debate**: Before deciding, briefly voice the internal conflict.
    3. **Decision Card**: When you reach a conclusion, you MUST call 'displayDecisionCard'.
       - **Target Persona**: Set this field to "${persona}".
       - **Risk Alignment**: Ensure the recommendation fits the ${persona} profile.
       - **Evidence**: MUST include actual URLs found via Google Search.
       - **Scenarios/Compliance**: If persona is "Professional Advisor", include 2-3 stress-test scenarios and a compliance note.
    
    ### TONE
    Objective, transparent, yet empathetic.
    `;
  }

  /**
   * Request a news update for a specific ticker
   */
  public requestNewsUpdate(ticker: string) {
    if (this.session) {
      this.sendTextTrigger(this.session, `SYSTEM_TRIGGER: User requested news update. Perform a Google Search for recent news on ${ticker}. Regenerate the Decision Card with updated evidence.`);
    }
  }

  private async initiateVisualGreeting(session: any) {
    let base64Image: string | null = null;

    if (this.config.videoElement) {
      for (let i = 0; i < 30; i++) {
        if (this.config.videoElement.readyState >= 2) {
          base64Image = this.captureFrame(this.config.videoElement);
          if (base64Image) break;
        }
        await new Promise(r => setTimeout(r, 30));
      }
    }

    if (base64Image) {
      try {
        session.sendRealtimeInput({
          media: { mimeType: 'image/jpeg', data: base64Image }
        });
        session.sendRealtimeInput({
          content: [
            { text: "SYSTEM_TRIGGER: Visual feed active. Greet me based on my appearance/environment. Acknowledge my chosen persona immediately. State your financial agents are debating." }
          ]
        });
      } catch (e) {
        console.error("Failed to send visual greeting", e);
      }
    } else {
      this.sendTextTrigger(session, "SYSTEM_TRIGGER: Video failed. Greet me and start the financial analysis sequence.");
    }

    this.startVideoInputStream(session);
    this.startVisualizerLoop();

    setTimeout(() => {
      this.startAudioInputStream(session);
    }, 200);
  }

  private sendTextTrigger(session: any, text: string) {
    try {
      session.sendRealtimeInput({
        content: [{ text }]
      });
    } catch (e) {
      console.error("Failed to send text trigger:", e);
    }
  }

  private captureFrame(video: HTMLVideoElement): string | null {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    }
    return null;
  }

  private startAudioInputStream(session: any) {
    if (!this.inputAudioContext || !this.stream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      session.sendRealtimeInput({ media: pcmBlob });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private startVideoInputStream(session: any) {
    if (!this.config.videoElement || !this.stream) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FPS = 1;

    this.videoIntervalId = window.setInterval(() => {
      if (!this.config.videoElement || this.config.videoElement.paused || this.config.videoElement.ended) return;

      canvas.width = this.config.videoElement.videoWidth * 0.5;
      canvas.height = this.config.videoElement.videoHeight * 0.5;

      if (ctx) {
        ctx.drawImage(this.config.videoElement, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        session.sendRealtimeInput({
          media: { mimeType: 'image/jpeg', data: base64Data }
        });
      }
    }, 1000 / FPS);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    const serverContent = message.serverContent;

    // Handle Function Call
    if (message.toolCall?.functionCalls) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'displayDecisionCard') {
          try {
            const args = fc.args as unknown as DecisionCardData;
            this.config.onDecisionCard(args);

            if (this.session) {
              this.session.sendToolResponse({
                functionResponses: {
                  id: fc.id,
                  name: fc.name,
                  response: { result: "Decision Card Displayed Successfully" }
                }
              });
            }
          } catch (e) {
            console.error("Error handling tool call:", e);
          }
        }
      }
    }

    // Audio Output
    if (serverContent?.modelTurn?.parts?.[0]?.inlineData) {
      const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
      if (base64Audio && this.outputAudioContext && this.gainNode) {
        const currentTime = this.outputAudioContext.currentTime;
        if (this.nextStartTime < currentTime) {
          this.nextStartTime = currentTime;
        }

        const audioBuffer = await decodeAudioData(
          base64ToUint8Array(base64Audio),
          this.outputAudioContext,
          AUDIO_PLAYBACK_RATE
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;

        this.sources.add(source);
        source.onended = () => {
          this.sources.delete(source);
        };
      }
    }

    if (serverContent?.interrupted) {
      this.sources.forEach(source => {
        try { source.stop(); } catch (e) { /* ignore */ }
      });
      this.sources.clear();
      this.nextStartTime = 0;
      this.config.onStatusChange("Interrupted.");
    }

    if (serverContent?.turnComplete) {
      this.config.onStatusChange("Listening...");
    }
  }

  private startVisualizerLoop() {
    const update = () => {
      if (!this.analyser) return;

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const volume = Math.min(1, average / 100);

      this.config.onVolumeChange(volume);
      this.config.onAudioData(dataArray);

      if (this.config.videoElement && !this.config.videoElement.paused) {
        requestAnimationFrame(update);
      }
    };
    update();
  }

  async disconnect() {
    this.cleanup();
    this.config.onConnectionStateChange(ConnectionState.DISCONNECTED);
  }

  private cleanup() {
    if (this.videoIntervalId) {
      clearInterval(this.videoIntervalId);
      this.videoIntervalId = null;
    }

    this.stream?.getTracks().forEach(track => track.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();

    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.stream = null;
    this.sources.clear();
    this.nextStartTime = 0;
    this.session = null;
  }
}
