import { Status } from "http-status";
import { Exception, errMessage } from "../errors.ts";

const missing = (msg: string) => errMessage(`missing_${msg}`, `No ${msg} passed`, Status.BadRequest);
const invalid = (msg: string) => errMessage(`invalid_${msg}`, `Invalid ${msg}`, Status.Forbidden);

const checkObject = (object: Record<string, any>) => 
{
  Object.keys(object).forEach((key) => {
    if (!key)
      throw new Exception(Status.BadRequest, "missing_key", [key])
  })

}

const noToken = missing("token"); 
const noIP = missing("ip"); 
const noUser = missing("user");
const invalidToken = invalid("token");
const invalidIP = invalid("ip");

export {noToken, noIP, noUser, invalidToken, invalidIP, missing, invalid, checkObject};