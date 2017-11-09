// Import and set up our dependencies 
var express = require('express');
var app = express();
var server = require('http').Server(app);

// Socket.io functions
var io = require('socket.io')(server);
io.sockets.on('connection', function(socket) { 
  console.log("We have a new client: " + socket.id);
  
  socket.on('hi', function (socket) {
    console.log(socket.data);
  })
});

// Firebase setup
var admin = require("firebase-admin");
var serviceAccount = require("./firebase.json");
admin.initializeApp({
 credential: admin.credential.cert(serviceAccount),
 databaseURL: "https://wb-messenger-13530.firebaseio.com"
});
var db = admin.firestore();

// Exports Firebase data to other files
module.exports = {
  admin: admin,
  io: io
}

// Imports Custom Modules
var dbLocal = require('./db');
var auth = require('./auth')(dbLocal);
var validator = require('validator');

// Configure view engine to render nunjucks templates.
var nunjucks = require('nunjucks');
nunjucks.configure('views', {
    autoescape: true,
    express: app
});

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
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
     res.render('index.html', { title: 'WB Messenger', user: req.user }); 
    } else {
      res.render('messenger.html', { title: 'WB Messenger', user: req.user, blocked: req.user.blocked }); 
    }
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn('/'),
  function(req, res){
    res.render('profile.html', { title: 'Profile', user: req.user });
  });

app.get('/admin',
  require('connect-ensure-login').ensureLoggedIn('/'), 
  function(req, res){
    res.render('admin.html', { title: 'Admin', user: req.user.username == "willb" /* Restricts access to only my account */});
  });

// Get group messages
app.post('/getgroup', function(req, res) {
  var htmlMessages = "";
  db.collection('users').doc("group").collection("messages").get()
    .then((snapshot) => {
        snapshot.forEach((doc) => {
            
            //htmlMessages = htmlMessages + "<div class='message " +  + "'><img src='https://wbmessenger.glitch.me/" + data.from.username + ".jpg'><div class='text'><p class='name'>" + data.from.firstname + "</p><p class='message-content'>" + data.message + "</p></div></div>"
        });
    })
    .catch((err) => {
        console.log('Error getting documents', err);
    });
  res.send("<h1>Test</h1>")
})

// New messages
app.post('/newmessage', function(req, res) {
    res.sendStatus(200); // Return 'ok'
    var messageContent = req.body.messageContent;
    messageContent = messageContent.replace("<", "&lt;").replace(">", "&gt;"); // Xss protection
  
    // Send the socket
    io.sockets.emit("groupmessage", {from: req.user, message: messageContent, time: req.body.time});
  
    db.collection("messages").doc("group").collection("messages").add({
      userid: req.user.id,
      messageContent: messageContent
    })
    .then(function(docRef) {
      console.log("Document written with ID: ", docRef.id);
    })
    .catch(function(error) {
      console.error("Error adding document: ", error);
    });
    
  });
// End new messages

// Other request handelers
require('./admin-functions')(app, admin, io);
require('./default-handlers')(app, admin);

// Listen for requests
server.listen(process.env.PORT, function() {
  console.log('listening on 3000');
});