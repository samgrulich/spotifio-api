import { digest } from "../functions.ts";

export enum Color
{
  white,
  red,
  orange, yellow, pink, green,
  brown,
  blue,
  purple,
  gray,
  black,
}

export interface Image
{
  url: string;
  width: number;
  height: string;
}

export interface User
{
  id: string;
  name: string;
  refreshToken: string;
  ips: Record<string, string>;
  playlists: Array<Playlist>;
  likes: Array<string>;
  superLikes: Array<string>;
  cover: Array<Image>;
  contact: { email: string, telephone?: string, messenger?: string, prefered: string};
  // billing info
}

export interface Playlist
{
  id: string;
  uri: string;
  name: string;
  description: string;
  followers: number;
  public: boolean;
  color: Color;
  tracks: Array<Track>;
  snaps: Array<ISnapshotShort>;
  cover: Array<Image>;
}

export interface ISnapshot
{
  userId: string; 
  snapId: string;
  hash?: string;
  name: string;
  previousSnap: string;
  description: string;
  followers: number;
  public: boolean;
  color: Color;
  creationDate: Date;
  tracks?: Array<TrackShort>;
  removedTracks?: Array<TrackShort>;
  chunks?: Record<string, Chunk>;
  pointers?: Record<string, string>; // id of chunk, id of snap
  cover: Array<Image>;
}

export class Chunk
{
  length: number;
  tracks: Array<TrackShort>;

  constructor(tracks: Array<TrackShort>)
  {
    this.tracks = tracks;
    this.length = tracks.length;
  }

  get hashed()
  {
    return digest(this.tracks);
  }

  get trackIds()
  {
    return this.tracks.map(track => track.id);
  }
}

export interface ISnapshotShort
{
  userId: string;
  snapId: string;
  hash?: string;
  name: string;
  creationDate: Date;
}

export class SnapshotDifferenceData
{
  sameChunks: Array<Chunk>; // add string variable
  #changedChunks: Array<Chunk>;
  newChunks: Array<Chunk>; 
  removedTracks: Array<TrackShort>;
  originSnap: ISnapshot;

  constructor(input: {originSnap: ISnapshot, sameChunks: Array<string>, changedChunks: Array<Chunk>, 
    newChunks: Array<Chunk>, removedTracks: Array<TrackShort>})
  {
    this.originSnap = input.originSnap;
    this.#changedChunks = input.changedChunks;
    this.newChunks = input.newChunks;
    this.removedTracks = input.removedTracks;

    const originChunks = Object.entries(input.originSnap.chunks ?? {});
    const sameChunks = originChunks
      .filter(([key, _]) => {
        input.sameChunks.includes(key)
      }).map(([_, Chunk]) => {
        return Chunk;
      });
    this.sameChunks = sameChunks;
  }

  get pointers()
  {
    const originPointers = Object.entries(this.originSnap.pointers ?? {});
    const originPointerKeys = Object.keys(this.originSnap.pointers ?? {});
    const newPointers: Array<Array<string>> = [];

    // return same pointers to the original snap {hash(chunkId), snapId}
    const samePointers = this.sameChunks
      .filter(chunk => {
        const isSame = originPointerKeys.includes(chunk.hashed);

        if(!isSame)
          newPointers.push([chunk.hashed, this.originSnap.snapId]);

        return isSame;
      })
      .map((chunk, index) => [chunk.hashed, originPointers[index]]);

    const pointersArr = samePointers.concat(newPointers);
    // todo not the pretties of codes but it get the job done
    const pointers = Object.fromEntries(pointersArr);
    return pointers; 
  }

  get changedChunks()
  {
    const chunksArr = this.#changedChunks.map(chunk => [chunk.hashed, chunk]);
    const chunks: Record<string, Chunk> = Object.fromEntries(chunksArr);
    
    return chunks;
  }
}

export interface Artist
{
  id: string;
  uri: string;
  name: string;
  followers: number;
  genres: Array<string>;
  cover: Array<Image>;
  popularity: number; 
}

export interface Album
{
  id: string;
  uri: string;
  name: string;
  totalTracks: number;
  releaseDate: Date;
  aviableMarkets: Array<string>;
  cover: Array<Image>;
  restrictions?: {reason: string};
  artists: Array<Artist>;
}

export interface AlbumShort
{
  id: string;
  name: string;
}

export interface Track
{
  id: string;
  uri: string;
  name: string;
  discNumber: number;
  duration: number;
  explicit: boolean;
  aviableMarkets: Array<string>;
  album: AlbumShort;
  artists: Array<Artist>;
  cover: Array<Image>;
}

export class TrackShort
{
  id: string;

  constructor(id: string)
  {
    this.id = id;
  }
}
