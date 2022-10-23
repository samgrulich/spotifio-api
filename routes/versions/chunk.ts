import { Tokens } from "../../modules/spotify/base.ts";
import { parseTracks } from "../../modules/spotify/parsers.ts";

export async function getTracks(refreshToken: string, country: string, tracks: Array<string>)
{
  const tokens = new Tokens({refreshToken});
  const rawTracks = await tokens.getMultiple("tracks", {params: {market: country}, list: {"ids": tracks}});
  const tracksData = parseTracks(rawTracks["tracks"], false, ["id", "preview_url", "name", "cover"]);

  return tracksData as [{"id": string, "preview_url": string}];
}