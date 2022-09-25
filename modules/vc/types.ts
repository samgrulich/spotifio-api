import { IChunkData, Color, Image, ISnapshot, IChunks, IChunk } from "../db/types.ts";
import { hashChunks, digest } from "../functions.ts";


// const S_CHUNK_SIZE = 10;
// const S_TRESHOLD = 50;
// const M_CHUNK_SIZE = 20;
// const M_TRESHOLD = 100;
// const L_CHUNK_SIZE = 50;
// const L_TRESHOLD = 400;
// const MONSTER_CHUNK_SIZE = 100;
const CHUNK_SIZE = 40;

/**
 * Return of how many iterations needed to divide an array with given chunks sizes
 * @param length - arr length
 * @param chunkSize - chunk size
 */
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
function generateChunks(items: Array<string>, chunkSize: number): Array<Chunk>
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

export class Chunk implements IChunkData
{
  length: number;
  tracks: Array<string>;

  constructor(tracks: Array<string>)
  {
    this.tracks = tracks;
    this.length = tracks.length;
  }

  get hash(): string
  {
    return digest(this.tracks);
  }
}

export class Chunks 
{
  chunkSize = CHUNK_SIZE;

  length: number;
  tracks: Array<string>;
  // data: Array<IChunkData>;
  
  constructor(tracks: Array<string>)
  {
    const tracksLen = tracks.length;
    // const chunkSize = 
    //   tracksLen < S_TRESHOLD ? S_CHUNK_SIZE : 
    //     (tracksLen < M_TRESHOLD ? M_CHUNK_SIZE : 
    //       (tracksLen < L_TRESHOLD ? L_CHUNK_SIZE : 
    //         MONSTER_CHUNK_SIZE));

    this.tracks = tracks;
    this.length = tracksLen;
  }

  get data(): Record<string, Chunk>
  {
    const chunksArr = generateChunks(this.tracks, this.chunkSize);

    const chunks = Object.fromEntries(
      chunksArr.map(chunk => [chunk.hash, chunk])
    );

    return chunks;
  }
}

export class Snapshot implements ISnapshot
{
  chunkSize = CHUNK_SIZE;

  userId: string;
  name: string;
  previousSnap: string;
  description: string;
  public: boolean;
  color: Color;
  creationDate: Date;
  cover: Array<Image>;
  chunks: IChunks;
  chunkIds: Array<string>;

  constructor(input: {
    userId: string,
    name: string,
    previousSnap: string,
    description: string,
    public: boolean,
    color: Color,
    creationDate: Date,
    cover: Array<Image>
    chunks: IChunks,
  })
  {
    this.userId = input.userId;
    this.name = input.name;
    this.previousSnap = input.previousSnap;
    this.description = input.description;
    this.public = input.public;
    this.color = input.color;
    this.creationDate = input.creationDate;
    this.cover = input.cover;

    this.chunks = input.chunks;
    this.chunkIds = input.chunks.chunks.map(chunk => chunk.hash);
  }

  compare(other: ISnapshot)
  {
    const keys = Object.keys(this.chunks);
    const otherKeys = Object.keys(other.chunks);

    const overlap = keys.filter((key) => {
      return otherKeys.includes(key);
    });
    const removed = otherKeys.filter((key) => {
      return !overlap.includes(key);
    });
    const added = keys.filter((key) => {
      return !overlap.includes(key);
    })

    return {overlap, added, removed};
  }

  chunkItemsAlong(tracks: Array<string>)
  {
    const chunks = new Chunks(tracks).data;
    const chunkIds = Object.keys(chunks);
    // const added: Array<Chunk> = [];
    // const removed: Array<IChunk> = [];

    // todo: Paralelize this part
    const chunkOverlap = chunkIds.filter(hash => this.chunkIds.includes(hash));
    const added = chunkIds
      .filter(newId => !(chunkOverlap.includes(newId)))
      .map(chunkId => chunks[chunkId]);
    const removed = this.chunkIds.filter(oldId => !(chunkOverlap.includes(oldId)));

    // const differenceData = new SnapshotDifferenceData({originSnap: other, sameChunks, changedChunks, newChunks, removedTracks});
    // this.pointers = differenceData.pointers;
    // this.removedTracks = removedTracks;
    // this.chunks = differenceData.changedChunks;
    return {overlap: chunkOverlap, added, removed};
  }

  // add function which queries the db for more accurate chunking of tracks

  get hash(): string 
  {
    const hashed = hashChunks({chunks: this.chunks.chunks, date: this.creationDate});
    return hashed;
  }
}

// export class SnapshotDifferenceData
// {
//   sameChunks: Array<Chunk>; // add string variable
//   changedChunks: Array<Chunk>;
//   newChunks: Array<Chunk>; 
//   removedTracks: Array<TrackShort>;
//   originSnap: ISnapshot;

//   constructor(input: {originSnap: ISnapshot, sameChunks: Array<string>, changedChunks: Array<Chunk>, 
//     newChunks: Array<Chunk>, removedTracks: Array<TrackShort>})
//   {
//     this.originSnap = input.originSnap;
//     this.changedChunks = input.changedChunks;
//     this.newChunks = input.newChunks;
//     this.removedTracks = input.removedTracks;

//     const originChunks = Object.entries(input.originSnap.chunks ?? {});
//     const sameChunks = originChunks
//       .filter(([key, _]) => {
//         input.sameChunks.includes(key)
//       }).map(([_, Chunk]) => {
//         return Chunk;
//       });
//     this.sameChunks = sameChunks;
//   }

//   get pointers()
//   {
//     const originPointers = Object.entries(this.originSnap.pointers ?? {});
//     const originPointerKeys = Object.keys(this.originSnap.pointers ?? {});
//     const newPointers: Array<Array<string>> = [];

//     // return same pointers to the original snap {hash(chunkId), snapId}
//     const samePointers = this.sameChunks
//       .filter(chunk => {
//         const isSame = originPointerKeys.includes(chunk.hashed);

//         if(!isSame)
//           newPointers.push([chunk.hashed, this.originSnap.snapId]);

//         return isSame;
//       })
//       .map((chunk, index) => [chunk.hashed, originPointers[index]]);

//     const pointersArr = samePointers.concat(newPointers);
//     // todo not the pretties of codes but it get the job done
//     const pointers = Object.fromEntries(pointersArr);
//     return pointers; 
//   }

//   // get changedChunks()
//   // {
//   //   const chunksArr = this.changedChunks.map(chunk => [chunk.hashed, chunk]);
//   //   const chunks: Record<string, Chunk> = Object.fromEntries(chunksArr);
    
//   //   return chunks;
//   // }
// }
