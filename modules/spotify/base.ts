// deno-lint-ignore-file no-explicit-any
import { API_URL, API_AUTH } from "./consts.ts";

const HEADERS = {
  "Authorization": API_AUTH,
  "Content-Type": "application/x-www-form-urlencoded",
};

export async function get(url: string | URL, headers: Record<string, string>=HEADERS)
{
  // no error handling
  const resp = await fetch(new URL(url, API_URL), {
    method: "GET",
    cache: "no-cache",
    headers: headers,
  }).catch((err) => {
    console.log(err);
    throw {status: 503, reason: "Spotify connection failed"};
  });

  return await resp.json();
}

export async function post(url: string | URL, data: Record<string, string>, headers: Record<string, string>=HEADERS)
{
  // no error handling
  const resp = await fetch(new URL(url, API_URL), {
    method: "POST",
    cache: "no-cache",
    headers: headers,
    body: new URLSearchParams(data),
  }).catch((err) => {
    console.log(err);
    throw {status: 503, reason: "Spotify connection failed"};
  });

  return await resp.json(); 
}

export async function getAll<T = any>(url: string | URL, headers?: Record<string, string>): Promise<Array<T>>
{
  const resp = await get(url);
  const batchLimit = 50;
  const lastLimit = resp["limit"];
  const total = resp["total"] - lastLimit; 
  const totalBatches = total / batchLimit;
  const result = [resp["items"]];
  const responses = [];

  for (let i = 0; i < totalBatches; i++)
  {
    const batchURL = new URL(url);
    batchURL.searchParams.set("offset", (i * batchLimit).toString());
    batchURL.searchParams.set("limit", batchLimit.toString());

    responses.push(get(batchURL, headers));
  }

  Promise.all(responses).then((values) => {
    values.map((resp) => {
      result.push(resp["items"]);
    });
  })
  
  return result;
}

export class Tokens 
{
  refreshToken: string;
  #accessToken: string;
  #timeToLive: number;
  #timeStamp: number;

  constructor(input: {refreshToken: string, accessToken: string, timeToLive: number, timeStamp?: number})
  {
    this.refreshToken = input.refreshToken;
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
      
    const resp = post('refresh', {refresh_token: this.refreshToken});
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

  protected get authHeaders()
  {
    return {
      Authorization: `Brearer ${this.accessToken}`
    }
  }

  async get(endpoint: string)
  {
    const data = await get(endpoint, this.authHeaders); 
    return data;
  }

  async post(endpoint: string, inputData: Record<string, any>={})
  {
    const data = await post(endpoint, inputData, this.authHeaders);
    return data;
  }

  async getAll<T=any>(endpoint: string | URL)
  {
    const data = await getAll<T>(endpoint, this.authHeaders);
    return data;
  }
}