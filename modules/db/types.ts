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

export interface IUser
{
  id: string;
  name: string;
  refreshToken: string;
  ips: Record<string, string>;
  playlists: Array<IPlaylist>;
  likes: Array<string>;
  superLikes: Array<string>;
  cover: Array<Image>;
  contact: { email: string, telephone?: string, messenger?: string, prefered: string};
  // billing info
}

export interface IPlaylistShort
{
  id: string;
  lastSnap: string; 
}

export interface IPlaylist
{
  id: string;
  name: string;
  description: string;
  public: boolean;
  color: Color;
  snaps: Record<string, ISnapshotShort>; // date: snap
  cover: Array<Image>;
}

export interface IChunkData
{
  hash: string;
  length: number;
  tracks: Array<string>;
}

export interface IChunk
{
  hash: string;
  data?: IChunkData,
  isPointer: boolean,
  origin?: string,
  previousChunk: string,
}

export interface IChunks
{
  chunks: Record<string, IChunk>; //suggestion 
  removed: Array<IChunk>;
  pointers: Record<string, string>; // chunkId: {snapId, chunkIndex}
  lastChunk: string;
}

export interface ISnapshotShort
{
  userId: string;
  hash: string;
  name: string;
  creationDate: Date;
}

export interface ISnapshot
{
  userId: string; 
  hash: string;
  name: string;
  previousSnap: string;
  description: string;
  public: boolean;
  color: Color;
  creationDate: Date;
  cover: Array<Image>;
  chunks: IChunks; 
}

export interface IArtistShort
{
  id: string;
  name: string;
}

export interface IArtist
{
  id: string;
  name: string;
  genres: Array<string>;
  cover: Array<Image>;
  popularity: number; 
}

export interface IAlbumShort
{
  id: string;
  name: string;
}

export interface IAlbum
{
  id: string;
  name: string;
  totalTracks: number;
  releaseDate: Date;
  // aviableMarkets: Array<string>;
  cover: Array<Image>;
  // restrictions?: {reason: string};
  artists: Array<IArtistShort>;
}

export interface ITrack
{
  id: string;
  name: string;
  discNumber: number;
  duration: number;
  explicit: boolean;
  album: IAlbumShort;
  artists: Array<IArtistShort>;
  cover: Array<Image>;
}
