const fs = require('fs');
const file = fs.readFileSync('src/App.tsx', 'utf8');

let newFile = file.replace(/return \(\s*<Layout>\s*<Component \{\.\.\.rest\} \/>\s*<\/Layout>\s*\);/g, 'return <Component {...rest} />;');

const adminRoutesRegex = /(<Route path="\/dashboard".*?)(\s*\{\/\* Public streaming routes \*\/})/s;
const adminRoutesMatch = newFile.match(adminRoutesRegex);

if (adminRoutesMatch) {
  const adminRoutesStr = adminRoutesMatch[1];
  
  const adminRoutesComponent = `
function AdminRoutes() {
  return (
    <Layout>
      <Switch>
        ${adminRoutesStr.trim().replace(/\n/g, '\n        ')}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
`;

  newFile = newFile.replace(adminRoutesRegex, `      <Route>\n        <AdminRoutes />\n      </Route>\n$2`);
  newFile = newFile.replace('function Router() {', `${adminRoutesComponent}\nfunction Router() {`);
  
  fs.writeFileSync('src/App.tsx', newFile);
  console.log('App.tsx patched');
} else {
  console.log('Admin routes not found');
}
