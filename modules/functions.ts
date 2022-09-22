import { Context } from "oak";
import { crypto } from "crypto"; 
import { DigestAlgorithm } from "./deps.ts";

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
  const decoder = new TextDecoder();
  const text = JSON.stringify(data);
  
  const encoded = encoder.encode(text);
  const hashed = crypto.subtle.digestSync(algorithm, encoded);

  const hashedText = decoder.decode(hashed);
  return hashedText;
}