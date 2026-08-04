import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { Button } from '@pineappleui/button';
import { Heading } from '@pineappleui/heading';
import { Inline } from '@pineappleui/inline';
import { LiveRegion } from '@pineappleui/live-region';
import { Stack } from '@pineappleui/stack';
import { Text } from '@pineappleui/text';
import { useHref, useLocation, useSearchParams } from 'react-router';

import { jsxSnippet } from '../../jsx-snippet';
import { CodeBlock } from '../CodeBlock';
import { placeholderFor } from './arg-placeholders';
import { ArgControl } from './ArgControl';
import { prependImports } from './snippet-imports';

import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

interface PlaygroundProps {
  story: StoryExport;
  entry: RegistryEntry;
}

// How long the copy-link announcement stays up — same beat as CodeBlock's.
const ANNOUNCEMENT_MS = 2000;

// Drives the package's own Playground story: the story render fn is the
// preview, its argTypes/args are the controls, and the registry's snippet fn
// turns the current args into the code that renders exactly what the preview
// is showing (imports prepended, so the copy button hands you something that
// compiles — story defaults included, since a story default is often not the
// component's own). Initial args are the argTypes
// defaultValues overlaid by story.args — the same resolution Ladle applies.
// Callers key this component by slug so state resets across pages.
//
// Where a control's value lives is deliberate. Args with a fixed option list
// live in the URL, so a tuned playground is a link you can send; everything
// else (free text, booleans) lives in local state, because `?label=Click+me`
// is noise in a shared link and a stray keystroke should not rewrite it.
export function Playground({ story, entry }: PlaygroundProps) {
  const defaults = useMemo(() => ({
    ...Object.fromEntries(
      Object.entries(story.argTypes ?? {})
        .filter(([, argType]) => argType.defaultValue !== undefined)
        .map(([name, argType]) => [name, argType.defaultValue]),
    ),
    ...story.args,
  }), [story]);

  const urlArgNames = useMemo(
    () => Object.keys(defaults).filter(name => story.argTypes?.[name]?.options !== undefined),
    [defaults, story],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [localArgs, setLocalArgs] = useState<Record<string, unknown>>({});

  const args = useMemo(() => {
    const resolved: Record<string, unknown> = { ...defaults, ...localArgs };
    for (const name of urlArgNames) {
      const requested = searchParams.get(name);
      // A value the story does not offer — a hand-edited or stale link —
      // falls back to the default silently rather than rendering a broken
      // variant or shouting at a reader who did not type it.
      const match = story.argTypes?.[name]?.options
        ?.find(option => String(option) === requested);
      if (match !== undefined) {
        resolved[name] = match;
      }
    }
    return resolved;
  }, [defaults, localArgs, searchParams, story, urlArgNames]);

  const setArg = useCallback((name: string, value: unknown) => {
    if (!urlArgNames.includes(name)) {
      setLocalArgs(previous => ({ ...previous, [name]: value }));
      return;
    }
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      // Defaults stay out of the URL, so a link nobody tuned stays clean.
      if (String(value) === String(defaults[name])) {
        next.delete(name);
      }
      else {
        next.set(name, String(value));
      }
      return next;
    // Replace, not push: dragging through six variants should not cost six
    // presses of the back button.
    }, { replace: true });
  }, [defaults, setSearchParams, urlArgNames]);

  const resetArgs = useCallback(() => {
    setLocalArgs({});
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const name of urlArgNames) {
        next.delete(name);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams, urlArgNames]);

  // Every arg value here is a primitive (string, number or boolean), so
  // identity comparison per key is the deep comparison.
  const offDefaultNames = Object.keys(defaults)
    .filter(name => !Object.is(args[name], defaults[name]));
  const isPristine = offDefaultNames.length === 0;
  // Args the URL cannot carry (free text, booleans). A link copied while one
  // of them is off-default arrives showing something else, so the
  // announcement says so rather than claiming the whole state travelled.
  const hasUnsharedEdits = offDefaultNames.some(name => !urlArgNames.includes(name));

  const location = useLocation();
  // Through useHref, not `location.pathname` raw: useLocation reports the path
  // with the router's basename stripped, and this app's base is '/' only while
  // the custom domain is attached (vite.config.ts documents the fallback to
  // '/pineapple-design-systems/'). useHref puts the basename back, so the
  // copied link keeps the segment that makes it resolve.
  const href = useHref(location);
  const [linkStatus, setLinkStatus] = useState('');

  useEffect(() => {
    if (linkStatus === '') {
      return;
    }
    const timer = setTimeout(setLinkStatus, ANNOUNCEMENT_MS, '');
    return () => clearTimeout(timer);
  }, [linkStatus]);

  // The router's href resolved against the current origin — the URL the app is
  // showing, which is what a reader means by "this link". The failure branch is
  // real — `navigator.clipboard` is absent outside a secure context and rejects
  // when permission is denied — and either way the reader hears about it
  // instead of clicking into silence.
  async function copyLink() {
    const url = new URL(href, window.location.origin);
    try {
      await navigator.clipboard.writeText(url.href);
      setLinkStatus(
        hasUnsharedEdits ? 'Link copied — dropdown args only' : 'Link copied to clipboard',
      );
    }
    catch {
      setLinkStatus('Could not copy the link');
    }
  }

  const previewLabelId = useId();
  const controlsLabelId = useId();

  const Story = story;
  const snippet = entry.snippet ?? (current => jsxSnippet(entry.name, current));

  return (
    <Stack gap="4">
      <div className="playground">
        <section className="playground-pane" aria-labelledby={previewLabelId}>
          <div className="playground-pane-header">
            <Heading as="h2" size="2" id={previewLabelId}>Preview</Heading>
          </div>
          <div className="playground-preview">
            <Story {...args} />
          </div>
        </section>
        <section className="playground-pane" aria-labelledby={controlsLabelId}>
          <div className="playground-pane-header">
            <Heading as="h2" size="2" id={controlsLabelId}>Story args</Heading>
            <Inline gap="2" align="center">
              <Button
                size="1"
                variant="ghost"
                color="gray"
                disabled={isPristine}
                onClick={resetArgs}
              >
                Reset
              </Button>
              <Button size="1" variant="ghost" color="gray" onClick={() => void copyLink()}>
                Copy link
              </Button>
            </Inline>
          </div>
          <div className="playground-controls">
            <Stack gap="3">
              <Stack gap="1">
                <Text as="p" size="1" color="gray">
                  Change an arg to redraw the preview. The snippet below is the
                  code that renders it — some args become children or wrapper
                  styles, not props.
                </Text>
                <LiveRegion className="playground-status">
                  <Text size="1" color="gray">{linkStatus}</Text>
                </LiveRegion>
              </Stack>
              <Stack gap="3">
                {Object.keys(defaults).map(name => (
                  <ArgControl
                    key={name}
                    name={name}
                    argType={story.argTypes?.[name]}
                    value={args[name]}
                    placeholder={placeholderFor(entry.slug, name)}
                    onChange={value => setArg(name, value)}
                  />
                ))}
              </Stack>
            </Stack>
          </div>
        </section>
      </div>
      <CodeBlock code={prependImports(snippet(args))} />
    </Stack>
  );
}
