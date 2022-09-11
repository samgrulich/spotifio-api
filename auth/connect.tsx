import { Handlers, HandlerContext } from "$fresh/server.ts";
import { SCOPES } from "../../consts/spotify.ts";

export const handler: Handlers = {
    // deno-lint-ignore require-await
    async GET(req: Request, _ctx: HandlerContext): Promise<Response>
    {
        const url = new URL(req.url);
        const state = crypto.randomUUID().replaceAll("-", "").substring(0, 16);
        const data = {
            "client_id": Deno.env.get("CLIENT_ID") || "",
            "redirect_uri": `${url.origin}/auth/callback`,
            "response_type": "code",
            "scope": SCOPES,
            "state": state,
        }

        const searchParams = new URLSearchParams(data);
        const params = searchParams.toString();
        const spotifyURL = "https://accounts.spotify.com/authorize";
        const queryURL = `${spotifyURL}?${params}`;

        return Response.redirect(queryURL, 302);
    } 
}