import { DetailsSection, CustomDataSection, ExtensionsSection, VariantsSection } from "./sections";
import { mdiMenu } from "@mdi/js";
import { Component, createSignal, For, Switch, Match } from "solid-js";
import { App } from "#context";
import { Dropdown, IconButton, Heading } from "#components/primitives";

interface ContentPieceMetadataSection {
  label: string;
  id: string;
  icon: string;
}

interface ContentPieceMetadataProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">;
  editable?: boolean;
  activeSection: ContentPieceMetadataSection;
  sections: ContentPieceMetadataSection[];
  activeVariant: App.Variant | null;
  setActiveVariant(variant: App.Variant | null): void;
  setActiveSection(activeSection: ContentPieceMetadataSection): void;
  setContentPiece(
    value: Partial<App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">>
  ): void;
}

const ContentPieceMetadata: Component<ContentPieceMetadataProps> = (props) => {
  const [menuOpened, setMenuOpened] = createSignal(false);

  return (
    <>
      <Dropdown
        activatorButton={() => (
          <IconButton
            path={mdiMenu}
            class="mx-0"
            label={
              <Heading level={2} class="ml-2">
                {props.activeSection.label}
              </Heading>
            }
            variant="text"
          />
        )}
        opened={menuOpened()}
        setOpened={setMenuOpened}
      >
        <div class="flex flex-col items-start justify-center gap-1 w-full min-w-34">
          <For each={props.sections}>
            {(section) => {
              return (
                <IconButton
                  color={section.id === props.activeSection.id ? "primary" : "base"}
                  text={section.id === props.activeSection.id ? "base" : "soft"}
                  variant="text"
                  class="flex justify-start w-full m-0"
                  label={section.label}
                  path={section.icon}
                  onClick={() => {
                    props.setActiveSection(section);
                    setMenuOpened(false);
                  }}
                ></IconButton>
              );
            }}
          </For>
        </div>
      </Dropdown>
      <Switch>
        <Match when={props.activeSection.id === "details"}>
          <DetailsSection
            filename={props.contentPiece.filename || ""}
            slug={props.contentPiece.slug}
            canonicalLink={props.contentPiece.canonicalLink}
            date={props.contentPiece.date}
            tags={props.contentPiece.tags}
            members={props.contentPiece.members}
            editable={props.editable}
            setFilename={(filename) => {
              props.setContentPiece({ filename });
            }}
            setSlug={(slug) => {
              props.setContentPiece({ slug });
            }}
            setCanonicalLink={(canonicalLink) => {
              props.setContentPiece({ canonicalLink });
            }}
            setDate={(date) => {
              props.setContentPiece({ date });
            }}
            setTags={(tags) => {
              props.setContentPiece({ tags });
            }}
            setMembers={(members) => {
              props.setContentPiece({ members });
            }}
          />
        </Match>
        <Match when={props.activeSection.id === "custom-data"}>
          <CustomDataSection
            editable={props.editable}
            customData={props.contentPiece.customData}
            setCustomData={(customData) => {
              props.setContentPiece({ customData });
            }}
          />
        </Match>
        <Match when={props.activeSection.id === "extensions"}>
          <ExtensionsSection
            contentPiece={props.contentPiece}
            setCustomData={(customData) => {
              props.setContentPiece({
                customData
              });
            }}
          />
        </Match>
        <Match when={props.activeSection.id === "variants"}>
          <VariantsSection
            activeVariant={props.activeVariant}
            setActiveVariant={props.setActiveVariant}
          />
        </Match>
      </Switch>
    </>
  );
};

export { ContentPieceMetadata };
