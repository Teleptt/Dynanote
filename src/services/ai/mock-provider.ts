import {
  AIGenerationRequest,
  AIGenerationResponse,
  ProviderCapability,
  ProviderConfig,
  SimulationSpec,
  TestConnectionResult
} from '../../types';
import { IAIProvider } from './provider-interface';

export class MockOfflineProvider implements IAIProvider {
  id = 'mock' as const;
  name = 'Offline Example Library';
  description = 'Keyword-selected educational examples. Does not interpret sketches or synthesize new models.';

  capabilities: ProviderCapability = {
    supportsVision: false,
    supportsStreaming: false,
    supportsJsonSchema: true,
    defaultModel: 'offline-v1',
    modelPlaceholder: 'Built-in Simulation Engine',
    allowsAPIKey: false
  };

  async generateSimulation(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    if (request.currentSpec) throw new Error('Refining a model requires an AI provider. The offline library only selects examples.');
    if (request.sketchImageBase64) throw new Error('Sketch interpretation requires a vision-capable AI provider.');
    request.onStatusUpdate?.({
      step: 'synthesizing',
      message: 'Synthesizing simulation via offline domain engine...',
      provider: this.id
    });

    // Small artificial delay so the UI feels responsive
    await new Promise((resolve) => setTimeout(resolve, 350));

    const text = (
      (request.selectedText || '') +
      ' ' +
      (request.noteContent || '') +
      ' ' +
      ''
    ).toLowerCase();

    const isVectorDotProduct =
      text.includes('dot product') ||
      text.includes('u · v') ||
      text.includes('u·v') ||
      text.includes('u.v') ||
      text.includes('cos \\theta') ||
      text.includes('cos θ') ||
      text.includes('cos(theta)') ||
      text.includes('cos theta') ||
      text.includes('inner product') ||
      (text.includes('vector') && (text.includes('projection') || text.includes('angle') || text.includes('dot')));

    // Determine domain from text or hint
    let domain = request.domainHint;

    if (!domain) {
      if (isVectorDotProduct) {
        domain = 'math';
      } else if (text.includes('3d') || text.includes('surface') || text.includes('multivariable') || text.includes('saddle') || text.includes('lorenz') || text.includes('attractor') || text.includes('vector field') || text.includes('contour') || text.includes('manifold')) {
        domain = '3d';
      } else if (text.includes('anatomy') || text.includes('heart') || text.includes('cardiac') || text.includes('organ') || text.includes('cell') || text.includes('biology') || text.includes('geology') || text.includes('tectonic') || text.includes('diagram') || text.includes('schematic') || text.includes('architecture')) {
        domain = 'diagram';
      } else if (text.includes('logic') || text.includes('gate') || text.includes('truth table') || text.includes('nand') || text.includes('xor') || text.includes('adder') || text.includes('boolean')) {
        domain = 'logic';
      } else if (text.includes('sort') || text.includes('quicksort') || text.includes('binary search') || text.includes('tree') || text.includes('algorithm') || text.includes('dijkstra')) {
        domain = 'algorithm';
      } else if (text.includes('kepler') || text.includes('orbit') || text.includes('planet') || text.includes('astronomy') || text.includes('celestial') || text.includes('solar system') || text.includes('ellipse')) {
        domain = 'orbit';
      } else if (text.includes('wave') || text.includes('diffraction') || text.includes('slit') || text.includes('interference') || text.includes('quantum') || text.includes('generative') || text.includes('fractal')) {
        domain = 'generative';
      } else if (text.includes('circuit') || text.includes('resistor') || text.includes('capacitor') || text.includes('voltage') || text.includes('current') || text.includes('ohm') || text.includes('rlc')) {
        domain = 'circuit';
      } else if (text.includes('pendulum') || text.includes('spring') || text.includes('physics') || text.includes('gravity') || text.includes('collision') || text.includes('mechanics') || text.includes('mass')) {
        domain = 'physics';
      } else if (text.includes('chem') || text.includes('reaction') || text.includes('sn2') || text.includes('nucleophil') || text.includes('molecule') || text.includes('arrow') || text.includes('atom')) {
        domain = 'chemistry';
      } else {
        domain = 'diagram'; // Universal fallback to rich annotated diagram
      }
    }

    let spec: SimulationSpec;
    let explanation = '';

    switch (domain) {
      case 'circuit':
        spec = {
          domain: 'circuit',
          title: 'DC Series Circuit Example',
          description: 'One DC source, resistor, and switch. Current follows I = V/R.',
          simulationType: 'dc',
          components: [
            { id: 'v1', type: 'dc_source', value: 12, unit: 'V', label: '12V DC', pos: { x: 100, y: 190 } },
            { id: 'sw1', type: 'switch', value: 1, unit: '', label: 'Switch', pos: { x: 220, y: 90 }, state: true },
            { id: 'r1', type: 'resistor', value: 50, unit: 'Ω', label: 'Resistor', pos: { x: 400, y: 190 } }
          ],
          wires: [
            { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'sw1', pin: 0 } },
            { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 } },
            { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'v1', pin: 1 } }
          ],
          params: [
            { id: 'r1', label: 'Resistance (R)', min: 10, max: 200, default: 50, step: 5, unit: 'Ω' },
            { id: 'v1', label: 'Supply Voltage (V)', min: 1, max: 30, default: 12, step: 1, unit: 'V' }
          ]
        };
        explanation = 'Selected a DC series circuit example. Click the switch to interrupt current flow, or drag the voltage and resistance sliders to see electron velocity adjust dynamically.';
        break;

      case 'physics':
        spec = {
          domain: 'physics',
          title: 'Coupled Spring-Mass Harmonic Oscillator',
          description: 'A physical rig demonstrating Hooke\'s law, damped harmonic oscillation, and real-time velocity/force vector displays.',
          gravity: { x: 0, y: 9.8 },
          bodies: [
            { id: 'ceiling', type: 'box', pos: { x: 260, y: 50 }, mass: 0, isStatic: true, dimensions: { width: 300, height: 16 }, color: '#4b5563', label: 'Fixed Base' },
            { id: 'bob1', type: 'circle', pos: { x: 200, y: 170 }, velocity: { x: 0, y: 0 }, mass: 2.0, dimensions: { radius: 24 }, color: '#7c3aed', label: 'Mass 1 (2kg)' },
            { id: 'bob2', type: 'cart', pos: { x: 320, y: 260 }, velocity: { x: 0, y: 0 }, mass: 1.5, dimensions: { width: 50, height: 35 }, color: '#3b82f6', label: 'Mass 2 (1.5kg)' }
          ],
          constraints: [
            { id: 's1', type: 'spring', bodyA: 'ceiling', bodyB: 'bob1', stiffness: 45, restLength: 110, damping: 0.1 },
            { id: 's2', type: 'spring', bodyA: 'bob1', bodyB: 'bob2', stiffness: 30, restLength: 80, damping: 0.08 }
          ],
          showVectors: { velocity: true, force: true, trajectory: true },
          params: [
            { id: 'gravity', label: 'Gravity (g)', min: 0, max: 25, default: 9.8, step: 0.5, unit: 'm/s²' },
            { id: 'stiffness', label: 'Spring Stiffness (k)', min: 10, max: 100, default: 45, step: 5, unit: 'N/m' },
            { id: 'damping', label: 'Fluid Damping (γ)', min: 0, max: 0.5, default: 0.08, step: 0.01 }
          ]
        };
        explanation = 'Simulated a multi-body coupled spring-mass system. Drag the bob with your mouse, tweak spring stiffness, and use the timeline to scrub back and forth.';
        break;

      case 'chemistry':
        spec = {
          domain: 'chemistry',
          title: 'SN2 Nucleophilic Substitution Mechanism',
          description: 'Bimolecular nucleophilic substitution of bromomethane by hydroxide ion, featuring animated curved electron pushing arrows and Walden inversion.',
          equation: 'OH⁻ + CH₃Br → [HO···CH₃···Br]‡ → CH₃OH + Br⁻',
          reactionType: 'sn2',
          reactants: [
            { name: 'Hydroxide ion', formula: 'OH⁻', coefficient: 1 },
            { name: 'Bromomethane', formula: 'CH₃Br', coefficient: 1 }
          ],
          products: [
            { name: 'Methanol', formula: 'CH₃OH', coefficient: 1 },
            { name: 'Bromide ion', formula: 'Br⁻', coefficient: 1 }
          ],
          mechanismSteps: [
            {
              stepNumber: 1,
              description: 'Step 1: Nucleophile (OH⁻) attacks the electrophilic carbon from the backside (180° away from the Br leaving group).',
              atoms: [
                { id: 'Nu', element: 'O', pos: { x: 120, y: 180 }, charge: -1, lonePairs: 3 },
                { id: 'H_nu', element: 'H', pos: { x: 90, y: 150 } },
                { id: 'C', element: 'C', pos: { x: 260, y: 180 } },
                { id: 'Br', element: 'Br', pos: { x: 400, y: 180 }, charge: 0 },
                { id: 'H1', element: 'H', pos: { x: 260, y: 110 } },
                { id: 'H2', element: 'H', pos: { x: 230, y: 245 } },
                { id: 'H3', element: 'H', pos: { x: 285, y: 245 } }
              ],
              bonds: [
                { id: 'b_nu', from: 'Nu', to: 'H_nu', order: 1 },
                { id: 'b1', from: 'C', to: 'Br', order: 1 },
                { id: 'b2', from: 'C', to: 'H1', order: 1 },
                { id: 'b3', from: 'C', to: 'H2', order: 1 },
                { id: 'b4', from: 'C', to: 'H3', order: 1 }
              ],
              curvedArrows: [
                { id: 'a1', from: { type: 'lone_pair', id: 'Nu' }, to: { type: 'atom', id: 'C' }, electrons: 2, label: 'nucleophilic attack' },
                { id: 'a2', from: { type: 'bond', id: 'b1' }, to: { type: 'atom', id: 'Br' }, electrons: 2, label: 'C-Br bond cleaves' }
              ]
            },
            {
              stepNumber: 2,
              description: 'Step 2: Transition state resolves with inversion of stereochemistry, forming methanol and releasing bromide.',
              atoms: [
                { id: 'Nu', element: 'O', pos: { x: 200, y: 180 }, charge: 0 },
                { id: 'H_nu', element: 'H', pos: { x: 170, y: 140 } },
                { id: 'C', element: 'C', pos: { x: 280, y: 180 } },
                { id: 'Br', element: 'Br', pos: { x: 440, y: 180 }, charge: -1, lonePairs: 4 },
                { id: 'H1', element: 'H', pos: { x: 280, y: 110 } },
                { id: 'H2', element: 'H', pos: { x: 305, y: 245 } },
                { id: 'H3', element: 'H', pos: { x: 255, y: 245 } }
              ],
              bonds: [
                { id: 'b_nu', from: 'Nu', to: 'H_nu', order: 1 },
                { id: 'b_new', from: 'Nu', to: 'C', order: 1 },
                { id: 'b2', from: 'C', to: 'H1', order: 1 },
                { id: 'b3', from: 'C', to: 'H2', order: 1 },
                { id: 'b4', from: 'C', to: 'H3', order: 1 }
              ],
              curvedArrows: []
            }
          ],
          params: [
            { id: 'temp', label: 'Activation Energy (kJ/mol)', min: 50, max: 150, default: 85, step: 5, unit: 'kJ' }
          ]
        };
        explanation = 'Constructed an animated SN2 chemical reaction mechanism with electron pushing curved arrows, nucleophilic attack, and stereochemical umbrella inversion.';
        break;

      case 'algorithm':
        spec = {
          domain: 'algorithm',
          title: 'Quicksort Partition & Sorting Trace',
          description: 'Step-by-step partition and swap visualization of Quicksort with comparisons and swap counters.',
          algorithmType: 'sorting',
          algorithmName: 'Quicksort',
          initialData: [54, 26, 93, 17, 77, 31, 44, 55, 20],
          steps: [
            { stepIndex: 0, description: 'Initial unsorted array', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [], swappingIndices: [], sortedIndices: [] },
            { stepIndex: 1, description: 'Select pivot 54 (first element). Compare 26 <= 54 (OK)', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [0, 1], swappingIndices: [], sortedIndices: [] },
            { stepIndex: 2, description: 'Compare 93 > 54. Found left candidate at index 2 (93).', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [0, 2], swappingIndices: [], sortedIndices: [] },
            { stepIndex: 3, description: 'Scanning from right: 20 <= 54. Found right candidate at index 8 (20). Swap 93 and 20.', array: [54, 26, 20, 17, 77, 31, 44, 55, 93], comparingIndices: [], swappingIndices: [2, 8], sortedIndices: [] },
            { stepIndex: 4, description: 'Continue scanning: 77 > 54 (index 4) and 44 <= 54 (index 6). Swap 77 and 44.', array: [54, 26, 20, 17, 44, 31, 77, 55, 93], comparingIndices: [], swappingIndices: [4, 6], sortedIndices: [] },
            { stepIndex: 5, description: 'Pointers crossed at index 5 (31). Swap pivot 54 with 31.', array: [31, 26, 20, 17, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [0, 5], sortedIndices: [5] },
            { stepIndex: 6, description: 'Pivot 54 in its final sorted position. Recurse on sub-arrays.', array: [31, 26, 20, 17, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [], sortedIndices: [5] },
            { stepIndex: 7, description: 'Partition sub-array [31, 26, 20, 17, 44]. Pivot 31 places into index 3.', array: [17, 26, 20, 31, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [0, 3], sortedIndices: [3, 4, 5] },
            { stepIndex: 8, description: 'Final sorted array reached across all recursive partitions.', array: [17, 20, 26, 31, 44, 54, 55, 77, 93], comparingIndices: [], swappingIndices: [], sortedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
          ],
          params: []
        };
        explanation = 'Synthesized a step-by-step Quicksort algorithm visualization with color-coded comparison and swap states. Use the step controls or play button to watch it sort.';
        break;

      case 'logic':
        spec = {
          domain: 'logic',
          title: 'Full Adder & Digital Logic Signal Flow',
          description: '1-bit Full Adder circuit computing Sum = A ⊕ B ⊕ Cin and Carry = (A·B) + (Cin·(A⊕B)) with interactive input toggles and active truth table.',
          inputs: [
            { id: 'in_a', label: 'Input A', pos: { x: 50, y: 80 }, initialValue: 1 },
            { id: 'in_b', label: 'Input B', pos: { x: 50, y: 160 }, initialValue: 1 },
            { id: 'in_cin', label: 'Carry In (Cin)', pos: { x: 50, y: 250 }, initialValue: 0 }
          ],
          gates: [
            { id: 'xor1', type: 'XOR', pos: { x: 200, y: 110 }, label: 'XOR1' },
            { id: 'and1', type: 'AND', pos: { x: 200, y: 210 }, label: 'AND1' },
            { id: 'xor2', type: 'XOR', pos: { x: 350, y: 130 }, label: 'XOR2' },
            { id: 'and2', type: 'AND', pos: { x: 350, y: 270 }, label: 'AND2' },
            { id: 'or1', type: 'OR', pos: { x: 480, y: 240 }, label: 'OR1' }
          ],
          outputs: [
            { id: 'out_sum', label: 'Sum (S)', pos: { x: 520, y: 130 }, fromGateId: 'xor2' },
            { id: 'out_cout', label: 'Carry Out (Cout)', pos: { x: 600, y: 240 }, fromGateId: 'or1' }
          ],
          wires: [
            { id: 'w1', fromId: 'in_a', toId: 'xor1', inputIndex: 0 },
            { id: 'w2', fromId: 'in_b', toId: 'xor1', inputIndex: 1 },
            { id: 'w3', fromId: 'in_a', toId: 'and1', inputIndex: 0 },
            { id: 'w4', fromId: 'in_b', toId: 'and1', inputIndex: 1 },
            { id: 'w5', fromId: 'xor1', toId: 'xor2', inputIndex: 0 },
            { id: 'w6', fromId: 'in_cin', toId: 'xor2', inputIndex: 1 },
            { id: 'w7', fromId: 'xor1', toId: 'and2', inputIndex: 0 },
            { id: 'w8', fromId: 'in_cin', toId: 'and2', inputIndex: 1 },
            { id: 'w9', fromId: 'and1', toId: 'or1', inputIndex: 0 },
            { id: 'w10', fromId: 'and2', toId: 'or1', inputIndex: 1 }
          ],
          truthTable: [
            { inputs: { 'Input A': 0, 'Input B': 0, 'Carry In (Cin)': 0 }, outputs: { 'Sum (S)': 0, 'Carry Out (Cout)': 0 } },
            { inputs: { 'Input A': 1, 'Input B': 0, 'Carry In (Cin)': 0 }, outputs: { 'Sum (S)': 1, 'Carry Out (Cout)': 0 } },
            { inputs: { 'Input A': 0, 'Input B': 1, 'Carry In (Cin)': 0 }, outputs: { 'Sum (S)': 1, 'Carry Out (Cout)': 0 } },
            { inputs: { 'Input A': 1, 'Input B': 1, 'Carry In (Cin)': 0 }, outputs: { 'Sum (S)': 0, 'Carry Out (Cout)': 1 } },
            { inputs: { 'Input A': 0, 'Input B': 0, 'Carry In (Cin)': 1 }, outputs: { 'Sum (S)': 1, 'Carry Out (Cout)': 0 } },
            { inputs: { 'Input A': 1, 'Input B': 0, 'Carry In (Cin)': 1 }, outputs: { 'Sum (S)': 0, 'Carry Out (Cout)': 1 } },
            { inputs: { 'Input A': 0, 'Input B': 1, 'Carry In (Cin)': 1 }, outputs: { 'Sum (S)': 0, 'Carry Out (Cout)': 1 } },
            { inputs: { 'Input A': 1, 'Input B': 1, 'Carry In (Cin)': 1 }, outputs: { 'Sum (S)': 1, 'Carry Out (Cout)': 1 } }
          ],
          params: []
        };
        explanation = 'Constructed an interactive 1-bit Full Adder logic schematic. Click the 0/1 input buttons to see signals propagate live and highlight the active truth table row.';
        break;

      case 'orbit':
        spec = {
          domain: 'orbit',
          title: 'Keplerian Elliptical Orbits & Equal Areas Law',
          description: 'Demonstrating Kepler\'s 1st and 2nd Laws: planets orbit in ellipses with the Sun at one focus, sweeping out equal areas in equal times.',
          centralBody: {
            name: 'Sun',
            mass: 1.989e30,
            radius: 22,
            color: '#f59e0b'
          },
          bodies: [
            {
              id: 'earth',
              name: 'Earth (Low Eccentricity)',
              mass: 5.972e24,
              radius: 8,
              semiMajorAxis: 130,
              eccentricity: 0.1,
              orbitalPeriod: 10,
              color: '#38bdf8',
              showTrail: true,
              showVectors: true
            },
            {
              id: 'comet',
              name: 'Halley-type Comet (High Eccentricity)',
              mass: 2.2e14,
              radius: 6,
              semiMajorAxis: 200,
              eccentricity: 0.72,
              orbitalPeriod: 16,
              color: '#f43f5e',
              showTrail: true,
              showVectors: true
            }
          ],
          keplerSweep: {
            enabled: true,
            sectorAngleSpan: 0.35
          },
          timeScale: 1,
          params: [
            { id: 'timeScale', label: 'Warp Speed', min: 0.2, max: 4, default: 1, step: 0.2, unit: 'x' },
            { id: 'eccentricity', label: 'Comet Eccentricity (e)', min: 0.1, max: 0.88, default: 0.72, step: 0.02 }
          ]
        };
        explanation = 'Simulated Keplerian planetary orbits with velocity vectors and Kepler\'s 2nd law sector sweeps. Notice how velocity accelerates near perihelion!';
        break;

      case 'generative':
        throw new Error('This topic requires an AI provider to produce a declarative visualization. Script-based demos have been retired.');

      case '3d':
        spec = {
          domain: '3d',
          title: 'Multivariable Calculus: 3D Ripple Surface & Critical Points',
          description: 'Interactive 3D graph of z = sin(sqrt(x² + y²) · a) · b with real-time OrbitControls (drag to rotate, scroll to zoom), elevation colormaps, and projected floor contour rings.',
          graphType: 'surface',
          surface: {
            equation: 'sin(sqrt(x^2 + y^2) * a) * b',
            xRange: [-3.2, 3.2],
            yRange: [-3.2, 3.2],
            resolution: 30,
            colorMap: 'viridis',
            wireframe: false,
            showContours: true
          },
          camera: {
            pitch: 0.65,
            yaw: 0.85,
            zoom: 1.15,
            autoRotate: true
          },
          params: [
            { id: 'a', label: 'Wave Frequency (a)', min: 0.5, max: 4.0, default: 1.8, step: 0.1, unit: 'rad/m' },
            { id: 'b', label: 'Peak Amplitude (b)', min: 0.2, max: 2.5, default: 1.2, step: 0.1, unit: 'm' }
          ]
        };
        explanation = 'Rendered an interactive 60 FPS 3D multivariable surface. Click and drag with your mouse to rotate the camera in pitch and yaw, or toggle auto-rotation.';
        break;

      case 'diagram':
        spec = {
          domain: 'diagram',
          title: 'Anatomy of the Human Heart & Systemic Circulation',
          description: 'Vector schematic of the four chambers, major cardiac vessels, and atrioventricular valves with interactive callout pins and a 5-step guided circulation tour.',
          topicCategory: 'anatomy',
          viewBox: { width: 640, height: 420 },
          shapes: [
            { id: 'heart_muscle', type: 'path', d: 'M 220 100 C 140 100, 110 200, 160 290 C 210 370, 320 400, 320 400 C 320 400, 430 370, 480 290 C 530 200, 500 100, 420 100 C 370 100, 320 150, 320 150 C 320 150, 270 100, 220 100 Z', fill: '#881337', stroke: '#e11d48', strokeWidth: 3, opacity: 0.9 },
            { id: 'vena_cava', type: 'rect', x: 190, y: 30, width: 35, height: 110, fill: '#1e3a8a', stroke: '#3b82f6', strokeWidth: 2 },
            { id: 'aorta_arch', type: 'path', d: 'M 290 140 C 290 50, 410 40, 420 120 L 400 130 C 390 70, 310 75, 310 140 Z', fill: '#991b1b', stroke: '#ef4444', strokeWidth: 2 },
            { id: 'pulmonary_art', type: 'path', d: 'M 260 140 C 260 90, 200 90, 170 120 L 185 135 C 210 115, 245 115, 245 140 Z', fill: '#1e40af', stroke: '#60a5fa', strokeWidth: 2 },
            { id: 'left_ventricle', type: 'ellipse', x: 370, y: 280, radiusX: 45, radiusY: 65, fill: '#4c0519', stroke: '#f43f5e', strokeWidth: 1.5, opacity: 0.8 },
            { id: 'right_ventricle', type: 'ellipse', x: 260, y: 280, radiusX: 42, radiusY: 65, fill: '#172554', stroke: '#3b82f6', strokeWidth: 1.5, opacity: 0.8 },
            { id: 'septum', type: 'rect', x: 308, y: 200, width: 22, height: 150, fill: '#9f1239', stroke: '#e11d48', strokeWidth: 1 }
          ],
          hotspots: [
            {
              id: 'aorta',
              label: '1',
              title: 'Aorta',
              description: 'The largest systemic artery in the body; carries oxygen-rich blood pumped from the left ventricle to all bodily tissues.',
              x: 56,
              y: 18,
              color: '#ef4444',
              category: 'Arteries',
              details: ['Originates at the aortic valve', 'Branches into brachiocephalic, carotid, and subclavian arteries', 'Peak systolic pressure ~120 mmHg']
            },
            {
              id: 'superior_vena_cava',
              label: '2',
              title: 'Superior Vena Cava',
              description: 'Large vein returning deoxygenated systemic blood from the head, neck, and upper limbs directly into the right atrium.',
              x: 32,
              y: 16,
              color: '#3b82f6',
              category: 'Veins',
              details: ['Low pressure venous return (~5 mmHg)', 'No valves; relies on thoracic pressure gradients']
            },
            {
              id: 'right_atrium',
              label: '3',
              title: 'Right Atrium',
              description: 'Receives deoxygenated blood from the vena cava and sends it through the tricuspid valve into the right ventricle.',
              x: 27,
              y: 45,
              color: '#60a5fa',
              category: 'Chambers',
              details: ['Houses the Sinoatrial (SA) pacemaker node', 'Thin-walled low resistance chamber']
            },
            {
              id: 'right_ventricle',
              label: '4',
              title: 'Right Ventricle',
              description: 'Pumps deoxygenated blood through the pulmonary semilunar valve into the pulmonary trunk towards the lungs.',
              x: 40,
              y: 68,
              color: '#2563eb',
              category: 'Chambers',
              details: ['Generates pulmonary systolic pressure (~25 mmHg)', 'Crescent-shaped cavity wrapped around left ventricle']
            },
            {
              id: 'left_ventricle',
              label: '5',
              title: 'Left Ventricle (Thick Myocardium)',
              description: 'Primary muscular pump of the systemic circuit; generates high hydrostatic pressure to drive systemic circulation.',
              x: 60,
              y: 68,
              color: '#f43f5e',
              category: 'Chambers',
              details: ['Myocardium is ~3x thicker than right ventricle', 'Generates 120 mmHg systolic pressure']
            }
          ],
          categories: ['Arteries', 'Veins', 'Chambers'],
          guidedTourSteps: [
            { hotspotId: 'superior_vena_cava', stepTitle: 'Step 1: Venous Inflow', stepExplanation: 'Deoxygenated blood from the body enters the heart through the Superior and Inferior Vena Cava.' },
            { hotspotId: 'right_atrium', stepTitle: 'Step 2: Atrial Filling', stepExplanation: 'Blood pools in the Right Atrium before passing through the tricuspid valve.' },
            { hotspotId: 'right_ventricle', stepTitle: 'Step 3: Pulmonary Ejection', stepExplanation: 'Right Ventricle contracts, sending blood to the lungs for gas exchange (CO₂ out, O₂ in).' },
            { hotspotId: 'left_ventricle', stepTitle: 'Step 4: High-Pressure Pumping', stepExplanation: 'Oxygenated blood returns to the Left Ventricle, which has thick muscle walls.' },
            { hotspotId: 'aorta', stepTitle: 'Step 5: Systemic Distribution', stepExplanation: 'The Left Ventricle contracts forcefully, propelling oxygenated blood through the Aorta to the entire body.' }
          ],
          params: []
        };
        explanation = 'Constructed an interactive vector anatomical diagram of the Human Heart with clickable hotspots and a 5-step guided blood circulation tour.';
        break;

      case 'math':
      default:
        spec = {
          domain: 'math',
          title: 'Damped Oscillation & Calculus Tangent Sweep',
          description: 'Visualizing f(x) = e^(-bx) * sin(ax) with interactive parameter sliders, dynamic tangent line tracking, and Riemann integration partitions.',
          bounds: { xMin: -1, xMax: 10, yMin: -2.5, yMax: 2.5 },
          functions: [
            { id: 'f1', expression: 'exp(-b * x) * sin(a * x)', color: '#7c3aed', label: 'f(x) = e^(-bx)·sin(ax)' },
            { id: 'envelope_pos', expression: 'exp(-b * x)', color: '#38bdf8', label: '+Envelope e^(-bx)' },
            { id: 'envelope_neg', expression: '-exp(-b * x)', color: '#38bdf8', label: '-Envelope -e^(-bx)' }
          ],
          calculus: {
            showTangent: true,
            tangentX: 1.8,
            showIntegral: true,
            integralA: 0.5,
            integralB: 4.5,
            integralPartitions: 18
          },
          params: [
            { id: 'a', label: 'Angular Frequency (a)', min: 0.5, max: 6.0, default: 2.5, step: 0.1, unit: 'rad/s' },
            { id: 'b', label: 'Damping Factor (b)', min: 0.0, max: 1.0, default: 0.25, step: 0.05 },
            { id: 'tangentX', label: 'Tangent Evaluation Point (x₀)', min: 0, max: 8, default: 1.8, step: 0.1 }
          ]
        };
        explanation = 'Generated a live mathematical function graph with tangent line tracking and Riemann sum integral approximations. Adjust frequency and damping sliders to observe real-time recalculation.';
        break;
    }

    return {
      spec,
      explanation: 'Offline example (not generated from your exact notes): ' + explanation,
      providerUsed: this.id,
      modelUsed: 'offline-v1'
    };
  }

  async testConnection(): Promise<TestConnectionResult> {
    return {
      success: true,
      message: 'Offline engine ready (Zero network dependencies)',
      latencyMs: 1,
      modelUsed: 'offline-v1'
    };
  }
}
