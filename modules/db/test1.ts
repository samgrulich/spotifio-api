import "dotenv/load.ts";
import { DynamoDB, DynamoDBClient, DynamoDBClientConfig, GetItemCommand, GetItemCommandInput, PutItemCommand, PutItemCommandInput } from "https://esm.sh/@aws-sdk/client-dynamodb@3.169.0";
import { GetCommand, GetCommandInput } from "https://esm.sh/@aws-sdk/lib-dynamodb@3.169.0";

const REGION = "eu-central-1";
const config: DynamoDBClientConfig = {
    region: REGION,
    credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
    }
}

const database = new DynamoDBClient(config);
const commandInput: GetCommandInput = {
    TableName: "Users",
    Key:{
        id: "36b8f84d-df4e-4d49-b662-bcde71a8764f",
    }
};

const data = await database.send(new GetCommand(commandInput));
console.log(data.Item);
