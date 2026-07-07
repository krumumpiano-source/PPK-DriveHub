const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace viewport meta
  content = content.replace(
    /<meta\s+name=["']viewport["'][^>]*>/i,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">'
  );

  // Add mobile-web-app-capable if missing
  if (content.includes('apple-mobile-web-app-capable') && !content.includes('mobile-web-app-capable')) {
    content = content.replace(
      /<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']\s*\/?>/gi,
      '<meta name="apple-mobile-web-app-capable" content="yes">\n  <meta name="mobile-web-app-capable" content="yes">'
    );
  }

  // Check if apple-mobile-web-app-capable exists, if not add it before </head>
  if (!content.includes('apple-mobile-web-app-capable')) {
    const metaTags = `
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/icon.png">
</head>`;
    content = content.replace('</head>', metaTags);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.html')) {
      processFile(fullPath);
      console.log('Updated: ' + file);
    }
  }
}

traverse(dir);
console.log('Done modifying HTML files.');
