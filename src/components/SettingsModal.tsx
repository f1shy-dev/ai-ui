import { StateUpdater } from "preact/hooks";
import { Modal } from "./Modal";

export const SettingsModal = ({
  shown,
  setShown,
}: {
  shown: boolean;
  setShown: StateUpdater<boolean>;
}) => {
  return (
    <Modal title={"Settings"} shown={shown} setShown={setShown}>
      <span class="font-semibold text-xs">Models</span>
    </Modal>
  );
};

/*
<button type="button" role="switch" aria-checked="true" data-state="checked" value="on" class="peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input" id="airplane-mode"><span data-state="checked" class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"></span></button>
 */
