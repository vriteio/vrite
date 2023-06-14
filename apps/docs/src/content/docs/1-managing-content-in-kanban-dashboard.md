---
title: Managing Content in Kanban Dashboard
category: Usage Guide
slug: kanban-dashboard
---

Managing content using traditional CMS tools is hard. Basic lists or tables just don’t cut it. It's especially difficult when working in teams or depending on a complex content production pipeline. You end up using many different tools, switching and copy-pasting between them, experiencing degraded UX, and losing time.

That's why Vrite approaches content management differently — by implementing a **Kanban dashboard** many developers and project managers are familiar with and enjoy using.

## Kanban Dashboard

![Kanban dashboard in Vrite](https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/b_cu5suIie43VuHUMIuUM.png)

The Kanban cards and columns map one-to-one with Vrite’s content pieces and content groups, allowing to both organize the content and easily access it later via the API.

You can **drag and drop** content pieces within a group to order them or move them between different groups. You can also do the same with the content groups themselves, to rearrange them.

## Content Piece Card

Every content piece card displays a summary of its metadata, like the date, title, description, or a few of the assigned tags.

Additionally, it has an _Open in editor_ button, which opens the content piece and navigates to the editor directly; It's **highlighted** when the content piece is currently opened.

## Content Group Menu

Every content group column has an input field to name it, and a **dropdown menu**. From this menu, you can:

- _Copy ID_ - copies content group's ID into the clipboard; Useful when working with the Vrite API and JS SDK;
- _Lock_ - locks the content group, preventing editing of it or its content pieces;
- _Delete_ - deletes the content group together with all the content pieces assigned to it.

### Lock Mode

Lock mode is especially useful for important content groups, like those meant for publishing or outside access via the API. It ensures the integrity of the content production process, as every content piece has to be first moved to a different content group (i.e. to _Editing_ from _Published_) to be edited. It also helps when integrating with Vrite via the API or Webhooks, ensuring no unnecessary events are triggered when e.g. trying to edit an already _Published_ piece.

When locked, the content group itself can’t be deleted, and no content pieces can be created directly inside it - both from the dashboard and from the API. The content pieces that are assigned to the content group are also locked, preventing any edits to their content or metadata.

The only action you can do is change the content piece’s assigned content group - either through drag and drop or through an API call.
