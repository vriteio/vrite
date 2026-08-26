const MAX_SOURCE_NAME_LENGTH = 50;

const normalizeSourceName = (name: unknown, fallback: string): string => {
  const normalizedName = Array.from(
    String(name || "")
      .normalize("NFC")
      .trim()
  )
    .slice(0, MAX_SOURCE_NAME_LENGTH)
    .join("");

  return normalizedName || fallback;
};

export { normalizeSourceName };
