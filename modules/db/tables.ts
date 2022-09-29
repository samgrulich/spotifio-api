// deno-lint-ignore-file no-explicit-any
import { Table, DynamoDatabase } from "./dynamodb.ts";
import { IChunk, Image, ISnapshot, IPlaylist, IUser } from "./types.ts";
import { GetCommandInput, UpdateCommandInput, PutCommandInput, QueryCommandInput } from "@aws-sdk/lib-dynamodb@3.169.0";
// deno-lint-ignore no-unused-vars
import { noIP, noToken, noUser, invalidIP, invalidToken, invalid, missing, checkObject } from "./errors.ts";
import { Snapshot } from "../vc/types.ts";

export interface UserInput
{
  id: string;
  name: string;
  refreshToken: string;
  ip: string;
  token: string;
  email: string;
  playlists: Array<IPlaylist>;
  liked: Array<string>;
  cover: Array<Image>;
}

export class Users extends Table
{
  constructor(database: DynamoDatabase)
  {
    super("Users", database);
  }

  async get(query: {id: string}): Promise<IUser>
  {
    const params = {
      TableName: this.name,
      Key: {
        primaryKey: query.id,
      }
    }

    const data = await super.getCmd(params);
    const user = data?.data as IUser;
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

    const data = await this.getCmd(params);
    
    if (!data)
      throw invalid("user");
    
    return Promise.resolve(data?.data);
  }

  validateToken(query: {userId: string, ip: string, token: string})
  {
    // checkObject(query);

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

    return Promise.resolve(true);
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
    const authPair: Record<string, string> = {[query.ip]: query.token};

    const user: IUser = {
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

  async update(query: {params?: UpdateCommandInput, id: string, expression: string, names?: Record<string, string>, values?: Record<string, any>})
  {
    let projection = "";
    const names = query.names ?? {}; 
    Object.keys(names).forEach((key: string) => {
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

export class Snapshots extends Table
{
  constructor(database: DynamoDatabase)
  {
    super("Snapshots", database);
  }

  async get(query: {userId: string, snapId: string}): Promise<ISnapshot> {
    // request the ISnapshot raw data
    
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        userId: query.userId,
        hash: query.snapId
      }
    }

    const data = await super.getCmd(params);
    const snap = data?.data as ISnapshot;
    return snap ?? {};
  }

  async getDetails(query: {userId: string, snapId: string})
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        userId: query.userId,
        hash: query.snapId
      },
      ProjectionExpression: "name, previousSnap, description, color, creationDate, cover"
    };

    const data = await this.getCmd(params);
    if (!data)
      throw invalid("snapshot");

    return data;
  }

  async getDate(query: {userId: string, date: Date})
  {
    const startDate = query.date;
    startDate.setDate(query.date.getDate() - 73);

    const params: QueryCommandInput = {
      TableName: this.name,
      ExpressionAttributeNames: {
        "#pKey": "userId",
        "#sKey": "creationDate" 
      },
      ExpressionAttributeValues: {
        ":userId": query.userId,
        ":startDate": startDate,
        ":endDate": query.date,
      },
      KeyConditionExpression: "#pKey = :userId AND #sKey BETWEEN :startDate AND :endDate",
    }

    const data = await this.queryCmd(params);
    if (data.Count == 0)
      throw missing("snapshots");

    // if duplicates return the first one
    const snaps = data.Items ?? {};
    return snaps;
  }

  // todo: document 
  async getChunk(query: {userId: string, snapId: string, chunkId: string}, parsePointer=false): Promise<IChunk>
  {
    // request data from database
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        userId: query.userId,
        hash: query.snapId,
      },
      ProjectionExpression: `chunks.chunks[${query.chunkId}]`,
    }

    const data = await this.getCmd(params);
 
    if (!data)
      throw invalid("chunk");

    // request additional data if pointer
    const chunk: IChunk = data?.data;
    if (!(chunk.isPointer && parsePointer))
    {
      if (!chunk.origin)
        throw invalid("pointer");

      const pointerQuery = {
        ...query,
        snapId: chunk.origin,
      };

      const pointer = await this.getChunk(pointerQuery, false);
      chunk.data = pointer.data;
    }
    
    return chunk;
  }

  async insert(query: Snapshot) {
    // parse pointers
    const params: PutCommandInput = {
      TableName: this.name,
      Item: query
    }
    
    const _data = await super.putCmd(params);
  }
}

export class Schedule extends Table
{
  dayCount = 73; // how much days the DB stores

  constructor(database: DynamoDatabase)
  {
    super("Schedule", database);
  }

  async init()
  {
    const days = Array.from(Array(this.dayCount).keys());
    await days.forEach(async (day) => {
      const params: PutCommandInput = {
        TableName: this.name,
        Item: {
          index: day,
          ips: []
        }
      };
      
      await this.putCmd(params);
    });
  }

  get todayIndex()
  {
    const now = Date.now();
    const dayIndex = Math.floor(now / 8.64e7) % this.dayCount; 
    return dayIndex;
  }

  pushPlaylists(query: {ids: Array<string>})
  {
    // console.log(this.todayIndex);
    const promises = query.ids.map((id) => {
      const params: UpdateCommandInput = {
        TableName: this.name,
        Key: {
          index: this.todayIndex,
        },
        // ProjectionExpression: projection,
        UpdateExpression: `SET ids=:u`,
        ExpressionAttributeValues: {
          ":u": [id]
        },
      }

      return this.updateCmd(params);
    })

    Promise.all(promises);
  }

  get today()
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: this.todayIndex,
      }
    };

    const data = this.getCmd(params);
    return data;
  }
}
