import { Context } from "./types";

let currentContext: Context = {};

export const createContext = (ctx: Context) => {
  currentContext = { ...ctx };
};

export const addContext = <K extends string, V>(key: K, value: V) => {
  currentContext = { ...currentContext, [key]: value };
};

export const getContext = (): Context => currentContext;
