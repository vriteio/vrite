---
title: Writing in the Vrite Editor
category: Usage Guide
slug: content-editor
---

The content editor is the core part of Vrite. This is where you can create your next technical piece.

Vrite editor supports a variety of features, formatting options and content blocks.

# Features

To quickly edit the content piece's metadata, expand the metadata view using button on the left side of the title. All the metadata settings from the dashboard are the same here.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/40Pymj3ZrIEFLsKJTZ5tk.png)

Use the menu on the top of the editor to:

1. View the **content piece's stats** like number of characters, words or Lines of Code (LoCs) written;
2. **"Export" the content** to different format for easy copy-pasting or saving into a file. Supported options right now are:

- **JSON** (versatile, good for processing and adapting the content format to your needs)
- **HTML** (basic HTML format)
- **Dev.to **(Markdown formatted for the [DEV](https://dev.to/) platform, great for copy-pasting)
- **Hashnode **(Markdown formatted for the [Hashnode](https://hashnode.com/) platform, great for copy-pasting)

## Menus

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/Op7dQICGLf8LK1fb-00mF.png)

**Bubble menu** — select some text for the bubble menu to appear. It's meant for inline formatting and inserting links.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/TfxcygyBCv25jW0r0UsD8.png)

**Block menu** — used for inserting block content, like lists, headings, images or code blocks. Can be triggered at the beginning of any new paragraph by typing `/` or click a button on the left of the paragraph. You can **filter the list** by typing queries right after the `/`, and move between items with **arrow keys**.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/HKLbwDEH97l6qjyhhQaEh.png)

**Link menu** — move the cursor into a linked text fragment to display a preview of the linked content.

# Inline formatting options

Currently supported inline formatting options:

- Bold
- Italic
- Strikethrough
- Inline code
- Highlight
- Superscript
- Subscript
- Link

# Content blocks

Content blocks are large pieces of content, insertable from the block menu or with the use of Markdown shortcuts, that can't be inlined.

Basic content blocks include:

- Headings (up to 6 levels of nesting)
- Blockquotes
- Horizontal rule
- Lists - ordered, unordered, task-based (can be nested)

More special content blocks include are the following:

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/4t_retydgKtPA8YhCULYd.png)

**Image** — lets you insert an image, either by uploading it directly to Vrite or referencing it through a URL. You can also set an alt text and drag and drop the block to change its position. For larger images, you can resize the preview to take up less space.

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/0OxiNuaXHPy0sGNuJSsKq.png)

**Embed** — lets you embed content from supported platforms. You can provide any link or ID and Vrite will generate proper preview. You can also drag and drop the block to change its position. Supported embeds are:

- **CodePen**
- **CodeSandbox**
- **YouTube**

![](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/NLQ2piOpD-6jOZEtv67gT.png)

**Code block** — a full-featured VS-Code-like Monaco editor for editing your code snippets. It supports syntax highlighting for vast majority of popular languages and full autocomplete for some, like JavaScript, CSS and HTML. You can select the code language using the input with autocomplete menu and, whenever possible, format the code using Prettier config provided in the settings.
