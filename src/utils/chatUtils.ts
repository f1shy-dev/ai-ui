export type SetMessages = StateUpdater<MessageType[]>;
import { StateUpdater } from "preact/compat";
import { FunctionCall, MessageType } from "./MessageType";
import { signal } from "@preact/signals";
import { nanoid } from "nanoid";
import { settings } from "./settings";

export const scrollChatView = async () => {
  // await new Promise((x) => setTimeout(x, 50));
  //scroll to bottom
  const messagesContainer = document.getElementById("messages-container");

  requestAnimationFrame(() => {
    messagesContainer?.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: "smooth",
    });
  });
};

export const messages = signal<MessageType[]>(
  JSON.parse(localStorage.getItem("messages") || "[]").map((x: MessageType) =>
    x.isLoading
      ? {
          ...x,
          isLoading: false,
          type: "error",
          content: "Message failed to send. Please try again.",
        }
      : x
  )
);

messages.subscribe((x) => {
  localStorage.setItem("messages", JSON.stringify(x));
  scrollChatView();
});

export const updateMessageByID = (id: string, message: Partial<MessageType>) =>
  (messages.value = messages.value.map((x) =>
    x.id == id
      ? {
          ...x,
          ...message,
          function_calls:
            [...(x.function_calls || []), ...(message.function_calls || [])] ||
            undefined,
        }
      : x
  ));

export const updateFunctionCallByID = (
  id: string,
  fc_id: string,
  call: Partial<FunctionCall>
) =>
  (messages.value = messages.value.map((x) =>
    x.id == id
      ? {
          ...x,
          function_calls: (x.function_calls || []).map((y) =>
            y.id == fc_id
              ? {
                  ...y,
                  ...call,
                }
              : y
          ),
        }
      : x
  ));

export const newMessage = (message: Partial<MessageType>) =>
  (messages.value = [
    ...messages.value,
    {
      model: settings.value.model,
      sender: "user",
      tags: [],
      date: new Date(),
      isLoading: false,
      id: nanoid(),
      type: "text",
      ...message,
    },
  ]);
