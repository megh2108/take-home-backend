const multer = require("multer");
const { extractTextFromPDF, chunkText } = require("../services/pdfService");
const { getEmbedding } = require("../services/embeddingService");
const Document = require("../models/Document");

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadDocument = [
  upload.single("file"),
  async (req, res) => {
    try {
        console.log("Document Controller")
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }
      const text = await extractTextFromPDF(req.file.buffer);
      const chunks = await chunkText(text);

      const embeddings = await Promise.all(
        chunks.map((chunk) => getEmbedding(chunk))
      );

      const doc = new Document({
        filename: req.file.originalname,
        originalText: text,
        chunks: chunks.map((text, i) => ({
          text,
          embedding: embeddings[i],
          pageNumber: 1, // Can be extracted from PDF
        })),
      });

      await doc.save();
      res.status(201).json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
];
