const express = require("express");
const router = express.Router();
const controller = require("../controllers/questionsController");
// const upload = require("../utils/upload.middleware");
const multer = require('multer');

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },

    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }

});

const upload = multer({ storage });


router.post("/create", upload.single('file'), controller.createQuestion);
// router.get("/", controller.getQuestions);
// router.get("/:id", controller.getQuestionById);
// router.put("/:id", controller.updateQuestion);
// router.delete("/:id", controller.deleteQuestion);

module.exports = router;
