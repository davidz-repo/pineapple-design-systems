import { Playground } from '../../components/playground/Playground';

import type { RegistryEntry } from '../../registry';
import type { StoryExport } from '../../stories';

export function PlaygroundTab({ story, entry }: { story: StoryExport; entry: RegistryEntry }) {
  return <Playground story={story} entry={entry} />;
}
