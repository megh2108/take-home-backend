const mongoose = require("mongoose");
const Document = require("../models/Document");
const { getEmbedding } = require("../services/embeddingService");
const openai = require("../config/ai");

exports.chatWithDocument = async (req, res) => {
  const { documentId, query } = req.body;

  try {
    // 1. Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // 2. Vector search (now as first stage)
    const results = await Document.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "chunks.embedding",
          queryVector: queryEmbedding,
          limit: 3,
          numCandidates: 100,
          filter: {
            _id: new mongoose.Types.ObjectId(documentId),
          },
        },
      },
      {
        $project: {
          "chunks.text": 1,
          "chunks.pageNumber": 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    if (!results || results.length === 0) {
      return res.status(404).json({ error: "No matching chunks found" });
    }

    // 3. Construct context from results
    const context = results
      .flatMap((doc) => doc.chunks.map((chunk) => chunk.text))
      .join("\n\n");

    // 4. Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Answer based on the document. Cite page numbers.",
        },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      max_tokens: 300,
    });

    // 5. Return response
    res.json({
      answer: response.choices[0].message.content,
      citations: results.flatMap((doc) =>
        doc.chunks.map((chunk) => chunk.pageNumber)
      ),
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: err.message });
  }
};
