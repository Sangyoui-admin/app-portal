/* ============================================================
   GitHub 自動アプリカード取得システム v2
   ============================================================

   【設定方法】
   下の GH_CONFIG の owner にGitHubユーザー名またはOrg名を入力してください。

   【リポジトリ側の準備】
   各アプリのリポジトリに以下のファイルを配置してください:

     DLpage_info/
       application_info.txt  ← アプリ情報（下記フォーマット）
       Card_image1.png       ← スライド表示する画像 (連番で複数可)
       Card_image2.png       ← 任意 (Card_image1.txt に URL を書いても可)

   【application_info.txt のフォーマット例】
   ─────────────────────────────────────────────
   ◆ アプリ名
   メール送信一括君 NEO

   ◆ カテゴリ
   通信・連絡

   ◆ 概要
   本ツールは毎月の定期連絡メールを効率化するために作成しました。

   ◆ 主な機能
   ・月次連絡メールの一括作成
   ・送信者名の任意変更

   ◆ 対象部署
   営業部、管理部

   ◆ 動作環境
   Python 3.10以上 / Microsoft Excel 2019以上
   ─────────────────────────────────────────────
   ※ セクション区切りは ◆ ■ ● ▶ 【】 など何でも使用可能です
   ※ overview.txt という名前でも認識されます
   ============================================================ */

const GH_CONFIG = {
  owner:         'YOUR_GITHUB_USERNAME_OR_ORG', // ← ここを変更
  ownerType:     'user',    // 'user' または 'org'
  cacheMinutes:  60,        // ブラウザキャッシュの保持時間 (分)
  slideInterval: 6000,      // スライド切り替え間隔 (ミリ秒)
  maxImages:     8,         // カードあたりの最大画像枚数
};

/* URL パラメータで設定を上書き可能
   ?gh_owner=xxx でowner変更
   ?gh_refresh=1 でキャッシュ削除 */
{
  const p = new URLSearchParams(location.search);
  if (p.get('gh_owner'))   GH_CONFIG.owner = p.get('gh_owner');
  if (p.get('gh_refresh')) localStorage.removeItem('gh_apps_' + GH_CONFIG.owner);
}

/* ============================================================
   低レベルフェッチ
   ============================================================ */
async function _ghFetch(url) {
  try {
    const headers = { 'Accept': 'application/vnd.github+json' };
    const token = localStorage.getItem('gh_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function _ghRaw(owner, repo, branch, path) {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/' + path
    );
    if (!res.ok) return null;
    return res.text();
  } catch { return null; }
}

async function _headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch { return false; }
}

/* ============================================================
   application_info.txt / Overview.txt パーサー
   ◆ ■ ● ▶ ▷ 【】 [] など各種セクションマーカーに対応
   ============================================================ */
const _MARKER_RE  = /^([◆■●▶▷◇□○★☆＊※→►◉✦✧]+)\s*(.+?)(?:\s*[◆■●▶▷◇□○★☆＊※→►◉✦✧]*)$/;
const _BRACKET_RE = /^[【\[](.*?)[】\]]/;

function _parseAppInfo(text) {
  const sections = {};
  let cur = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    let key = null;
    const m1 = line.match(_BRACKET_RE);
    if (m1) {
      key = m1[1].trim();
    } else {
      const m2 = line.match(_MARKER_RE);
      if (m2) key = m2[2].trim();
    }

    if (key) {
      cur = key;
      sections[cur] = [];
    } else if (cur) {
      sections[cur].push(line);
    }
  }

  const get = (...keys) => keys.flatMap(k => sections[k] || []);

  const featureLines = get('主な機能', '機能', 'Features')
    .map(l => l.replace(/^[・\-\*•]\s*/, '').trim())
    .filter(Boolean);

  const targetRaw = get('対象部署', '対象', '部署').join('、');
  const targets = targetRaw
    ? targetRaw.split(/[,、，\n]+/).map(s => s.trim()).filter(Boolean)
    : [];

  const summaryLines = get('概要', 'Overview', '説明');
  const summary = summaryLines.join('\n');
  const firstLine = summaryLines.find(l => l.trim()) || '';

  return {
    appName:          (get('アプリ名', '名前', 'Name')[0] || '').trim(),
    category:         (get('カテゴリ', 'Category', '分類')[0] || 'その他').trim(),
    summary,
    shortDescription: firstLine,
    features:         featureLines,
    targets,
    requirements:     get('動作環境', '環境', 'Requirements').join(' / ') || '-',
  };
}

/* ============================================================
   画像ソース取得
   Card_image1.txt, Card_image2.txt ... を順番に試す
   ============================================================ */
async function _fetchImageSources(owner, repo, branch) {
  const images = [];

  for (let i = 1; i <= GH_CONFIG.maxImages; i++) {
    // .txt を試す
    const txtContent = await _ghRaw(owner, repo, branch, 'DLpage_info/Card_image' + i + '.txt');
    if (txtContent !== null) {
      const v = txtContent.trim();
      if (!v) continue;
      if (v.startsWith('http') || v.startsWith('data:image')) {
        images.push(v);
      } else {
        images.push('https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/' + v);
      }
      continue;
    }

    // .png を直接試す
    const pngUrl = 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/DLpage_info/Card_image' + i + '.png';
    if (await _headOk(pngUrl)) { images.push(pngUrl); continue; }

    // .jpg を直接試す
    const jpgUrl = 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + branch + '/DLpage_info/Card_image' + i + '.jpg';
    if (await _headOk(jpgUrl)) { images.push(jpgUrl); continue; }

    break; // 見つからなければ終了
  }

  return images;
}

/* ============================================================
   最新リリース情報の取得
   ============================================================ */
async function _fetchRelease(owner, repo) {
  const data = await _ghFetch(
    'https://api.github.com/repos/' + owner + '/' + repo + '/releases/latest'
  );
  if (!data) return null;
  return {
    version:     data.tag_name || null,
    publishedAt: (data.published_at || '').slice(0, 10),
    releaseUrl:  data.html_url,
    assets:      (data.assets || []).map(a => ({ name: a.name, url: a.browser_download_url })),
  };
}

/* ============================================================
   リポジトリ → アプリデータ変換
   ============================================================ */
async function _repoToApp(repo) {
  const { owner } = GH_CONFIG;
  const branch = repo.default_branch || 'main';

  // application_info.txt を優先、なければ Overview.txt を試す
  let infoText = await _ghRaw(owner, repo.name, branch, 'DLpage_info/application_info.txt');
  if (infoText === null) {
    infoText = await _ghRaw(owner, repo.name, branch, 'DLpage_info/Overview.txt');
  }
  if (infoText === null) return null; // DLpage_info がないリポジトリはスキップ

  const ov = _parseAppInfo(infoText);

  const [images, release] = await Promise.all([
    _fetchImageSources(owner, repo.name, branch),
    _fetchRelease(owner, repo.name),
  ]);

  const version     = release?.version?.replace(/^v/, '') || '-';
  const lastUpdated = release?.publishedAt || (repo.updated_at || '').slice(0, 10) || '-';
  const appName     = ov.appName || repo.name;

  // GitHub の About 欄をフォールバックの概要として利用
  const repoAbout    = repo.description || '';
  const shortDesc    = ov.shortDescription || repoAbout;
  const fullDesc     = ov.summary || repoAbout;

  const downloads = [];
  if (release?.assets?.length > 0) {
    downloads.push({
      label:   '最新版をダウンロード (' + release.version + ')',
      url:     release.assets[0].url,
      primary: true,
    });
    release.assets.slice(1).forEach(a => {
      downloads.push({ label: a.name, url: a.url, primary: false });
    });
  } else if (release?.releaseUrl) {
    downloads.push({ label: 'リリースページを開く', url: release.releaseUrl, primary: true });
  } else {
    downloads.push({ label: 'リポジトリを開く', url: repo.html_url, primary: true });
  }

  return {
    id:               repo.name,
    name:             appName,
    shortDescription: shortDesc,
    description:      fullDesc,
    icon:             '📦',
    iconColor:        '#607D8B',
    category:         ov.category,
    version,
    lastUpdated,
    targets:          ov.targets,
    requirements:     ov.requirements,
    features:         ov.features,
    downloads,
    images,
    repoUrl:          repo.html_url,
    _source:          'github',
  };
}

/* ============================================================
   全リポジトリ一覧取得 (フォーク・アーカイブ除外)
   ============================================================ */
async function _fetchAllRepos() {
  const { owner, ownerType } = GH_CONFIG;
  const base = ownerType === 'org'
    ? 'https://api.github.com/orgs/' + owner + '/repos'
    : 'https://api.github.com/users/' + owner + '/repos';

  const repos = [];
  let page = 1;
  while (true) {
    const data = await _ghFetch(base + '?per_page=100&page=' + page + '&type=public');
    if (!data || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return repos.filter(r => !r.fork && !r.archived);
}

/* ============================================================
   キャッシュ付きメイン処理 (グローバル公開)
   ============================================================ */
window.GH_loadApps = async function () {
  if (!GH_CONFIG.owner || GH_CONFIG.owner === 'YOUR_GITHUB_USERNAME_OR_ORG') {
    console.warn('[GH Loader] github-loader.js の GH_CONFIG.owner を設定してください');
    return [];
  }

  const CACHE_KEY = 'gh_apps_' + GH_CONFIG.owner;

  // キャッシュ確認
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < GH_CONFIG.cacheMinutes * 60000) {
      console.log('[GH Loader] キャッシュから ' + cached.apps.length + ' 件読み込み');
      return cached.apps;
    }
  } catch { /* ignore */ }

  const repos = await _fetchAllRepos();
  console.log('[GH Loader] ' + repos.length + ' 件のリポジトリを検出');

  const results = [];
  const CONCURRENCY = 5; // 同時処理数 (レート制限対策)
  for (let i = 0; i < repos.length; i += CONCURRENCY) {
    const batch = repos.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map(r => _repoToApp(r).catch(() => null)));
    results.push(...settled.filter(Boolean));
  }

  console.log('[GH Loader] ' + results.length + ' 件のアプリを取得');

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), apps: results }));
  } catch { /* ignore */ }

  return results;
};

/* ============================================================
   スライドショー初期化 (グローバル公開)
   ============================================================ */
const _slideTimers = new Map();

function _initSlide(cardEl) {
  const track = cardEl.querySelector('.card-images-track');
  if (!track) return;
  const slides = Array.from(track.querySelectorAll('.card-slide-img'));
  if (slides.length <= 1) return;

  const dots = Array.from(cardEl.querySelectorAll('.slide-dot'));
  let cur = 0;

  function goTo(idx) {
    cur = (idx + slides.length) % slides.length;
    track.style.transform = 'translateX(-' + (cur * 100) + '%)';
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }

  const id = cardEl.dataset.id || Math.random();
  if (_slideTimers.has(id)) clearInterval(_slideTimers.get(id));
  _slideTimers.set(id, setInterval(() => goTo(cur + 1), GH_CONFIG.slideInterval));
}

window.GH_initSlides = function () {
  document.querySelectorAll('.app-card').forEach(_initSlide);
};
