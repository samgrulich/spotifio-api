import { User } from "../modules/db/types.ts";
import { Users, UserInput } from "../modules/db/tables.ts";


export interface AuthOutput
{
  token: string;
}

function generateToken(): string
{
  const token = crypto.randomUUID();
  return token;
}

export function createUser(table: Users, userData: UserInput)
{
  userData.token = generateToken();
  
  table.insert(userData);

  Promise.resolve("success");
}

export function loginUser(table: Users, userData: {userId: string, ip: string})
{
  const token = generateToken();
  const user = {
    token,
    ...userData
  };

  table.insertToken(user);
  Promise.resolve("success");
}