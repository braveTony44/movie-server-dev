const { newEpisode, getEpisodeByMovieId, getEpisodes, updateEpisode, deleteEpisode, getEpisodesByQuality } = require("../controller/episodeController");

const router = require("express").Router();

router.post("/create",newEpisode);
router.get("/get/all/:movieId",getEpisodeByMovieId);
router.get("/get/:id",getEpisodes);
router.post("/get/quality/:movieId",getEpisodesByQuality);
router.put("/update/:id",updateEpisode);
router.delete("/delete/:id",deleteEpisode);

module.exports = router;