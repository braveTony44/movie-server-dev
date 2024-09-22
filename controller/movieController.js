const MOVIE = require("../models/movieSchema");
const mongoose = require("mongoose");
const { success, error } = require("../services/errors");
const nodeCache = require("../services/cacheing");
const cloudinary = require("../services/cloudinary");


// Create a new movie
const newMovie = async (req, res) => {
  try {
    const {
      title, type, shortDesc, imdbRating, releaseYear, avilLang, longDesc,
      runtime, director, genres, availQuality, availDownloads
    } = req.body;

    // Use req.files for handling file uploads
    const posterIMG = req.files && req.files['posterIMG'] ? req.files['posterIMG'][0].path : null;  // Handle poster image file
    const availQualitySample = req.files && req.files['availQualitySample'] ? req.files['availQualitySample'].map(file => file.path) : [];  // Handle avail quality sample files

    // Validate that all fields are filled
    if (!title || !type || !posterIMG || !shortDesc || !imdbRating || !releaseYear || !runtime) {
      return res.send(error(400, "All fields are required", "new movie"));
    }

    // Check if movie already exists
    const isMovieExist = await MOVIE.findOne({ title }).lean(); // Use lean for faster query
    if (isMovieExist) {
      return res.send(error(409, "Movie already exists", "new movie"));
    }

    // Upload poster image to Cloudinary, convert to AVIF or WebP, reduce quality
    let posterUploadResult = null;
    if (posterIMG) {
      posterUploadResult = await cloudinary.uploader.upload(posterIMG, {
        format: 'avif',   // Convert to AVIF for optimal performance
        quality: '70'     // Reduce quality to 70% for optimization
      });
    }

    // Upload each availQualitySample file to Cloudinary and store the results
    const qualitySampleUploadResults = [];
    if (availQualitySample.length > 0) {
      for (const file of availQualitySample) {
        const result = await cloudinary.uploader.upload(file, {
          format: 'avif',   // Convert to AVIF
          quality: '70'     // Reduce quality to 70%
        });
        qualitySampleUploadResults.push(result.secure_url); // Store secure URLs
      }
    }

    // Create the movie in the database
    const movie = await MOVIE.create({
      title,
      type,
      posterIMG: posterUploadResult ? posterUploadResult.secure_url : null,  // Store uploaded poster URL
      shortDesc,
      imdbRating,
      releaseYear,
      avilLang,
      longDesc,
      runtime,
      director,
      availQualitySample: qualitySampleUploadResults,  // Store array of sample URLs
      genres,
      availQuality,
      availDownloads
    });

    // Clear relevant caches
    nodeCache.del("getMovieByID");
    nodeCache.del("getAllMovies");

    return res.send(success(201, "Movie created successfully", movie));
  } catch (e) {
    console.error(`Error creating movie: ${e.message}`);
    return res.send(error(500, e.message, "new movie"));
  }
};


// Get all movies
const getAllMovies = async (req, res) => {
  try {
    const cachedMovies = nodeCache.get("getAllMovies");
    if (cachedMovies) {
      return res.send(success(200, "Movies fetched from cache successfully", cachedMovies));
    }

    const movies = await MOVIE.find().lean();
    if (movies.length === 0) {
      return res.send(error(404, "No movies found", "get all movies"));
    }
    // set cached to 24 hours
    const cacheDuration = 24 * 3600;
    nodeCache.set("getAllMovies", movies, cacheDuration); // Cache for 1 hour
    return res.send(success(200, "Movies fetched successfully", movies));
  } catch (e) {
    return res.send(error(500, e.message, "get all movies"));
  }
};

// Get movie by ID
const getMovieByTitle = async (req, res) => {
  const { title } = req.params;

  // if (!mongoose.Types.ObjectId.isValid(id)) {
  //   return res.send(error(400, "Invalid movie ID", "get movie by ID"));
  // }

  const cacheKey = `getMovieByID_${title}`;
  const cachedMovie = nodeCache.get(cacheKey);

  if (cachedMovie) {
    return res.send(success(200, "Movie fetched from cache successfully", cachedMovie));
  }

  try {
    const movie = await MOVIE.findOne({title}).lean();
    if (!movie) {
      return res.send(error(404, "Movie not found", "get movie by Title"));
    }

    const cacheDuration = 24 * 3600;
    nodeCache.set(cacheKey, movie, cacheDuration); // Cache for 24 hour
    return res.send(success(200, "Movie fetched successfully", movie));
  } catch (e) {
    return res.send(error(500, e.message, "get movie by Title"));
  }
};

// Update movie
const updateMovie = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.send(error(400, "Invalid movie ID", "update movie"));
  }

  try {
    const updateFields = {};
    const allowedFields = [
      "title", "posterIMG", "shortDesc", "longDesc", "imdbRating", "releaseYear",
      "avilLang", "type", "runtime", "director", "availQualitySample", "genres",
      "availQuality", "availDownloads"
    ];

    allowedFields.forEach(field => {
      if (req.body[field]) updateFields[field] = req.body[field];
    });

    const movie = await MOVIE.findByIdAndUpdate(id, updateFields, {
      new: true,
      lean: true
    });

    if (!movie) {
      return res.send(error(404, "Movie not found", "update movie"));
    }

    nodeCache.del(`getMovieByID_${id}`);
    nodeCache.del("getAllMovies");

    return res.send(success(200, "Movie updated successfully", movie));
  } catch (e) {
    return res.send(error(500, e.message, "update movie"));
  }
};

// Delete movie
const deleteMovie = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.send(error(400, "Invalid movie ID", "delete movie"));
  }

  try {
    const movie = await MOVIE.findByIdAndDelete(id).lean();
    if (!movie) {
      return res.send(error(404, "Movie not found", "delete movie"));
    }

    nodeCache.del(`getMovieByID_${id}`);
    nodeCache.del("getAllMovies");

    return res.send(success(200, "Movie deleted successfully", movie));
  } catch (e) {
    return res.send(error(500, e.message, "delete movie"));
  }
};

// Get limited movies with pagination
const getSomeMovies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10; // Default limit to 10
    const skip = parseInt(req.query.skip, 10) || 0;

    const movies = await MOVIE.find().skip(skip).limit(limit).lean();
    if (movies.length === 0) {
      return res.send(error(404, "No movies found", "get some movies"));
    }

    return res.send(success(200, "Movies fetched successfully", movies));
  } catch (err) {
    return res.send(error(500, err.message, "get some movies"));
  }
};

const searchMovies = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.send(error(400, "Search query not provided", "search movies"));
  }

  const cacheKey = `searchMovies_${query}`;
  const cachedMovies = nodeCache.get(cacheKey);

  // Check if the search result is cached
  if (cachedMovies) {
    return res.send(success(200, "Search results found (from cache)", cachedMovies));
  }

  try {
    const movies = await MOVIE.find({
      title: { $regex: query, $options: "i" }
    }).lean();

    // If no movies are found, return 404
    if (movies.length === 0) {
      return res.send(error(404, "No movies found", "search movies"));
    }

<<<<<<< HEAD
    // Store the search results in the cache for 24 hour (3600 seconds * 24)
    const cacheDuration = 24 * 3600;
    nodeCache.set(cacheKey, movies, cacheDuration);
=======
    // Store the search results in the cache for 1 hour (3600 seconds)
    nodeCache.set(cacheKey, movies, 3600);
>>>>>>> fb10e0bf805b989d4c8b7db54c6c5f585185cb30

    return res.send(success(200, "Search results found", movies));
  } catch (err) {
    return res.send(error(500, err.message, "search movies"));
  }
};


// Get movies by genre
const movieByGenre = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.send(error(400, "Genre ID not provided", "movieByGenre"));
  }

  const cacheKey = `movieByGenre_${id}`;
  const cachedMovies = nodeCache.get(cacheKey);

  if (cachedMovies) {
    return res.send(success(200, "Movies fetched from cache successfully", cachedMovies));
  }

  try {
    const movies = await MOVIE.find({
      genres: { $regex: new RegExp(id, "i") }
    }).lean();

    if (movies.length === 0) {
      return res.send(error(404, "No movies found for this genre", "movieByGenre"));
    }
    const cacheDuration = 24 * 3600;
    nodeCache.set(cacheKey, movies, cacheDuration); // Cache for 24 hour
    return res.send(success(200, "Movies fetched successfully", movies));
  } catch (err) {
    return res.send(error(500, "Server error", "movieByGenre"));
  }
};

// get movies by type like movies,series and documentry
const moviesByType = async(req,res)=>{
  try {
    const {type} = req.params;
    if(!type){
      return res.send(error(404, "Type is not found", "moviesByType"));
    }

    const cacheKey = `moviesByType_${type}`;
    const cachedMovies = nodeCache.get(cacheKey);
  
    if (cachedMovies) {
      return res.send(success(200, "Movies fetched from cache successfully", cachedMovies));
    }
  
      // Use case-insensitive regex to match the type regardless of case
      const movies = await MOVIE.find({ type: { $regex: new RegExp(type, "i") } }).lean();
    if(movies.length === 0){
      return res.send(error(404, "NO Movie found", "moviesByType"));
    }
    const cacheDuration = 24 * 3600;
    nodeCache.set(cacheKey, movies, cacheDuration); // Cache for 24 hour
    return res.send(success(200,`${type} found successfully`, movies));
  } catch (err) {
    return res.send(error(500, err.message, "moviesByType"));
  }
}

module.exports = {
  newMovie,
  getAllMovies,
  getMovieByTitle,
  updateMovie,
  deleteMovie,
  moviesByType,
  getSomeMovies,
  searchMovies,
  movieByGenre
};
