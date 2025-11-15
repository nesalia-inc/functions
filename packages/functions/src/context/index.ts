import { Context } from "./types";

let currentContext: Context = {};

export const createContext = (ctx: Context) => {
  currentContext = { ...ctx };
};

export const addContext = <K extends string, V>(key: K, value: V) => {
  currentContext = { ...currentContext, [key]: value };
};

export const getContext = (): Context => currentContext;

export const getCurrentContext = (): Context => {
  return { ...currentContext };
};

export const clearContext = (): void => {
  currentContext = {};
};

export const setContextProperty = <K extends string, V>(
  key: K,
  value: V
): void => {
  currentContext = { ...currentContext, [key]: value };
};

export const getContextProperty = <K extends string>(
  key: K
): unknown => {
  return currentContext[key];
};