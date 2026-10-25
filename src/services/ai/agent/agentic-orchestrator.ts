import { AIGenerationRequest, AIGenerationResponse, AgenticTrace, AgenticStep, ProviderConfig, DomainValidationReport } from '../../../types';
import { IAIProvider } from '../provider-interface';
import { SimulationOutputError } from '../json-cleaner';
import { reviewSimulation } from './review-simulation';
import { withRequestContext } from './request-context';

export class AgentRunError extends Error {
  constructor(message: string, public readonly steps: AgenticStep[], public readonly attempts: number) { super(message); this.name = 'AgentRunError'; }
}

/** Adaptive draft -> tool feedback -> targeted revision. No hidden scientific rewrites. */
export class AgenticOrchestrator {
  public static async execute(provider: IAIProvider, request: AIGenerationRequest, config: ProviderConfig, settings?: { temperature?: number }): Promise<AIGenerationResponse> {
    const budget = Number.isFinite(request.maxAttempts) ? Math.max(1, Math.min(6, Math.floor(request.maxAttempts!))) : 4;
    const base = withRequestContext(request);
    const steps: AgenticStep[] = [];
    const history: Array<{ attempt: number; problems: string[] }> = [];
    let previousDraft: unknown;
    let previousFingerprint = '';
    let repeated = 0;
    let tokens = 0;
    const add = (phase: AgenticStep['phase'], title: string, detail: string, status: AgenticStep['status']) => steps.push({ phase, title, detail, status, timestamp: Date.now() });
    const fail = (message: string, attempts: number): never => {
      add('final', 'Generation stopped', message, 'error');
      throw new AgentRunError(message, steps, attempts);
    };
    add('analysis', request.currentSpec ? 'Refinement context retained' : 'Request prepared', 'The model chooses a representation from the user request. Review tools return feedback without changing the draft.', 'success');
    const snapshot = (draft: unknown) => {
      const text = typeof draft === 'string' ? draft : JSON.stringify(draft);
      return (text || '').slice(0, 60000);
    };

    for (let attempt = 1; attempt <= budget; attempt++) {
      if (request.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
      const feedback = history.length ? [
        'REVISION FEEDBACK (tool observations, not new user requirements):',
        JSON.stringify(history),
        'Previous draft:', snapshot(previousDraft),
        'Fix the blocking issues while retaining the original request and valid parts of the draft.',
        history.length > 1 ? 'Earlier revisions have not resolved the problem. Reconsider your approach or representation of the SAME subject; explain any change in proposal.summary.' : 'Prefer a targeted correction. Change representation only when it better serves the request.'
      ].join('\n') : '';
      const current = { ...base, instructions: `${base.instructions}\n\n${feedback}` };
      request.onStatusUpdate?.({ step: 'synthesizing', message: attempt === 1 ? 'Designing a visualization for your request…' : `Revising from tool feedback (${attempt}/${budget})…`, provider: provider.id });
      add('draft', `Draft ${attempt}`, feedback ? 'Requested a revision with the original context, previous draft, and accumulated feedback.' : 'Requested a model-selected representation and public design summary.', 'running');
      const draftStep = steps[steps.length - 1];
      let response: AIGenerationResponse | undefined;
      let report: DomainValidationReport | undefined;
      let problems: string[];
      try {
        response = await provider.generateSimulation(current, config, settings);
        if (request.signal?.aborted) throw new DOMException('Generation cancelled', 'AbortError');
        tokens += response.tokensUsed || 0;
        previousDraft = response.spec;
        draftStep.status = 'success';
        request.onStatusUpdate?.({ step: 'validating', message: 'Checking renderer compatibility and relevant model constraints…', provider: provider.id });
        try { report = reviewSimulation(response.spec); }
        catch (error) { throw new SimulationOutputError(error instanceof Error ? error.message : String(error), response.spec); }
        problems = report.errors;
        add('validation', `Review ${attempt}`, [...report.errors, ...report.warnings].join('\n') || 'No blocking issues found by the available tools.', report.isValid ? (report.warnings.length ? 'warning' : 'success') : 'warning');
      } catch (error) {
        draftStep.status = 'error';
        if (!(error instanceof SimulationOutputError)) throw error; // Auth, cancellation, and network errors need a different remedy.
        previousDraft = error.draft;
        problems = [error.message];
        add('validation', 'Output needs revision', error.message, 'warning');
      }
      if (response && report?.isValid) {
        const corrections = history.map(h => `Revision after draft ${h.attempt}: ${h.problems.join('; ')}`);
        const limitations = [...new Set([...(response.proposal?.limitations || []), ...report.warnings])];
        add('final', 'Visualization ready', limitations.length ? 'No blocking issues. Review the reported assumptions and limitations.' : 'Available automated checks passed; scientific accuracy is not certified.', limitations.length ? 'warning' : 'success');
        const agentTrace: AgenticTrace = {
          plan: response.proposal?.summary || `Returned ${response.spec.domain} visualization. The provider supplied no design summary.`,
          assumptions: response.proposal?.assumptions || [], limitations,
          steps, validationReport: report, attempts: attempt, correctionsMade: corrections
        };
        request.onStatusUpdate?.({ step: 'done', message: limitations.length ? 'Visualization ready with noted limitations.' : 'Visualization ready.', provider: provider.id });
        return { ...response, tokensUsed: tokens || undefined, providerUsed: response.providerUsed || provider.id, modelUsed: response.modelUsed || config.model, agentTrace };
      }
      history.push({ attempt, problems });
      // Stop wasting calls when the model repeats exactly the same failed draft.
      const fingerprint = snapshot(previousDraft) + JSON.stringify(problems);
      repeated = fingerprint === previousFingerprint ? repeated + 1 : 0;
      previousFingerprint = fingerprint;
      if (provider.id === 'mock' || repeated >= 1 || attempt === budget) {
        return fail(`Simulation failed validation: ${problems.join('; ')}${repeated ? ' The model repeated an unchanged invalid draft.' : ''}`, attempt);
      }
      add('correction', 'Revision requested', problems.join('\n'), 'warning');
    }
    return fail('Generation budget exhausted.', budget);
  }
}
