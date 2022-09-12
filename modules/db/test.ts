import { DynamoDatabase } from "./dynamodb.ts";
import { Users } from "./tables.ts";
import "dotenv/load.ts";
import { GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb?dts";

const database = new DynamoDatabase("eu-central-1");
const table = new Users(database);

// const x = Deno.env.get("CLIENT_ID");
// console.log(x);

// const x = table.get({id: "36b8f84d-df4e-4d49-b662-bcde71a8764f"});
const id = "36b8f84d-df4e-4d49-b662-bcde71a8764f";
const params: GetCommandInput = {
    TableName: "Users",
    Key: {
        primaryKey: {S: id}
    }
};

// const data = await database.documentClient.send(new GetCommand(params));
// console.log(data.Item);