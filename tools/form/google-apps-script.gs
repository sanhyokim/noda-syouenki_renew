/**
 * 野田の消煙機 LP — 資料請求フォームとお問い合わせフォームの受け口（Google Apps Script）
 *
 * できること
 *   1. 送信内容を Google スプレッドシートに1行ずつ記録する（シート「資料請求」「お問い合わせ」）
 *   2. お客様に自動返信メールを送る（資料請求：ダウンロードのご案内／お問い合わせ：受付確認）
 *   3. 担当者に通知する（件名に都道府県が入るので、地域ごとの振り分けに使えます）
 *
 * 設置手順（10分ほど）
 *   1. Google スプレッドシートを新規作成し、メニュー「拡張機能 → Apps Script」を開く
 *   2. このファイルの中身をすべて貼り付け、下の「設定」を書き換えて保存
 *   3. 「デプロイ → 新しいデプロイ → 種類：ウェブアプリ」
 *        次のユーザーとして実行：自分 ／ アクセスできるユーザー：全員
 *   4. 表示された「ウェブアプリのURL」（https://script.google.com/macros/s/…/exec）を
 *      index.html と contact/index.html の <form data-endpoint=""> の "" の中に貼る
 *   5. LPから試しに送信し、スプレッドシートとメールを確認する
 *
 * 注意：送れるのは宛先の数で数えて、Gmail（無料アカウント）は1日100件、Google Workspace は1日1,500件までです。
 *       1回の送信で、お客様への自動返信1件＋通知4件（NOTIFY_TO の数）＝5件を使います。
 */

// ===== 設定 =====
const DOWNLOAD_URL = 'https://example.com/noda-shoenki-jl8a.pdf';   // 資料PDF（販売のみ版）のURL（Googleドライブの共有リンクでも可）
const NOTIFY_TO    = 'info@noda-duct.com,koroyasu@duct-noda.com,azuma@duct-noda.com,nagamizu@duct-noda.com';  // 通知を受け取るアドレス（カンマ区切り。お客様からの返信は先頭のアドレスに届きます）
const FROM_NAME    = '野田の消煙機（株式会社野田）';
const SITE_URL     = 'https://shoenki.duct-noda.com/';
// ================

// フォームごとのシート名と列（form=download が資料請求、form=contact がお問い合わせ）
const FORMS = {
  download: { sheet: '資料請求', label: '資料請求', field: ['資料請求の目的', 'purpose'], text: ['備考', 'note'] },
  contact:  { sheet: 'お問い合わせ', label: 'お問い合わせ', field: ['お問い合わせの種類', 'kind'], text: ['お問い合わせ内容', 'message'] }
};
const TRACK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.website) return json_({ ok: true });                       // bot trap
    const form = FORMS[p.form] ? p.form : 'download';
    const email = String(p.email || '').trim();
    const name = String(p.name || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'invalid' });
    if (form === 'contact' && !clean_(p.message)) return json_({ ok: false, error: 'invalid' });

    record_(form, p, email, name);
    if (form === 'contact') sendAck_(p, email, name); else sendGuide_(p, email, name);
    notify_(form, p, email, name);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

function doGet() {
  return json_({ ok: true, service: 'noda-shoenki-form' });
}

function record_(form, p, email, name) {
  const f = FORMS[form];
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(f.sheet) || ss.insertSheet(f.sheet);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['受付日時', '貴店名・貴社名', '都道府県', '担当者名', 'メールアドレス', '電話番号', f.field[0], f.text[0], 'ページ'].concat(TRACK_KEYS, ['参照元']));
    }
    sheet.appendRow([
      new Date(), cell_(p.shop), cell_(p.pref), cell_(name), cell_(email), cell_(p.tel), cell_(p[f.field[1]]), cell_(p[f.text[1]]), cell_(p.page)
    ].concat(TRACK_KEYS.map(k => cell_(p[k])), [cell_(p.referrer)]));
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
    '下記のURLから資料（設置イメージ・価格・メンテナンス内容）をダウンロードいただけます。',
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

function sendAck_(p, email, name) {
  const shop = clean_(p.shop);
  const body = [
    (shop ? shop + '\n' : '') + name + ' 様',
    '',
    '「野田の消煙機」へお問い合わせいただき、ありがとうございます。',
    '次の内容で受け付けました。担当者より、あらためてご連絡いたします。',
    '',
    '※ お問い合わせフォームからは、資料はお送りしていません。',
    '　資料（設置イメージ・価格・メンテナンス内容）をご希望の場合は、',
    '　資料請求フォームからお申し込みください。',
    '　https://shoenki.duct-noda.com/#download',
    '',
    '────────────────',
    'お問い合わせの種類：' + clean_(p.kind),
    '店舗の所在地：' + (clean_(p.pref) || '（未入力）'),
    '電話番号：' + (clean_(p.tel) || '（未入力）'),
    '',
    clean_(p.message),
    '────────────────',
    '',
    'お急ぎの場合は、お電話でもご相談いただけます。',
    '野田の消煙機（株式会社野田）',
    'フリーダイヤル 0120-77-3408（受付 9:00〜17:00 土・日・祝 定休）',
    'https://shoenki.duct-noda.com/',
    '',
    '※ このメールは自動でお送りしています。内容の追加や訂正は、このメールへの返信でお知らせください。'
  ].join('\n');
  MailApp.sendEmail({ to: email, subject: '【野田の消煙機】お問い合わせを受け付けました', body: body, name: FROM_NAME, replyTo: NOTIFY_TO.split(',')[0].trim() });
}

function notify_(form, p, email, name) {
  const f = FORMS[form];
  const pref = clean_(p.pref);
  const lines = [
    '野田の消煙機のLP（' + SITE_URL + '）の' + f.label + 'フォームから、' + f.label + 'がありました。',
    '※ このメールは、消煙機のLPのフォームから自動で送られています。',
    '',
    '■ お客様',
    '貴店名・貴社名：' + (clean_(p.shop) || '（未入力）'),
    '店舗の所在地：' + (pref || '（未入力）'),
    '担当者名：' + name,
    'メールアドレス：' + email,
    '電話番号：' + (clean_(p.tel) || '（未入力）'),
    '',
    '■ ' + f.label + 'の内容',
    f.field[0] + '：' + clean_(p[f.field[1]]),
    f.text[0] + '：' + (clean_(p[f.text[1]]) || '（なし）'),
    '',
    '■ 送信元',
    'フォーム：野田の消煙機LP「' + f.label + '」フォーム',
    '送信ページ：' + (clean_(p.page) || SITE_URL),
    '受付日時：' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    '流入：' + ([clean_(p.utm_source), clean_(p.utm_medium), clean_(p.utm_campaign)].filter(String).join(' / ') || '（不明）'),
    '参照元：' + (clean_(p.referrer) || '（なし）'),
    '',
    'このメールに返信すると、お客様（' + email + '）に届きます。'
  ];
  const subject = '【野田の消煙機LP】' + f.label + 'がありました' + (pref ? '［' + pref + '］' : '') + (clean_(p.shop) || name) + ' 様';
  MailApp.sendEmail({ to: NOTIFY_TO, subject: subject, body: lines.join('\n'), name: '野田の消煙機LP ' + f.label + 'フォーム', replyTo: email });
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
