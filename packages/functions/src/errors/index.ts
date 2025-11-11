import { ExceptionConfig, Exception } from "./types";

export const exceptionSpace = () => {}
export const exception = (config: ExceptionConfig): Exception => {};
export const raise = (exception: Exception): Exception => {}
