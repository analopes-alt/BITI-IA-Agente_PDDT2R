import fs from 'fs';

const html = fs.readFileSync('folder.html', 'utf8');

// Let's search for words that might be related to files or folders
// Let's find any string that is inside a double quote and has a length of 20-100 characters
// e.g. "Cliente A", "PDD...", etc.
console.log("HTML length:", html.length);

// Let's match any google drive file/folder URLs
const urlRegex = /https:\/\/drive\.google\.com\/[^"'\s>]+/g;
const urls = html.match(urlRegex) || [];
console.log(`Found ${urls.length} URLs matching drive.google.com:`);
const uniqueUrls = Array.from(new Set(urls));
console.log("Unique URLs (first 20):");
uniqueUrls.slice(0, 20).forEach(u => console.log(" -", u));

// Let's search for any occurrence of 'application/vnd.google-apps' or 'folder' or 'pdf'
const mimeMatches = html.match(/application\/vnd\.google-apps\.[^\s"']+/g) || [];
console.log(`Found ${mimeMatches.length} mimeType strings:`, Array.from(new Set(mimeMatches)));
