export default function handler(req, res) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';

  // Detect normal web browsers
  const isBrowser =
    (accept && accept.includes('text/html')) ||
    /Chrome|Safari|Firefox|Edge|OPR|MSIE|Trident/i.test(ua);

  if (isBrowser) {
    // If opened in a browser → go to Telegram
    res.writeHead(302, {
      Location: 'https://t.me/watch_clarity',
    });
    res.end();
    return;
  }

  // Otherwise (IPTV / video player / app) → redirect to raw M3U
  res.writeHead(302, {
    Location: 'https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u',
  });
  res.end();
}
