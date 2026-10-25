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

export class AnthropicProvider implements IAIProvider {
  id = 'anthropic' as const;
  name = 'Anthropic Claude';
  description = 'Anthropic Claude models with scientific reasoning and vision capabilities.';

  capabilities: ProviderCapability = {
    supportsVision: true,
    supportsStreaming: false,
    supportsJsonSchema: false,
    defaultModel: 'claude-3-5-sonnet-20241022',
    modelPlaceholder: 'e.g. claude-3-7-sonnet, claude-3-5-haiku, etc.',
    allowsAPIKey: true,
    defaultBaseURL: 'https://api.anthropic.com/v1'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('Anthropic API key is missing. Please configure it in Settings.');
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'claude-3-5-sonnet-20241022';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/messages`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Packaging Claude messages for ${model}...`,
      provider: this.id
    });

    const content: any[] = [
      { type: 'text', text: `Here are the notes:\n${request.noteContent}` }
    ];

    if (request.selectedText) {
      content.push({ type: 'text', text: `Highlighted selection:\n${request.selectedText}` });
    }

    if (request.instructions) {
      content.push({ type: 'text', text: `Instructions: ${request.instructions}` });
    }

    if (request.sketchImageBase64) {
      request.onStatusUpdate?.({
        step: 'preparing',
        message: 'Encoding sketch for Claude Vision...',
        provider: this.id
      });
      const match = request.sketchImageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1],
            data: match[2]
          }
        });
        content.push({ type: 'text', text: 'Convert this hand-drawn sketch to a dynamic simulation specification.' });
      }
    }

    const temperature = typeof request.temperature === 'number'
      ? request.temperature
      : typeof globalSettings?.temperature === 'number'
      ? globalSettings.temperature
      : 0.2;

    const payload = {
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      max_tokens: 3500,
      temperature
    };

    request.onStatusUpdate?.({
      step: 'synthesizing',
      message: `Waiting for Claude (${model}) to synthesize simulation...`,
      provider: this.id
    });

    const res = await fetch(url, {
      signal: request.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true',
        ...(config.customHeaders || {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Extracting and cleaning JSON specification...',
      provider: this.id
    });

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error('No content returned from Anthropic');
    }

    const cleaned = extractAndValidateSimulation(text, 'Visualization synthesized by Claude.');

    return {
      spec: cleaned.spec,
      explanation: cleaned.explanation,
      proposal: cleaned.proposal,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      providerUsed: this.id,
      modelUsed: model
    };
  }

  async testConnection(config: ProviderConfig): Promise<TestConnectionResult> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      return { success: false, message: 'API key is empty.' };
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'claude-3-5-sonnet-20241022';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/messages`;

    const startTime = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model,
          max_tokens: 15,
          messages: [{ role: 'user', content: 'Respond with {"ok": true}' }]
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
