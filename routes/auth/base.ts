import { Users, UserInput } from "../../modules/db/tables.ts";


export interface AuthOutput
{
  token: string;
}

export function generateToken(): string
{
  const token = crypto.randomUUID();
  return token;
}

export function createUser(table: Users, userData: UserInput)
{
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