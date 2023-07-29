import { Highlighter, Lang, getHighlighter } from "shiki";
import { StateUpdater } from "preact/hooks";
import { replaceAsync } from "./replaceAsync";

export const parseMarkdown = async (
  content: string | undefined,
  highlighter: Highlighter | undefined,
  setHighlighter: StateUpdater<Highlighter | undefined>
) => {
  if (typeof content == "string") {
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
            let langs = ["javascript", "typescript", "python", "csharp", "cpp"];
            if (lang as Lang | false) langs.push(lang as Lang);
            setHighlighter(
              await getHighlighter({
                theme: "min-dark",
                langs: langs as Lang[],
              })
            );
          }
          if (highlighter)
            return await (await highlighter).codeToHtml(text, { lang });
        }
        return `<code>${text}</code>`;
      }
    );

    // parse markdown code `text` to html code but ignore the code that is already in <code>
    content = content.replace(
      /(?<!<code>)(`)([^`]+)(`)(?!<\/code>)/g,
      (_: string, o: string, text: string) => {
        console.log("[small cb]", text);
        return `<code>${text}</code>`;
      }
    );

    //parse markdown links [text](url) to html links
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s<]+)\)/g,
      (_: string, text: string, url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
    );

    //write me code here to parse links in the text and replace then with <a> but ignore the links that are already in <a>
    content = content.replace(
      /(?<!href=")(https?:\/\/[^\s<]+)/g,
      (_: string, url: string) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
    );

    // parse markdown bold **text** to html bold
    content = content.replace(
      /\*\*([^\*]+)\*\*/g,
      (_: string, text: string) => {
        return `<b>${text}</b>`;
      }
    );

    // parse markdown italic *text* or _text_ to html italic
    content = content.replace(
      /(\*|_)([^\*]+)(\*|_)/g,
      (_: string, o: string, text: string) => {
        return `<i>${text}</i>`;
      }
    );

    // parse markdown strikethrough ~~text~~ to html strikethrough
    content = content.replace(/~~([^\*]+)~~/g, (_: string, text: string) => {
      return `<s>${text}</s>`;
    });

    // parse markdown underline __text__ to html underline
    content = content.replace(/__([^\*]+)__/g, (_: string, text: string) => {
      return `<u>${text}</u>`;
    });
  }

  return content;
};
