import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

// Very small syntax highlighter for mongosh queries:
//   "strings"   $operators   numbers   .methods(
const TOKEN_PATTERN =
  /("(?:[^"\\]|\\.)*")|(\$[A-Za-z]+)|(-?\b\d+(?:\.\d+)?\b)|(\.(?:find|findOne|countDocuments|sort|limit)(?=\())/g;

function highlight(code) {
  const parts = [];
  let lastIndex = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const [text, string, operator, number] = match;
    if (match.index > lastIndex) parts.push(code.slice(lastIndex, match.index));

    let className = 'text-sky-300'; // method names
    if (string) className = 'text-amber-200';
    else if (operator) className = 'text-emerald-300 font-medium';
    else if (number) className = 'text-violet-300';

    parts.push(
      <span key={match.index} className={className}>
        {text}
      </span>
    );
    lastIndex = match.index + text.length;
  }

  parts.push(code.slice(lastIndex));
  return parts;
}

export default function QueryCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked by the browser – copying is optional
    }
  }

  return (
    <div className="overflow-hidden rounded-lg bg-slate-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Terminal className="h-3.5 w-3.5" />
          MongoDB Shell (mongosh)
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-6 text-slate-100">
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
