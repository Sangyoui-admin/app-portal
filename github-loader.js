/* ============================================================
   GitHub 公開リポジトリ自動読み込み
   ============================================================ */

const GH_CONFIG = {
  owner: 'Sangyoui-admin',
  ownerType: 'user',
  cacheMinutes: 5,
  slideInterval: 6000,
  maxImages: 12,
  cacheVersion: '2026-04-24-v1',
};

{
  const params = new URLSearchParams(location.search);
  if (params.get('gh_owner')) GH_CONFIG.owner = params.get('gh_owner');
  if (params.get('gh_refresh')) {
    Object.keys(localStorage)
      .filter(key => key.startsWith('gh_apps_'))
      .forEach(key => localStorage.removeItem(key));
  }
}

function _ghHeaders() {
  const headers = { Accept: 'application/vnd.github+json' };
  const token = localStorage.getItem('gh_token');
  if (token) headers.Authorization = 'Bearer ' + token;
  return headers;
}

async function _ghFetch(url) {
  try {
    const response = await fetch(url, { headers: _ghHeaders() });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function _ghText(owner, repo, path, ref) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url =
    'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + encodedPath + '?ref=' + encodeURIComponent(ref);
  const data = await _ghFetch(url);
  if (!data || Array.isArray(data) || typeof data.content !== 'string') return null;

  try {
    const content = data.content.replace(/\n/g, '');
    return decodeURIComponent(escape(atob(content)));
  } catch {
    return null;
  }
}

async function _ghDir(owner, repo, path, ref) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url =
    'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + encodedPath + '?ref=' + encodeURIComponent(ref);
  const data = await _ghFetch(url);
  return Array.isArray(data) ? data : null;
}

function _parseLines(text) {
  return (text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

const _SECTION_LINE_RE = /^\s*(?:[◆■●▶▷◇□○★☆＊※→►◉✦✧]|[-=]{2,}|[【\[])(.+?)(?:[】\]]|\s*)$/;

function _normalizeSectionName(value) {
  return value
    .replace(/^[◆■●▶▷◇□○★☆＊※→►◉✦✧【\[]+/, '')
    .replace(/[】\]：:]+$/, '')
    .trim();
}

function _parseSections(text) {
  const sections = {};
  let currentKey = null;

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const matched = line.match(_SECTION_LINE_RE);
    if (matched) {
      currentKey = _normalizeSectionName(matched[1]);
      if (currentKey) sections[currentKey] = [];
      continue;
    }

    if (currentKey) {
      sections[currentKey].push(line);
    }
  }

  return sections;
}

function _getSectionLines(sections, keys) {
  for (const key of keys) {
    if (sections[key] && sections[key].length) {
      return sections[key];
    }
  }
  return [];
}

function _parseAppInfo(infoText, overviewText) {
  const mergedSections = {
    ..._parseSections(infoText),
    ..._parseSections(overviewText),
  };

  const name = _getSectionLines(mergedSections, ['表示アプリ名', 'アプリ名', '名前', 'Name'])[0] || '';
  const category = _getSectionLines(mergedSections, ['カテゴリ', 'Category', '分類'])[0] || '社内アプリ';
  const featureLines = _getSectionLines(mergedSections, ['主な機能', '機能', 'Features'])
    .map(line => line.replace(/^[・\-*•\d.]+\s*/, '').trim())
    .filter(Boolean);
  const targetText = _getSectionLines(mergedSections, ['対象部署', '対象', '部署']).join('、');
  const targets = targetText
    ? targetText.split(/[,、，/／\n]+/).map(item => item.trim()).filter(Boolean)
    : [];
  const requirements = _getSectionLines(mergedSections, ['動作環境', '環境', 'Requirements']).join(' / ');
  const summaryLines = _getSectionLines(mergedSections, ['概要', 'About', 'Overview', '説明']);
  const overviewLines = _getSectionLines(mergedSections, ['Overview', '補足', '詳細']);

  return {
    appName: name.trim(),
    category: category.trim(),
    summary: summaryLines.join('\n'),
    shortDescription: (summaryLines[0] || '').trim(),
    features: featureLines,
    targets,
    requirements: requirements.trim() || '-',
    overview: overviewLines.join('\n').trim(),
  };
}

function _sortCardImages(entries) {
  return entries
    .filter(entry => /^Card_image\d+\.(png|jpg|jpeg|webp|gif)$/i.test(entry.name))
    .sort((a, b) => {
      const aNum = Number((a.name.match(/\d+/) || ['0'])[0]);
      const bNum = Number((b.name.match(/\d+/) || ['0'])[0]);
      return aNum - bNum;
    })
    .map(entry => entry.download_url)
    .filter(Boolean);
}

async function _readCardImageRefs(owner, repo, branch, entries) {
  const refFiles = entries
    .filter(entry => /^Card_image\d+\.txt$/i.test(entry.name))
    .sort((a, b) => {
      const aNum = Number((a.name.match(/\d+/) || ['0'])[0]);
      const bNum = Number((b.name.match(/\d+/) || ['0'])[0]);
      return aNum - bNum;
    });

  const images = [];
  for (const entry of refFiles) {
    const text = await _ghText(owner, repo, 'DLpage_info/' + entry.name, branch);
    const value = (text || '').trim();
    if (!value) continue;

    if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) {
      images.push(value);
      continue;
    }

    const normalized = value.replace(/^\.?\//, '');
    images.push(
      'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/' + normalized
    );
  }

  return images;
}

async function _fetchRelease(owner, repo) {
  const latest = await _ghFetch('https://api.github.com/repos/' + owner + '/' + repo + '/releases/latest');
  if (!latest) return null;

  return {
    version: latest.tag_name || '',
    publishedAt: (latest.published_at || latest.created_at || '').slice(0, 10),
    pageUrl: latest.html_url || '',
    zipUrl: latest.zipball_url || '',
    assets: Array.isArray(latest.assets)
      ? latest.assets.map(asset => ({
          name: asset.name,
          url: asset.browser_download_url,
        }))
      : [],
  };
}

async function _fetchAllRepos() {
  const base =
    GH_CONFIG.ownerType === 'org'
      ? 'https://api.github.com/orgs/' + GH_CONFIG.owner + '/repos'
      : 'https://api.github.com/users/' + GH_CONFIG.owner + '/repos';

  const repos = [];
  let page = 1;

  while (true) {
    const data = await _ghFetch(base + '?per_page=100&page=' + page + '&sort=updated&type=public');
    if (!data || !data.length) break;
    repos.push(...data);
    if (data.length < 100) break;
    page += 1;
  }

  return repos.filter(repo => repo && !repo.fork && !repo.archived && !repo.private);
}

async function _repoToApp(repo) {
  const owner = GH_CONFIG.owner;
  const branch = repo.default_branch || 'main';
  const infoEntries = await _ghDir(owner, repo.name, 'DLpage_info', branch);
  if (!infoEntries || !infoEntries.length) return null;

  const names = new Set(infoEntries.map(entry => entry.name.toLowerCase()));
  const hasInfoFile = names.has('application_info.txt') || names.has('overview.txt');
  if (!hasInfoFile) return null;

  const [infoText, overviewText, release] = await Promise.all([
    _ghText(owner, repo.name, 'DLpage_info/application_info.txt', branch),
    _ghText(owner, repo.name, 'DLpage_info/Overview.txt', branch),
    _fetchRelease(owner, repo.name),
  ]);

  const parsed = _parseAppInfo(infoText, overviewText);
  const inlineImages = _sortCardImages(infoEntries);
  const referencedImages = await _readCardImageRefs(owner, repo.name, branch, infoEntries);
  const images = [...referencedImages, ...inlineImages].slice(0, GH_CONFIG.maxImages);
  const repoAbout = (repo.description || '').trim();
  const summary = parsed.summary || repoAbout || '概要は未設定です。';
  const shortDescription = parsed.shortDescription || repoAbout || '詳細情報を参照してください。';
  const version = (release?.version || '').replace(/^v/i, '') || '-';
  const lastUpdated = release?.publishedAt || (repo.updated_at || '').slice(0, 10) || '-';

  const primaryDownloadUrl =
    release?.assets?.[0]?.url ||
    release?.pageUrl ||
    release?.zipUrl ||
    repo.html_url;

  const downloads = [
    {
      label: release?.version ? '最新版をダウンロード (' + release.version + ')' : 'リポジトリを開く',
      url: primaryDownloadUrl,
      primary: true,
    },
  ];

  if (release?.pageUrl && release.pageUrl !== primaryDownloadUrl) {
    downloads.push({
      label: 'リリース詳細を開く',
      url: release.pageUrl,
      primary: false,
    });
  }

  downloads.push({
    label: 'リポジトリを開く',
    url: repo.html_url,
    primary: false,
  });

  return {
    id: repo.name,
    name: parsed.appName || repo.name,
    shortDescription,
    description: parsed.overview ? summary + '\n\n' + parsed.overview : summary,
    icon: '📦',
    iconColor: '#2B78D3',
    category: parsed.category || '社内アプリ',
    version,
    lastUpdated,
    targets: parsed.targets.length ? parsed.targets : ['全部署'],
    requirements: parsed.requirements,
    features: parsed.features,
    downloads,
    images,
    repoUrl: repo.html_url,
    about: repoAbout,
    releaseTag: release?.version || '',
    _source: 'github',
  };
}

window.GH_loadApps = async function () {
  if (!GH_CONFIG.owner) return [];

  const cacheKey = 'gh_apps_' + GH_CONFIG.owner + '_' + GH_CONFIG.cacheVersion;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.ts < GH_CONFIG.cacheMinutes * 60 * 1000) {
      return cached.apps || [];
    }
  } catch {
    // ignore cache parse error
  }

  const repos = await _fetchAllRepos();
  const results = [];
  const concurrency = 4;

  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const apps = await Promise.all(batch.map(repo => _repoToApp(repo).catch(() => null)));
    results.push(...apps.filter(Boolean));
  }

  results.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), apps: results }));
  } catch {
    // ignore cache write error
  }

  return results;
};

const _slideTimers = new Map();

function _initSlide(cardEl) {
  const track = cardEl.querySelector('.card-images-track');
  if (!track) return;

  const slides = Array.from(track.querySelectorAll('.card-slide-img'));
  if (slides.length <= 1) return;

  const dots = Array.from(cardEl.querySelectorAll('.slide-dot'));
  let current = 0;

  function goTo(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + current * 100 + '%)';
    dots.forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === current));
  }

  const timerId = cardEl.dataset.id || String(Math.random());
  if (_slideTimers.has(timerId)) clearInterval(_slideTimers.get(timerId));
  _slideTimers.set(timerId, setInterval(() => goTo(current + 1), GH_CONFIG.slideInterval));
}

window.GH_initSlides = function () {
  document.querySelectorAll('.app-card').forEach(_initSlide);
};
