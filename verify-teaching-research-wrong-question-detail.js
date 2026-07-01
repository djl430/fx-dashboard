const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const start = indexHtml.indexOf('const embeddedPages =');
const end = indexHtml.indexOf('const pageRoutes =');

assert(start >= 0, 'embeddedPages declaration should exist');
assert(end > start, 'pageRoutes should follow embeddedPages');

const embeddedPages = vm.runInNewContext(`${indexHtml.slice(start, end)}\nembeddedPages;`, {});
const page = embeddedPages['teaching-research'];

assert(page, 'teaching-research embedded page should exist');
assert(page.includes('data-modal="wrong-question-detail"'), 'wrong question detail modal should exist');
assert(page.includes('data-action="open-wrong-question-detail"'), 'wrong question rows should expose a detail-open action');
assert(page.includes('openWrongQuestionDetail'), 'click handler should open wrong question detail');
assert(page.includes('renderWrongQuestionSourceRows'), 'source assignment rows should be rendered');
assert(page.includes('<strong id="wrongQuestionDetailTitle">错题详情</strong>'), 'detail modal title should stay as 错题详情');
assert(!page.includes('document.querySelector("#wrongQuestionDetailTitle").textContent = question.title'), 'opening a question should not replace the modal title');
assert(!page.includes('完整题干'), 'detail modal should not show the 完整题干 label');
assert(page.includes('question-content-section'), 'question tags and stem should share one question module');
assert(page.includes('question-tag-strip'), 'question tag values should render as an inline strip above the question');
assert(page.includes('question-tag-chip'), 'question tag values should render as compact chips');
assert(!page.includes('question-tag-heading'), 'question tag section should not have an extra heading');
assert(!page.includes('question-tag-grid'), 'question tag values should not render as separate grid cards');
assert(!page.includes('<span>${escapeHTML(label)}</span>'), 'question tag chips should not show field labels');
assert(!page.includes('<b>${escapeHTML(value)}</b>'), 'question tag chips should not use the old label/value card markup');
assert(page.includes('data-action="toggle-answer-analysis"'), 'detail modal should include an answer analysis toggle action');
assert(page.includes('答案解析'), 'detail modal should include the 答案解析 action label');
assert(page.includes('id="wrongQuestionAnswerAnalysis"'), 'detail modal should include an answer analysis content panel');
assert(page.includes('aria-expanded="false"'), 'answer analysis toggle should be collapsed by default');
assert(page.includes('renderWrongQuestionAnswerAnalysis'), 'answer analysis content should be rendered from the selected question');
assert(page.includes('toggleWrongQuestionAnswerAnalysis'), 'answer analysis toggle handler should exist');
assert(page.includes('is-answer-open'), 'answer analysis expanded state should be represented in the DOM');
assert(page.includes('answer-analysis-row'), 'answer and analysis should render as separate rows');
assert(page.includes('answer-analysis-label'), 'answer and analysis rows should include labels');
assert(page.includes('answer-analysis-answer'), 'answer row should have an independent answer content node');
assert(page.includes('answer-analysis-explanation'), 'analysis row should have an independent explanation content node');
assert(page.includes('答案</span>'), 'expanded answer analysis should show the 答案 label');
assert(page.includes('解析</span>'), 'expanded answer analysis should show the 解析 label');
assert(!page.includes('参考解析'), 'expanded answer analysis should not use a single combined 参考解析 block');
assert(page.includes('错题详情弹窗：点击高频错题后'), 'product brief should document the wrong question detail modal under 知识点考察题目');
assert(page.includes('点击查看详情，跳转单次班级作业学情页'), 'product brief should explain that 查看详情 jumps to the single class assignment learning page');
assert(page.includes('ensureWrongQuestionDetailBrief'), 'existing product brief content should be migrated without overwriting user edits');

const tagIndex = page.indexOf('id="wrongQuestionDetailTags"');
const stemIndex = page.indexOf('id="wrongQuestionDetailStem"');
const answerIndex = page.indexOf('id="wrongQuestionAnswerAnalysis"');
assert(tagIndex >= 0, 'detail modal should include the tag container');
assert(stemIndex >= 0, 'detail modal should include the stem container');
assert(answerIndex >= 0, 'detail modal should include the answer analysis container');
assert(tagIndex < stemIndex, 'question tags should appear above the stem');
assert(stemIndex < answerIndex, 'answer analysis should appear below the question stem');

const briefSectionIndex = page.indexOf('知识点考察题目');
const briefDetailIndex = page.indexOf('错题详情弹窗：点击高频错题后');
const briefJumpIndex = page.indexOf('点击查看详情，跳转单次班级作业学情页');
assert(briefSectionIndex >= 0, 'product brief should include 知识点考察题目');
assert(briefDetailIndex > briefSectionIndex, '错题详情弹窗说明 should appear after 知识点考察题目');
assert(briefJumpIndex > briefDetailIndex, '查看详情跳转说明 should stay inside the wrong question detail brief under 知识点考察题目');

[
  'question.questionType',
  'question.difficulty',
  'question.knowledge',
  'question.literacy',
  'question.correctRate',
  'question.practiceCount'
].forEach((text) => {
  assert(page.includes(text), `inline tag strip should use "${text}"`);
});

[
  '错题来源作业列表',
  '发布日期',
  '作业名',
  '学校',
  '班级',
  '老师',
  '查看详情'
].forEach((text) => {
  assert(page.includes(text), `detail modal should include "${text}"`);
});
assert(
  page.includes('aria-label="查看${escapeHTML(source.assignmentName)}的单次班级作业学情页"'),
  'source 查看详情 links should describe the single class assignment learning page destination'
);

console.log('Teaching research wrong question detail checks passed.');
