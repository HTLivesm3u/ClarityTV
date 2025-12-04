<?php
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Detect browser visitors
$browserKeywords = ['Chrome', 'Firefox', 'Safari', 'Opera', 'Edge', 'MSIE'];

// If opened in a browser → redirect to Telegram
foreach ($browserKeywords as $browser) {
    if (stripos($userAgent, $browser) !== false) {
        header("Location: https://t.me/watch_clarity");
        exit;
    }
}

// Otherwise → serve raw M3U file
$m3uLink = "https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u";

header("Content-Type: application/vnd.apple.mpegurl");
echo file_get_contents($m3uLink);
exit;
?>
