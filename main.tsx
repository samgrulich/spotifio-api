/// <reference path="https://deno.land/std@0.37.0/types/react.d.ts" />

import { Application, Context } from "oak";

import { RouteScanner } from "./routesGen.ts";
import Greeting from "./greeting.jsx";


const x = new RouteScanner();

// const router = new Router();
// router.get("/", (context: Context) => {
//   context.response.type = "text/html; charset=utf-8";
//   context.response.body = createPage(<Greeting name="Sam"/>);
// });

const app = new Application();
// app.use(router.routes());
// app.use(router.allowedMethods());

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
