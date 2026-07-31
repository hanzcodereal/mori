const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');

async function getFdownTokens() {
  const { data } = await axios.get('https://fdown.net', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0'
    }
  });
  const $ = cheerio.load(data);
  return {
    token_v: $('input[name="token_v"]').val(),
    token_c: $('input[name="token_c"]').val(),
    token_h: $('input[name="token_h"]').val()
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
    const tokens = await getFdownTokens();
    const postData = qs.stringify({
      'URLz': url,
      'token_v': tokens.token_v,
      'token_c': tokens.token_c,
      'token_h': tokens.token_h
    });

    const { data } = await axios.post('https://fdown.net/download.php', postData, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'referer': 'https://fdown.net/'
      }
    });

    const $ = cheerio.load(data);

    if ($('.alert-danger').length > 0) {
      throw new Error("Video tidak ditemukan atau URL tidak valid");
    }

    const title = $('.lib-row.lib-header').text().trim() || "Facebook Video";
    const sdLink = $('#sdlink').attr('href');
    const hdLink = $('#hdlink').attr('href');

    const downloads = [];
    if (hdLink) downloads.push({ url: hdLink, quality: 'HD', type: 'video' });
    if (sdLink) downloads.push({ url: sdLink, quality: 'SD', type: 'video' });

    if (!downloads.length) {
      throw new Error("Media tidak ditemukan atau URL tidak valid");
    }

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