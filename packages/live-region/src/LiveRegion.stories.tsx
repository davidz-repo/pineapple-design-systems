// LiveRegion is invisible chrome — the stories demonstrate the announcement contract
// (region stays mounted, children swap) with a visible text mirror for sighted review.
import { useEffect, useState } from 'react';

import { LiveRegion } from './LiveRegion';

export default { title: 'LiveRegion' };

const BEATS = ['Connecting…', 'Ready when you are', 'Listening…', 'Thinking…', 'Speaking…'];

export function CyclingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(prev => (prev + 1) % BEATS.length), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <p style={{ marginBottom: 8 }}>
        The region below announces each change to screen readers (polite):
      </p>
      <LiveRegion>
        <strong>{BEATS[i]}</strong>
      </LiveRegion>
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
