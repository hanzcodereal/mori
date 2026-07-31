const axios = require('axios');

module.exports = async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan."
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('url', url);
    params.append('hd', '1');

    const response = await axios.post('https://www.tikwm.com/api/', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = response.data;

    if (data.code !== 0 || !data.data) {
      return res.status(400).json({
        status: false,
        message: "Gagal mengambil data TikTok"
      });
    }

    const result = data.data;
    const isPhoto = result.images && result.images.length > 0;

    const output = {
      title: result.title || 'TikTok Video',
      username: result.author?.unique_id || '',
      nickname: result.author?.nickname || '',
      avatar: result.author?.avatar || '',
      thumbnail: result.cover || '',
      type: isPhoto ? 'photo' : 'video',
      downloads: []
    };

    if (!isPhoto) {
      if (result.play) {
        output.downloads.push({ url: result.play, quality: 'No Watermark', type: 'video' });
      }
      if (result.wmplay) {
        output.downloads.push({ url: result.wmplay, quality: 'With Watermark', type: 'video' });
      }
    }

    if (result.music) {
      output.downloads.push({ url: result.music, quality: 'Audio', type: 'audio' });
    }

    if (isPhoto && result.images) {
      result.images.forEach((img, i) => {
        output.downloads.push({ url: img, quality: `Photo ${i+1}`, type: 'image' });
      });
    }

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
      message: error.message || "Terjadi kesalahan saat mendownload TikTok"
    });
  }
};