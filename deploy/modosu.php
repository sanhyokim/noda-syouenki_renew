<?php
/**
 * 野田の消煙機 LP — 元に戻す道具（サイトの一部ではありません。困ったときだけ使います）
 *
 * unzip.php で WordPress から差し替えたあとに、元の WordPress に戻します。
 * public_html に置いてブラウザで開き「元に戻す」を押すと、新しいLPのファイルを
 * public_html の外の lp_new_日時 フォルダに移し（消しません）、wp_old_shoenki の中身を public_html に戻します。
 * 終わったらこのファイルを自分で消します。
 */

const OLD_DIR = 'wp_old_shoenki';
/* shoenki-lp.zip がいちばん上に置くもの */
const LP_NAMES = ['index.html', '404.html', '.htaccess', 'robots.txt', 'sitemap.xml', 'llms.txt', 'assets', 'company', 'contact', 'privacypolicy', 'transmission', 'form'];

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$dir = __DIR__;
$old = dirname($dir) . '/' . OLD_DIR;
$done = false;
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  try {
    if (!is_dir($old)) throw new RuntimeException('public_html の外に ' . OLD_DIR . ' フォルダが見つかりません。');
    $back = array_values(array_diff(scandir($old), ['.', '..']));
    if (!in_array('wp-config.php', $back, true)) throw new RuntimeException(OLD_DIR . ' の中に WordPress（wp-config.php）が見つかりません。');
    $lp = dirname($dir) . '/lp_new_' . date('Ymd_His');
    if (!@mkdir($lp, 0755)) throw new RuntimeException('public_html の外に ' . basename($lp) . ' フォルダを作れませんでした。何も変えていません。');
    $out = [];
    $in = [];
    try {
      foreach (LP_NAMES as $n) {
        if (!file_exists($dir . '/' . $n)) continue;
        if (!@rename($dir . '/' . $n, $lp . '/' . $n)) throw new RuntimeException($n . ' を移せませんでした。');
        $out[] = $n;
      }
      foreach ($back as $n) {
        if (file_exists($dir . '/' . $n)) throw new RuntimeException('public_html にすでに ' . $n . ' があるので戻せませんでした。');
        if (!@rename($old . '/' . $n, $dir . '/' . $n)) throw new RuntimeException($n . ' を戻せませんでした。');
        $in[] = $n;
      }
    } catch (Throwable $e) {
      foreach ($in as $n) @rename($dir . '/' . $n, $old . '/' . $n);
      foreach ($out as $n) @rename($lp . '/' . $n, $dir . '/' . $n);
      @rmdir($lp);
      throw new RuntimeException($e->getMessage() . ' 動かしたものは元の場所に戻しました。');
    }
    @rmdir($old);
    @unlink(__FILE__);
    $done = basename($lp);
  } catch (Throwable $e) {
    $error = $e->getMessage();
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
<title>WordPressに戻す</title>
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
<?php if ($done): ?>
  <h1 class="ok">元の WordPress に戻しました</h1>
  <p>新しいLPのファイルは、public_html の外の <code><?= h($done) ?></code> フォルダに移しました（消していません）。この道具は消してあります。</p>
  <p><a class="btn" href="./">トップページを開く</a></p>
<?php elseif ($error !== null): ?>
  <h1 class="ng">元に戻せませんでした</h1>
  <p><?= h($error) ?></p>
  <p>この画面のスクリーンショットを送ってください。</p>
<?php elseif (is_dir($old)): ?>
  <h1>元の WordPress に戻します</h1>
  <p>新しいLPのファイルを public_html の外に移し（消しません）、<code><?= h(OLD_DIR) ?></code> の中の WordPress を public_html に戻します。</p>
  <form method="post"><button type="submit">元に戻す</button></form>
<?php else: ?>
  <h1 class="ng"><?= h(OLD_DIR) ?> が見つかりません</h1>
  <p>public_html の外に <code><?= h(OLD_DIR) ?></code> フォルダがないため、戻せるものがありません。</p>
<?php endif; ?>
</main>
</body>
</html>
