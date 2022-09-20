import "dotenv/load.ts";

import { Application, Router, Context } from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Schedule, Snapshots, Users } from "./modules/db/tables.ts";
import { createUser, generateToken, loginUser } from "./routes/auth/base.ts";
import { snapshotUserPlaylists } from "./routes/versions/snapshots.ts";
import { Chunk } from "./modules/db/types.ts";
import { IError } from "./modules/errors.ts";

import { formatIP, respond } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback} from "./routes/auth/spotify.ts";
import { parseMultiple, parsePlaylist, parseTrack, parseUser } from "./modules/spotify/parsers.ts";


const REGION: string = Deno.env.get("REGION") ?? "eu-central-1";

const database = new DynamoDatabase(REGION); 
const users = new Users(database);
const schedule = new Schedule(database);
const snaphots = new Snapshots(database);

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

const router = new Router();
router
  .get("/", (ctxt) => {
    ctxt.response.body = "hello from api";
  })
  .use("/spotify/connect", (ctxt) => {
    // check if user is logged in => return already signed in error 
    connect(ctxt);
  })
  .get("/spotify/callback", async (ctxt) => {
    const isLogged = ctxt.response.headers.get("X-Logged");
    if (isLogged == "true") 
      throw {status: 403, reason: "Already logged in"};
    
    const {tokens, userData} = await callback(ctxt)
      .then(async (tokens) => {
        const spotifyUser = await tokens.get("me");

        const ip = formatIP(ctxt.request.ip);
        const token = generateToken();

        const userData = parseUser(spotifyUser, tokens.refreshToken, ip, token);

        return {tokens, userData};
      })
    
    const userId = ctxt.response.headers.get("X-UserId");
    if(!userId || userId != userData.id)
    {
      // get users playlists and likes
      const rawPlaylists = await tokens.getAll("me/playlists");
      const rawLikes = await tokens.getAll("me/tracks");

      // parse spotify data to io(my) data
      const playlists = parseMultiple(rawPlaylists, parsePlaylist);
      const likes = parseMultiple(rawLikes, parseTrack);

      userData.playlists = playlists;
      userData.liked = likes;

      createUser(users, schedule, userData);
      respond(ctxt, "New user created", "create", 201);
      return;
    }

    loginUser(users, userData);
    respond(ctxt, "Logged in", "login", 202); // todo: send the auth data back to user
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
      respond(ctxt, "No ids provided", "emptyData", 400);
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
  .use((ctxt, next) => {
    // error handler
    ctxt.response.headers.set("Content-Type", "application/json");
    
    // TODO: look if this (.then) is possible
    next()
      .catch((err: IError) => {
        ctxt.response.status = err.status;
        ctxt.response.body = JSON.stringify({reason: err.reason});
      });
  })  
  .use(async (ctxt, next) => {
    // token validation
    const request = await ctxt.request.body({type: "json"});
    const data = await request.value;

    const ip = formatIP(ctxt.request.ip);

    const {logged, userId, token} = await users.validateToken({userId: "testId", ip, token:"testToken"})
      .then((_) => {
        return {logged: true, userId: data["userId"], token: data["token"]};
      })
    
    ctxt.response.headers.set("X-UserId", userId);
    ctxt.response.headers.set("X-Token", token);
    ctxt.response.headers.set("X-Logged", logged.toString());
    await next();
  })
  .use(router.routes())
  .use(router.allowedMethods())
  .use((ctxt) => {
    return404(ctxt);
  });

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
