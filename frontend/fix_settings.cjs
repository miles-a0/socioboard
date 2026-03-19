const fs = require('fs');
const filePath = 'c:/Users/Admin/socioboard-google/frontend/src/pages/Settings.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Insert getAuthUrl at the top of the component
if (!content.includes('const getAuthUrl')) {
  content = content.replace(/const Settings: React\.FC = \(\) => \{/, `const Settings: React.FC = () => {
  const getAuthUrl = (provider: string) => {
    const token = localStorage.getItem('token');
    const baseUrl = window.location.hostname.includes('ngrok') ? 'https://' + window.location.hostname + '/api' : 'http://localhost:8000/api';
    return \`\${baseUrl}/auth/\${provider}/login?token=\${token}\${provider === 'twitter' ? '&t=' + Date.now() : ''}\`;
  };`);
}

// Ensure the regex correctly handles the syntax errors that I introduced.
content = content.replace(/onClick=\{\(\) => \{[\s\S]*?window\.location\.href = [^;]+;[^\}]*\}\}/g, (m) => {
  if (m.includes('/auth/facebook/')) return "onClick={() => window.location.href = getAuthUrl('facebook')}";
  if (m.includes('/auth/twitter/')) return "onClick={() => window.location.href = getAuthUrl('twitter')}";
  if (m.includes('/auth/linkedin/')) return "onClick={() => window.location.href = getAuthUrl('linkedin')}";
  if (m.includes('/auth/pinterest/')) return "onClick={() => window.location.href = getAuthUrl('pinterest')}";
  if (m.includes('/auth/snapchat/')) return "onClick={() => window.location.href = getAuthUrl('snapchat')}";
  return m;
});

fs.writeFileSync(filePath, content);
console.log("Settings.tsx fixed successfully!");
