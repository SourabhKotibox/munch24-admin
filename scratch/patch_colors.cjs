const fs = require('fs');
const path = require('path');

const replaceColors = (filepath) => {
  let content = fs.readFileSync(filepath, 'utf8');

  // Colors
  content = content.replace(/text-red-400/g, 'text-primary');
  content = content.replace(/hover:text-red-300/g, 'hover:text-primary/80');
  content = content.replace(/hover:text-red-400/g, 'hover:text-primary');
  content = content.replace(/text-red-500/g, 'text-primary');
  content = content.replace(/text-red-200/g, 'text-primary-foreground/80');
  
  content = content.replace(/border-red-500/g, 'border-primary');
  content = content.replace(/hover:border-red-500/g, 'hover:border-primary');
  content = content.replace(/shadow-red-500\/20/g, 'shadow-primary/20');
  
  content = content.replace(/bg-red-500/g, 'bg-primary');
  content = content.replace(/bg-red-600\/20/g, 'bg-primary/20');
  content = content.replace(/bg-red-600\/15/g, 'bg-primary/15');
  content = content.replace(/bg-red-600\/10/g, 'bg-primary/10');
  content = content.replace(/bg-red-700/g, 'bg-primary/90');
  content = content.replace(/from-red-600 to-red-700/g, 'from-primary to-primary/80');
  
  fs.writeFileSync(filepath, content, 'utf8');
};

replaceColors(path.join(__dirname, '..', 'src', 'pages', 'settings.tsx'));
replaceColors(path.join(__dirname, '..', 'src', 'components', 'layout.tsx'));

console.log("Colors replaced successfully.");
