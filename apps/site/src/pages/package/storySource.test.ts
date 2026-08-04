import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { repoRoot } from '../../test-helpers';
import { sourceOfExport } from './storySource';

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

  it('is undefined for a name the file does not declare at the top level', () => {
    const source = 'export function Variants() {}\n';
    expect(sourceOfExport(source, 'Missing')).toBeUndefined();
    // Not a top-level declaration: a mention inside another story is not one.
    expect(sourceOfExport('const Variants = 1;\n', 'Variants')).toBeUndefined();
  });

  // The story files are the real input, and their formatting is the whole
  // premise: a repo-wide reformat that broke this would otherwise show up as
  // silently missing "Show code" buttons on a page nobody re-opened.
  it('finds every non-Playground export of a real story file', () => {
    const file = path.join(repoRoot, 'packages/button/src/Button.stories.tsx');
    const source = readFileSync(file, 'utf8');

    expect(sourceOfExport(source, 'Variants')).toMatch(/^export function Variants\(\) \{/);
    expect(sourceOfExport(source, 'Variants')).toContain('variant="ghost"');
    expect(sourceOfExport(source, 'Variants')).not.toContain('export function Loading');
    expect(sourceOfExport(source, 'Loading')).toMatch(/^export function Loading\(\) \{/);
  });
});
