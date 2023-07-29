import { useEffect, useRef, useState } from "preact/hooks";
import { Message } from "../src/components/Message";
import { MessageType } from "../src/utils/MessageType";
import { nanoid } from "nanoid";
import {
  ExecuteAction,
  OpenUrlAction,
  ShowCardAction,
  SubmitAction,
  ToggleVisibilityAction,
} from "adaptivecards";
import { Highlighter, Lang, getHighlighter, setCDN } from "shiki";
import { replaceAsync } from "../src/utils/replaceAsync";
import * as jwt from "../src/utils/getJWTKey";
import { Action } from "../src/utils/ActionType";

const models: {
  [key: string]: string;
} = {
  auto: "Teams Bot Mode",
  gpt3_auto: "GPT 3 / Auto",
  gpt3_16k: "GPT 3 / 16k",
  clarity_auto: "Clarity / Auto",
  clarity_16k: "Clarity / 16k",
  gpt4_auto: "GPT 4 / Auto",
  gpt4_32k: "GPT 4 / 32k",
};
export function App() {
  const [highlighter, setHighlighter] = useState<Highlighter>();

  useEffect(() => {
    (async () => {
      setCDN("https://unpkg.com/shiki/");
      if (!highlighter) {
        const h = await getHighlighter({
          theme: "min-dark",
          langs: ["javascript", "typescript", "python", "csharp", "cpp"],
        });
        setHighlighter(h);
      }
    })();
  }, []);

  const inputRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(
    (JSON.parse(localStorage.getItem("messages") || "[]") ||
      []) as MessageType[]
  );
  const [model, setModel] = useState(
    localStorage.getItem("model") || "gpt3_auto"
  );

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  const onExecuteAction = async (action: Action) => {
    if (action instanceof SubmitAction || action instanceof ExecuteAction) {
      const responseID = nanoid();
      const card_id =
        ((action.data as Record<string, unknown>)?.card_id as string) || "";
      setMessages([
        ...messages,
        {
          sender: "Action",
          tags: [card_id].filter((x) => x != ""),
          date: new Date(),
          isLoading: true,
          id: responseID,
          type: "text",
        },
      ]);
      const messagesContainer = document.getElementById("messages-container");
      messagesContainer?.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: "smooth",
      });
      try {
        const res = await fetch(
          "https://fakerss.f1shylabs.workers.dev/bot_http_fast/",
          {
            method: "POST",
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
          }
        );

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

        setMessages((messages) =>
          messages.map((message) =>
            message.id == responseID
              ? {
                  ...message,
                  content,
                  type,
                  isLoading: false,
                  date: new Date(),
                }
              : message
          )
        );
      } catch (e) {
        setMessages((messages) =>
          messages.map((message) =>
            message.id == responseID
              ? {
                  ...message,
                  content: `Error fetching response: ${e}`,
                  tags: [],
                  type: "error",
                  isLoading: false,
                  date: new Date(),
                }
              : message
          )
        );
      }
      await new Promise((x) => setTimeout(x, 50));
      //scroll to bottom
      messagesContainer?.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: "smooth",
      });
    }

    if (action instanceof OpenUrlAction) {
      window.open(action.url, "_blank");
    }
  };

  const handleSubmit = async () => {
    if (message.trim().length == 0) return;
    if (message.trim() == "/clear") {
      inputRef.current!.innerText = "";
      return setMessages([]);
    }
    if (message.trim().startsWith("/jwtkey")) {
      const uid = message.trim().split(" ")[1] || "uid";
      const key = jwt.getJWTKey();
      const res = await fetch(`http://127.0.0.1:8787/jwt/${key}`, {
        method: "POST",
        headers: {
          "x-user-id": uid,
        },
      });
      const data = await res.json();
      setMessages([
        ...messages,
        {
          sender: "user",
          content: message,
          tags: [],
          date: new Date(),
          isLoading: false,
          id: nanoid(),
          type: "text",
        },
        {
          sender: "Internal",
          content:
            (res.ok
              ? data.token +
                `\n\n` +
                data.token
                  .split(".")
                  .slice(0, 2)
                  .map(atob)
                  .map(JSON.parse)
                  .map((x: any) => JSON.stringify(x, null, 2))
                  .join("\n\n")
              : "Error: " + res.statusText) || "error",
          tags: [],
          date: new Date(),
          isLoading: false,
          id: nanoid(),
          type: "error",
        },
      ]);
      setMessage("");
      inputRef.current!.innerText = "";
      //scroll to bottom
      await new Promise((x) => setTimeout(x, 50));
      const messagesContainer = document.getElementById("messages-container");
      messagesContainer?.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: "smooth",
      });
      return;
    }

    const responseID = nanoid();
    setMessages([
      ...messages,
      {
        sender: "user",
        content: message,
        tags: [],
        date: new Date(),
        isLoading: false,
        id: nanoid(),
        type: "text",
      },
      {
        sender: models[message.startsWith("/") ? "auto" : model] || model,
        content: "",
        tags: [],
        date: new Date(),
        isLoading: true,
        id: responseID,
        type: "loading",
      },
    ]);
    setMessage("");
    inputRef.current!.innerText = "";
    //scroll to bottom
    await new Promise((x) => setTimeout(x, 50));
    const messagesContainer = document.getElementById("messages-container");
    messagesContainer?.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: "smooth",
    });

    let finalMessage = message;

    if (!message.startsWith("/") && model != "auto") {
      switch (model) {
        case "gpt3_auto":
          finalMessage = `/gpt ${message}`;
          break;
        case "gpt3_16k":
          finalMessage = `/gpt --16 ${message}`;
          break;
        case "clarity_auto":
          finalMessage = `/clarity ${message}`;
          break;
        case "clarity_16k":
          finalMessage = `/clarity --16 ${message}`;
          break;
        case "gpt4_auto":
          finalMessage = `/gpt4 ${message}`;
          break;
        case "gpt4_32k":
          finalMessage = `/gpt4 --32 ${message}`;
          break;
        default:
          break;
      }
    }

    const botMsgs = messages.filter(
      (message) =>
        message.sender != "user" &&
        !message.isLoading &&
        message.id != responseID
    );
    const lastBotMsg = botMsgs[botMsgs.length - 1];
    try {
      const res = await fetch(
        "https://fakerss.f1shylabs.workers.dev/bot_http_fast/",
        {
          method: "POST",
          body: JSON.stringify({
            msgData: {
              from: {
                user: {
                  id: "0000-l0cal-ai-w4b-cl1ent-0000",
                  displayName: "LocalAI Web Client",
                },
              },
              body: {
                plainTextContent: finalMessage,
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
        }
      );

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

      //parse markdown links [text](url) to html links
      content = content.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s<]+)\)/g,
        (_: undefined, text: string, url: string) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
      );

      //write me code here to parse links in the text and replace then with <a> but ignore the links that are already in <a>
      content = content.replace(
        /(?<!href=")(https?:\/\/[^\s<]+)/g,
        (_: undefined, url: string) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
      );

      // parse markdown bold **text** to html bold
      content = content.replace(
        /\*\*([^\*]+)\*\*/g,
        (_: undefined, text: string) => {
          return `<b>${text}</b>`;
        }
      );

      // parse markdown italic *text* or _text_ to html italic
      content = content.replace(
        /(\*|_)([^\*]+)(\*|_)/g,
        (_: undefined, o: undefined, text: string) => {
          return `<i>${text}</i>`;
        }
      );

      // parse markdown strikethrough ~~text~~ to html strikethrough
      content = content.replace(
        /~~([^\*]+)~~/g,
        (_: undefined, text: string) => {
          return `<s>${text}</s>`;
        }
      );

      // parse markdown underline __text__ to html underline
      content = content.replace(
        /__([^\*]+)__/g,
        (_: undefined, text: string) => {
          return `<u>${text}</u>`;
        }
      );

      // parse markdown code ```text``` to html code
      //replace ```language
      //...
      //...
      //...
      //``` with <code class="language">text</code>

      content = await replaceAsync(
        content,
        /```([^\n]*?)\n([\s\S]*?)\n```/g,
        async (_: undefined, lang: string, text: string) => {
          if (lang) {
            if (!highlighter) {
              let langs = [
                "javascript",
                "typescript",
                "python",
                "csharp",
                "cpp",
              ];
              if (lang as Lang | false) langs.push(lang as Lang);
              setHighlighter(
                await getHighlighter({
                  theme: "min-dark",
                  langs: langs as Lang[],
                })
              );
            }
            if (highlighter) {
              console.log("[high cb]", text);
              const code = await (await highlighter).codeToHtml(text, { lang });
              return code;
            }
          }
          console.log("[big cb]", text);
          return `<code>${text}</code>`;
        }
      );

      // parse markdown code `text` to html code but ignore the code that is already in <code>
      content = content.replace(
        /(?<!<code>)(`)([^`]+)(`)(?!<\/code>)/g,
        (_: undefined, o: undefined, text: string) => {
          console.log("[small cb]", text);
          return `<code>${text}</code>`;
        }
      );

      if (!res.ok)
        content = `Error fetching response (code ${res.status}): ${res.statusText}`;

      setMessages((messages) =>
        messages.map((message) =>
          message.id == responseID
            ? {
                ...message,
                content,
                tags: [],
                type,
                isLoading: false,
                date: new Date(),
              }
            : message
        )
      );
    } catch (e) {
      setMessages((messages) =>
        messages.map((message) =>
          message.id == responseID
            ? {
                ...message,
                content: `Error fetching response: ${e}`,
                tags: [],
                type: "error",
                isLoading: false,
                date: new Date(),
              }
            : message
        )
      );
    }
    await new Promise((x) => setTimeout(x, 50));
    //scroll to bottom
    messagesContainer?.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: "smooth",
    });
  };
  return (
    <>
      <div class="bg-[rgb(20,20,22)] w-screen fixed top-0 left-0 h-full grid grid-cols-8">
        <div class=" flex flex-col w-full h-full col-span-8">
          <div class="flex w-full">
            <div class="bg-[rgb(12,12,13)] flex px-6 py-4 w-full items-center gap-1 z-10">
              <div className="flex flex-col">
                <span class="text-white font-semibold">LocalAI</span>
                <a
                  class="text-zinc-300 text-xs hover:text-purple-300 transition"
                  href={"https://github.com/f1shy-dev"}
                >
                  by f1shy-dev
                </a>
              </div>
              <div class="flex-grow"></div>

              <select
                class="px-3 py-1.5 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs appearance-none text-center focus:ring-none focus:outline-none hover:bg-zinc-900 transition-colors"
                onChange={(e) => {
                  localStorage.setItem(
                    "model",
                    (e.target as HTMLSelectElement).value
                  );
                  setModel((e.target as HTMLSelectElement).value);
                }}
                value={model}
              >
                {Object.entries(models).map(([model, name]) => (
                  <option value={model}>{name}</option>
                ))}
              </select>

              <button
                class="px-1.5 sm:px-3 py-1.5 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-900 transition-colors"
                onClick={() => {
                  setMessages([]);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M235.5,216.81c-22.56-11-35.5-34.58-35.5-64.8V134.73a15.94,15.94,0,0,0-10.09-14.87L165,110a8,8,0,0,1-4.48-10.34l21.32-53a28,28,0,0,0-16.1-37,28.14,28.14,0,0,0-35.82,16,.61.61,0,0,0,0,.12L108.9,79a8,8,0,0,1-10.37,4.49L73.11,73.14A15.89,15.89,0,0,0,55.74,76.8C34.68,98.45,24,123.75,24,152a111.45,111.45,0,0,0,31.18,77.53A8,8,0,0,0,61,232H232a8,8,0,0,0,3.5-15.19ZM67.14,88l25.41,10.3a24,24,0,0,0,31.23-13.45l21-53c2.56-6.11,9.47-9.27,15.43-7a12,12,0,0,1,6.88,15.92L145.69,93.76a24,24,0,0,0,13.43,31.14L184,134.73V152c0,.33,0,.66,0,1L55.77,101.71A108.84,108.84,0,0,1,67.14,88Zm48,128a87.53,87.53,0,0,1-24.34-42,8,8,0,0,0-15.49,4,105.16,105.16,0,0,0,18.36,38H64.44A95.54,95.54,0,0,1,40,152a85.9,85.9,0,0,1,7.73-36.29l137.8,55.12c3,18,10.56,33.48,21.89,45.16Z"></path>
                </svg>
                <span class="hidden sm:block pl-1">Clear Chat</span>
              </button>

              <button class="px-1.5 sm:px-3 py-1.5 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-900 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M117.31,134l-72,64a8,8,0,1,1-10.63-12L100,128,34.69,70A8,8,0,1,1,45.32,58l72,64a8,8,0,0,1,0,12ZM216,184H120a8,8,0,0,0,0,16h96a8,8,0,0,0,0-16Z"></path>
                </svg>
                <span class="hidden sm:block pl-1">Open DevTools</span>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden">
            <div class="flex flex-col h-full overflow-hidden">
              <div
                class="flex-1 overflow-y-auto overflow-x-hidden scrollbar scrollbar-thumb-color-zinc-800 scrollbar-track-color-transparent divide-y divide-zinc-800
                
                fixed w-full top-0 left-0 h-full pt-[72px] pb-[94px]"
                id="messages-container"
              >
                {messages.length == 0 && (
                  <div class="py-5 text-white w-full">
                    <div class="flex flex-col gap-2 px-7 w-full">
                      <div class="flex gap-1">
                        <div class="bg-[rgb(12,12,13)] border-zinc-800 border justify-center items-center rounded-lg text-center text-xs px-2.5 py-1.5 w-fit">
                          ℹ️&nbsp; Info
                        </div>
                      </div>
                      <p
                        class="text-sm whitespace-pre-wrap text-zinc-400"
                        id="message-text-display"
                      >
                        <b>Welcome to LocalAI</b>
                        <br />
                        <i class="text-xs">a project by f1shy-dev</i>
                        <br />
                        <br />
                        To get started, type a message in the box below and hit
                        enter - messages starting with "/" will forward to the
                        Teams Bot, which is a general bot with a few features.
                        Otherwise, your message will be sent to the AI model you
                        selected above.
                        <br />
                        <br />
                        <ul>
                          <li>
                            <code>GPT-3 (Auto/16k)</code> - standard
                            gpt-3.5-turbo model, either with 4k or 16k tokens.
                          </li>
                          <li>
                            <code>GPT-4 (Auto/32k)</code> - expensive gpt-4
                            model, either with 8k or 32k tokens.
                          </li>
                          <li>
                            <code>Clarity (Auto/16k)</code> - gpt-3.5-turbo
                            model, but your prompt is also sent to DuckDuckGo,
                            and then the model is provided sources and text from
                            the top results. Can be useful for up-to-date
                            information past 2021.
                          </li>
                        </ul>
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <Message
                    sender={message.sender}
                    htmlContent={message.content}
                    tags={message.tags}
                    type={message.type}
                    onExecuteAction={onExecuteAction}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[rgb(20,20,22)] fixed bottom-0 w-full">
            <div class="bg-[rgb(12,12,13)] text-gray-400 text-sm rounded-lg  border border-zinc-800 w-full max-h-[300px]">
              <div class="px-6 py-3 space-x-5 flex flex-grow h-full">
                <div
                  class="bg-transparent focus:outline-none flex-grow resize-none !h-full overflow-y-auto scrollbar
                    scrollbar-thumb-color-zinc-800 scrollbar-track-color-transparent max-h-[256px]"
                  placeholder={`/ for bot commands, else using ${models[model]}`}
                  onInputCapture={(e) => {
                    setMessage((e.target as HTMLInputElement).innerText);
                  }}
                  contentEditable
                  ref={inputRef}
                  // on enter
                  onKeyDown={async (e) => {
                    if (e.key == "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      await handleSubmit();
                    }
                  }}
                />

                <button
                  class="bg-purple-500/80 hover:bg-purple-500/70 transition-colors disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold px-2 py-2 rounded max-h-[36px]"
                  disabled={(message || "").trim().length == 0}
                  onClick={handleSubmit}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 256 256"
                  >
                    <path d="M232,127.89a16,16,0,0,1-8.18,14L55.91,237.9A16.14,16.14,0,0,1,48,240a16,16,0,0,1-15.05-21.34L60.3,138.71A4,4,0,0,1,64.09,136H136a8,8,0,0,0,8-8.53,8.19,8.19,0,0,0-8.26-7.47H64.16a4,4,0,0,1-3.79-2.7l-27.44-80A16,16,0,0,1,55.85,18.07l168,95.89A16,16,0,0,1,232,127.89Z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
