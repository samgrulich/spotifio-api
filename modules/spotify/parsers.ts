// deno-lint-ignore-file ban-types no-explicit-any
import { UserInput } from "../db/tables.ts";
import { IAlbum, IAlbumShort, IArtist, Color, IPlaylist, ITrack, IArtistShort, IPlaylistShort } from "../db/types.ts";
import { Tokens } from "./base.ts";


const SPOTIFY_KEYS: Record<string, string> = {
  "images": "cover",
  "duration_ms": "duration"
}

export async function parseMultiple(query: {elements: Array<any>, options?:Array<any>}, parser: Function)
{
  const promises = query.elements.map((rawElement: Record<string, any>) => parser(rawElement, ...(query.options ?? [])));
  const data = await Promise.all(promises);
  return data;
}

/**
 * Goes through the SPOTIFY_KEYS table and replaces spotify keys with mine
 * @param spotifyKey 
 * @returns 
 */
export function parseKey(spotifyKey: string)
{
  if (Object.keys(SPOTIFY_KEYS).includes(spotifyKey))
    return SPOTIFY_KEYS[spotifyKey];
  
  return spotifyKey;
}

/**
 * Converts string to mixedCase 
 * @param spotifyFormatKey 
 * @returns 
 */
export function convertKey(spotifyFormatKey: string, parse=true)
{
  const parsedKey = parse ? parseKey(spotifyFormatKey) : spotifyFormatKey;

  const parts = parsedKey.split("_");
  const convertedParts = parts.map((value, index) => {
    if (index == 0)
      return;
    
    const capitalized = value[0].toUpperCase + value.substring(1);
    return capitalized; 
  });
  const key = convertedParts.toString();
  return key;
}

/**
 * Converts the keys for every entry and then parses value into long or short type 
 * @param spotifyObject 
 * @param isLong 
 * @returns 
 */
export function convertObject<LongType, ShortType>(spotifyObject: Record<string, any>, isLong=false)
{
  const entries = Object.entries(spotifyObject);
  const convertedEntries = entries.map(([key, value]) => [convertKey(key), isLong ? value as LongType : value as ShortType]);
  return Object.fromEntries(convertedEntries);
}

export function parseArtist(query: Record<string, any>, isLong=false): IArtist | IArtistShort
{
  return convertObject(query, isLong);
}

export function parseArtists(query: Record<string, any>, isLong=false): Array<IArtist | IArtistShort>
{
  return query.map((rawArtist: Record<string, any>) => parseArtist(rawArtist, isLong));
}

export function parseTrack(query: Record<string, any>, desiredItems=["id"]): Record<string, string>
{
  // const album = isLong ? parseAlbum(query["album"], false) : {};
  // const artists = isLong ? parseArtists(query["artists"], false) : {};

  const data = query as ITrack;
  data.cover = data.cover ? data.cover : query.album.images;
  const result = Object.fromEntries(Object.entries(data).filter(([key, _]) => desiredItems.includes(key)));

  return result;
}

export function parseDatedTrack(query: Record<string, any>, desiredItems=["id"]): Record<string, string>
{
  return parseTrack(query["track"], desiredItems);
}

export function parseTracks(query: Record<string, any>, isDated=false, desiredItems=["id"]): Array<Record<string, string>>
{
  const parser = isDated ? parseDatedTrack : parseTrack;
  return query.map((rawTrack: Record<string, any>) => parser(rawTrack, desiredItems));
}

export function parseAlbum(query: Record<string, any>, isLong=false): IAlbum | IAlbumShort
{
  // const releaseDatePrecision = query["release_date_precision"];
  const releaseDate = new Date(query["release_date"]); 
  const artists = parseArtists(query["artists"], true);

  delete query["release_date"];

  const data = {...query, releaseDate, artists};
  return convertObject(data, isLong);
}

export async function retriveTracks(url: string | URL, tokens?: Tokens, isLong=true): Promise<Array<Record<string, any>>>
{
  if(tokens)
  {
    const rawTracks = await tokens.getAll(url);
    const tracks = rawTracks.map(rawTrack => rawTrack["track"])
    return parseTracks(tracks, isLong) as Array<Record<string, any>>;
  }

  return []
}

export async function parsePlaylist(query: Record<string, any>, tokens?: Tokens, isLong=false, longTracks=false): Promise<IPlaylist>
{
  const tracksUrl = new URL(query["tracks"]["href"]);
  const tracks = isLong ? await retriveTracks(tracksUrl, tokens, longTracks) : [];

  const data = {
    ...query,
    cover: query["images"],
    color: Color.white,
    snaps: [],
    tracks
  }

  // return convertObject(data);
  return data as unknown as IPlaylist;
}

export function parseUser(query: Record<string, any>, refreshToken: string, ip: string, token: string): UserInput
{
  const user: UserInput = {
    id: query["id"],
    name: query["display_name"],
    refreshToken: refreshToken,
    ip: ip,
    token: token, 
    email: query["email"],
    cover: query["images"],
    playlists: [],
    liked: [],
    country: query["country"],
  }

  return user;
}