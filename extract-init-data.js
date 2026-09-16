import fs from 'fs';

const html = fs.readFileSync('folder.html', 'utf8');

// The AF_initDataCallback call looks like: AF_initDataCallback({key: 'ds:3', hash: '6', data: [...]}) or similar.
// We can find all of them by searching for AF_initDataCallback
const regex = /AF_initDataCallback\(\{([\s\S]*?)\}\);/g;
let match;
let count = 0;

while ((match = regex.exec(html)) !== null) {
  count++;
  const content = match[1];
  console.log(`\n--- Callback ${count} ---`);
  
  // Let's parse out the key
  const keyMatch = content.match(/key:\s*'([^']+)'/);
  const key = keyMatch ? keyMatch[1] : 'unknown';
  console.log(`Key: ${key}, Length: ${content.length}`);

  // Let's extract the data array
  const dataStart = content.indexOf('data:');
  if (dataStart !== -1) {
    let dataStr = content.substring(dataStart + 5).trim();
    // It ends at the end of the content or sideChannel
    const sideChannelIdx = dataStr.indexOf(', sideChannel:');
    if (sideChannelIdx !== -1) {
      dataStr = dataStr.substring(0, sideChannelIdx).trim();
    }
    
    console.log(`Data length: ${dataStr.length}`);
    
    // Let's print some text snippets or do a search for folder names or file names
    // E.g., see if it contains "PDD" or "T2R" or ".pdf"
    if (dataStr.toLowerCase().includes('.pdf') || dataStr.toLowerCase().includes('pdf') || dataStr.toLowerCase().includes('pdd') || dataStr.toLowerCase().includes('xlsx')) {
      console.log("-> This data block contains PDF/PDD/XLSX references!");
      // Print first 500 characters of dataStr
      console.log("Data snippet:", dataStr.substring(0, 800));
    }
  }
}
