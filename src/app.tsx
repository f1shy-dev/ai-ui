import { useEffect, useRef, useState } from "preact/hooks";
import { Message } from "./components/Message";
import { Highlighter, getHighlighter, setCDN } from "shiki";
import { messages } from "./utils/chatUtils";
import { scrollChatView } from "./utils/chatUtils";
import { models, setComputedModel } from "./utils/models";
import { handleSubmit } from "./utils/handleSubmit";
import { authenticateOpenAI, authenticateTeams } from "./utils/auth";
import { LoginBox } from "./components/Login";
import {
  AuthState,
  openAIAuthState,
  teamsAuthState,
  updateAuthStates,
} from "./utils/authState";
import { SettingsModal } from "./components/SettingsModal";
import { settings } from "./utils/settings";

export function App() {
  const [highlighter, setHighlighter] = useState<Highlighter>();

  useEffect(() => {
    (async () => {
      setCDN("https://unpkg.com/shiki/");
      if (!highlighter) {
        const h = await getHighlighter({
          theme: "min-dark",
          langs: [
            "javascript",
            "typescript",
            "python",
            "csharp",
            "cpp",
            "html",
            "css",
          ],
        });
        setHighlighter(h);
      }
    })();
  }, []);

  useEffect(() => {
    updateAuthStates();
    setComputedModel();
    scrollChatView();
  }, []);

  const inputRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // if no network connection
  if (!navigator.onLine) {
    return (
      <>
        <div class="bg-[rgb(20,20,22)] w-screen fixed top-0 left-0 h-full flex flex-col items-center justify-center text-gray-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-10 h-10"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <path d="M213.92,210.62a8,8,0,1,1-11.84,10.76l-52-57.15a60,60,0,0,0-57.41,7.24,8,8,0,1,1-9.42-12.93A75.43,75.43,0,0,1,128,144c1.28,0,2.55,0,3.82.1L104.9,114.49A108,108,0,0,0,61,135.31,8,8,0,0,1,49.73,134,8,8,0,0,1,51,122.77a124.27,124.27,0,0,1,41.71-21.66L69.37,75.4a155.43,155.43,0,0,0-40.29,24A8,8,0,0,1,18.92,87,171.87,171.87,0,0,1,58,62.86L42.08,45.38A8,8,0,1,1,53.92,34.62ZM128,192a12,12,0,1,0,12,12A12,12,0,0,0,128,192ZM237.08,87A172.3,172.3,0,0,0,106,49.4a8,8,0,1,0,2,15.87A158.33,158.33,0,0,1,128,64a156.25,156.25,0,0,1,98.92,35.37A8,8,0,0,0,237.08,87ZM195,135.31a8,8,0,0,0,11.24-1.3,8,8,0,0,0-1.3-11.24,124.25,124.25,0,0,0-51.73-24.2A8,8,0,1,0,150,114.24,108.12,108.12,0,0,1,195,135.31Z"></path>
          </svg>
          <span class="text-lg font-semibold text-center">
            No Network Connection
          </span>
          <span class="text-xs mt-2 mx-4 text-center">
            LocalAI requires an internet connection to function. Please check
            your connection and try again.
          </span>
        </div>
      </>
    );
  }

  if (
    (teamsAuthState.value == AuthState.NoAuth ||
      teamsAuthState.value == AuthState.InvalidAuth) &&
    (openAIAuthState.value == AuthState.NoAuth ||
      openAIAuthState.value == AuthState.InvalidAuth)
  ) {
    return (
      <>
        <div class="bg-[rgb(20,20,22)] w-screen fixed top-0 left-0 h-full flex flex-col items-center justify-center">
          <div class="flex flex-col xs:mx-4 w-full max-w-[400px] max-h-[300px] text-gray-400">
            <span class="text-lg font-semibold">Login to LocalAI</span>
            <span class="text-xs mb-2">
              Either login with your LocalAI API User ID, or login with an
              OpenAI API Key. All credentials are stored locally and not sent to
              any external servers.
            </span>
            <LoginBox
              title="User ID"
              authAction={authenticateTeams}
              updateAuthStates={updateAuthStates}
              placeholder="User ID"
              authState={teamsAuthState}
              invalidMsg={
                "Your User ID is invalid - please check your credentials and try again."
              }
            />
            <div className="mt-2"></div>
            <LoginBox
              title="OpenAI API Key"
              authAction={authenticateOpenAI}
              updateAuthStates={updateAuthStates}
              placeholder="sk-***"
              authState={openAIAuthState}
              invalidMsg={
                "Your OpenAI API Key is invalid - please check your credentials and try again."
              }
            />
          </div>
        </div>
      </>
    );
  }
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
                  settings.value.model = (e.target as HTMLSelectElement).value;
                }}
                value={settings.value.model}
              >
                {Object.entries(models.value).map(([model, name]) => (
                  <option value={model}>{name}</option>
                ))}
              </select>

              <button
                class="px-1.5 sm:px-3 py-1.5 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-900 transition-colors"
                onClick={() => {
                  messages.value = [];
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

              <button
                class="px-1.5 sm:px-3 py-1.5 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-900 transition-colors"
                onClick={() => {
                  setSettingsModalOpen(!settingsModalOpen);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"></path>
                </svg>
                <span class="hidden sm:block pl-1">Settings</span>
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
                {messages.value.length == 0 && (
                  <div class="py-5 text-white w-full">
                    <div class="flex flex-col gap-2 px-7 w-full">
                      <div class="flex gap-1">
                        <div class="bg-[rgb(12,12,13)] border-zinc-800 border justify-center items-center rounded-lg text-center text-xs px-2.5 py-1.5 w-fit">
                          ℹ️&nbsp; Info
                        </div>
                      </div>
                      <p
                        class="text-sm whitespace-pre-wrap text-zinc-400"
                        id="default-message"
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
                {messages.value.map((message) => (
                  <Message message={message} highlighter={highlighter} />
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
                  placeholder={
                    settings.value.model != "local"
                      ? `/ for in-built commands, else using ${
                          models.value[settings.value.model]
                        }`
                      : `/ for in-built commands`
                  }
                  onInputCapture={(e) => {
                    const text = (e.target as HTMLInputElement).innerText;
                    setMessage(text);
                    // (e.target as HTMLInputElement).innerText = text;
                  }}
                  contentEditable
                  ref={inputRef}
                  // on enter
                  onKeyDown={async (e) => {
                    if (e.key == "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      await handleSubmit(
                        message,

                        setMessage,
                        inputRef
                      );
                    }
                  }}
                />

                <button
                  class="bg-purple-500/80 hover:bg-purple-500/70 transition-colors disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold px-2 py-2 rounded max-h-[36px]"
                  disabled={(message || "").trim().length == 0}
                  onClick={async () => {
                    await handleSubmit(message, setMessage, inputRef);
                  }}
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

      <SettingsModal
        setShown={setSettingsModalOpen}
        shown={settingsModalOpen}
      />
    </>
  );
}
