export type DomainType =
  | 'math'
  | 'circuit'
  | 'physics'
  | 'chemistry'
  | 'algorithm'
  | 'logic'
  | 'orbit'
  | 'generative'
  | 'diagram'
  | '3d';

export interface InteractiveParam {
  id: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
  unit?: string;
}

// 1. Math Domain Spec
export interface MathPlotSpec {
  domain: 'math';
  title: string;
  description?: string;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  functions: Array<{
    id: string;
    expression: string; // e.g. "sin(a * x) * exp(-b * x)"
    color: string;
    label?: string;
  }>;
  calculus?: {
    showTangent?: boolean;
    tangentX?: number;
    showIntegral?: boolean;
    integralA?: number;
    integralB?: number;
    integralPartitions?: number;
  };
  params: InteractiveParam[];
}

// 2. Circuit Domain Spec
export interface CircuitComponent {
  id: string;
  type: 'resistor' | 'capacitor' | 'inductor' | 'dc_source' | 'ac_source' | 'ground' | 'switch' | 'diode' | 'lamp' | 'ammeter' | 'voltmeter';
  value: number; // in standard SI units (ohms, farads, henries, volts)
  unit: string;
  label: string;
  pos: { x: number; y: number };
  rotation?: number; // 0, 90, 180, 270
  state?: boolean; // e.g. for switch open/closed
}

export interface CircuitWire {
  id: string;
  from: { compId: string; pin: number };
  to: { compId: string; pin: number };
  points?: Array<{ x: number; y: number }>;
}

export interface CircuitSpec {
  domain: 'circuit';
  title: string;
  description?: string;
  components: CircuitComponent[];
  wires: CircuitWire[];
  simulationType: 'dc' | 'ac' | 'transient';
  frequency?: number; // for AC
  params: InteractiveParam[];
}

// 3. Physics Domain Spec
export interface PhysicsBody {
  id: string;
  type: 'box' | 'circle' | 'cart' | 'weight' | 'fulcrum' | 'ramp';
  pos: { x: number; y: number };
  velocity?: { x: number; y: number };
  mass: number;
  dimensions: { width?: number; height?: number; radius?: number; length?: number; angle?: number };
  color: string;
  isStatic?: boolean;
  label?: string;
}

export interface PhysicsConstraint {
  id: string;
  type: 'spring' | 'rod' | 'rope' | 'pivot';
  bodyA: string;
  bodyB?: string;
  anchorA?: { x: number; y: number };
  anchorB?: { x: number; y: number };
  stiffness?: number;
  restLength?: number;
  damping?: number;
}

export interface PhysicsRigSpec {
  domain: 'physics';
  title: string;
  description?: string;
  gravity: { x: number; y: number };
  bodies: PhysicsBody[];
  constraints: PhysicsConstraint[];
  showVectors: {
    velocity?: boolean;
    force?: boolean;
    trajectory?: boolean;
  };
  params: InteractiveParam[];
}

// 4. Chemistry Domain Spec
export interface ChemAtom {
  id: string;
  element: string; // 'C', 'H', 'O', 'N', 'Br', etc.
  pos: { x: number; y: number };
  charge?: number;
  lonePairs?: number;
}

export interface ChemBond {
  id: string;
  from: string;
  to: string;
  order: 1 | 2 | 3;
}

export interface CurvedArrow {
  id: string;
  from: { type: 'atom' | 'bond' | 'lone_pair'; id: string };
  to: { type: 'atom' | 'bond'; id: string };
  electrons: 1 | 2;
  label?: string;
}

export interface ChemReactionSpec {
  domain: 'chemistry';
  title: string;
  description?: string;
  equation: string; // LaTeX or plain text: e.g. "CH3Br + OH- -> CH3OH + Br-"
  reactionType: 'sn2' | 'addition' | 'elimination' | 'acid_base' | 'combustion';
  reactants: Array<{ name: string; formula: string; coefficient: number; smiles?: string }>;
  products: Array<{ name: string; formula: string; coefficient: number; smiles?: string }>;
  mechanismSteps: Array<{
    stepNumber: number;
    description: string;
    atoms: ChemAtom[];
    bonds: ChemBond[];
    curvedArrows: CurvedArrow[];
    transitionState?: string;
  }>;
  params: InteractiveParam[];
}

// 5. Algorithm & Data Structure Domain Spec
export interface AlgorithmStep {
  stepIndex: number;
  description: string;
  array?: number[];
  comparingIndices?: number[];
  swappingIndices?: number[];
  sortedIndices?: number[];
  activeNodeId?: string;
  visitedNodeIds?: string[];
}

export interface TreeNode {
  id: string;
  value: number | string;
  left?: string;
  right?: string;
  x?: number;
  y?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface AlgorithmSpec {
  domain: 'algorithm';
  title: string;
  description?: string;
  algorithmType: 'sorting' | 'tree' | 'graph';
  algorithmName: string; // e.g. "Quicksort", "Binary Search Tree", "Dijkstra"
  initialData?: number[];
  treeNodes?: TreeNode[];
  graphNodes?: GraphNode[];
  graphEdges?: GraphEdge[];
  steps: AlgorithmStep[];
  params: InteractiveParam[];
}

// 6. Digital Logic & Systems Spec
export type LogicGateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'BUFFER';

export interface LogicGate {
  id: string;
  type: LogicGateType;
  pos: { x: number; y: number };
  label?: string;
}

export interface LogicInput {
  id: string;
  label: string;
  pos: { x: number; y: number };
  initialValue: 0 | 1;
}

export interface LogicOutput {
  id: string;
  label: string;
  pos: { x: number; y: number };
  fromGateId?: string;
  fromInputId?: string;
}

export interface LogicWire {
  id: string;
  fromId: string;
  toId: string;
  inputIndex?: number; // 0 or 1 for 2-input gate
}

export interface TruthTableRow {
  inputs: Record<string, 0 | 1>;
  outputs: Record<string, 0 | 1>;
}

export interface LogicGateSpec {
  domain: 'logic';
  title: string;
  description?: string;
  inputs: LogicInput[];
  gates: LogicGate[];
  outputs: LogicOutput[];
  wires: LogicWire[];
  truthTable?: TruthTableRow[];
  params: InteractiveParam[];
}

// 7. Celestial Mechanics & Planetary Orbit Spec
export interface OrbitingBody {
  id: string;
  name: string;
  mass: number;
  radius: number;
  semiMajorAxis: number; // orbital distance
  eccentricity: number; // 0 <= e < 1
  orbitalPeriod: number; // T in seconds
  color: string;
  showTrail?: boolean;
  showVectors?: boolean;
}

export interface OrbitSpec {
  domain: 'orbit';
  title: string;
  description?: string;
  centralBody: {
    name: string;
    mass: number;
    radius: number;
    color: string;
  };
  bodies: OrbitingBody[];
  keplerSweep?: {
    enabled: boolean;
    sectorAngleSpan?: number;
  };
  timeScale?: number;
  params: InteractiveParam[];
}

// 8. Open-Ended Generative Canvas Spec (Full Agentic Creative Freedom)
export interface GenerativeCanvasSpec {
  domain: 'generative';
  title: string;
  description?: string;
  topicCategory?: string; // e.g. "optics", "quantum", "neural_net", "cellular_automata", "fluids", "economics"
  setupCode?: string; // initialization code returning state object
  renderCode: string; // (ctx, width, height, time, params, state, mouse) => void
  interactionCode?: string; // (event, state, params, width, height) => void
  initialState?: Record<string, any>;
  params: InteractiveParam[];
}

// 9. Interactive 3D Graphs & Surfaces Spec
export interface ThreeDGraphSpec {
  domain: '3d';
  title: string;
  description?: string;
  graphType: 'surface' | 'curve' | 'vector_field' | 'scatter';
  surface?: {
    equation: string; // e.g. "sin(sqrt(x^2 + y^2) * a) * b"
    xRange: [number, number];
    yRange: [number, number];
    resolution?: number; // grid steps, default 28
    colorMap?: 'viridis' | 'plasma' | 'coolwarm' | 'neon' | 'spectral';
    wireframe?: boolean;
    showContours?: boolean;
  };
  curve?: {
    expressionX: string;
    expressionY: string;
    expressionZ: string;
    tRange: [number, number];
    tResolution?: number;
    color?: string;
    showParticle?: boolean;
  };
  points?: Array<{ x: number; y: number; z: number; color?: string; size?: number; label?: string }>;
  vectors?: Array<{ origin: [number, number, number]; direction: [number, number, number]; color?: string; label?: string }>;
  camera?: {
    pitch?: number;
    yaw?: number;
    zoom?: number;
    autoRotate?: boolean;
  };
  params: InteractiveParam[];
}

// 10. Interactive Annotated Diagrams Spec
export interface DiagramHotspot {
  id: string;
  label: string; // short badge e.g. "1", "Aorta"
  title: string;
  description: string;
  x: number; // percentage (0-100) or canvas coord
  y: number; // percentage (0-100) or canvas coord
  color?: string;
  category?: string;
  details?: string[];
  calloutSide?: 'top' | 'bottom' | 'left' | 'right';
}

export interface DiagramShape {
  id: string;
  type: 'path' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'text' | 'arrow';
  d?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  points?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  label?: string;
}

export interface DiagramTourStep {
  hotspotId: string;
  stepTitle: string;
  stepExplanation: string;
}

export interface AnnotatedDiagramSpec {
  domain: 'diagram';
  title: string;
  description?: string;
  topicCategory?: string; // e.g. "anatomy", "geology", "engineering", "architecture", "biology"
  viewBox?: { width: number; height: number };
  shapes: DiagramShape[];
  hotspots: DiagramHotspot[];
  categories?: string[];
  guidedTourSteps?: DiagramTourStep[];
  params: InteractiveParam[];
}

export type SimulationSpec =
  | MathPlotSpec
  | CircuitSpec
  | PhysicsRigSpec
  | ChemReactionSpec
  | AlgorithmSpec
  | LogicGateSpec
  | OrbitSpec
  | GenerativeCanvasSpec
  | ThreeDGraphSpec
  | AnnotatedDiagramSpec;

// ----------------------------------------------------
// Agentic Thought Trace & Self-Verification Types
// ----------------------------------------------------

export interface AgenticStep {
  phase: 'analysis' | 'draft' | 'validation' | 'correction' | 'final';
  title: string;
  detail: string;
  timestamp: number;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
}

export interface DomainCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface DomainValidationReport {
  domain: DomainType;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixesApplied: string[];
  checks: DomainCheck[];
}

export interface AgenticTrace {
  plan: string;
  assumptions?: string[];
  limitations?: string[];
  steps: AgenticStep[];
  validationReport: DomainValidationReport;
  attempts: number;
  correctionsMade: string[];
}

// Note Structure
export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  attachedSimulation?: SimulationSpec;
  attachedTrace?: AgenticTrace;
}

// ----------------------------------------------------
// Flexible AI Provider Architecture Types
// ----------------------------------------------------

export type AIProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'groq'
  | 'ollama'
  | 'custom_openai'
  | 'mock';

export interface ProviderCapability {
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsJsonSchema: boolean;
  defaultModel?: string;
  modelPlaceholder?: string;
  defaultBaseURL?: string;
  allowsAPIKey: boolean;
  apiKeyOptional?: boolean;
}

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  customHeaders?: Record<string, string>;
}

export interface AIProviderSettings {
  activeProvider: AIProviderId;
  agenticVerification: boolean; // Enables agentic planning, verification tools & auto-correction loop
  fallbackToOfflineOnFailure: boolean;
  temperature: number; // 0.0 to 1.0 (default 0.2)
  providers: Record<AIProviderId, ProviderConfig>;

  // Backwards compatibility fields:
  apiKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
  };
  customEndpoint?: string;
  modelOverride?: string;
}

export interface GenerationStatusEvent {
  step: 'preparing' | 'sending' | 'synthesizing' | 'parsing' | 'validating' | 'done' | 'fallback';
  message: string;
  provider: AIProviderId;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelUsed?: string;
}

export interface AgentProposal {
  summary: string;
  assumptions: string[];
  limitations: string[];
}

export interface AIGenerationRequest {
  noteContent: string;
  selectedText?: string;
  sketchImageBase64?: string;
  domainHint?: DomainType;
  instructions?: string;
  temperature?: number;
  onStatusUpdate?: (status: GenerationStatusEvent) => void;
  skipAgenticVerification?: boolean;
  currentSpec?: SimulationSpec;
  /** Total model calls, including the initial draft; clamped to 1–6. */
  maxAttempts?: number;
  signal?: AbortSignal;
}

export interface AIGenerationResponse {
  spec: SimulationSpec;
  explanation: string;
  tokensUsed?: number;
  providerUsed?: AIProviderId;
  modelUsed?: string;
  isFallback?: boolean;
  agentTrace?: AgenticTrace;
  proposal?: AgentProposal;
}
