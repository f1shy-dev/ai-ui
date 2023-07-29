export type MessageType = {
  sender: string;
  model: string;
  content?: string;
  tokens?: number;
  tags: string[];
  date: Date;
  isLoading: boolean;
  id: string;
  type: "text" | "card" | "loading" | "error";
  function_calls?: FunctionCall[];
};

export type FunctionCall = {
  name: string;
  args: string;
  result?: string;
  isLoading: boolean;
  success?: boolean;
  id: string;
};
