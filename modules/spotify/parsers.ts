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

export function parseTrack(query: Record<string, any>, isLong=false): ITrack | string
{
  const album = parseAlbum(query["album"], false);
  const artists = parseArtists(query["artists"], false);

  const data = {...query, album, artists};

  return convertObject(data, isLong);
}

export function parseDatedTrack(query: Record<string, any>, isLong=false): ITrack | string
{
  return parseTrack(query["track"], isLong);
}

export function parseTracks(query: Record<string, any>, isLong=false): Array<ITrack | string>
{
  return query.map((rawTrack: Record<string, any>) => parseTrack(rawTrack, isLong));
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

export async function retriveTracks(url: string | URL, tokens?: Tokens, isLong=true): Promise<Array<ITrack>>
{
  if(tokens)
  {
    const rawTracks = await tokens.getAll(url);
    const tracks = rawTracks.map(rawTrack => rawTrack["track"])
    return parseTracks(tracks, isLong) as Array<ITrack>;
  }

  return []
}

export async function parsePlaylist(query: Record<string, any>, tokens?: Tokens, isLong=false, longTracks=false): Promise<IPlaylist | IPlaylistShort>
{
  const tracksUrl = new URL(query["tracks"]["href"])
  const tracks = await retriveTracks(tracksUrl, tokens, longTracks);

  const data = {
    ...query,
    color: Color.white,
    snaps: [],
    tracks
  }

  return convertObject(data);
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
  }

  return user;
}