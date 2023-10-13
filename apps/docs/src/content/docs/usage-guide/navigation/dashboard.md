---
slug: "/usage-guide/navigation/dashboard"
title: "Dashboard"
---

Vrite dashboard is intended to allow for easy, but comprehensive content management right beside your content.

## Content Group Management

The Vrite dashboard provides both a _Kanban_ and a _List_ view, which you can easily switch between using the dropdown from the toolbar at the top.

Both views allow you to select content pieces, choose what content group they’re assigned to, and manage the content groups themselves.

### Content Group Nesting

Content groups can be nested, which allows you to e.g. have multiple separate Kanbans in one workspace, or better reflect your preferred content structure in the list view.

![Vrite dashboard toolbar](https://assets.vrite.io/65256a9ef6d09e66c21a447d/Af7xEyy1jSe-6y6UslQXl.png?w=1000)

To navigate to a nested content group, **click the folder icon**. Once you’re at least 1 level deep, a _Breadcrumb_ menu will appear in the toolbar, allowing you to quickly navigate multiple levels up.

To nest content groups, **drag and drop the folder icon**, onto another one — either one visible in the dashboard or one in the breadcrumb.

### Content Group Menu

Every content group has an input field to name it and a **dropdown menu**. From this menu, you can:

- _Copy ID_ - copies content group's ID into the clipboard; Useful when working with the Vrite API and JS SDK;
- _Lock_ - locks the content group, preventing editing of its name and directly assigned content pieces;
- _Delete_ - deletes the content group together with all the nested content groups and all content pieces assigned to them.

### Lock Mode

Lock mode is especially useful for important content groups that should have limited editing options, like those meant for publishing or outside access via the API.

When locked, the content group itself can’t be deleted, and no content pieces can be created directly inside it - both from the dashboard and from the API. The content pieces that are assigned to the content group directly are also locked, preventing any edits to their content or metadata.

The only action you can do is either unlock the group or move content pieces out of it - either through drag and drop or through an API call.

## Kanban View

A Kanban is great when working in a team or managing content production for a technical publication. It allows you to categorize and clearly visualize the current stage of the given piece.

The Kanban cards and columns map one-to-one with Vrite’s content pieces and content groups.

![Vrite dashboard - kanban view](https://assets.vrite.io/65256a9ef6d09e66c21a447d/X5UT5iaWR37TCiQ9RmwpA.png?w=1000)

The Kanban can be managed primarly via **drag and drop** mechanism. You can d&d:

- content pieces within a group to order them;
- content pieces them between different groups to move them;
- content groups themselves, to rearrange them (make sure to “grab” a group by its padding, rather than the folder icon or content piece card);

Use the _New content piece_ button at the bottom of a column to create a new content piece inside it. For new content groups, use the _New group_ button at the very end of the Kanban.

### Content Piece Card

In Kanban, every content piece is represented as a card that displays a summary of its metadata, including the _date_, _title_, _description_, assigned _tags_, and _members_.

You can click anywhere on a card to select it and open it in a Content Piece side panel. To select the piece and immediately move to the editor, use the _Open in editor_ button.

## List View

The list view is especially useful when working with deeply nested content groups, or using Git sync to synchronize and edit documentation from your repo.

![Vrite dashboard - list view](https://assets.vrite.io/65256a9ef6d09e66c21a447d/xpPquKehFjhiJGxmT2bt1.png?w=1000)

In the list view, you can navigate and manage nested content groups, similar to a Kanban view. Unlike in Kanban, you can’t reorder groups or pieces, but you can d&d:

- content pieces to the parent (displayed as `..`) and directly nested content groups;
- content groups out of parent or into a sibling group;