const EDITOR_MENU_Z_INDEX = {
  dragHandle: 10,
  blockMenu: 20,
  slashMenu: 30,
  bubbleMenu: 40
} as const;
const BLOCK_CONTROL_SIZE = 30;
const BLOCK_CONTROL_VIRTUAL_MARGIN_REM = 10;
const BLOCK_CONTROL_PROXIMITY_RATIO = 0.3;
const LIST_ITEM_TYPES = new Set(["listItem", "taskItem"]);
const STRUCTURE_NODE_TYPES = new Set(["fragment", "property"]);
const EMPTY_BOX_SELECTION = {
  active: false,
  currentX: 0,
  currentY: 0,
  height: 0,
  width: 0,
  x: 0,
  y: 0
};
const MARQUEE_MARGIN = 16;
const MARQUEE_ACTIVATION_THRESHOLD = 10;

export {
  EDITOR_MENU_Z_INDEX,
  BLOCK_CONTROL_SIZE,
  BLOCK_CONTROL_VIRTUAL_MARGIN_REM,
  BLOCK_CONTROL_PROXIMITY_RATIO,
  LIST_ITEM_TYPES,
  STRUCTURE_NODE_TYPES,
  EMPTY_BOX_SELECTION,
  MARQUEE_MARGIN,
  MARQUEE_ACTIVATION_THRESHOLD
};
