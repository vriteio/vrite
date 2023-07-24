import { CanonicalLinkInput } from "./canonical-link";
import { DateInput } from "./date";
import { TagsInput } from "./tags";
import { MembersInput } from "./members";
import { SlugInput } from "./slug";
import { Component } from "solid-js";
import { App } from "#context";

interface DetailsSectionProps {
  slug: string;
  canonicalLink?: string | null;
  date?: string | null;
  tags: App.Tag[];
  members: App.ContentPieceMember[];
  editable?: boolean;
  setSlug(slug: string): void;
  setCanonicalLink(canonicalLink: string | null): void;
  setDate(date: string | null): void;
  setTags(tags: App.Tag[]): void;
  setMembers(members: App.ContentPieceMember[]): void;
}

const DetailsSection: Component<DetailsSectionProps> = (props) => {
  return (
    <>
      <SlugInput slug={props.slug} setSlug={props.setSlug} editable={props.editable} />
      <CanonicalLinkInput
        canonicalLink={props.canonicalLink}
        setCanonicalLink={props.setCanonicalLink}
        editable={props.editable}
      />
      <DateInput date={props.date} setDate={props.setDate} editable={props.editable} />
      <TagsInput tags={props.tags} setTags={props.setTags} editable={props.editable} />
      <MembersInput
        members={props.members}
        setMembers={props.setMembers}
        editable={props.editable}
      />
    </>
  );
};

export { DetailsSection };
