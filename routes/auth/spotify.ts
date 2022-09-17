import { Context } from "oak";
import { API_AUTH, API_TOKEN_URL, SCOPES } from "../../modules/spotify/consts.ts";
import { Tokens } from "../../modules/spotify/base.ts";

export function connect(ctxt: Context)
{
  const url = new URL(ctxt.request.url);
  const state = crypto.randomUUID().replaceAll("-", "").substring(0, 16);
  const data = {
    "client_id": Deno.env.get("CLIENT_ID") || "",
    "redirect_uri": `${url.origin}/auth/callback`,
    "response_type": "code",
    "scope": SCOPES,
    "state": state,
  }

  const searchParams = new URLSearchParams(data);
  const params = searchParams.toString();
  const spotifyURL = "https://accounts.spotify.com/authorize";
  const queryURL = `${spotifyURL}?${params}`;

  ctxt.response.redirect(queryURL);
}


function parseCallbackParams(params: URLSearchParams)
{
  if (!params.has("code"))
  {
    const err = {status: parseInt(params.get("error") || "404"), reason: "Spotify authentication failed"}; 
    throw err;
  }

  const code = params.get("code");

  return code;
}

export async function callback(ctxt: Context)
{
  const url = new URL(ctxt.request.url);
  const params: URLSearchParams = url.searchParams;

  const code = parseCallbackParams(params);
  const data = {
    grant_type: "authorization_code",
    code: code || "",
    redirect_uri: `${url.origin}/auth/callback`,
  };

  const tokens = await fetch(API_TOKEN_URL, {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Authorization": API_AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data)
  }).then((response) => {
    return response.json();
  }).then((data) => {
    const credentials = {
      accessToken: data["access_token"],
      timeToLive: data["expires_in"],
      refreshToken: data["refresh_token"],
    };
    
    return new Tokens(credentials);
  });

  return tokens;
  
  // query spotify user data

  // query database for user data
  

  // if new user
    // create new entry to the users table
    // create new entry for all of his playlists
    // create new entry for the scheduled snapshot
  // send the userid cookie back to client
  // send userdata to store in session storage
  // store the userid in localstorage with given session length
  // resp.headers.set("Set-Cookie", `${strCookies}; SameSite=Strict; Max-Age=${604800}`);
}