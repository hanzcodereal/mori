const axios = require('axios');

const headers = {
  'host': 'api-v1.menarailpost.com',
  'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
  'sec-ch-ua-platform': '"Android"',
  'sec-ch-ua-mobile': '?1',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'content-type': 'application/json',
  'accept': '*/*',
  'origin': 'https://ssstweet.com',
  'sec-fetch-site': 'cross-site',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'referer': 'https://ssstweet.com/',
  'accept-language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
};

module.exports = async (req, res) => {
  const url = req.query.url || req.body.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan."
    });
  }

  try {
    const response = await axios.post('https://api-v1.menarailpost.com/v1/info', { url }, { headers });
    const data = response.data;

    if (!data || data.status === false) {
      return res.status(400).json({
        status: false,
        message: "Gagal mengambil data Twitter/X"
      });
    }

    const output = {
      title: data.title || 'Twitter/X Video',
      username: data.author?.username || '',
      nickname: data.author?.name || '',
      avatar: data.author?.avatar || '',
      thumbnail: data.thumbnail || '',
      type: data.type || 'video',
      downloads: []
    };

    if (data.url) {
      output.downloads.push({ url: data.url, quality: 'Normal', type: data.type || 'video' });
    }

    if (data.url_hd) {
      output.downloads.push({ url: data.url_hd, quality: 'HD', type: 'video' });
    }

    if (data.url_audio) {
      output.downloads.push({ url: data.url_audio, quality: 'Audio', type: 'audio' });
    }

    if (data.images && data.images.length > 0) {
      data.images.forEach((img, i) => {
        output.downloads.push({ url: img, quality: `Image ${i+1}`, type: 'image' });
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
      message: error.message || "Terjadi kesalahan saat mendownload Twitter/X"
    });
  }
};