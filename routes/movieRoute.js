const { newMovie, getAllMovies, updateMovie, deleteMovie, getSomeMovies, searchMovies, movieByGenre, getMovieByTitle, moviesByType } = require("../controller/movieController");

const router = require("express").Router();

router.post("/create",newMovie);
router.get("/get",getAllMovies);
router.get("/get/:title",getMovieByTitle);
router.get("/genre/:id",movieByGenre);
router.put("/update/:id",updateMovie);
router.get("/get/type/:type",moviesByType);
router.post("/search",searchMovies);
router.get("/someMovies",getSomeMovies);
router.delete("/delete/:id",deleteMovie);


module.exports = router;