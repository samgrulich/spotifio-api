import { User } from "../modules/db/types.ts";
import { Users, UserInput } from "../modules/db/tables.ts";


export async function connect(table: Users, user: UserInput) 
{
  // call spotify auth
  // if user not found create new

//   await table.insert(user)
//     .then((data) => {
//       return;
//     })
//     .catch((reason) => {
//       if (reason == 404)
//         throw {status: 404, reason: "User not found"};
//     });
}