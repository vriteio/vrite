import { DetailsSection, CustomDataSection, ExtensionsSection } from "./sections";
import { mdiInformationOutline, mdiCodeJson, mdiMenu, mdiPuzzleOutline } from "@mdi/js";
import { Component, createSignal, For, Switch, Match, createEffect } from "solid-js";
import { App } from "#context";
import { Dropdown, IconButton, Heading } from "#components/primitives";

interface ContentPieceMetadataProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">;
  editable?: boolean;
  setContentPiece(
    value: Partial<App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">>
  ): void;
}

const ContentPieceMetadata: Component<ContentPieceMetadataProps> = (props) => {
  const [menuOpened, setMenuOpened] = createSignal(false);
  const sections = [
    { label: "Details", id: "details", icon: mdiInformationOutline },
    { label: "Custom data", id: "custom-data", icon: mdiCodeJson },
    { label: "Extensions", id: "extensions", icon: mdiPuzzleOutline }
  ];
  const [activeSection, setActiveSection] = createSignal(sections[0]);

  createEffect(() => {
    if (props.contentPiece.locked) {
      setActiveSection(sections[0]);
    }
  });

  return (
    <>
      <Dropdown
        activatorButton={() => (
          <IconButton
            path={mdiMenu}
            class="mx-0"
            label={
              <Heading level={2} class="ml-2">
                {activeSection().label}
              </Heading>
            }
            variant="text"
          />
        )}
        opened={menuOpened()}
        setOpened={setMenuOpened}
      >
        <div class="flex flex-col items-start justify-center gap-1 w-34">
          <For each={sections}>
            {(section) => {
              return (
                <IconButton
                  color={section.id === activeSection().id ? "primary" : "base"}
                  text={section.id === activeSection().id ? "base" : "soft"}
                  variant="text"
                  class="flex justify-start w-full m-0"
                  label={section.label}
                  path={section.icon}
                  onClick={() => {
                    setActiveSection(section);
                    setMenuOpened(false);
                  }}
                ></IconButton>
              );
            }}
          </For>
        </div>
      </Dropdown>
      <Switch>
        <Match when={activeSection().id === "details"}>
          <DetailsSection
            slug={props.contentPiece.slug}
            canonicalLink={props.contentPiece.canonicalLink}
            date={props.contentPiece.date}
            tags={props.contentPiece.tags}
            members={props.contentPiece.members}
            editable={props.editable}
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
        <Match when={activeSection().id === "custom-data"}>
          <CustomDataSection
            editable={props.editable}
            customData={props.contentPiece.customData}
            setCustomData={(customData) => {
              props.setContentPiece({ customData });
            }}
          />
        </Match>
        <Match when={activeSection().id === "extensions"}>
          <ExtensionsSection
            contentPiece={props.contentPiece}
            setCustomData={(customData) => {
              props.setContentPiece({
                customData
              });
            }}
          />
        </Match>
      </Switch>
    </>
  );
};

export { ContentPieceMetadata };
