import {
  ExecuteAction,
  OpenUrlAction,
  ShowCardAction,
  SubmitAction,
  ToggleVisibilityAction,
} from "adaptivecards";

export type Action =
  | SubmitAction
  | ExecuteAction
  | ToggleVisibilityAction
  | ShowCardAction
  | OpenUrlAction;
