import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
console.log("Using API Key:", apiKey ? "FOUND (starts with " + apiKey.substring(0, 5) + ")" : "NOT FOUND");

async function run() {
  if (!apiKey) return;
  try {
    const folderId = '1UR12I_vO978Y4LOa5SVmQ4ddidWUTonF';
    // Let's see if we can list files in this folder using files.list
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed+%3D+false&key=${apiKey}&fields=files(id,name,mimeType)`;
    console.log("Fetching URL:", url);
    const response = await fetch(url);
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
