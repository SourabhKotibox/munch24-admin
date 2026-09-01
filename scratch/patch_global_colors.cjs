const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const srcDir = path.join(__dirname, '..', 'src');
const files = walkSync(srcDir);

let changedFiles = 0;

files.forEach(filepath => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // Exact hex colors
  content = content.replace(/\[#e50914\]/g, 'primary');
  // Wait! If there is `text-[#e50914]`, replacing `[#e50914]` with `primary` makes it `text-primary`.
  
  // Tailwind red classes
  content = content.replace(/hover:bg-red-700/g, 'hover:bg-primary/90');
  content = content.replace(/hover:bg-red-600/g, 'hover:bg-primary/80');
  content = content.replace(/bg-red-500/g, 'bg-primary');
  content = content.replace(/bg-red-600/g, 'bg-primary');
  content = content.replace(/text-red-500/g, 'text-primary');
  content = content.replace(/text-red-400/g, 'text-primary');
  content = content.replace(/border-red-500/g, 'border-primary');
  
  // Shadows
  content = content.replace(/shadow-red-900\/50/g, 'shadow-primary/50');
  content = content.replace(/shadow-red-950\/40/g, 'shadow-primary/40');
  content = content.replace(/shadow-red-950\/30/g, 'shadow-primary/30');
  content = content.replace(/shadow-red-950\/20/g, 'shadow-primary/20');
  content = content.replace(/shadow-red-950\/50/g, 'shadow-primary/50');
  
  // Gradients
  content = content.replace(/from-red-600 to-red-700/g, 'from-primary to-primary/80');
  content = content.replace(/via-red-700 to-red-900/g, 'via-primary/80 to-primary/60');
  
  // In AreaChart dashboard
  content = content.replace(/stopColor="#dc2626"/g, 'stopColor="hsl(var(--primary))"');
  content = content.replace(/stroke="#dc2626"/g, 'stroke="hsl(var(--primary))"');
  
  // The only red things we don't want to replace are probably error messages (e.g. text-red-500 in a form error).
  // But since the user wants the primary color applied everywhere, and the design is predominantly red originally, 
  // replacing these is what they mean by "all req to that color".
  
  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    changedFiles++;
  }
});

console.log('Colors replaced in ' + changedFiles + ' files.');
