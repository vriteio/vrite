declare module "virtual:vrite/client" {
  // @ts-ignore
  export const client: import("@vrite/sdk/api").Client;
  export {
    APIError,
    BadRequestError,
    Client,
    ContentGroup,
    ContentPiece,
    ContentPieceWithAdditionalData,
    JSONContent,
    JSONContentAttrs,
    Snippet,
    Profile,
    Role,
    RoleBaseType,
    RolePermission,
    Tag,
    TagColor,
    UIAccentColor,
    UserSettings,
    Webhook,
    WebhookEvent,
    WorkspaceDetails,
    Block,
    Embed,
    Mark,
    WorkspaceSettings,
    ListedMember,
    ListedWorkspace,
    Extension,
    Variant,
    UnauthorizedError
    // @ts-ignore
  } from "@vrite/sdk/api";
  export function getContentGroupId(): string;
}
declare module "virtual:vrite" {
  export * from "virtual:vrite/client";
  // @ts-ignore
  export function Content(props: {
    contentPieceId?: string;
    slug?: string;
    variant?: string;
    // @ts-ignore
    content?: import("@vrite/sdk/api").JSONContent;
  }): any;
  export function getStaticPaths(): Promise<
    Array<{
      params: { slug: string };
      // @ts-ignore
      props: Omit<import("@vrite/sdk/api").ContentPieceWithAdditionalData, "content">;
    }>
  >;
  export function getContentPieces(
    config?: {
      limit?: number | "all";
      startPage?: number;
      tagId?: string;
      variant?: string;
    }
    // @ts-ignore
  ): Promise<Array<Omit<import("@vrite/sdk/api").ContentPieceWithAdditionalData, "content">>>;
}
