import { Ref } from "preact/hooks";
import {
  messages,
  updateFunctionCallByID,
  updateMessageByID,
} from "./chatUtils";
import { nanoid } from "nanoid";
import { models } from "./models";
import { Highlighter } from "shiki";
import { StateUpdater } from "preact/hooks";
import { modules } from "./modules";
import { handleCommand } from "./modules/teams_mode";
import { AuthState, openAIAuthState, teamsAuthState } from "./authState";
import { settings } from "./settings";
import { teamsEndpoint } from "./auth";
import { OpenAIMessage, sseOpenAI } from "./sseOpenAI";
import { all, create } from "mathjs";
const math = create(all);
type PistonRuntime = {
  language: string;
  version: string;
  aliases: string[];
  runtime?: string;
};

export const handleSubmit = async (
  message: string,
  setMessage: (message: string) => void,
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
  const messageID = nanoid();
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
      // tokens: Math.ceil(message.length / 4),
      tags: [],
      date: new Date(),
      isLoading: false,
      id: messageID,
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
      openAIAuthState.value == AuthState.NoAuth ||
      openAIAuthState.value == AuthState.InvalidAuth
    ) {
      return updateMessageByID(responseID, {
        content: `There was an error authenticating you - please make sure you've set an OpenAI API Key in settings to use this feature.`,
        isLoading: false,
        type: "error",
      });
    }

    const messagestoSend: OpenAIMessage[] = [
      {
        role: "system",
        content:
          settings.value.customInstruction ||
          `You are a helpful assistant that accurately answers the user's queries, and when you feel that your answer may be inaccurate due to your knowledge being limited or if you want to validate your answer, you should use functions to do so. All your output should be formatted in markdown, and code output should be formatted in markdown code blocks, and mathematical-like output, such as equations and formulas should also be formatted in markdown code blocks with backticks.
            
            Only use the functions you have been provided with, and with the proper parameters.`,
      },
      ...messages.value
        .filter((i) => i.model.startsWith("openai"))
        .map((msg) => [
          {
            role: msg.sender == "user" ? "user" : "assistant",
            content: msg.content,
          },
          ...(msg.function_calls || [])
            .filter((fc) => fc.success && fc.result)
            .map((fc) => ({
              role: "function",
              name: fc.name,
              content: fc.result,
            })),
        ])
        .flat(),
      {
        role: "user",
        content: message,
      },
    ].filter(Boolean) as OpenAIMessage[];

    updateMessageByID(messageID, {
      tokens: messagestoSend.reduce(
        (acc, x) =>
          acc +
          Math.floor(
            x.content.length / 4 +
              (x.role == "function" ? x.name.length / 4 : 0)
          ),
        0
      ),
    });

    return await sseOpenAI({
      messages: messagestoSend,
      setUserMessageTokenCount(tokenCount) {
        updateMessageByID(messageID, {
          tokens: tokenCount,
        });
      },
      updateMessage: (message) => {
        updateMessageByID(responseID, message);
      },
      updateFunctionCall(fcID, fc) {
        updateFunctionCallByID(responseID, fcID, fc);
      },
      showNewFunctionCall(fc) {
        updateMessageByID(responseID, {
          function_calls: [fc],
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
        // clear_chat: {
        //   description:
        //     "Clears the chat history for the user. Make sure to confirm with the user, and don't call if there's no chat history.",
        //   parameters: {
        //     type: "object",
        //     properties: {},
        //   },
        //   execute() {
        //     inputRef.current!.innerText = "";
        //     messages.value = [];
        //     return [true, false, null];
        //   },
        // },
        evaluate_math: {
          description:
            "Evaluates a mathematical expression. Use if asked about problems that require math to be done.",
          parameters: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "The expression to evaluate.",
              },
              scope: {
                type: "object",
                description:
                  "The scope to use for the expression. For example, if you want to evaluate `x + 2` with `x` being 3, you would pass `{x: 3}` as the scope.",
              },
              endConversation: {
                type: "boolean",
                description:
                  "Whether or not to end the conversation after this function call.",
              },
            },
            required: ["expression"],
          },
          execute(args) {
            let scope = {};
            if (typeof args.scope == "object") {
              scope = args.scope;
            }
            if (typeof args.scope == "string") {
              try {
                scope = JSON.parse(args.scope);
              } catch (e) {
                return [false, true, "Invalid scope JSON"];
              }
            }
            try {
              const result = math.evaluate(args.expression, scope);
              console.log(`[evaluate_math] ${args.expression} = ${result}`);
              return [
                true,
                args.endConversation || true,
                `Expression ran: ${args.expression}\nScope: ${JSON.stringify(
                  scope
                )}\nResult: ${result}`,
              ];
            } catch (e) {
              let detectableErrors = [
                [args.expression.includes("**"), "Invalid operator **, use ^"],
                [
                  args.expression.includes("//"),
                  "Invalid operator //, use / and floor() if you want to floor the result",
                ],
                [
                  args.expression.includes("/*"),
                  "Invalid operator /*, use / and ceil() if you want to ceil the result",
                ],
                [
                  args.expression.includes("*/"),
                  "Invalid operator */, use / and ceil() if you want to ceil the result",
                ],
              ].filter((i) => i[0]);
              return [
                false,
                true,
                `Expression ran: ${args.expression}\nScope: ${JSON.stringify(
                  scope
                )}\nError: ${(e as Error).message})}\n${
                  detectableErrors.length > 0
                    ? `\n\nPossible fixes:\n${detectableErrors
                        .map((i) => i[1])
                        .join("\n")}`
                    : ""
                }\nPlease fix the error and try again.`,
              ];
            }
          },
        },

        run_code: {
          description:
            "Runs code in a given language and returns the output. Use if asked about problems that require code to be run, or if you want to verify your answer. You should format any code output in markdown codeblocks.",
          parameters: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description:
                  "Code to run. NOTE: You must add statements such as print in python or console.log in js to get any valid stdout output from the function.",
              },
              language: {
                type: "string",
                description: "The language to use for execution.",
              },
              stdin: {
                type: "string",
                description: "The text to pass as stdin to the program.",
              },
              args: {
                type: "array",
                description: "The arguments to pass to the program.",
                items: {
                  type: "string",
                },
              },
              endConversation: {
                type: "boolean",
                description:
                  "Whether or not to end the conversation after running the code.",
              },
            },
            required: ["code", "language"],
          },
          async execute(args) {
            if (!args.code || !args.language) {
              return [false, false, "No code provided."];
            }
            try {
              let runtimes: PistonRuntime[] = JSON.parse(
                localStorage.getItem("piston-runtimes") || "[]"
              );
              if (runtimes.length == 0) {
                const data = await fetch(
                  "https://emkc.org/api/v2/piston/runtimes"
                );
                runtimes = await data.json();
                runtimes[
                  runtimes.findIndex((i) => i.runtime == "node")!
                ].aliases.push("nodejs");
                runtimes[
                  runtimes.findIndex((i) => i.runtime == "deno")!
                ].aliases.push("denojs");
                localStorage.setItem(
                  "piston-runtimes",
                  JSON.stringify(runtimes)
                );
              }

              let language = runtimes.find(
                (i) =>
                  i.language == args.language ||
                  i.aliases.includes(args.language) ||
                  i.runtime == args.language
              ) as PistonRuntime;
              if (!language)
                return [
                  false,
                  false,
                  `Runtime for language ${args.language} not found.`,
                ];

              const data = await fetch(
                "https://emkc.org/api/v2/piston/execute",
                {
                  method: "POST",
                  body: JSON.stringify({
                    language: language.language,
                    version: language.version,
                    files: [
                      {
                        name: "main",
                        content: args.code,
                      },
                    ],
                    stdin: args.stdin || "",
                    args: args.args || [],
                  }),
                }
              );
              const result = await data.json();
              console.log(
                `[run_code piston] ${language.language} ${result.run.stdout} ${result.run.stderr}`
              );

              return [
                true,
                args.endConversation || true,
                `Code Ran: ${args.code}\nProcess Exit Code: ${
                  result.run.code
                }\nStdout: ${result.run.stdout || "Empty"}\nStderr:${
                  result.run.stderr || "Empty"
                }${
                  result.run.stdout + result.run.stderr == ""
                    ? `\nWarning: No output was returned. This is not a REPL, and acts as if you executed a file of said language with the contents being the code provided, so please make sure any statements are wrapped in print/log statements, then run the fixed code again if needed.`
                    : ""
                }`,
              ];
            } catch (e) {
              console.error(e);
              return [false, false, "Error executing code..."];
            }
          },
        },
        search_web: {
          description:
            "Searches the web for a query and returns a few results with URLs and brief content that can be searched further with `search_web_more`. Use if asked about topics that you may be unsure about or those that require more context and or up-to-date knowledge. You can use search operators such as `site:`, `inurl:`, `intitle:`, `-term`, `+term`, etc. to narrow down your search.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The query to search for.",
              },
            },
            required: ["query"],
          },
          async execute(args) {
            try {
              const data = await fetch(
                `${teamsEndpoint}/html_proxy?url=${encodeURIComponent(
                  `https://duckduckgo.com/html/?q=${args.query}`
                )}`
              );
              const html = await data.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");
              const zciResults = [...doc.querySelectorAll(".zci__result")]
                .map((element) => {
                  return {
                    url: element.querySelector("a")?.getAttribute("href") || "",
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
              const sources = [...zciResults, ...searchResults.slice(0, 5)];

              console.log(
                `[search_web] "${args.query}": ${sources.length} results`,
                sources
              );
              return [true, true, JSON.stringify(sources.filter(Boolean))];
            } catch (e) {
              console.log(e);
              return [false, false, null];
            }
          },
        },
        get_text_from_urls: {
          description:
            "Gets the content of one or more URLs. Can be used in junction with search_web to get detailed information about a topic.",
          parameters: {
            type: "object",
            properties: {
              urls: {
                type: "array",
                description: "The URLs to get the content of.",
                items: {
                  type: "string",
                },
              },
            },
            required: ["urls"],
          },
          async execute(args) {
            if (!args.urls || args.urls.length == 0)
              return [false, false, "No URLs provided."];
            const urls = args.urls;
            const sources = urls
              .map(async (url: string) => {
                try {
                  console.log(`[get_text_from_urls] ${url}`);
                  const data = await fetch(
                    `${teamsEndpoint}/html_proxy?url=${encodeURIComponent(url)}`
                  );

                  const html = await data.text();
                  const deny = [
                    "nav",
                    "aside",
                    "footer",
                    "script",
                    "style",
                    "link",
                    "meta",
                    "noscript",
                    "iframe",
                    "object",
                    "header",
                    "video",
                    "audio",
                    "svg",
                    "img",
                    "picture",
                    "canvas",
                    "map",
                    "object",
                    "embed",
                    "param",
                    "source",
                    "track",
                    "math",
                    "button",
                    "input",
                    "textarea",
                    "select",
                    "option",
                    "optgroup",
                    "fieldset",
                    "progress",
                    "head",
                  ];
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, "text/html");
                  [...doc.querySelectorAll(deny.join(","))].forEach(
                    (element) => {
                      // replce with \n text node
                      element.replaceWith(doc.createTextNode("\n\n"));
                    }
                  );
                  let text = doc.body.textContent?.trim();
                  // remove extra spaces
                  text = text?.replace(/\s{2,}/g, " ");
                  // remove extra newlines
                  text = text?.replace(/\n{3,}/g, "\n");
                  // remove extra tabs
                  text = text?.replace(/\t{2,}/g, " ");
                  console.log(`[get_text_from_urls] ${url}\n\n${text}`);
                  return text;
                } catch (e) {
                  console.log(e);
                  return null;
                }
              })
              .filter(Boolean);

            return [true, true, JSON.stringify(await Promise.all(sources))];
          },
        },
      },
    });
  }
};
