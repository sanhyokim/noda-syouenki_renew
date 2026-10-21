<?php
/**
 * 野田の消煙機 LP — アップロード用の道具（サイトの一部ではありません）
 *
 * 同じフォルダにアップロードした shoenki-lp.zip を、そのフォルダに展開します。
 * ブラウザでこのファイルを開いてボタンを押すと、展開したあと zip とこのファイルを自分で消します。
 * フォルダを1つずつ作らずに、LP のファイル一式を置くためのものです。
 *
 * そのフォルダに WordPress があるとき（本番の public_html）は、先に WordPress のファイルを
 * public_html の外の wp_old_shoenki フォルダへ移してから展開します。消さずに移すだけです。
 * 途中で失敗したときは、移したものを元の場所に戻します。
 */

const ZIP_NAME = 'shoenki-lp.zip';
const OLD_DIR = 'wp_old_shoenki';
/* WordPress から差し替えるときも public_html に残すもの（サーバーやドメインの設定に使うもの） */
const KEEP = ['cgi-bin', 'img', '.well-known', '.user.ini', 'php.ini'];

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$dir = __DIR__;
$zip = $dir . '/' . ZIP_NAME;
$here = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/';
$wp = is_file($dir . '/wp-config.php') || is_file($dir . '/wp-load.php');
$count = null;
$old = null;
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  try {
    if (!is_file($zip)) throw new RuntimeException(ZIP_NAME . ' が、このファイルと同じフォルダに見つかりません。');
    $names = zip_names($zip);
    check_names($names);
    if ($wp) $old = move_wordpress($dir);
    try {
      extract_zip($zip, $dir);
      if (!is_file($dir . '/index.html')) throw new RuntimeException('展開したあとに index.html が見つかりません。');
    } catch (Throwable $e) {
      if ($old) {
        undo_switch($dir, $old, $names);
        throw new RuntimeException($e->getMessage() . ' WordPress のファイルは元の場所に戻しました。');
      }
      throw $e;
    }
    $count = count(array_filter($names, function ($n) { return substr($n, -1) !== '/'; }));
    @unlink($zip);
    @unlink(__FILE__);
  } catch (Throwable $e) {
    $count = null;
    $error = $e->getMessage();
  }
}

/* zip の中のファイル名の一覧。ZipArchive が使えればそれで、なければ PHP 標準の PharData で読む */
function zip_names(string $zip): array {
  if (class_exists('ZipArchive')) {
    $z = new ZipArchive();
    if ($z->open($zip) !== true) throw new RuntimeException('zip を開けませんでした。ファイルが壊れているかもしれません。');
    $names = [];
    for ($i = 0; $i < $z->numFiles; $i++) $names[] = (string) $z->getNameIndex($i);
    $z->close();
    return $names;
  }
  if (class_exists('PharData')) {
    $p = new PharData($zip);
    $prefix = 'phar://' . str_replace('\\', '/', $p->getPath()) . '/';
    $names = [];
    foreach (new RecursiveIteratorIterator($p) as $f) $names[] = substr(str_replace('\\', '/', $f->getPathname()), strlen($prefix));
    return $names;
  }
  throw new RuntimeException('このサーバーの PHP では zip を展開できませんでした。');
}

function extract_zip(string $zip, string $dir): void {
  if (class_exists('ZipArchive')) {
    $z = new ZipArchive();
    if ($z->open($zip) !== true) throw new RuntimeException('zip を開けませんでした。ファイルが壊れているかもしれません。');
    $ok = $z->extractTo($dir);
    $z->close();
    if (!$ok) throw new RuntimeException('展開の途中で失敗しました。');
    return;
  }
  (new PharData($zip))->extractTo($dir, null, true);
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

function keep(string $n): bool {
  return in_array($n, KEEP, true) || $n === ZIP_NAME || $n === basename(__FILE__) || preg_match('/^google[0-9a-z]+\.html$/i', $n);
}

/* public_html の中身を、残すもの以外ぜんぶ public_html の外の wp_old_shoenki に移す */
function move_wordpress(string $dir): array {
  $dest = dirname($dir) . '/' . OLD_DIR;
  if (file_exists($dest)) $dest .= '_' . date('Ymd_His');
  if (!@mkdir($dest, 0755)) throw new RuntimeException('public_html の外に ' . basename($dest) . ' フォルダを作れませんでした。何も変えていません。');
  $moved = [];
  foreach (scandir($dir) as $n) {
    if ($n === '.' || $n === '..' || keep($n)) continue;
    if (!@rename($dir . '/' . $n, $dest . '/' . $n)) {
      move_back($dir, ['dest' => $dest, 'moved' => $moved]);
      throw new RuntimeException($n . ' を移せませんでした。移したものは元に戻しました。');
    }
    $moved[] = $n;
  }
  return ['dest' => $dest, 'moved' => $moved];
}

function move_back(string $dir, array $old): void {
  foreach ($old['moved'] as $n) @rename($old['dest'] . '/' . $n, $dir . '/' . $n);
  @rmdir($old['dest']);
}

/* 展開に失敗したら、展開できた分を消して WordPress を戻す */
function undo_switch(string $dir, array $old, array $names): void {
  $tops = array_unique(array_map(function ($n) { return explode('/', $n)[0]; }, $names));
  foreach ($tops as $n) if (!keep($n)) remove_tree($dir . '/' . $n);
  move_back($dir, $old);
}

function remove_tree(string $path): void {
  if (is_link($path) || is_file($path)) { @unlink($path); return; }
  if (!is_dir($path)) return;
  foreach (scandir($path) as $n) if ($n !== '.' && $n !== '..') remove_tree($path . '/' . $n);
  @rmdir($path);
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
<?php if ($count !== null && $old): ?>
  <h1 class="ok">差し替えました</h1>
  <p>WordPress のファイルは、public_html の外の <code><?= h(basename($old['dest'])) ?></code> フォルダに移しました（消していません）。</p>
  <p>新しいLPのファイル <?= (int) $count ?> 個を <code><?= h($here) ?></code> に置きました。zip とこの道具は消してあります。</p>
  <p><a class="btn" href="./">トップページを開く</a></p>
<?php elseif ($count !== null): ?>
  <h1 class="ok">展開しました</h1>
  <p><?= (int) $count ?> 個のファイルを <code><?= h($here) ?></code> に置きました。zip とこの道具は消してあります。</p>
  <p><a class="btn" href="./">このフォルダのページを開く</a></p>
<?php elseif ($error !== null): ?>
  <h1 class="ng"><?= $wp ? '差し替えできませんでした' : '展開できませんでした' ?></h1>
  <p><?= h($error) ?></p>
  <p>この画面のスクリーンショットを送ってください。</p>
<?php elseif (is_file($zip) && $wp): ?>
  <h1>WordPress から新しいLPに差し替えます</h1>
  <p>このフォルダ（<code><?= h($here) ?></code>）の WordPress のファイルを、public_html の外の <code><?= h(OLD_DIR) ?></code> フォルダに移してから（消しません）、<code><?= h(ZIP_NAME) ?></code> の中身を展開します。</p>
  <p>cgi-bin と img など、サーバーの設定に使うものはそのまま残します。</p>
  <form method="post"><button type="submit">差し替える</button></form>
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
