import { dbClient, ExecuteStatementCommand } from "./init.ts";

const TABLENAME = "Users";

async function getUser(userID: string)
{
    /*
        get user data from db
        if user
            return user
        
        return user not foud (err)
    */

    // const params = {
    //     Statement: `SELECT * FROM ${TABLENAME} WHERE id=?`,
    //     Parameters: [{ S: userID }],
    // };

    // try
    // {
    //     const data = await dbClient.send(new ExecuteStatementCommand(params));
    //     return data.Items;
    // }
    // catch (err)
    // {
    //     console.log(err);
    //     return null;
    // }
}

// required: userID, email, refreshToken, playlists
async function createUser(userID: string)
{
    /* check if user data is in db
        get user data from db
        if user data
            return user already exists (err)
            TODO: create error page
        
        return user data
    */
}