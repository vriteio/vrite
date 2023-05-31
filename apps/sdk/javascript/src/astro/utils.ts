import { ContentPiece, ContentPieceWithTags } from "../api/content-pieces";
import { client } from "virtual:vrite";
import type { Client } from "../api";

const getContentPieces = async (
  contentGroupId: string,
  config?: {
    limit?: number | "all";
    startPage?: number;
    tagId?: string;
  }
): Promise<Array<Omit<ContentPieceWithTags, "content">>> => {
  const contentPieces: Array<Omit<ContentPieceWithTags, "content">> = [];

  let page = config?.startPage || 1;

  const fetchPage = async (): Promise<void> => {
    const paginatedContentPieces = await (client as Client).contentPieces.list({
      contentGroupId,
      page,
      perPage: config?.limit === "all" ? 50 : config?.limit || 50,
      tagId: config?.tagId
    });

    contentPieces.push(...paginatedContentPieces);

    if (config?.limit === "all" && paginatedContentPieces.length === 50) {
      page += 1;
      await fetchPage();
    }
  };

  await fetchPage();

  return contentPieces;
};
const getStaticPaths = async (
  contentGroupId: string
): Promise<
  Array<{
    params: { slug: string };
    props: Omit<ContentPieceWithTags, "content">;
  }>
> => {
  const contentPieces = await getContentPieces(contentGroupId, {
    limit: "all"
  });

  return contentPieces.map((contentPiece) => {
    return {
      params: {
        slug: contentPiece.slug
      },
      props: contentPiece
    };
  });
};

export { getStaticPaths, getContentPieces };
