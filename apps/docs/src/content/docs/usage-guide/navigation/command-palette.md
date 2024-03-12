---
slug: "/usage-guide/navigation/command-palette"
title: "Command Palette"
---

The **Command Palette** allows you to quickly navigate through Vrite and search through your content base.

![Vrite Command Palette](https://assets.vrite.io/65017ed7b0e627e259623b8a/u12t9cCP72YVRG_e7hzBF.png)

To open the command palette, use the _Search_ button in the dashboard’s toolbar or a keyboard shortcut (`⌘K` on macOS, `Ctrl K` on Windows/Linux) anywhere in Vrite.

The command palette has 3 modes available:

- _Search_ — the default mode; allows you to perform semantic search throughout your content base;
- _Ask_ — provides AI question-answering, based on your content base;
- _Command_ — enables quick navigation and actions within the current view;

## Search Mode

![Vrite command palette - search mode](https://assets.vrite.io/65256a9ef6d09e66c21a447d/mhPVwoUVf-WSwiHykcC5w.png)

Search is the default mode in Vrite’s command palette. Here you can search through your entire content base. Simply start typing, for the results to appear.

Vrite implements hybrid search (combination of vector and keyword search) using [Weaviate](https://weaviate.io/) — an open-source, vector database.

To extract the most semantic meaning from the content (and to provide the best search results), the content is indexed primarly by headings. This means that the better you structure your content the more accurate the search results will be. This is especially important if you want to implement Vrite’s search (via the API) on your front end, for e.g. documentation or a blog.

## Ask Mode

The “Ask” (question-answering mode) builds on semantic search to provide AI-generated answers for questions regarding your content.

![Vrite command palette - ask mode](https://assets.vrite.io/65256a9ef6d09e66c21a447d/2vIUOV5n_POcN3Onwhitm.png)

You can switch to the mode via the _Ask_ toggle on the right side of the input field. Type in your question and hit `Enter` to start generating the answer. When done, you can navigate back to search mode by clicking the _Ask_ toggle again.

Keep in mind that AI-generated answers may not always be accurate. That’s especially important if you want to expose AI question-answering to your own users via Vrite API.

## Command Mode

The command mode can be used to perform quick actions that are available in the current view, and navigate around Vrite’s UI.

![Vrite command palette - command mode](https://assets.vrite.io/65017ed7b0e627e259623b8a/u12t9cCP72YVRG_e7hzBF.png)

To switch to the command mode, use the _Command_ toggle in the bottom-right corner of the palette, or type `>` in an empty field when in search mode.

To switch back to search mode, use the _Command_ toggle or type `Backspace` in an empty field.

### Subcommands

The command palette supports nested “subcommands”. An example of that is the _Select Variant_ command (also accessible from Vrite’s bottom menu) which allows you to select an active _variant_.

![Vrite command palette - Select Variant subcommands](https://assets.vrite.io/65017ed7b0e627e259623b8a/f8Kwif104EWuw0n6Ek3Ye.png)

You can exit from a subcommand using the `Backspace` key in empty field.