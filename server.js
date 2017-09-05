
// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");

var path = require("path");
mongoose.Promise = Promise;

// set handlebars
var exphbs = require("express-handlebars");

// Initialize Express
var app = express();

// ------- when using the static path my cheerio breaks ?!?!  ----------
// app.use(express.static(path.join(__dirname, '/public')));

app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// app.use(express.static("public"));
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/landmarkDb");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});

// Routes
// ======

// Main route 
app.get("/", function(req, res) {
    res.render("index");
});

// A GET request to scrape the abc7ny website
app.get("/scrape", function(req, res) {
    var scrapedStuff = [];
    // First, we grab the body of the html with request
    request("http://abc7ny.com/news//", function(error, response, html) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        $(".headline-list-item").each(function(i, element) {
            var headlineScrape = $(element).children("a").children(".headline").text();
            var imageScrape = $(element).children("a").children(".image").children("img").attr("src");
            var prelinkScrape = $(element).children("a").attr("href");

            var linkScrape = "http://abc7ny.com";

            if (headlineScrape && prelinkScrape && imageScrape) {
                linkScrape += prelinkScrape;

                var news = { headline: headlineScrape, image: imageScrape, link: linkScrape };
                scrapedStuff.push(news);
            };
        });
        var newsObject = { newNews: scrapedStuff };
        res.render("index", newsObject);
    });
});

// This will get the articles we scraped from the mongoDB   
app.get("/kill", function(req, res) {
    var newsObject = { };
    // Grab every doc in the Articles array
    Article.find({}).exec(function(error, doc) {
      // Log any errors
        if (error) {
            console.log(error);
        }
        else { Note.find({}).exec(function(error, pad) {
            if (error) {
                console.log(error);
            } 
            else {
                console.log("Doc ======================================>");
            console.log(doc);                
                newsObject = { savedNews: doc, savedNote: pad};
                res.render("index", newsObject);
            };
        });            
        };
    });
});

// Delete an article from the db
app.post("/kill/:id", function(req, res) {
    Article.findByIdAndRemove({ "_id": req.params.id }).exec(function(err, doc) {
            // Log any errors
            if (err) {
                console.log("Error ===> " + err);
            }
            else {
                res.redirect("/kill");
            };
        });        
    });


// Delete a note from the Db  -----  deleting a note currently does not work
app.post("/nonote/:id/:parentId", function(req, res) {
    Note.findByIdAndRemove({ "_id": req.params.id }).exec(function(err, doc) {
        // Log any errors
            if (err) {
                console.log("Kill error ===> " + err);
            }
            else {
            };
    });
    Article.findByIdAndUpdate( req.params.parentId, {$pull: { note: {_id: req.params.id }}})
                .exec(function(err, doc) {                    
                    // Log errors
                    if (err) {
                        console.log("Error ===> " + err);
                    } else {
                        console.log("req.params.id ====>" + req.params.id);
                        console.log("................................ updating the note array ======>");
                    console.log(doc);
                        res.redirect("/kill");
                    }
                });
});

// add an article to the db
app.post("/scrape/:headline", function(req, res) {
  var news = { headline: req.params.headline, image: req.body.image, link: req.body.link };
  // create a new entry
                var entry = new Article(news);
                entry.save(function(err, doc) {
                    // Log errors
                    if (err) {
                        console.log(err);
                    }
                    else {
                        res.redirect("/scrape");
                    }
                });    
});

// Create a new note 
app.post("/notes/:id", function(req, res) {
    var noteInfo = { parentId: req.params.id, info: req.body.noteTxt };
   
    // if note text is empty then don't save the note
    if(req.body.noteTxt != "") {    
    var newNote = new Note(noteInfo);

    // save the new note the db
    newNote.save(function(error, doc) {
        // Log errors
        if (error) {
            console.log("Save error ====> " + error);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.id }, {$push: {"note": doc }})
                .exec(function(err, doc) {
                    // Log errors
                    if (err) {
                        console.log("Error ===> " + err);
                    } else {
                        res.redirect("/kill");
                    }
                });
        }
    });
}
});

// // Create a new note or replace an existing note
// app.post("/scrape/:headline", function(req, res) {
//     // Create a new note and pass the req.body to the entry
//     var newNote = new Note(req.body);
//     console.log("......posting to save article......");

//     // And save the new note the db
//     newNote.save(function(error, doc) {
//         // Log any errors
//         if (error) {
//             console.log(error);
//         }
//         // Otherwise
//         else {
//             // Use the article id to find and update it's note
//             Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
//                 // Execute the above query
//                 .exec(function(err, doc) {
//                     // Log any errors
//                     if (err) {
//                         console.log(err);
//                     } else {
//                         // Or send the document to the browser
//                         res.send(doc);
//                     }
//                 });
//         }
//     });
// });

// Listen on port 3000
app.listen(3000, function() {
    console.log("App running on port 3000!");
});