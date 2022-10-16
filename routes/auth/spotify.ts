import { Context } from "oak";
import { API_AUTH, API_TOKEN_URL, SCOPES } from "../../modules/spotify/consts.ts";
import { Tokens } from "../../modules/spotify/base.ts";
import { generateToken } from "./base.ts";
import { parseDatedTrack, parseMultiple, parsePlaylist, parseUser } from "../../modules/spotify/parsers.ts";

export function connect(uiUrl: string)
{
  const url = new URL(uiUrl);
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

  return queryURL;
}

function parseCallbackParams(params: URLSearchParams)
{
  if (!params.has("code"))
  {
    const err = {status: parseInt(params.get("error") || "404"), reason: "Spotify authentication failed"}; 
    throw err;
  }

  const code = params.get("code");
  const state = params.get("state");

  return {code, state};
}

export async function callback(ctxt: Context, uiUrl: string)
{
  const url = new URL(ctxt.request.url);
  const uiURL = new URL(uiUrl);
  const params: URLSearchParams = url.searchParams;

  const { code, state } = parseCallbackParams(params);
  const data = {
    grant_type: "authorization_code",
    code: code || "",
    redirect_uri: `${uiURL.origin}/auth/callback`,
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
}

export async function retriveUserData(ip: string, tokens: Tokens)
{
  const spotifyUser = await tokens.get("me");
  const token = generateToken();

  const userData = parseUser(spotifyUser, tokens.refreshToken, ip, token);

  return userData;
}

export async function retriveAdditionalUserData(tokens: Tokens)
{
  // get users playlists and likes
  const rawPlaylists = await tokens.getAll("me/playlists");
  const rawLikes = await tokens.getAll("me/tracks");

  // parse spotify data to io(my) data
  const playlists = await parseMultiple({elements: rawPlaylists, options: [tokens]}, parsePlaylist);
  const likes = await parseMultiple({elements: rawLikes}, parseDatedTrack);

  return {playlists, likes};
}