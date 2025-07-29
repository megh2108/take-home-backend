const Document = require("../models/Document");
const { getEmbedding } = require("../services/embeddingService");
const openai = require("../config/ai");

exports.chatWithDocument = async (req, res) => {
  const { documentId, query } = req.body;

  try {
    // 1. Get query embedding
    const queryEmbedding = await getEmbedding(query);

    // 2. Vector search in MongoDB
    const doc = await Document.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(documentId) } },
      { $unwind: "$chunks" },
      {
        $vectorSearch: {
          queryVector: queryEmbedding,
          path: "chunks.embedding",
          limit: 3,
          numCandidates: 100,
          index: "vector_index",
        },
      },
    ]);

    // 3. Construct context
    const context = doc[0].chunks.map(c => c.text).join("\n\n");

    // 4. Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Answer based on the provided document. Cite page numbers.",
        },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` },
      ],
      max_tokens: 300, // Limit token usage
    });

    // 5. Return response with citations
    res.json({
      answer: response.choices[0].message.content,
      citations: doc[0].chunks.map(c => c.pageNumber),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};