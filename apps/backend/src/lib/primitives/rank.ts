import { LexoRank } from "lexorank";

const rankBetweenNeighbors = (previous?: string | null, next?: string | null): string => {
  const previousRank = previous ? LexoRank.parse(previous) : null;
  const nextRank = next ? LexoRank.parse(next) : null;

  if (previousRank && nextRank) return `${previousRank.between(nextRank)}`;
  if (previousRank) return `${previousRank.genNext()}`;
  if (nextRank) return `${nextRank.genPrev()}`;
  return `${LexoRank.middle()}`;
};

export { rankBetweenNeighbors };
