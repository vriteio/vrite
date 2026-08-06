const EDITOR_MENU_Z_INDEX = {
  dragHandle: 10,
  blockMenu: 20,
  slashMenu: 30,
  bubbleMenu: 40
} as const;
const BLOCK_CONTROL_SIZE = 28;
const BLOCK_CONTROL_VIRTUAL_MARGIN_REM = 10;
const LIST_ITEM_TYPES = new Set(["listItem", "taskItem"]);

export {
  EDITOR_MENU_Z_INDEX,
  BLOCK_CONTROL_SIZE,
  BLOCK_CONTROL_VIRTUAL_MARGIN_REM,
  LIST_ITEM_TYPES
};
