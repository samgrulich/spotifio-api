import { Users } from "../db/tables.ts";


export async function validateToken(userTable: Users, userId: string, ip: string, token: string): Promise<boolean>
{
  if (!token)
    throw {reason: "No token", status: 404};

  if (!ip)
    throw {reason: "No ip", status: 400};

  if (!userId)
    throw {reason: "No user", status: 401}

  const data = await userTable.getToken({userId, ip});
  
  if (!data)
    throw {reason: "Invalid ip", status: 500}

  const tokenDB = data.ips[ip];

  if (tokenDB != token)
    throw {reason: "Invalid token", status: 501}
  
  return true;
}