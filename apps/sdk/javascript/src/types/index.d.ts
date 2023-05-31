declare module "virtual:vrite" {
  // @ts-ignore
  export const client: import("@vrite/sdk/api").Client;
  export {
    APIError,
    BadRequestError,
    Client,
    ContentGroup,
    ContentPiece,
    JSONContent,
    JSONContentAttrs,
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
    UnauthorizedError
    // @ts-ignore
  } from "@vrite/sdk/api";
  export function Content(props: { contentPieceId?: string; slug?: string }): any;
  export function getStaticPaths(): Promise<
    Array<{
      params: { slug: string };
      // @ts-ignore
      props: Omit<import("@vrite/sdk/api").ContentPieceWithTags, "content">;
    }>
  >;
  export function getContentPieces(
    config?: {
      limit?: number | "all";
      startPage?: number;
      tagId?: string;
    }
    // @ts-ignore
  ): Promise<Array<Omit<import("@vrite/sdk/api").ContentPieceWithTags, "content">>>;
  export function getContentGroupId(): string;
}
