import { ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, Selection } from "@tiptap/pm/state";

const elementSelectionActive = Symbol("elementSelectionActive");

class ElementSelection extends NodeSelection {
  public [elementSelectionActive] = false;

  public constructor($from: ResolvedPos, active?: boolean) {
    super($from);
    this[elementSelectionActive] = active || false;
  }

  public static create(doc: any, from: number, active?: boolean): ElementSelection {
    return new ElementSelection(doc.resolve(from), active);
  }
}

const isElementSelection = (selection: Selection): selection is ElementSelection => {
  return elementSelectionActive in selection;
};
const isElementSelectionActive = (selection: ElementSelection): boolean => {
  return selection[elementSelectionActive];
};

export { ElementSelection, isElementSelection, isElementSelectionActive };
