import "dotenv/load.ts";

import { Application, Router, Context, Middleware, Status} from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Schedule, Snapshots, Users } from "./modules/db/tables.ts";
import { createUser, loginUser } from "./routes/auth/base.ts";
import { snapshotUserPlaylists } from "./routes/versions/snapshots.ts";
// import { IChunk } from "./modules/db/types.ts";
// import { IError } from "./modules/errors.ts";

import { formatIP, respond, respondError, respondNotLogged, stripServerHeaders } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback, retriveUserData} from "./routes/auth/spotify.ts";
import { IChunk, IUser } from "./modules/db/types.ts";
import { Exception } from "./modules/errors.ts";
import { getTracks } from "./routes/versions/chunk.ts";
import { Tokens } from "./modules/spotify/base.ts";
import { parseUser } from "./modules/spotify/parsers.ts";


const REGION: string = Deno.env.get("REGION") ?? "eu-central-1";

const database = new DynamoDatabase(REGION); 
const users = new Users(database);
const schedule = new Schedule(database);
const snaphots = new Snapshots(database);

const uiUrl = Deno.env.get("UI_URL") ?? "http://localhost:8000";
const connectURL = connect(uiUrl);

function return404(ctxt: Context)
{
  ctxt.response.status = 404;
  ctxt.response.type = "application/json; charset=utf-8";
  ctxt.response.body = JSON.stringify({msg: "There's been an error :)"});
}

async function parseJson(ctxt: Context)
{
  const data = await ctxt.request.body({type: "json"}).value;
  return data;
}

const errorHandlerMiddleware: Middleware = async(ctxt, next) => {
  try
  {
    await next();
  }
  catch (error: unknown)
  {
    console.error(error);

    ctxt.response.type = "json";
    if (error instanceof Exception)
    {
      const message = {
        reason: error.reason,
        name: error.name,
        contents: error.contents, 
      };

      ctxt.response.status = error.code;
      ctxt.response.body = JSON.stringify(message);
      return;
    }

    const message = error instanceof Error ? error.message : error; 
    ctxt.response.status = Status.InternalServerError;
    ctxt.response.body = JSON.stringify({message});
  }
}

const router = new Router();
router
  .get("/", (ctxt) => {
    ctxt.response.body = "hello from api";
  })
  .get("/auth/connect", (ctxt) => {
    // check if user is logged in => return already signed in error 
    // console.log("connect");
    respond(ctxt, {data: {url: connectURL}});
  })
  .get("/auth/callback", async (ctxt) => {
    // console.log("callback");
    const isLogged = ctxt.response.headers.get("X-Logged");
    if (isLogged == "true") 
    {
      // throw {status: 403, reason: "Already logged in"};
      respondError(ctxt, "Spotify connection failed", "User already logged in", 403);
      return;
    }
    
    // retrive spotify userData
    const {tokens, userData} = await callback(ctxt, uiUrl).then(async (tokens) => {
      const ip = formatIP(ctxt.request.ip);
      const userData = await retriveUserData(ip, tokens);

      return {tokens, userData};
    });
   
    // query my database for the user
    const dbUser = await users.get({id: userData.id});

    if(!dbUser)
    {
      // const {playlists, likes} = await retriveAdditionalUserData(tokens);

      // userData.playlists = playlists;
      // userData.liked = likes;

      const user = JSON.parse(Deno.readTextFileSync("./userData/user3.json"));
      // const user = userData;

      const responseData = {
        id: user.id,
        token: user.token,
        country: user.country,
        // spotifyToken: tokens.refreshToken,
      }

      await createUser(users, snaphots, schedule, user);
      respond(ctxt, {data: responseData, status: 201})
      return;
    }

    const responseData = {
      id: dbUser.id,
      token: userData.token,
      country: userData.country,
      // spotifyToken: tokens.refreshToken,
    }

    loginUser(users, userData);
    respond(ctxt, {data: responseData, status: 202})
  })
  .post("/versions/schedule", async (ctxt) => {
    const data = await parseJson(ctxt);
    const ids: Array<string> = data["ids"];

    schedule.pushPlaylists({ids});
  })
  .post("/versions/snapshots", async (ctxt) => {
    const data = await parseJson(ctxt);
    const ids: Array<string> = data["ids"];

    if (!ids)
    {
      respondError(ctxt, "No ids provided", "emptyData")
      return;
    }

    ids.forEach(async id => {
      const user = await users.get({id});
      snapshotUserPlaylists(users, snaphots, user);  
    });
  });

const secureRouter = new Router();
secureRouter
  .use(async (ctxt, next) => {
    if (!ctxt.response.headers.has("X-Logged"))
    {
      respondError(ctxt, "Server error", "server_error", Status.InternalServerError);
      return;
    }
    
    if (ctxt.response.headers.get("X-Logged") != "true")
    {
      respondNotLogged(ctxt);
      return;
    }

    await next();
  })
  .get("/users/detail", async (ctxt) => {
    const userId = ctxt.response.headers.get("X-UserId");

    if (!userId)
    {
      respondNotLogged(ctxt);
      return;
    }

    const userData: IUser = await users.get({id: userId});

    // request cover
    const tokens = new Tokens({refreshToken: userData.refreshToken});
    const spotifyUserData = await tokens.get("me");
    const cover = spotifyUserData["images"];

    // set userData cover to the updated pic
    userData.cover = cover;

    userData.ips = {};
    userData.refreshToken = "";
    respond(ctxt, {data: userData});
  })
  .get("/versions/snapshots/chunk/:snapId/:chunkId", async (ctxt) => {
    const userId = ctxt.response.headers.get("X-UserId") ?? "";
    const { snapId, chunkId } = ctxt.params; 

    const chunk: IChunk = await snaphots.getChunk({userId, snapId, chunkId}, true);
    const userAtts = await users.getAttribute({userId, attributes: "refreshToken, country"});

    const tracks = await getTracks(userAtts["refreshToken"], userAtts["country"], chunk.data?.tracks ?? []);

    respond(ctxt, {data: {chunk, tracks}});
  })
  .get("/versions/snapshots/:date", async (ctxt) => {
    const date = new Date(ctxt.params.date) || new Date();
    const userId = ctxt.response.headers.get("X-UserId") ?? "";
   
    await snaphots.getDate({userId, date})
    .then(snap => {
      respond(ctxt, {data: snap, status: 200});
    })
    .catch(err => {
      respond(ctxt, {data: err, status: 206});
    });
  })
  .get("/versions/snapshots/detail/:snapId", async (ctxt) => {
    const snapId = ctxt.params.snapId; 
    const userId = ctxt.response.headers.get("X-UserId") ?? "";
    
    const snapshot = await snaphots.getDetails({userId, snapId});

    respond(ctxt, {data: snapshot});
  });

const app = new Application();
app
  .use(errorHandlerMiddleware)  
  .use(async (ctxt, next) => {
    // token validation
    const headers = ctxt.request.headers;
    let logged = false;

    if (!headers.has("UserId") || !headers.has("Token"))
    {
      ctxt.response.headers.set("X-Logged", "false");
      await next(); 
      return;
    } 
    
    const userId = headers.get("UserId") || "";
    const token = headers.get("Token") || "";
    const ip = formatIP(ctxt.request.ip);
    
    logged = await users.validateToken({userId, ip, token})
      .then((data) => {
        return data;
      })
      .catch(reason => {
        console.warn("Failed validation attempt", reason);
        return false;
      })
    
    if (!logged)
    {
      console.warn("token validation failed");
      ctxt.response.headers.set("X-Logged", "false");
      await next();
      return;
    }

    ctxt.response.headers.set("X-UserId", userId);
    ctxt.response.headers.set("X-Token", token);
    ctxt.response.headers.set("X-Logged", "true"); 
    await next();
  })
  .use(async (ctxt, next) => {
    await next();
    stripServerHeaders(ctxt);
  })
  .use(router.routes())
  .use(router.allowedMethods())
  .use(secureRouter.routes())
  .use(secureRouter.allowedMethods())
  .use((ctxt) => {
    return404(ctxt);
  });

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
