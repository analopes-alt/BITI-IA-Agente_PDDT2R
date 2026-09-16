import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function run() {
  if (!apiKey) return;
  try {
    const folderId = '1UR12I_vO978Y4LOa5SVmQ4ddidWUTonF';
    const url = `https://www.googleapis.com/drive/v2/files?q='${folderId}'+in+parents+and+explicitlyTrashed+%3D+false&key=${apiKey}`;
    console.log("Fetching URL (v2):", url);
    const response = await fetch(url);
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response data (v2):", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
