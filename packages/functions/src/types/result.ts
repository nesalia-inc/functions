import { Exception } from "../errors/types";

export type Result<T, E = Exception> = Success<T> | Failure<E>;

export type Success<T> = {
  readonly _tag: "Success";
  readonly value: T;
  isSuccess(): this is Success<T>;
  isFailure(): this is Failure<never>;
  match<U>(handlers: {
    onSuccess: (value: T) => U;
    onFailure: (error: never) => U;
  }): U;
};

export type Failure<E> = {
  readonly _tag: "Failure";
  readonly error: E;
  isSuccess(): this is Success<never>;
  isFailure(): this is Failure<E>;
  match<U>(handlers: {
    onSuccess: (value: never) => U;
    onFailure: (error: E) => U;
  }): U;
};

export const success = <T>(value: T): Success<T> => ({
  _tag: "Success",
  value,
  isSuccess(): this is Success<T> {
    return true;
  },
  isFailure(): this is Failure<never> {
    return false;
  },
  match<U>(handlers: {
    onSuccess: (value: T) => U;
    onFailure: (error: never) => U;
  }): U {
    return handlers.onSuccess(value);
  },
});

export const failure = <E>(error: E): Failure<E> => ({
  _tag: "Failure",
  error,
  isSuccess(): this is Success<never> {
    return false;
  },
  isFailure(): this is Failure<E> {
    return true;
  },
  match<U>(handlers: {
    onSuccess: (value: never) => U;
    onFailure: (error: E) => U;
  }): U {
    return handlers.onFailure(error);
  },
});


