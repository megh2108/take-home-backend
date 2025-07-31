const mongoose = require("mongoose");
const Document = require("../models/Document");
const natural = require("natural");
const { TfIdf } = natural;

// Initialize text processing tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Dynamic document processor
class DocumentProcessor {
  constructor(documentId) {
    this.documentId = documentId;
    this.tfidf = new TfIdf();
    this.chunks = [];
  }

  async initialize() {
    const doc = await Document.findById(this.documentId);
    if (!doc) throw new Error("Document not found");
    
    // Process each chunk and add to TF-IDF
    this.chunks = doc.chunks.map((chunk, index) => ({
      id: index,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      processedText: this.processText(chunk.text)
    }));

    this.chunks.forEach(chunk => {
      this.tfidf.addDocument(chunk.processedText);
    });
  }

  processText(text) {
    // Tokenize, stem, and remove stopwords
    return tokenizer.tokenize(text.toLowerCase())
      .filter(token => !natural.stopwords.includes(token)) // Remove common words
      .map(token => stemmer.stem(token)) // Reduce to word stems
      .join(' ');
  }

  async findRelevantChunks(query, limit = 3) {
    const processedQuery = this.processText(query);
    const queryTerms = processedQuery.split(' ');

    // Score chunks based on TF-IDF and term frequency
    const scoredChunks = this.chunks.map(chunk => {
      let score = 0;
      
      // Calculate TF-IDF score
      this.tfidf.tfidfs(processedQuery, (i, measure) => {
        if (i === chunk.id) score += measure;
      });

      // Boost score for exact matches
      queryTerms.forEach(term => {
        if (chunk.processedText.includes(term)) {
          score += 0.5; // Additional weight for each matching term
        }
      });

      return { ...chunk, score };
    });

    // Return top chunks
    return scoredChunks
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Dynamic answer formatter
function formatDynamicResponse(chunks, query) {
  // Extract all bullet points and numbered lists
  const bullets = [];
  const steps = [];
  
  chunks.forEach(chunk => {
    const lines = chunk.text.split('\n');
    lines.forEach(line => {
      if (line.match(/^\d+\./)) steps.push(line);
      if (line.match(/^\-/)) bullets.push(line);
    });
  });

  // Prioritize steps if found
  if (steps.length > 0) {
    return {
      type: 'steps',
      content: steps.slice(0, 5), // Return max 5 steps
      pages: [...new Set(chunks.map(c => c.pageNumber))]
    };
  }

  // Then bullets
  if (bullets.length > 0) {
    return {
      type: 'bullets',
      content: bullets.slice(0, 5),
      pages: [...new Set(chunks.map(c => c.pageNumber))]
    };
  }

  // Fallback to most relevant sentences
  const sentences = chunks[0].text.match(/[^\.!\?]+[\.!\?]+/g) || [chunks[0].text];
  return {
    type: 'text',
    content: sentences.slice(0, 3),
    pages: [chunks[0].pageNumber]
  };
}

// Main chat function
exports.chatWithDocument = async (req, res) => {
  const { documentId, query } = req.body;

  // Validate input
  if (!documentId || !query) {
    return res.status(400).json({ error: "documentId and query are required" });
  }

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    return res.status(400).json({ error: "Invalid document ID format" });
  }

  try {
    // Initialize document processor
    const processor = new DocumentProcessor(documentId);
    await processor.initialize();
    
    // Find relevant chunks
    const relevantChunks = await processor.findRelevantChunks(query);
    
    if (relevantChunks.length === 0) {
      return res.status(404).json({ error: "No relevant content found" });
    }

    // Format response based on content
    const response = formatDynamicResponse(relevantChunks, query);

    res.json({
      query,
      documentId,
      responseType: response.type,
      content: response.content,
      pages: response.pages,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Processing error:", err);
    res.status(500).json({ 
      error: "Document processing failed",
      details: err.message
    });
  }
};


// -------------above is done without use of openai
// below commented code is use for openai but got some error


// const mongoose = require("mongoose");
// const Document = require("../models/Document");
// const { getEmbedding } = require("../services/embeddingService");
// const openai = require("../config/ai");

// exports.chatWithDocument = async (req, res) => {
//   const { documentId, query } = req.body;

//   try {
//     // 1. Get query embedding
//     const queryEmbedding = await getEmbedding(query);

//     // 2. Vector search (now as first stage)
//     const results = await Document.aggregate([
//       {
//         $vectorSearch: {
//           index: "vector_index",
//           path: "chunks.embedding",
//           queryVector: queryEmbedding,
//           limit: 3,
//           numCandidates: 100,
//           filter: {
//             _id: new mongoose.Types.ObjectId(documentId),
//           },
//         },
//       },
//       {
//         $project: {
//           "chunks.text": 1,
//           "chunks.pageNumber": 1,
//           score: { $meta: "vectorSearchScore" },
//         },
//       },
//     ]);

//     if (!results || results.length === 0) {
//       return res.status(404).json({ error: "No matching chunks found" });
//     }

//     // 3. Construct context from results
//     const context = results
//       .flatMap((doc) => doc.chunks.map((chunk) => chunk.text))
//       .join("\n\n");

//     // 4. Call OpenAI
//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "system",
//           content: "Answer based on the document. Cite page numbers.",
//         },
//         { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` },
//       ],
//       max_tokens: 300,
//     });

//     // 5. Return response
//     res.json({
//       answer: response.choices[0].message.content,
//       citations: results.flatMap((doc) =>
//         doc.chunks.map((chunk) => chunk.pageNumber)
//       ),
//     });
//   } catch (err) {
//     console.error("Chat error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };
