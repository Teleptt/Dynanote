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

export class CustomOpenAIProvider implements IAIProvider {
  id = 'custom_openai' as const;
  name = 'Custom OpenAI-Compatible';
  description = 'Connect to any OpenAI-compatible server (LM Studio, vLLM, LocalAI, DeepSeek, Together AI, Mistral).';

  capabilities: ProviderCapability = {
    supportsVision: true,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'default',
    modelPlaceholder: 'e.g. any model identifier on your server (or "default")',
    allowsAPIKey: true,
    apiKeyOptional: true, // Optional for local LM Studio / LocalAI, but available for authenticated endpoints
    defaultBaseURL: 'http://localhost:1234/v1'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'default';
    const url = `${baseURL}/chat/completions`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Packaging request for custom endpoint (${url})...`,
      provider: this.id
    });

    const userContent: any[] = [
      { type: 'text', text: `Here are the user's notes:\n${request.noteContent}` }
    ];

    if (request.selectedText) {
      userContent.push({ type: 'text', text: `Highlighted selection:\n${request.selectedText}` });
    }

    if (request.instructions) {
      userContent.push({ type: 'text', text: `Instructions: ${request.instructions}` });
    }

    if (request.sketchImageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: request.sketchImageBase64 }
      });
      userContent.push({ type: 'text', text: 'Analyze this hand-drawn sketch and convert it to the simulation spec.' });
    }

    const temperature = typeof request.temperature === 'number'
      ? request.temperature
      : typeof globalSettings?.temperature === 'number'
      ? globalSettings.temperature
      : 0.2;

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
      message: `Synthesizing via custom endpoint (${model})...`,
      provider: this.id
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.customHeaders || {})
    };

    if (config.apiKey && config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const res = await fetch(url, {
      signal: request.signal,
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Custom API Server Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Extracting and cleaning simulation spec...',
      provider: this.id
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from custom API server');
    }

    const cleaned = extractAndValidateSimulation(content, 'Visualization synthesized by custom AI server.');

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
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'default';
    const url = `${baseURL}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (config.apiKey && config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const startTime = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say {"ok": true} in JSON' }],
          max_tokens: 15
        })
      });

      const latency = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const err = await res.text();
        return { success: false, message: `HTTP ${res.status}: ${err.slice(0, 120)}`, latencyMs: latency };
      }

      return { success: true, message: 'Custom endpoint connected', latencyMs: latency, modelUsed: model };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }
}
