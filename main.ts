import "dotenv/load.ts";

import { Application, Router, Context } from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Users } from "./modules/db/tables.ts";
import { createUser, generateToken, loginUser } from "./routes/auth.ts";
import { IError } from "./modules/errors.ts";

import { formatIP } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback} from "./routes/spotifyAuth.ts";
import { parseMultiple, parsePlaylist, parseTrack, parseUser } from "./modules/spotify/parsers.ts";


const REGION: string = Deno.env.get("REGION") ?? "eu-central-1";

const database = new DynamoDatabase(REGION); 
const users = new Users(database);

function return404(ctxt: Context)
{
  ctxt.response.status = 404;
  ctxt.response.type = "application/json; charset=utf-8";
  ctxt.response.body = JSON.stringify({msg: "There's been an error :)"});
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

      createUser(users, userData);
      return {msg: "New user created", action: "create"};
    }

    loginUser(users, userData);
    return {msg: "Logged in", action: "login"};
  });


const app = new Application();
app
  .use((ctxt, next) => {
    // error handler
    ctxt.response.headers.set("Content-Type", "application/json");
    
    next()
      .then((data) => {
        ctxt.response.status = 200;
        ctxt.response.body = JSON.stringify(data);
      })
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