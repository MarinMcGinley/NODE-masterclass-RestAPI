const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

const server = {};

// helpers.sendSms('8456401', 'Hello World!', (error) => {
//     console.log('Unable to send message: ', error);
// });


server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    unifiedServer(req, res); 
});

server.unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);

    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const queryStringObject = parsedUrl.query;

    const method = req.method.toUpperCase();

    const headers = req.headers;

    // get the payload if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();

        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // construct the data object to send to the handler
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            method,
            'payload': helpers.parseJsonToObject(buffer),
            headers
        };

        // route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
             statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

             payload = typeof(payload) == 'object' ? payload : {};

             const payloadString = JSON.stringify(payload);

             res.setHeader('Content-Type', 'application/json');
             res.writeHead(statusCode);
             res.end(payloadString);

             console.log('Returning this response: ', statusCode, payload); 

        });
    });
};

server.router = {
    'notFound': handlers.notFound,
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks,
};

server.init = () => {
    server.httpServer.listen(config.httpPort, () => {
        console.log(`Server is listening on port ${config.httpPort} in ${config.envName} mode`);
    });

    server.httpsServer.listen(config.httpsPort, () => {
        console.log(`Server is listening on port ${config.httpsPort} in ${config.envName} mode`);
    });
}


module.exports = server;