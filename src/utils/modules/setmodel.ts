import { ChatModule } from ".";
import { models } from "../models";
import { settings } from "../settings";

export const setmodel: ChatModule = async (message) => {
  const newModel = message.split(" ")[1];
  if (!newModel) {
    return {
      content: "Please specify a model, like `/setmodel local`",
      isLoading: false,
      type: "error",
    };
  }
  if (!models.value[newModel]) {
    return {
      content: `The model \`${newModel}\` does not exist. Valid models are: ${Object.keys(
        models.value
      )
        .map((x) => `\`${x}\``)
        .join(", ")}`,
      isLoading: false,
      type: "error",
    };
  }

  settings.value.model = newModel;
  return {
    content: `Set model to \`${models.value[newModel]}\``,
    isLoading: false,
    type: "text",
  };
};
