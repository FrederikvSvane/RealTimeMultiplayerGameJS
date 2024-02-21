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


wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);
    connection.on("open", () => console.log("opened!"));
    connection.on("close", () => console.log("closed!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data); //This fails if the message is not a JSON
        console.log("Received Message:", result);
    })

    const clientId = uuidv4();
    clients[clientId] = connection;
    const payload = {
        "method": "connect",
        "clientId": clientId
    }

    connection.send(JSON.stringify(payload));
});