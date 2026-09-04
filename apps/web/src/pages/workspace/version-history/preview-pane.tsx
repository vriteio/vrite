import { createRef } from "@andesine/components";
import {
  createVersionComparison,
  Editor,
  type EditorMode,
  type EditorProps
} from "@andesine/editor";
import { useSearchParams } from "@solidjs/router";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  Suspense
} from "solid-js";
import {
  EDITOR_CONTENT_PADDING,
  EditorContentSkeleton,
  EditorLoadErrorView
} from "../editor/editor-pane-states";

interface VersionDocument {
  document: EditorDocument;
}
interface VersionPreviewPaneProps {
  currentDocument(): EditorDocument | undefined;
  currentError(): boolean;
  currentUnavailableDescription: string;
  mode?: EditorMode;
  staticTitle?: string;
  version(): VersionDocument | undefined;
  versionError(): boolean;
  versionUnavailableDescription: string;
}
interface VersionPreviewContentProps extends VersionPreviewPaneProps {
  wide: boolean;
}
type EditorDocument = NonNullable<EditorProps["content"]>;

const DIFF_CONTENT_PADDING = "px-4 pb-5 pt-5 md:px-12 md:pb-10 md:pt-9";
const SIDE_BY_SIDE_CONTENT_PADDING = "px-4 pb-5 pt-12 md:px-12 md:pb-10 md:pt-9";
const SIDE_BY_SIDE_MIN_WIDTH = 1280;

const VersionPreviewSkeleton: Component = () => {
  return (
    <div class="relative h-full w-full overflow-hidden">
      <EditorContentSkeleton class={EDITOR_CONTENT_PADDING} />
    </div>
  );
};
const VersionPreviewContent: Component<VersionPreviewContentProps> = (props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [previousScrollContainer, setPreviousScrollContainer] = createSignal<HTMLElement | null>(
    null
  );
  const [currentScrollContainer, setCurrentScrollContainer] = createSignal<HTMLElement | null>(
    null
  );
  const comparing = () => searchParams.compare === "current";
  const inlineComparison = () => !props.wide || searchParams.compareView === "inline";
  const close = () => {
    setSearchParams({ version: undefined, compare: undefined, compareView: undefined });
  };
  const stopComparing = () => {
    setSearchParams({ compare: undefined, compareView: undefined });
  };

  createEffect(() => {
    const previousContainer = previousScrollContainer();
    const currentContainer = currentScrollContainer();

    let synchronizing = false;
    let synchronizationFrame: number | undefined;

    if (!previousContainer || !currentContainer) return;

    const synchronize = (source: HTMLElement, target: HTMLElement) => {
      const sourceRange = source.scrollHeight - source.clientHeight;
      const targetRange = target.scrollHeight - target.clientHeight;
      const targetScrollTop = sourceRange > 0 ? (source.scrollTop / sourceRange) * targetRange : 0;

      if (synchronizing || Math.abs(target.scrollTop - targetScrollTop) < 1) return;

      synchronizing = true;
      target.scrollTop = targetScrollTop;
      synchronizationFrame = requestAnimationFrame(() => {
        synchronizing = false;
      });
    };
    const synchronizePrevious = () => synchronize(previousContainer, currentContainer);
    const synchronizeCurrent = () => synchronize(currentContainer, previousContainer);

    synchronizePrevious();
    previousContainer.addEventListener("scroll", synchronizePrevious, { passive: true });
    currentContainer.addEventListener("scroll", synchronizeCurrent, { passive: true });
    onCleanup(() => {
      previousContainer.removeEventListener("scroll", synchronizePrevious);
      currentContainer.removeEventListener("scroll", synchronizeCurrent);

      if (synchronizationFrame !== undefined) cancelAnimationFrame(synchronizationFrame);
    });
  });

  return (
    <Show
      when={!props.versionError() ? props.version() : undefined}
      keyed
      fallback={
        <EditorLoadErrorView
          title="Version unavailable"
          description={props.versionUnavailableDescription}
          actionIcon="i-lucide:arrow-left"
          actionLabel="Return to current"
          onAction={close}
        />
      }
    >
      {(selectedVersion) => (
        <Show
          when={comparing()}
          fallback={
            <div class="h-full w-full overflow-hidden">
              <Editor
                class={EDITOR_CONTENT_PADDING}
                content={selectedVersion.document}
                editable={false}
                mode={props.mode}
                staticTitle={props.staticTitle}
              />
            </div>
          }
        >
          <Show
            when={!props.currentError() ? props.currentDocument() : undefined}
            keyed
            fallback={
              <EditorLoadErrorView
                title="Comparison unavailable"
                description={props.currentUnavailableDescription}
                actionIcon="i-lucide:arrow-left"
                actionLabel="Show version"
                onAction={stopComparing}
              />
            }
          >
            {(currentDocument) => {
              const comparison = createMemo(() => {
                return createVersionComparison(selectedVersion.document, currentDocument);
              });

              return (
                <Show
                  when={inlineComparison()}
                  fallback={
                    <div class="flex h-full min-h-0 w-full">
                      <div class="relative min-h-0 flex-1 overflow-hidden px-1">
                        <Editor
                          class={SIDE_BY_SIDE_CONTENT_PADDING}
                          content={comparison().previous.content}
                          diff={{ changes: comparison().previous.changes }}
                          editable={false}
                          mode={props.mode}
                          staticTitle={props.staticTitle}
                          onScrollContainer={setPreviousScrollContainer}
                        />
                      </div>
                      <div class="h-full w-px shrink-0 bg-gradient-to-b from-gray-200/0 via-gray-200 to-gray-200/0" />
                      <div class="relative min-h-0 flex-1 overflow-hidden px-1">
                        <Editor
                          class={SIDE_BY_SIDE_CONTENT_PADDING}
                          content={comparison().current.content}
                          diff={{ changes: comparison().current.changes }}
                          editable={false}
                          mode={props.mode}
                          staticTitle={props.staticTitle}
                          onScrollContainer={setCurrentScrollContainer}
                        />
                      </div>
                    </div>
                  }
                >
                  <div class="h-full w-full overflow-hidden">
                    <Editor
                      class={DIFF_CONTENT_PADDING}
                      content={comparison().inline.content}
                      diff={{ changes: comparison().inline.changes }}
                      editable={false}
                      mode={props.mode}
                      staticTitle={props.staticTitle}
                    />
                  </div>
                </Show>
              );
            }}
          </Show>
        </Show>
      )}
    </Show>
  );
};
const VersionPreviewPane: Component<VersionPreviewPaneProps> = (props) => {
  const [container, setContainer] = createRef<HTMLElement | null>(null);
  const [wide, setWide] = createSignal(false);

  createEffect(() => {
    const currentContainer = container();

    if (!currentContainer || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setWide((entry?.contentRect.width ?? 0) >= SIDE_BY_SIDE_MIN_WIDTH);
    });

    observer.observe(currentContainer);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div ref={setContainer} class="relative min-h-0 w-full flex-1 overflow-hidden">
      <Suspense fallback={<VersionPreviewSkeleton />}>
        <VersionPreviewContent {...props} wide={wide()} />
      </Suspense>
    </div>
  );
};

export { VersionPreviewPane };
