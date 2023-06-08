import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const prettierConfig = z
  .object({
    printWidth: z.number(),
    tabWidth: z.number(),
    useTabs: z.boolean(),
    semi: z.boolean(),
    singleQuote: z.boolean(),
    jsxSingleQuote: z.boolean(),
    trailingComma: z.enum(["none", "es5", "all"]),
    bracketSpacing: z.boolean(),
    bracketSameLine: z.boolean(),
    jsxBracketSameLine: z.boolean(),
    rangeStart: z.number(),
    rangeEnd: z.number(),
    proseWrap: z.enum(["always", "never", "preserve"]),
    arrowParens: z.enum(["avoid", "always"]),
    htmlWhitespaceSensitivity: z.enum(["css", "strict", "ignore"]),
    endOfLine: z.enum(["auto", "lf", "crlf", "cr"]),
    quoteProps: z.enum(["as-needed", "consistent", "preserve"]),
    vueIndentScriptAndStyle: z.boolean(),
    embeddedLanguageFormatting: z.enum(["auto", "off"]),
    singleAttributePerLine: z.boolean()
  })
  .partial();
const metadataSettings = z
  .object({
    canonicalLinkPattern: z.string()
  })
  .partial();
const marks = [
  "bold",
  "italic",
  "strike",
  "code",
  "link",
  "highlight",
  "subscript",
  "superscript"
] as const;
const blocks = [
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image"
] as const;
const embeds = ["codepen", "codesandbox", "youtube"] as const;
const workspaceSettings = z.object({
  id: zodId(),
  prettierConfig: z.string(),
  metadata: metadataSettings.optional(),
  marks: z.array(z.enum(marks)),
  blocks: z.array(z.enum(blocks)),
  embeds: z.array(z.enum(embeds))
});

interface WorkspaceSettings<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspaceSettings>, "id"> {
  id: ID;
}
interface FullWorkspaceSettings<ID extends string | ObjectId = string>
  extends WorkspaceSettings<ID> {
  workspaceId: ID;
}
interface MetadataSettings extends z.infer<typeof metadataSettings> {}

const getWorkspaceSettingsCollection = (
  db: Db
): Collection<UnderscoreID<FullWorkspaceSettings<ObjectId>>> => {
  return db.collection("workspace-settings");
};

export {
  prettierConfig,
  marks,
  blocks,
  embeds,
  workspaceSettings,
  metadataSettings,
  getWorkspaceSettingsCollection
};
export type { MetadataSettings, WorkspaceSettings, FullWorkspaceSettings };
