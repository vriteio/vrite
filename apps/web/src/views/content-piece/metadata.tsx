import { DetailsSection } from "./details-section";
import { CustomDataSection } from "./custom-data-section";
import { mdiInformationOutline, mdiCodeJson, mdiConnection, mdiMenu } from "@mdi/js";
import { Component, createSignal, For, Switch, Match } from "solid-js";
import { App } from "#context";
import { Dropdown, IconButton, Heading } from "#components/primitives";

interface ContentPieceMetadataProps {
  contentPiece: App.ContentPieceWithTags;
  editable?: boolean;
  setContentPiece(value: Partial<App.ContentPieceWithTags>): void;
}

const ContentPieceMetadata: Component<ContentPieceMetadataProps> = (props) => {
  const [menuOpened, setMenuOpened] = createSignal(false);
  const sections = [
    { label: "Details", id: "details", icon: mdiInformationOutline },
    { label: "Custom data", id: "custom-data", icon: mdiCodeJson }
  ];
  const [activeSection, setActiveSection] = createSignal(sections[0]);

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
            canonicalLink={props.contentPiece.canonicalLink}
            date={props.contentPiece.date}
            tags={props.contentPiece.tags}
            editable={props.editable}
            setCanonicalLink={(canonicalLink) => {
              props.setContentPiece({ canonicalLink });
            }}
            setDate={(date) => {
              props.setContentPiece({ date });
            }}
            setTags={(tags) => {
              props.setContentPiece({ tags });
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
      </Switch>
    </>
  );
};

export { ContentPieceMetadata };
