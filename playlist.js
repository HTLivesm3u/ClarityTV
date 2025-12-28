export default async function handler(req, res) {
  const accept = req.headers['accept'] || '';
  const secFetchDest = req.headers['sec-fetch-dest'] || '';

  // Detect browser (players usually don't send these)
  const isBrowser =
    accept.includes('text/html') ||
    (secFetchDest && secFetchDest !== 'empty');

  if (isBrowser) {
    res.writeHead(302, {
      Location: 'https://t.me/watch_clarity',
    });
    res.end();
    return;
  }

  // Get playlist id from URL
  const { id } = req.query;

  // Playlist map (ADD MORE HERE)
  const playlists = {
    jstar: 'https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u',
    jstar2: 'https://raw.githubusercontent.com/alex8875/m3u/main/jstar.m3u',
  };

  if (!id || !playlists[id]) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('# Playlist not found\n');
    return;
  }

  try {
    const response = await fetch(playlists[id]);

    if (!response.ok) {
      res.statusCode = 502;
      res.end('# Failed to load playlist\n');
      return;
    }

    const m3u = await response.text();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${id}.m3u"`
    );
    res.end(m3u);
  } catch (err) {
    res.statusCode = 500;
    res.end('# Server error\n');
  }
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
