/**
 * 野田の消煙機 LP — 資料請求フォームの受け口（Google Apps Script）
 *
 * できること
 *   1. 送信内容を Google スプレッドシートに1行ずつ記録する
 *   2. お客様に「資料ダウンロードのご案内」メールを自動で送る
 *   3. 担当者に「資料請求がありました」と通知する
 *
 * 設置手順（10分ほど）
 *   1. Google スプレッドシートを新規作成し、メニュー「拡張機能 → Apps Script」を開く
 *   2. このファイルの中身をすべて貼り付け、下の「設定」を書き換えて保存
 *   3. 「デプロイ → 新しいデプロイ → 種類：ウェブアプリ」
 *        次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員
 *   4. 表示された「ウェブアプリのURL」（https://script.google.com/macros/s/…/exec）を
 *      index.html の <form data-endpoint=""> の "" の中に貼る
 *   5. LPから試しに送信し、スプレッドシートとメールを確認する
 *
 * 注意：Gmail（無料アカウント）は1日100通、Google Workspace は1日1,500通まで送れます。
 */

// ===== 設定 =====
const DOWNLOAD_URL = 'https://example.com/noda-shoenki-jl8a.pdf';   // 資料PDFのURL（Googleドライブの共有リンクでも可）
const NOTIFY_TO    = 'info@noda-duct.com';                          // 通知を受け取るアドレス（カンマ区切りで複数可）
const FROM_NAME    = '野田の消煙機（株式会社野田）';
const SHEET_NAME   = '資料請求';
// ================

const COLUMNS = ['受付日時', '貴店名・貴社名', '担当者名', 'メールアドレス', '電話番号', '資料請求の目的', '備考', 'ページ', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', '参照元'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.website) return json_({ ok: true });                       // bot trap
    const email = String(p.email || '').trim();
    const name = String(p.name || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'invalid' });

    record_(p, email, name);
    sendGuide_(p, email, name);
    notify_(p, email, name);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function doGet() {
  return json_({ ok: true, service: 'noda-shoenki-form' });
}

function record_(p, email, name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
    sheet.appendRow([
      new Date(), cell_(p.shop), cell_(name), cell_(email), cell_(p.tel), cell_(p.purpose), cell_(p.note), cell_(p.page),
      cell_(p.utm_source), cell_(p.utm_medium), cell_(p.utm_campaign), cell_(p.utm_term), cell_(p.utm_content), cell_(p.gclid), cell_(p.referrer)
    ]);
  } finally {
    lock.releaseLock();
  }
}

function sendGuide_(p, email, name) {
  const shop = clean_(p.shop);
  const body = [
    (shop ? shop + '\n' : '') + name + ' 様',
    '',
    'このたびは「野田の消煙機」の資料をご請求いただき、ありがとうございます。',
    '下記のURLから資料（設置イメージ・料金プラン・メンテナンス内容）をダウンロードいただけます。',
    '',
    '▼ 資料ダウンロード',
    DOWNLOAD_URL,
    '',
    '設置できるかどうか、料金の目安など、お気軽にご相談ください。',
    '現地調査・お見積りは無料です。',
    '',
    '────────────────',
    '野田の消煙機（株式会社野田）',
    'フリーダイヤル 0120-77-3408（受付 9:00〜17:00 土・日・祝 定休）',
    'https://shoenki.duct-noda.com/',
    '────────────────',
    '※ このメールは自動でお送りしています。ご不明な点は、このメールへの返信かお電話でお問い合わせください。'
  ].join('\n');
  MailApp.sendEmail({ to: email, subject: '【野田の消煙機】資料ダウンロードのご案内', body: body, name: FROM_NAME, replyTo: NOTIFY_TO.split(',')[0].trim() });
}

function notify_(p, email, name) {
  const lines = [
    'LPから資料請求がありました。',
    '',
    '貴店名・貴社名：' + (clean_(p.shop) || '（未入力）'),
    '担当者名：' + name,
    'メールアドレス：' + email,
    '電話番号：' + (clean_(p.tel) || '（未入力）'),
    '資料請求の目的：' + clean_(p.purpose),
    '備考：' + (clean_(p.note) || '（なし）'),
    '',
    '流入：' + ([clean_(p.utm_source), clean_(p.utm_medium), clean_(p.utm_campaign)].filter(String).join(' / ') || '（不明）'),
    '参照元：' + (clean_(p.referrer) || '（なし）')
  ];
  MailApp.sendEmail({ to: NOTIFY_TO, subject: '【資料請求】' + (clean_(p.shop) || name) + ' 様', body: lines.join('\n'), name: 'LP資料請求フォーム', replyTo: email });
}

/* plain text: strip control characters and cap the length */
function clean_(v) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 2000).trim();
}

/* for spreadsheet cells: never let input start a formula */
function cell_(v) {
  const s = clean_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
