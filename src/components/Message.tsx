import clsx from "clsx";
import * as AdaptiveCards from "adaptivecards";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { handleCardAction } from "@/utils/modules/teams_mode";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Highlighter, Lang } from "shiki";
import { MessageType } from "@/utils/MessageType";
import {
  modelPricingPerInputToken,
  modelPricingPerOutputToken,
} from "@/utils/models";
const tag_class = `bg-[rgb(12,12,13)] border-zinc-800 border justify-center items-center rounded-lg text-center text-xs px-2.5 py-1.5 w-fit`;
const supportedLangs = [
  "abap",
  "actionscript-3",
  "ada",
  "apache",
  "apex",
  "apl",
  "applescript",
  "ara",
  "asm",
  "astro",
  "awk",
  "ballerina",
  "bat",
  "batch",
  "beancount",
  "berry",
  "be",
  "bibtex",
  "bicep",
  "blade",
  "c",
  "cadence",
  "cdc",
  "clarity",
  "clojure",
  "clj",
  "cmake",
  "cobol",
  "codeql",
  "ql",
  "coffee",
  "cpp",
  "crystal",
  "csharp",
  "c#",
  "cs",
  "css",
  "cue",
  "cypher",
  "cql",
  "d",
  "dart",
  "dax",
  "diff",
  "docker",
  "dockerfile",
  "dream-maker",
  "elixir",
  "elm",
  "erb",
  "erlang",
  "erl",
  "fish",
  "fsharp",
  "f#",
  "fs",
  "gdresource",
  "gdscript",
  "gdshader",
  "gherkin",
  "git-commit",
  "git-rebase",
  "glimmer-js",
  "gjs",
  "glimmer-ts",
  "gts",
  "glsl",
  "gnuplot",
  "go",
  "graphql",
  "groovy",
  "hack",
  "haml",
  "handlebars",
  "hbs",
  "haskell",
  "hs",
  "hcl",
  "hjson",
  "hlsl",
  "html",
  "http",
  "imba",
  "ini",
  "properties",
  "java",
  "javascript",
  "js",
  "jinja-html",
  "jison",
  "json",
  "json5",
  "jsonc",
  "jsonl",
  "jsonnet",
  "jssm",
  "fsl",
  "jsx",
  "julia",
  "kotlin",
  "kusto",
  "kql",
  "latex",
  "less",
  "liquid",
  "lisp",
  "logo",
  "lua",
  "make",
  "makefile",
  "markdown",
  "md",
  "marko",
  "matlab",
  "mdx",
  "mermaid",
  "narrat",
  "nar",
  "nextflow",
  "nf",
  "nginx",
  "nim",
  "nix",
  "objective-c",
  "objc",
  "objective-cpp",
  "ocaml",
  "pascal",
  "perl",
  "php",
  "plsql",
  "postcss",
  "powerquery",
  "powershell",
  "ps",
  "ps1",
  "prisma",
  "prolog",
  "proto",
  "pug",
  "jade",
  "puppet",
  "purescript",
  "python",
  "py",
  "r",
  "raku",
  "perl6",
  "razor",
  "reg",
  "rel",
  "riscv",
  "rst",
  "ruby",
  "rb",
  "rust",
  "rs",
  "sas",
  "sass",
  "scala",
  "scheme",
  "scss",
  "shaderlab",
  "shader",
  "shellscript",
  "bash",
  "console",
  "sh",
  "shell",
  "zsh",
  "smalltalk",
  "solidity",
  "sparql",
  "sql",
  "ssh-config",
  "stata",
  "stylus",
  "styl",
  "svelte",
  "swift",
  "system-verilog",
  "tasl",
  "tcl",
  "tex",
  "toml",
  "tsx",
  "turtle",
  "twig",
  "typescript",
  "ts",
  "v",
  "vb",
  "cmd",
  "verilog",
  "vhdl",
  "viml",
  "vim",
  "vimscript",
  "vue-html",
  "vue",
  "vyper",
  "vy",
  "wasm",
  "wenyan",
  "文言",
  "wgsl",
  "wolfram",
  "xml",
  "xsl",
  "yaml",
  "yml",
  "zenscript",
];
const preClass =
  "rounded-lg border px-1 py-0.5 border-zinc-800 inline-block text-xs leading-[0.9rem] !bg-transparent whitespace-pre";

const all_functions = [
  "search_web",
  "get_text_from_urls",
  "run_code",
  "evaluate_math",
];
const fcUIMap: {
  [key: string]: (name: string, args: any) => { icon: string; message: string };
} = {
  search_web: (name, args) => ({
    // icon: "M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z",
    icon: "M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z",
    message: `Searching ${args.query ? `for \`${args.query}\`` : "the web..."}`,
  }),
  get_text_from_urls: (name, args) => {
    return {
      icon: "M216,36H40A20,20,0,0,0,20,56V200a20,20,0,0,0,20,20H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36Zm-4,24V84H44V60ZM44,196V108H212v88Z",
      message: `Getting text from ${
        args.urls
          ? args.urls.length > 4
            ? `${args.urls.length} search results...`
            : args.urls
                .map((url: string) => {
                  const nu = new URL(url);
                  return `<a href="${url}" class="underline hover:text-purple-300 transition-colors"  target="_blank">${
                    nu.hostname.replace(/^www\./, "") +
                    nu.pathname.slice(0, 15) +
                    (nu.pathname.length > 15 ? "..." : "")
                  }</a>`;
                })
                .join(", ")
                .replace(/,([^,]*)$/, " and$1")
          : "results"
      }`,
    };
  },
  run_code: (name, args) => ({
    icon: "M71.68,97.22,34.74,128l36.94,30.78a12,12,0,1,1-15.36,18.44l-48-40a12,12,0,0,1,0-18.44l48-40A12,12,0,0,1,71.68,97.22Zm176,21.56-48-40a12,12,0,1,0-15.36,18.44L221.26,128l-36.94,30.78a12,12,0,1,0,15.36,18.44l48-40a12,12,0,0,0,0-18.44ZM164.1,28.72a12,12,0,0,0-15.38,7.18l-64,176a12,12,0,0,0,7.18,15.37A11.79,11.79,0,0,0,96,228a12,12,0,0,0,11.28-7.9l64-176A12,12,0,0,0,164.1,28.72Z",
    message: `Running ${
      args.code && args.language
        ? `${args.code.split("\n").length} line${
            args.code.split("\n").length > 1 ? "s" : ""
          } of ${args.language} code`
        : "code of unknown language"
    }`,
  }),
  evaluate_math: (name, args) => ({
    icon: "M208.49,64.49l-144,144a12,12,0,0,1-17-17l144-144a12,12,0,0,1,17,17ZM60,112a12,12,0,0,0,24,0V84h28a12,12,0,0,0,0-24H84V32a12,12,0,0,0-24,0V60H32a12,12,0,0,0,0,24H60Zm164,60H144a12,12,0,0,0,0,24h80a12,12,0,0,0,0-24Z",
    message: `Evaluating math expression${
      args.expression ? ` \`${args.expression}\`` : ""
    }`,
  }),
  default: (name, args) => ({
    icon: "M212,40a12,12,0,0,1-12,12H170.71A20,20,0,0,0,151,68.42L142.38,116H184a12,12,0,0,1,0,24H138l-9.44,51.87A44,44,0,0,1,85.29,228H56a12,12,0,0,1,0-24H85.29A20,20,0,0,0,105,187.58L113.62,140H72a12,12,0,0,1,0-24h46l9.44-51.87A44,44,0,0,1,170.71,28H200A12,12,0,0,1,212,40Z",
    message: `Called ${
      all_functions.includes(name)
        ? `function \`${name}\``
        : `non-existent function \`${name}\``
    }`,
  }),
};

export const Message = ({
  message,
  highlighter,
}: {
  message: MessageType;
  highlighter: Highlighter | undefined;
}) => {
  const { tags, sender, type, isLoading } = message;

  const [cardHidden, setCardHidden] = useState(false);
  const [showingPrice, setShowingPrice] = useState(false);
  const textDisplay = useRef<HTMLParagraphElement>(null);
  const cardDisplay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isLoading && message.content && type == "card") {
      const card = new AdaptiveCards.AdaptiveCard();
      card.parse(message.content);
      card.onExecuteAction = handleCardAction;
      const elem = card.render();
      if (cardDisplay.current?.firstChild) {
        cardDisplay.current.removeChild(cardDisplay.current.firstChild);
      }
      if (elem) cardDisplay.current!.appendChild(elem);
    }
  }, [isLoading, message.content, type]);

  // const memoizedFunctionCalls = useMemo(
  //   () =>
  //     message.function_calls?.map((f) => {
  //       let args: any = {};
  //       try {
  //         args = JSON.parse(f.args);
  //         if (typeof args == "string") args = JSON.parse(args);
  //       } catch (e) {
  //         // console.log(e);
  //       }
  //       const fcUI = (fcUIMap[f.name] || fcUIMap["default"])(f.name, args);
  //       const [animated, setAnimated] = useState(false);
  //       useEffect(() => {
  //         setTimeout(() => setAnimated(true), 150);
  //       }, []);

  //       return (
  //         <div
  //           class={clsx(
  //             `flex text-xs items-center leading-5 transition-all`,
  //             f.success == false ? "text-red-300" : "text-zinc-300",
  //             // f.isLoading && "animate-pulse",
  //             animated ? "opacity-100" : "opacity-0"
  //           )}
  //         >
  //           <svg
  //             xmlns="http://www.w3.org/2000/svg"
  //             class={
  //               "min-w-[0.95rem] w-[0.95rem] min-h-[0.95rem] h-[0.95rem] mr-1.5"
  //             }
  //             fill="currentColor"
  //             viewBox="0 0 256 256"
  //           >
  //             <path d={fcUI.icon}></path>
  //           </svg>
  //           <span
  //             dangerouslySetInnerHTML={{
  //               __html: fcUI.message.replace(
  //                 // replace ` ` with <code> block
  //                 /`([^`]*)`/g,
  //                 (_, p1) =>
  //                   `<code class="${preClass} !text-[0.7rem] h-[20px]">${p1}</code>`
  //               ),
  //             }}
  //           ></span>
  //         </div>
  //       );
  //     }),
  //   [message.function_calls]
  // );

  return (
    <div class={clsx(`py-5 text-white w-full`)}>
      <div class="flex flex-col gap-2 px-7 w-full">
        <div class="flex gap-1">
          <div
            class={tag_class}
            dangerouslySetInnerHTML={{
              __html:
                sender == "user"
                  ? "😸 You"
                  : sender.startsWith("@")
                  ? sender.split("@")[1]
                  : `🤖 ${sender}`,
            }}
          ></div>
          {message.tokens && message.model.startsWith("openai") && (
            <button
              class={clsx(tag_class, "hidden xs:flex")}
              onClick={() => {
                if (
                  message.sender != "user"
                    ? modelPricingPerOutputToken[
                        message.model.split(
                          "_epteams"
                        )[0] as keyof typeof modelPricingPerOutputToken
                      ]
                    : modelPricingPerInputToken[
                        message.model.split(
                          "_epteams"
                        )[0] as keyof typeof modelPricingPerInputToken
                      ]
                )
                  setShowingPrice(!showingPrice);
              }}
            >
              {showingPrice
                ? `~$${(
                    (message.sender != "user"
                      ? modelPricingPerOutputToken[
                          message.model.split(
                            "_epteams"
                          )[0] as keyof typeof modelPricingPerOutputToken
                        ]
                      : modelPricingPerInputToken[
                          message.model.split(
                            "_epteams"
                          )[0] as keyof typeof modelPricingPerInputToken
                        ]) * message.tokens
                  )
                    .toFixed(7)
                    .replace(/\.?0+$/, "")}`
                : `${message.tokens} token${message.tokens == 1 ? "" : "s"}`}
            </button>
          )}

          {(tags || []).map((tag) => (
            <div class={clsx(tag_class, "hidden xs:flex")}>{tag}</div>
          ))}
          <div className="flex-grow"></div>

          {!isLoading && type == "text" && (
            <button
              class={`py-1.5 px-1.5 sm:px-3 text-white bg-[rgb(12,12,13)] border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs h-full hover:bg-zinc-900 transition-colors gap-1.5 w-fit`}
              onClick={() => {
                let text = textDisplay.current!.innerText;
                text = text.replace(
                  /You replied to a message, so you are in a conversation with \d+? message(s?)\.?/g,
                  ""
                );
                text = text.replace(
                  " 🚀 This request used the 16384 token limit.",
                  ""
                );
                navigator.clipboard.writeText(text.trim());
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
              </svg>
              <span class="hidden sm:block">Copy Text</span>
            </button>
          )}

          {!isLoading &&
            message.content &&
            (type == "text"
              ? ["<", ">", "`", "*", "_", "~", "|"].some((c) =>
                  message.content?.includes(c)
                )
              : true) && (
              <button
                class={`py-1.5 px-1.5 sm:px-3 text-white bg-[rgb(12,12,13)] border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs h-full hover:bg-zinc-900 transition-colors gap-1.5 w-fit`}
                onClick={() => {
                  navigator.clipboard.writeText(
                    typeof message.content == "object"
                      ? JSON.stringify(message.content, null, 2)
                      : message.content?.replace(
                          /\s?itemprop="rssbot-cpt-encoding####.*?"/g,
                          ""
                        ) || ""
                  );
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z"></path>
                </svg>
                <span class="hidden sm:block">
                  Copy {type == "card" ? "Code" : "HTML"}
                </span>
              </button>
            )}

          {!isLoading && type == "card" && (
            <button
              class={`py-1.5 px-1.5 sm:px-3 text-white bg-[rgb(12,12,13)] border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs h-full hover:bg-zinc-900 transition-colors gap-1.5 w-fit`}
              onClick={() => {
                setCardHidden(!cardHidden);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                {cardHidden ? (
                  <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                ) : (
                  <path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z"></path>
                )}
              </svg>

              <span class="hidden sm:block">
                {cardHidden ? "Show" : "Hide"} Card
              </span>
            </button>
          )}
        </div>
        {(isLoading || !message.content) && (
          <div className="flex text-sm items-center gap-1.5">
            <svg
              class="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </div>
        )}

        {/* {memoizedFunctionCalls && (
          <div className="flex flex-col space-y-1">{memoizedFunctionCalls}</div>
        )} */}

        <div className="flex flex-col space-y-1">
          {message.function_calls?.map((f) => {
            let args: any = {};
            try {
              args = JSON.parse(f.args);
              if (typeof args == "string") args = JSON.parse(args);
            } catch (e) {
              // console.log(e);
            }
            const fcUI = (fcUIMap[f.name] || fcUIMap["default"])(f.name, args);
            const [animated, setAnimated] = useState(false);
            useEffect(() => {
              setTimeout(() => setAnimated(true), 150);
            }, []);

            return (
              <div
                class={clsx(
                  `flex text-xs items-center leading-5 transition-all`,
                  f.success == false ? "text-red-300" : "text-zinc-300",
                  // f.isLoading && "animate-pulse",
                  animated ? "opacity-100" : "opacity-0"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class={
                    "min-w-[0.95rem] w-[0.95rem] min-h-[0.95rem] h-[0.95rem] mr-1.5"
                  }
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d={fcUI.icon}></path>
                </svg>
                <span
                  dangerouslySetInnerHTML={{
                    __html: fcUI.message.replace(
                      // replace ` ` with <code> block
                      /`([^`]*)`/g,
                      (_, p1) =>
                        `<code class="${preClass} !text-[0.7rem] h-[20px]">${p1}</code>`
                    ),
                  }}
                ></span>
              </div>
            );
          })}
        </div>

        {!isLoading && message.content && type != "card" && (
          <p
            class={clsx(
              "text-sm  text-gray-200 block",
              type != "text" && "font-italic text-gray-400"
            )}
            id="message-text-display"
            ref={textDisplay}
          >
            <ReactMarkdown
              children={message.content}
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                code({
                  node,
                  inline,
                  className,
                  children,
                  ...props
                }: {
                  node: any;
                  inline: boolean;
                  className: string;
                  children: any;
                }) {
                  const largePreClass = `${preClass}  w-full my-1 !p-0`;
                  const match = /language-(\w+)/.exec(className || "");
                  let content = String(children).replace(/\n$/, "");
                  const CopyButton = (
                    <button
                      class="p-1 m-1 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-800 transition-colors h-min float-right"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          String(children).replace(/\n$/, "")
                        );
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 256 256"
                      >
                        <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
                      </svg>
                    </button>
                  );

                  if (
                    match &&
                    highlighter &&
                    supportedLangs.includes(match[1])
                  ) {
                    try {
                      if (
                        !highlighter
                          .getLoadedLanguages()
                          .includes(match[1] as Lang)
                      ) {
                        highlighter.loadLanguage(match[1] as Lang);
                        throw new Error(
                          "Language not loaded - trying to load..."
                        );
                      }
                      content = highlighter!.codeToHtml(content, {
                        theme: "min-dark",
                        lang: match[1],
                      });

                      return (
                        <pre class={`${largePreClass} !p-0`}>
                          {CopyButton}
                          <pre
                            class="mx-3 my-2"
                            dangerouslySetInnerHTML={{ __html: content }}
                          ></pre>
                        </pre>
                      );
                    } catch (e) {
                      console.log((e as Error).message);
                      return (
                        <pre class={largePreClass}>
                          {CopyButton}

                          <pre class="mx-3 my-2">
                            <code class={`language-${match[1]}`} {...props}>
                              {content}
                            </code>
                          </pre>
                        </pre>
                      );
                    }
                  }
                  return content.includes("\n") ? (
                    <pre class={largePreClass}>
                      {CopyButton}
                      <pre className="mx-3 my-2">
                        <code {...props}>{content}</code>
                      </pre>
                    </pre>
                  ) : (
                    <code class={preClass}>{content}</code>
                  );
                },
              }}
            ></ReactMarkdown>
          </p>
        )}

        {!isLoading && message.content && type == "card" && (
          <p
            class={clsx(`text-sm whitespace-pre-wrap`, cardHidden && "hidden")}
            ref={cardDisplay}
          ></p>
        )}
      </div>
    </div>
  );
};
