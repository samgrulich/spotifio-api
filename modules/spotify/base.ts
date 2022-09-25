// deno-lint-ignore-file no-explicit-any
import { API_URL, API_AUTH } from "./consts.ts";

const HEADERS = {
  "Authorization": API_AUTH,
  "Content-Type": "application/x-www-form-urlencoded",
};

export async function get(url: string | URL, headers: Record<string, string>=HEADERS)
{
  // no error handling
  // console.log(url, headers);
  const data = await fetch(new URL(url, API_URL), {
    method: "GET",
    cache: "no-cache",
    headers: headers,
  })
    .then(async (response) => {
      const data = await response.json(); 

      if (data["error"])
      {
        const err = data["error"]
        throw {status: err["status"], reason: "Spotify connection failed", msg: err["message"]};
      }

      return data;
    })
    .catch((err) => {
      // console.log(err);
      if(err["msg"])
        throw err;
      console.log(err);
      throw {status: 503, reason: "Spotify connection failed"};
    });

  return data; 
}

export async function post(url: string | URL, data: Record<string, string>, headers: Record<string, string>=HEADERS)
{
  // no error handling
  const resp = await fetch(new URL(url, API_URL), {
    method: "POST",
    cache: "no-cache",
    headers: headers,
    body: new URLSearchParams(data),
  }) 
    .then(async (response) => {
      const data = await response.json(); 

      if (data["error"])
      {
        const err = data["error"]
        throw {status: err["status"], reason: "Spotify connection failed", msg: err["message"]};
      }

      return data;
    })
    .catch((err) => {
      // console.log(err);
      if(err["msg"])
        throw err;

      throw {status: 503, reason: "Spotify connection failed"};
    });

  return resp; 
}

export async function getAll<T = any>(url: string | URL, headers?: Record<string, string>): Promise<Array<T>>
{
  const resp = await get(url, headers);
  const lastLimit = resp["limit"];
  const batchLimit = lastLimit; // 50
  const total = resp["total"]; 
  const totalBatches = total / batchLimit;
  const result = [resp["items"]];
  const responses = [];

  for (let i = 1; i < totalBatches; i++)
  {
    const batchURL = new URL(url, API_URL);
    batchURL.searchParams.set("offset", (i * batchLimit).toString());
    batchURL.searchParams.set("limit", batchLimit.toString());

    responses.push(get(batchURL, headers));
  }

  await Promise.all(responses).then((values) => {
    values.map((resp) => {
      result.push(resp["items"]);
    });
  })
  
  return result.flat();
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
    if (0 < this.timeToLive)
      return this.#accessToken;
      
    const resp = post('refresh', {refresh_token: this.refreshToken});
    resp.then((data) => {
      this.#accessToken = data["access_token"];
      this.#timeToLive = Number(data["expires_in"]);
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
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
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