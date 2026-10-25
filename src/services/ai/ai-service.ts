import { SimulationOutputError } from './json-cleaner';
import { withRequestContext } from './agent/request-context';
import { reviewSimulation } from './agent/review-simulation';
import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
  AIProviderSettings,
  ProviderConfig,
  TestConnectionResult
} from '../../types';
import { IAIProvider } from './provider-interface';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { GroqProvider } from './groq-provider';
import { OllamaProvider } from './ollama-provider';
import { CustomOpenAIProvider } from './custom-openai-provider';
import { MockOfflineProvider } from './mock-provider';
import { AgenticOrchestrator, AgentRunError } from './agent/agentic-orchestrator';

const SETTINGS_KEY = 'dynanote_ai_settings_v3';
const LEGACY_SETTINGS_KEY = 'dynanote_ai_settings_v2';

const DEFAULT_SETTINGS: AIProviderSettings = {
  activeProvider: 'mock',
  agenticVerification: true, // Agentic reasoning, verification tools & auto-correction enabled
  fallbackToOfflineOnFailure: false,
  temperature: 0.2,
  providers: {
    mock: { model: 'offline-v1' },
    gemini: { apiKey: '', model: 'gemini-1.5-flash', baseURL: 'https://generativelanguage.googleapis.com/v1beta' },
    openai: { apiKey: '', model: 'gpt-4o', baseURL: 'https://api.openai.com/v1' },
    anthropic: { apiKey: '', model: 'claude-3-5-sonnet-20241022', baseURL: 'https://api.anthropic.com/v1' },
    openrouter: { apiKey: '', model: 'deepseek/deepseek-chat', baseURL: 'https://openrouter.ai/api/v1' },
    groq: { apiKey: '', model: 'llama-3.3-70b-versatile', baseURL: 'https://api.groq.com/openai/v1' },
    ollama: { model: 'llama3', baseURL: 'http://localhost:11434' },
    custom_openai: { apiKey: '', model: 'default', baseURL: 'http://localhost:1234/v1' }
  }
};

class AIService {
  private providers: Map<AIProviderId, IAIProvider> = new Map();
  private settings: AIProviderSettings = DEFAULT_SETTINGS;

  constructor() {
    this.registerProvider(new MockOfflineProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OllamaProvider());
    this.registerProvider(new CustomOpenAIProvider());
    this.loadSettings();
    this.updateSettings({});
    try { localStorage.removeItem(LEGACY_SETTINGS_KEY); } catch { /* Storage may be unavailable. */ }
  }

  public registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: AIProviderId): IAIProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  public getSettings(): AIProviderSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  public updateSettings(newSettings: Partial<AIProviderSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
      providers: {
        ...this.settings.providers,
        ...(newSettings.providers || {})
      }
    };
    try {
      const persisted = JSON.parse(JSON.stringify(this.settings));
      Object.values(persisted.providers).forEach((config: any) => { delete config.apiKey; });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
    } catch (e) {
      console.warn('Failed to save AI settings to localStorage', e);
    }
  }

  public updateProviderConfig(providerId: AIProviderId, config: Partial<ProviderConfig>): void {
    const current = this.settings.providers[providerId] || {};
    this.settings.providers[providerId] = { ...current, ...config };
    this.updateSettings({ providers: this.settings.providers });
  }

  private loadSettings(): void {
    try {
      const savedV3 = localStorage.getItem(SETTINGS_KEY);
      if (savedV3) {
        const parsed = JSON.parse(savedV3);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          providers: {
            ...DEFAULT_SETTINGS.providers,
            ...(parsed.providers || {})
          }
        };
        return;
      }

      // Check legacy migration
      const savedLegacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
      if (savedLegacy) {
        const legacy = JSON.parse(savedLegacy);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...legacy,
          agenticVerification: true,
          providers: {
            ...DEFAULT_SETTINGS.providers,
            ...(legacy.providers || {})
          }
        };
        const persisted = JSON.parse(JSON.stringify(this.settings));
      Object.values(persisted.providers).forEach((config: any) => { delete config.apiKey; });
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
      }
    } catch (e) {
      console.warn('Failed to load AI settings, using defaults', e);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public async testProviderConnection(providerId: AIProviderId): Promise<TestConnectionResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, message: `Provider "${providerId}" not found.` };
    }

    if (!provider.testConnection) {
      return { success: true, message: 'Provider does not require connection testing.' };
    }

    const config = this.settings.providers[providerId] || {};
    return await provider.testConnection(config);
  }

  public async generateVisualSimulation(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const activeId = this.settings.activeProvider;
    const provider = this.providers.get(activeId);

    if (!provider) {
      throw new Error(`Active provider "${activeId}" is not registered.`);
    }

    const config = this.settings.providers[activeId] || {};
    const useAgentic = this.settings.agenticVerification && !request.skipAgenticVerification;

    try {
      if (useAgentic) {
        // Run agentic loop: planning, synthesis, domain verification tools & self-correction
        return await AgenticOrchestrator.execute(provider, request, config, {
          temperature: this.settings.temperature
        });
      } else {
        request.onStatusUpdate?.({
          step: 'sending',
          message: `Dispatching request to ${provider.name}...`,
          provider: activeId
        });

        const response = await provider.generateSimulation(withRequestContext(request), config, {
          temperature: this.settings.temperature
        });
        const report = reviewSimulation(response.spec);
        if (!report.isValid) throw new SimulationOutputError(report.errors.join('; '), response.spec);
        return response;
      }
    } catch (primaryError: any) {
      console.warn(`[Dynanote AIService] Primary provider "${provider.name}" failed:`, primaryError);

      // If fallback to offline is enabled and we weren't already using mock
      if (!(primaryError instanceof AgentRunError) && !(primaryError instanceof SimulationOutputError) && this.settings.fallbackToOfflineOnFailure && activeId !== 'mock' && !request.currentSpec && !request.sketchImageBase64 && !request.instructions?.trim() && !request.signal?.aborted && primaryError?.name !== 'AbortError') {
        request.onStatusUpdate?.({
          step: 'fallback',
          message: `${provider.name} failed (${primaryError.message || 'error'}). Showing a labeled offline example...`,
          provider: 'mock'
        });

        const mockProvider = this.providers.get('mock')!;
        // Also run verification on fallback
        const fallbackRes = await AgenticOrchestrator.execute(mockProvider, request, {});
        return {
          ...fallbackRes,
          explanation: `(Fallback Engine) ${fallbackRes.explanation} Note: ${provider.name} encountered: ${primaryError.message}`,
          isFallback: true
        };
      }

      throw primaryError;
    }
  }
}

export const aiService = new AIService();
