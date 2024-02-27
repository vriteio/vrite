import { DetailsSection, CustomDataSection, ExtensionsSection } from "./sections";
import { ContentPieceDescription } from "./description";
import { mdiMenu } from "@mdi/js";
import { Component, createSignal, For, onMount } from "solid-js";
import { App } from "#context";
import { Dropdown, IconButton, Heading } from "#components/primitives";
import { createRef } from "#lib/utils";

interface ContentPieceMetadataSection {
  label: string;
  id: string;
  icon: string;
}

interface ContentPieceMetadataProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"coverWidth">;
  editable?: boolean;
  activeSection: ContentPieceMetadataSection;
  sections: ContentPieceMetadataSection[];
  setActiveSection(activeSection: ContentPieceMetadataSection): void;
  setContentPiece(value: Partial<App.ExtendedContentPieceWithAdditionalData<"coverWidth">>): void;
}

const ContentPieceMetadata: Component<ContentPieceMetadataProps> = (props) => {
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [scrollableSectionRef, setScrollableSectionRef] = createRef<HTMLDivElement | null>(null);

  onMount(() => {
    const scrollableSection = scrollableSectionRef();

    if (!scrollableSection) return;

    scrollableSection.addEventListener("scroll", (event) => {
      const sectionIndex = Math.round(
        (scrollableSection.scrollLeft / scrollableSection.scrollWidth) * 3
      );

      props.setActiveSection(props.sections[sectionIndex]);
    });
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
                {props.activeSection.label}
              </Heading>
            }
            variant="text"
          />
        )}
        opened={menuOpened()}
        setOpened={setMenuOpened}
        cardProps={{ class: "m-0" }}
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
                    scrollableSectionRef()?.scrollTo({
                      left:
                        scrollableSectionRef()!.scrollWidth * (props.sections.indexOf(section) / 3)
                    });
                    setMenuOpened(false);
                  }}
                ></IconButton>
              );
            }}
          </For>
        </div>
      </Dropdown>
      <div
        class="flex w-full overflow-auto scrollbar-hidden snap-mandatory snap-x"
        ref={setScrollableSectionRef}
      >
        <div class="min-w-full snap-center">
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
          <ContentPieceDescription
            descriptionExists={typeof props.contentPiece?.description === "string"}
            initialDescription={props.contentPiece.description || ""}
            editable={props.editable}
            setDescription={(description) => {
              props.setContentPiece({ description });
            }}
          />
        </div>
        <div class="min-w-full snap-center">
          <CustomDataSection
            editable={props.editable}
            customData={props.contentPiece.customData}
            setCustomData={(customData) => {
              props.setContentPiece({ customData });
            }}
          />
        </div>
        <div class="min-w-full snap-center">
          <ExtensionsSection
            contentPiece={props.contentPiece}
            setCustomData={(customData) => {
              props.setContentPiece({
                customData
              });
            }}
          />
        </div>
      </div>
    </>
  );
};

export { ContentPieceMetadata };
