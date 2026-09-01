const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, '..', 'src', 'pages', 'influencers.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add settings to defaultModulePermissions
if (!content.includes('settings: { canView: true')) {
  content = content.replace(
    /notificationTemplates: \{ canView: true, canCreate: false, canEdit: false, canDelete: false \},/,
    'notificationTemplates: { canView: true, canCreate: false, canEdit: false, canDelete: false },\n  settings: { canView: true, canCreate: false, canEdit: false, canDelete: false },'
  );
}

// 2. Add settings to interface Influencer
if (!content.includes('settings: { canView: boolean;')) {
  content = content.replace(
    /notificationTemplates: \{ canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean \};/,
    'notificationTemplates: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };\n    settings: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };'
  );
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Successfully injected settings into influencers.tsx.');
