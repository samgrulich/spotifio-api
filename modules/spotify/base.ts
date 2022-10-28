// deno-lint-ignore-file no-explicit-any
import { connectionError, Exception } from "../errors.ts";
import { API_URL, API_AUTH, ACC_API_URL } from "./consts.ts";
import { spotifyError } from "./errors.ts";

const HEADERS = {
  "Authorization": API_AUTH,
  "Content-Type": "application/x-www-form-urlencoded",
};

export async function get(url: string | URL, headers: Record<string, string>=HEADERS)
{
  // no error handling
  console.log("requesting spotify: ", url, headers);
  const data = await fetch(new URL(url, API_URL), {
    method: "GET",
    cache: "no-cache",
    headers: headers,
  })
    .then(async (response) => {
      const data = await response.json(); 

      if (data["error"])
        throw data;

      return data;
    })
    .catch((err) => {
      if(err["error"])
        throw spotifyError(err["error"]);

      console.log(err);
      throw connectionError(err);
    });

  return data; 
}

export async function post(url: string | URL, data: Record<string, string>, headers: Record<string, string>=HEADERS, isAuthTransaction=false)
{
  // no error handling
  const api_url = isAuthTransaction ? ACC_API_URL : API_URL;

  const res = await fetch(new URL(url, api_url), {
    method: "POST",
    cache: "no-cache",
    headers: headers,
    body: new URLSearchParams(data),
  });
  
  const resData = await res.json();
  
  if (resData["error"])
    throw spotifyError(resData["error"]);

  return resData; 
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

  constructor(input: {refreshToken: string, accessToken?: string, timeToLive?: number, timeStamp?: number})
  {
    this.refreshToken = input.refreshToken;
    this.#accessToken = input.accessToken ?? ""; 
    this.#timeToLive = input.timeToLive ?? 0;
    this.#timeStamp = input.timeStamp ? input.timeStamp : Date.now() / 1000;
  }

  get timeToLive()
  {
    return (this.#timeStamp + this.#timeToLive) - Date.now() / 1000;
  }

  async getAccessToken()
  {
    if (0 < this.timeToLive)
      return this.#accessToken;
      
    const data = await post("token", {grant_type: "refresh_token", refresh_token: this.refreshToken}, HEADERS, true);
    
    this.#accessToken = data["access_token"];
    this.#timeToLive = Number(data["expires_in"]);
    this.#timeStamp = Date.now() / 1000;
    
    return this.#accessToken;
  }

  protected async getAuthHeaders()
  {
    const accessToken = await this.getAccessToken();
    
    return {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }
  }

  async get(endpoint: string)
  {
    const authHeaders = await this.getAuthHeaders();
    const data = await get(endpoint, authHeaders); 
    return data;
  }

  async getMultiple(endpoint: string, options?: {params?: Record<string,string>, list?: Record<string, Array<string>>})
  {
    if (!options)
      return;

    const singleParams = new URLSearchParams(options.params);
    const listParamsArr = Object.entries(options.list ?? {}).map(([key, val]) => encodeURIComponent(key) + "=" + encodeURIComponent(val.toString()));
    const listParamsStr = listParamsArr.reduce((prev, curr) => prev + "&" + curr); 
    
    const paramsString = options.params ? singleParams.toString() + "&" + listParamsStr : listParamsStr;
  
    const authHeaders = await this.getAuthHeaders();
    const data = await get(`${endpoint}?${paramsString}`, authHeaders); 

    return data;
  }

  async post(endpoint: string, inputData: Record<string, any>={})
  {
    const authHeaders = await this.getAuthHeaders();
    const data = await post(endpoint, inputData, authHeaders);
    return data;
  }

  async getAll<T=any>(endpoint: string | URL)
  {
    const authHeaders = await this.getAuthHeaders();
    const data = await getAll<T>(endpoint, authHeaders);
    return data;
  }
}