import { Accessor, createContext, createSignal, ParentComponent, useContext } from "solid-js";

interface SettingsContextValue {
  verificationDialogOpened: Accessor<boolean>;
  closeVerificationDialog(): void;
  openVerificationDialog(onVerified: () => void): void;
  onVerified(): void;
}

const SettingsContext = createContext<SettingsContextValue>();

const SettingsProvider: ParentComponent = (props) => {
  const [verificationDialogOpened, setVerificationDialogOpened] = createSignal(false);
  const [verificationCallback, setVerificationCallback] = createSignal<(() => void) | null>(null);
  const closeVerificationDialog = () => {
    setVerificationDialogOpened(false);
    setVerificationCallback(null);
  };
  const openVerificationDialog = (onVerified: () => void) => {
    setVerificationCallback(() => onVerified);
    setVerificationDialogOpened(true);
  };
  const onVerified = () => {
    const callback = verificationCallback();

    closeVerificationDialog();
    callback?.();
  };

  return (
    <SettingsContext.Provider
      value={{
        verificationDialogOpened,
        closeVerificationDialog,
        openVerificationDialog,
        onVerified
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  );
};

const useSettings = () => {
  return useContext(SettingsContext)!;
};

export { SettingsProvider, useSettings };
