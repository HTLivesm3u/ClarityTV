<?php
// Detect headers
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$accept    = $_SERVER['HTTP_ACCEPT'] ?? '';

// Check if request is from a normal browser
$isBrowser = stripos($accept, 'text/html') !== false
          || preg_match('/Chrome|Firefox|Safari|Edge|OPR|MSIE/i', $userAgent);

// If opened in browser → redirect to Telegram
if ($isBrowser) {
    header("Location: https://t.me/watch_clarity", true, 302);
    exit;
}

// Otherwise → serve the M3U playlist
$m3uLink = "https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u";

$m3u = @file_get_contents($m3uLink);
if ($m3u === false) {
    http_response_code(502);
    header("Content-Type: text/plain");
    echo "# Error: Unable to load playlist\n";
    exit;
}

header("Content-Type: application/vnd.apple.mpegurl");
echo $m3u;
exit;
?>
