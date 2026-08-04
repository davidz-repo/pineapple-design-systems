import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { silenceCaughtErrors } from '../test-helpers';
import { ErrorBoundary } from './ErrorBoundary';

// The preset's setup file registers the jest-dom matchers at runtime; this
// side-effect import is what puts their types on vitest's `Assertion`.
import '@testing-library/jest-dom/vitest';

function Boom({ isBroken }: { isBroken: boolean }): string {
  if (isBroken) {
    throw new Error('story exploded');
  }
  return 'all good';
}

// For the retry test: the cause has to be fixable from outside the boundary,
// because retrying while it stands throws straight back into the fallback —
// which is the honest outcome, and not what the test is about.
function RetryHarness() {
  const [isBroken, setIsBroken] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setIsBroken(false)}>fix it</button>
      <ErrorBoundary fallback={(error, retry) => (
        <button type="button" onClick={retry}>{`retry: ${error.message}`}</button>
      )}
      >
        <Boom isBroken={isBroken} />
      </ErrorBoundary>
    </>
  );
}

describe('errorBoundary', () => {
  it('renders its children until one of them throws', () => {
    const consoleError = silenceCaughtErrors();
    render(
      <ErrorBoundary fallback={error => <p>{`caught: ${error.message}`}</p>}>
        <Boom isBroken={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('shows the fallback with the error, and nothing of the failed subtree', () => {
    const consoleError = silenceCaughtErrors();
    render(
      <ErrorBoundary fallback={error => <p>{`caught: ${error.message}`}</p>}>
        <p>sibling content</p>
        <Boom isBroken />
      </ErrorBoundary>,
    );
    expect(screen.getByText('caught: story exploded')).toBeInTheDocument();
    // A boundary replaces everything it wraps, which is why the app mounts
    // narrow ones: a sibling inside the same boundary goes down with the throw.
    expect(screen.queryByText('sibling content')).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('tells an onError caller what it caught', () => {
    const consoleError = silenceCaughtErrors();
    const onError = vi.fn();
    render(
      <ErrorBoundary fallback={() => <p>fallback</p>} onError={onError}>
        <Boom isBroken />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    consoleError.mockRestore();
  });

  // Without this the only way past a caught error is a navigation that
  // remounts the boundary — and the boundary that wraps the whole app has no
  // such navigation, because routing away leaves it mounted with the same
  // error and the fallback simply replaces the next page too.
  it('renders the children again after retry, once the cause is gone', () => {
    const consoleError = silenceCaughtErrors();
    render(<RetryHarness />);
    expect(screen.getByRole('button', { name: 'retry: story exploded' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'fix it' }));
    fireEvent.click(screen.getByRole('button', { name: 'retry: story exploded' }));
    expect(screen.getByText('all good')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
