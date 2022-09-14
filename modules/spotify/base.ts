import { API_URL, API_AUTH } from "./consts.ts";

const HEADERS = {
  "Authorization": API_AUTH,
  "Content-Type": "application/x-www-form-urlencoded",
};

export async function get(url: string)
{
  const resp = await fetch(new URL(url, API_URL), {
      method: "GET",
      cache: "no-cache",
      headers: HEADERS,
  });

  return await resp.json();
}

export async function post(url: string, data: Record<string, string>)
{
  const resp = await fetch(new URL(url, API_URL), {
      method: "POST",
      cache: "no-cache",
      headers: HEADERS,
      body: new URLSearchParams(data),
  });

  return await resp.json(); 
}


export class Tokens 
{
  #refreshToken: string;
  #accessToken: string;
  #timeToLive: number;
  #timeStamp: number;

  constructor(input: {refreshToken: string, accessToken: string, timeToLive: number, timeStamp?: number})
  {
    this.#refreshToken = input.refreshToken;
    this.#accessToken = input.accessToken;
    this.#timeToLive = input.timeToLive;
    this.#timeStamp = input.timeStamp ? input.timeStamp : Date.now() / 1000;
  }

  get timeToLive()
  {
    return (this.#timeStamp + this.#timeToLive) - Date.now() / 1000;
  }

  get accessToken()
  {
    const now = Date.now() / 1000;
    
    if (now < this.timeToLive)
      return this.#accessToken;
      
    const resp = post('refresh', {refresh_token: this.#refreshToken});
    resp.then((data) => {
      this.#accessToken = data["access_token"];
      this.#timeToLive = data["expires_in"];
      this.#timeStamp = Date.now() / 1000;
      
      return this.#accessToken;
    }).catch((err) => {
      console.log(err);
      throw {status: "Invalid token", reason: 403}
    });

    // authenticate user or return not logged in page
    return undefined;
  }

  protected async fetch(endpoint: string, method: string)
  {
    const url = new URL(endpoint, API_URL);
    const data = await fetch(url, {method});
    return await data.json();
  }

  async get(endpoint: string)
  {
    const data = await this.fetch(endpoint, "GET");
    return data;
  }

  async post(endpoint: string)
  {
    const data = await this.fetch(endpoint, "POST");
    return data;
  }
}