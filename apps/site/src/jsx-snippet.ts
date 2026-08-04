// Formats the playground's current args as the JSX that renders the preview
// beside it — every arg the story is passing, story defaults included, since a
// story default is often not the component's own (icons `size="lg"` against a
// `md` default, box `p="4"` against no padding at all).
// Omission rules mirror the stories' own idiom (`color={color || undefined}`):
// empty string, false and undefined all mean "not passed", so they never
// appear in the snippet.

const SINGLE_LINE_MAX = 72;

function formatAttr(key: string, value: unknown): string {
  if (value === true) {
    return key;
  }
  if (typeof value === 'string') {
    return `${key}="${value}"`;
  }
  return `${key}={${JSON.stringify(value)}}`;
}

export function jsxSnippet(
  component: string,
  props: Record<string, unknown>,
  children?: string,
): string {
  const attrs = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== '' && value !== false)
    .map(([key, value]) => formatAttr(key, value));

  const openInline = `<${component}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}`;
  const singleLine = children === undefined
    ? `${openInline} />`
    : `${openInline}>${children}</${component}>`;

  if (singleLine.length <= SINGLE_LINE_MAX && !children?.includes('\n')) {
    return singleLine;
  }

  const attrLines = attrs.map(attr => `  ${attr}`).join('\n');
  const openBlock = attrs.length > 0 ? `<${component}\n${attrLines}\n>` : `<${component}>`;
  if (children === undefined) {
    return attrs.length > 0 ? `<${component}\n${attrLines}\n/>` : `<${component} />`;
  }
  const childLines = children.split('\n').map(line => `  ${line}`).join('\n');
  return `${openBlock}\n${childLines}\n</${component}>`;
}
