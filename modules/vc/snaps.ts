import { Chunk, Color, Image, ISnapshot, SnapshotDifferenceData, TrackShort } from "../db/types.ts";
import { digest } from "../functions.ts";


const S_CHUNK_SIZE = 10;
const S_TRESHOLD = 50;
const M_CHUNK_SIZE = 20;
const M_TRESHOLD = 100;
const L_CHUNK_SIZE = 50;
const L_TRESHOLD = 400;
const MONSTER_CHUNK_SIZE = 100;


function getIterations(length: number, chunkSize: number): Array<number>
{
  const max = Math.ceil(length / chunkSize);
  const arr = Array.from(Array(max).keys(), val => val * chunkSize);

  return arr;
}

/**
 * Split and convert array to chunks
 *  
*/ 
function generateChunks(items: Array<TrackShort>, chunkSize: number): Array<Chunk>
{
  if (!items)
    return [];

  const iterations = getIterations(items.length, chunkSize);
  const chunks = iterations.map(start => {
    const end = start + chunkSize;
    const slice = items.slice(start, end);

    const chunk = new Chunk(slice);
    return chunk;
  });

  return chunks;
}

export class Snapshot implements ISnapshot
{
  chunkSize = 40;

  userId: string;
  // snapId: string;
  name: string;
  previousSnap: string;
  description: string;
  followers: number;
  public: boolean;
  color: Color;
  creationDate: Date;
  tracks: Array<TrackShort>;
  removedTracks: Array<TrackShort>;
  chunks: Record<string, Chunk>;
  pointers: Record<string, string>;
  cover: Array<Image>;

  constructor(data: {
    userId: string,
    snapId?: string,
    name: string,
    previousSnap: string,
    description: string,
    followers: number,
    public: boolean,
    color: Color,
    creationDate: Date,
    tracks?: Array<TrackShort>,
    removedTracks?: Array<TrackShort>,
    chunks?: Record<string, Chunk>,
    pointers?: Record<string, string>,
    cover: Array<Image>
  })
  {
    this.userId = data.userId;
    // this.snapId = data.snapId;
    this.name = data.name;
    this.previousSnap = data.previousSnap;
    this.description = data.description;
    this.followers = data.followers;
    this.public = data.public;
    this.color = data.color;
    this.creationDate = data.creationDate;
    this.tracks = data.tracks ?? [];
    this.removedTracks = data.removedTracks ?? [];
    this.chunks = data.chunks ?? {};
    this.pointers = data.pointers ?? {};
    this.cover = data.cover;

    const tracksLen = this.tracks.length;
    const chunkSize = 
      tracksLen < S_TRESHOLD ? S_CHUNK_SIZE : 
        (tracksLen < M_TRESHOLD ? M_CHUNK_SIZE : 
          (tracksLen < L_TRESHOLD ? L_CHUNK_SIZE : 
            MONSTER_CHUNK_SIZE));
    this.chunkSize = chunkSize;
  }

  get trackIds()
  {
    return this.tracks.map(track => track.id);
  }

  compare(other: Snapshot)
  {
    const keys = Object.keys(this.chunkItems);
    const otherKeys = Object.keys(other.chunkItems);

    const overlap = keys.filter((key) => {
      return otherKeys.includes(key);
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
    const chunksArr = generateChunks(this.tracks, this.chunkSize);

    const chunks = Object.fromEntries(
      chunksArr.map(chunk => [chunk.hashed, chunk])
    );

    return chunks;
  }

  chunkItemsAlong(other: Snapshot): SnapshotDifferenceData | undefined
  {
    if(!this.tracks)
    {
      console.warn("Chunk along, but no tracks initialized");
      return undefined;
    }

    const chunkSize = other.chunkSize;
    const sameChunks: Array<string> = [];
    const changedIds: Array<string> = [];
    let newTrackIds: Array<string> = this.trackIds;
    const removedIds: Array<string> = [];

    // todo: Paralelize this part
    Object.entries(other.chunks).forEach(([hash, chunk]) => {
      const sameTrackIds: Array<string> = [];
      const isSame = chunk.trackIds.every(trackId => {
        const isSameTrack = newTrackIds.includes(trackId);

        if(isSameTrack)
          sameTrackIds.push(trackId);
        else
          removedIds.push(trackId);

        return isSameTrack;
      });
      
      if(isSame)
      {
        newTrackIds = newTrackIds.filter(id => sameTrackIds.includes(id));
        sameChunks.push(hash);
        return;
      }

      changedIds.concat(sameTrackIds);
    });

    const changedTracks = changedIds.map(id => new TrackShort(id));
    const changedChunks = generateChunks(changedTracks, chunkSize);

    const newTracks = newTrackIds.map(id => new TrackShort(id));
    const newChunks = generateChunks(newTracks, chunkSize);

    const removedTracks = removedIds.map(id => new TrackShort(id));

    const differenceData = new SnapshotDifferenceData({originSnap: other, sameChunks, changedChunks, newChunks, removedTracks});
    this.pointers = differenceData.pointers;
    this.removedTracks = removedTracks;
    this.chunks = differenceData.changedChunks;
    return differenceData;
  }

  get hash(): string 
  {
    const hashed = digest(this);
    return hashed;
  }

  get snapId(): string
  {
    return this.hash;
  }
}