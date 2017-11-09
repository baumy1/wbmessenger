module.exports = function(app) {
    const fileUpload = require('express-fileupload');
    var dbLocal = require("./db");
    var Jimp = require("jimp");

    var io = require("./server.js").io;
    var encrypt = require("./encrypt");  
  
    app.use(fileUpload());
    var admin = require("./server.js").admin;

    var db = admin.firestore();

    // Start Add new user
    app.post('/addnewuser', function(req, res) {

        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        var profilepic = req.files.sampleFile;
        var tempLocation = __dirname + '/tmp/' + req.body.username + profilepic.name.split('.').pop();

        profilepic.mv(tempLocation, function(err) {
            if (err)
                return res.status(500).send(err);
        });

        // Convert to Jpg and crop
        Jimp.read(tempLocation, function(err, file) {
            if (err) throw err;
           file.resize(256, Jimp.AUTO).crop( 0, 0, 256, 256)
                .write("public/" + req.body.username + ".jpg"); // save 
        });

        var newUser = db.collection('users').doc(req.body.username).set({
            displayName: req.body.displayname,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            username: req.body.username,
            password: encrypt.encrypt(req.body.password),
            id: Math.floor(Math.random() * 100000),
            blocked: false
        })

        require("./db").users.getData();
        require("./auth")(dbLocal);

        res.status(200).send("<h1>New user added: " + req.body.displayname + "</h1><a href='/admin'><h2>Back to admin</h2></a>");
    }) // End add users
    
    // Password change
    app.post('/changepsw', function(req, res) {
        var username = req.body.username;
        var password = req.body.password;

        var update = db.collection('users').doc(username).set({
            password: encrypt.encrypt(password)
        }, {
            merge: true
        }).then(function() {
            dbLocal.users.getData();
            require("./auth")(dbLocal);
            res.send("Password changed for " + username  + "<br><a href='/admin'><h2>Back to admin</h2></a>");
        });
    }) // End password change

    // Start change picture
    app.post('/changepic', function(req, res) {

        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        var profilepic = req.files.sampleFile;
        var tempLocation = __dirname + '/tmp/' + req.body.username + profilepic.name.split('.').pop();

        profilepic.mv(tempLocation, function(err) {
            if (err)
                return res.status(500).send(err);
        });

        // Convert to Jpg and crop
        Jimp.read(tempLocation, function(err, file) {
            if (err) throw err;
            file.resize(256, Jimp.AUTO).crop( 0, 0, 256, 256)
                .write("public/" + req.body.username + ".jpg"); // save 
        });
    
        res.status(200).send("<h1>Updated profile pic for " + req.body.username + "</h1><img src='" + req.body.username + ".jpg'><a href='/admin'><h2>Back to admin</h2></a>");
    }) // End add users
  
    // Block user
    app.post('/blockuser', function(req, res) {
        var username = req.body.username;

        var update = db.collection('users').doc(req.body.username).set({
            blocked: true
        }, {
            merge: true
        }).then(function() {
            dbLocal.users.getData();
            require("./auth")(dbLocal);
            io.sockets.emit("block", username);
            res.send("Blocked: " + username  + "<br><a href='/admin'><h2>Back to admin</h2></a>");
        });
    }) // End block user

    // Unblock user
    app.post('/unblock', function(req, res) {
        var username = req.body.username;
        var update = db.collection('users').doc(req.body.username).set({
            blocked: false
        }, {
            merge: true
        }).then(function() {
            dbLocal.users.getData();
            require("./auth")(dbLocal);
            io.sockets.emit("unblockblock", username);
            res.send("Un-blocked: " + username + "<br><a href='/admin'><h2>Back to admin</h2></a>");
        });

    }); // End unblock user

}