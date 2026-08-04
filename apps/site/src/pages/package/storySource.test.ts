import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRoot } from '../../test-helpers';
import { orderByDeclaration, sourceOfExport } from './storySource';

describe('sourceOfExport', () => {
  it('takes a function declaration and stops at the next export', () => {
    const source = [
      'import { Button } from \'./Button\';',
      '',
      'export function Variants() {',
      '  return <Button />;',
      '}',
      '',
      'export function Loading() {',
      '  return <Button loading />;',
      '}',
      '',
    ].join('\n');

    expect(sourceOfExport(source, 'Variants')).toBe(
      'export function Variants() {\n  return <Button />;\n}',
    );
    expect(sourceOfExport(source, 'Loading')).toBe(
      'export function Loading() {\n  return <Button loading />;\n}',
    );
  });

  it('keeps the comment block written directly above the story', () => {
    const source = [
      '// A file header, which is about the file.',
      '',
      '// Why this story exists.',
      '// Second line of the same note.',
      'export function Colors() {',
      '  return null;',
      '}',
      '',
    ].join('\n');

    expect(sourceOfExport(source, 'Colors')).toBe(
      '// Why this story exists.\n// Second line of the same note.\n'
      + 'export function Colors() {\n  return null;\n}',
    );
  });

  it('keeps the args attached to a const story, since they are its arguments', () => {
    const source = [
      'export const Playground: Story<Args> = ({ label }) => <Button>{label}</Button>;',
      '',
      'Playground.args = {',
      '  label: \'Click me\',',
      '};',
      '',
      'export function Other() {}',
      '',
    ].join('\n');

    const extracted = sourceOfExport(source, 'Playground');
    expect(extracted).toContain('Playground.args');
    expect(extracted).not.toContain('export function Other');
  });

  it('stops at a top-level declaration that is not exported', () => {
    // The shape every story file with a Playground has: the arg type is
    // declared, not exported. Cutting only at the next `export` swept it — and
    // everything between — into the story above it.
    const source = [
      'export function Colors() {',
      '  return null;',
      '}',
      '',
      'interface PlaygroundArgs {',
      '  label: string;',
      '}',
      '',
      'export const Playground = () => null;',
      '',
    ].join('\n');

    expect(sourceOfExport(source, 'Colors')).toBe(
      'export function Colors() {\n  return null;\n}',
    );
  });

  it('leaves the comment block that introduces the next declaration out', () => {
    const source = [
      'export function Colors() {',
      '  return null;',
      '}',
      '',
      '// Interactive playground: every knob is wired to a Ladle control.',
      '// Second line of the same note.',
      'export const Playground = () => null;',
      '',
    ].join('\n');

    const extracted = sourceOfExport(source, 'Colors');
    expect(extracted).toBe('export function Colors() {\n  return null;\n}');
    expect(extracted).not.toContain('Interactive playground');
  });

  it('is undefined for a name the file does not declare at the top level', () => {
    const source = 'export function Variants() {}\n';
    expect(sourceOfExport(source, 'Missing')).toBeUndefined();
    // Not a top-level declaration: a mention inside another story is not one.
    expect(sourceOfExport('const Variants = 1;\n', 'Variants')).toBeUndefined();
  });

  // The story files are the real input, and their formatting is the whole
  // premise: a repo-wide reformat that broke this would otherwise show up as
  // silently missing "Show code" buttons on a page nobody re-opened.
  //
  // Badge, not Button: Button is the ONE file whose Playground is declared
  // above its examples, so nothing follows its last story and the cut never had
  // to be made. Every other package looks like this one — examples first, then
  // the Playground's arg type and the Playground — which is what made a bug in
  // 12 example panels invisible here.
  it('finds every non-Playground export of a real story file', () => {
    const file = path.join(repoRoot, 'packages/badge/src/Badge.stories.tsx');
    const source = readFileSync(file, 'utf8');

    const variants = sourceOfExport(source, 'Variants');
    expect(variants).toMatch(/^export function Variants\(\) \{/);
    expect(variants).toContain('variant="outline"');
    // Cut before the note that introduces the story below it.
    expect(variants).not.toContain('Maps over the real accent list');
    expect(variants).not.toContain('export function Colors');

    const colors = sourceOfExport(source, 'Colors');
    expect(colors).toMatch(/^\/\/ Maps over the real accent list/);
    expect(colors).toContain('export function Colors() {');
    // The Playground's arg type and the comment above it belong to the
    // Playground, not to the last example on the page.
    expect(colors).not.toContain('interface PlaygroundArgs');
    expect(colors).not.toContain('Interactive playground');

    // Nothing follows the Playground, so it keeps its args and argTypes.
    expect(sourceOfExport(source, 'Playground')).toContain('Playground.argTypes');
  });
});

// The fixtures here are written, not read off disk, and that is the point: the
// input this guards against is a story module's exports, which an ES module
// namespace enumerates SORTED. vite-node hands a real module's exports back in
// declaration order, so a test that imported one would pass with the sort
// deleted. Only a fixture whose declaration order disagrees with its
// alphabetical order can fail.
describe('orderByDeclaration', () => {
  const source = [
    'export function Variants() {}',
    '',
    'export function Loading() {}',
    '',
    'export function Colors() {}',
    '',
  ].join('\n');

  // What `Object.entries` of the story module hands the page.
  const alphabetical: Array<[string, number]> = [
    ['Colors', 3],
    ['Loading', 2],
    ['Variants', 1],
  ];

  it('reorders the stories to match the file they are declared in', () => {
    expect(orderByDeclaration(alphabetical, source).map(([name]) => name))
      .toEqual(['Variants', 'Loading', 'Colors']);
  });

  it('keeps a story the file does not declare, at the end', () => {
    const entries: Array<[string, number]> = [['Elsewhere', 0], ...alphabetical];
    expect(orderByDeclaration(entries, source).map(([name]) => name))
      .toEqual(['Variants', 'Loading', 'Colors', 'Elsewhere']);
  });

  it('leaves the order alone when there is no source text to read', () => {
    expect(orderByDeclaration(alphabetical, null)).toEqual(alphabetical);
  });
});
