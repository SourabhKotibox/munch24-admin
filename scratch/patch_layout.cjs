const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'components', 'layout.tsx');
let content = fs.readFileSync(filepath, 'utf8');

const oldHeaderStr = `<header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border bg-sidebar/90 backdrop-blur-xl sticky top-0 z-30">`;

const newHeaderStr = `{!settings.navbarHide && (
        <header className={\`hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border z-30 \${
          settings.navbarStyle === 'transparent' ? 'bg-transparent' :
          settings.navbarStyle === 'glass' ? 'bg-sidebar/50 backdrop-blur-md sticky top-0' :
          settings.navbarStyle === 'sticky' ? 'bg-sidebar sticky top-0' :
          'bg-sidebar/90 backdrop-blur-xl sticky top-0' // default
        }\`}>`;

if (content.includes(oldHeaderStr)) {
  content = content.replace(oldHeaderStr, newHeaderStr);
  
  // We need to close the conditional block at the end of the header.
  // We'll look for the </header> tag and replace it with </header>)}
  const oldHeaderEnd = `</header>`;
  // Since there are two <header> tags (one for mobile, one for desktop), we need to replace the LAST one.
  const lastIndex = content.lastIndexOf(oldHeaderEnd);
  if (lastIndex !== -1) {
    content = content.substring(0, lastIndex) + `</header>)}` + content.substring(lastIndex + oldHeaderEnd.length);
  }
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Successfully updated layout.tsx for navbar styles.');
