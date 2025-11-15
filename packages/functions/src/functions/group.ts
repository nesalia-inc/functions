// group.ts
import { Command, CommandGroupConfig, GroupFromConfig } from "./types";

function isGroup(x: Command | CommandGroupConfig): x is CommandGroupConfig {
  return (
    typeof (x as any)?.name === "string" && Array.isArray((x as any).children)
  );
}

type AnyRecord = Record<string, unknown>;

const groupFromConfig = <C extends CommandGroupConfig>(
  cfg: C,
): GroupFromConfig<C> => {
  const mapped: AnyRecord = {};

  for (const child of cfg.children) {
    if (isGroup(child)) {
      mapped[child.name] = groupFromConfig(child);
    }
  }

  return {
    name: cfg.name,
    ...mapped,
  } as GroupFromConfig<C>;
}

export const group = <
  TName extends string,
  TChildren extends readonly (Command | CommandGroupConfig)[],
>(config: {
  name: TName;
  children: TChildren;
}): {
  name: TName;
} & {
  [K in Extract<
    TChildren[number],
    CommandGroupConfig
  > as K["name"]]: GroupFromConfig<K>;
} => {
  const mapped: AnyRecord = {};

  for (const child of config.children) {
    if (isGroup(child)) {
      mapped[child.name] = groupFromConfig(child);
    }
  }

  return {
    name: config.name,
    ...mapped,
  } as any;
};
