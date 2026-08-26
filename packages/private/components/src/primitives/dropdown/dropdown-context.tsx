import type { Card } from "../card";
import {
  type Accessor,
  type ComponentProps,
  createContext,
  createSignal,
  type ParentComponent,
  type Setter,
  useContext
} from "solid-js";

interface MobileDropdownStackEntry {
  id: symbol;
  close(): void;
  closeImmediately(): void;
  getCardProps(): Partial<ComponentProps<typeof Card>> | undefined;
  getClosing(): boolean;
  getDragFromContent(): boolean;
  getNavigationBackAvailable(): boolean;
  getNavigationTitle(): string | undefined;
  getTitle(): string | undefined;
  onNavigationBack(): void;
}

interface DropdownContextValue {
  activeMobileDropdown: Accessor<MobileDropdownStackEntry | undefined>;
  closeMobileDropdowns(): void;
  finishClosingMobileDropdowns(): void;
  mobileDropdownContentContainer: Accessor<HTMLElement | null>;
  mobileDropdownExpanded: Accessor<boolean>;
  mobileDropdownStack: Accessor<Array<MobileDropdownStackEntry>>;
  navigateMobileDropdownBack(): void;
  removeMobileDropdown(id: symbol): void;
  setMobileDropdownContentContainer: Setter<HTMLElement | null>;
  setMobileDropdownExpanded: Setter<boolean>;
  setMobileDropdownStack: Setter<Array<MobileDropdownStackEntry>>;
}
interface DropdownControls {
  closeMobileDropdowns(): void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);
const DropdownProvider: ParentComponent = (props) => {
  const [mobileDropdownStack, setMobileDropdownStack] = createSignal<
    Array<MobileDropdownStackEntry>
  >([]);
  const [mobileDropdownExpanded, setMobileDropdownExpanded] = createSignal(false);
  const [mobileDropdownContentContainer, setMobileDropdownContentContainer] =
    createSignal<HTMLElement | null>(null);
  const activeMobileDropdown = () => {
    const stack = mobileDropdownStack();

    return stack[stack.length - 1];
  };
  const removeMobileDropdown = (id: symbol) => {
    const nextStack = mobileDropdownStack().filter((entry) => entry.id !== id);

    setMobileDropdownStack(nextStack);
    if (nextStack.length === 0) {
      setMobileDropdownContentContainer(null);
      setMobileDropdownExpanded(false);
    }
  };
  const closeMobileDropdowns = () => {
    mobileDropdownStack().forEach((entry) => entry.close());
  };
  const finishClosingMobileDropdowns = () => {
    mobileDropdownStack().forEach((entry) => {
      if (entry.getClosing()) entry.closeImmediately();
    });
  };
  const navigateMobileDropdownBack = () => {
    const activeEntry = activeMobileDropdown();

    if (activeEntry?.getNavigationBackAvailable()) {
      activeEntry.onNavigationBack();
    } else {
      activeEntry?.closeImmediately();
    }
  };

  return (
    <DropdownContext.Provider
      value={{
        activeMobileDropdown,
        closeMobileDropdowns,
        finishClosingMobileDropdowns,
        mobileDropdownContentContainer,
        mobileDropdownExpanded,
        mobileDropdownStack,
        navigateMobileDropdownBack,
        removeMobileDropdown,
        setMobileDropdownContentContainer,
        setMobileDropdownExpanded,
        setMobileDropdownStack
      }}
    >
      {props.children}
    </DropdownContext.Provider>
  );
};
const useDropdownContext = () => useContext(DropdownContext)!;
const useDropdown = (): DropdownControls => {
  const { closeMobileDropdowns } = useDropdownContext();

  return { closeMobileDropdowns };
};

export { DropdownProvider, useDropdown, useDropdownContext };
