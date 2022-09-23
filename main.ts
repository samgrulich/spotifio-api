import "dotenv/load.ts";

import { Application, Router, Context, Middleware, Status} from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Schedule, Snapshots, Users } from "./modules/db/tables.ts";
import { createUser, generateToken, loginUser } from "./routes/auth/base.ts";
import { snapshotUserPlaylists } from "./routes/versions/snapshots.ts";
import { Chunk } from "./modules/db/types.ts";
import { IError } from "./modules/errors.ts";

import { formatIP, respond, respondError } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback} from "./routes/auth/spotify.ts";
import { parseMultiple, parsePlaylist, parseDatedTrack, parseUser } from "./modules/spotify/parsers.ts";


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
    console.log("connect");
    respond(ctxt, {data: {url: connectURL}});
  })
  .get("/auth/callback", async (ctxt) => {
    console.log("callback");
    const isLogged = ctxt.response.headers.get("X-Logged");
    if (isLogged == "true") 
    {
      // throw {status: 403, reason: "Already logged in"};
      respondError(ctxt, "Spotify connection failed", "User already logged in", 403);
      return;
    }
    
    const {tokens, userData} = await callback(ctxt, uiUrl)
      .then(async (tokens) => {
        // console.log("tokens", tokens);
        const spotifyUser = await tokens.get("me");

        const ip = formatIP(ctxt.request.ip);
        const token = generateToken();

        // console.log("User", spotifyUser);
        const userData = parseUser(spotifyUser, tokens.refreshToken, ip, token);

        return {tokens, userData};
      });
    
    const userId = ctxt.response.headers.get("X-UserId");
    if(!userId || userId != userData.id)
    {
      // get users playlists and likes
      const rawPlaylists = await tokens.getAll("me/playlists");
      const rawLikes = await tokens.getAll("me/tracks");

      // parse spotify data to io(my) data
      const playlists = await parseMultiple({elements: rawPlaylists, options: [tokens]}, parsePlaylist);
      const likes = await parseMultiple({elements: rawLikes}, parseDatedTrack);

      userData.playlists = playlists;
      userData.liked = likes;

      const responseData = {
        id: userId,
        token: userData.token,
      }
      createUser(users, schedule, userData);
      // respond(ctxt, "New user created", "create", 201);
      respond(ctxt, {data: responseData, status: 201})
      return;
    }

    loginUser(users, userData);
    // respond(ctxt, "Logged in", "login", 202); // todo: send the auth data back to user
    const responseData = {
      id: userId,
      token: userData.token
    }
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
  })
  .get("/versions/snapshots", async (ctxt) => {
    const data = await parseJson(ctxt);
    const userId: string = data["userId"];
    const snapId: string = data["snapId"];
    const chunkIndex: number = data["chunkIndex"] || 0; 

    const chunk: Chunk = await snaphots.getChunk({userId, snapId, chunkIndex});

    // todo: send chunk data back 
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
  .use(router.routes())
  .use(router.allowedMethods())
  .use((ctxt) => {
    return404(ctxt);
  });

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
