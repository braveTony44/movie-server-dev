const mongoose = require("mongoose");

const userFeedback = new mongoose.Schema({
    userName:{type:String},
    userEmail:{type:String},
    userMessage:{type:String},
    complainSampleIMG:{type:String}

},{timestamps:true});

module.exports = mongoose.model("userFeedback",userFeedback);
