import { Status } from "http-status";

export class Exception extends Error
{
  code: number;
  name: string;
  reason: string;
  contents: Array<string>;

  constructor(code: number, reason: string, contents: Array<string>)
  {
    super();
    this.code = code;
    this.name = Status[code];
    this.reason = reason;
    this.contents = contents;
  }
}

export const errMessage = (reason: string, details: string, status: number) => new Exception(status, reason, [details]);
export const connectionError = (error: string) => new Exception(503, "internet_connection", ["Couldn't estabilish connection", error]);