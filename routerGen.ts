import manifest from "./routes.gen.ts";
import { html } from "./static/basicHTML.ts";
import { render } from "preact-render-to-string";

function createPage(components: Element, title="Document"): string
{
    const pageHtml = html;
    pageHtml.title = title;
    pageHtml.getElementById("app").innerHTML = render(components);

    return pageHtml.toString();
}


function generateRouter()
{
    let str = `// AUTOMATICALLY GENERATED CODE, regenerates everytime any RouterGenerator is run 
    import { Router, Context } from "oak";
    
    const router = new Router();
    router`;

    for (const route of manifest.routes)
    {
        const moduleKeys = Object.keys(route.module);
        let routeConfig = {
            method: "get",
            title: "Hello :)",
        };
        
        // unpack config
        if(moduleKeys.includes("config"))
        {
            const { config } = route.module;
            routeConfig = {...routeConfig, ...config};
        }

        const appName = Object(route.module)["default"];

        // generate router file :)
        str += `.${routeConfig.method}("${route.urlPath}", (context: Context) => {
    context.response.type = "text/html; charset=utf-8";
    context.response.body = createPage(<${appName}/>);
})`;
    }

    console.log(str);
}

generateRouter();