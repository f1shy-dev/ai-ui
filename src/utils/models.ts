import { computed } from "@preact/signals";
import { AuthState, openAIAuthState, teamsAuthState } from "./authState";
import { settings } from "./settings";

export const models = computed(() => {
  let ms: { [key: string]: string } = {
    local: "Local Only",
  };

  if (teamsAuthState.value == AuthState.Valid) {
    ms = {
      ...ms,
      teams: "Teams Bot Mode",
    };
  }

  if (openAIAuthState.value == AuthState.Valid) {
    ms = {
      ...ms,
      openai_gpt3_auto: "GPT 3 / 4k",
      openai_gpt3_16k: "GPT 3 / 16k",
      openai_gpt4_auto: "GPT 4 / 8k",
      openai_gpt4_32k: "GPT 4 / 32k",
    };
  }
  return ms;
});

export const modelPricingPerOutputToken = {
  local: 0,
  teams: 0,
  openai_gpt3_auto: 0.002 / 1000,
  openai_gpt3_16k: 0.004 / 1000,
  openai_gpt4_auto: 0.06 / 1000,
  openai_gpt4_32k: 0.12 / 1000,
};

export const modelPricingPerInputToken = {
  local: 0,
  teams: 0,
  openai_gpt3_auto: 0.0015 / 1000,
  openai_gpt3_16k: 0.003 / 1000,
  openai_gpt4_auto: 0.03 / 1000,
  openai_gpt4_32k: 0.06 / 1000,
};
// export const computedModel = computed(() => {
//   const lsModel = localStorage.getItem("model");
//   return lsModel &&
//     models.value[lsModel as keyof typeof models.value] != undefined
//     ? lsModel
//     : openAIAuthState.value == AuthState.Valid
//     ? "openai_gpt3_auto"
//     : teamsAuthState.value == AuthState.Valid
//     ? "teams"
//     : "local";
// });

export const setComputedModel = (useLS: boolean = true) => {
  if (useLS) {
    const lsModel = localStorage.getItem("model");
    if (
      lsModel &&
      models.value[lsModel as keyof typeof models.value] != undefined
    ) {
      settings.value.model = lsModel;
      return;
    }
  }

  if (openAIAuthState.value == AuthState.Valid) {
    settings.value.model = "openai_gpt3_auto";
    return;
  }

  if (teamsAuthState.value == AuthState.Valid) {
    settings.value.model = "teams";
    return;
  }

  settings.value.model = "local";
};
