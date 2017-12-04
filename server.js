// Import and set up our dependencies 
var express = require('express');
var app = express();
var server = require('http').Server(app);

// Socket.io functions
var io = require('socket.io')(server);

io.sockets.on('connection', function(socket) {
    console.log("We have a new client: " + socket.id);
    socket.emit("id", socket.id);
});

// Firebase setup
var admin = require("firebase-admin");
var serviceAccount = require("./firebase.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wb-messenger-13530.firebaseio.com"
});
var db = admin.firestore();

// Exports Firebase data and sockets.io to other files
module.exports = {
    admin: admin,
    io: io
}

// Imports Custom Modules
var dbLocal = require('./db');
var auth = require('./auth')(dbLocal);
var validator = require('validator');

// Users variable
var users = dbLocal.users.fetch();

// Configure view engine to render nunjucks templates.
var nunjucks = require('nunjucks');
nunjucks.configure('views', {
    autoescape: true,
    express: app
});

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
    extended: true
}));
app.use(require('express-session')({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 2678400000
    }
}));
app.use(express.static('public'));

auth.init(app);

// Define routes. 
app.get('/',
    function(req, res) {
        if (!req.user) {
            res.render('index.html', {
                title: 'WB Messenger',
                user: req.user
            });
        } else {
            res.render('messenger.html', {
                title: 'WB Messenger',
                user: req.user,
                blocked: req.user.blocked,
                users: users
            });
        }
    });

app.get('/profile',
    require('connect-ensure-login').ensureLoggedIn('/'),
    function(req, res) {
        res.render('profile.html', {
            title: 'Profile',
            user: req.user
        });
    });

app.get('/admin',
    require('connect-ensure-login').ensureLoggedIn('/'),
    function(req, res) {
        res.render('admin.html', {
            title: 'Admin',
            user: req.user.username == "willb" /* Restricts access to only my account */
        });
    });

// Add socket id to user data
app.post('/setId', function(req, res) {
    console.log("Start Id function");
    users[getUserArrayPos(req.user.username)].socketId = req.body.socketId;
    res.sendStatus(200);
})

// Function for getting user info from user id
function findUserById(id) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].id == id) {
            return (users[i]);
        }
    }
}

// Function for getting user info from user id
function findUserByUsername(username) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].username == username) {
            return (users[i]);
        }
    }
}

// Function for getting user info from user id
function getUserArrayPos(username) {
    for (var i = 0; i < users.length; i++) {
        if (users[i].username == username) {
            return (i);
        }
    }
}

// Get group messages
app.post('/getmessages', function(req, res) {

    var name = req.body.chat;

    if (req.body.chat == "group") {
        var htmlMessages = "";
        db.collection('messages').doc("group").collection("messages").get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    var user = findUserById(doc.data().userid);
                    var messageContent = doc.data().messageContent;

                    htmlMessages = htmlMessages + "<div class='message " + user.username + "'><img src='https://wbmessenger.glitch.me/" + user.username + ".jpg'><div class='text'><p class='name'>" + user.firstname + "</p><p class='message-content'>" + messageContent + "</p></div></div>";
                });
                res.send({
                    htmlMessages: htmlMessages,
                    name: "Group"
                })
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    } else {
        var names = [name, req.user.username].sort();
        var chatName = names[0] + names[1];

        var htmlMessages = "";
        db.collection('messages').doc("private").collection(chatName).get()
            .then((snapshot) => {
                snapshot.forEach((doc) => {
                    var user = findUserById(doc.data().userid);
                    var messageContent = require("./encrypt").decrypt(doc.data().messageContent);

                    htmlMessages = htmlMessages + "<div class='message " + user.username + "'><img src='https://wbmessenger.glitch.me/" + user.username + ".jpg'><div class='text'><p class='name'>" + user.firstname + "</p><p class='message-content'>" + messageContent + "</p></div></div>";
                });
                res.send({
                    htmlMessages: htmlMessages,
                    name: findUserByUsername(name).displayName
                })
            })
            .catch((err) => {
                console.log('Error getting documents', err);
            });
    }

})

// New messages
app.post('/newmessage', function(req, res) {

    console.log("New message");
    var name = req.body.chat;
    var messageContent = req.body.messageContent;
    messageContent = messageContent.replace("<", "&lt;").replace(">", "&gt;"); // Xss protection

    if (req.body.chat == "group") {
        console.log("Group");

        // Send the socket
        io.sockets.emit("groupmessage", {
            from: req.user,
            message: messageContent,
            time: req.body.time
        });

        db.collection("messages").doc("group").collection("messages").doc("" + Date.now()).set({
                userid: req.user.id,
                messageContent: messageContent
            })
            .then(function(docRef) {
                console.log("Document written with ID: ", docRef.id);
            })
            .catch(function(error) {
                console.error("Error adding document: ", error);
            });
        res.sendStatus(200); // Return 'ok'
    } else {
        var names = [name, req.user.username].sort();
        var chatName = names[0] + names[1];

        // Socket functions
        io.to(findUserByUsername(name).socketId).emit("message", {
            from: req.user,
            message: messageContent,
            time: req.body.time
        })

        console.log("After socket");

        db.collection("messages").doc("private").collection(chatName).doc("" + Date.now()).set({
                userid: req.user.id,
                messageContent: require("./encrypt").encrypt(messageContent)
            })
            .then(function(docRef) {
                console.log("Document written with ID: ", docRef.id);
            })
            .catch(function(error) {
                console.error("Error adding document: ", error);
            });
        res.sendStatus(200); // Return 'ok'
        console.log("After Db");
    }
});
// End new messages

// Other request handelers
require('./admin-functions')(app, admin, io);
require('./personalsettings')(app, admin, io);
require('./default-handlers')(app, admin);

// Listen for requests
server.listen(process.env.PORT, function() {
    console.log('listening on 3000');
});