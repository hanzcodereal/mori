const axios = require('axios');
const cheerio = require('cheerio');

async function getToken() {
  const r = await axios.get('https://ssstwitter.com/en-11', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
    }
  });
  const $ = cheerio.load(r.data);
  const f = $('form[data-hx-post]');
  const v = f.attr('include-vals');
  if (!v) {
    throw new Error('Gagal mengambil token, layanan mungkin sedang berubah');
  }
  const m = v.match(/tt:'([^']+)',ts:(\d+),source:'([^']+)'/);
  if (!m) {
    throw new Error('Gagal membaca token dari layanan');
  }
  return { tt: m[1], ts: parseInt(m[2]), source: m[3] };
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
    const token = await getToken();
    const formData = new URLSearchParams();
    formData.append('id', url);
    formData.append('locale', 'en');
    formData.append('tt', token.tt);
    formData.append('ts', token.ts.toString());
    formData.append('source', token.source);

    const response = await axios.post('https://ssstwitter.com/', formData, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'HX-Request': 'true',
        'HX-Current-URL': 'https://ssstwitter.com/en-11',
        'HX-Target': 'target',
        'Referer': 'https://ssstwitter.com/en-11'
      }
    });

    const $ = cheerio.load(response.data);
    const downloads = [];

    $('.download-btn').each((i, el) => {
      const link = $(el).attr('href') || $(el).attr('data-directurl');
      const text = $(el).text().trim();
      if (link && link.startsWith('http')) {
        let quality = text.replace(/Download\s*/i, '').trim() || 'Video';
        downloads.push({ url: link, quality: quality, type: 'video' });
      }
    });

    if (!downloads.length) {
      throw new Error("Media tidak ditemukan atau URL tidak valid");
    }

    const title = $('.result-title').text().trim() || 'Twitter/X Video';

    res.json({
      status: true,
      data: {
        title: title,
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