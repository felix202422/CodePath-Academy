import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  markdown: string;
}

const components: Components = {
  a: ({ href, children }) => {
    const external = href?.startsWith('https://') || href?.startsWith('http://');
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className="font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      className="my-5 max-h-[36rem] rounded-lg border border-slate-200 object-contain"
    />
  ),
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-lg bg-navy-950 p-4 text-sm text-slate-100">
      {children}
    </pre>
  ),
  code: ({ node, className, children, ...rest }) => {
    // ReactMarkdown's AST node is metadata, not a DOM attribute.
    void node;
    return (
      <code
        className={className ?? 'rounded bg-canvas px-1 py-0.5 text-sm text-accent-800'}
        {...rest}
      >
        {children}
      </code>
    );
  },
};

/** Safe GFM Markdown renderer. Raw HTML and unsafe URLs are sanitized. */
export function MarkdownContent({ markdown }: MarkdownContentProps) {
  return (
    <div className="space-y-4 text-base leading-7 text-ink [&_blockquote]:border-l-4 [&_blockquote]:border-accent-300 [&_blockquote]:pl-4 [&_blockquote]:text-ink-muted [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-canvas [&_th]:p-2 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
