// deno-lint-ignore-file

// Create the DynamoDB service client module using ES6 syntax.
import { DynamoDBClient, 
  ExecuteStatementCommand, ExecuteStatementCommandInput } from "@aws-sdk/client-dynamodb";

import { DynamoDBDocumentClient, 
  PutCommand, GetCommand, UpdateCommand, DeleteCommand, BatchGetCommand, QueryCommand,
  PutCommandInput, GetCommandInput, UpdateCommandInput, DeleteCommandInput, BatchGetCommandInput, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { Exception } from "../errors.ts";
import { Status } from "http-status";

// import { Command } from "@aws-sdk/smithy-client?dts";


class DynamoSetup
{
  region: string; 
  client: DynamoDBClient;
  documentClient: DynamoDBDocumentClient;

  constructor(region="")
  {
    if (region == "")
      region = "us-east-1";

    this.region = region;
    this.client = this.createClient(region);
    this.documentClient = this.createDocumentClient();
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

  createDocumentClient()
  {
    const marshallOptions = {
      // Whether to automatically convert empty strings, blobs, and sets to `null`.
      convertEmptyValues: false, // false, by default.
      // Whether to remove undefined values while marshalling.
      removeUndefinedValues: false, // false, by default.
      // Whether to convert typeof object to map attribute.
      convertClassInstanceToMap: false, // false, by default.
    };

    const unmarshallOptions = {
      // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
      wrapNumbers: false, // false, by default.
    };

    const translateConfig = { marshallOptions, unmarshallOptions };

    // Create the DynamoDB document client.
    const ddbDocClient = DynamoDBDocumentClient.from(this.client, translateConfig);
    return ddbDocClient;
  }
}


export class DynamoDatabase 
{
  client: DynamoDBClient;
  documentClient: DynamoDBDocumentClient;

  constructor(region: string)
  {
    const setup = new DynamoSetup(region);
    
    this.client = setup.client;
    this.documentClient = setup.documentClient;

  }

  async executeStatement(params: ExecuteStatementCommandInput)
  {
    try {
      const data = await this.documentClient.send(new ExecuteStatementCommand(params));
      
      if (data)
        return {status: 200, data: data.Items}

      throw new Exception(Status.NotFound, "database_failed", ["Couldn't execute statement"]);
    } catch (err) {
      console.error(err);
    }
  }

  // async executeCommand(params: any)
  // {
  //   try {
  //     const data = await this.database.documentClient.send(new PutCommand(params));
  //     // console.log("Success - item added or updated", data);
  //     return {status: 200, data};
  //   } catch (err) {
  //     console.log("Error", err);
  //   }
  // }
}

export class Table 
{
  protected name: string;
  protected database: DynamoDatabase;

  constructor(name: string, database: DynamoDatabase)
  {
    this.name = name;
    this.database = database;
  }

  protected async putCmd(params: PutCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new PutCommand(params));
      console.log("putting", params, "\n result ", data);
      return data;
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid put command"]);
    }
  }

  protected async getCmd(params: GetCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new GetCommand(params));
      return data.Item;
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid get command"]);
    }
  }

  protected async batchGetCmd(params: BatchGetCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new BatchGetCommand(params));
      return Object.values(data.Responses ?? {})[0];
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid batch Get command"]);
    }
  }

  protected async updateCmd(params: UpdateCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new UpdateCommand(params));
      return data;
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid update command"]);
    }
  }

  protected async deleteCmd(params: DeleteCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new DeleteCommand(params));
      return data;
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid delete command"]);
    }
  }

  protected async queryCmd(params: QueryCommandInput)
  {
    try {
      const data = await this.database.documentClient.send(new QueryCommand(params));
      return data;
    } catch (err) {
      console.log("Error", err);
      throw new Exception(Status.NotFound, "database_failed", ["Invalid query command"]);
    }
  }
}
