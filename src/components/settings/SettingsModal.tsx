import { THEMES } from '../../theme/themes';
import { useTheme } from '../../theme/useTheme';
import React, { useState } from 'react';
import { AIProviderId, AIProviderSettings, ProviderConfig, TestConnectionResult } from '../../types';
import { aiService } from '../../services/ai/ai-service';
import {
  X,
  Key,
  Server,
  Cpu,
  Check,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Activity,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AIProviderSettings>(() => aiService.getSettings());
  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderId>(() => settings.activeProvider);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const providers = aiService.getAllProviders();
  const currentProvider = aiService.getProvider(selectedProviderId)!;
  const currentConfig: ProviderConfig = settings.providers[selectedProviderId] || {};

  const handleUpdateCurrentConfig = (updates: Partial<ProviderConfig>) => {
    setSettings((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [selectedProviderId]: {
          ...prev.providers[selectedProviderId],
          ...updates
        }
      }
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Save temporary state to service so tester reads it
    aiService.updateSettings(settings);

    try {
      const result = await aiService.testProviderConnection(selectedProviderId);
      setTestResult(result);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Unknown network error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAll = () => {
    aiService.updateSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      if (onSave) onSave();
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-obsidian-surface border border-obsidian-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-obsidian-sidebar border-b border-obsidian-border shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Appearance & AI Settings</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 font-mono">
              Agnostic Multi-Provider
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-obsidian-hover text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <fieldset className="px-5 py-3 border-b border-obsidian-border shrink-0">
          <legend className="text-xs text-obsidian-textMuted">Appearance · applies immediately</legend>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => <button key={t.id} type="button" aria-pressed={theme.id === t.id} onClick={() => setTheme(t.id)} className="rounded-lg border p-2 text-left text-xs" style={{ background: t.surface, color: t.text, borderColor: theme.id === t.id ? t.accent : t.border }}>
              <span className="flex gap-1 mb-2" aria-hidden="true">{t.series.slice(0,4).map(c => <span key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}</span>
              <strong>{t.name}</strong><span className="block mt-1" style={{ color: t.muted }}>{t.description}</span>
            </button>)}
          </div>
        </fieldset>

        {/* Master Body: Two Column Split */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Column: Providers List */}
          <div className="w-64 bg-obsidian-sidebar/60 border-r border-obsidian-border p-3 overflow-y-auto flex flex-col gap-1.5 shrink-0 select-none">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold px-2 py-1">
              AI Providers
            </span>

            {providers.map((p) => {
              const isSelected = p.id === selectedProviderId;
              const isActive = p.id === settings.activeProvider;
              const hasKey = !!settings.providers[p.id]?.apiKey;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProviderId(p.id);
                    setTestResult(null);
                  }}
                  className={`flex flex-col p-2.5 rounded-lg text-left transition-all relative ${
                    isSelected
                      ? 'bg-purple-950/60 border border-purple-600/70 text-purple-100'
                      : 'hover:bg-obsidian-hover border border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{p.name}</span>
                    {isActive && (
                      <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-purple-600 text-white font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.capabilities.allowsAPIKey && (
                      <span className={`text-[10px] font-mono ${hasKey ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {hasKey ? '● Key Configured' : p.capabilities.apiKeyOptional ? '○ Key Optional' : '○ Key Needed'}
                      </span>
                    )}
                    {p.capabilities.supportsVision && (
                      <span className="text-[10px] text-zinc-400 font-mono">Vision</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Global Settings Section in Sidebar */}
            <div className="mt-auto pt-3 border-t border-obsidian-border flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                  <span>Temperature: {settings.temperature}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {settings.temperature <= 0.2 ? 'Deterministic' : 'Creative'}
                  </span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-purple-500 cursor-pointer h-1 bg-zinc-700 rounded mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-300">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-purple-300">Adaptive Revisions</span>
                  <span className="text-[9px] text-zinc-500">Revise from targeted feedback</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.agenticVerification}
                  onChange={(e) => setSettings({ ...settings, agenticVerification: e.target.checked })}
                  className="accent-purple-600 rounded cursor-pointer"
                  title="Let the model revise failed drafts; renderer safety checks always remain enabled"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="text-[11px] leading-tight">Offline Fallback</span>
                <input
                  type="checkbox"
                  checked={settings.fallbackToOfflineOnFailure}
                  onChange={(e) => setSettings({ ...settings, fallbackToOfflineOnFailure: e.target.checked })}
                  className="accent-purple-600 rounded cursor-pointer"
                  title="Offer labeled offline examples on provider errors; never replace a failed refinement or invalid model"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Selected Provider Configuration */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
            {/* Provider Banner & Set Active Button */}
            <div className="flex items-start justify-between pb-3 border-b border-obsidian-border">
              <div>
                <h4 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  {currentProvider.name}
                  {settings.activeProvider === currentProvider.id && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Currently Selected
                    </span>
                  )}
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-md">
                  {currentProvider.description}
                </p>
              </div>

              {settings.activeProvider !== currentProvider.id ? (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, activeProvider: currentProvider.id })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors shrink-0"
                >
                  Set as Active Provider
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Active</span>
                </div>
              )}
            </div>

            {/* Model Name Input (Flexible - No outdated hardcoded lists) */}
            {currentProvider.capabilities.defaultModel && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Model Name / Identifier
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentConfig.model ?? currentProvider.capabilities.defaultModel}
                    onChange={(e) => handleUpdateCurrentConfig({ model: e.target.value })}
                    placeholder={currentProvider.capabilities.modelPlaceholder || 'Enter model identifier...'}
                    className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
                  />
                  {currentConfig.model && currentConfig.model !== currentProvider.capabilities.defaultModel && (
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentConfig({ model: currentProvider.capabilities.defaultModel })}
                      className="px-2.5 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
                      title="Reset to default model"
                    >
                      Reset Default
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Specify any model supported by {currentProvider.name} (e.g. {currentProvider.capabilities.modelPlaceholder})
                </p>
              </div>
            )}

            <p className="text-xs text-amber-200">API keys are kept for this session only. Re-enter them after reloading.</p>
            {/* API Key Input (Available for all key-supporting providers, including Custom OpenAI & Ollama) */}
            {currentProvider.capabilities.allowsAPIKey && (
              <div className="p-3.5 bg-zinc-900/90 rounded-lg border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {currentProvider.name} API Key
                      {currentProvider.capabilities.apiKeyOptional && (
                        <span className="text-zinc-500 font-normal ml-1">(Optional / Bearer Token)</span>
                      )}
                    </span>
                  </label>
                  {currentProvider.id === 'gemini' && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get Gemini Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {currentProvider.id === 'openrouter' && (
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get OpenRouter Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {currentProvider.id === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get Groq Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {currentProvider.id === 'openai' && (
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get OpenAI Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {currentProvider.id === 'anthropic' && (
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Get Anthropic Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={currentConfig.apiKey || ''}
                    onChange={(e) => handleUpdateCurrentConfig({ apiKey: e.target.value })}
                    placeholder={
                      currentProvider.capabilities.apiKeyOptional
                        ? 'Enter API key or Bearer token (optional for local servers)...'
                        : 'Enter API key...'
                    }
                    className="w-full pr-9 pl-3 py-2 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Custom Base URL (if supported/applicable) */}
            {currentProvider.capabilities.defaultBaseURL && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    API Endpoint / Base URL
                  </label>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentConfig({ baseURL: currentProvider.capabilities.defaultBaseURL })}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Default
                  </button>
                </div>
                <input
                  type="text"
                  value={currentConfig.baseURL ?? currentProvider.capabilities.defaultBaseURL}
                  onChange={(e) => handleUpdateCurrentConfig({ baseURL: e.target.value })}
                  placeholder={currentProvider.capabilities.defaultBaseURL}
                  className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            )}

            {/* Connection Test Action & Result */}
            {currentProvider.testConnection && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                >
                  <Activity className={`w-3.5 h-3.5 text-purple-400 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Ping...' : 'Test API Connection'}</span>
                </button>

                {testResult && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono ${
                      testResult.success
                        ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950/70 border border-red-800 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span>
                      {testResult.message}
                      {testResult.latencyMs !== undefined && ` (${testResult.latencyMs}ms)`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-obsidian-sidebar border-t border-obsidian-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Keys and custom URLs remain strictly stored in local browser storage.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow-md shadow-purple-900/30 transition-all"
            >
              {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Saved!' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
