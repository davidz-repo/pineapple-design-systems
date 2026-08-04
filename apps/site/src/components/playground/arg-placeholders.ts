// Free-text controls whose story default is empty render an empty box that
// says nothing about what a valid value looks like. These hints live here, on
// the site side, rather than in the stories: the stories are the packages'
// own and a docs affordance is not their job.
//
// Keyed by registry slug, then arg name. A placeholder only shows while the
// field is empty, so args that start out holding real content (Button's
// `label`, Card's `content`) need no entry.
const PLACEHOLDER_BY_ARG: Record<string, Record<string, string>> = {
  box: { width: 'e.g. 240px' },
  icons: { label: 'e.g. Home' },
};

export function placeholderFor(slug: string, name: string): string | undefined {
  return PLACEHOLDER_BY_ARG[slug]?.[name];
}
