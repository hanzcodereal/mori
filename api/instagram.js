const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan"
    });
  }

  try {
    const data = new URLSearchParams();
    data.append('url', url);
    data.append('v', '3');
    data.append('lang', 'en');

    const response = await axios.post('https://api.downloadgram.org/media', data, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const $ = cheerio.load(response.data);
    const downloads = [];

    if ($('video').length) {
      const videoUrl = $('video source').attr('src');
      if (videoUrl) {
        downloads.push({ url: videoUrl, quality: 'Video', type: 'video' });
      }
      const poster = $('video').attr('poster');
      if (poster) {
        downloads.push({ url: poster, quality: 'Thumbnail', type: 'image' });
      }
    } else if ($('img').length) {
      const imgUrl = $('img').attr('src');
      if (imgUrl) {
        downloads.push({ url: imgUrl, quality: 'Image', type: 'image' });
      }
    } else {
      throw new Error("Media tidak ditemukan");
    }

    res.json({
      status: true,
      data: {
        title: 'Instagram Media',
        downloads: downloads
      }
    });

  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message || "Terjadi kesalahan"
    });
  }
};
