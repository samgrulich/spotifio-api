import { Context, Status } from "oak";
import { crypto } from "crypto"; 
import { DigestAlgorithm } from "./deps.ts";
import { IChunk } from "./db/types.ts";

export function splitCookies(cookie: string): Record<string, string>
{
  const cookieArr = cookie.split('; ');
  const result: Record<string, string> = {};

  for(const cookieStr of cookieArr)
  {
    const [key, val] = cookieStr.split('=');
    result[key] = val;
  }

  return result;
}

export function formatIP(ip: string): string
{
  return ip.replaceAll(".", "-");
}

export function respondError(ctxt: Context, msg: string, reason: string, status=400)
{
  ctxt.response.status = status;
  ctxt.response.headers.set("Content-Type", "application/json");
  ctxt.response.body = JSON.stringify({
    msg,
    reason
  })
}

export function respondNotLogged(ctxt: Context)
{
  respondError(ctxt, "Authentication failed", "not_logged", Status.Forbidden);
}

export function stripServerHeaders(ctxt: Context)
{
  const headers = Array.from(ctxt.response.headers.keys());
  const serverHeaders = headers.filter(header => header.startsWith("X-"));

  serverHeaders.forEach(headerKey => ctxt.response.headers.delete(headerKey));
}

export function respond(ctxt: Context, options: {data?: any, cookies?: any, status?: number})
{
  //add cookies support
  ctxt.response.status = options.status ?? 200;
  ctxt.response.headers.set("Content-Type", "application/json");
  ctxt.response.body = JSON.stringify(options.data);
}

export function digest(data: any, algorithm: DigestAlgorithm = "SHA-1"): string
{
  const encoder = new TextEncoder();
  const text = JSON.stringify(data);
  
  const encodedText = encoder.encode(text);
  const hashBuffer = crypto.subtle.digestSync(algorithm, encodedText);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export function hashChunks(input: {chunks: Array<IChunk>, date: Date})
{
  return digest(input, "SHA-1");
}