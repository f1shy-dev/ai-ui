import { MessageType } from "../MessageType";
import { help } from "./help";
import { setmodel } from "./setmodel";
export type ChatModule = (
  message: string,
  responseID: string
) => Promise<Partial<MessageType>>;

export const modules = { help, setmodel };
