import "dotenv/load.ts";

import { Application, Router, Context } from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Users } from "./modules/db/tables.ts";

import { formatIP } from "./modules/functions.ts";

// import { newUser } from "./routes/auth.ts";
import {connect, callback} from "./routes/spotifyAuth.ts";


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
    const request = await ctxt.request.body({type: "json"});
    const data  = await request.value;

    callback(ctxt);

    // if callback doesnt find the user
      // create new
    //else 
      // login (create new ip-token pair) 
      // etc... 

    // const body = await ctxt.request.body({ type: "json"});
    // const data = await body.value;
    // console.log(data);

    // newUser(users, data);
  });


const app = new Application();
app
  .use(async (ctxt, next) => {
    const request = await ctxt.request.body({type: "json"});
    const data = await request.value;

    const ip = formatIP(ctxt.request.ip);

    const {logged, userId, token} = await users.validateToken({userId: "testId", ip, token:"testToken"})
      .then((_) => {
        return {logged: true, userId: data["userId"], token: data["token"]};
      }).catch((err) => {
        // console.log(err);
        // return404(ctxt);
        return {logged: false, userId: "", token: ""};
      });
    
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
