// LiveRegion is invisible chrome — the stories demonstrate the announcement contract
// (region stays mounted, children swap) with a visible text mirror for sighted review.
import { useEffect, useState } from 'react';

import { LiveRegion } from './LiveRegion';

export default { title: 'LiveRegion' };

const BEATS = ['Connecting…', 'Ready when you are', 'Listening…', 'Thinking…', 'Speaking…'];

// The cycle is a moving, auto-updating thing that starts on its own, so WCAG 2.2.2
// (Pause, Stop, Hide) applies: it needs a control that stops it. The stakes are
// higher than they look — this story is rendered by the docs site as well as the
// gallery, where an uncontrollable 1.5s interval means a polite live region
// announcing forever at whoever left the page open with a screen reader on.
// Running by default, because a paused region demonstrates nothing.
export function CyclingStatus() {
  const [beatIndex, setBeatIndex] = useState(0);
  const [isCycling, setIsCycling] = useState(true);
  useEffect(() => {
    if (!isCycling)
      return;
    const timer = setInterval(() => setBeatIndex(prev => (prev + 1) % BEATS.length), 1500);
    return () => clearInterval(timer);
  }, [isCycling]);
  return (
    <div style={{ padding: 24 }}>
      <p style={{ marginBottom: 8 }}>
        The region below announces each change to screen readers (polite):
      </p>
      <LiveRegion>
        <strong>{BEATS[beatIndex]}</strong>
      </LiveRegion>
      {/* The label carries the state, so no `aria-pressed`: a toggle that says
          both ("Resume", pressed) reads as a contradiction to a screen reader. */}
      <button type="button" onClick={() => setIsCycling(prev => !prev)} style={{ marginTop: 16 }}>
        {isCycling ? 'Pause' : 'Resume'}
      </button>
    </div>
  );
}

export function AtomicCaption() {
  return (
    <div style={{ padding: 24 }}>
      <LiveRegion atomic>
        Atomic region — the whole caption re-announces when any part changes.
      </LiveRegion>
    </div>
  );
}

export function StatusRole() {
  return (
    <div style={{ padding: 24 }}>
      <LiveRegion as="p" role="status">
        A calm inline notice rendered as a paragraph with role=&quot;status&quot;.
      </LiveRegion>
    </div>
  );
}
