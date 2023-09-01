import { AdaptiveCard } from "adaptivecards";
import { MathJsStatic } from "mathjs";

let mathjs: MathJsStatic | null = null;
let adaptiveCard: typeof AdaptiveCard | null = null;
export const mathFactory = async () => {
  if (mathjs === null) {
    const math = await import("mathjs");
    mathjs = math.create(math.all);
  }
  return mathjs;
};

export const adaptiveCardFactory = async () => {
  if (adaptiveCard === null) {
    const { AdaptiveCard } = await import("adaptivecards");
    adaptiveCard = AdaptiveCard;
  }
  return adaptiveCard;
};
