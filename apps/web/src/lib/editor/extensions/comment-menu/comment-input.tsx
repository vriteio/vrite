import { mdiAppleKeyboardCommand, mdiSendOutline } from "@mdi/js";
import { Icon, IconButton, Tooltip } from "@vrite/components";
import { createRef } from "@vrite/components/src/ref";
import clsx from "clsx";
import { Component, createSignal } from "solid-js";
import { Extension } from "@tiptap/core";
import { App, useAuthenticatedUserData, useClient } from "#context";
import { MiniEditor } from "#components/fragments";
import { isAppleDevice } from "#lib/utils";

type ThreadData = Omit<App.CommentThread, "comments"> & {
  firstComment: (Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }) | null;
};

const CommentInput: Component<{
  thread: ThreadData | null;
}> = (props) => {
  const [currentContent, setCurrentContent] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const { membership } = useAuthenticatedUserData();
  const client = useClient();
  const [clearCommentEditorRef, setClearCommentEditorRef] = createRef<() => void>(() => {});
  const sendComment = async (): Promise<void> => {
    setSending(true);

    const memberId = membership()?.id;

    if (!props.thread || !memberId) return;

    await client.comments.createComment.mutate({
      content: currentContent(),
      fragment: props.thread.fragment,
      memberId
    });
    setCurrentContent("");
    clearCommentEditorRef()();
    setSending(false);
  };

  return (
    <>
      <div class={clsx("relative", props.thread?.resolved && "hidden")}>
        <MiniEditor
          class="flex-1 min-h-24 prose !text-base border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-3 pt-2 pb-12 border-2 rounded-2xl"
          placeholder="Write here..."
          initialValue=""
          inline
          extensions={[
            Extension.create({
              addKeyboardShortcuts() {
                return {
                  "Mod-Enter": () => {
                    if (!currentContent() || currentContent() === "<p></p>") return false;

                    sendComment();

                    return true;
                  }
                };
              }
            })
          ]}
          onUpdate={(editor) => {
            setCurrentContent(editor.getHTML());
            setClearCommentEditorRef(() => editor.commands.clearContent());
          }}
        />

        <Tooltip text="Send" fixed class="mt-1" wrapperClass="absolute bottom-3 right-3">
          <IconButton
            class="m-0"
            color="primary"
            variant="text"
            path={mdiSendOutline}
            loading={sending()}
            disabled={!currentContent() || currentContent() === "<p></p>"}
            onClick={sendComment}
            text="base"
          />
        </Tooltip>
      </div>
      <div class="flex justify-end items-center text-xs px-2 gap-1">
        <kbd class="bg-gray-200 dark:bg-gray-900 text-gray-500 dark:text-gray-400 flex justify-center items-center rounded-md px-1 h-4">
          {isAppleDevice() ? <Icon path={mdiAppleKeyboardCommand} class="h-3 w-3" /> : "Ctrl "}{" "}
          Enter
        </kbd>
        <span>to send</span>
      </div>
    </>
  );
};

export { CommentInput };
