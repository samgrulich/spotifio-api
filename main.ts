import "dotenv/load.ts";

import { Application, Router, Context } from "oak";
import { DynamoDatabase } from "./modules/db/dynamodb.ts";
import { Users } from "./modules/db/tables.ts";

import { validateToken } from "./modules/auth/tokens.ts";
import { formatIP } from "./modules/functions.ts";

import { newUser } from "./routes/auth.ts";


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
  .post("/new_user", async (ctxt) => {
    const body = await ctxt.request.body({ type: "json"});
    const data = await body.value;
    console.log(data);

    newUser(users, data);
  });

const app = new Application();
app
  .use((ctxt, next) => {
    const ip = formatIP(ctxt.request.ip);

    validateToken(users, "testID", ip, "testToken")
      .then(async (_isValid) => {
        await next();
      }).catch((err) => {
        console.log(err);
        return404(ctxt);
      });
  })
  .use(router.routes())
  .use(router.allowedMethods())
  .use((ctxt) => {
    return404(ctxt);
  });

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
