import { ISnapshot, IPlaylist, IChunks, IChunk, ISnapshotShort } from "../db/types.ts"
import { Chunk, Chunks, Snapshot } from "./types.ts";
import { hashChunks } from "../functions.ts";


// todo implemet snapshot parser
// export async function parseSnapshot(snaps: Snapshots, input: ISnapshot)
// {
//   const snap = new Snapshot(input);
//   const pointers = Object.entries(snap.pointers)
//       .map(([chunkId, snapId]) => {
//         return {"pointerId": chunkId, "snapId": snapId};
//       });

//   const chunks = await snaps.getPointers({userId: snap.userId, data: pointers});
//   snap.chunks = chunks;
//   return {snap, chunks};
// }

/**
 * Convert regular chunks to iChunks 
 * @param added 
 * @param overlap 
 * @param removed 
 * @param original 
 * @returns 
 */
export function iChunksFromDifference(added: Array<Chunk>, overlap?: Array<string>, removed?: Array<string>, original?: Snapshot): {chunks: IChunks, hash: string}
{
  const pointers = overlap?.map(chunkId => {
    const origin = original?.chunks.pointers[chunkId];
    return {
      hash: chunkId,
      isPointer: true,
      origin,
    } as IChunk;
  });
  const pointersMap = Object.fromEntries(pointers?.map(chunk => [chunk.hash, chunk.origin ?? ""]) ?? []);
  const removedChunks = removed?.map(chunkId => {
    return {
      hash: chunkId,
      isPointer: true,
      origin: original?.hash
    } as IChunk;
  });
  const addedChunks = added.map(chunk => {
    return {
      hash: chunk.hash,
      data: chunk,
      isPointer: false,
      previousChunk: chunk.previousChunk,
    } as IChunk;
  });
  // todo add 0th chunk case
  const chunks = addedChunks.concat(pointers ?? []);
  const connectedChunks = chunks.map((chunk, index, array) => {
    if (index == 0)
      return chunk; 

    chunk.previousChunk = array[index - 1].hash;
    return chunk;
  })
  const iChunks: IChunks = {
    chunks: connectedChunks,
    removed: removedChunks ?? [],
    pointers: pointersMap,
    lastChunk: connectedChunks.at(-1)?.hash ?? "0",
  };
  const date = new Date();
  const hash = hashChunks({chunks: chunks, date: date});

  return {chunks: iChunks, hash};
}

export function snapshotFromPlaylist(userId: string, playlist: IPlaylist, tracks: Array<string>, previousSnap?: ISnapshot, addSnapshotInplace=true)
{
  const baseData = {
    ...playlist,
    userId,
    creationDate: new Date()
  };

  const generateContinuing = () => {
    if(!previousSnap)
      return generateInitial(); // should never occur, is there only for compiler

    const previous = new Snapshot(previousSnap);
    const difference = previous.chunkItemsAlong(tracks);
    const iChunks = iChunksFromDifference(difference.added, difference.overlap, difference.removed, previous);
    const snapshotData = {
      ...baseData,
      previousSnap: previousSnap.hash,
      chunks: iChunks.chunks,
      hash: iChunks.hash,
    };
    return snapshotData;
  }
  const generateInitial = () => {
    const chunks = new Chunks(tracks);
    const iChunks = iChunksFromDifference(Object.values(chunks.data)); 
    const snapshotData = {
      ...baseData,
      previousSnap: "0",
      chunks: iChunks.chunks, 
      hash: iChunks.hash,
    }
    return snapshotData;
  }

  const snapshotData = previousSnap ? generateContinuing() : generateInitial();
  const snapshot = new Snapshot(snapshotData);
  
  if (addSnapshotInplace)
    playlist.snaps[baseData.creationDate.toISOString()] = snapshot as ISnapshotShort; 

  return snapshot;
}