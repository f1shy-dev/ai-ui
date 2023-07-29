import {
  SSE,
  SSEOptionsMethod,
  CustomEventType,
  CustomEventDataType,
} from "sse-ts";
import { openAIChatEndpoint, openAIKey } from "./auth";
import type { JSONSchema4Object } from "json-schema";
import { settings } from "./settings";
import { FunctionCall, MessageType } from "./MessageType";
import { nanoid } from "nanoid";
export type OpenAIMessage =
  | {
      role: "system" | "assistant" | "user";
      content: string;
    }
  | {
      role: "function";
      name: string;
      content: string;
    };
export type OpenAISSEOptions = {
  headers?: {
    [key: string]: string;
  };
  messages: OpenAIMessage[];
  functions?: {
    [key: string]: {
      description: string;
      parameters: JSONSchema4Object;

      execute: (args: {
        [key: string]: any;
      }) =>
        | [boolean, boolean, string | null]
        | Promise<[boolean, boolean, string | null]>;
    };
  };
  setUserMessageTokenCount: (tokenCount: number) => void;
  updateMessage: (message: Partial<MessageType>) => void;
  updateFunctionCall?: (id: string, fc: Partial<FunctionCall>) => void;
  showNewFunctionCall?: (fc: FunctionCall) => void;
  handleErrorMessage: (message: string) => void;
  passoverTokenCount?: number;
  passoverFinalMessage?: string;
};

const statusMap = {
  401: "There was an error authenticating you - please check your API key.",
  429: "You've hit the rate limit for this API key - please wait a few minutes and try again.",
  500: "There was an error with OpenAI's servers - {{msg}}",
  503: "The model you're using is currently unavailable - please try again later.",
  0: "There was an error trying to get a response from OpenAI - {{msg}}",
};

const modelMap: {
  [key: string]: string;
} = {
  openai_gpt3_auto: "gpt-3.5-turbo",
  openai_gpt3_16k: "gpt-3.5-turbo-16k",
  openai_gpt4_auto: "gpt-4",
  openai_gpt4_32k: "gpt-4-32k",
};

export const sseOpenAI = async (options: OpenAISSEOptions) => {
  let source = new SSE(openAIChatEndpoint, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIKey.value}`,
      ...options.headers,
    },
    method: SSEOptionsMethod.POST,
    payload: JSON.stringify({
      stream: true,
      //   function_call: options.functions ? "auto" : "none",
      functions: Object.keys(options.functions || {}).map((key) => ({
        name: key,
        description: options.functions![key].description,
        parameters: options.functions![key].parameters,
      })),
      messages: options.messages,
      model: modelMap[settings.peek().model],
      //   temperature: 0.5,
    }),
  });

  let finalMessage = options.passoverFinalMessage || "";
  let deltaFC: any = {};
  let hasContributed = false;
  let tokenCount = options.passoverTokenCount || 0;
  source.addEventListener("message", async (event: CustomEventType) => {
    const dataEvent = event as CustomEventDataType;

    if (dataEvent.data == "[DONE]") {
      hasContributed = true;
      return source.close();
    }

    const payload = JSON.parse(dataEvent.data);
    const delta = payload.choices[0].delta;
    const content = delta.content;
    const function_call = delta.function_call;
    const finish_reason = payload.choices[0].finish_reason;
    if (function_call) {
      if (!deltaFC.name) deltaFC = function_call;
      else if (deltaFC.arguments != null && function_call.arguments != null) {
        deltaFC.arguments += function_call.arguments;
      }
    }

    if (finish_reason == "function_call") {
      try {
        if (!deltaFC.name) throw "no name";
        console.log(`[sse] function call`, deltaFC.name, deltaFC.arguments);
        const fcID = nanoid();
        options.showNewFunctionCall?.({
          name: deltaFC.name,
          id: fcID,
          isLoading: true,
          args: JSON.stringify(deltaFC.arguments),
        });
        hasContributed = true;
        source.close();
        let args = {};
        if (deltaFC.arguments != "{}") {
          try {
            args = JSON.parse(deltaFC.arguments);
          } catch (e) {
            console.log(e);
            console.log(`[sse] function call rejected, retrying`);
            options.updateFunctionCall?.(fcID, {
              isLoading: false,
              success: false,
            });
            const funcMsg: OpenAIMessage = {
              role: "function",
              name: deltaFC.name,
              content: `You ran the function \`${
                deltaFC.name
              }\`, with the arguments \`${
                deltaFC.arguments
              }\`, but the arguments weren't valid JSON${
                !(options.functions && options.functions[deltaFC.name])
                  ? ` and that function doesn't exist. The functions that do exist are: ${Object.keys(
                      options.functions || {}
                    ).join(", ")}`
                  : ``
              }. Parsing error: ${(e as Error).message}${
                deltaFC.arguments.includes("`")
                  ? ". Possible fix: you used backticks (not valid JSON) instead of normal quotes and the \n character"
                  : ""
              }. Please fix this issue and try execute the correct function again with proper arguments.`,
            };
            return await sseOpenAI({
              ...options,
              messages: [...options.messages, funcMsg],
              passoverTokenCount:
                tokenCount +
                Math.floor(funcMsg.content.length / 4) +
                Math.floor(funcMsg.name.length / 4),
              passoverFinalMessage: finalMessage,
            });
          }
        }
        if (options.functions && options.functions[deltaFC.name]) {
          try {
            const [success, shouldContinue, message] = await options.functions[
              deltaFC.name
            ].execute(args);
            if (!success) {
              options.updateFunctionCall?.(fcID, {
                isLoading: false,
                success: false,
              });
              if (shouldContinue) {
                const funcMsg: OpenAIMessage = {
                  role: "function",
                  name: deltaFC.name,
                  content: `There was an error executing the function \`${deltaFC.name}\` - the result: ${message}`,
                };
                return await sseOpenAI({
                  ...options,
                  messages: [...options.messages, funcMsg],
                  passoverTokenCount:
                    tokenCount +
                    Math.floor(funcMsg.content.length / 4) +
                    Math.floor(funcMsg.name.length / 4),
                  passoverFinalMessage: finalMessage,
                });
              }

              return options.handleErrorMessage(
                `There was an error executing the function \`${deltaFC.name}\`${
                  message ? ` - ${message}` : ""
                }`
              );
            }

            options.updateFunctionCall?.(fcID, {
              isLoading: false,
              success: true,
              result: message || undefined,
            });

            if (!shouldContinue)
              return options.handleErrorMessage(
                message
                  ? `The function \`${deltaFC.name}\` has stopped the conversation - ${message}`
                  : `The function \`${deltaFC.name}\` has stopped the conversation.`
              );

            const funcMsg: OpenAIMessage = {
              role: "function",
              name: deltaFC.name,
              content: message || "",
            };
            return await sseOpenAI({
              ...options,
              messages: [...options.messages, funcMsg],
              passoverTokenCount:
                tokenCount +
                Math.floor(funcMsg.content.length / 4) +
                Math.floor(funcMsg.name.length / 4),
              passoverFinalMessage: finalMessage,
            });
          } catch (e) {
            return options.handleErrorMessage(
              `There was an client-side error executing the function \`${
                deltaFC.name
              }\`${(e as Error).message ? ` - ${(e as Error).message}` : ""}`
            );
          }
        } else {
          return options.handleErrorMessage(
            `The model called a function that wasn't defined.`
          );
        }
        // return options.handleFunction(deltaFC.name, args);
      } catch (e) {
        console.log(e);
        return options.handleErrorMessage(
          `There was an error trying to process the function that the model called.`
        );
      }
    }
    if (content == undefined || content == null) return;
    tokenCount++;
    hasContributed = true;
    finalMessage += content;
    // return options.updateMessage(finalMessage, tokenCount);
    return options.updateMessage({
      isLoading: false,
      type: "text",
      content: finalMessage,
      tokens: tokenCount,
    });
  });

  source._onStreamFailure = (e) => {
    hasContributed = true;
    const xml = e.target as XMLHttpRequest;
    if (e.type == "abort" || xml.status == 0) {
      source.close();
      return console.log("[sse] aborted (finished)");
    }
    console.log(`[sse] error ${xml.status}`, xml.responseText, e);

    if (xml.responseText && xml.responseText.includes("{")) {
      const error = JSON.parse(xml.responseText);
      if (statusMap[xml.status as keyof typeof statusMap]) {
        return options.handleErrorMessage(
          statusMap[xml.status as keyof typeof statusMap].replace(
            "{{msg}}",
            error?.error?.message || xml.statusText || xml.responseText
          )
        );
      } else {
        return options.handleErrorMessage(
          `An error occurred with the model: ${
            error?.error?.message ||
            `HTTP status code ${xml.status}. See console for more details.`
          }`
        );
      }
    }

    return options.handleErrorMessage(
      (statusMap[xml.status as keyof typeof statusMap] || statusMap[0]).replace(
        "{{msg}}",
        xml.statusText || xml.responseText
      )
    );
  };

  source.stream();

  setTimeout(() => {
    if (!hasContributed) {
      console.log(`[sse] aborted (timeout)`);
      source.close();
      return options.handleErrorMessage(
        "The model didn't respond in time - please try again."
      );
    }
  }, 60000);
};
