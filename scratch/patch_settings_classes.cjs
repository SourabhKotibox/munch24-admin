const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'contexts', 'SettingsContext.tsx');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('applyBodyClasses(style: string)')) {
  const applyBodyClassesCode = `
function applyBodyClasses(cardStyle: string, menuStyle: string) {
  const body = document.body;
  
  // Clean up old classes
  body.classList.remove('card-style-default', 'card-style-glass', 'card-style-transparent');
  body.classList.remove('menu-style-mini', 'menu-style-hover', 'menu-style-boxed', 'menu-style-soft');
  
  // Apply new classes
  if (cardStyle) body.classList.add(\`card-style-\${cardStyle}\`);
  if (menuStyle) body.classList.add(\`menu-style-\${menuStyle}\`);
}`;

  content = content.replace(
    /function applyColorTheme[\s\S]*?\n\}/,
    match => match + '\n' + applyBodyClassesCode
  );
  
  // Call in refreshSettings
  content = content.replace(
    /applyColorTheme\(mapped\.colorTheme\);/,
    'applyColorTheme(mapped.colorTheme);\n      applyBodyClasses(mapped.cardStyle, mapped.menuStyle);'
  );

  // Call in updateSettings immediately
  content = content.replace(
    /if \(patch\.colorTheme\) applyColorTheme\(patch\.colorTheme\);/,
    'if (patch.colorTheme) applyColorTheme(patch.colorTheme);\n      if (patch.cardStyle || patch.menuStyle) applyBodyClasses(patch.cardStyle || prev.cardStyle, patch.menuStyle || prev.menuStyle);'
  );
  
  // Call in SettingsProvider useState init
  content = content.replace(
    /applyColorTheme\(s\.colorTheme\);/,
    'applyColorTheme(s.colorTheme);\n        applyBodyClasses(s.cardStyle, s.menuStyle);'
  );
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Successfully injected applyBodyClasses logic.');
} else {
  console.log('applyBodyClasses already exists.');
}
