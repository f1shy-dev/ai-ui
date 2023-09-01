import { ChatModule } from ".";

export const help: ChatModule = async () => {
  return {
    sender: "@ℹ️&nbsp; Info",
    content: `<b>Welcome to LocalAI</b><br/><i class="text-xs">a project by f1shy-dev</i> <br/> <br/>To get started, type a message in the box below and hit enter - messages starting with "/" will forward to the Teams Bot, which is a general bot with a few features. Otherwise, your message will be sent to the AI model you selected above. <ul> <li> <code>GPT-3 (Auto/16k)</code> - standard gpt-3.5-turbo model, either with 4k or 16k tokens. </li><li> <code>GPT-4 (Auto/32k)</code> - expensive gpt-4 model, either with 8k or 32k tokens. </li><li> <code>Clarity (Auto/16k)</code> - gpt-3.5-turbo model, but your prompt is also sent to DuckDuckGo, and then the model is provided sources and text from the top results. Can be useful for up-to-date information past 2021.</li></ul>`,
    isLoading: false,
    type: "text",
  };
};
