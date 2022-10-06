import "dotenv/load.ts";

import { Application, Router, Context, Middleware, Status} from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Schedule, Snapshots, Users } from "./modules/db/tables.ts";
import { createUser, loginUser } from "./routes/auth/base.ts";
import { snapshotUserPlaylists } from "./routes/versions/snapshots.ts";
// import { IChunk } from "./modules/db/types.ts";
// import { IError } from "./modules/errors.ts";

import { formatIP, respond, respondError, stripServerHeaders } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback, retriveUserData, retriveAdditionalUserData} from "./routes/auth/spotify.ts";
import { IChunk } from "./modules/db/types.ts";
import { Exception } from "./modules/errors.ts";


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
    if (error instanceof Exception)
    {
      const message = {
        reason: error.reason,
        name: error.name,
        contents: error.contents, 
      };

      ctxt.throw(error.code, JSON.stringify(message));
      return;
    }

    const message = error instanceof Error ? error.message : error; 
    console.log(message);
    ctxt.throw(Status.InternalServerError, JSON.stringify(message)); 
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
    
    const {tokens, userData} = await callback(ctxt, uiUrl).then(async (tokens) => {
      const ip = formatIP(ctxt.request.ip);
      const userData = await retriveUserData(ip, tokens);

      return {tokens, userData};
    });
    
    const userId = ctxt.response.headers.get("X-UserId");
    if(!userId || userId != userData.id)
    {
      // const {playlists, likes} = await retriveAdditionalUserData(tokens);

      // userData.playlists = playlists;
      // userData.liked = likes;

      const user = JSON.parse(Deno.readTextFileSync("./user2.json"));

      const responseData = {
        id: userId,
        token: user.token,
        // spotifyToken: tokens.refreshToken,
      }

      createUser(users, schedule, user);
      respond(ctxt, {data: responseData, status: 201})
      return;
    }

    const responseData = {
      id: userId,
      token: userData.token,
      spotifyToken: tokens.refreshToken,
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
      respondError(ctxt, "Authentication failed", "not_logged", Status.Forbidden);
      return;
    }

    await next();
  })
  .get("/versions/snapshots/chunk/:snapId/:chunkId", async (ctxt) => {
    const userId = ctxt.response.headers.get("X-UserId") ?? "";
    const { snapId, chunkId } = ctxt.params; 

    const chunk: IChunk = await snaphots.getChunk({userId, snapId, chunkId}, true);

    respond(ctxt, {data: chunk});
  })
  .get("/versions/snapshots/:date", async (ctxt) => {
    const date = new Date(ctxt.params.date) || new Date();
    const userId = ctxt.response.headers.get("X-UserId") ?? "";
   
    const snapshot = await snaphots.getDate({userId, date});

    respond(ctxt, {data: snapshot});
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

    if (!headers.has("User-Id") || !headers.has("Token"))
    {
      ctxt.response.headers.set("X-Logged", "false");
      await next(); 
      return;
    } 
    
    const userId = headers.get("User-Id") || "";
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
