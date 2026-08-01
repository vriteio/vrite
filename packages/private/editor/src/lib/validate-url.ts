const validateURL = (value: string): string | null => {
  const href = value.trim();

  if (!href) return null;

  try {
    const url = new URL(href);

    return ["http:", "https:", "mailto:"].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
};

export { validateURL };
