export const SCOPES = "user-read-private user-read-email playlist-modify-private playlist-read-private";


export const SPOTIFY_ACC_API_URL = "https://accounts.spotify.com/api";
export const SPOTIFY_API_AUTH = "Basic " + btoa(Deno.env.get("CLIENT_ID") + ":" + Deno.env.get("CLIENT_SECRET"));
export const SPOTIFY_API_TOKEN_URL = `${SPOTIFY_ACC_API_URL}/token`;
export const SPOTIFY_API_URL = "https://api.spotify.com/v1/";
