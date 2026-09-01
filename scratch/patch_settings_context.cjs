const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'contexts', 'SettingsContext.tsx');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('applyColorTheme(url: string)')) {
  const applyThemeCode = `
function applyColorTheme(theme: string) {
  const root = document.documentElement;
  
  // Base primary colors in HSL for Tailwind
  const themeMap: Record<string, string> = {
    "blue-green": "217 91% 60%", // #3b82f6
    "orange-yellow": "24 95% 53%", // #f97316
    "pink-purple": "330 81% 60%", // #ec4899
    "purple-orange": "258 90% 66%", // #8b5cf6
    "green-pink": "142 71% 45%", // #22c55e
  };

  const hsl = themeMap[theme] || "357 93% 47%"; // Default to red
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
}`;

  content = content.replace(
    /function applyFavicon\(url: string\) \{[\s\S]*?\}/,
    match => match + '\n' + applyThemeCode
  );
  
  // Now we need to call applyColorTheme inside refreshSettings
  content = content.replace(
    /applyFavicon\(mapped\.faviconUrl\);/,
    'applyFavicon(mapped.faviconUrl);\n      applyColorTheme(mapped.colorTheme);'
  );

  // Also apply it in updateSettings immediately
  content = content.replace(
    /return next;\n    \}\);\n  \};/,
    'if (patch.colorTheme) applyColorTheme(patch.colorTheme);\n      return next;\n    });\n  };'
  );
  
  // Also apply on initial load inside SettingsProvider useState init
  // Wait, we can just apply it in useEffect or outside useState
  content = content.replace(
    /return \{ \.\.\.DEFAULT, \.\.\.parsed \};/,
    'const s = { ...DEFAULT, ...parsed };\n        applyColorTheme(s.colorTheme);\n        return s;'
  );
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully injected applyColorTheme logic.');
} else {
  console.log('applyColorTheme already exists.');
}
