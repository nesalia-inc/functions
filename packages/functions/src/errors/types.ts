import { Unit, NonEmptyArray } from "../types";

export type ExceptionSpace = {
  name: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export type ExceptionConfig = {
  name: string;
  namespace?: string;
  code?: string;

  message?: string;
};

export type Exception = ExceptionConfig & {
  stack: NonEmptyArray<Exception>;
  cause?: Exception;

  from: (message: string) => Exception;
  is: (exception: Exception) => boolean;
  addNote: (note: string) => Unit;
};

export type ExceptionGroup = {
  name: string;
  exceptions: NonEmptyArray<Exception>;
}
