import { errMessage } from "../errors.ts";

export const spotifyError = (error: Record<string, string>) => errMessage("spotify", error["message"], Number(error["status"]));