import { Chunk, Color, Image, ISnapshot, ISnapshotShort, Track } from "../db/types.ts";
import { digest } from "../functions.ts";


class Snapshot implements ISnapshot
{
  chunkSize = 10;

  id: string;
  name: string;
  description: string;
  followers: number;
  public: boolean;
  color: Color;
  creationDate: Date;
  tracks: Array<Track>;
  cover: Array<Image>;

  constructor(data: ISnapshot)
  {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.followers = data.followers;
    this.public = data.public;
    this.color = data.color;
    this.creationDate = data.creationDate;
    this.tracks = data.tracks;
    this.cover = data.cover;
  }

  compare(other: Snapshot)
  {
    const keys = Object.keys(this.chunkItems);
    const otherKeys = Object.keys(other.chunkItems);

    const overlap = otherKeys.filter((key) => {
      return keys.includes(key);
    });
    const removed = otherKeys.filter((key) => {
      return !overlap.includes(key);
    });
    const added = keys.filter((key) => {
      return !overlap.includes(key);
    })

    return {overlap, removed, added};
  }

  get chunkItems(): Record<string, Chunk>
  {
    const items = this.tracks;
    const iterations = Math.ceil(items.length / this.chunkSize);

    const chunks: Record<string, Chunk> = {};
    for(let i=0; i < iterations; i++)
    {
      const startIndex = i * this.chunkSize;
      const endIndex = startIndex + this.chunkSize;
      const tracks = items.slice(startIndex, endIndex);
      const hashed = digest(tracks); 

      const chunk: Chunk = {
        size: tracks.length,
        tracks: tracks
      }

      chunks[hashed] = chunk;
    }

    return chunks;
  }

  get hash(): string | undefined
  {
    const hashed = digest(this);
    return hashed;
  }
}