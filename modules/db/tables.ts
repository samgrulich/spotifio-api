// deno-lint-ignore-file no-explicit-any
import { Table, DynamoDatabase } from "./dynamodb.ts";
import { Image, Playlist, User } from "./types.ts";
import { GetCommandInput, UpdateCommandInput } from "@aws-sdk/lib-dynamodb@3.169.0";
// deno-lint-ignore no-unused-vars
import { noIP, noToken, noUser, invalidIP, invalidToken, invalid, missing, checkObject } from "./errors.ts";

export interface UserInput
{
  id: string;
  name: string;
  refreshToken: string;
  ip: string;
  token: string;
  email: string;
  playlists: Array<Playlist>;
  liked: Array<string>;
  cover: Array<Image>;
}

export class Users extends Table
{
  constructor(database: DynamoDatabase)
  {
    super("Users", database);
  }

  async get(query: {id: string}): Promise<User>
  {
    const params = {
      TableName: this.name,
      Key: {
        primaryKey: query.id,
      }
    }

    const data = await super.getCmd(params);
    const user = data?.data as User;
    return user;
  }

  async getToken(query: {userId: string, ip: string})
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ProjectionExpression: "ips.#ip",
      ExpressionAttributeNames: {
        "#ip": query.ip
      }
    }

    const data = await this.getCmd(params)
      .catch((err) => {
        console.log(err); 
        throw err;
      });
    
    if (!data)
      throw invalid("user");
    
    return Promise.resolve(data?.data);
  }

  validateToken(query: {userId: string, ip: string, token: string})
  {
    checkObject(query);

    this.getToken(query)
      .then((data) => {
        const tokenDB = data.ips[query.ip];
        
        if (tokenDB != query.token)
          throw invalidToken; 
      })
      .catch((err) => {
        if (err.status)
          throw err;
        
        console.log(err);
        throw invalidIP;
      });

    return Promise.resolve("success");
  }

  async getSpotifyToken(query: {userId: string, token: string})
  {
    checkObject(query);

    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ProjectionExpression: "refreshToken",
    }

    const data = await this.getCmd(params)
      .catch((err) => {
        console.log(err);
        throw invalidToken;
      });
    
    if (!data)
      throw invalid("user");
    
    return Promise.resolve(data?.data);
  }

     
  async insert(query: UserInput) 
  {
    const authPair: Record<string, string> = {};
    authPair[query.ip] = query.token;

    const user: User = {
      id: query.id,
      name: query.name, 
      refreshToken: query.refreshToken,
      ips: authPair,
      playlists: query.playlists,
      likes: query.liked,
      superLikes: [],
      cover: query.cover,
      contact: {email: query.email, prefered: "email"}
    }

    const params = {
      TableName: this.name,
      Item: user
    }

    const _data = await this.putCmd(params);
    // const status = data?.status;
    // return status;
  }

  async insertToken(query: {userId: string, ip: string, token: string})
  {
    const params: UpdateCommandInput = {
      TableName: this.name,
      Key: {
        primaryKey: query.userId,
      },
      UpdateExpression: `SET ips.${query.ip}=:t`,
      ExpressionAttributeValues: {
        ":t": query.token
      }
    }

    const _data = await this.updateCmd(params);
    // const status = data?.status;
    // return status;
  }

  async update(query: {params?: UpdateCommandInput, id: string, expression: string, names: Record<string, string>, values: Record<string, any>})
  {
    let projection = "";
    Object.keys(query.names).forEach((key: string) => {
      projection += key;
    })

    const params: UpdateCommandInput = {
      TableName: this.name,
      Key: {
        id: query.id,
      },
      // ProjectionExpression: projection,
      UpdateExpression: query.expression,
      ExpressionAttributeNames: query.names,
      ExpressionAttributeValues: query.values,
    }

    const _data = await this.updateCmd(params);
    // const status = data?.status;
    // return status;
  }


  async delete(query: {id: string})
  {
    const params = {
      TableName: this.name,
      Key: {
        primaryKey: query.id
      }
    }

    const _data = await this.deleteCmd(params);
    // const status = data?.status;
    // return status;
  }
}