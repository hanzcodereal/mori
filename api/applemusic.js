const axios = require('axios');

module.exports = async (req, res) => {
  const url = req.query.url || req.body.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan."
    });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'origin': 'https://aaplmusicdownloader.com',
      'referer': 'https://aaplmusicdownloader.com/',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
    };

    const init = await axios.get('https://aaplmusicdownloader.com/', { headers });
    const cookies = init.headers['set-cookie'];
    const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    const reqheaders = { ...headers, 'Cookie': cookieStr, 'x-requested-with': 'XMLHttpRequest' };

    const metadata = await axios.get(`https://aaplmusicdownloader.com/api/song_url.php?url=${encodeURIComponent(url)}`, { headers: reqheaders });
    const meta = metadata.data;

    const swdData = new URLSearchParams();
    swdData.append('song_name', meta.name.replace(/['"]/g, ''));
    swdData.append('artist_name', meta.artist.replace(/['"]/g, ''));
    swdData.append('url', meta.url);
    swdData.append('token', 'none');
    swdData.append('zip_download', 'false');
    swdData.append('quality', '320');

    const swdRes = await axios.post('https://aaplmusicdownloader.com/api/composer/swd.php', swdData, {
      headers: { ...reqheaders, 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const id3Data = new URLSearchParams();
    id3Data.append('url', swdRes.data.dlink);
    id3Data.append('name', meta.name);
    id3Data.append('artist', meta.artist);
    id3Data.append('album', meta.albumname);
    id3Data.append('thumb', meta.thumb);

    const id3Res = await axios.post('https://aaplmusicdownloader.com/api/composer/ffmpeg/saveid3.php', id3Data, {
      headers: { ...reqheaders, 'Content-Type': 'application/x-www-form-urlencoded' },
      responseType: 'text'
    });

    const downloadUrl = `https://aaplmusicdownloader.com/api/composer/ffmpeg/saved/${id3Res.data}`;

    if (!downloadUrl) {
      return res.status(400).json({
        status: false,
        message: "Gagal mengambil data Apple Music"
      });
    }

    const output = {
      title: meta.name || 'Apple Music Track',
      artist: meta.artist || '',
      album: meta.albumname || '',
      duration: meta.duration || '',
      thumbnail: meta.thumb || '',
      downloads: [
        { url: downloadUrl, quality: '320kbps', type: 'audio' }
      ]
    };

    if (!output.downloads.length) {
      return res.status(400).json({
        status: false,
        message: "Media tidak ditemukan"
      });
    }

    res.json({
      status: true,
      data: output
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Terjadi kesalahan saat mendownload Apple Music"
    });
  }
};