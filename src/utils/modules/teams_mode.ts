import { messages } from "@/utils/chatUtils";
import { teamsEndpoint, teamsJWTKey } from "@/utils/auth";
import { ChatModule } from ".";
import { nanoid } from "nanoid";
import { ExecuteAction, OpenUrlAction, SubmitAction } from "adaptivecards";
import { Action } from "@/utils/ActionType";
import { newMessage, updateMessageByID } from "@/utils/chatUtils";

export const handleCommand: ChatModule = async (
  message: string,
  responseID: string
) => {
  const botMsgs = messages.value.filter(
    (message) =>
      message.sender != "user" && !message.isLoading && message.id != responseID
  );
  const lastBotMsg = botMsgs[botMsgs.length - 1];
  try {
    const res = await fetch(`${teamsEndpoint}/bot_prefix-exclaim/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teamsJWTKey.value}`,
      },
      body: JSON.stringify({
        msgData: {
          from: {
            user: {
              id: "0000-l0cal-ai-w4b-cl1ent-0000",
              displayName: "LocalAI Web Client",
            },
          },
          body: {
            plainTextContent: message,
          },
          attachments: [],
          mentions: [],
          conversationId: responseID,
        },
        type: "message",
        ...(lastBotMsg
          ? {
              replyMessage: {
                body: {
                  content: lastBotMsg.content,
                },
                id: lastBotMsg.id,
              },
            }
          : {}),
      }),
    });

    const data = await res.json();

    let type: "text" | "card" | "loading" | "error" = "text";

    if (data.responseType == "card" || data.responseType == "card_update")
      type = "card";
    if (data.responseType == "error") type = "error";
    if (data.status == "ignore" || data.status == "error") type = "error";

    if (!res.ok) type = "error";

    let content =
      data.status == "ignore"
        ? "Server response recieved: ignore - note that the current prefix is `!`"
        : data.response;

    if (!res.ok)
      content = `Error fetching response (code ${res.status}): ${res.statusText}`;
    return {
      content,
      tags: [],
      type,
      isLoading: false,
      date: new Date(),
    };
  } catch (e) {
    console.log(e);

    return {
      content: `Error fetching response: ${e}`,
      tags: [],
      type: "error",
      isLoading: false,
      date: new Date(),
    };
  }
};

export const handleCardAction = async (action: Action) => {
  if (action instanceof SubmitAction || action instanceof ExecuteAction) {
    const responseID = nanoid();
    const card_id =
      ((action.data as Record<string, unknown>)?.card_id as string) || "";
    newMessage({
      sender: "Action",
      tags: [card_id].filter((x) => x != ""),
      isLoading: true,
      id: responseID,
      type: "text",
    });
    try {
      const res = await fetch(`${teamsEndpoint}/bot_http_fast/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${teamsJWTKey.value}`,
        },
        body: JSON.stringify({
          type: "adaptive_response",
          adaptiveData: {
            cardOutputs: action.data,
            teamsFlowRunContext: {
              MessagePayload: {
                From: {
                  User: {
                    Id: "0000-l0cal-ai-w4b-cl1ent-0000",
                    DisplayName: "LocalAI Web Client",
                  },
                },
              },
            },
          },
        }),
      });

      const data = await res.json();

      let type: "text" | "card" | "loading" | "error" = "text";
      if (data.responseType == "card" || data.responseType == "card_update")
        type = "card";
      if (data.responseType == "error") type = "error";
      if (data.status == "ignore" || data.status == "error") type = "error";

      if (!res.ok) type = "error";

      let content =
        data.status == "ignore"
          ? "Server response recieved: ignore"
          : data.response;
      if (!res.ok)
        content = `FetchError (code ${res.status}): ${res.statusText}`;

      updateMessageByID(responseID, {
        content,
        type,
        isLoading: false,
        date: new Date(),
      });
    } catch (e) {
      console.log(e);
      updateMessageByID(responseID, {
        content: `Error fetching response: ${e}`,
        type: "error",
        isLoading: false,
        date: new Date(),
      });
    }
  }

  if (action instanceof OpenUrlAction) {
    window.open(action.url, "_blank");
  }
};
