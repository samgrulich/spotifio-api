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
  ips: [{ip: string, token: string}];
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
  snaps: Array<SnapshotShort>;
  cover: Array<Image>;
}

export interface Snapshot
{
  id: string;
  hash?: string;
  name: string;
  description: string;
  followers: number;
  public: boolean;
  color: Color;
  creationDate: Date;
  tracks: Array<Track>;
  cover: Array<Image>;
}

export interface SnapshotShort
{
  id: string;
  hash?: string;
  name: string;
  creationDate: Date;
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
  artist: Array<Artist>;
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
