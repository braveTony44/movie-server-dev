const mongoose = require("mongoose");

const MovieData = new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    type:{type:String, required:true},
    posterIMG:{type:Array},
    shortDesc:{type:String},
    longDesc:{type:String},
    imdbRating:{type:Number},
    releaseYear:{type:Number},
    avilLang:{type:String},
    runtime:{type:Number},
    director:{type:String},
    availQualitySample:{type:Array},
    genres:{type:Array},
    availQuality:{type:Array},
    availDownloads:{type:Array},
    
})
module.exports = mongoose.model("Movie",MovieData);