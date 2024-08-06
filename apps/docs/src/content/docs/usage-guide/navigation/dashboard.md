---
slug: "usage-guide/navigation/dashboard"
title: "Dashboard"
---

Vrite dashboard is intended to allow for easy, but comprehensive content management right beside your content.

## Content Group Management

The Vrite dashboard provides both a _Kanban_ and a _Table_ view, which you can easily switch between using the dropdown from the toolbar at the top.

Both views allow you to select content pieces, choose what content group they’re assigned to, and manage the content groups themselves.

## Kanban View

A Kanban is great when working in a team or managing content production for a technical publication. It allows you to categorize and clearly visualize the current stage of the given piece.

![Vrite dashboard - Kanban](https://assets.vrite.io/65017ed7b0e627e259623b8a/MqLUXNpfwJaaWeylrBuM4.png)

The Kanban cards and columns map one-to-one with Vrite’s content pieces and content groups.

The Kanban can be managed primarly via **drag and drop** mechanism. You can d&d:

- content pieces within a group to order them;
- content pieces them between different groups to move them;
- content groups themselves, to rearrange them (make sure to “grab” a group by its padding, rather than the folder icon or content piece card);

Use the _New content piece_ button at the bottom of a column to create a new content piece inside it. For new content groups, use the _New group_ button at the very end of the Kanban.

### Content Group Menu

![Vrite dashboard - Kanban (menu)](https://assets.vrite.io/65017ed7b0e627e259623b8a/2O1sE-dr8dGxWX0tBGwj-.png)

Every content group has an input field to name it and a **dropdown menu**. From this menu, you can:

- _Copy ID_ - copies content group's ID into the clipboard; Useful when working with the Vrite API, JavaScript SDK and when configuring certain Vrite settings;
- _Delete_ - deletes the content group together with all the nested content groups and all content pieces assigned to them.

### Content Piece Card

In Kanban, every content piece is represented as a card that displays a summary of its metadata, including the _date_, _title_, _description_, assigned _tags_, and _members_.

You can click anywhere on a card to select it and open it in a Content Piece side panel. To select the piece and immediately move to the editor, use the _Open in editor_ button.

## Table View

The table view is especially useful when you want to get a broad overview of all the content and its metadata.

![Vrite dashboard - Table](https://assets.vrite.io/65017ed7b0e627e259623b8a/2E4zIqxVADGaLqF1ks_sy.png)

In the table view, you can select which metadata is visible, and in what order using the options in the table header. You can:

- Hide specific columns using _Hide column_ button from the column menu;
- Rearrange the columns by d&d the headers;
- Show/hide any of the available columns using the _+_ menu at the end of the header;

![Selecting columns visible in the view](https://assets.vrite.io/65017ed7b0e627e259623b8a/X4HfTMI95EzcElJP188BK.png)

### Content Group Menu

![Content group menu in the table view](https://assets.vrite.io/65017ed7b0e627e259623b8a/htx15N237JhLgqJnMrFV3.png)

Similarly to the Kanban view, each content group in the Table view can be easily renamed and has its own dropdown menu. From the menu, you can:

- _Copy ID_ — copy the ID of the content group;
- _New content piece_ - create a new content piece inside the content group;
- _Delete_
