const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  text: String,
  embedding: [Number], // Vector embedding
  pageNumber: Number,
});

const documentSchema = new mongoose.Schema({
  filename: String,
  originalText: String,
  chunks: [chunkSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Document", documentSchema);