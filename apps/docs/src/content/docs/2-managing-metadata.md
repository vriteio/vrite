---
title: Managing Content Piece Metadata
category: Usage Guide
slug: metadata
---

After the actual content, **metadata** is probably some of the most important information you have to manage in your CMS. In Vrite, metadata — part of a content piece — can be managed from the **metadata side panel**.

## Metadata Side Panel

![Metadata side panel in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/rm3ykmGAq1nIm__g8Ixdu.png)

Vrite has built-in support for all kinds of metadata that you can configure from the side panel, including:

- **Title** — the title of the content piece;
- **Canonical link** — in case of cross-posting, it can contain the canonical link to the original publication of the content;
- **Date** — can inform the writing due date, content publication date, etc.
- **Tags** — add various tags to the article to better categorize it for content management and later, when publishing;
- **Description** — description of the article with support for basic inline formatting options through the same Markdown and keyboard shortcuts as supported in the editor;
- **Cover** — details on the content piece's cover image; Supports the same options as an image block in the editor, including setting alt description, source URL and option to upload a custom image;

On top of that, the panel also provides actions like _Open in editor_ or _Delete_ content piece (hidden in the dropdown menu)

## Tags

Tags are a special kind of metadata that allows you to further categorize and differenciate different content pieces. They can allow for easier visual filtering in the Dashboard and more versitile access through the API to build e.g. custom content lists.

![Creating tags in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/YGMTNepjhgN_iQTd6vY3U.png)

In Vrite you can assign existing tags to the content piece by using the _Add tag_ dropdown menu, searching for desired tags and adding them by clicking. In the dropdown, you can also use the _Create tag_ button or the editing button next to an existing tag — to create or edit a tag, customizing its label and color.

## Custom JSON Data

While Vrite supports all kinds of metadata out-of-the-box and aims to expand it in the future, it’s highly likely that you’ll need to store some custom data alongside the content piece, for your use-case.

For this occasion, Vrite supports adding custom JSON data inside the _Custom data_ section.

Currently, the metadata side panel contains two sections that you can switch between using a dropdown menu:

- **Details** — for customizing general metadata;
- **Custom data** — for adding **custom JSON data** to the content piece;

![Custom data section](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/nchv3aL6q1gwIXTy9jA2C.png)

Inside the Custom data section, you’ll be able to edit and then save the data using a built-in editor. You can later access and also update this data through the API.
