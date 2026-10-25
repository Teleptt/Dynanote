import {
  AIGenerationRequest,
  AIGenerationResponse,
  ProviderCapability,
  ProviderConfig,
  TestConnectionResult
} from '../../types';
import { IAIProvider } from './provider-interface';
import { SYSTEM_PROMPT } from './prompt-templates';
import { extractAndValidateSimulation } from './json-cleaner';

export class GeminiProvider implements IAIProvider {
  id = 'gemini' as const;
  name = 'Google Gemini';
  description = 'Google Gemini multimodal models with vision and structured JSON support.';

  capabilities: ProviderCapability = {
    supportsVision: true,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'gemini-1.5-flash',
    modelPlaceholder: 'e.g. gemini-2.0-flash, gemini-1.5-pro, etc.',
    allowsAPIKey: true,
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('Google Gemini API key is missing. Please configure it in Settings.');
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'gemini-1.5-flash';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/models/${model}:generateContent?key=${apiKey}`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Packaging multimodal prompt for ${model}...`,
      provider: this.id
    });

    const parts: any[] = [
      { text: `${SYSTEM_PROMPT}\n\nHere are the user's notes and request:\n${request.noteContent}` }
    ];

    if (request.selectedText) {
      parts.push({ text: `Focus particularly on this highlighted selection:\n${request.selectedText}` });
    }

    if (request.instructions) {
      parts.push({ text: `Additional user instructions:\n${request.instructions}` });
    }

    if (request.sketchImageBase64) {
      request.onStatusUpdate?.({
        step: 'preparing',
        message: 'Encoding digital sketch image vectors...',
        provider: this.id
      });
      const cleanBase64 = request.sketchImageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: cleanBase64
        }
      });
      parts.push({ text: 'A visual hand-drawn sketch from the user has been provided above. Analyze the sketch and convert its components and topology into the simulation spec.' });
    }

    const temperature = typeof request.temperature === 'number'
      ? request.temperature
      : typeof globalSettings?.temperature === 'number'
      ? globalSettings.temperature
      : 0.2;

    const payload = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature
      }
    };

    request.onStatusUpdate?.({
      step: 'synthesizing',
      message: `Synthesizing simulation via ${model}...`,
      provider: this.id
    });

    const res = await fetch(url, {
      signal: request.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Extracting and validating domain specification...',
      provider: this.id
    });

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No candidate response text received from Gemini');
    }

    const cleaned = extractAndValidateSimulation(candidateText, 'Visualization synthesized by Gemini.');

    return {
      spec: cleaned.spec,
      explanation: cleaned.explanation,
      proposal: cleaned.proposal,
      tokensUsed: data.usageMetadata?.totalTokenCount,
      providerUsed: this.id,
      modelUsed: model
    };
  }

  async testConnection(config: ProviderConfig): Promise<TestConnectionResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return { success: false, message: 'API key is empty.' };
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'gemini-1.5-flash';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/models/${model}:generateContent?key=${apiKey}`;

    const startTime = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with JSON: {"ok": true}' }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 20 }
        })
      });

      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const err = await res.text();
        return { success: false, message: `HTTP ${res.status}: ${err.slice(0, 120)}`, latencyMs: latency };
      }

      return { success: true, message: 'Connected successfully', latencyMs: latency, modelUsed: model };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }
}
