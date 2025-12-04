export default async function handler(req, res) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';

  // Check if it's a normal browser
  const isBrowser =
    (accept && accept.includes('text/html')) ||
    /Mozilla|Chrome|Safari|Firefox|Edge|OPR|MSIE/i.test(ua);

  // If opened in browser → redirect to Telegram
  if (isBrowser) {
    res.writeHead(302, {
      Location: 'https://t.me/watch_clarity',
    });
    res.end();
    return;
  }

  // Otherwise → serve the M3U playlist
  const m3uUrl = 'https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u';

  try {
    const response = await fetch(m3uUrl);

    if (!response.ok) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain');
      res.end('# Error: Unable to load playlist\n');
      return;
    }

    const text = await response.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.end(text);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('# Error: Internal server error\n');
  }
}
