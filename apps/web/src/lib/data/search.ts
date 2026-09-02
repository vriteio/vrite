import { query } from "@solidjs/router";
import { client } from "#web/lib/api";

interface CurrentSearchQueryInput {
  filters: Array<NonNullable<Parameters<typeof client.search.current>[0]["filters"]>[number]>;
  query: string;
  workspaceID: string;
}

type SearchPropertyFilter = CurrentSearchQueryInput["filters"][number];

const currentSearchQuery = query((input: CurrentSearchQueryInput) => {
  return client.search.current({
    query: input.query,
    filters: input.filters,
    limit: 20,
    semantic: false
  });
}, "current-search");

export { currentSearchQuery };
export type { CurrentSearchQueryInput, SearchPropertyFilter };
