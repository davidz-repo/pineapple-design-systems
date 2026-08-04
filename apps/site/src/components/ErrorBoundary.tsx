import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

// The one class component in this app, because React still has no hook or
// function-component equivalent: `getDerivedStateFromError` is a class-only
// lifecycle. Kept deliberately small — it decides nothing about how a failure
// LOOKS, only that a subtree stopped rendering and which subtree.
//
// It is mounted at three depths, and the depth is the point: a boundary that
// wraps everything turns any one broken thing into a blank page.
//
//   1. the app root (App.tsx) — the last resort, so a crash is a message and a
//      way out rather than a white screen;
//   2. the package page (PackagePage.tsx), keyed by slug — one package's
//      README, stories or changelog failing leaves the rest of the site
//      reachable, and walking to another package resets it because the key
//      remounts the boundary;
//   3. each rendered example (ExamplesSection.tsx) — a single broken story is
//      a note in its own canvas, not a page that will not draw.
//
// `fallback` is a render function rather than an element so it can name the
// error and offer `retry`, which clears the caught error and re-renders the
// children. Retry is what makes a boundary the reader can get past without a
// reload — the key alone only resets when they navigate somewhere else.
//
// Nothing is logged here: React 19 already reports every error a boundary
// catches through `onCaughtError`, whose default logs it with the component
// stack. A `componentDidCatch` that called `console.error` again would print
// the same failure twice.

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, retry: () => void) => ReactNode;
  /** Told about every caught error — for a boundary that wants its own report. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  retry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    return error === null ? this.props.children : this.props.fallback(error, this.retry);
  }
}
