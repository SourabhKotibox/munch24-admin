const fs = require('fs');
const path = require('path');

const EXCLUDES = [
  'wallet.tsx', 'membership.tsx', 'user-profile.tsx', 
  'streaming-home.tsx', 'short-drama-player.tsx', 'public-auth.tsx', 
  'public-page.tsx', 'web-home-sections.tsx', 'categories-browse.tsx', 'tv-shows-public.tsx'
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (f.endsWith('.tsx') && !EXCLUDES.includes(f)) {
      let data = fs.readFileSync(fullPath, 'utf8');
      
      // Protect bg-primary text-white combinations before they get ruined
      // Change them to a temporary placeholder
      data = data.replace(/(bg-(?:primary|red-\d+|blue-\d+|green-\d+|amber-\d+|purple-\d+|indigo-\d+|black|zinc-900)(?:\/\d+)?(?:[^"']*?))text-white/g, '$1TEMP_WHITE');
      
      data = data.replace(/text-white\/75/g, 'text-muted-foreground');
      data = data.replace(/text-white\/60/g, 'text-muted-foreground/80');
      data = data.replace(/text-white\/50/g, 'text-muted-foreground');
      data = data.replace(/text-white\/40/g, 'text-muted-foreground/60');
      data = data.replace(/text-white\/20/g, 'text-muted-foreground/40');
      data = data.replace(/text-white/g, 'text-foreground');
      
      // Input background fixes
      data = data.replace(/bg-input/g, 'bg-background');
      
      // Restore the protected ones
      data = data.replace(/TEMP_WHITE/g, 'text-white');
      
      // Also restore bg-primary ... text-foreground if we accidentally changed it before
      data = data.replace(/(bg-(?:primary|red-\d+|blue-\d+|green-\d+|amber-\d+|purple-\d+|indigo-\d+|black|zinc-900)(?:\/\d+)?(?:[^"']*?))text-foreground/g, '$1text-white');
      
      fs.writeFileSync(fullPath, data);
    }
  }
}

processDir(path.join(__dirname, 'src/pages'));
console.log('Done fixing colors!');
