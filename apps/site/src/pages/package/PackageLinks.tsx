import { Inline } from '@pineappleui/inline';
import { Link } from 'react-router';

import { npmUrlFor, radixDocsUrl, sourceUrlFor } from '../../packageLinks';
import { tabPath } from '../../packageTabs';

import type { RegistryEntry } from '../../registry';

// The row under the package title: the four places a reader goes next after
// "what is this". Three of them are off-site and one is a tab on this page —
// the changelog, which is the answer to "is this maintained" and was previously
// reachable only by noticing a tab.
//
// Every URL is built from data: the source and npm links come out of the
// package's own manifest (packageLinks.ts), the Radix link out of the one
// registry field that says which component a wrapper wraps. Nothing here is a
// per-package address, so a new package's row is right the moment its manifest
// is — there is no list to remember to extend.
export function PackageLinks({ entry }: { entry: RegistryEntry }) {
  const sourceUrl = sourceUrlFor(entry.slug);
  const npmUrl = npmUrlFor(entry.slug);

  return (
    <Inline asChild gap="4" align="center">
      <nav aria-label={`${entry.name} links`}>
        {sourceUrl !== undefined && (
          <a className="package-link" href={sourceUrl} target="_blank" rel="noreferrer">
            View source
          </a>
        )}
        {npmUrl !== undefined && (
          <a className="package-link" href={npmUrl} target="_blank" rel="noreferrer">
            npm
          </a>
        )}
        <Link className="package-link" to={tabPath(entry.slug, 'changelog')}>
          Changelog
        </Link>
        {entry.radix !== undefined && (
          <a
            className="package-link"
            href={radixDocsUrl(entry.radix)}
            target="_blank"
            rel="noreferrer"
          >
            {`Radix ${entry.radix.name}`}
          </a>
        )}
      </nav>
    </Inline>
  );
}
