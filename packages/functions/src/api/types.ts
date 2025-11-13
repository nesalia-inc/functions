import { Command } from "../functions/types";
import { Event } from "../events/types";
import { Context } from "../context/types";

export type APIConfig<TContext extends Context = Context> = {
  context: TContext;
  commands: Command[];
  events: Event[];
};

export type API<TContext extends Context = Context> = {
  context: TContext;
  addContext: <K extends string, V>(
    key: K,
    value: V,
  ) => API<TContext & Record<K, V>>;
  commands: Command[];
  events: Event[];
};
