// A package that exports no component at all — `@pineappleui/tokens` and
// `@pineappleui/use-local-storage` are the real ones. The extraction has to
// return an empty component list here rather than finding something in the data
// or the hook, because "this package documents no props" is a page the site
// draws on purpose and must not draw by accident.

export const FIXTURE_TONES = ['amber', 'blue'] as const;

// Named for what it stands in for — `useLocalStorage`, the real package with no
// component in it — so the rule below is right about the code and wrong about
// the fixture.
// eslint-disable-next-line react/no-unnecessary-use-prefix -- see above
export function useFixtureTone(): string {
  return FIXTURE_TONES[0];
}
