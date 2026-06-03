import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const COMPONENTS = {
  h1: ({ node, ...props }) => (
    <h2 className="mt-4 first:mt-0 mb-2 text-[17px] font-semibold text-(--foreground)" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="mt-4 first:mt-0 mb-2 text-[15px] font-semibold text-(--foreground)" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="mt-3 first:mt-0 mb-1.5 text-sm font-semibold text-(--foreground)" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="mb-3 last:mb-0 text-sm leading-relaxed text-(--muted-foreground)" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-(--foreground)" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="mb-3 last:mb-0 pl-5 list-disc marker:text-(--primary) space-y-1.5" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="mb-3 last:mb-0 pl-5 list-decimal marker:text-(--muted-foreground) space-y-1.5"
      {...props}
    />
  ),
  li: ({ node, ...props }) => (
    <li className="text-sm leading-relaxed text-(--muted-foreground) pl-1" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-(--primary) underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  hr: ({ node, ...props }) => <hr className="my-4 border-(--border)" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="mb-3 border-l-2 border-(--primary) pl-3 italic text-(--muted-foreground)"
      {...props}
    />
  ),
  code: ({ node, ...props }) => (
    <code
      className="rounded bg-(--primary-light) px-1.5 py-0.5 text-[0.85em] text-(--foreground)"
      {...props}
    />
  ),
};

export function Markdown({ children, className = "" }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
