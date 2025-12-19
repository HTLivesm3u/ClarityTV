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
  const m3uUrl = 'https://dj-tm-srvr1.vercel.app/title/STAR_SPORTS_1_HINDI-HD(JHSTAR)@DJ-TM.mpd?data=s7XN8kvz9qwMdTRMcTQpzLdIcnbxKHIOConIKU7OtwwI987w9sjNszDI9kw1yvMxKgr0szDMMdTODA6yzAn1L01O9_PVd8-uMsgODi_2zA1y8fYLKvFLCvCvLAgFAA|drmScheme=clearkey&drmLicense=https://dj-tm-srvr2.vercel.app/drm/ck/clear.key?data=s_Vz8TPILskN88sMyM0PdXM08DA0LPaOynZ0dksOcE_JCc2PzMlyiTDwySwIK061iMjIiTL2zS00DHK0SLMwKAMA&Cookie=hdntl=exp=1766191211~acl=*sshindi*~id=d5720b59ef7dedc9acdb2522624c3e8a~data=hdntl~hmac=29996f49b4ab5801cb10682fe2c06e8f5f31f559e7fada30c91d8a4634e0d6eb&Origin=https://www.hotstar.com&Referer=https://www.hotstar.com/&User-Agent=Hotstar;in.startv.hotstar.links_macha_official(Android/15)&Telegram=@links_macha_official&Creator=@DJ-TM';

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
