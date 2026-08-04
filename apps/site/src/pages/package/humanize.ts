// 'AllIcons' -> 'All icons', 'HelloWorld' -> 'Hello world'. Story export
// names are PascalCase; section headings read as prose.
export function humanizeExportName(name: string): string {
  const spaced = name.replace(/(?<=[a-z0-9])(?=[A-Z])/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
