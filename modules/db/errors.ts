interface IError
{
  reason: string;
  status: number;
}

const errMessage = (reason: string, status: number): IError => ({reason, status});
const missing = (msg: string): IError => errMessage(`No ${msg} passed`, 400);
const invalid = (msg: string): IError => errMessage(`Invalid ${msg}`, 403);

const checkObject = (object: Record<string, any>) => 
{
  Object.keys(object).forEach((key) => {
    if (!key) 
      throw missing(key);
  })

}

const noToken = missing("token"); 
const noIP = missing("ip"); 
const noUser = missing("user");
const invalidToken = invalid("token");
const invalidIP = invalid("ip");

export {noToken, noIP, noUser, invalidToken, invalidIP, missing, invalid, checkObject};