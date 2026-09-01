const fs = require('fs');
const path = require('path');

function replaceInFile(filepath, replacer) {
  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log('Updated', path.basename(filepath));
  }
}

const dir = path.join(__dirname, '..', 'src', 'pages');

// dashboard.tsx
replaceInFile(path.join(dir, 'dashboard.tsx'), content => {
  if (!content.includes('useSettings')) {
    content = content.replace('import { \n', 'import { useSettings } from "@/contexts/SettingsContext";\nimport { \n');
  }
  content = content.replace('const { data: user } = useGetMe();', 'const { settings } = useSettings();\n  const formatCurrency = (val) => {\n    const num = Number(val && typeof val === "string" ? val.replace(/[^0-9.-]+/g,"") : val) || 0;\n    return settings.currencyPosition === "before" ? `${settings.currencySymbol}${num.toFixed(settings.decimalPlaces)}` : `${num.toFixed(settings.decimalPlaces)} ${settings.currencySymbol}`;\n  };\n  const { data: user } = useGetMe();');
  
  content = content.replace(/dashboardStats\?\.subscriptionRevenue \|\| "₱0\.00"/g, 'dashboardStats?.subscriptionRevenue ? formatCurrency(dashboardStats.subscriptionRevenue) : formatCurrency(0)');
  content = content.replace(/dashboardStats\?\.rentRevenue \|\| "₱0\.00"/g, 'dashboardStats?.rentRevenue ? formatCurrency(dashboardStats.rentRevenue) : formatCurrency(0)');
  content = content.replace(/dashboardStats\?\.totalRevenue \|\| "₱0\.00"/g, 'dashboardStats?.totalRevenue ? formatCurrency(dashboardStats.totalRevenue) : formatCurrency(0)');
  
  return content;
});

// subscription-form.tsx
replaceInFile(path.join(dir, 'subscription-form.tsx'), content => {
  if (!content.includes('useSettings')) {
    content = content.replace('import { useForm }', 'import { useSettings } from "@/contexts/SettingsContext";\nimport { useForm }');
  }
  if (!content.includes('const { settings } = useSettings();')) {
    content = content.replace('export default function SubscriptionForm({ isEdit = false, id }: { isEdit?: boolean; id?: string }) {\n', 'export default function SubscriptionForm({ isEdit = false, id }: { isEdit?: boolean; id?: string }) {\n  const { settings } = useSettings();\n');
  }
  
  content = content.replace(/Price \(\$\)/g, 'Price ({settings.currencySymbol})');
  content = content.replace(/Discount \(\$\)/g, 'Discount ({settings.currencySymbol})');
  content = content.replace(/Coupon Discount \(\$\)/g, 'Coupon Discount ({settings.currencySymbol})');
  content = content.replace(/Tax \(\$\)/g, 'Tax ({settings.currencySymbol})');
  content = content.replace(/Total Amount \(\$\)/g, 'Total Amount ({settings.currencySymbol})');
  
  return content;
});

// subscriptions-list.tsx
replaceInFile(path.join(dir, 'subscriptions-list.tsx'), content => {
  if (!content.includes('useSettings')) {
    content = content.replace('import { useGetSubscriptions', 'import { useSettings } from "@/contexts/SettingsContext";\nimport { useGetSubscriptions');
  }
  if (!content.includes('const { settings } = useSettings();')) {
    content = content.replace('const [page, setPage] = useState(1);', 'const { settings } = useSettings();\n  const [page, setPage] = useState(1);');
  }
  
  content = content.replace(/const fmt = \(n: number\) => `\$\{n\.toFixed\(2\)\}`;/g, 'const fmt = (n: number) => settings.currencyPosition === "before" ? `${settings.currencySymbol}${n.toFixed(settings.decimalPlaces)}` : `${n.toFixed(settings.decimalPlaces)} ${settings.currencySymbol}`;');
  
  return content;
});

// user-profile.tsx
replaceInFile(path.join(dir, 'user-profile.tsx'), content => {
  if (!content.includes('useSettings')) {
    content = content.replace('import { Link }', 'import { useSettings } from "@/contexts/SettingsContext";\nimport { Link }');
  }
  if (!content.includes('const { settings } = useSettings();')) {
    content = content.replace('export default function UserProfile() {', 'export default function UserProfile() {\n  const { settings } = useSettings();');
  }
  content = content.replace(/\$9\.99 \/ mo/g, '{settings.currencySymbol}9.99 / mo');
  return content;
});

// SubscriptionPlansModal.tsx
const modalPath = path.join(__dirname, '..', 'src', 'components', 'SubscriptionPlansModal.tsx');
if (fs.existsSync(modalPath)) {
  replaceInFile(modalPath, content => {
    if (!content.includes('useSettings')) {
      content = content.replace('import { X, Check }', 'import { useSettings } from "@/contexts/SettingsContext";\nimport { X, Check }');
    }
    if (!content.includes('const { settings } = useSettings();')) {
      content = content.replace('export default function SubscriptionPlansModal({ isOpen, onClose }: SubscriptionPlansModalProps) {', 'export default function SubscriptionPlansModal({ isOpen, onClose }: SubscriptionPlansModalProps) {\n  const { settings } = useSettings();');
    }
    content = content.replace(/<span className="text-3xl font-black text-white">\$\{plan.price\}<\/span>/g, '<span className="text-3xl font-black text-white">{settings.currencyPosition === "before" ? settings.currencySymbol + plan.price : plan.price + " " + settings.currencySymbol}</span>');
    content = content.replace(/<span className="text-xl font-bold text-white">\$\{plan.price\}<\/span>/g, '<span className="text-xl font-bold text-white">{settings.currencyPosition === "before" ? settings.currencySymbol + plan.price : plan.price + " " + settings.currencySymbol}</span>');
    return content;
  });
}
