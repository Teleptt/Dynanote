import { assertSimulation } from '../../lib/simulation-schema';
import { SimulationSpec, AgentProposal } from '../../types';

/** Recoverable model-output failure, kept distinct from network/authentication failures. */
export class SimulationOutputError extends Error {
  constructor(message: string, public readonly draft: unknown) { super(message); this.name = 'SimulationOutputError'; }
}
export interface CleanedSimulationResult { spec: SimulationSpec; explanation: string; proposal?: AgentProposal; }

/** Extract JSON without altering equations, inventing parameters, or changing domains. */
export function extractAndValidateSimulation(rawText: string, fallbackExplanation = 'Generated simulation'): CleanedSimulationResult {
  let parsed: any;
  try {
    const cleaned = (rawText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    // Prefer the entire JSON; permit surrounding prose without regex-rewriting string contents.
    try { parsed = JSON.parse(cleaned); }
    catch { parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)); }
  } catch {
    throw new SimulationOutputError('Return one valid JSON object; the response could not be parsed.', rawText);
  }
  const spec = parsed?.spec ?? parsed;
  try { assertSimulation(spec); }
  catch (error) { throw new SimulationOutputError(error instanceof Error ? error.message : String(error), parsed); }
  const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 12) : [];
  const proposal = typeof parsed.proposal?.summary === 'string' ? {
    summary: parsed.proposal.summary,
    assumptions: strings(parsed.proposal.assumptions),
    limitations: strings(parsed.proposal.limitations)
  } : undefined;
  return { spec, explanation: typeof parsed.explanation === 'string' ? parsed.explanation : fallbackExplanation, proposal };
}
