<?php
/**
 * 野田の消煙機 LP — アップロード用の道具（サイトの一部ではありません）
 *
 * 同じフォルダにアップロードした shoenki-lp.zip を、そのフォルダに展開します。
 * ブラウザでこのファイルを開いて「展開する」を押すと、展開したあと zip とこのファイルを自分で消します。
 * フォルダを1つずつ作らずに、LP のファイル一式を置くためのものです。
 */

const ZIP_NAME = 'shoenki-lp.zip';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$dir = __DIR__;
$zip = $dir . '/' . ZIP_NAME;
$here = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/';
$count = null;
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  try {
    if (!is_file($zip)) throw new RuntimeException(ZIP_NAME . ' が、このファイルと同じフォルダに見つかりません。');
    $count = extract_zip($zip, $dir);
    if (!is_file($dir . '/index.html')) throw new RuntimeException('展開したあとに index.html が見つかりません。');
    @unlink($zip);
    @unlink(__FILE__);
  } catch (Throwable $e) {
    $count = null;
    $error = $e->getMessage();
  }
}

/* ZipArchive が使えればそれで、なければ PHP 標準の PharData で展開する */
function extract_zip(string $zip, string $dir): int {
  if (class_exists('ZipArchive')) {
    $z = new ZipArchive();
    if ($z->open($zip) !== true) throw new RuntimeException('zip を開けませんでした。ファイルが壊れているかもしれません。');
    $names = [];
    for ($i = 0; $i < $z->numFiles; $i++) $names[] = (string) $z->getNameIndex($i);
    check_names($names);
    $ok = $z->extractTo($dir);
    $z->close();
    if (!$ok) throw new RuntimeException('展開の途中で失敗しました。');
    return count(array_filter($names, function ($n) { return substr($n, -1) !== '/'; }));
  }
  if (class_exists('PharData')) {
    $p = new PharData($zip);
    $prefix = 'phar://' . str_replace('\\', '/', $p->getPath()) . '/';
    $names = [];
    foreach (new RecursiveIteratorIterator($p) as $f) $names[] = substr(str_replace('\\', '/', $f->getPathname()), strlen($prefix));
    check_names($names);
    $p->extractTo($dir, null, true);
    return count($names);
  }
  throw new RuntimeException('このサーバーの PHP では zip を展開できませんでした。');
}

/* 中身はこちらで作った zip だけですが、念のためフォルダの外に書き出す名前は受け付けない */
function check_names(array $names): void {
  if (!$names) throw new RuntimeException('zip の中身が空です。');
  foreach ($names as $n) {
    if ($n === '' || $n[0] === '/' || strpos($n, '\\') !== false || strpos($n, ':') !== false || preg_match('#(^|/)\.\.(/|$)#', $n)) {
      throw new RuntimeException('zip の中に使えない名前があります：' . $n);
    }
  }
}

function h(string $s): string {
  return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}
?>
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>LPのファイルを展開</title>
<style>
  body { margin: 0; padding: 48px 20px; background: #f4f6f8; color: #1b2733; font: 16px/1.8 system-ui, -apple-system, "Hiragino Sans", "Yu Gothic UI", sans-serif; }
  main { max-width: 560px; margin: 0 auto; padding: 32px; background: #fff; border: 1px solid #d5dde5; border-radius: 8px; }
  h1 { margin: 0 0 16px; font-size: 22px; }
  p { margin: 0 0 16px; }
  code { padding: 2px 6px; background: #eef2f5; border-radius: 4px; }
  button, .btn { display: inline-block; padding: 12px 28px; border: 0; border-radius: 6px; background: #e8590c; color: #fff; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
  .ok { color: #1f7a3a; font-weight: 700; }
  .ng { color: #b42318; font-weight: 700; }
</style>
</head>
<body>
<main>
<?php if ($count !== null): ?>
  <h1 class="ok">展開しました</h1>
  <p><?= (int) $count ?> 個のファイルを <code><?= h($here) ?></code> に置きました。zip とこの道具は消してあります。</p>
  <p><a class="btn" href="./">このフォルダのページを開く</a></p>
<?php elseif ($error !== null): ?>
  <h1 class="ng">展開できませんでした</h1>
  <p><?= h($error) ?></p>
  <p>この画面のスクリーンショットを送ってください。</p>
<?php elseif (is_file($zip)): ?>
  <h1>LPのファイルを展開します</h1>
  <p><code><?= h(ZIP_NAME) ?></code> の中身を、このフォルダ（<code><?= h($here) ?></code>）に展開します。同じ名前のファイルがあれば上書きします。</p>
  <form method="post"><button type="submit">展開する</button></form>
<?php else: ?>
  <h1 class="ng"><?= h(ZIP_NAME) ?> が見つかりません</h1>
  <p>このファイル（unzip.php）と同じフォルダに、<code><?= h(ZIP_NAME) ?></code> をアップロードしてから、このページを開き直してください。</p>
<?php endif; ?>
</main>
</body>
</html>
