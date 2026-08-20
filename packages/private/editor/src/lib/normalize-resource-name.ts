const normalizeResourceName = (name: string, fallback: string): string => {
  const sourceName = Array.from(name.normalize("NFC").trim()).slice(0, 50).join("") || fallback;
  const words = sourceName
    .normalize("NFKC")
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .match(/[\p{L}\p{N}\p{M}]+/gu);
  const normalizedName = words
    ?.map((word, index) => {
      const [firstCharacter = "", ...remainingCharacters] = Array.from(word.toLowerCase());

      if (index === 0) return `${firstCharacter}${remainingCharacters.join("")}`;

      return `${firstCharacter.toUpperCase()}${remainingCharacters.join("")}`;
    })
    .join("");

  return normalizedName || fallback;
};

export { normalizeResourceName };
