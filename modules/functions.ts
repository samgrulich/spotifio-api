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
