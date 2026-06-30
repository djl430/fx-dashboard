const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const indexPath = path.join(root, 'index.html');
const schoolPageName = 'school-smart-homework-cockpit-regional-style-pin-comments-review-20260622.html';
const schoolPagePath = path.join(root, schoolPageName);
const sharedCommentsPath = path.join(root, 'shared', 'pin-comments.js');
const source = fs.readFileSync(indexPath, 'utf8');

function extractEmbeddedPage(html, key) {
  const markers = [`${key}: `, `"${key}": `];
  const marker = markers.find((candidate) => html.includes(candidate));
  if (!marker) throw new Error(`Missing embedded page "${key}"`);

  const markerStart = html.indexOf(marker);
  const quoteStart = html.indexOf('"', markerStart + marker.length);
  if (quoteStart === -1) throw new Error(`Missing embedded page string "${key}"`);

  let escaped = false;
  for (let index = quoteStart + 1; index < html.length; index += 1) {
    const char = html[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      return vm.runInNewContext(`(${html.slice(quoteStart, index + 1)})`);
    }
  }
  throw new Error(`Unterminated embedded page "${key}"`);
}

const homeworkHtml = extractEmbeddedPage(source, 'homework');

if (homeworkHtml.includes('file:///')) {
  throw new Error('Region homework page still contains a local file:// school cockpit URL');
}

if (!homeworkHtml.includes(`const SCHOOL_COCKPIT_URL = '${schoolPageName}';`)) {
  throw new Error('Region homework page does not use the demo-final relative school cockpit URL');
}

if (!homeworkHtml.includes('function getSchoolCockpitBaseUrl()')) {
  throw new Error('Region homework page does not resolve school cockpit URLs from the parent page URL');
}

if (!homeworkHtml.includes('function openSchoolCockpitUrl(url)') || !homeworkHtml.includes('window.top.location.href = url')) {
  throw new Error('Region homework page does not navigate school links in the top-level page');
}

if (!fs.existsSync(schoolPagePath)) {
  throw new Error(`Missing published school homework cockpit page in demo-final: ${schoolPageName}`);
}

const schoolPage = fs.readFileSync(schoolPagePath, 'utf8');

if (schoolPage.includes('./demo-final/index.html')) {
  throw new Error('Published school homework cockpit back button still points to ./demo-final/index.html');
}

if (!schoolPage.includes("const fallbackUrl = './index.html';")) {
  throw new Error('Published school homework cockpit back button does not point back to ./index.html');
}

if (schoolPage.includes('file:///')) {
  throw new Error('Published school homework cockpit contains local file:// URLs');
}

if (schoolPage.includes('./shared/pin-comments.js') && !fs.existsSync(sharedCommentsPath)) {
  throw new Error('Published school homework cockpit references ./shared/pin-comments.js, but demo-final/shared/pin-comments.js is missing');
}

console.log('Verified GitHub Pages-safe school homework cockpit links.');
