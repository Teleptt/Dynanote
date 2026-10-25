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

export class OpenRouterProvider implements IAIProvider {
  id = 'openrouter' as const;
  name = 'OpenRouter';
  description = 'Universal model gateway to DeepSeek, Llama, Claude, Qwen, and any open or closed model.';

  capabilities: ProviderCapability = {
    supportsVision: true,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'deepseek/deepseek-chat',
    modelPlaceholder: 'e.g. deepseek/deepseek-chat, deepseek/deepseek-r1, meta-llama/llama-3.3-70b-instruct, etc.',
    allowsAPIKey: true,
    defaultBaseURL: 'https://openrouter.ai/api/v1'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('OpenRouter API key is missing. Please configure it in Settings.');
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'deepseek/deepseek-chat';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/chat/completions`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Routing simulation request to ${model}...`,
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
      message: `Synthesizing via OpenRouter (${model})...`,
      provider: this.id
    });

    const res = await fetch(url, {
      signal: request.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Dynanote Multimodal Visualizer',
        ...(config.customHeaders || {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Validating and normalizing simulation spec...',
      provider: this.id
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenRouter');
    }

    const cleaned = extractAndValidateSimulation(content, 'Visualization synthesized via OpenRouter.');

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

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'deepseek/deepseek-chat';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/chat/completions`;

    const startTime = performance.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Dynanote'
        },
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

      return { success: true, message: 'Connected successfully', latencyMs: latency, modelUsed: model };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }
}
