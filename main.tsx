/// <reference path="https://deno.land/std@0.37.0/types/react.d.ts" />

import { Application, Router, Context } from "oak";

import { default as generate, createPage } from "./routerGenerator/main.ts";
import Greeting from "./greeting.jsx";


const customRoutes = new Router();
customRoutes.get("/greeting", (context: Context) => {
  context.response.type = "text/html; charset=utf-8";
  context.response.body = createPage(<Greeting name="Sam"/>);
});

const router = await generate("./routes");

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
app.use(customRoutes.routes());
app.use(customRoutes.allowedMethods());
app.use((context: Context) => {
    context.response.status = 404;
    context.response.type = "text/html; charset=utf-8";
    context.response.body = "<h1>404, Page not found!</h1>";
});

app.listen({port: 8080});
console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
