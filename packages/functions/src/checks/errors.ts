export class CheckError extends Error {
  code: string;
  details?: any;

  constructor({ code, message, details }: { code: string; message: string; details?: any }) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
