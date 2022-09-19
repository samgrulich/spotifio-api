import { Users, UserInput, Schedule } from "../../modules/db/tables.ts";


export interface AuthOutput
{
  token: string;
}

export function generateToken(): string
{
  const token = crypto.randomUUID();
  return token;
}

export function createUser(table: Users, schedule: Schedule, userData: UserInput)
{
  schedule.pushPlaylists({ids: [userData.id]});
  table.insert(userData);
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