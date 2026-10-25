import React, { Suspense } from 'react';
export class SimulationBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: '' };
  static getDerivedStateFromError(error: unknown) { return { failed: true, message: error instanceof Error ? error.message : String(error) }; }
  // Keep the cause visible in the console so a failing spec can be diagnosed.
  componentDidCatch(error: unknown, info: React.ErrorInfo) { console.error('Simulation render failed:', error, info.componentStack); }
  render() {
    return this.state.failed
      ? <div role="alert" className="p-4 text-red-300">
          This simulation could not be displayed. Your note is safe; edit the specification or generate another visualization.
          <span className="mt-1 block font-mono text-xs text-red-400/80">{this.state.message}</span>
          {/* Transient failures (e.g. a code chunk that failed to load) often succeed on a second render. */}
          <button type="button" onClick={() => this.setState({ failed: false, message: '' })} className="mt-2 rounded border border-red-400/50 px-2 py-0.5 text-xs text-red-200 hover:bg-red-950">Try again</button>
        </div>
      : <Suspense fallback={<div role="status" className="p-4">Loading visualization…</div>}>{this.props.children}</Suspense>;
  }
}
