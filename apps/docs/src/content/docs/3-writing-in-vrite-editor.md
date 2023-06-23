---
title: Writing in the Vrite Editor
category: Usage Guide
slug: content-editor
---

The content editor is the core part of Vrite — this is where you can create your next technical masterpiece. And, thanks to all the features, formatting options, and content blocks Vrite supports - it should be a breeze!

## Editing Menus

Editing menus are one of the most important parts of the Vrite editing experience. Implementing modern design and UX found in other state-of-the-art WYSIWYG editors, Vrite provides you with a set of easily-accessible menus that are right there when you need them!

### Bubble Menu

![Bubble menu in Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Op7dQICGLf8LK1fb-00mF.png)

Select some text for the bubble menu to appear. It's meant for inline formatting, inserting links, and comments.

### Block Menu

![Block menu in Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/TfxcygyBCv25jW0r0UsD8.png)

Used for inserting block content, like lists, headings, images, or code blocks. Can be triggered at the beginning of any new paragraph by typing `/` or clicking a button on the left of the paragraph. You can **filter the list** by typing queries right after the `/`, and move between items with **arrow keys**.

### Link Menu

![Link menu in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/HKLbwDEH97l6qjyhhQaEh.png)

Move the cursor into a linked text fragment to display a preview of the linked content.

## Inline formatting options

The following inline formatting options are supported in the Vrite editor (on the side — where applicable — their respective Markdown and keyboard shortcuts):

- **Bold** — `**markdown**` — `CTRL B`/`CMD B`;

- **Italic** — `*markdown*` — `CTRL I`/`CMD I`;

- **Strikethrough** — `~~markdown~~` — `CTRL SHIFT X`/`CMD SHIFT X`;

- **Inline code** — `markdown` — `CTRL E`/`CMD E`;

- **Highlight** — `==markdown==` — `CTRL SHIFT H`/`CMD SHIFT H`;

- **Superscript** — `CTRL ,`/`CMD ,`;

- **Subscript** — `CTRL .`/`CMD .`;

- **Link** — `[markdown](link)` — you can also `CTRL V`/`CMD V` the URL to link the selected text fragment;

## Content blocks

Content blocks are large pieces of content, insertable from the block menu or with the use of Markdown shortcuts, that can't be inlined.

### Basic Content Blocks

- **Headings** (up to 6 levels of nesting) — from `# markdown` to `###### markdown`;

- **Blockquotes** — `> markdown`;

- **Horizontal rule** — `--- `;

- **Nestable Lists**:

  - **Ordered** — `1. markdown`;

  - **Unordered** — `- markdown`;

  - **Task-based** — `[x]` for checked or `[ ]` for unchecked item;

### Special Content Blocks

![Vrite image block](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/4t_retydgKtPA8YhCULYd.png)

**Image** — lets you insert an image, either by uploading it directly to Vrite or referencing it through a URL. You can also set an alt text and drag and drop the block to change its position. For larger images, you can resize the preview to take up less space.

![Vrite embed block](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/0OxiNuaXHPy0sGNuJSsKq.png)

**Embed** — lets you embed content from supported platforms. You can provide any link or ID and Vrite will generate a proper preview. You can also drag and drop the block to change its position. Supported embeds are:

- **CodePen**

- **CodeSandbox**

- **YouTube**

![Table in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/CThF1-P0HI4iWTIWlvQ0s.png)

**Table** — lets you include and edit tabular data in your content. When you move your cursor inside the table, a special menu will appear on the bottom, with the following options (from left to right):

- Insert row above

- Insert row below

- Insert column left

- Insert column right

- Add/remove header

- Delete table

You can also select individual cells by either tripple-clicking them, or holding and dragging through the table. Depending on the selection, the menu can contain a subset of the following options:

- Merge cells

- Split cell

- Delete column(s)

- Delete row(s)

- Delete table

![Vrite code block](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/NLQ2piOpD-6jOZEtv67gT.png)

**Code block** — a full-featured VS-Code-like [Monaco editor](https://microsoft.github.io/monaco-editor/) for editing your code snippets. It supports syntax highlighting for the vast majority of popular languages and full autocomplete for some, like JavaScript/TypeScript, CSS, and HTML. You can select the code language using the input with autocomplete menu and, whenever possible, format the code using the built-in [Prettier integration](https://prettier.io/).

## Editor Toolbar

![Vrite editor toolbar](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Nm-ODaVo67yulTH5BhpQx.png)

In addition to all the features available from the main editing view, the Vrite editor also provides a toolbar with a few more options:

- _Content Stats_ — opens a dropdown with detailed statistics about your content, like the number of words or Lines of Code (LOCs) written;

- _Export_ — allows you to “Export” the content to the underlying JSON format, HTML, or GitHub-Flavored Markdown (GFM) for easy download or copy-paste;

- _Zen mode_ — allows you to focus solely on your content, hiding all the distractions and centering the content editor; You can easily go back by clicking the button in the top-right corner or using `ESC` key;

The _Export_ functions opens a modal presenting the output and options to _Download_ or _Copy_ it easily:

![Vrite editor export modal](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Ti3gDzFHWvSRgu0X4UgS7.png)

## Real-Time Collaboration

Vrite editor supports real-time collaboration, displaying not only the team members currently viewing/editing the piece, but also their current selection. In case of uncertainty, you can hover right over the cursor or the badge in the toolbar to view the username.

![Real-time collaboration in Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/RaOXP4MkcZZpEWJHQ3cAd.png)

### Commenting

You can use Vrite’s comments and threads to discuss specific pieces of content right within the editor. To do so, select a piece of text and choose _Comment_ from the bubble menu. You’ll see the thread and all of related comments on the right side of your content, while your cursor is within the commented fragment.

In comments, you can use all inline formatting options that are also available in the editor, through Markdown and keyboard shortcuts. Once the discussion is done, you can mark the comment thread as _Resolved_ using the button in the top-right corner.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/hi3iXvouSZUg1TYpgKhsY.png)

## Block Actions

Block Actions are special actions provided by Vrite Extensions for various top-level blocks, like images, embeds, or paragraphs, that can process and change the content of the given block. A good example of this is the **GPT-3.5** extension, which can insert new content, generated by OpenAI’s LLM or entirely edit the given paragraph.

![GPT-3.5 extension's block action](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/ytq0welaqPIu7XkycI0cv.png)

You can read more about Vrite Extensions [here](/vrite-extensions).
