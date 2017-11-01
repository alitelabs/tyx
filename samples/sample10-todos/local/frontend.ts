
import express = require("express");

let app = express();
app.use(express.static(__dirname + "/../public"));
app.get("*", function (req, res) {
    res.sendFile(__dirname + "/../public/index.html");
});

let port = 8000;
app.listen(port);
console.log("App listening on port " + port);

// http://tyx-sample10-bucket.s3-website-us-east-1.amazonaws.com/
