import clsx from "clsx";
import { marked, Renderer, type Tokens } from "marked";
import { type Component, createMemo } from "solid-js";

interface MarkdownProps {
  class?: string;
  content: string;
  onLinkClick?(href: string, event: MouseEvent): void;
}

const escapeHTML = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};
const isSafeLink = (href: string): boolean => {
  if (href.startsWith("#")) return true;

  try {
    const url = new URL(href);

    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};
const renderer = new Renderer();

renderer.html = ({ text }: Tokens.HTML | Tokens.Tag): string => escapeHTML(text);
renderer.image = ({ text }: Tokens.Image): string => escapeHTML(text);
renderer.link = function ({ href, title, tokens }: Tokens.Link): string {
  const label = this.parser.parseInline(tokens);

  if (!isSafeLink(href)) return label;

  const titleAttribute = title ? ` title="${escapeHTML(title)}"` : "";
  const externalAttributes = href.startsWith("#")
    ? ""
    : ' target="_blank" rel="noopener noreferrer"';

  return `<a href="${escapeHTML(href)}"${titleAttribute}${externalAttributes}>${label}</a>`;
};

const renderMarkdown = (content: string): string => {
  return marked.parse(content, {
    async: false,
    breaks: true,
    gfm: true,
    renderer
  });
};

const Markdown: Component<MarkdownProps> = (props) => {
  const html = createMemo(() => renderMarkdown(props.content));
  const handleClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest("a") : null;
    const href = target?.getAttribute("href");

    if (href) props.onLinkClick?.(href, event);
  };

  return (
    <div
      class={clsx(
        "prose prose-sm max-w-none break-words text-sm leading-relaxed prose-a:font-medium prose-a:text-transparent prose-a:bg-clip-text prose-a:bg-gradient-to-tr prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto",
        props.class
      )}
      innerHTML={html()}
      onClick={handleClick}
    />
  );
};

export { Markdown };
export type { MarkdownProps };
