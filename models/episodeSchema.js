const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    movieID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie", // Reference to the Movie model
    },
    title: { type: String, required: true },
    season: { type: String, required: true },
    downloadQuality: { type: Number, required: true },
    downloadLink: { type: String, required: true },
    episodeNumber:{type:Number}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Episode", episodeSchema);
