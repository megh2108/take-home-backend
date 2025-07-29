const pdf = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

async function extractTextFromPDF(buffer) {
  const data = await pdf(buffer);
  return data.text;
}

async function chunkText(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  
  // LangChain's splitter returns documents, we just need the text content
  const documents = await splitter.createDocuments([text]);
  return documents.map(doc => doc.pageContent);
}

module.exports = { extractTextFromPDF, chunkText };