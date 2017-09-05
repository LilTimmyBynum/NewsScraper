// Require mongoose
var mongoose = require("mongoose");
// Create Schema class
var Schema = mongoose.Schema;

// Create article schema
var ArticleSchema = new Schema({
  headline: {
    type: String,
    required: true,
    index: { unique: true }
  }, 
  
  image: {
    type: String,
    required: true
  },
  
  link: {
    type: String,
    required: true
  },
  note: [{
    type: Schema.Types.Mixed,
    ref: "Note"
  }]
});

// Create the Article model with the ArticleSchema
var Article = mongoose.model("Article", ArticleSchema);

// Export the model
module.exports = Article;
