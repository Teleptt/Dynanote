import React, { Suspense } from 'react';
export class SimulationBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div role="alert" className="p-4 text-red-300">This simulation could not be displayed. Your note is safe; edit the specification or generate another visualization.</div> : <Suspense fallback={<div role="status" className="p-4">Loading visualization…</div>}>{this.props.children}</Suspense>; }
}
