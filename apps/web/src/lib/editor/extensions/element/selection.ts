import { Node, ResolvedPos } from "@tiptap/pm/model";
import { NodeSelection, Selection } from "@tiptap/pm/state";
import { Mappable } from "@tiptap/pm/transform";

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

  public map(doc: Node, mapping: Mappable): Selection {
    const mapped = super.map(doc, mapping);

    try {
      return ElementSelection.create(doc, mapped.from, this[elementSelectionActive]);
    } catch (e) {
      return super.map(doc, mapping);
    }
  }

  public eq(other: Selection): boolean {
    return (
      super.eq(other) &&
      other instanceof ElementSelection &&
      this[elementSelectionActive] === other[elementSelectionActive]
    );
  }
}

const isElementSelection = (selection: Selection): selection is ElementSelection => {
  return elementSelectionActive in selection;
};
const isElementSelectionActive = (selection: ElementSelection): boolean => {
  return selection[elementSelectionActive];
};

export { ElementSelection, isElementSelection, isElementSelectionActive };
