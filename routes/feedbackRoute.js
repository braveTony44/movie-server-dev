const { createFeedback, deleteAllFeedback, getAllFeedback } = require("../controller/userFeedback");

const router = require("express").Router();

router.post('/create',createFeedback);
router.get("/get",getAllFeedback);
router.delete('/destroy/:id',deleteAllFeedback);



module.exports = router;