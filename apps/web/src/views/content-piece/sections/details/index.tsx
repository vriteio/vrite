import { CanonicalLinkInput } from "./canonical-link";
import { DateInput } from "./date";
import { TagsInput } from "./tags";
import { MembersInput } from "./members";
import { SlugInput } from "./slug";
import { FilenameInput } from "./filename";
import { Component, Show, createEffect, createSignal } from "solid-js";
import { App, useAuthenticatedUserData } from "#context";

interface DetailsSectionProps {
  slug: string;
  filename: string;
  canonicalLink?: string | null;
  date?: string | null;
  tags: App.Tag[];
  members: App.ContentPieceMember[];
  editable?: boolean;
  setSlug(slug: string): void;
  setFilename(filename: string): void;
  setCanonicalLink(canonicalLink: string | null): void;
  setDate(date: string | null): void;
  setTags(tags: App.Tag[]): void;
  setMembers(members: App.ContentPieceMember[]): void;
}

const DetailsSection: Component<DetailsSectionProps> = (props) => {
  const { workspaceSettings } = useAuthenticatedUserData();
  const [enabledFields, setEnabledFields] = createSignal<App.MetadataField[]>([]);

  createEffect(() => {
    setEnabledFields(
      workspaceSettings()?.metadata?.enabledFields || [
        "slug",
        "canonical-link",
        "date",
        "tags",
        "members"
      ]
    );
  });

  return (
    <>
      <Show when={enabledFields().includes("filename")}>
        <FilenameInput
          filename={props.filename}
          setFilename={props.setFilename}
          editable={props.editable}
        />
      </Show>
      <Show when={enabledFields().includes("slug")}>
        <SlugInput slug={props.slug} setSlug={props.setSlug} editable={props.editable} />
      </Show>
      <Show when={enabledFields().includes("canonical-link")}>
        <CanonicalLinkInput
          canonicalLink={props.canonicalLink}
          setCanonicalLink={props.setCanonicalLink}
          editable={props.editable}
        />
      </Show>
      <Show when={enabledFields().includes("date")}>
        <DateInput date={props.date} setDate={props.setDate} editable={props.editable} />
      </Show>
      <Show when={enabledFields().includes("tags")}>
        <TagsInput tags={props.tags} setTags={props.setTags} editable={props.editable} />
      </Show>
      <Show when={enabledFields().includes("members")}>
        <MembersInput
          members={props.members}
          setMembers={props.setMembers}
          editable={props.editable}
        />
      </Show>
    </>
  );
};

export { DetailsSection };
