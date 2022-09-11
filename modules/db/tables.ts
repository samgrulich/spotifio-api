import { PutCommand, GetCommand, UpdateCommand, DeleteCommand } from "https://cdn.skypack.dev/-/@aws-sdk/lib-dynamodb@v3.137.0-Udk1RUDeq4xYHh3qsptK/dist=es2019,mode=types/dist-types/commands.d.ts";
import {dbClient, ExecuteStatementCommand } from "./init.ts";

class Table
{
    name: string;
    constructor(name: string)
    {
        this.name = name;
    }

    async getItem(id: string)
    {
        const params = {
            TableName: this.name,
            Key: {
                primaryKey: id,
            }
        };

        try
        {
            const data = await dbClient.send(new GetCommand(params));
            return data;
        }
        catch (err)
        {
            console.log(err);
            throw err;
        }
    }

    async insertItem(id: string, data: Record<string, unknown>)
    {
        const params = {
            TableName: this.name,
            Item: {
                primaryKey: id,
                ...data
            },
        };

        try
        {
            const data = await dbClient.send(new PutCommand(params));
            return data;
        }
        catch (err)
        {
            console.log(err);
            throw err;
        }
    }

    async updateItem()
    {
        
    }

    async deleteItem(id: string)
    {
        const params = {
            TableName: this.name,
            Key: {
                primaryKey: id
            }
        };

        try
        {
            const data = await dbClient.send(new DeleteCommand(params));
            return data;
        }
        catch (err)
        {
            console.log(err);
            throw err;
        }
    }
}