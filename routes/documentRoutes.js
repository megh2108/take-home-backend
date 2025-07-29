const express = require("express");
const router = express.Router();
const Document = require("../models/Document");
const { uploadDocument } = require("../controllers/documentController");

// POST /api/documents - Upload PDF
router.post("/", uploadDocument);

// GET /api/documents - List all documents (optional)
router.get("/", async (req, res) => {
  try {
    const documents = await Document.find().select("-chunks.embedding"); // Exclude heavy embeddings
    res.json(documents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;