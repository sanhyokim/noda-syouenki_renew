<?php
/**
 * 野田の消煙機 LP — 資料請求フォームとお問い合わせフォームの送信先（コアサーバーで動く PHP）
 *
 * できること
 *   1. 担当者に通知メールを送る（件名に都道府県が入るので、地域ごとの振り分けに使えます）
 *   2. お客様に自動返信メールを送る（資料請求：ダウンロードのご案内／お問い合わせ：受付確認）
 *
 * WordPress のフォームと同じく、このサーバーからメールを送ります。Google などの設定は要りません。
 * index.html と contact/index.html の <form data-endpoint="…form/send.php"> からここに送られます。
 * 書き換えるのは下の「設定」だけです。
 */

// ===== 設定 =====
const DOWNLOAD_URL = 'https://app.box.com/s/eawb01x5wcymzpkbrh3q88s841yr297o';   // 資料PDF（販売のみ版）のURL。Box の共有リンク（2026年10月18日にご提供）
const NOTIFY_TO    = 'info@noda-duct.com,koroyasu@duct-noda.com,azuma@duct-noda.com,nagamizu@duct-noda.com';  // 通知を受け取るアドレス（カンマ区切り）
const REPLY_TO     = 'info@noda-duct.com';            // お客様が自動返信メールに返信したときの宛先
const FROM_EMAIL   = 'no-reply@shoenki.duct-noda.com'; // 送信元。迷惑メールに入る場合は、今の WordPress のフォームが使っている送信元アドレスに合わせてください
const FROM_NAME    = '野田の消煙機（株式会社野田）';
const SITE_URL     = 'https://shoenki.duct-noda.com/';
// ================

// フォームごとの名前と項目（form=download が資料請求、form=contact がお問い合わせ）
const FORMS = [
  'download' => ['label' => '資料請求', 'field' => ['資料請求の目的', 'purpose'], 'text' => ['備考', 'note']],
  'contact'  => ['label' => 'お問い合わせ', 'field' => ['お問い合わせの種類', 'kind'], 'text' => ['お問い合わせ内容', 'message']],
];
const RATE_LIMIT = 5;      // 同じ接続元から10分間に受け付ける件数（いたずら対策）
const RATE_WINDOW = 600;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  respond(405, ['ok' => false, 'error' => 'method']);
}
if (!same_origin()) {
  respond(403, ['ok' => false, 'error' => 'origin']);
}

$p = $_POST;
if (clean($p['website'] ?? '') !== '') respond(200, ['ok' => true]);   // bot trap
$form = is_string($p['form'] ?? null) && isset(FORMS[$p['form']]) ? $p['form'] : 'download';
$name = clean($p['name'] ?? '', 100);
$email = clean($p['email'] ?? '', 254);
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(400, ['ok' => false, 'error' => 'invalid']);
if ($form === 'contact' && clean($p['message'] ?? '') === '') respond(400, ['ok' => false, 'error' => 'invalid']);
if (!rate_ok()) respond(429, ['ok' => false, 'error' => 'busy']);

if (!notify($form, $p, $email, $name)) respond(500, ['ok' => false, 'error' => 'mail']);
if ($form === 'contact') send_ack($p, $email, $name); else send_guide($p, $email, $name);
respond(200, ['ok' => true]);

function send_guide(array $p, string $email, string $name): bool {
  $shop = clean($p['shop'] ?? '', 100);
  $body = [
    ($shop !== '' ? $shop . "\n" : '') . $name . ' 様',
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
    '※ このメールは自動でお送りしています。ご不明な点は、このメールへの返信かお電話でお問い合わせください。',
  ];
  return send_mail($email, '【野田の消煙機】資料ダウンロードのご案内', implode("\n", $body), FROM_NAME, REPLY_TO);
}

function send_ack(array $p, string $email, string $name): bool {
  $shop = clean($p['shop'] ?? '', 100);
  $body = [
    ($shop !== '' ? $shop . "\n" : '') . $name . ' 様',
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
    'お問い合わせの種類：' . clean($p['kind'] ?? ''),
    '店舗の所在地：' . or_none(clean($p['pref'] ?? ''), '（未入力）'),
    '電話番号：' . or_none(clean($p['tel'] ?? ''), '（未入力）'),
    '',
    clean($p['message'] ?? ''),
    '────────────────',
    '',
    'お急ぎの場合は、お電話でもご相談いただけます。',
    '野田の消煙機（株式会社野田）',
    'フリーダイヤル 0120-77-3408（受付 9:00〜17:00 土・日・祝 定休）',
    'https://shoenki.duct-noda.com/',
    '',
    '※ このメールは自動でお送りしています。内容の追加や訂正は、このメールへの返信でお知らせください。',
  ];
  return send_mail($email, '【野田の消煙機】お問い合わせを受け付けました', implode("\n", $body), FROM_NAME, REPLY_TO);
}

function notify(string $form, array $p, string $email, string $name): bool {
  $f = FORMS[$form];
  $pref = clean($p['pref'] ?? '', 20);
  $shop = clean($p['shop'] ?? '', 100);
  $flow = implode(' / ', array_filter([clean($p['utm_source'] ?? ''), clean($p['utm_medium'] ?? ''), clean($p['utm_campaign'] ?? '')], 'strlen'));
  $lines = [
    '野田の消煙機のLP（' . SITE_URL . '）の' . $f['label'] . 'フォームから、' . $f['label'] . 'がありました。',
    '※ このメールは、消煙機のLPのフォームから自動で送られています。',
    '',
    '■ お客様',
    '貴店名・貴社名：' . or_none($shop, '（未入力）'),
    '店舗の所在地：' . or_none($pref, '（未入力）'),
    '担当者名：' . $name,
    'メールアドレス：' . $email,
    '電話番号：' . or_none(clean($p['tel'] ?? ''), '（未入力）'),
    '',
    '■ ' . $f['label'] . 'の内容',
    $f['field'][0] . '：' . clean($p[$f['field'][1]] ?? ''),
    $f['text'][0] . '：' . or_none(clean($p[$f['text'][1]] ?? ''), '（なし）'),
    '',
    '■ 送信元',
    'フォーム：野田の消煙機LP「' . $f['label'] . '」フォーム',
    '送信ページ：' . or_none(clean($p['page'] ?? ''), SITE_URL),
    '受付日時：' . (new DateTime('now', new DateTimeZone('Asia/Tokyo')))->format('Y/m/d H:i'),
    '流入：' . or_none($flow, '（不明）'),
    '参照元：' . or_none(clean($p['referrer'] ?? ''), '（なし）'),
    '',
    'このメールに返信すると、お客様（' . $email . '）に届きます。',
  ];
  $subject = '【野田の消煙機LP】' . $f['label'] . 'がありました' . ($pref !== '' ? '［' . $pref . '］' : '') . or_none($shop, $name) . ' 様';
  return send_mail(NOTIFY_TO, $subject, implode("\n", $lines), '野田の消煙機LP ' . $f['label'] . 'フォーム', $email);
}

function send_mail(string $to, string $subject, string $body, string $fromName, string $replyTo): bool {
  $headers = implode("\r\n", [
    'From: ' . mime_header($fromName) . ' <' . FROM_EMAIL . '>',
    'Reply-To: ' . $replyTo,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ]);
  $text = chunk_split(base64_encode(str_replace("\n", "\r\n", preg_replace('/\r\n?/', "\n", $body))));
  // -f sets the envelope sender (bounces); some servers refuse it, so try once more without it
  return @mail($to, mime_header($subject), $text, $headers, '-f' . FROM_EMAIL)
      || @mail($to, mime_header($subject), $text, $headers);
}

/* RFC 2047 encoded words, split on character boundaries so each stays under 75 bytes */
function mime_header(string $s): string {
  $s = preg_replace('/[\r\n\t]+/', ' ', $s);   // a header is one line: never let input add another
  if (!preg_match('/[^\x20-\x7E]/', $s)) return $s;
  $words = [];
  $chunk = '';
  foreach (preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY) as $ch) {
    if (strlen($chunk . $ch) > 45) { $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?='; $chunk = ''; }
    $chunk .= $ch;
  }
  if ($chunk !== '') $words[] = '=?UTF-8?B?' . base64_encode($chunk) . '?=';
  return implode(' ', $words);
}

/* plain text: valid UTF-8, no control characters, capped length */
function clean($v, int $max = 2000): string {
  if (!is_string($v)) return '';
  if (!preg_match('//u', $v)) $v = function_exists('mb_convert_encoding') ? mb_convert_encoding($v, 'UTF-8', 'UTF-8') : '';
  $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
  $chars = preg_split('//u', $v, -1, PREG_SPLIT_NO_EMPTY);
  return trim(count($chars) > $max ? implode('', array_slice($chars, 0, $max)) : $v);
}

function or_none(string $v, string $none): string {
  return $v !== '' ? $v : $none;
}

/* the forms post from this site's own pages; refuse posts sent from other sites */
function same_origin(): bool {
  $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
  if ($src === '') return false;
  $host = strtolower((string) parse_url($src, PHP_URL_HOST));
  $self = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
  return $host !== '' && $host === $self;
}

/* at most RATE_LIMIT posts per address in RATE_WINDOW seconds */
function rate_ok(): bool {
  $file = sys_get_temp_dir() . '/noda-form-' . sha1($_SERVER['REMOTE_ADDR'] ?? '');
  $now = time();
  $hits = array_filter(array_map('intval', (array) @file($file, FILE_IGNORE_NEW_LINES)), function ($t) use ($now) { return $t > $now - RATE_WINDOW; });
  if (count($hits) >= RATE_LIMIT) return false;
  $hits[] = $now;
  @file_put_contents($file, implode("\n", $hits), LOCK_EX);
  return true;
}

function respond(int $status, array $data): void {
  http_response_code($status);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
