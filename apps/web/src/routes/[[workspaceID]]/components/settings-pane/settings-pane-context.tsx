import { Accessor, createContext, createSignal, ParentComponent, useContext } from "solid-js";

interface SettingsPaneContextValue {
  verificationDialogOpened: Accessor<boolean>;
  closeVerificationDialog(): void;
  openVerificationDialog(onVerified: () => void): void;
  onVerified(): void;
  setTab(tabID: string): void;
}

interface SettingsPaneProviderProps {
  setTab(tabID: string): void;
}

const SettingsPaneContext = createContext<SettingsPaneContextValue>();

const SettingsPaneProvider: ParentComponent<SettingsPaneProviderProps> = (props) => {
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
    <SettingsPaneContext.Provider
      value={{
        verificationDialogOpened,
        closeVerificationDialog,
        openVerificationDialog,
        onVerified,
        setTab: props.setTab
      }}
    >
      {props.children}
    </SettingsPaneContext.Provider>
  );
};

const useSettingsPane = () => {
  return useContext(SettingsPaneContext)!;
};

export { SettingsPaneProvider, useSettingsPane };
