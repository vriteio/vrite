type EmbedType = "youtube" | "codepen" | "codesandbox";

const matchers = {
  youtube:
    /^ *https?:\/\/(?:www\.)?youtu\.?be(?:.com)?\/(?:watch\?v=|embed\/)?(.+?)(?:[ &/?].*)*$/i,
  twitter: /^ *https?:\/\/(?:www\.)?twitter\.com\/.+?\/.+?\/(\d+)(?:[ &/?].*)*$/i,
  codepen: /^ *https?:\/\/(?:www\.)?codepen\.io\/.+?\/(?:embed|pen)?\/(.+?)(?:[ &/?].*)*$/i,
  codesandbox: /^ *https?:\/\/(?:www\.)?codesandbox\.io\/(?:s|embed)\/(.+?)(?:[ &/?].*)*$/i
};
const getEmbedId = (value: string, embedType: EmbedType): string => {
  const matcher = matchers[embedType];
  const match = matcher.exec(value);

  if (match) {
    return match[1];
  }

  return value;
};
const getEmbedSrc = (id: string, embedType: EmbedType): string => {
  const isDark = document.documentElement.classList.contains("dark");

  switch (embedType) {
    case "youtube":
      return `https://www.youtube.com/embed/${id}`;
    case "codepen":
      return `https://codepen.io/codepen/embed/${id}?theme-id=${isDark ? "dark" : "light"}`;
    case "codesandbox":
      return `https://codesandbox.io/embed/${id}?theme=${isDark ? "dark" : "light"}`;
    default:
      return "";
  }
};

export { getEmbedId, getEmbedSrc };
export type { EmbedType };
