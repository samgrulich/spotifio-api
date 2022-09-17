import { Context } from "oak";

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

export function respond(ctxt: Context, msg: string, action: string, status:number=200)
{
  ctxt.response.status = status;
  ctxt.response.headers.set("Content-Type", "application/json");
  ctxt.response.body = JSON.stringify({msg, action});
}