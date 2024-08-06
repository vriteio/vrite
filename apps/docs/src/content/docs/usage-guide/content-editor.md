---
slug: "usage-guide/content-editor"
title: "Writing in Vrite Editor"
---

The content editor is the core part of Vrite — this is where you can create your next technical masterpiece. And, thanks to all the features, formatting options, and content blocks Vrite supports - it should be a breeze!

## Editing Menus

Editing menus are one of the most important parts of the Vrite editing experience. Implementing modern design and UX found in other state-of-the-art WYSIWYG editors, Vrite provides you with a set of easily-accessible menus that are right there when you need them.

### Bubble Menu

![Bubble menu in Vrite editor](https://assets.vrite.io/65256a9ef6d09e66c21a447d/g0ZLlh2KKmSzNEiZNYfXm.png?w=1000)

Select some text for the bubble menu to appear. It's meant for inline formatting, inserting links, and comments.

### Block Menu

![Block menu in Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/TfxcygyBCv25jW0r0UsD8.png?w=1000)

Used for inserting block content, like lists, headings, images, or code blocks. Can be triggered at the beginning of any new paragraph by typing `/` or clicking a button on the left of the paragraph. You can **filter the list** by typing queries right after the `/`, and move between items with **arrow keys**.

### Link Menu

![](https://assets.vrite.io/65256a9ef6d09e66c21a447d/XgIE6BkCoWd3FK-u4d2KU.png?w=1000)

Move the cursor into a linked text fragment to display a preview of the linked content.

## Inline formatting options

The following inline formatting options are supported in the Vrite editor (on the side — where applicable — their respective Markdown and keyboard shortcuts):

- **Bold** — `**markdown**` — `Ctrl B`/`⌘B`;
- **Italic** — `*markdown*` — `Ctrl I`/`⌘I`;
- **Strikethrough** — `~~markdown~~` — `Ctrl Shift X`/`⌘ Shift X`;
- **Inline code** — `markdown` — `Ctrl E`/`⌘E`;
- **Highlight** — `==markdown==` — `Ctrl Shift H`/`⌘ Shift H`;
- **Superscript** — `Ctrl ,`/`⌘,`;
- **Subscript** — `Ctrl .`/`⌘.`;
- **Link** — `[markdown](link)` — you can also `Ctrl V`/`⌘V` the URL to link the selected text fragment;

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

When inside a list, you can use `Tab` to inset a list (from 2nd item up) and `Shift Tab` to move out.

### Element

![Vrite content editor - element block](https://assets.vrite.io/65256a9ef6d09e66c21a447d/gNilK5WKjI9-lsk7FqtYR.png?w=1000)

Lets you insert custom markup right into content using JSX/XML-like syntax. The elements can be self-closing (opening tag ending with `/>`) or contain content (opening tag ending with `>`).

All attributes/props are transformed into structured JSON content.

### Image

![Vrite content editor - image block](https://assets.vrite.io/65256a9ef6d09e66c21a447d/8Dyvp53XvKde4o8wMzmoB.png?w=1000)

Lets you insert an image, either by uploading it directly to Vrite or referencing it through a URL. You can also set an alt text, by switching to _Alt_ input. For larger images, you can resize the preview to take up less space by dragging the bottom-right handle.

### Embed

![Vrite content editor - embed block](https://assets.vrite.io/65256a9ef6d09e66c21a447d/o-RukHa_MXmBa-yGkUbPI.png?w=1000)

Lets you embed content from supported platforms. You can provide any link or ID and Vrite will generate a proper preview. Supported embeds are:

- **CodePen**
- **CodeSandbox**
- **YouTube**

### Table

![Table in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/CThF1-P0HI4iWTIWlvQ0s.png)

Lets you include and edit tabular data in your content. When you move your cursor inside the table, a special menu will appear on the bottom, with the following options (from left to right):

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

### Code block

![Vrite content editor - code block](https://assets.vrite.io/65256a9ef6d09e66c21a447d/SR1f0Nh3uhnifDOEUMAIY.png?w=1000)

A full-featured VS-Code-like [Monaco editor](https://microsoft.github.io/monaco-editor/) for editing your code snippets. It supports syntax highlighting for the vast majority of popular languages and full autocomplete for some, like JavaScript/TypeScript, CSS, and HTML.

You can select the code language using the input with autocomplete menu and, whenever possible, format the code using the built-in [Prettier integration](https://prettier.io/).

You can also assign additional metadata to the snippet, like title (by switching to the _Title_ input) and other metadata in the _Language_ input, separated by `Space` from the language indentifier.

## Editor Toolbar

![Vrite editor toolbar](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Nm-ODaVo67yulTH5BhpQx.png)

In addition to all the features available from the main editing view, the Vrite editor also has a toolbar with a few more options:

- _Content Stats_ — opens a dropdown with detailed statistics about your content, like the number of words or Lines of Code (LOCs) written;
- _Export_ — allows you to “Export” the content to the underlying structured JSON format, HTML, or GitHub-Flavored Markdown (GFM) for easy download or copy-paste; Fragments of content that aren’t supported by the given format will be omitted.
- _Zen mode_ — allows you to focus solely on your content, hiding all the distractions and centering the content editor; You can easily go back by clicking the button in the top-right corner or using `Esc` key;

The _Export_ functions opens a modal presenting the output and options to _Download_ or _Copy_ it easily:

![Vrite content editor - export modal](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Ti3gDzFHWvSRgu0X4UgS7.png)

## Real-Time Collaboration

Vrite supports real-time collaboration, displaying not only the team members currently viewing/editing the piece, but also their current selection. In case of uncertainty, you can hover right over the cursor or the badge in the toolbar to view the username.

![Real-time collaboration in Vrite editor](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/RaOXP4MkcZZpEWJHQ3cAd.png)

### Commenting

You can use comment threads to discuss specific pieces of content right within the editor. To do so, select a piece of text and choose _Comment_ from the bubble menu. You’ll see the thread and all of related comments on the right side of your content, while your cursor is within the commented fragment.

In comments, you can use all inline formatting options that are also available in the editor, through Markdown and keyboard shortcuts. Once the discussion is done, you can mark the comment thread as _Resolved_ using the button in the top-right corner.

![Vrite content editor - comment thread](https://assets.vrite.io/65256a9ef6d09e66c21a447d/zNsilpN7A87SmG7WpAyqz.png)

## Block Actions

Block Actions are special actions provided by Vrite Extensions for various top-level blocks, like images, embeds, or paragraphs, that can process and change the content of the given block. A good example of this is the **GPT-3.5** extension, which can insert new content, generated by OpenAI’s LLM or entirely edit the given paragraph.

![GPT-3.5 extension's block action](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/ytq0welaqPIu7XkycI0cv.png)

You can read more about Vrite Extensions [here](/usage-guide/vrite-extensions/).
