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

export class GroqProvider implements IAIProvider {
  id = 'groq' as const;
  name = 'Groq Cloud';
  description = 'Ultra-high-speed LPU inference (500+ tokens/sec) for near-instantaneous simulations.';

  capabilities: ProviderCapability = {
    supportsVision: false,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'llama-3.3-70b-versatile',
    modelPlaceholder: 'e.g. llama-3.3-70b-versatile, llama-3.1-8b-instant, etc.',
    allowsAPIKey: true,
    defaultBaseURL: 'https://api.groq.com/openai/v1'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('Groq API key is missing. Please configure it in Settings.');
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'llama-3.3-70b-versatile';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/chat/completions`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Preparing prompt for Groq LPU (${model})...`,
      provider: this.id
    });

    const userContent = `Here are the user's notes:\n${request.noteContent}${
      request.selectedText ? `\n\nHighlighted selection:\n${request.selectedText}` : ''
    }${request.instructions ? `\n\nInstructions: ${request.instructions}` : ''}`;

    const temperature = typeof request.temperature === 'number'
      ? request.temperature
      : typeof globalSettings?.temperature === 'number'
      ? globalSettings.temperature
      : 0.1;

    const payload: any = {
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature
    };

    request.onStatusUpdate?.({
      step: 'synthesizing',
      message: `Executing ultra-fast synthesis via Groq (${model})...`,
      provider: this.id
    });

    const res = await fetch(url, {
      signal: request.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(config.customHeaders || {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Extracting simulation specifications...',
      provider: this.id
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Groq');
    }

    const cleaned = extractAndValidateSimulation(content, 'Visualization synthesized by Groq LPU.');

    return {
      spec: cleaned.spec,
      explanation: cleaned.explanation,
      proposal: cleaned.proposal,
      tokensUsed: data.usage?.total_tokens,
      providerUsed: this.id,
      modelUsed: model
    };
  }

  async testConnection(config: ProviderConfig): Promise<TestConnectionResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return { success: false, message: 'API key is empty.' };
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'llama-3.3-70b-versatile';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/chat/completions`;

    const startTime = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say {"ok": true} in JSON' }],
          max_tokens: 15,
          response_format: { type: 'json_object' }
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
