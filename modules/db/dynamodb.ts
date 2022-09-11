// Create the DynamoDB service client module using ES6 syntax.
import { DynamoDBClient, 
  ExecuteStatementCommand, ExecuteStatementCommandInput } from "@aws-sdk/client-dynamodb?dts";

// import { Database } from "../types.ts";


class DynamoSetup
{
  region: string; 
  client: DynamoDBClient;

  constructor(region="")
  {
    if (region == "")
      region = "us-east-1";

    this.region = region;
    this.client = this.createClient(region);
  }
  
  createClient(region: string)
  {
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";

    if (accessKeyId == "")
      console.warn("Access key id env not set, using empty str");
    
    if (secretAccessKey == "")
      console.warn("Secret Access key id env not set, using empty str");
    
    const credentials = {
      accessKeyId,
      secretAccessKey
    }

    // Create an Amazon DynamoDB service client object.
    const ddbClient = new DynamoDBClient({ region, credentials });
    return ddbClient;
  }
}


export class DynamoDatabase 
{
  client: DynamoDBClient;
  tableName: string;

  constructor(region: string, tableName: string)
  {
    const setup = new DynamoSetup(region);
    
    this.client = setup.client; 
    this.tableName = tableName;
  }

  async run(params: ExecuteStatementCommandInput)
  {
    try {
      await this.client.send(new ExecuteStatementCommand(params));
      // console.log("Success. Item added.");
      return "Run successfully"; // For unit tests.
    } catch (err) {
      console.error(err);
    }
  }
}
