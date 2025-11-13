import { API, APIConfig } from "./types";

export const createAPI = <TContext extends Record<string, unknown>>(
  config: APIConfig<TContext>
): API<TContext> => {
  let context = { ...config.context } as TContext;

  const addContext = <K extends string, V>(key: K, value: V) => {
    context = { ...context, [key]: value } as TContext & Record<K, V>;
    return api as unknown as API<TContext & Record<K, V>>;
  };

  const api: API<TContext> = {
    context,
    addContext,
    commands: config.commands,
    events: config.events,
  };

  return api;
};


const api = createAPI({
  context: { user: "John Doe" },
  commands: [],
  events: [],
});

export default api;