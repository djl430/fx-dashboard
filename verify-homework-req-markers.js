const fs = require('fs');
const path = require('path');
const vm = require('vm');

const indexPath = path.join(__dirname, 'index.html');
const regionMapImagePath = path.join(__dirname, 'images', 'chaoyang-school-heatmap-detail.png');
const source = fs.readFileSync(indexPath, 'utf8');

function extractEmbeddedPage(html, key) {
  const marker = `${key}: `;
  const markerStart = html.indexOf(marker);
  if (markerStart < 0) throw new Error(`Missing embedded page "${key}"`);

  const quoteStart = html.indexOf('"', markerStart + marker.length);
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

function extractAutoAnnotations(homeworkHtml) {
  const marker = 'const autoAnnotations = ';
  const start = homeworkHtml.indexOf(marker);
  if (start < 0) throw new Error('Missing autoAnnotations');

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = start + marker.length; index < homeworkHtml.length; index += 1) {
    const char = homeworkHtml[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return vm.runInNewContext(`(${homeworkHtml.slice(start + marker.length, index + 1)})`);
      }
    }
  }
  throw new Error('Unterminated autoAnnotations array');
}

function extractDefaultBrief(homeworkHtml) {
  const marker = 'const defaultBrief = ';
  const start = homeworkHtml.indexOf(marker);
  if (start < 0) throw new Error('Missing defaultBrief');

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  const arrayStart = start + marker.length;
  for (let index = arrayStart; index < homeworkHtml.length; index += 1) {
    const char = homeworkHtml[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        const lines = vm.runInNewContext(`(${homeworkHtml.slice(arrayStart, index + 1)})`);
        return lines.join('\n');
      }
    }
  }
  throw new Error('Unterminated defaultBrief array');
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectNear(actual, expected, label) {
  const delta = Math.abs(Number(actual) - Number(expected));
  if (delta > 0.0001) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function expectArrayEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label}: expected ${expectedJson}, got ${actualJson}`);
  }
}

const homeworkHtml = extractEmbeddedPage(source, 'homework');
const defaultBrief = extractDefaultBrief(homeworkHtml);
const annotations = extractAutoAnnotations(homeworkHtml);

const expectedDefaultBrief = [
  '驾驶舱的入口',
  '• 独立的链接',
  '',
  '驾驶舱权限控制',
  '• 需手机号+验证码登录，登录参考龙老师驾驶舱的交互',
  '• 且有区域驾驶舱权限',
  '',
  '',
  '数据口径说明',
  '• 所有数据口径见表格：https://shimo.zhenguanyu.com/sheets/q5jy5blvQmgYTpRo/R5dhs/ 《区域作业驾驶舱数据指标》',
].join('\n');

expectEqual(defaultBrief, expectedDefaultBrief, 'global default brief');

const expected = [
  ['auto-cockpit-title', '驾驶舱标题', '.dashboard-title', 1.02, 0.05, [
    '文案：区域名+智慧作业驾驶舱',
  ]],
  ['auto-date-filter', '统计周期与日期范围', '[data-section="date-filter"]', 0.91, 0.72, [
    '支持 7 天、30 天、90 天三个快捷周期，并展示当前统计起止日期。',
    '默认选中 7 天',
    '复用日期组件自定义时间范围',
    '异常情况：若选中周期内暂无数据，应保留页面结构并展示空态或兜底文案。',
  ]],
  ['auto-core-metrics', '顶部核心指标', '[data-section="core-metrics"]', 0.55, 0.16, [
    '数据项：展示使用学校、使用老师数、使用学生数、老师作业数、作业提交人次',
    '环比：增加环比数据',
    '异常情况：应区分无数据和真实为 0，无数据用 -- 占位',
  ]],
  ['auto-fullscreen', '全屏操作', '.top-action', 1.08, 0.42, [
    '点击全屏/退出，切换全屏和非全屏状态',
  ]],
  ['auto-daily-users', '每日使用人数', '[data-chart="student-teacher-trend"]', 0.5, 0.09, [
    '按天展示使用学生数、使用老师数',
    '可切换学生、老师，默认选中学生',
    'tooltip：人数、日期、指标名',
    '无数据时，需要展示空状态，提示文案“暂无数据”',
  ]],
  ['auto-homework-trend', '每日作业数', '[data-chart="homework-trend"]', 0.5, 0.09, [
    '按天展示老师作业数',
    'tooltip：作业数、日期、指标名',
    '无数据时，需要展示空状态，提示文案“暂无数据”',
  ]],
  ['auto-grade-distribution', '作业数分布-年级', '[data-panel="homework-distribution-grade"]', 0.5, 0.4, [
    '按年级汇总周期内老师作业数，并展示份数和占比',
    '环图中心显示总作业数，外层分段颜色与图例一致',
    'hover 环图分段时展示年级、份数和占比',
  ]],
  ['auto-subject-distribution', '作业数分布-学科', '[data-panel="homework-distribution-subject"]', 0.52, 0.4, [
    '按学科汇总周期内作业份数，并展示所有学科占比',
    'hover 环图分段时展示学科、份数和占比',
  ]],
  ['auto-region-map', '区域学校热力地图', '[data-section="region-map"]', 0.33, 0.58, [
    '地图点位代表学校，点位大小表达作业数，颜色表达提交率分层',
    '交互：点击学校标签或榜单学校名应进入单校驾驶舱',
    '单校数据：详见下图',
  ]],
  ['auto-live-feed', '实时动态', '[data-section="live-feed"]', 0.5, 0.76, [
    '滚动展示学校内最新发生的教师和学生作业相关事件',
    '详细事件说明见文档 https://shimo.zhenguanyu.com/sheets/q5jy5blvQmgYTpRo/R5dhs/ 《区域作业驾驶舱数据指标》',
    '动态事件时间范围：最近24小时内发生的事件',
    '异常情况：滚动完一轮，如果没有最新动态生成，则循环播放已有动态',
  ]],
  ['auto-active-school-rank', '活跃学校', '[data-section="active-school-top7"]', 0.44, 0.32, [
    '学生活跃率前7的学校',
  ]],
  ['auto-focus-school-rank', '需关注学校', '[data-section="inactive-school-top7"]', 0.52, 0.36, [
    '作业数倒数前7的学校',
  ]],
  ['auto-submit-rate', '提交率分布', '[data-panel="submit-rate-distribution"]', 0.46, 0.13, [
    '面板标题右侧展示区域提交率均值，底部图例展示各分层学校数，柱状图为单个学校，且按提交率降序排列',
    '提交率分层规则：绿色表示提交率大于等于90%，黄色表示70%~90%，红色标识提交率小于70%',
  ]],
  ['auto-review-rate', '批改率分布', '[data-panel="review-rate-distribution"]', 0.55, 0.23, [
    '面板标题右侧展示区域批改率均值，底部图例展示各分层学校数，柱状图为单个学校，且按批改率降序排列',
    '提交率分层规则：绿色表示批改率大于等于90%，黄色表示70%~90%，红色标识批改率率小于70%',
  ]],
  ['auto-teacher-function-active', '老师功能活跃', '[data-panel="teacher-function-active"]', 0.41, 0.22, [
    '展示统计周期内的组题组卷量、AI 组题次数（包括AI生成题目次数）、AI 批改次数、学情分析次数、讲评次数和 AI 精准练次数',
    '异常情况：应区分无数据和真实为 0，无数据用 -- 占位',
  ]],
  ['auto-student-function-active', '学生功能活跃', '[data-panel="student-function-active"]', 0.51, 0.23, [
    '展示统计周期内统计 AI 讲题次数、讲解视频观看次数（题目+知识点讲解）、收集错题数和错题打印次数',
    '异常情况：应区分无数据和真实为 0，无数据用 -- 占位',
  ]],
];

expectEqual(annotations.length, expected.length, 'annotation count');

expected.forEach(([id, title, selector, xPct, yPct, points], index) => {
  const item = annotations[index];
  expectEqual(item.id, id, `annotation ${index + 1} id`);
  expectEqual(item.title, title, `annotation ${index + 1} title`);
  expectEqual(item.selector, selector, `annotation ${index + 1} selector`);
  expectNear(item.xPct, xPct, `annotation ${index + 1} xPct`);
  expectNear(item.yPct, yPct, `annotation ${index + 1} yPct`);
  expectArrayEqual(item.points, points, `annotation ${index + 1} points`);
});

const regionMap = annotations.find((item) => item.id === 'auto-region-map');
expectEqual(regionMap.image && regionMap.image.src, 'images/chaoyang-school-heatmap-detail.png', 'region map image src');
expectEqual(regionMap.image && regionMap.image.alt, '北京市朝阳区花家地实验小学单校数据示例', 'region map image alt');

if (!fs.existsSync(regionMapImagePath)) {
  throw new Error('Missing region map detail image asset');
}

const image = fs.readFileSync(regionMapImagePath);
expectEqual(image.readUInt32BE(16), 432, 'region map image width');
expectEqual(image.readUInt32BE(20), 185, 'region map image height');

if (!homeworkHtml.includes('review-brief-image')) {
  throw new Error('Missing product brief image renderer');
}

if (!homeworkHtml.includes('[[brief-image:images/chaoyang-school-heatmap-detail.png|北京市朝阳区花家地实验小学单校数据示例]]')) {
  throw new Error('Missing region map image marker in structured brief builder');
}

if (!homeworkHtml.includes("const autoAnnotationVersion = '2026-06-29-region-map-image-v1';")) {
  throw new Error('autoAnnotationVersion was not bumped for the 16-marker layout');
}

if (!homeworkHtml.includes("const briefStructureVersion = '2026-06-29-region-map-image-v1';")) {
  throw new Error('briefStructureVersion was not bumped for the 16-marker layout');
}

console.log(`Verified ${annotations.length} homework requirement markers.`);
