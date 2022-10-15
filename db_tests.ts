import "dotenv/load.ts";

import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Users } from "./modules/db/tables.ts";

const db = new DynamoDatabase("eu-central-1");
const users = new Users(db);

const query = {
    ip: "127-0-0-1",
    token: "0e1e87c1-0405-48ed-bc16-a019846e63ae",
    userId: "m9s2zuq40inu2f9zyx3ruyvwi"
}

const token = await users.getToken(query);
console.log(token);
console.log("done");