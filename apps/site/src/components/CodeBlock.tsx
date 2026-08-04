import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import { IconButton } from '@pineappleui/icon-button';

import { Icon } from '@pineappleui/icons';

import { LiveRegion } from '@pineappleui/live-region';

import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';

import xml from 'highlight.js/lib/languages/xml';

import { createLowlight } from 'lowlight';

import type { IconName } from '@pineappleui/icons';

// Syntax highlighting is highlight.js's core plus four grammars, registered by
// hand. `lowlight/all` (or highlight.js's own bundle) is ~190 languages for the
// handful this site actually renders; these cover every fence the packages'
// READMEs write today (bash, tsx, ts) plus json. Each grammar also registers
// the aliases it declares itself — `typescript` covers `ts`/`tsx`, `bash`
// covers `sh`/`zsh` — so the alias list is the language's, not a second copy of
// it kept here.
//
// `xml` is not a fence language anyone writes here; it is what the JSX inside a
// ```tsx fence is delegated to. highlight.js's javascript/typescript grammar
// matches a JSX region and hands it to the `xml` SUBLANGUAGE, and an
// unregistered sublanguage is emitted as plain text — so without this grammar
// every `<Button variant="solid">` in the READMEs, which is most of what those
// fences contain, stays uncoloured while the code around it does not.
//
// lowlight (rather than highlight.js directly) because it returns a hast tree:
// the tokens become React elements through `toJsxRuntime`, so nothing here has
// to hand markup to `dangerouslySetInnerHTML`. Token colours are CSS only —
// `.code-block .hljs-*` in site.css, on Radix scale variables — so highlighting
// follows the appearance and accent the reader chose.
const lowlight = createLowlight({ bash, json, typescript, xml });

// The button's three states, each with its glyph and its announcement. A record
// rather than nested ternaries at three call sites: adding a state is one row.
type CopyState = 'idle' | 'copied' | 'failed';

const COPY_ICON: Record<CopyState, IconName> = {
  idle: 'copy',
  copied: 'check',
  failed: 'close',
};

const COPY_ANNOUNCEMENT: Record<CopyState, string> = {
  idle: '',
  copied: 'Copied to clipboard',
  failed: 'Couldn\'t copy — select the text and copy manually',
};

interface CodeBlockProps {
  /** The raw source. Copy always copies THIS, never the highlighted markup. */
  code: string;
  /**
   * Fence language — `tsx`, `ts`, `bash` or `json`. Anything else (or nothing)
   * renders plain: this never guesses, because a wrong guess colours a snippet
   * by the rules of a language it is not written in.
   */
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  // Typed `ReactElement`, NOT `ReactNode`: React 19's ReactNode includes
  // `Promise<AwaitedReactNode>`, so a callback annotated with it reads to
  // `ts/promise-function-async` as promise-returning and `eslint --fix` rewrites
  // this memo to `async` — which compiles, renders nothing, and passes tsc.
  const highlighted = useMemo<ReactElement | undefined>(() => {
    if (language === undefined || !lowlight.registered(language)) {
      return undefined;
    }
    // `toJsxRuntime` is typed as the GLOBAL `JSX.Element` — a namespace React 19
    // no longer declares (it lives at `React.JSX` now), so tsc reads the result
    // as an error type. The assertion is the seam between the two type worlds
    // and is kept to this one line: what comes back is genuinely a React
    // element, built by the `react/jsx-runtime` functions handed in here.
    return toJsxRuntime(lowlight.highlight(language, code), { Fragment, jsx, jsxs }) as ReactElement;
  }, [code, language]);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }
    const timer = setTimeout(setCopyState, 2000, 'idle');
    return () => clearTimeout(timer);
  }, [copyState]);

  return (
    <div className="code-block">
      <pre><code>{highlighted ?? code}</code></pre>
      <IconButton
        aria-label="Copy code"
        className="code-block-copy"
        variant="ghost"
        color={copyState === 'failed' ? 'red' : 'gray'}
        size="1"
        onClick={() => {
          // A rejected write is a real case, not a defensive branch: Safari and
          // Firefox reject `writeText` outside a user gesture or without the
          // permission, and any page not in a secure context rejects too. Left
          // unhandled it is an unhandled rejection and a button that silently
          // does nothing, so it gets a state of its own and an announcement.
          void navigator.clipboard.writeText(code)
            .then(() => setCopyState('copied'))
            .catch(() => setCopyState('failed'));
        }}
      >
        <Icon name={COPY_ICON[copyState]} size="sm" />
      </IconButton>
      <LiveRegion>{COPY_ANNOUNCEMENT[copyState]}</LiveRegion>
    </div>
  );
}
