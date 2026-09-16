import fs from 'fs';

async function run() {
  try {
    const url = 'https://drive.google.com/embeddedfolderview?id=1UR12I_vO978Y4LOa5SVmQ4ddidWUTonF';
    console.log("Fetching url:", url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();
    console.log("HTML length:", html.length);
    fs.writeFileSync('folder.html', html);
    console.log("Done. Searching for some patterns...");
    
    // Let's search for "1UR12I_vO978Y4LOa5SVmQ4ddidWUTonF" or file ids or text
    const matches = html.match(/id="[^"]*"/g) || [];
    console.log("Number of id matches:", matches.length);
    
    // Find script tags containing F_tData or initialData
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    console.log("Found", scriptMatches.length, "script tags.");
    for (let i = 0; i < scriptMatches.length; i++) {
      const script = scriptMatches[i];
      if (script.includes('_F_tData') || script.includes('init') || script.includes('ytInitialData') || script.includes('folder') || script.includes('drive')) {
        console.log(`Script ${i} matches search keyword! Length:`, script.length);
        if (script.includes('_F_tData')) {
          console.log(`Script ${i} has _F_tData! Snippet:`, script.substring(0, 500));
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
