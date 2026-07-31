const axios = require('axios');
const cheerio = require('cheerio');

async function getSession() {
  const res = await axios.get('https://spotmate.online/en1', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
    }
  });

  const $ = cheerio.load(res.data);
  const token = $('meta[name="csrf-token"]').attr('content');
  const cookies = res.headers['set-cookie'] || [];

  return {
    token,
    cookieStr: cookies.map(c => c.split(';')[0]).join('; ')
  };
}

module.exports = async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan"
    });
  }

  try {
    const session = await getSession();

    const trackRes = await axios.post('https://spotmate.online/getTrackData', {
      spotify_url: url
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.token,
        'Cookie': session.cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const trackInfo = trackRes.data;

    if (!trackInfo || trackInfo.status === 'error') {
      throw new Error('Gagal mendapatkan informasi lagu');
    }

    const convertRes = await axios.post('https://spotmate.online/convert', {
      urls: url
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': session.token,
        'Cookie': session.cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const convertData = convertRes.data;

    let downloadUrl = convertData.url || null;

    if (!downloadUrl && convertData.task_id) {
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 2000));
        const taskRes = await axios.get(`https://spotmate.online/tasks/${convertData.task_id}`, {
          headers: {
            'X-CSRF-Token': session.token,
            'Cookie': session.cookieStr
          }
        });
        if (taskRes.data.url) {
          downloadUrl = taskRes.data.url;
          break;
        }
        attempts++;
      }
    }

    if (!downloadUrl) {
      throw new Error('Gagal mengkonversi lagu, coba lagi beberapa saat');
    }

    const image = trackInfo.album?.images?.[0]?.url || '';

    res.json({
      status: true,
      data: {
        title: trackInfo.name || 'Spotify Track',
        artist: trackInfo.artists?.[0]?.name || 'Unknown Artist',
        thumbnail: image,
        downloads: [{ url: downloadUrl, quality: 'MP3', type: 'audio' }]
      }
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Terjadi kesalahan"
    });
  }
};