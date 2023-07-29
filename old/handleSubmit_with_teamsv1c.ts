import { Ref } from "preact/hooks";
import { messages, updateMessageByID } from "../src/utils/chatUtils";
import { nanoid } from "nanoid";
import { models } from "../src/utils/models";
import { Highlighter } from "shiki";
import { StateUpdater } from "preact/hooks";
import { modules } from "../src/utils/modules";
import { handleCommand } from "../src/utils/modules/teams_mode";
import {
  AuthState,
  openAIAuthState,
  teamsAuthState,
} from "../src/utils/authState";
import { parseMarkdown } from "../src/utils/parseMarkdown";
import { MessageType } from "../src/utils/MessageType";
import { settings } from "../src/utils/settings";
import {
  openAIChatEndpoint,
  openAIKey,
  teamsEndpoint,
  teamsJWTKey,
  teamsOpenAIChatEndpoint,
} from "../src/utils/auth";
import {
  CustomEventDataType,
  CustomEventErrorType,
  CustomEventType,
  SSE,
  SSEOptions,
  SSEOptionsMethod,
} from "sse-ts";
import {
  OpenAIMessage,
  OpenAISSEOptions,
  sseOpenAI,
} from "../src/utils/sseOpenAI";

export const handleSubmit = async (
  message: string,
  setMessage: (message: string) => void,
  highlighter: Highlighter | undefined,
  setHighlighter: StateUpdater<Highlighter | undefined>,
  inputRef: Ref<HTMLDivElement>
) => {
  const model = settings.value.model;
  // const updateMessageByID = async (
  //   id: string,
  //   message: Partial<MessageType>
  // ) => {
  //   return updateMessageByID(id, {
  //     ...message,
  //     content: await parseMarkdown(
  //       message.content,
  //       highlighter,
  //       setHighlighter
  //     ),
  //   });
  // };
  const responseID = nanoid();
  if (message.trim().length == 0) return;
  if (message.trim() == "/clear") {
    inputRef.current!.innerText = "";
    return (messages.value = []);
  }

  setMessage("");
  inputRef.current!.innerText = "";

  messages.value = [
    ...messages.value,
    {
      sender: "user",
      model: settings.value.model,
      content: message,
      tokens: Math.ceil(message.length / 4),
      tags: [],
      date: new Date(),
      isLoading: false,
      id: nanoid(),
      type: "text",
    },
    {
      sender: models.value[model] || model,
      content: "",
      model: settings.value.model,
      tags: [],
      date: new Date(),
      isLoading: true,
      id: responseID,
      type: "loading",
    },
  ];

  if (model == "local" || message.startsWith("/")) {
    if (!message.startsWith("/")) {
      return updateMessageByID(responseID, {
        sender: "@⛔️ Error",
        content: "Local only mode only supports commands that start with `/`",
        isLoading: false,
        type: "error",
      });
    }
    const command = message.split(" ")[0].slice(1);
    if (modules[command as keyof typeof modules]) {
      return updateMessageByID(
        responseID,
        await modules[command as keyof typeof modules](message, responseID)
      );
    } else {
      return updateMessageByID(responseID, {
        sender: "@⛔️ Error",
        content: `/${command} isn't a command...`,
        isLoading: false,
        type: "error",
      });
    }
  }

  if (model == "teams") {
    if (
      teamsAuthState.value == AuthState.NoAuth ||
      teamsAuthState.value == AuthState.InvalidAuth
    ) {
      return updateMessageByID(responseID, {
        content: `There was an error authenticating you - please make sure you've set a user ID in settings to use this feature.`,
        isLoading: false,
        type: "error",
      });
    } else {
      return updateMessageByID(
        responseID,
        await handleCommand(message, responseID)
      );
    }
  }

  if (model.startsWith("openai")) {
    if (
      model.endsWith("_epteams") &&
      (teamsAuthState.value == AuthState.NoAuth ||
        teamsAuthState.value == AuthState.InvalidAuth)
    ) {
      return updateMessageByID(responseID, {
        content: `There was an error authenticating you - please make sure you've set a user ID in settings to use this feature.`,
        isLoading: false,
        type: "error",
      });
    } else if (
      (!model.endsWith("_epteams") &&
        openAIAuthState.value == AuthState.NoAuth) ||
      openAIAuthState.value == AuthState.InvalidAuth
    ) {
      return updateMessageByID(responseID, {
        content: `There was an error authenticating you - please make sure you've set an OpenAI API Key in settings to use this feature.`,
        isLoading: false,
        type: "error",
      });
    }

    const modelMap = {
      openai_gpt3_auto: "gpt-3.5-turbo",
      openai_gpt3_16k: "gpt-3.5-turbo-16k",
      openai_gpt4_auto: "gpt-4",
      openai_gpt4_32k: "gpt-4-32k",
    };

    const handleError = (e: any) => {
      const isResNotOk =
        typeof e == "object"
          ? (e as [string, number, string, string])[0] == "not-ok"
          : false;
      const status =
        typeof e == "object" ? (e as [string, number, string, string])[1] : 0;
      const msg =
        typeof e == "object"
          ? (e as [string, number, string, string])[2]
          : (e as Error).message || e;

      const openaiError =
        typeof e == "object"
          ? JSON.parse((e as [string, number, string, string])[3] || "{}")
          : undefined;
      const openAIErrorMsg = openaiError?.error?.message;
      const detail = isResNotOk
        ? `${status} ${openAIErrorMsg || msg}`
        : openAIErrorMsg || msg;

      const statusMap = {
        401: "There was an error authenticating you - please check your API key.",
        429: "You've hit the rate limit for this API key - please wait a few minutes and try again.",
        500: "There was an error with OpenAI's servers - {{msg}}",
        503: "The model you're using is currently unavailable - please try again later.",
        0: "There was an error trying to get a response from OpenAI - {{msg}}",
      };
      return updateMessageByID(responseID, {
        content: statusMap[status as keyof typeof statusMap]
          ? statusMap[status as keyof typeof statusMap].replace(
              "{{msg}}",
              detail
            )
          : `There was an error trying to get a response from OpenAI - please try again later.\n\n**Error details**\n${detail}`,
        isLoading: false,
        type: "error",
      });
    };
    try {
      const fetchparams = {
        method: "POST",
        body: {
          model: modelMap[model.split("_epteams")[0] as keyof typeof modelMap],
          ...(settings.value.allowGPTFunctions ? {} : {}),
          messages: [
            settings.value.customInstruction && {
              role: "system",
              content: settings.value.customInstruction,
            },
            ...messages.value
              .filter((i) => i.model.startsWith("openai"))
              .map((msg) => ({
                role: msg.sender == "user" ? "user" : "assistant",
                content: msg.content,
              })),
            {
              role: "user",
              content: message,
            },
          ].filter(Boolean),
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            model.endsWith("_epteams") ? teamsJWTKey.value : openAIKey.value
          }`,
        },
      };

      if (model.endsWith("_epteams")) {
        const response = await fetch(teamsOpenAIChatEndpoint, {
          headers: fetchparams.headers,
          method: "POST",
          body: JSON.stringify(fetchparams.body),
        });
        if (!response.ok) {
          throw [
            "not-ok",
            response.status,
            response.statusText,
            response.body ? await response.text() : "",
          ];
        }

        const data = await response.json();

        updateMessageByID(responseID, {
          content: data.choices[0].message.content,
          isLoading: false,
          type: "text",
        });
      }

      if (!model.endsWith("_epteams")) {
        const sseOptions: OpenAISSEOptions = {
          messages: [
            settings.value.customInstruction && {
              role: "system",
              content: settings.value.customInstruction,
            },
            ...messages.value
              .filter((i) => i.model.startsWith("openai"))
              .map((msg) => ({
                role: msg.sender == "user" ? "user" : "assistant",
                content: msg.content,
              })),
            {
              role: "user",
              content: message,
            },
          ].filter(Boolean) as OpenAIMessage[],
          updateMessage: (message, tokenCount) => {
            updateMessageByID(responseID, {
              content: message,
              isLoading: false,
              tokens: tokenCount,
              type: "text",
            });
          },
          handleErrorMessage: (message) => {
            updateMessageByID(responseID, {
              content: message,
              isLoading: false,
              type: "error",
            });
          },
          functions: {
            clear_chat: {
              description:
                "Clears the chat history for the user. Make sure to confirm with the user, and don't call if there's no chat history.",
              parameters: {
                type: "object",
                properties: {},
              },
              execute() {
                inputRef.current!.innerText = "";
                messages.value = [];
                return [true, false, null];
              },
            },
            search_web: {
              description:
                "Searches the web for a query and returns a few results with URLs that can be searched further. Use if asked about topics that you may be unsure about or those that require more context and or up-to-date knowledge.",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The query to search for.",
                  },
                },
              },
              async execute(args) {
                try {
                  const data = await fetch(
                    `${teamsEndpoint}/ddg?q=${encodeURIComponent(args.query)}`
                  );
                  const html = await data.text();
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, "text/html");
                  const zciResults = [...doc.querySelectorAll(".zci__result")]
                    .map((element) => {
                      return {
                        url:
                          element.querySelector("a")?.getAttribute("href") ||
                          "",
                        full: element.textContent?.trim(),
                      };
                    })
                    .filter(Boolean);

                  const searchResults = [
                    ...doc.querySelectorAll(".result, .results_links"),
                  ]
                    .map((element) => {
                      const resultSnippet =
                        element.querySelector(".result__snippet");
                      const resultLink = element.querySelector("a");
                      if (!resultSnippet || !resultLink) return null;
                      const resultText = resultSnippet.textContent?.trim();
                      let resultUrl = resultLink.getAttribute("href");
                      if (!resultUrl) return null;
                      if (resultUrl.startsWith("//duckduckgo.com/l/")) {
                        resultUrl = decodeURIComponent(
                          resultUrl.split("uddg=")[1].split("&rut=")[0]
                        ).trim();
                      }
                      return {
                        url: resultUrl,
                        brief: resultText,
                      };
                    })
                    .filter(Boolean);

                  return [
                    true,
                    true,
                    JSON.stringify(
                      [...zciResults, ...searchResults.slice(0, 5)].filter(
                        Boolean
                      )
                    ),
                  ];
                } catch (e) {
                  console.log(e);
                  return [false, false, null];
                }
              },
            },
          },
        };

        return await sseOpenAI(sseOptions);
      }
    } catch (e) {
      return handleError(e);
    }
  }
};
