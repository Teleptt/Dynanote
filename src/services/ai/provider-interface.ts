import {
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
  ProviderCapability,
  ProviderConfig,
  TestConnectionResult
} from '../../types';

export interface IAIProvider {
  id: AIProviderId;
  name: string;
  description: string;
  capabilities: ProviderCapability;

  generateSimulation(
    request: AIGenerationRequest,
    config: ProviderConfig,
    globalSettings?: { temperature?: number }
  ): Promise<AIGenerationResponse>;

  testConnection?(config: ProviderConfig): Promise<TestConnectionResult>;
}
