// messing with pointers 

import { Snapshots } from "../db/tables.ts";
import { ISnapshot, ISnapshotShort, Playlist, SnapshotDifferenceData } from "../db/types.ts"
import { Snapshot } from "./snaps.ts";


export async function parseSnapshot(snaps: Snapshots, input: ISnapshot)
{
  const snap = new Snapshot(input);
  const pointers = Object.entries(snap.pointers)
      .map(([chunkId, snapId]) => {
        return {"pointerId": chunkId, "snapId": snapId};
      });

  const chunks = await snaps.getPointers({userId: snap.userId, data: pointers});
  snap.chunks = chunks;
  return {snap, chunks};
}

export function snapshotFromPlaylist(userId: string, playlist: Playlist, addSnapshotInplace=true)
{
  const date = new Date();
  const previousSnap = playlist.snaps.at(-1);
  const snapData = {
    userId,
    name: playlist.name,
    previousSnap: previousSnap ? previousSnap.snapId : "0",
    description: playlist.description,
    followers: playlist.followers,
    public: playlist.public,
    color: playlist.color,
    creationDate: date,
    tracks: playlist.tracks,
    cover: playlist.cover
  }
  
  const snap = new Snapshot(snapData);

  if (addSnapshotInplace)
    playlist.snaps.push(snap);

  return snap;
}