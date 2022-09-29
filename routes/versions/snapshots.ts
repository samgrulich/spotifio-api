// create 
// request(chunk_index=0)
//  which chunk is requested, defaults to the 1st chunk(latest)

import { Snapshots, Users } from "../../modules/db/tables.ts";
import { ISnapshotShort, IUser } from "../../modules/db/types.ts";
import { Tokens } from "../../modules/spotify/base.ts";
import { snapshotFromPlaylist } from "../../modules/vc/parsers.ts";


export function snapshotUserPlaylists(users: Users, snapshots: Snapshots, user: IUser)
{
  user.playlists.forEach(async playlist => {
    const tokens = new Tokens({refreshToken: user.refreshToken});
    const tracks = await tokens.getAll(`playlists/${playlist.id}/tracks`);

    const previousSnapShort = Object.values(playlist.snaps).at(-1);
    const previousSnap = previousSnapShort ? await snapshots.get({userId: user.id, snapId: previousSnapShort.hash}) : undefined;
    const snap = snapshotFromPlaylist(user.id, playlist, tracks, previousSnap, true);
    const snapShort: ISnapshotShort = snap;

    const params = {
      id: user.id,
      expression: "SET playlists.#p.snaps[] = :snap",
      names: {
        "#p": playlist.id
      }, 
      values: {
        ":snap": snapShort
      }
    };
    users.update(params);

    snapshots.insert(snap);
  });

}