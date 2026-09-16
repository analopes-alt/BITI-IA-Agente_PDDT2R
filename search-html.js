import fs from 'fs';

const html = fs.readFileSync('folder.html', 'utf8');

// Let's find all script tags and check their content
const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
console.log(`Found ${scripts.length} script tags`);

// Let's search for some strings. Let's search for "pdf" or "PDD" or any file names
// Let's write a regex that matches common drive file IDs and metadata patterns.
// Drive files typically have 33-character IDs: e.g. 1[a-zA-Z0-9_-]{32}
// Let's find all IDs that are inside a drive-like pattern, or JSON arrays.
// Or we can just find any occurrences of words like "pdf" or "xlsx" or "Client" or "PDD" or "T2R"
console.log("\nSearching for occurrences of FOLDER_ID:");
const folderId = "1UR12I_vO978Y4LOa5SVmQ4ddidWUTonF";
let index = 0;
while ((index = html.indexOf(folderId, index)) !== -1) {
  console.log(`Found folderId at index ${index}`);
  console.log("Context around folderId:", html.substring(Math.max(0, index - 200), index + 200));
  index += folderId.length;
}

console.log("\nSearching for other potential Google Drive IDs:");
// Google Drive IDs are 33 characters, starting with 1 (or other characters, length between 25 and 45)
// Let's search for some pattern of letters/numbers of length 33 in the scripts
const idPattern = /"1[a-zA-Z0-9_-]{32}"/g;
const idsFound = html.match(idPattern) || [];
console.log(`Found ${idsFound.length} potential drive IDs`);
const uniqueIds = Array.from(new Set(idsFound));
console.log(`Unique drive IDs (${uniqueIds.length}):`, uniqueIds.slice(0, 20));


