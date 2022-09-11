/** @jsx h */
import { h } from "preact";
import { tw } from "@twind";
import { PageProps, Handlers, HandlerContext } from "$fresh/server.ts";
import { dbClient, ExecuteStatementCommand } from "../../modules/db/init.ts";
import { SPOTIFY_API_TOKEN_URL, SPOTIFY_API_AUTH } from "../../consts/c_spotify.ts";
import Save, { StorageType } from "../../islands/Save.tsx";


interface authCredentials 
{
  disc: "credentials";
  accessToken: string;
  timeToLive: number;
  refreshToken: string;
}

interface SpotifyError
{
  disc: "error";
  code: number;
  msg: string;
}

export const handler: Handlers<authCredentials | SpotifyError> = {
  async GET(req: Request, ctx: HandlerContext<authCredentials | SpotifyError>) {
    const url = new URL(req.url);
    const params: URLSearchParams = url.searchParams;
    
    if (!params.has("code"))
    {
      const err: SpotifyError = {disc: "error", code: parseInt(params.get("error") || "0"), msg: "Spotify authentication failed"}; 
      return  ctx.render(err);
    }

    const code = params.get("code");
    const data = {
      grant_type: "authorization_code",
      code: code || "",
      redirect_uri: `${url.origin}/auth/callback`,
    };

    const response = await fetch(SPOTIFY_API_TOKEN_URL, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Authorization": SPOTIFY_API_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data)
    });

    const respData = await response.json();
    const credentials: authCredentials = {
      disc: "credentials",
      accessToken: respData["access_token"],
      timeToLive: respData["expires_in"],
      refreshToken: respData["refresh_token"],
    };

    const resp = await ctx.render(credentials); 

    // query spotify for user data
    // query database for user data
    // if new user
      // create new entry to the users table
      // create new entry for all of his playlists
      // create new entry for the scheduled snapshot
    // send the userid cookie back to client
    // send userdata to store in session storage
    // store the userid in localstorage with given session length
    // resp.headers.set("Set-Cookie", `${strCookies}; SameSite=Strict; Max-Age=${604800}`);
    
    return resp;
  } 
}

export default function CallbackPage({ data }: PageProps<authCredentials | SpotifyError>) {
  if (data.disc == "error")
  {
    return (
      <div>
        <h1>Problem...</h1>
        <p>There's occurred an error while authenticating.</p>
        <h2>Info</h2>
        <h3>{data.code}</h3>
        <p>{data.msg}</p>
      </div>
    );
  }
  
  const credentialsString = {
    accessToken: data.accessToken, 
    timeToLive: data.timeToLive.toString(), 
    refreshToken: data.refreshToken
  };
  const logged = {"logged": "true"};

  return (
    <div>
      You're in! <br />
      <span>{data.accessToken}</span> <br />
      <span>{data.refreshToken}</span>
      
      <Save storage={StorageType.Session} data={credentialsString}/>
      <Save storage={StorageType.Local} data={logged}/>
    </div>
  );
}