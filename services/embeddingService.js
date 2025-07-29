const openai = require("../config/ai");
const tf = require('@tensorflow/tfjs-node'); // Local embeddings fallback

async function getEmbedding(text) {
  try {
    // Try OpenAI first
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    if (error.status === 429) {
      console.log("Using local embeddings fallback");
      return getLocalEmbedding(text);
    }
    throw error;
  }
}

// Simple local embedding fallback
async function getLocalEmbedding(text) {
  // This is a simplified version - consider a proper local model
  const words = text.toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(words)];
  const embedding = new Array(128).fill(0); // Mock 128-dim vector
  
  uniqueWords.forEach(word => {
    const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    embedding[hash % 128] += 1; // Simple distribution
  });
  
  // Normalize
  const norm = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
  return embedding.map(val => val / norm);
}

module.exports = { getEmbedding };