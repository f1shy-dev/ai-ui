import clsx from "clsx";
import { StateUpdater, useEffect, useState } from "preact/hooks";

export const Modal = ({
  children,
  title,
  shown,
  setShown,
}: {
  children: any;
  title: string;
  shown: boolean;
  setShown: StateUpdater<boolean>;
}) => {
  //   if (!shown) return null;
  const [animationState, setAnimationState] = useState<
    "enter" | "exit" | "shown" | "hidden"
  >(shown ? "enter" : "hidden");

  useEffect(() => {
    if (!shown && animationState == "hidden") return;
    if (shown) {
      setAnimationState("enter");
      setTimeout(() => {
        setAnimationState("shown");
      }, 50);
    } else {
      setAnimationState("exit");
      setTimeout(() => {
        setAnimationState("exit");
        setAnimationState("hidden");
      }, 50);
    }
  }, [shown]);

  return (
    <div
      className={clsx(
        "fixed top-0 h-full w-screen bg-[rgb(12,12,13)]/70  justify-center items-center z-50 transition-all duration-50",
        // animationState == "hidden" && "hidden",
        // animationState == "shown" && "flex opacity-100  ease-in",
        // animationState == "exit" && "flex opacity-0 ease-out"
        animationState == "enter" && "animate-fade-in opacity-0  ease-out flex",
        animationState == "exit" && "animate-fade-out opacity-0  ease-in flex",
        animationState == "shown" && "opacity-100 flex",
        animationState == "hidden" && "hidden"
      )}
    >
      <div
        className={clsx(
          "bg-[rgb(20,20,22)] border border-zinc-800 rounded-lg pl-6 pr-2 pt-2 pb-4 text-gray-200 w-full max-w-lg mx-4 transition-all duration-100 ",
          animationState == "enter" && "animate-fade-in  scale-95 ease-out",
          animationState == "exit" && "animate-fade-out  scale-95 ease-in",
          animationState == "shown" && " scale-100"
        )}
      >
        <div class="flex">
          <span className="font-semibold text-lg mt-2">{title}</span>
          <div className="flex-grow"></div>
          <button
            class="p-1 text-white bg-transparent border border-zinc-800 shadow-sm rounded-lg flex items-center text-xs hover:bg-zinc-800 transition-colors h-min"
            onClick={() => {
              setShown(false);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
            </svg>
          </button>
        </div>
        <div className="w-full flex flex-col">{children}</div>
      </div>
    </div>
  );
};
