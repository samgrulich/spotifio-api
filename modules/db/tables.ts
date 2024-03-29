// deno-lint-ignore-file no-explicit-any
import { Table, DynamoDatabase } from "./dynamodb.ts";
import { IChunk, Image, ISnapshot, IPlaylist, IUser, IPlaylistShort } from "./types.ts";
import { GetCommandInput, UpdateCommandInput, PutCommandInput, QueryCommandInput } from "@aws-sdk/lib-dynamodb@3.169.0";
// deno-lint-ignore no-unused-vars
import { noIP, noToken, noUser, invalidIP, invalidToken, invalid, missing, checkObject } from "./errors.ts";
import { Snapshot } from "../vc/types.ts";
import { Exception } from "../errors.ts";

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
  country: string;
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
        id: query.id,
      }
    }

    const data = await super.getCmd(params);
    const user = data as IUser;
    return user;
  }

  async getToken(query: {userId: string, ip: string})
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ExpressionAttributeNames: {
        "#ip": query.ip
      },
      ProjectionExpression: "ips.#ip",
    }

    const data = await this.getCmd(params);
    
    if (!data)
      throw invalid("user");
    else if (!data.ips)
      throw invalid("token-retrived_data");
    
    const dbToken = data.ips[query.ip];
    if (!dbToken)
      throw new Exception(404, "token-bad_ip", [query.ip]);
   
    return dbToken;
  }

  validateToken(query: {userId: string, ip: string, token: string})
  {
    // checkObject(query);

    this.getToken(query)
      .then((token) => {
        if (token != query.token)
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
    
    return Promise.resolve(data);
  }

  async getAttribute(query: {userId: string, attributes: string})
  {
    checkObject(query);

    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ProjectionExpression: query.attributes,
    }

    const data = await this.getCmd(params)
      .catch((err) => {
        console.log(err);
        throw invalid("attribute(s)");
      });
    
    if (!data)
      throw invalid("user");
    
    return Promise.resolve(data);
  }

     
  async insert(query: {userData: UserInput, playlists: Array<IPlaylistShort>}) 
  {
    const userData = query.userData;
    const authPair: Record<string, string> = {[userData.ip]: userData.token};

    const user: IUser = {
      id: userData.id,
      name: userData.name, 
      refreshToken: userData.refreshToken,
      ips: authPair,
      playlists: query.playlists,
      // likes: query.liked,
      superLikes: [],
      cover: userData.cover,
      country: userData.country,
      contact: {email: userData.email, prefered: "email"}
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
    console.log("adding token (", query, ")") 
    
    const params: UpdateCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ExpressionAttributeNames: {
        "#ip": query.ip,
      },
      ExpressionAttributeValues: {
        ":t": query.token
      },
      UpdateExpression: "SET ips.#ip=:t",
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
      ProjectionExpression: "chunks.lastChunk, description, color, creationDate, cover"
    };

    const data = await this.getCmd(params);
    if (!data)
      throw invalid("snapshot");

    return data as {name: string, previousSnap: string, description: string, color: string, creationDate: string, cover: Array<Image>};
  }

  async getDate(query: {userId: string, date: Date}): Promise<Array<ISnapshot>>
  {
    const startDate = new Date(query.date);
    startDate.setDate(query.date.getDate() - 73);

    const params: QueryCommandInput = {
      TableName: this.name,
      IndexName: "date-index",
      ExpressionAttributeValues: {
        ":userId": query.userId,
        ":startDate": startDate.toISOString(),
        ":endDate": query.date.toISOString(),
      },
      KeyConditionExpression: "userId = :userId AND creationDate BETWEEN :startDate AND :endDate",
    }

    const data = await this.queryCmd(params);
    if (!data.Count)
      throw missing("snapshots");

    // if duplicates return the first one
    const snaps: Array<ISnapshot> = data.Items as Array<ISnapshot> ?? [];
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
      ExpressionAttributeNames: {
        "#id": query.chunkId,
      },
      ProjectionExpression: "chunks.chunks.#id",
    }

    const data = await this.getCmd(params);
 
    if (!data)
      throw invalid("chunk");

    // request additional data if pointer
    const chunk: IChunk = data.chunks.chunks[query.chunkId];
    if (chunk.isPointer && parsePointer)
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

  protected parseChunk(chunk: IChunk)
  {
    const origin = chunk.origin ? { origin: chunk.origin } : {}
    const data = !chunk.data ? {} : {
      data: {
        hash: chunk.data.hash,
        length: chunk.data.length,
        tracks: chunk.data.tracks
      }
    }

    const chunkGeneric = {
      ...chunk,
      ...data,
      ...origin
    };
    return chunkGeneric;
  }

  async insert(query: Snapshot) {
    console.log(query)
    const params: PutCommandInput = {
      TableName: this.name,
      Item: {
        userId: query.userId,
        hash: query.hash,
        chunks: {
          ...query.chunks,
          chunks: Object.fromEntries(Object.entries(query.chunks.chunks).map(([key, val]) => [key, this.parseChunk(val)])),
          removed: query.chunks.removed.map(chunk => this.parseChunk(chunk))
        }, 
        color: query.color.toString(),
        cover: query.cover.map(cover => cover as Record<string, any>),
        creationDate: query.creationDate.toISOString().split("T")[0],
        description: query.description,
        name: query.name,
        previousSnap: query.previousSnap,
        public: query.public
      }
    }
    
    const _data = await this.putCmd(params);
  }
}

export class Schedule extends Table
{
  dayCount = 61; // how much days the DB stores

  constructor(database: DynamoDatabase)
  {
    super("Schedule", database);
  }

  init()
  {
    const days = Array.from(Array(this.dayCount).keys());
    days.forEach(async (day) => {
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
        index: this.todayIndex,
      }
    };

    const data = this.getCmd(params);
    return data;
  }

  get lastUpdate()
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        index: -1,
      }
    };

    const data = this.getCmd(params);
    return data;
  }

  setLastUpdate(timeStamp?: number)
  {
    const time = timeStamp ?? Date.now();
    const params: UpdateCommandInput = {
      TableName: this.name,
      Key: {
        index: -1,
      },
      ExpressionAttributeValues: { 
        ":t": time 
      },
      UpdateExpression: "SET lastUpdate=:t"
    }

    this.updateCmd(params);
  }
}
