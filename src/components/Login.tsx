import { AuthState } from "@/utils/authState";
import { setComputedModel } from "@/utils/models";
import { Signal } from "@preact/signals";
import clsx from "clsx";
import { useRef, useState } from "preact/hooks";
type Props = {
  //   action: (
  //     password: string,
  //     setIsLoading: (isLoading: boolean) => void,
  //     setError: (error: string) => void
  //   ) => Promise<void>;

  authAction: (key: string) => Promise<boolean>;
  updateAuthStates: () => Promise<void>;
  title: string;
  placeholder: string;
  authState?: Signal<AuthState>;
  invalidMsg?: string;
};
export const LoginBox = ({
  authAction,
  updateAuthStates,
  title,
  placeholder,
  authState,
  invalidMsg,
}: Props) => {
  const passbox = useRef<HTMLInputElement>(null);
  const msg =
    invalidMsg ||
    "There was an issue logging you in - please check your credentials and try again.";
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(
    authState && authState.value == AuthState.InvalidAuth ? msg : ""
  );

  const tryAuth = async () => {
    {
      setIsLoading(true);
      try {
        const result = await authAction(passbox.current?.value.trim() || "");
        if (result) {
          updateAuthStates();
          setComputedModel(false);
        }
        await new Promise((r) => setTimeout(r, 100));
        setIsLoading(false);
        if (!result) setError(msg);
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
        setIsLoading(false);
        setError(msg);
      }
    }
  };
  return (
    <div class="bg-[rgb(12,12,13)] text-gray-400 text-sm xs:rounded-xl border-y xs:border  border-zinc-800  ">
      <div class="px-6 py-4 flex flex-col flex-grow h-full">
        <span class="text-sm font-semibold">{title}</span>
        {error != "" && <span class="text-xs text-red-400">{error}</span>}

        <div className="flex space-x-1 items-center mt-3 relative">
          <input
            type={showPass ? "text" : "password"}
            placeholder={placeholder}
            class="px-3 py-1.5 border h-8 border-zinc-800 rounded-lg bg-transparent focus:outline-none flex-grow resize-none  scrollbar-track-color-transparent text-xs font-mono"
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                e.preventDefault();
                tryAuth();
              }
            }}
            disabled={isLoading}
            ref={passbox}
          ></input>
          <button
            class={clsx(
              "h-8 w-8 absolute right-0 -translate-x-9 items-center flex justify-center text-white bg-transparent rounded-lg hover:border z-4 border-zinc-800 flex items-center text-xs hover:bg-zinc-900 transition-colors",
              isLoading && "hidden"
            )}
            id="showPass"
            onClick={() => setShowPass(!showPass)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              {!showPass ? (
                <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
              ) : (
                <path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z"></path>
              )}
            </svg>
          </button>
          <button
            class="h-8 w-8 items-center flex justify-center text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-900 transition-colors"
            onClick={tryAuth}
          >
            {isLoading ? (
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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M141.66,133.66l-40,40a8,8,0,0,1-11.32-11.32L116.69,136H24a8,8,0,0,1,0-16h92.69L90.34,93.66a8,8,0,0,1,11.32-11.32l40,40A8,8,0,0,1,141.66,133.66ZM192,32H136a8,8,0,0,0,0,16h56V208H136a8,8,0,0,0,0,16h56a16,16,0,0,0,16-16V48A16,16,0,0,0,192,32Z"></path>
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
