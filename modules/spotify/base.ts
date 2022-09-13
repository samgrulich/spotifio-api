import { SPOTIFY_API_URL as API_URL, SPOTIFY_API_AUTH as API_AUTH } from "../../consts/c_spotify.ts";
import { TokenData } from "../types.ts"; 

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
  #timeStamp: number = Date.now() / 1000;

  constructor({refreshToken, accessToken, timeToLive}: TokenData)
  {
    this.#refreshToken =  refreshToken;
    this.#accessToken = accessToken;
    this.#timeToLive = timeToLive;
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
    });

    // authenticate user or return not logged in page
    return undefined;
  }  
}