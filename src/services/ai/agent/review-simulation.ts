import { SimulationSpec, DomainValidationReport } from '../../../types';
import { assertSimulation } from '../../../lib/simulation-schema';
import { compileExpression } from '../../../lib/expression';
import { solveSeriesCircuit } from '../../../lib/circuit';

/** Read-only tool feedback. Never replace the user's scientific model with defaults. */
export function reviewSimulation(spec: SimulationSpec): DomainValidationReport {
  assertSimulation(spec);
  const report: DomainValidationReport = { domain: spec.domain, isValid: true, errors: [], warnings: [], fixesApplied: [], checks: [] };
  const check = (name: string, passed: boolean, message: string) => {
    report.checks.push({ name, passed, message });
    if (!passed) report.errors.push(message);
  };
  const params = Object.fromEntries(spec.params.map(p => [p.id, p.default]));
  const expression = (source: string, samples: Record<string, number>[]) => {
    let finite = 0;
    try {
      const fn = compileExpression(source);
      for (const scope of samples) if (Number.isFinite(fn({ ...params, ...scope }))) finite++;
      // Discontinuities and restricted domains are legitimate; do not swap in sin(x).
      check('Expression evaluation', finite > 0, finite ? `Evaluated ${finite}/${samples.length} sampled points.` : `Expression "${source}" is non-finite at all sampled points; check its domain or bounds.`);
      if (finite && finite < samples.length) report.warnings.push(`Expression "${source}" has undefined sampled points; gaps may be expected.`);
    } catch (error) { check('Expression evaluation', false, `Expression "${source}": ${error instanceof Error ? error.message : String(error)}`); }
  };
  const references = (ids: Set<string>, targets: string[], label: string) => check(label, targets.every(id => ids.has(id)), `${label}: ${targets.filter(id => !ids.has(id)).join(', ') || 'all references resolve'}`);
  check('Renderer structure', true, 'Required renderer fields are present.');
  switch (spec.domain) {
    case 'generative': check('Execution boundary', false, 'Script-based simulations are retired. Represent the same subject with a declarative domain.'); break;
    case 'math': {
      check('Functions', spec.functions.length > 0, 'Provide at least one function representing the requested relationship.');
      const samples = Array.from({ length: 17 }, (_, i) => ({ x: spec.bounds.xMin + i * (spec.bounds.xMax - spec.bounds.xMin) / 16 }));
      spec.functions.forEach(f => expression(f.expression, samples)); break;
    }
    case '3d': {
      if (spec.graphType === 'surface' && spec.surface) {
        const { xRange, yRange } = spec.surface;
        expression(spec.surface.equation, Array.from({ length: 9 }, (_, i) => ({ x: xRange[0] + (i % 3) * (xRange[1] - xRange[0]) / 2, y: yRange[0] + Math.floor(i / 3) * (yRange[1] - yRange[0]) / 2, t: 0 })));
      }
      if (spec.graphType === 'curve' && spec.curve) {
        const curve = spec.curve;
        const samples = Array.from({ length: 9 }, (_, i) => ({ t: curve.tRange[0] + i * (curve.tRange[1] - curve.tRange[0]) / 8 }));
        [curve.expressionX, curve.expressionY, curve.expressionZ].forEach(f => expression(f, samples));
      }
      break;
    }
    case 'circuit': {
      const model = solveSeriesCircuit(spec, params, {});
      if (!model.supported) report.warnings.push(model.reason);
      break;
    }
    case 'physics': {
      const ids = new Set(spec.bodies.map(b => b.id));
      references(ids, spec.constraints.flatMap(c => c.bodyB ? [c.bodyA, c.bodyB] : [c.bodyA]), 'Constraint bodies');
      check('Moving mass', spec.bodies.every(b => b.isStatic || b.mass > 0), 'Moving bodies need positive mass; static bodies may have zero mass.');
      for (const c of spec.constraints) if (c.type === 'spring') {
        const mass = Math.min(...spec.bodies.filter(b => !b.isStatic && [c.bodyA, c.bodyB].includes(b.id)).map(b => b.mass));
        if (c.stiffness !== undefined && (c.stiffness < 0 || !Number.isFinite(c.stiffness))) check('Spring stiffness', false, `Spring ${c.id} needs finite nonnegative stiffness.`);
        else if (Math.sqrt((c.stiffness ?? 0) / mass) / 60 >= 0.8) report.warnings.push(`Spring ${c.id} may be unstable at the renderer's timestep; rescale or explain the approximation.`);
      }
      break;
    }
    case 'chemistry':
      for (const step of spec.mechanismSteps) {
        const atoms = new Set(step.atoms.map(a => a.id));
        const bonds = new Set(step.bonds.map(b => b.id));
        references(atoms, step.bonds.flatMap(b => [b.from, b.to]), 'Bond atoms');
        for (const arrow of step.curvedArrows) for (const endpoint of [arrow.from, arrow.to]) {
          check('Electron arrow', !!endpoint && (endpoint.type === 'bond' ? bonds : atoms).has(endpoint.id), 'Electron arrows must refer to an existing atom or bond in their step.');
        }
      }
      break;
    case 'orbit':
      check('Bound orbits', spec.bodies.every(b => b.eccentricity >= 0 && b.eccentricity < 1 && b.semiMajorAxis > 0 && b.orbitalPeriod > 0), 'This renderer needs bound elliptical orbits with positive size and period. Use a diagram for unbound trajectories.');
      report.warnings.push('Orbit paths follow supplied orbital parameters; this is not an N-body integration.'); break;
    case 'algorithm':
      check('Algorithm steps', spec.steps.length > 0, 'Provide at least one step explaining the requested algorithm.'); break;
    case 'logic': {
      const sources = new Set([...spec.inputs, ...spec.gates].map(g => g.id));
      const targets = new Set([...spec.gates, ...spec.outputs].map(g => g.id));
      references(sources, spec.wires.map(w => w.fromId), 'Logic sources');
      references(targets, spec.wires.map(w => w.toId), 'Logic targets'); break;
    }
    case 'diagram':
      check('Diagram content', spec.shapes.length > 0 || spec.hotspots.length > 0, 'Provide shapes or hotspots that explain the requested subject.');
      references(new Set(spec.hotspots.map(h => h.id)), (spec.guidedTourSteps || []).map(s => s.hotspotId), 'Tour hotspots'); break;
  }
  report.isValid = report.errors.length === 0;
  return report;
}
