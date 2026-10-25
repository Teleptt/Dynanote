import { Note } from '../types';

export const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-math-1',
    title: 'Calculus - Damped Harmonic Oscillator',
    folder: 'Mathematics',
    tags: ['calculus', 'differential-equations', 'oscillator'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
    content: `# Damped Harmonic Oscillator & Calculus Analysis

A damped oscillator satisfies the second-order linear differential equation:

$$m \\frac{d^2x}{dt^2} + \\gamma \\frac{dx}{dt} + k x = 0$$

For the underdamped case ($\\gamma < 2\\sqrt{mk}$), the general solution is:

$$x(t) = A e^{-bt} \\sin(at + \\phi)$$

\`\`\`dynanote-visual
{
  "domain": "math",
  "title": "Damped Oscillation & Calculus Tangent Sweep",
  "description": "Visualizing f(x) = e^(-bx) * sin(ax) with interactive parameter sliders, dynamic tangent line tracking, and Riemann integration partitions.",
  "bounds": { "xMin": -0.5, "xMax": 10, "yMin": -2.5, "yMax": 2.5 },
  "functions": [
    { "id": "f1", "expression": "exp(-b * x) * sin(a * x)", "color": "#a855f7", "label": "x(t) = e^(-bt)·sin(at)" },
    { "id": "env_pos", "expression": "exp(-b * x)", "color": "#38bdf8", "label": "+Envelope e^(-bt)" },
    { "id": "env_neg", "expression": "-exp(-b * x)", "color": "#38bdf8", "label": "-Envelope -e^(-bt)" }
  ],
  "calculus": {
    "showTangent": true,
    "tangentX": 1.8,
    "showIntegral": true,
    "integralA": 0.5,
    "integralB": 4.5,
    "integralPartitions": 18
  },
  "params": [
    { "id": "a", "label": "Angular Frequency (a)", "min": 0.5, "max": 6.0, "default": 2.5, "step": 0.1, "unit": "rad/s" },
    { "id": "b", "label": "Damping Factor (b)", "min": 0.0, "max": 1.0, "default": 0.25, "step": 0.05 },
    { "id": "tangentX", "label": "Evaluation Point (x₀)", "min": 0, "max": 8, "default": 1.8, "step": 0.1 }
  ]
}
\`\`\`

Where:
- $b = \\frac{\\gamma}{2m}$ is the **damping coefficient**
- $a = \\omega_d = \\sqrt{\\omega_0^2 - b^2}$ is the **damped natural frequency**
- The upper and lower envelopes are given by $\\pm A e^{-bt}$.

### Calculus Inquiries:
1. What is the instantaneous velocity $v(t) = \\frac{dx}{dt}$ at any point $t_0$?
2. How does varying the frequency $a$ and damping $b$ affect the rate of energy dissipation?
3. What is the cumulative energy dissipated, approximated by the Riemann integral $\\int_0^T x^2(t) dt$?

*Click **"Visualize Note"** or use the attached simulation below to inspect dynamic tangent tracking and Riemann sums.*`,
    attachedSimulation: {
      domain: 'math',
      title: 'Damped Oscillation & Calculus Tangent Sweep',
      description: 'Visualizing f(x) = e^(-bx) * sin(ax) with interactive parameter sliders, dynamic tangent line tracking, and Riemann integration partitions.',
      bounds: { xMin: -0.5, xMax: 10, yMin: -2.5, yMax: 2.5 },
      functions: [
        { id: 'f1', expression: 'exp(-b * x) * sin(a * x)', color: '#a855f7', label: 'x(t) = e^(-bt)·sin(at)' },
        { id: 'env_pos', expression: 'exp(-b * x)', color: '#38bdf8', label: '+Envelope e^(-bt)' },
        { id: 'env_neg', expression: '-exp(-b * x)', color: '#38bdf8', label: '-Envelope -e^(-bt)' }
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
        { id: 'tangentX', label: 'Evaluation Point (x₀)', min: 0, max: 8, default: 1.8, step: 0.1 }
      ]
    },
    attachedTrace: {
      plan: 'Analyzed second-order linear damped harmonic differential equation. Verified coordinate intervals and confirmed smooth exponential envelope boundaries.',
      steps: [
        { phase: 'analysis', title: 'Calculus Boundary Formulation', detail: 'Determined envelope boundaries +/- e^(-bx) and established positive non-zero damping range.', timestamp: Date.now() - 3600000, status: 'success' },
        { phase: 'validation', title: 'Mathematical Finiteness Verification', detail: 'Evaluated function across 30 sample points; 0 NaN or undefined values encountered.', timestamp: Date.now() - 3550000, status: 'success' },
        { phase: 'final', title: 'Certified Calculus Model', detail: 'Validated tangent line differential derivative m = dy/dx at x0 = 1.8.', timestamp: Date.now() - 3500000, status: 'success' }
      ],
      validationReport: {
        domain: 'math',
        isValid: true,
        errors: [],
        warnings: [],
        fixesApplied: ['Adjusted integral upper bound b > a'],
        checks: [
          { name: 'Coordinate Bounds', passed: true, message: 'Valid bounds [-0.5, 10]' },
          { name: 'Function Existence', passed: true, message: '3 function(s) defined (primary curve + envelopes).' },
          { name: 'Function Finiteness & Continuity', passed: true, message: 'Cleanly evaluated without division-by-zero.' },
          { name: 'Calculus Interval Check', passed: true, message: 'Integral interval [0.5, 4.5] is well-formed.' }
        ]
      },
      attempts: 1,
      correctionsMade: ['Adjusted integral upper bound b > a for valid area integration']
    }
  },
  {
    id: 'note-circuit-1',
    title: 'Electronics - RLC Series Circuit',
    folder: 'Physics',
    tags: ['circuits', 'electronics', 'mna', 'ac-dc'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    content: `# Series RLC Circuit & Transient Response

An RLC circuit consists of a resistor $R$, an inductor $L$, and a capacitor $C$ connected in series across a voltage source $V_s$.

Applying Kirchhoff's Voltage Law (KVL):

$$V_s(t) = V_R(t) + V_L(t) + V_C(t) = R i(t) + L \\frac{di(t)}{dt} + \\frac{1}{C} \\int i(t) dt$$

### Key Observations:
- **Resistor ($R$):** Dissipates energy as heat according to Joule's law $P = I^2 R$.
- **Inductor ($L$):** Opposes instantaneous changes in current by generating back-EMF $\\mathcal{E} = -L \\frac{di}{dt}$.
- **Capacitor ($C$):** Stores electrostatic potential energy in electric field $E = \\frac{1}{2} C V^2$.

### Current Flow & Particles:
When the power switch is closed, mobile charge carriers (electrons) drift through the conductors. The particle drift velocity is directly proportional to loop current $I$.`,
    attachedSimulation: {
      domain: 'circuit',
      title: 'RLC Resonant Circuit with Active Current Flow',
      description: 'A 12V DC source connected via a toggleable switch to an RLC circuit. Observe current particle drift and capacitive voltage charging.',
      simulationType: 'transient',
      frequency: 60,
      components: [
        { id: 'v1', type: 'dc_source', value: 12, unit: 'V', label: '12V DC', pos: { x: 100, y: 190 }, rotation: 0 },
        { id: 'sw1', type: 'switch', value: 1, unit: '', label: 'Power Switch', pos: { x: 190, y: 90 }, rotation: 0, state: true },
        { id: 'r1', type: 'resistor', value: 50, unit: 'Ω', label: '50 Ω', pos: { x: 300, y: 90 }, rotation: 0 },
        { id: 'l1', type: 'inductor', value: 0.05, unit: 'H', label: '50 mH', pos: { x: 420, y: 90 }, rotation: 0 },
        { id: 'c1', type: 'capacitor', value: 0.0002, unit: 'F', label: '200 µF', pos: { x: 470, y: 190 }, rotation: 90 },
        { id: 'lamp', type: 'lamp', value: 10, unit: 'W', label: 'Load Bulb', pos: { x: 300, y: 190 }, rotation: 90 },
        { id: 'gnd', type: 'ground', value: 0, unit: '', label: 'GND', pos: { x: 100, y: 290 }, rotation: 0 }
      ],
      wires: [
        { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'sw1', pin: 0 } },
        { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 } },
        { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'l1', pin: 0 } },
        { id: 'w4', from: { compId: 'l1', pin: 1 }, to: { compId: 'c1', pin: 0 } },
        { id: 'w5', from: { compId: 'c1', pin: 1 }, to: { compId: 'v1', pin: 1 } },
        { id: 'w6', from: { compId: 'r1', pin: 1 }, to: { compId: 'lamp', pin: 0 } },
        { id: 'w7', from: { compId: 'lamp', pin: 1 }, to: { compId: 'c1', pin: 1 } }
      ],
      params: [
        { id: 'r1', label: 'Resistance (R)', min: 10, max: 200, default: 50, step: 5, unit: 'Ω' },
        { id: 'v1', label: 'Supply Voltage (V)', min: 1, max: 30, default: 12, step: 1, unit: 'V' }
      ]
    },
    attachedTrace: {
      plan: 'Constructed circuit schematic with closed conductive loop, power source, load bulb, and ground node.',
      steps: [
        { phase: 'analysis', title: 'Kirchhoff Topology Plan', detail: 'Verified continuous closed circuit loop connecting V_source through R, L, C, and GND.', timestamp: Date.now() - 7200000, status: 'success' },
        { phase: 'validation', title: 'KCL & Short-Circuit Linter', detail: 'Verified 7 wire branches and checked that internal resistance R=50 prevents dead short.', timestamp: Date.now() - 7150000, status: 'success' },
        { phase: 'final', title: 'Circuit Flow Certification', detail: 'Drift velocity mapped to loop current I = V / R with switch state control.', timestamp: Date.now() - 7100000, status: 'success' }
      ],
      validationReport: {
        domain: 'circuit',
        isValid: true,
        errors: [],
        warnings: [],
        fixesApplied: [],
        checks: [
          { name: 'Power Source Check', passed: true, message: '12V DC power source present.' },
          { name: 'Ground Reference Check', passed: true, message: 'Circuit grounded (0V reference).' },
          { name: 'Wire Connectivity & Topology', passed: true, message: '7 valid wire branches verified.' },
          { name: 'Impedance & Short-Circuit Check', passed: true, message: 'Current finite and bounded by 50Ω load.' }
        ]
      },
      attempts: 1,
      correctionsMade: []
    }
  },
  {
    id: 'note-physics-1',
    title: 'Physics - Coupled Spring Mechanics',
    folder: 'Physics',
    tags: ['physics', 'mechanics', 'springs', 'vectors'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 1,
    content: `# Coupled Spring-Mass Mechanics & Vector Dynamics

Consider two coupled masses $m_1$ and $m_2$ suspended in series from a fixed ceiling mount via ideal springs of stiffness $k_1, k_2$:

Hooke's Restoring Force:
$$\\mathbf{F}_s = -k (\\mathbf{x} - \\mathbf{x}_0)$$

Gravitational Force:
$$\\mathbf{F}_g = m \\mathbf{g}$$

Fluid Viscous Drag:
$$\\mathbf{F}_d = -\\gamma \\mathbf{v}$$

### Equations of Motion:
$$m_1 \\ddot{y}_1 = -k_1 (y_1 - L_1) + k_2 (y_2 - y_1 - L_2) - \\gamma_1 \\dot{y}_1 + m_1 g$$
$$m_2 \\ddot{y}_2 = -k_2 (y_2 - y_1 - L_2) - \\gamma_2 \\dot{y}_2 + m_2 g$$

*In the visualizer, you can grab either mass with your cursor to pull and release, observing real-time velocity and force vectors!*`,
    attachedSimulation: {
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
    },
    attachedTrace: {
      plan: 'Configured coupled 2-body Hooke springs suspended from static ceiling anchor. Verified numerical integration stability.',
      steps: [
        { phase: 'analysis', title: 'Verlet Stability Analysis', detail: 'Checked natural frequencies omega = sqrt(k/m) to prevent numerical blowup with dt=0.016s.', timestamp: Date.now() - 10000000, status: 'success' },
        { phase: 'validation', title: 'Kinematic Constraint Linter', detail: 'Validated body anchoring to ceiling mount (isStatic=true) and verified viewport bounds.', timestamp: Date.now() - 9950000, status: 'success' },
        { phase: 'final', title: 'Physics Rig Certification', detail: 'Energy conservation verified across 1,000 oscillatory cycles.', timestamp: Date.now() - 9900000, status: 'success' }
      ],
      validationReport: {
        domain: 'physics',
        isValid: true,
        errors: [],
        warnings: [],
        fixesApplied: [],
        checks: [
          { name: 'Verlet Numerical Stability', passed: true, message: 'k/m ratio satisfies stability limit sqrt(k/m)*dt < 0.8.' },
          { name: 'Constraint Graph Validity', passed: true, message: '2 kinematic constraints connected to valid bodies.' },
          { name: 'System Anchor Check', passed: true, message: 'Fixed ceiling mount created for stability.' }
        ]
      },
      attempts: 1,
      correctionsMade: []
    }
  },
  {
    id: 'note-chem-1',
    title: 'Chemistry - SN2 Nucleophilic Substitution',
    folder: 'Chemistry',
    tags: ['chemistry', 'organic-chemistry', 'sn2', 'mechanisms'],
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 30,
    content: `# Bimolecular Nucleophilic Substitution ($S_N2$)

The $S_N2$ reaction is a concerted one-step mechanism where bond-forming and bond-breaking happen simultaneously.

$$\\text{HO}^- + \\text{CH}_3\\text{Br} \\longrightarrow [\\text{HO}\\cdots\\text{CH}_3\\cdots\\text{Br}]^{\\ddagger} \\longrightarrow \\text{CH}_3\\text{OH} + \\text{Br}^-$$

### Kinetic Rate Law:
$$\\text{Rate} = k [\\text{Nu}^-][\\text{R-LG}]$$

Second-order kinetics: rate depends on both the concentration of the nucleophile and the alkyl halide.

### Stereochemistry:
- **Walden Inversion:** The nucleophile must attack from the backside of the carbon-leaving group bond ($180^\\circ$ angle).
- This causes the three peripheral hydrogen atoms to flip inward like an umbrella in high wind!
- Electron pushing curved arrows show the 2-electron pair moving from the nucleophilic lone pair to the carbon center.`,
    attachedSimulation: {
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
    },
    attachedTrace: {
      plan: 'Validated SN2 electron pushing arrows and Walden inversion umbrella coordinates.',
      steps: [
        { phase: 'analysis', title: 'Reaction Mechanism Formulation', detail: 'Backside attack geometry at 180 degrees to C-Br bond.', timestamp: Date.now() - 15000000, status: 'success' },
        { phase: 'validation', title: 'Curved Arrow Linter', detail: 'Verified 2-electron pair donor (O lone pair) and acceptor (C-Br sigma star).', timestamp: Date.now() - 14950000, status: 'success' },
        { phase: 'final', title: 'Stereochemical Certification', detail: 'Inverted tetrahedral carbon confirmed.', timestamp: Date.now() - 14900000, status: 'success' }
      ],
      validationReport: {
        domain: 'chemistry',
        isValid: true,
        errors: [],
        warnings: [],
        fixesApplied: [],
        checks: [
          { name: 'Mechanism Step Check', passed: true, message: '2 reaction step(s) verified.' },
          { name: 'Curved Arrow Electron Pushing', passed: true, message: 'All arrow endpoints point to verified donor/acceptor atoms and bonds.' }
        ]
      },
      attempts: 1,
      correctionsMade: []
    }
  },
  {
    id: 'note-algo-1',
    title: 'Computer Science - Quicksort & Divide and Conquer',
    folder: 'Computer Science',
    tags: ['algorithms', 'quicksort', 'sorting', 'divide-and-conquer'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 30,
    content: `# Quicksort: Divide & Conquer Partitioning

Quicksort is an efficient $O(n \\log n)$ average-case comparison-based sorting algorithm discovered by Tony Hoare.

### Recurrence Relation:
For balanced partitions:
$$T(n) = 2T(n/2) + \\Theta(n) \\implies T(n) = \\Theta(n \\log n)$$

\`\`\`dynanote-visual
{
  "domain": "algorithm",
  "title": "Quicksort Partition & Sorting Trace",
  "description": "Step-by-step partition and swap visualization of Quicksort with comparisons and swap counters.",
  "algorithmType": "sorting",
  "algorithmName": "Quicksort",
  "initialData": [54, 26, 93, 17, 77, 31, 44, 55, 20],
  "steps": [
    { "stepIndex": 0, "description": "Initial unsorted array", "array": [54, 26, 93, 17, 77, 31, 44, 55, 20], "comparingIndices": [], "swappingIndices": [], "sortedIndices": [] },
    { "stepIndex": 1, "description": "Select pivot 54. Compare 26 <= 54 (OK)", "array": [54, 26, 93, 17, 77, 31, 44, 55, 20], "comparingIndices": [0, 1], "swappingIndices": [], "sortedIndices": [] },
    { "stepIndex": 2, "description": "Compare 93 > 54. Found left candidate at index 2 (93).", "array": [54, 26, 93, 17, 77, 31, 44, 55, 20], "comparingIndices": [0, 2], "swappingIndices": [], "sortedIndices": [] },
    { "stepIndex": 3, "description": "Scanning right: 20 <= 54. Found right candidate at index 8 (20). Swap 93 and 20.", "array": [54, 26, 20, 17, 77, 31, 44, 55, 93], "comparingIndices": [], "swappingIndices": [2, 8], "sortedIndices": [] },
    { "stepIndex": 4, "description": "Continue scanning: 77 > 54 (index 4) and 44 <= 54 (index 6). Swap 77 and 44.", "array": [54, 26, 20, 17, 44, 31, 77, 55, 93], "comparingIndices": [], "swappingIndices": [4, 6], "sortedIndices": [] },
    { "stepIndex": 5, "description": "Pointers crossed at index 5 (31). Swap pivot 54 with 31.", "array": [31, 26, 20, 17, 44, 54, 77, 55, 93], "comparingIndices": [], "swappingIndices": [0, 5], "sortedIndices": [5] },
    { "stepIndex": 6, "description": "Pivot 54 in final position. Partitioning sub-arrays recursively.", "array": [31, 26, 20, 17, 44, 54, 77, 55, 93], "comparingIndices": [], "swappingIndices": [], "sortedIndices": [5] },
    { "stepIndex": 7, "description": "Partition sub-array [31, 26, 20, 17, 44]. Pivot 31 placed.", "array": [17, 26, 20, 31, 44, 54, 77, 55, 93], "comparingIndices": [], "swappingIndices": [0, 3], "sortedIndices": [3, 4, 5] },
    { "stepIndex": 8, "description": "Complete sorted array achieved across all recursive calls.", "array": [17, 20, 26, 31, 44, 54, 55, 77, 93], "comparingIndices": [], "swappingIndices": [], "sortedIndices": [0, 1, 2, 3, 4, 5, 6, 7, 8] }
  ],
  "params": []
}
\`\`\`

### Invariants:
1. All elements left of the pivot index $p$ are $\\le A[p]$
2. All elements right of the pivot index $p$ are $\\ge A[p]$
`,
    attachedSimulation: {
      domain: 'algorithm',
      title: 'Quicksort Partition & Sorting Trace',
      description: 'Step-by-step partition and swap visualization of Quicksort with comparisons and swap counters.',
      algorithmType: 'sorting',
      algorithmName: 'Quicksort',
      initialData: [54, 26, 93, 17, 77, 31, 44, 55, 20],
      steps: [
        { stepIndex: 0, description: 'Initial unsorted array', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 1, description: 'Select pivot 54. Compare 26 <= 54 (OK)', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [0, 1], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 2, description: 'Compare 93 > 54. Found left candidate at index 2 (93).', array: [54, 26, 93, 17, 77, 31, 44, 55, 20], comparingIndices: [0, 2], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 3, description: 'Scanning right: 20 <= 54. Found right candidate at index 8 (20). Swap 93 and 20.', array: [54, 26, 20, 17, 77, 31, 44, 55, 93], comparingIndices: [], swappingIndices: [2, 8], sortedIndices: [] },
        { stepIndex: 4, description: 'Continue scanning: 77 > 54 (index 4) and 44 <= 54 (index 6). Swap 77 and 44.', array: [54, 26, 20, 17, 44, 31, 77, 55, 93], comparingIndices: [], swappingIndices: [4, 6], sortedIndices: [] },
        { stepIndex: 5, description: 'Pointers crossed at index 5 (31). Swap pivot 54 with 31.', array: [31, 26, 20, 17, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [0, 5], sortedIndices: [5] },
        { stepIndex: 6, description: 'Pivot 54 in final position. Partitioning sub-arrays recursively.', array: [31, 26, 20, 17, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [], sortedIndices: [5] },
        { stepIndex: 7, description: 'Partition sub-array [31, 26, 20, 17, 44]. Pivot 31 placed.', array: [17, 26, 20, 31, 44, 54, 77, 55, 93], comparingIndices: [], swappingIndices: [0, 3], sortedIndices: [3, 4, 5] },
        { stepIndex: 8, description: 'Complete sorted array achieved across all recursive calls.', array: [17, 20, 26, 31, 44, 54, 55, 77, 93], comparingIndices: [], swappingIndices: [], sortedIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8] }
      ],
      params: []
    }
  },
  {
    id: 'note-logic-1',
    title: 'Digital Electronics - 1-Bit Full Adder',
    folder: 'Electronics',
    tags: ['digital-logic', 'boolean-algebra', 'adder', 'circuits'],
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    updatedAt: Date.now() - 1000 * 60 * 10,
    content: `# 1-Bit Full Adder & Boolean Logic

A Full Adder computes the sum of three one-bit binary numbers ($A$, $B$, and Carry In $C_{in}$):

### Boolean Equations:
$$\\text{Sum} = A \\oplus B \\oplus C_{in}$$
$$C_{out} = (A \\cdot B) + (C_{in} \\cdot (A \\oplus B))$$

\`\`\`dynanote-visual
{
  "domain": "logic",
  "title": "Full Adder & Digital Logic Signal Flow",
  "description": "1-bit Full Adder circuit computing Sum = A ⊕ B ⊕ Cin and Carry = (A·B) + (Cin·(A⊕B)) with interactive input toggles and active truth table.",
  "inputs": [
    { "id": "in_a", "label": "Input A", "pos": { "x": 50, "y": 80 }, "initialValue": 1 },
    { "id": "in_b", "label": "Input B", "pos": { "x": 50, "y": 160 }, "initialValue": 1 },
    { "id": "in_cin", "label": "Carry In (Cin)", "pos": { "x": 50, "y": 250 }, "initialValue": 0 }
  ],
  "gates": [
    { "id": "xor1", "type": "XOR", "pos": { "x": 200, "y": 110 }, "label": "XOR1" },
    { "id": "and1", "type": "AND", "pos": { "x": 200, "y": 210 }, "label": "AND1" },
    { "id": "xor2", "type": "XOR", "pos": { "x": 350, "y": 130 }, "label": "XOR2" },
    { "id": "and2", "type": "AND", "pos": { "x": 350, "y": 270 }, "label": "AND2" },
    { "id": "or1", "type": "OR", "pos": { "x": 480, "y": 240 }, "label": "OR1" }
  ],
  "outputs": [
    { "id": "out_sum", "label": "Sum (S)", "pos": { "x": 520, "y": 130 }, "fromGateId": "xor2" },
    { "id": "out_cout", "label": "Carry Out (Cout)", "pos": { "x": 600, "y": 240 }, "fromGateId": "or1" }
  ],
  "wires": [
    { "id": "w1", "fromId": "in_a", "toId": "xor1", "inputIndex": 0 },
    { "id": "w2", "fromId": "in_b", "toId": "xor1", "inputIndex": 1 },
    { "id": "w3", "fromId": "in_a", "toId": "and1", "inputIndex": 0 },
    { "id": "w4", "fromId": "in_b", "toId": "and1", "inputIndex": 1 },
    { "id": "w5", "fromId": "xor1", "toId": "xor2", "inputIndex": 0 },
    { "id": "w6", "fromId": "in_cin", "toId": "xor2", "inputIndex": 1 },
    { "id": "w7", "fromId": "xor1", "toId": "and2", "inputIndex": 0 },
    { "id": "w8", "fromId": "in_cin", "toId": "and2", "inputIndex": 1 },
    { "id": "w9", "fromId": "and1", "toId": "or1", "inputIndex": 0 },
    { "id": "w10", "fromId": "and2", "toId": "or1", "inputIndex": 1 }
  ],
  "truthTable": [
    { "inputs": { "Input A": 0, "Input B": 0, "Carry In (Cin)": 0 }, "outputs": { "Sum (S)": 0, "Carry Out (Cout)": 0 } },
    { "inputs": { "Input A": 1, "Input B": 0, "Carry In (Cin)": 0 }, "outputs": { "Sum (S)": 1, "Carry Out (Cout)": 0 } },
    { "inputs": { "Input A": 0, "Input B": 1, "Carry In (Cin)": 0 }, "outputs": { "Sum (S)": 1, "Carry Out (Cout)": 0 } },
    { "inputs": { "Input A": 1, "Input B": 1, "Carry In (Cin)": 0 }, "outputs": { "Sum (S)": 0, "Carry Out (Cout)": 1 } },
    { "inputs": { "Input A": 0, "Input B": 0, "Carry In (Cin)": 1 }, "outputs": { "Sum (S)": 1, "Carry Out (Cout)": 0 } },
    { "inputs": { "Input A": 1, "Input B": 0, "Carry In (Cin)": 1 }, "outputs": { "Sum (S)": 0, "Carry Out (Cout)": 1 } },
    { "inputs": { "Input A": 0, "Input B": 1, "Carry In (Cin)": 1 }, "outputs": { "Sum (S)": 0, "Carry Out (Cout)": 1 } },
    { "inputs": { "Input A": 1, "Input B": 1, "Carry In (Cin)": 1 }, "outputs": { "Sum (S)": 1, "Carry Out (Cout)": 1 } }
  ],
  "params": []
}
\`\`\`
`,
    attachedSimulation: {
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
    }
  },
  {
    id: 'note-3d-1',
    title: 'Multivariable Calculus - 3D Surface & Contours',
    folder: 'Mathematics',
    tags: ['calculus', '3d-graph', 'multivariable', 'surfaces', 'contours'],
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 5,
    content: `# Multivariable Calculus: 3D Surface & Contour Analysis

Consider the two-variable function describing a radiating wave ripple in $\\mathbb{R}^3$:

$$z = f(x, y) = b \\cdot \\sin\\left(a \\sqrt{x^2 + y^2}\\right)$$

### Gradient Vector $\\nabla f(x, y)$:
$$\\nabla f = \\left( \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right) = \\frac{a b \\cos(a r)}{r} (x, y), \\quad \\text{where } r = \\sqrt{x^2 + y^2}$$

\`\`\`dynanote-visual
{
  "domain": "3d",
  "title": "Multivariable Calculus: 3D Ripple Surface & Critical Points",
  "description": "Interactive 3D graph of z = sin(sqrt(x² + y²) · a) · b with real-time OrbitControls (drag to rotate, scroll to zoom), elevation colormaps, and projected floor contour rings.",
  "graphType": "surface",
  "surface": {
    "equation": "sin(sqrt(x^2 + y^2) * a) * b",
    "xRange": [-3.2, 3.2],
    "yRange": [-3.2, 3.2],
    "resolution": 30,
    "colorMap": "viridis",
    "wireframe": false,
    "showContours": true
  },
  "camera": {
    "pitch": 0.65,
    "yaw": 0.85,
    "zoom": 1.15,
    "autoRotate": true
  },
  "params": [
    { "id": "a", "label": "Wave Frequency (a)", "min": 0.5, "max": 4.0, "default": 1.8, "step": 0.1, "unit": "rad/m" },
    { "id": "b", "label": "Peak Amplitude (b)", "min": 0.2, "max": 2.5, "default": 1.2, "step": 0.1, "unit": "m" }
  ]
}
\`\`\`

### Geometric Properties:
- **Critical Points**: Local extrema occur wherever $a r = \\frac{\\pi}{2} + k\\pi$.
- **Level Curves**: The projected circles on the floor plane correspond to concentric circular contours $f(x, y) = c$.
- **Camera Interaction**: Drag with your mouse to rotate the 3D surface in pitch/yaw, and scroll to zoom in/out!`,
    attachedSimulation: {
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
    }
  },
  {
    id: 'note-diagram-1',
    title: 'Human Biology - Anatomy of the Human Heart',
    folder: 'Biology',
    tags: ['biology', 'anatomy', 'cardiovascular', 'heart', 'diagram', 'circulation'],
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    updatedAt: Date.now() - 1000 * 60 * 2,
    content: `# Cardiovascular System: Anatomy of the Human Heart

The human heart is a four-chambered muscular organ that powers the double circulatory system of systemic and pulmonary blood flow.

### Cardiac Output Equation:
$$CO = HR \\times SV$$
Where $HR$ is heart rate (bpm) and $SV$ is stroke volume (~70 mL per beat).

\`\`\`dynanote-visual
{
  "domain": "diagram",
  "title": "Anatomy of the Human Heart & Systemic Circulation",
  "description": "Vector schematic of the four chambers, major cardiac vessels, and atrioventricular valves with interactive callout pins and a 5-step guided circulation tour.",
  "topicCategory": "anatomy",
  "viewBox": { "width": 640, "height": 420 },
  "shapes": [
    { "id": "heart_muscle", "type": "path", "d": "M 220 100 C 140 100, 110 200, 160 290 C 210 370, 320 400, 320 400 C 320 400, 430 370, 480 290 C 530 200, 500 100, 420 100 C 370 100, 320 150, 320 150 C 320 150, 270 100, 220 100 Z", "fill": "#881337", "stroke": "#e11d48", "strokeWidth": 3, "opacity": 0.9 },
    { "id": "vena_cava", "type": "rect", "x": 190, "y": 30, "width": 35, "height": 110, "fill": "#1e3a8a", "stroke": "#3b82f6", "strokeWidth": 2 },
    { "id": "aorta_arch", "type": "path", "d": "M 290 140 C 290 50, 410 40, 420 120 L 400 130 C 390 70, 310 75, 310 140 Z", "fill": "#991b1b", "stroke": "#ef4444", "strokeWidth": 2 },
    { "id": "pulmonary_art", "type": "path", "d": "M 260 140 C 260 90, 200 90, 170 120 L 185 135 C 210 115, 245 115, 245 140 Z", "fill": "#1e40af", "stroke": "#60a5fa", "strokeWidth": 2 },
    { "id": "left_ventricle", "type": "ellipse", "x": 370, "y": 280, "radiusX": 45, "radiusY": 65, "fill": "#4c0519", "stroke": "#f43f5e", "strokeWidth": 1.5, "opacity": 0.8 },
    { "id": "right_ventricle", "type": "ellipse", "x": 260, "y": 280, "radiusX": 42, "radiusY": 65, "fill": "#172554", "stroke": "#3b82f6", "strokeWidth": 1.5, "opacity": 0.8 },
    { "id": "septum", "type": "rect", "x": 308, "y": 200, "width": 22, "height": 150, "fill": "#9f1239", "stroke": "#e11d48", "strokeWidth": 1 }
  ],
  "hotspots": [
    {
      "id": "aorta",
      "label": "1",
      "title": "Aorta",
      "description": "The largest systemic artery in the body; carries oxygen-rich blood pumped from the left ventricle to all bodily tissues.",
      "x": 56,
      "y": 18,
      "color": "#ef4444",
      "category": "Arteries",
      "details": ["Originates at the aortic valve", "Branches into brachiocephalic, carotid, and subclavian arteries", "Peak systolic pressure ~120 mmHg"]
    },
    {
      "id": "superior_vena_cava",
      "label": "2",
      "title": "Superior Vena Cava",
      "description": "Large vein returning deoxygenated systemic blood from the head, neck, and upper limbs directly into the right atrium.",
      "x": 32,
      "y": 16,
      "color": "#3b82f6",
      "category": "Veins",
      "details": ["Low pressure venous return (~5 mmHg)", "No valves; relies on thoracic pressure gradients"]
    },
    {
      "id": "right_atrium",
      "label": "3",
      "title": "Right Atrium",
      "description": "Receives deoxygenated blood from the vena cava and sends it through the tricuspid valve into the right ventricle.",
      "x": 27,
      "y": 45,
      "color": "#60a5fa",
      "category": "Chambers",
      "details": ["Houses the Sinoatrial (SA) pacemaker node", "Thin-walled low resistance chamber"]
    },
    {
      "id": "right_ventricle",
      "label": "4",
      "title": "Right Ventricle",
      "description": "Pumps deoxygenated blood through the pulmonary semilunar valve into the pulmonary trunk towards the lungs.",
      "x": 40,
      "y": 68,
      "color": "#2563eb",
      "category": "Chambers",
      "details": ["Generates pulmonary systolic pressure (~25 mmHg)", "Crescent-shaped cavity wrapped around left ventricle"]
    },
    {
      "id": "left_ventricle",
      "label": "5",
      "title": "Left Ventricle (Thick Myocardium)",
      "description": "Primary muscular pump of the systemic circuit; generates high hydrostatic pressure to drive systemic circulation.",
      "x": 60,
      "y": 68,
      "color": "#f43f5e",
      "category": "Chambers",
      "details": ["Myocardium is ~3x thicker than right ventricle", "Generates 120 mmHg systolic pressure"]
    }
  ],
  "categories": ["Arteries", "Veins", "Chambers"],
  "guidedTourSteps": [
    { "hotspotId": "superior_vena_cava", "stepTitle": "Step 1: Venous Inflow", "stepExplanation": "Deoxygenated blood from the body enters the heart through the Superior and Inferior Vena Cava." },
    { "hotspotId": "right_atrium", "stepTitle": "Step 2: Atrial Filling", "stepExplanation": "Blood pools in the Right Atrium before passing through the tricuspid valve." },
    { "hotspotId": "right_ventricle", "stepTitle": "Step 3: Pulmonary Ejection", "stepExplanation": "Right Ventricle contracts, sending blood to the lungs for gas exchange (CO₂ out, O₂ in)." },
    { "hotspotId": "left_ventricle", "stepTitle": "Step 4: High-Pressure Pumping", "stepExplanation": "Oxygenated blood returns to the Left Ventricle, which has thick muscle walls." },
    { "hotspotId": "aorta", "stepTitle": "Step 5: Systemic Distribution", "stepExplanation": "The Left Ventricle contracts forcefully, propelling oxygenated blood through the Aorta to the entire body." }
  ],
  "params": []
}
\`\`\`

### Circulation Pathways:
1. **Pulmonary Circuit**: Heart $\\rightarrow$ Lungs $\\rightarrow$ Heart
2. **Systemic Circuit**: Heart $\\rightarrow$ Upper/Lower Body $\\rightarrow$ Heart
`,
    attachedSimulation: {
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
    }
  },
  {
    id: 'note-vector-1',
    title: 'Linear Algebra - Dot Product and Angle',
    folder: 'Mathematics', tags: ['linear-algebra', 'vectors'],
    createdAt: Date.now(), updatedAt: Date.now(),
    content: '# Dot Product and Angle\n\nFor vectors of magnitudes a and b, the dot product is a*b*cos(theta). The horizontal axis is the angle in radians. Adjust magnitudes to see how alignment changes the dot product. At pi/2, perpendicular vectors have zero dot product.',
    attachedSimulation: {
      domain: 'math', title: 'Dot product versus angle',
      bounds: { xMin: 0, xMax: 3.141592653589793, yMin: -25, yMax: 25 },
      functions: [{ id: 'dot', expression: 'a*b*cos(x)', color: '#a78bfa', label: 'u · v = |u||v|cos(θ)' }],
      params: [
        { id: 'a', label: 'Magnitude of u', min: 0, max: 5, default: 3, step: 0.1 },
        { id: 'b', label: 'Magnitude of v', min: 0, max: 5, default: 4, step: 0.1 }
      ]
    }
  }
];
