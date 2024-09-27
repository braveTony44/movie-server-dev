const MOVIE = require("../models/movieSchema");
const EPISODE = require("../models/episodeSchema");
const { error, success } = require("../services/errors");
const nodeCache = require("../services/cacheing");

const cacheDuration = 12 * 3600; // Cache duration in seconds (12 hours)

// Create a new episode
const newEpisode = async (req, res) => {
  try {
    const {
      movieID,
      title,
      season,
      downloadQuality,
      downloadLink,
      episodeNumber,
    } = req.body;

    if (
      !movieID ||
      !title ||
      !season ||
      !downloadQuality ||
      !downloadLink ||
      !episodeNumber
    ) {
      return res.send(error(404, "All fields are required", "newEpisode"));
    }

    // Check if the movie exists
    const movie = await MOVIE.findById(movieID);
    if (!movie) {
      return res.send(error(404, "Movie not found", "create episode"));
    }

    // Create a new episode
    const newEpisode = await EPISODE.create({
      title,
      movieID,
      season,
      downloadLink,
      episodeNumber,
      downloadQuality,
    });

    // Add the episode to the movie
    movie.episodes.push(newEpisode._id);
    await movie.save();

    // Clear cache for the episodes of the movie (if exists)
    const movieEpisodesCacheKey = `episodes_movieId_${movieID}`;
    nodeCache.del(movieEpisodesCacheKey);

    return res.send(
      success(201, "Episode created and added to movie", newEpisode)
    );
  } catch (err) {
    return res.send(error(500, err.message, "newEpisode"));
  }
};

// Get all episodes for a movie
const getEpisodeByMovieId = async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!movieId) {
      return res.send(error(404, "Movie ID not found", "getEpisodeByMovieId"));
    }

    const cacheKey = `episodes_movieId_${movieId}`;
    const cachedEpisodes = nodeCache.get(cacheKey);

    if (cachedEpisodes) {
      return res.send(
        success(200, "Episodes fetched from cache", cachedEpisodes)
      );
    }

    const episodes = await EPISODE.find({ movieID: movieId });

    if (!episodes || episodes.length === 0) {
      return res.send(error(400, "No episodes found", "getEpisodeByMovieId"));
    }

    // Cache the episodes for future requests
    nodeCache.set(cacheKey, episodes, cacheDuration);

    return res.send(success(201, "Episodes fetched successfully", episodes));
  } catch (err) {
    return res.send(error(500, err.message, "getEpisodeByMovieId"));
  }
};

// Get a single episode
const getEpisodes = async (req, res) => {
  try {
    const { id } = req.params || req.body;
    if (!id) {
      return res.send(error(404, "Episode ID not found", "getEpisodes"));
    }

    const cacheKey = `episode_${id}`;
    const cachedEpisode = nodeCache.get(cacheKey);

    if (cachedEpisode) {
      return res.send(
        success(200, "Episode fetched from cache", cachedEpisode)
      );
    }

    const episode = await EPISODE.findById(id);
    if (!episode) {
      return res.send(error(404, "Episode not found", "getEpisodes"));
    }

    // Cache the episode for future requests
    nodeCache.set(cacheKey, episode, cacheDuration);

    return res.send(success(200, "Episode fetched", episode));
  } catch (err) {
    return res.send(error(500, err.message, "getEpisodes"));
  }
};

// Update an episode
const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      season,
      downloadQuality,
      downloadLink,
      episodeNumber,
      movieID,
    } = req.body;

    if (
      !id ||
      !title ||
      !season ||
      !downloadQuality ||
      !downloadLink ||
      !episodeNumber ||
      !movieID
    ) {
      return res.send(error(404, "All fields are required", "updateEpisode"));
    }

    const updatedEpisode = await EPISODE.findByIdAndUpdate(
      id,
      { title, season, downloadQuality, downloadLink, episodeNumber },
      { new: true } // Return the updated document
    );

    if (!updatedEpisode) {
      return res.send(error(404, "Episode not found", "updateEpisode"));
    }

    // Clear cache for the specific episode and the movie's episodes
    const episodeCacheKey = `episode_${id}`;
    const movieEpisodesCacheKey = `episodes_movieId_${movieID}`;

    nodeCache.del(episodeCacheKey);
    nodeCache.del(movieEpisodesCacheKey);

    return res.send(
      success(200, "Episode updated successfully", updatedEpisode)
    );
  } catch (err) {
    return res.send(error(500, err.message, "updateEpisode"));
  }
};

// Delete an episode
const deleteEpisode = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.send(error(404, "Episode ID is required", "deleteEpisode"));
    }

    const deletedEpisode = await EPISODE.findByIdAndDelete(id);
    if (!deletedEpisode) {
      return res.send(error(404, "Episode not found", "deleteEpisode"));
    }

    // Remove the episode reference from the movie
    await MOVIE.updateOne({ episodes: id }, { $pull: { episodes: id } });

    // Clear cache for the specific episode and the movie's episodes
    const episodeCacheKey = `episode_${id}`;
    const movieEpisodesCacheKey = `episodes_movieId_${deletedEpisode.movieID}`;

    nodeCache.del(episodeCacheKey);
    nodeCache.del(movieEpisodesCacheKey);

    return res.send(
      success(200, "Episode deleted successfully", deletedEpisode)
    );
  } catch (err) {
    return res.send(error(500, err.message, "deleteEpisode"));
  }
};



// get movie by episode quality

const getEpisodesByQuality = async (req, res) => {
  try {
    const { movieId } = req.params;
    const { quality } = req.body;

    if (!movieId || !quality) {
      return res.send(error(400, "Movie ID and quality are required", "getEpisodesByQuality"));
    }

    // Step 1: Create a unique cache key based on movieId and quality
    const cacheKey = `episodes_movieId_${movieId}_${quality}`;
    const cachedEpisodes = nodeCache.get(cacheKey);

    // Step 2: Check if the episodes are cached
    if (cachedEpisodes) {
      return res.send(success(200, `Episodes with ${quality} quality fetched from cache`, cachedEpisodes));
    }

    // Step 3: Fetch the movie to get the list of episode IDs
    const movie = await MOVIE.findById(movieId).populate("episodes");
    if (!movie) {
      return res.send(error(404, "Movie not found", "getEpisodesByQuality"));
    }

    const episodeIds = movie.episodes;
    if (!episodeIds || episodeIds.length === 0) {
      return res.send(error(404, "No episodes found for this movie", "getEpisodesByQuality"));
    }

    // Step 4: Fetch all episodes that match the IDs in the movie document and quality
    const episodes = await EPISODE.find({ _id: { $in: episodeIds }, downloadQuality: quality });

    if (!episodes || episodes.length === 0) {
      return res.send(error(404, `No episodes found with ${quality} quality`, "getEpisodesByQuality"));
    }

    // Step 5: Cache the episodes for future requests
    nodeCache.set(cacheKey, episodes, cacheDuration);

    // Step 6: Return the filtered episodes
    return res.send(success(200, `Episodes with ${quality} quality found`, episodes));
  } catch (err) {
    return res.send(error(500, err.message, "getEpisodesByQuality"));
  }
};


module.exports = {
  newEpisode,
  getEpisodeByMovieId,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  getEpisodesByQuality
};
