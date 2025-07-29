const pdf = require("pdf-parse");
const { TextSplitter } = require("langchain/text_splitter");

async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return data.text;
}

function chunkText(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  return splitter.splitText(text);
}

module.exports = { extractTextFromPDF, chunkText };