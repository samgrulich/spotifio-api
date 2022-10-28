// create 
// request(chunk_index=0)
//  which chunk is requested, defaults to the 1st chunk(latest)

import { Snapshots, UserInput, Users } from "../../modules/db/tables.ts";
import { ISnapshotShort, IUser } from "../../modules/db/types.ts";
import { Tokens } from "../../modules/spotify/base.ts";
import { parsePlaylist, parseTracks } from "../../modules/spotify/parsers.ts";
import { snapshotFromPlaylist } from "../../modules/vc/parsers.ts";


export async function initializeUserSnapshots(snapshots: Snapshots, userData: UserInput)
{
  const tokens = new Tokens({refreshToken: userData.refreshToken});
  const _ = await tokens.getAccessToken();

  const promises = userData.playlists.map(async playlist => {
    const tracksRaw = await tokens.getAll(`playlists/${playlist.id}/tracks`);
    const tracks = parseTracks(tracksRaw, true).map(track => track["id"]) as Array<string>;
    const snap = snapshotFromPlaylist(userData.id, playlist, tracks);

    snapshots.insert(snap);
    return {id: playlist.id, lastSnap: snap.hash};
  });

  const playlists = await Promise.all(promises);
  return playlists;
}

export function snapshotUserPlaylists(users: Users, snapshots: Snapshots, user: IUser)
{
  const tokens = new Tokens({refreshToken: user.refreshToken});
  user.playlists.forEach(async playlistShort => {
    const tracksRaw = await tokens.getAll(`playlists/${playlistShort.id}/tracks`);
    const tracks = parseTracks(tracksRaw, true).map(track => track["id"]) as Array<string>;

    // query previous snap
    const previousSnapId = playlistShort.lastSnap;
    const isPrevioudSnapValid = previousSnapId && previousSnapId != "0";
    const previousSnap = isPrevioudSnapValid ? await snapshots.get({userId: user.id, snapId: previousSnapId}) : undefined;

    // query playlist info (from spotify)
    const playlistRaw = await tokens.get(`playlists/${playlistShort.id}`);
    const playlist = await parsePlaylist(playlistRaw);

    const snap = snapshotFromPlaylist(user.id, playlist, tracks, previousSnap, true);
    const snapShort: ISnapshotShort = snap;

    const params = {
      id: user.id,
      expression: "SET playlists.#p.lastSnap = :snap",
      names: {
        "#p": playlistShort.id
      }, 
      values: {
        ":snap": snapShort.hash
      }
    };
    users.update(params);

    snapshots.insert(snap);
  });

}