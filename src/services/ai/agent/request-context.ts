import { getActiveTheme, themePrompt } from '../../../theme/themes';
import { AIGenerationRequest } from '../../../types';
/** Used for both iterative and single-shot requests so refinement context is never lost. */
export function withRequestContext(request: AIGenerationRequest): AIGenerationRequest {
  return { ...request, instructions: [
    request.instructions || '',
    themePrompt(getActiveTheme()),
    request.selectedText ? 'Focus on the highlighted selection; use the surrounding note only as context.' : '',
    request.domainHint ? `Preferred representation: ${request.domainHint}. Treat it as a preference unless the user explicitly requires it.` : '',
    request.currentSpec ? `This is a refinement. Preserve existing scientific content, IDs, and interactions unless the requested change requires otherwise. Current specification:\n${JSON.stringify(request.currentSpec)}` : '',
    'Choose the representation that explains the request best. State material assumptions and renderer limitations in your public proposal. Do not substitute an unrelated example when the requested model is unsupported.'
  ].filter(Boolean).join('\n\n') };
}
