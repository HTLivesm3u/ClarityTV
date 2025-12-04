export default async function handler(req, res) {
  const accept = req.headers['accept'] || '';
  const secFetchDest = req.headers['sec-fetch-dest'] || '';
  const userAgent = req.headers['user-agent'] || '';

  // Detect REAL browsers:
  //
  // - Browsers usually send sec-fetch-dest=document or empty but with text/html in Accept.
  // - Players (VLC, IPTV apps, MX Player, etc.) usually DON'T send sec-fetch-* headers
  //   and often have Accept: */* or video/*.
  //
  const isBrowser =
    (secFetchDest && secFetchDest !== 'empty') || // browser navigation
    accept.includes('text/html');

  if (isBrowser) {
    // If someone opens the link in a browser → send them to Telegram
    res.writeHead(302, {
      Location: 'https://t.me/watch_clarity',
    });
    res.end();
    return;
  }

  // Otherwise → treat as IPTV / player → return the M3U content directly
  const m3uUrl = 'https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u';

  try {
    const response = await fetch(m3uUrl);

    if (!response.ok) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/plain');
      res.end('# Error: Unable to load playlist from GitHub\n');
      return;
    }

    const body = await response.text();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline; filename="jstar.m3u"');
    res.end(body);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('# Error: Internal server error while fetching playlist\n');
  }
}
