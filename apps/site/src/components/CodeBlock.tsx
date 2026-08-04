import { useEffect, useState } from 'react';

import { IconButton } from '@pineappleui/icon-button';
import { Icon } from '@pineappleui/icons';
import { LiveRegion } from '@pineappleui/live-region';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timer = setTimeout(setIsCopied, 2000, false);
    return () => clearTimeout(timer);
  }, [isCopied]);

  return (
    <div className="code-block">
      <pre><code>{code}</code></pre>
      <IconButton
        aria-label="Copy code"
        className="code-block-copy"
        variant="ghost"
        color="gray"
        size="1"
        onClick={() => {
          void navigator.clipboard.writeText(code).then(() => setIsCopied(true));
        }}
      >
        <Icon name={isCopied ? 'check' : 'copy'} size="sm" />
      </IconButton>
      <LiveRegion>{isCopied ? 'Copied to clipboard' : ''}</LiveRegion>
    </div>
  );
}
