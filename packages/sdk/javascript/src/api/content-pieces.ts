import { Profile } from "./profile";
import { PaginationParams, SendRequest } from "./request";
import { Tag } from "./tags";

type JSONContentAttrs = Record<string, string | number | boolean>;

type JSONContent = {
  type: string;
  content?: JSONContent[];
  text?: string;
  attrs?: JSONContentAttrs;
  marks?: Array<{ type: string; attrs: JSONContentAttrs }>;
};
type ContentPiece<
  CustomData extends Record<string, any> = Record<string, any>,
  IncludeContent extends true | false = false
> = {
  /**
   * Content piece ID
   */
  id: string;
  /**
   * ISO date
   */
  date?: string | null;
  /**
   * Title
   */
  title: string;
  /**
   * Content piece description - can be HTML or plain text
   */
  description?: string | null;
  /**
   * URL of the cover image
   */
  coverUrl?: string | null;
  /**
   * Alt description of the cover image
   */
  coverAlt?: string | null;
  /**
   * ID of the content group to assign the piece to
   */
  contentGroupId: string;
  /**
   * JSON object containing custom metadata
   */
  customData?: CustomData | null;
  /**
   * Canonical link
   */
  canonicalLink?: string | null;
  /**
   * IDs of assigned tags
   */
  tags: string[];
  /**
   * IDs of assigned members
   */
  members: string[];
  /**
   * Content piece slug
   */
  slug: string;
  /**
   * Content piece filename
   */
  filename?: string | null;
  /**
   * Cover image width - percentage value string (only meant for resizing image inside Vrite editor)
   */
  coverWidth?: string;
} & (IncludeContent extends true
  ? {
      /**
       * JSON content
       */
      content: JSONContent;
    }
  : {});
type ContentPieceWithAdditionalData<
  CustomData extends Record<string, any> = Record<string, any>,
  IncludeContent extends true | false = false
> = Omit<ContentPiece<CustomData, IncludeContent>, "tags" | "members"> & {
  tags: Tag[];
  members: Array<{ id: string; profile: Omit<Profile, "bio"> }>;
};
interface ContentPiecesEndpoints {
  get<
    CustomData extends Record<string, any> = Record<string, any>,
    IncludeContent extends true | false = false
  >(
    input: Pick<ContentPiece, "id"> & {
      content?: IncludeContent;
      description?: "html" | "text";
      variant?: string;
    }
  ): Promise<ContentPieceWithAdditionalData<CustomData, IncludeContent>>;
  create<CustomData extends Record<string, any> = Record<string, any>>(
    input: Pick<
      ContentPiece<CustomData>,
      | "date"
      | "title"
      | "description"
      | "tags"
      | "members"
      | "coverUrl"
      | "coverAlt"
      | "contentGroupId"
      | "customData"
      | "canonicalLink"
    > & { referenceId?: string; slug?: string; content?: string }
  ): Promise<Pick<ContentPiece<CustomData>, "id">>;
  update<CustomData extends Record<string, any> = Record<string, any>>(
    input: Partial<
      Pick<
        ContentPiece<CustomData>,
        | "date"
        | "title"
        | "description"
        | "tags"
        | "members"
        | "slug"
        | "coverUrl"
        | "coverAlt"
        | "contentGroupId"
        | "customData"
        | "canonicalLink"
        | "coverWidth"
      > & { content?: string; variant?: string }
    > &
      Pick<ContentPiece<CustomData>, "id">
  ): Promise<void>;
  delete(input: Pick<ContentPiece, "id">): Promise<void>;
  list<
    CustomData extends Record<string, any> = Record<string, any>,
    IncludeContent extends true | false = false
  >(
    input: PaginationParams & {
      content?: IncludeContent;
      contentGroupId?: string | string[];
      tagId?: string;
      slug?: string;
      variant?: string;
    }
  ): Promise<Array<ContentPieceWithAdditionalData<CustomData, IncludeContent>>>;
}

const basePath = "/content-pieces";
const createContentPiecesEndpoints = (sendRequest: SendRequest): ContentPiecesEndpoints => ({
  get: <
    CustomData extends Record<string, any> = Record<string, any>,
    IncludeContent extends true | false = false
  >(
    input: Pick<ContentPiece, "id"> & {
      content?: IncludeContent;
      description?: "html" | "text";
      variant?: string;
    }
  ) => {
    return sendRequest<ContentPieceWithAdditionalData<CustomData, IncludeContent>>(
      "GET",
      `${basePath}`,
      {
        params: input
      }
    );
  },
  create: <CustomData extends Record<string, any> = Record<string, any>>(
    input: Pick<
      ContentPiece<CustomData>,
      | "date"
      | "title"
      | "description"
      | "tags"
      | "members"
      | "slug"
      | "coverUrl"
      | "coverAlt"
      | "contentGroupId"
      | "customData"
      | "canonicalLink"
    > & { referenceId?: string; slug?: string }
  ) => {
    return sendRequest<Pick<ContentPiece<CustomData>, "id">>("POST", `${basePath}`, {
      body: input
    });
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  },
  delete: (input) => {
    return sendRequest("DELETE", `${basePath}`, {
      params: input
    });
  },
  list: <
    CustomData extends Record<string, any> = Record<string, any>,
    IncludeContent extends true | false = false
  >({
    contentGroupId,
    ...input
  }: PaginationParams & {
    content?: IncludeContent;
    contentGroupId?: string | string[];
    tagId?: string;
    slug?: string;
    variant?: string;
  }) => {
    return sendRequest<Array<ContentPieceWithAdditionalData<CustomData, IncludeContent>>>(
      "GET",
      `${basePath}/list`,
      {
        params: {
          ...input,
          ...(contentGroupId && {
            contentGroupId:
              typeof contentGroupId === "string" ? contentGroupId : contentGroupId.join(",")
          })
        }
      }
    );
  }
});

export { createContentPiecesEndpoints };
export type {
  ContentPiece,
  ContentPieceWithAdditionalData,
  JSONContent,
  JSONContentAttrs,
  ContentPiecesEndpoints
};
