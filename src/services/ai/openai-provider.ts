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

export class OpenAIProvider implements IAIProvider {
  id = 'openai' as const;
  name = 'OpenAI';
  description = 'OpenAI models with multimodal vision and JSON mode.';

  capabilities: ProviderCapability = {
    supportsVision: true,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'gpt-4o',
    modelPlaceholder: 'e.g. gpt-4o, gpt-4o-mini, o3-mini, etc.',
    allowsAPIKey: true,
    defaultBaseURL: 'https://api.openai.com/v1'
  };

  async generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse> {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('OpenAI API key is missing. Please configure it in Settings.');
    }

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'gpt-4o';
    const baseURL = (config.baseURL || this.capabilities.defaultBaseURL)!.replace(/\/+$/, '');
    const url = `${baseURL}/chat/completions`;

    request.onStatusUpdate?.({
      step: 'preparing',
      message: `Formatting message payload for ${model}...`,
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
      request.onStatusUpdate?.({
        step: 'preparing',
        message: 'Attaching digital sketch PNG data...',
        provider: this.id
      });
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
      message: `Sending prompt to OpenAI (${model})...`,
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
      throw new Error(`OpenAI API Error (${res.status}): ${err}`);
    }

    request.onStatusUpdate?.({
      step: 'parsing',
      message: 'Validating synthesized simulation spec...',
      provider: this.id
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const cleaned = extractAndValidateSimulation(content, 'Visualization synthesized by OpenAI.');

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

    const model = (config.model && config.model.trim()) || this.capabilities.defaultModel || 'gpt-4o';
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
