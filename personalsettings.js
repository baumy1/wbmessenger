module.exports = function(app) {
  const fileUpload = require('express-fileupload');
  var dbLocal = require("./db");
  var Jimp = require("jimp");
  
  var io = require("./server.js").io;
  var encrypt = require("./encrypt");  
  
  var admin = require("./server.js").admin;

  var db = admin.firestore();
  
  // Update profile pic
  app.post('/changepic', function(req, res) {

        if (!req.files)
            return res.status(400).send('<style>@import url(\'https://fonts.googleapis.com/css?family=Montserrat|Open+Sans|Raleway\'); h1, h2 {font-family: \'Open Sans\', sans-serif; padding-left: 10px;}</style><div><h1>Your profile picture has been updated!</div><h2><a href="../">Return to messenger</h2>');

        var profilepic = req.files.sampleFile;
        var tempLocation = __dirname + '/tmp/' + req.user.username + profilepic.name.split('.').pop();

        profilepic.mv(tempLocation, function(err) {
            if (err)
                return res.status(500).send(err);
        });

        // Convert to Jpg and crop
        Jimp.read(tempLocation, function(err, file) {
            if (err) throw err;
            file.resize(256, Jimp.AUTO).crop( 0, 0, 256, 256)
                .write("public/" + req.user.username + ".jpg"); // save 
        });
    
        res.status(200).send('<style>@import url(\'https://fonts.googleapis.com/css?family=Montserrat|Open+Sans|Raleway\'); h1, h2 {font-family: \'Open Sans\', sans-serif; padding-left: 10px;}</style><div><h1>Your profile picture has been updated!</div><h2><a href="../">Return to messenger</h2>');
    }) // End add users
  
    // Password change
    app.post('/changepsw', function(req, res) {
        var username = req.user.username;
        var password = req.body.password;
        var passwordConfirm = req.body.passwordconfirm;
      
        if (password !== passwordConfirm) {
          res.send('<style>@import url(\'https://fonts.googleapis.com/css?family=Montserrat|Open+Sans|Raleway\'); h1, h2 {font-family: \'Open Sans\', sans-serif; padding-left: 10px;}</style><div><h1>The passwords you entered didn\'t match!</div><h2><a href="../">Return to messenger</h2>');
          return;
        }
      
        var update = db.collection('users').doc(username).set({
            password: encrypt.encrypt(password)
        }, {
            merge: true
        }).then(function() {
            dbLocal.users.getData();
            require("./auth")(dbLocal);
            res.send('<style>@import url(\'https://fonts.googleapis.com/css?family=Montserrat|Open+Sans|Raleway\'); h1, h2 {font-family: \'Open Sans\', sans-serif; padding-left: 10px;}</style><div><h1>Your password has been updated</div><h2><a href="../">Return to messenger</h2>');
        });
    }) // End password change

  
}