const multer = require("multer");
const { extractTextFromPDF, chunkText } = require("../services/pdfService");
const { getEmbedding } = require("../services/embeddingService");
const Document = require("../models/Document");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  }
});

exports.uploadDocument = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      // ... rest of the existing code ...
    } catch (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: "File upload error: " + err.message });
      }
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
];