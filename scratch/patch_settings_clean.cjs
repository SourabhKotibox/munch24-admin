const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'contexts', 'SettingsContext.tsx');
let content = fs.readFileSync(filepath, 'utf8');

const applyFunctions = `
export function applyColorTheme(theme: string) {
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
}

export function applyBodyClasses(cardStyle: string, menuStyle: string) {
  const body = document.body;
  
  // Clean up old classes
  body.classList.remove('card-style-default', 'card-style-glass', 'card-style-transparent');
  body.classList.remove('menu-style-mini', 'menu-style-hover', 'menu-style-boxed', 'menu-style-soft');
  
  // Apply new classes
  if (cardStyle) body.classList.add(\`card-style-\${cardStyle}\`);
  if (menuStyle) body.classList.add(\`menu-style-\${menuStyle}\`);
}
`;

if (!content.includes('export function applyColorTheme')) {
  // Inject the functions right after applyFavicon
  content = content.replace(
    /function applyFavicon\(url: string\) \{[\s\S]*?link\.href = url;[\r\n]*\}/,
    match => match + '\n' + applyFunctions
  );
  
  // Call in refreshSettings
  content = content.replace(
    /applyFavicon\(mapped\.faviconUrl\);/,
    'applyFavicon(mapped.faviconUrl);\n      applyColorTheme(mapped.colorTheme);\n      applyBodyClasses(mapped.cardStyle, mapped.menuStyle);'
  );

  // Call in updateSettings immediately
  content = content.replace(
    /return next;\n    \}\);\n  \};/,
    'if (patch.colorTheme) applyColorTheme(patch.colorTheme);\n      if (patch.cardStyle || patch.menuStyle) applyBodyClasses(patch.cardStyle || prev.cardStyle, patch.menuStyle || prev.menuStyle);\n      return next;\n    });\n  };'
  );
  
  // Call in SettingsProvider useState init
  content = content.replace(
    /return \{ \.\.\.DEFAULT, \.\.\.parsed \};/,
    'const s = { ...DEFAULT, ...parsed };\n        applyColorTheme(s.colorTheme);\n        applyBodyClasses(s.cardStyle, s.menuStyle);\n        return s;'
  );
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully injected apply functions.');
}
