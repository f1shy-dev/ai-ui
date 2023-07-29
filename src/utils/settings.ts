import { signal } from "@preact/signals-core";

export type AppSettings = {
  model: string;
  allowGPTFunctions: boolean;
  customInstruction: string;
};

export const settings = signal<AppSettings>({
  model: "local",
  allowGPTFunctions: true,
  customInstruction: "",
});
