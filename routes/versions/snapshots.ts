// create 
// request(chunk_index=0)
//  which chunk is requested, defaults to the 1st chunk(latest)

import { UpdateCommandInput } from "https://esm.sh/v94/@aws-sdk/lib-dynamodb@3.169.0/dist-types/index.d.ts";
import { Snapshots, Users } from "../../modules/db/tables.ts";
import { ISnapshotShort, Playlist, User } from "../../modules/db/types.ts";
import { snapshotFromPlaylist } from "../../modules/vc/parsers.ts";

function snapshotPlaylist(playlist: string)
{

}

export function snapshotUserPlaylists(users: Users, snapshots: Snapshots, user: User)
{
  user.playlists.forEach(playlist => {
    const snap = snapshotFromPlaylist(user.id, playlist);
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