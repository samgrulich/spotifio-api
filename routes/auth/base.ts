import { Users, UserInput, Schedule, Snapshots } from "../../modules/db/tables.ts";
import { initializeUserSnapshots, snapshotUserPlaylists } from "../versions/snapshots.ts";


export interface AuthOutput
{
  token: string;
}

export function generateToken(): string
{
  const token = crypto.randomUUID();
  return token;
}

export async function createUser(users: Users, snapshots: Snapshots, schedule: Schedule, userData: UserInput)
{
  schedule.pushPlaylists({ids: [userData.id]});

  const playlists = await initializeUserSnapshots(snapshots, userData);
  users.insert({userData, playlists});
}

export function loginUser(table: Users, userData: UserInput)
{
  const userAuthPair = {
    userId: userData.id,
    ip: userData.ip,
    token: userData.token
  }

  table.insertToken(userAuthPair);
}