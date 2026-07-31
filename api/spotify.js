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
    const response = await axios.post(
      'https://musicfab.io/api/spotify',
      { url: url },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36',
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'Origin': 'https://musicfab.io',
          'Referer': 'https://musicfab.io/',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 30000
      }
    );

    const metadata = response.data?.data?.metadata;

    if (!metadata || !metadata.download) {
      return res.status(400).json({
        status: false,
        message: "Gagal mengambil data Spotify"
      });
    }

    const output = {
      title: metadata.name || 'Spotify Track',
      artist: metadata.artist || '',
      album: metadata.album || '',
      duration: metadata.duration || '',
      thumbnail: metadata.image || '',
      downloads: [
        { url: metadata.download, quality: 'Audio', type: 'audio' }
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
      message: error.message || "Terjadi kesalahan saat mendownload Spotify"
    });
  }
};