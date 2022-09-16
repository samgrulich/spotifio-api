// deno-lint-ignore-file ban-types no-explicit-any
import { UserInput } from "../db/tables.ts";
import { Album, AlbumShort, Artist, Color, Playlist, Track } from "../db/types.ts";
import { Tokens } from "./base.ts";


export function parseMultiple(query: Record<string, any>, parser: Function)
{
  return query.map((rawElement: Record<string, any>) => parser(rawElement));
}

export function parseArtist(query: Record<string, any>): Artist
{
  const artist = { 
    id: query["id"],
    uri: query["uri"],
    name: query["name"],
    followers: query["followers"]["total"],
    genres: query["genres"],
    cover: query["images"],
    popularity: query["popularity"],
  }

  return artist;
}

export function parseArtists(query: Record<string, any>): Array<Artist>
{
  return query.map((rawArtist: Record<string, any>) => parseArtist(rawArtist));
}

export function parseTrack(query: Record<string, any>): Track
{
  const album = parseAlbumShort(query["album"]);
  const rawArtists = query["artists"];
  const artists: Array<Artist> = parseArtists(rawArtists); 

  const track: Track = {
    id: query["id"],
    uri: query["uri"],
    name: query["name"],
    discNumber: query["disc_number"],
    duration: query["duration_ms"],
    explicit: query["explicit"],
    aviableMarkets: query["aviable_markets"],
    album: album,
    artists: artists,
    cover: query["images"],
  }

  return track;
}

export function parseTracks(query: Record<string, any>): Array<Track>
{
  return query.map((rawTrack: Record<string, any>) => parseTrack(rawTrack));
}

export function parseAlbumShort(query: Record<string, any>): AlbumShort
{
  const albumShort: AlbumShort = {
    id: query["id"],
    name: query["name"],
  }

  return albumShort;
}

export function parseAlbum(query: Record<string, any>): Album
{
  const rawReleaseDate = query["release_date"];
  // const releaseDatePrecision = query["release_date_precision"];
  const releaseDate = new Date(rawReleaseDate); 
  const artists = parseArtists(query["artists"]);

  const album: Album = {
    id: query["id"],
    name: query["name"],
    uri: query["uri"],
    totalTracks: query["total_tracks"],
    releaseDate: releaseDate,
    aviableMarkets: query["aviable_markets"],
    cover: query["images"],
    artists: artists,
  }

  return album;
}

export async function retriveTracks(url: string | URL, tokens?: Tokens): Promise<Array<Track>>
{
  if(tokens)
  {
    const rawTracks = await tokens.getAll(url);
    return parseTracks(rawTracks);
  }

  return []
}

export async function parsePlaylist(query: Record<string, any>, tokens?: Tokens): Promise<Playlist>
{
  const tracksUrl = new URL(query["tracks"]["href"])
  const tracks = await retriveTracks(tracksUrl, tokens);

  const playlist: Playlist = {
    id: query["id"],
    uri: query["uri"],
    name: query["name"],
    description: query["description"],
    followers: query["followers"]["total"],
    public: query["public"],
    color: Color.white,
    tracks: tracks,
    snaps: [],
    cover: query["images"],
  }

  return playlist;
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