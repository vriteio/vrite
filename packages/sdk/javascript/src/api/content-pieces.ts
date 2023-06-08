import { Profile } from "./profile";
import { PaginationParams, SendRequest } from "./request";
import { Tag } from "./tags";

type JSONContentAttrs = Record<string, string | number | boolean>;

interface JSONContent {
  type: string;
  content?: JSONContent[];
  text?: string;
  attrs?: JSONContentAttrs;
  marks?: Array<{ type: string; attrs: JSONContentAttrs }>;
}
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
  date?: string;
  /**
   * Title
   */
  title: string;
  /**
   * Content piece description - can be HTML or plain text
   */
  description?: string;
  /**
   * URL of the cover image
   */
  coverUrl?: string;
  /**
   * Alt description of the cover image
   */
  coverAlt?: string;
  /**
   * ID of the content group to assign the piece to
   */
  contentGroupId: string;
  /**
   * JSON object containing custom metadata
   */
  customData?: CustomData;
  /**
   * Canonical link
   */
  canonicalLink?: string;
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
   * Whether content piece assigned to a locked content group
   */
  locked: boolean;
  /**
   * Cover image width - percentage value string (only meant for resizing image inside Vrite editor)
   */
  coverWidth: string;
  /**
   * JSON content
   */
  content: IncludeContent extends true ? JSONContent : undefined;
};
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
    > & { referenceId?: string; slug?: string }
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
      >
    > &
      Pick<ContentPiece<CustomData>, "id">
  ): Promise<void>;
  delete(input: Pick<ContentPiece, "id">): Promise<void>;
  list<CustomData extends Record<string, any> = Record<string, any>>(
    input: PaginationParams & {
      contentGroupId: string;
      tagId?: string;
      slug?: string;
    }
  ): Promise<Array<Omit<ContentPieceWithAdditionalData<CustomData>, "content">>>;
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
  list: <CustomData extends Record<string, any> = Record<string, any>>(
    input: PaginationParams & {
      contentGroupId: string;
      tagId?: string;
      slug?: string;
    }
  ) => {
    return sendRequest<Array<Omit<ContentPieceWithAdditionalData<CustomData>, "content">>>(
      "GET",
      `${basePath}/list`,
      { params: input }
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
