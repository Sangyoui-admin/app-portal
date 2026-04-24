/**
 * アプリケーション一覧データ
 *
 * 新しいアプリを追加するには、このファイルの apps 配列に
 * 下記のオブジェクト構造でエントリを追加してください。
 *
 * icon      : 絵文字アイコン（画像がない場合）
 * iconColor : アイコン背景色
 * iconImage : 画像を使う場合は "./icons/app-id.png" のように指定（任意）
 * downloads : primary: true が「最新版」ボタンになります
 */
const apps = [
  {
    id: "mail-sender-neo",
    name: "メール送信一括君 NEO",
    shortDescription: "定期連絡メールの作成・送信を効率化するツール",
    description:
      "本ツールは毎月の企業やお先生への定期連絡用メール作成の際、多数のメール作成に工数を割いているメンバーからの要望によりその業務効率を改善するために作成されました。\n\n数が多い複数の宛先へのメール文章、または送信作業の際に活用が可能です。最新版より送信者の表記名を任意に変更することが可能となりました。",
    icon: "✉️",
    iconColor: "#FF6B35",
    // iconImage: "./icons/mail-sender-neo.png",
    category: "通信・連絡",
    version: "2.0.0",
    lastUpdated: "2024-10-28",
    targets: ["営業部", "管理部"],
    requirements: "Python 3.10 以上 / Microsoft Excel 2019",
    features: [
      "月に一度の取引先担当者との定期連絡メール作成",
      "Pardot などのマーケティングツールで送信できない対象への複数メール配信",
      "送信者の表記名を任意に変更可能（v2.0 〜）"
    ],
    downloads: [
      { label: "最新版をダウンロード (v2.0)", url: "#", primary: true },
      { label: "旧バージョン (v1.x) をダウンロード",  url: "#", primary: false }
    ]
  },
  {
    id: "pdf-editor",
    name: "PDFファイル編集君",
    shortDescription: "PDF の結合・分割・ページ抽出を GUI 操作で",
    description:
      "複数の PDF ファイルを結合したり、特定ページを切り出したりする作業を GUI 操作で直感的に行えるツールです。\n\nAdobe Acrobat が不要で、社内の誰でも使えるよう設計されています。透かし文字やページ番号の挿入にも対応しています。",
    icon: "📄",
    iconColor: "#E74C3C",
    category: "書類・レポート",
    version: "1.2.0",
    lastUpdated: "2024-09-15",
    targets: ["全部署"],
    requirements: "Python 3.8 以上",
    features: [
      "複数 PDF の結合（ドラッグ＆ドロップ対応）",
      "ページ単位での分割・抽出",
      "透かし文字の追加",
      "ページ番号の挿入"
    ],
    downloads: [
      { label: "ダウンロード (v1.2)", url: "#", primary: true }
    ]
  },
  {
    id: "attendance-tool",
    name: "勤怠管理ツール",
    shortDescription: "打刻・申請作業を Excel ベースで簡略化",
    description:
      "毎月の勤怠入力・申請作業を効率化するための Excel マクロツールです。\n\n残業申請・有給申請をワンクリックで行え、月次レポートも自動生成されます。",
    icon: "🕐",
    iconColor: "#3498DB",
    category: "業務効率化",
    version: "3.1.0",
    lastUpdated: "2024-11-01",
    targets: ["全部署"],
    requirements: "Microsoft Excel 2016 以上 / マクロの有効化が必要",
    features: [
      "打刻データの自動集計",
      "残業・有給申請のワンクリック提出",
      "月次レポートの自動生成",
      "勤務時間の可視化グラフ"
    ],
    downloads: [
      { label: "ダウンロード (v3.1)", url: "#", primary: true }
    ]
  },
  {
    id: "workflow-app",
    name: "申請ワークフロー",
    shortDescription: "各種申請フローをブラウザだけで完結",
    description:
      "稟議・備品購入・交通費申請など各種申請をブラウザ上で完結させる Web アプリケーションです。\n\n承認フローも電子化されており、ペーパーレスを実現します。申請状況はリアルタイムで確認可能です。",
    icon: "📋",
    iconColor: "#9B59B6",
    category: "業務効率化",
    version: "2.3.1",
    lastUpdated: "2024-10-10",
    targets: ["全部署", "管理部"],
    requirements: "最新の Web ブラウザ（Chrome / Edge 推奨）",
    features: [
      "稟議・備品購入・交通費など多種類の申請に対応",
      "電子承認フロー（多段階承認に対応）",
      "申請状況のリアルタイム確認",
      "申請履歴の検索・エクスポート"
    ],
    downloads: [
      { label: "Web アプリを開く", url: "#", primary: true }
    ]
  },
  {
    id: "report-generator",
    name: "週報・月報ジェネレーター",
    shortDescription: "業務記録から定型フォーマットの報告書を自動生成",
    description:
      "Excel の業務記録から週報・月報を自動生成するツールです。\n\nフォーマットのカスタマイズにも対応しており、各部署のルールに合わせた出力が可能です。Word / PDF 形式でのエクスポートに対応しています。",
    icon: "📊",
    iconColor: "#27AE60",
    category: "書類・レポート",
    version: "1.0.3",
    lastUpdated: "2024-08-20",
    targets: ["営業部", "開発部"],
    requirements: "Python 3.8 以上 / Microsoft Excel 2016 以上",
    features: [
      "Excel データから週報・月報を自動生成",
      "テンプレートのカスタマイズ対応",
      "Word / PDF 形式での出力",
      "複数メンバー分の一括生成"
    ],
    downloads: [
      { label: "ダウンロード (v1.0.3)", url: "#", primary: true }
    ]
  },
  {
    id: "data-checker",
    name: "データチェッカー",
    shortDescription: "CSV・Excel データの整合性を自動でチェック",
    description:
      "提出前の CSV や Excel ファイルに含まれる重複・欠損・フォーマット不正などを自動で検出するツールです。\n\nチェック結果はレポートとして出力され、修正箇所が一目でわかります。",
    icon: "🔍",
    iconColor: "#E67E22",
    category: "業務効率化",
    version: "1.1.0",
    lastUpdated: "2024-07-05",
    targets: ["全部署"],
    requirements: "Python 3.8 以上 / Microsoft Excel 2016 以上",
    features: [
      "重複データの検出・ハイライト",
      "必須項目の欠損チェック",
      "日付・電話番号などのフォーマット検証",
      "チェックレポートの PDF 出力"
    ],
    downloads: [
      { label: "ダウンロード (v1.1)", url: "#", primary: true }
    ]
  }
];
