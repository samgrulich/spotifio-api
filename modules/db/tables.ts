// deno-lint-ignore-file no-explicit-any
import { Table, DynamoDatabase } from "./dynamodb.ts";
import { Chunk, Image, ISnapshot, Playlist, User } from "./types.ts";
import { GetCommandInput, UpdateCommandInput, BatchGetCommandInput, PutCommandInput } from "@aws-sdk/lib-dynamodb@3.169.0";
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

export class Tracks extends Table
{

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
        snapId: query.snapId
      }
    }

    const data = await super.getCmd(params);
    const snap = data?.data as ISnapshot;
    return snap ?? {};
  }

  async getChunk(query: {userId: string, snapId: string, chunkIndex: number})
  {
    const params: GetCommandInput = {
      TableName: this.name,
      Key: {
        id: query.userId,
      },
      ProjectionExpression: `chunks[${query.chunkIndex}]`,
    }

    const data = await this.getCmd(params)
      .catch((err) => {
        console.log(err); 
        throw err;
      });
    
    if (!data)
      throw invalid("chunk");
    
    return Promise.resolve(data?.data);
  }

  async getPointers(query: {userId: string, data: {snapId: string, pointerId: string}[]})
  {
    const array = query.data.map(oneQuery => [oneQuery.snapId, oneQuery.pointerId]);
    const keys = array
      .map(([key, _]) => key) // get only snapshot ids
      .filter((key, index, self) => index === self.indexOf(key)); // delete duplicates

    const queries = keys.map(key => {
        const keyPair = {
          userId: query.userId,
          snapId: key,
        }

        return keyPair;
      }); 
   
    // return object of pointerIds sorted under snapIds 
    const pointersSorted = Object.fromEntries(keys.map((key) => {
      const data = array
        .filter(pair => pair[0] == key)
        .map(pair => pair[1]);
      return [key, data];
    }));

    // const data = await this.batchGetCmd(params);
    const promises = queries.map(key => {
      return this.get(key);
    })

    const parsedPointers: Array<Chunk> = [];
    await Promise.all(promises)
      .then(
        (snaps) => {
          snaps.forEach((snap) => {
            snap = snap ?? {};
            const thisSnapPointers = pointersSorted[snap.snapId];
            const chunks = snap.chunks ?? [];

            parsedPointers.concat(chunks.filter(chunk => thisSnapPointers.includes(chunk.hashed)));
          })
        }
      );
    return parsedPointers;
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

  // init()
  // {
  //   const days = Array(this.dayCount).map((_, index) => index);
  //   days.forEach(this.putCmd())
  // }

  get todayIndex()
  {
    const now = Date.now();
    const dayIndex = Math.floor(now / 8.64e7) % this.dayCount; 
    return dayIndex;
  }

  pushPlaylists(query: {ids: Array<string>})
  {

    const promises = query.ids.map((id) => {
      const params: UpdateCommandInput = {
        TableName: this.name,
        Key: {
          id: this.todayIndex,
        },
        // ProjectionExpression: projection,
        UpdateExpression: `SET ids[]=:u`,
        ExpressionAttributeValues: {
          ":u": id
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
