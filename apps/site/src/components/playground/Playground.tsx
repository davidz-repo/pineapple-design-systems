import { useMemo, useState } from 'react';

import { Stack } from '@pineappleui/stack';

import { jsxSnippet } from '../../jsx-snippet';
import { CodeBlock } from '../CodeBlock';
import { ArgControl } from './ArgControl';

import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

interface PlaygroundProps {
  story: StoryExport;
  entry: RegistryEntry;
}

// Drives the package's own Playground story: the story render fn is the
// preview, its argTypes/args are the controls, and the registry's snippet fn
// turns the current args into the JSX you would write. Initial args are the
// argTypes defaultValues overlaid by story.args — the same resolution Ladle
// applies. Callers key this component by slug so state resets across pages.
export function Playground({ story, entry }: PlaygroundProps) {
  const defaults = useMemo(() => ({
    ...Object.fromEntries(
      Object.entries(story.argTypes ?? {})
        .filter(([, argType]) => argType.defaultValue !== undefined)
        .map(([name, argType]) => [name, argType.defaultValue]),
    ),
    ...story.args,
  }), [story]);

  const [args, setArgs] = useState<Record<string, unknown>>(defaults);
  const Story = story;
  const snippet = entry.snippet ?? (current => jsxSnippet(entry.name, current));

  return (
    <Stack gap="4">
      <div className="playground">
        <div className="playground-preview">
          <Story {...args} />
        </div>
        <div className="playground-controls">
          <Stack gap="3">
            {Object.keys(defaults).map(name => (
              <ArgControl
                key={name}
                name={name}
                argType={story.argTypes?.[name]}
                value={args[name]}
                onChange={value => setArgs(previous => ({ ...previous, [name]: value }))}
              />
            ))}
          </Stack>
        </div>
      </div>
      <CodeBlock code={snippet(args)} />
    </Stack>
  );
}
