import { Inline } from '@pineappleui/inline';

import { npmUrlFor, radixDocsUrl, sourceUrlFor } from '../../packageLinks';
import { NewTabNote } from './NewTabNote';

import type { RegistryEntry } from '../../registry';

// The row under the package title: the places a reader goes next that are not
// on this page. It held a Changelog link too, one row above the Changelog tab
// that goes to the same address — two controls, same destination, no way to
// tell why there were two. The tab is the one that says where it sits.
//
// Every URL is built from data: the source and npm links come out of the
// package's own manifest (packageLinks.ts), the Radix link out of the one
// registry field that says which component a wrapper wraps. Nothing here is a
// per-package address, so a new package's row is right the moment its manifest
// is — there is no list to remember to extend.

// Every link left in this row opens a new tab, and says so in its accessible
// name — see NewTabNote.
export function PackageLinks({ entry }: { entry: RegistryEntry }) {
  const sourceUrl = sourceUrlFor(entry.slug);
  const npmUrl = npmUrlFor(entry.slug);

  return (
    <Inline asChild gap="4" align="center">
      <nav aria-label={`${entry.name} links`}>
        {sourceUrl !== undefined && (
          <a className="package-link" href={sourceUrl} target="_blank" rel="noreferrer">
            View source
            <NewTabNote />
          </a>
        )}
        {npmUrl !== undefined && (
          <a className="package-link" href={npmUrl} target="_blank" rel="noreferrer">
            npm
            <NewTabNote />
          </a>
        )}
        {entry.radix !== undefined && (
          <a
            className="package-link"
            href={radixDocsUrl(entry.radix)}
            target="_blank"
            rel="noreferrer"
          >
            {`Radix ${entry.radix.name}`}
            <NewTabNote />
          </a>
        )}
      </nav>
    </Inline>
  );
}
