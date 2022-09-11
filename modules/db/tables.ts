import { Table, DynamoDatabase } from "./dynamodb.ts";
import { Image, Playlist, User } from "./types.ts";


class Users extends Table
{
    constructor(database: DynamoDatabase)
    {
        super("Users", database);
    }

    get(query: {id: string})
    {
    }

    getToken(query: {userId: string, hash: string})
    {
    }

    insert(query: {id: string, name: string, password: string, email: string, playlists: Array<Playlist>, liked: Array<string>, cover: Array<Image>})
    {
        const user: User = {
            id: query.id,
            name: query.name,
            password: query.password,
            ips: {},
            playlists: query.playlists,
            likes: query.liked,
            superLikes: [],
            cover: query.cover,
            contact: {email: query.email, prefered: "email"} 
        }
        
        // const params: ExecuteStatementCommandInput = {
        //     Statement: `INSERT INTO ${this.name} value {'id': ?, 'name': ?, 'password': ?, 'ips': ?, 'playlists': ?, 'likes': ?, 'superLikes': ?, 'cover': ?, 'contact': ?}`,
        //     Parameters: [{S: user.id}, {S: user.name}, {S: user.password}, {M: user.ips}, {L: user.playlists}, {L: user.likes}, {L: user.superLikes}, {L: user.cover}, {M: user.cover}]
        // }
        // this.database.executeStatement(params);
        
        const params = {
            TableName: this.name,
            Item: user
        }

        this.putCmd(params);
    }

    insertToken(query: {ip: string, token: string})
    {
    }

    update(query: {}) 
    {
    }

    delete(query: {id: string})
    {
    }
}