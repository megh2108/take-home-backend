const express = require("express");
const router = express.Router();
const { chatWithDocument } = require("../controllers/chatController");

router.post("/", chatWithDocument);

module.exports = router;