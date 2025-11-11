import { Exception } from "../errors/types";
import { Unit } from "../types";

export type Command = {
  beforeInvoke: () => Promise<Unit>;
  afterInvoke: () => Promise<Unit>;
  onSuccess: () => Promise<Unit>;
  onError: (config: { exception: Exception }) => Promise<Unit>;
};

export type CommandGroup = {
  name: string;
  children: (Command | CommandGroup)[];
  
  add: (child: Command | CommandGroup) => Unit
  remove: (child: Command | CommandGroup) => Unit
};
