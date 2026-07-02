const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sharedPinComments = fs.readFileSync('shared/pin-comments.js', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const start = indexHtml.indexOf('const embeddedPages =');
const end = indexHtml.indexOf('const pageRoutes =');

assert(start >= 0, 'index.html should declare embeddedPages');
assert(end > start, 'pageRoutes should follow embeddedPages');

const embeddedPages = vm.runInNewContext(`${indexHtml.slice(start, end)}\nembeddedPages;`, {});
const homeworkPage = embeddedPages.homework || '';
const teachingResearchPage = embeddedPages['teaching-research'] || '';

[
  'LOCAL_PINS_KEY',
  'LOCAL_COMMENTS_KEY',
  'mergeLocalState',
  'saveLocalDraftPin',
  'saveLocalComment',
  'removeLocalPin',
  '评论已保存到本机'
].forEach((needle) => {
  assert(sharedPinComments.includes(needle), `shared pin-comments should include ${needle}`);
  assert(homeworkPage.includes(needle), `homework embedded pin-comments should include ${needle}`);
});

assert(
  sharedPinComments.includes('pins = mergeLocalState(await fetchPins())'),
  'cloud refresh should merge locally saved fallback pins'
);
assert(
  homeworkPage.includes('pins = mergeLocalState(await fetchPins())'),
  'embedded homework cloud refresh should merge locally saved fallback pins'
);
assert(
  sharedPinComments.includes('const localPin = saveLocalDraftPin(pin, v)'),
  'draft creation should save locally when cloud insert fails'
);
assert(
  homeworkPage.includes('const localPin = saveLocalDraftPin(pin, v)'),
  'embedded draft creation should save locally when cloud insert fails'
);
assert(
  sharedPinComments.includes('const msg = saveLocalComment(pin.id, v)'),
  'existing pin replies should fall back to local comments when cloud insert fails'
);
assert(
  homeworkPage.includes('const msg = saveLocalComment(pin.id, v)'),
  'embedded existing pin replies should fall back to local comments when cloud insert fails'
);

assert(
  teachingResearchPage.includes('data-review-action="comment-mode"') &&
    teachingResearchPage.includes('localStorage.setItem(keys.pins') &&
    teachingResearchPage.includes('showToast("评论已保存")'),
  'teaching research review shell should retain local comment saving'
);

console.log('Comment fallback checks passed.');
