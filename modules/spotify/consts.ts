import "dotenv/load.ts";

const SCOPES = "user-read-private user-read-email playlist-modify-private playlist-read-private user-library-read";

const ACC_API_URL = "https://accounts.spotify.com/api";
const API_AUTH = "Basic " + btoa(Deno.env.get("CLIENT_ID") + ":" + Deno.env.get("CLIENT_SECRET"));
const API_TOKEN_URL = `${ACC_API_URL}/token`;
const API_URL = "https://api.spotify.com/v1/";

export {SCOPES, ACC_API_URL, API_AUTH, API_TOKEN_URL, API_URL};
