import { Note } from '../types';

const FOLDER = 'Hackathon Demo';
const created = Date.now();
const note = (n: Omit<Note, 'folder' | 'createdAt' | 'updatedAt'>, order: number): Note =>
  ({ ...n, folder: FOLDER, createdAt: created - order * 1000, updatedAt: created - order * 1000 });

/** A short, verified tour for live demos. Numbers in the text are checked in tests/regressions.cjs. */
export const DEMO_NOTES: Note[] = [
  note({
    id: 'demo-0-start',
    title: 'Demo 0 - Start Here: Run of Show',
    tags: ['demo'],
    content: `# Dynanote in Five Minutes

**Pitch:** notes that explain themselves. Write Markdown and LaTeX, then turn any idea into an interactive model next to the text.

### Run of show
1. **Projectile Motion** - drag the launch-angle slider. The range peaks at $45^\\circ$, and complementary angles land in the same place.
2. **Ohm's Law Loop** - change a resistor and watch the measured current update. Open the switch and the current drops to zero.
3. **Binary Search** - step through 4 comparisons on 11 sorted items.
4. **Kepler's Laws** - turn on the area sweep: equal times sweep equal areas.
5. **Live AI** - open a blank note, paste a prompt below, select it, and click **Visualize Note**.

### Prompts that work well live
- *Plot the period of a simple pendulum, T = 2π√(L/g), against length L from 0.1 to 3 m, with g as a slider.*
- *Show a bubble sort trace on the array [5, 1, 4, 2, 8].*
- *Build a half adder from an XOR gate and an AND gate with a truth table.*
- *A 12 V battery, a switch, and 100 Ω and 200 Ω resistors in series.*

### Honest limits (say these out loud)
- Equations run in a safe arithmetic-only parser, never as JavaScript.
- Circuit measurements cover single DC loops of resistors and switches. Anything else is drawn as a schematic.
- Automated checks catch broken models; they are not scientific certification.`
  }, 0),
  note({
    id: 'demo-1-projectile',
    title: 'Demo 1 - Projectile Motion',
    tags: ['demo', 'physics', 'kinematics', 'calculus'],
    content: `# Projectile Motion Without Air Resistance

Launch at speed $v$ and angle $\\theta$ from the ground. Eliminating time gives the path as a function of horizontal distance:

$$y(x) = x\\tan\\theta - \\frac{g\\,x^2}{2v^2\\cos^2\\theta}$$

- **Range:** $R = \\dfrac{v^2 \\sin 2\\theta}{g}$, largest at $\\theta = 45^\\circ$. At $v = 20$ m/s and $g = 9.81$ m/s², $R \\approx 40.8$ m.
- **Peak height:** $H = \\dfrac{v^2 \\sin^2\\theta}{2g} \\approx 10.2$ m at $45^\\circ$.
- **Complementary angles** ($30^\\circ$ and $60^\\circ$) give the same range.

The tangent line shows $dy/dx$, the direction of the velocity at that point. It is horizontal at the peak.

*Try: set the angle to 30, note the landing point, then set it to 60.*`,
    attachedSimulation: {
      domain: 'math',
      title: 'Projectile trajectory y(x)',
      description: 'Height versus horizontal distance for a drag-free launch. Angle is in degrees.',
      bounds: { xMin: 0, xMax: 50, yMin: -2, yMax: 25 },
      functions: [
        { id: 'path', expression: 'x*tan(d*pi/180) - g*x^2/(2*v^2*cos(d*pi/180)^2)', color: '#a855f7', label: 'y(x)' }
      ],
      calculus: { showTangent: true, tangentX: 10, showIntegral: false },
      params: [
        { id: 'v', label: 'Launch speed (v)', min: 5, max: 30, default: 20, step: 0.5, unit: 'm/s' },
        { id: 'd', label: 'Launch angle (θ)', min: 10, max: 80, default: 45, step: 1, unit: '°' },
        { id: 'g', label: 'Gravity (g)', min: 1.6, max: 25, default: 9.81, step: 0.01, unit: 'm/s²' },
        { id: 'tangentX', label: 'Tangent at x₀', min: 0, max: 50, default: 10, step: 0.5, unit: 'm' }
      ]
    }
  }, 1),
  note({
    id: 'demo-2-ohm',
    title: "Demo 2 - Ohm's Law Series Loop",
    tags: ['demo', 'circuits', 'electronics'],
    content: `# Ohm's Law in a Series Loop

Resistors in series carry the same current, and their resistances add:

$$R_{total} = R_1 + R_2, \\qquad I = \\frac{V}{R_{total}}, \\qquad P = I^2 R_{total}$$

With $V = 9$ V, $R_1 = 220\\,\\Omega$ and $R_2 = 330\\,\\Omega$:
- $R_{total} = 550\\,\\Omega$, so $I \\approx 16.4$ mA
- Voltage divides in proportion to resistance: $V_1 \\approx 3.6$ V and $V_2 \\approx 5.4$ V
- Total power $P \\approx 0.147$ W

This loop is fully solved by the app, so the current and power readouts are live.

*Try: double $R_2$ and predict the new current before you look.*`,
    attachedSimulation: {
      domain: 'circuit',
      title: 'Series resistor loop',
      description: 'A 9 V source, a switch, and two resistors in one closed loop.',
      simulationType: 'dc',
      components: [
        { id: 'v1', type: 'dc_source', value: 9, unit: 'V', label: '9 V', pos: { x: 100, y: 190 }, rotation: 90 },
        { id: 'sw1', type: 'switch', value: 1, unit: '', label: 'Switch', pos: { x: 200, y: 90 }, rotation: 0, state: true },
        { id: 'r1', type: 'resistor', value: 220, unit: 'Ω', label: 'R1 220 Ω', pos: { x: 340, y: 90 }, rotation: 0 },
        { id: 'r2', type: 'resistor', value: 330, unit: 'Ω', label: 'R2 330 Ω', pos: { x: 440, y: 190 }, rotation: 90 }
      ],
      wires: [
        { id: 'w1', from: { compId: 'v1', pin: 0 }, to: { compId: 'sw1', pin: 0 } },
        { id: 'w2', from: { compId: 'sw1', pin: 1 }, to: { compId: 'r1', pin: 0 } },
        { id: 'w3', from: { compId: 'r1', pin: 1 }, to: { compId: 'r2', pin: 0 } },
        { id: 'w4', from: { compId: 'r2', pin: 1 }, to: { compId: 'v1', pin: 1 } }
      ],
      params: [
        { id: 'v1', label: 'Source voltage', min: 1, max: 24, default: 9, step: 0.5, unit: 'V' },
        { id: 'r1', label: 'R1', min: 10, max: 1000, default: 220, step: 10, unit: 'Ω' },
        { id: 'r2', label: 'R2', min: 10, max: 1000, default: 330, step: 10, unit: 'Ω' }
      ]
    }
  }, 2),
  note({
    id: 'demo-3-binary-search',
    title: 'Demo 3 - Binary Search',
    tags: ['demo', 'algorithms', 'searching'],
    content: `# Binary Search: Halving the Problem

On a sorted array, compare the target with the middle element and discard the half that cannot contain it.

$$T(n) = T(n/2) + O(1) \\implies T(n) = O(\\log n)$$

Searching 11 items needs at most $\\lfloor \\log_2 11 \\rfloor + 1 = 4$ comparisons. A linear scan could need 11.

Here we search for **56** with $mid = \\lfloor (lo + hi)/2 \\rfloor$. The highlighted cell is the element being compared.`,
    attachedSimulation: {
      domain: 'algorithm',
      title: 'Binary search for 56',
      description: 'Each step compares the middle element and halves the search range.',
      algorithmType: 'sorting',
      algorithmName: 'Binary Search',
      initialData: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88],
      steps: [
        { stepIndex: 0, description: 'Sorted array of 11 items. Target 56. Range lo=0, hi=10.', array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88], comparingIndices: [], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 1, description: 'mid = 5: 34 < 56, so discard the left half. Now lo=6, hi=10.', array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88], comparingIndices: [5], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 2, description: 'mid = 8: 63 > 56, so discard the right half. Now lo=6, hi=7.', array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88], comparingIndices: [8], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 3, description: 'mid = 6: 42 < 56. Now lo=7, hi=7.', array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88], comparingIndices: [6], swappingIndices: [], sortedIndices: [] },
        { stepIndex: 4, description: 'mid = 7: 56 = 56. Found at index 7 after 4 comparisons.', array: [3, 8, 15, 21, 27, 34, 42, 56, 63, 71, 88], comparingIndices: [], swappingIndices: [], sortedIndices: [7] }
      ],
      params: []
    }
  }, 3),
  note({
    id: 'demo-4-kepler',
    title: "Demo 4 - Kepler's Laws",
    tags: ['demo', 'astronomy', 'orbits'],
    content: `# Kepler's Three Laws

1. **Ellipses:** each orbit is an ellipse with the star at one focus.
2. **Equal areas:** the line from the star sweeps equal areas in equal times, so a body moves fastest at closest approach.
3. **Harmonic law:** $T^2 \\propto a^3$. Doubling the orbit size multiplies the period by $2^{3/2} \\approx 2.83$.

The three bodies here follow the third law: semi-major axes of 70, 120 and 170 units, with periods of 4.0, 9.0 and 15.1 seconds.

*Try: turn on the area sweep and watch the comet. Its shaded sector is long and thin far out, short and wide near the star, and always the same area.*`,
    attachedSimulation: {
      domain: 'orbit',
      title: "Kepler's laws: two planets and a comet",
      description: 'Elliptical orbits solved with Kepler’s equation. Periods follow T² ∝ a³.',
      centralBody: { name: 'Star', mass: 1000, radius: 16, color: '#facc15' },
      bodies: [
        { id: 'inner', name: 'Inner planet', mass: 1, radius: 5, semiMajorAxis: 70, eccentricity: 0.05, orbitalPeriod: 4.0, color: '#38bdf8', showTrail: true },
        { id: 'outer', name: 'Outer planet', mass: 2, radius: 7, semiMajorAxis: 120, eccentricity: 0.1, orbitalPeriod: 9.0, color: '#4ade80', showTrail: true },
        { id: 'comet', name: 'Comet', mass: 0.1, radius: 4, semiMajorAxis: 170, eccentricity: 0.6, orbitalPeriod: 15.1, color: '#f472b6', showTrail: true }
      ],
      keplerSweep: { enabled: true },
      params: []
    }
  }, 4)
];
