//Necessary imports.
const http = require("http");
const uuidv4 = require("uuid").v4;
const app = require('express')();

//Serve HTML page on load.
app.get("/", (req, res) => { res.sendFile(__dirname + "/index.html") });

//Makes express app listen on port 9091.
app.listen(9091, () => { console.log("Server is running on port 9091") });

//Instantiates a new http server.
const httpServer = http.createServer();
//Makes listen to port 3000.
httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
});

//Requires a websocket library and instantiates a new websocket server.
const websocketServer = require("websocket").server;

//We need to tie httpServer to the websocketServer.
const wsServer = new websocketServer({
    httpServer: httpServer,
});

//Instantiates objects for client and games.
const clients = {};
const games = {};

//"on" checks on a "request" which is connection.
wsServer.on("request", request => {
    //We accept only connections from the origin.
    const connection = request.accept(null, request.origin);
    const clientId = uuidv4();

    //Tie a connection to a ClientID.
    clients[clientId] = {
        "connection": connection
    };

    //When connection is opened.
    connection.on("open", () => console.log("opened!"));
    //When connection is closed.
    connection.on("close", () => console.log("Connection is closed!"));
    //Server gets a message.
    connection.on("message", message => {
        //message comes as JSON, so need to parse.
        const result = JSON.parse(message.utf8Data); //This fails if the message is not a JSON
        console.log("Received Message:", result);

        //Create new game
        if(result.method === "create"){
            //Set ClientID
            const clientId = result.clientId;
            const gameId = uuidv4();

            //Send the game object tied to gameId.
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            }

            //Create payload for method "create"
            const payload = {
                "method": "create",
                "game": games[gameId]
            }

            //Establish connection via clientID mapping.
            const con = clients[clientId].connection;
            con.send(JSON.stringify(payload));
        } 
        
        //Join a game
        if(result.method === "join"){
            //Set clientId, gameId and "gameState" from result.
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];

            //Max 3 players
            if (game.clients.length > 3) return;
            
            //Colors for player 0, 1, 2.
            const color = {"0": "Red", "1": "Green", "2": "Blue"}[game.clients.length];
            //Push assigned clientIds.
            game.clients.push({
                "clientId": clientId,
                "color": color
            })

            //Update gamestate is started when 3 players are connected.
            if (game.clients.length === 3) updateGameState();

            const payLoad = {
                "method": "join",
                "game": games[gameId],
            }

            game.clients.forEach(c => {
                const con = clients[c.clientId].connection;
                con.send(JSON.stringify(payLoad));
            })   
        }

        //Make a play
        if (result.method === "play"){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const ballId = result.ballId;
            const color = result.color;

            let state = games[gameId].state;
            if(!state){
                state = {}
            }

            state[ballId] = color;
            games[gameId].state = state;
            
        }
    })

    const payload = {
        "method": "connect",
        "clientId": clientId
    }

    connection.send(JSON.stringify(payload));

    function updateGameState(){
        for (const g of Object.keys(games)){
            const game = games[g];
            const payLoad = {
                "method": "update",
                "game": game
            }
            
            game.clients.forEach(c => {
                clients[c.clientId].connection.send(JSON.stringify(payLoad))
            })
        }
        setTimeout(updateGameState, 500);
    }
});