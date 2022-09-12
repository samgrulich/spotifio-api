import { DynamoDatabase } from "./dynamodb.ts";
import { Users } from "./tables.ts";
import "dotenv/load.ts";
import { GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb?dts";
import { GetItemCommand, GetItemCommandInput } from "@aws-sdk/client-dynamodb?dts";
import { User } from "./types.ts";


const REGION = "eu-central-1";
const database = new DynamoDatabase(REGION);
// const table = new Users(database);

// const x = Deno.env.get("CLIENT_ID");
// console.log(x);

// const x = table.get({id: "36b8f84d-df4e-4d49-b662-bcde71a8764f"});
const id = "36b8f84d-df4e-4d49-b662-bcde71a8764f";
const params: GetItemCommandInput = {
    TableName: "Users",
    Key: {
        primaryKey: {S: id}
    }
};

const data = await database.documentClient.send(new GetItemCommand(params));
// console.log(data.Item);

const user = {
    id: "testID",
    name: "Sam",
    password: "hashed password",
    email: "sam@spotifio.com",
    playlists: [],
    liked: [],
    superLiked: [],
    cover: [],
}

// table.insert(user);