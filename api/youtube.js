const axios = require('axios');

const API_URL = 'https://api.vidssave.com/api/contentsite_api/media/parse';
const AUTH = '20250901majwlqo';
const DOMAIN = 'api-ak.vidssave.com';

module.exports = async (req, res) => {
  const url = req.query.url || req.body.url;
  const type = req.query.type || req.body.type || 'video';
  const quality = req.query.quality || req.body.quality || (type === 'audio' ? '128KBPS' : '720P');

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan."
    });
  }

  try {
    const cacheRes = await axios.post(API_URL,
      `auth=${AUTH}&domain=${DOMAIN}&origin=cache&link=${encodeURIComponent(url)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
        }
      }
    );

    let data = cacheRes.data;

    if (!data.data?.media || data.data.media.length === 0) {
      const sourceRes = await axios.post(API_URL,
        `auth=${AUTH}&domain=${DOMAIN}&origin=source&link=${encodeURIComponent(url)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          }
        }
      );
      data = sourceRes.data;
    }

    if (!data.data?.media || data.data.media.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Media tidak ditemukan"
      });
    }

    const mediaGroup = data.data.media.find(m => m.media_id === type);

    if (!mediaGroup || !mediaGroup.resources) {
      return res.status(400).json({
        status: false,
        message: `Tipe ${type} tidak tersedia`
      });
    }

    const allResources = mediaGroup.resources
      .filter(r => r.download_url)
      .map(r => ({
        quality: r.quality,
        format: r.format,
        url: r.download_url,
        size: r.size,
        size_mb: (r.size / (1024 * 1024)).toFixed(2) + ' MB'
      }))
      .sort((a, b) => {
        const aNum = parseInt(a.quality) || 0;
        const bNum = parseInt(b.quality) || 0;
        return bNum - aNum;
      });

    const selected = allResources.find(r => r.quality === quality) || allResources[0];

    const output = {
      title: data.data.title || 'YouTube Video',
      channel: data.data.user_item?.nickname || '',
      duration: data.data.duration + ' detik',
      thumbnail: data.data.media[0]?.thumbnail || data.data.thumbnail,
      type: type,
      downloads: allResources.map(r => ({
        url: r.url,
        quality: r.quality,
        format: r.format,
        size: r.size_mb
      }))
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
    const msg = error.response?.data ? JSON.stringify(error.response.data).slice(0, 500) : error.message;
    res.status(500).json({
      status: false,
      message: msg || "Terjadi kesalahan saat mendownload YouTube"
    });
  }
};