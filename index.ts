const http = require("http");
const uuidv4 = require("uuid").v4;
const app = require('express')();
app.get("/", (req, res) => { res.sendFile(__dirname + "/index.html") });

app.listen(9091, () => { console.log("Server is running on port 9091") });


const httpServer = http.createServer();
httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
});

const websocketServer = require("websocket").server;

const wsServer = new websocketServer({
    httpServer: httpServer,
});


const clients = {};
const games = {};

wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);

    const clientId = uuidv4();
    clients[clientId] = {
        "connection": connection
    };

    connection.on("open", () => console.log("opened!"));
    connection.on("close", () => console.log("Connection is closed!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data); //This fails if the message is not a JSON
        console.log("Received Message:", result);

        //Create new game
        if(result.method === "create"){
            const clientId = result.clientId;
            const gameId = uuidv4();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            }

            const payload = {
                "method": "create",
                "game": games[gameId]
            }
            const con = clients[clientId].connection;
            console.log(games[gameId]);
            con.send(JSON.stringify(payload));
        } 
        
        else if(result.method === "join"){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length > 3){
                //Max 3 players
                return;
            }

            const color = {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length];
            game.clients.push({
                "clientId": clientId,
                "color": color
            })

            const payLoad = {
                "method": "join",
                "game": games[gameId],
            }

            game.clients.forEach(c => {
                const con = clients[c.clientId].connection;
                con.send(JSON.stringify(payLoad));
            })   
        }
    })

    const payload = {
        "method": "connect",
        "clientId": clientId
    }

    connection.send(JSON.stringify(payload));
});