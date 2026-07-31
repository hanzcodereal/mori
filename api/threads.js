const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  const url = req.query.url || req.body.url;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' diperlukan."
    });
  }

  try {
    const get = await axios.get('https://sssthreads.net/');
    const cookies = get.headers['set-cookie'].map(v => v.split(';')[0]).join('; ');
    const $get = cheerio.load(get.data);
    const csrf = $get('meta[name="csrf-token"]').attr('content');

    const response = await axios.post('https://sssthreads.net/fetch-data', { url },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf,
          origin: 'https://sssthreads.net',
          referer: 'https://sssthreads.net/',
          Cookie: cookies
        }
      }
    );

    const $ = cheerio.load(response.data.html);

    const username = $('.author-name').text().trim() || '';
    const avatar = $('.author-avatar').attr('src') || '';
    const caption = $('.post-description').text().trim() || '';

    const output = {
      title: caption || 'Threads Post',
      username: username,
      avatar: avatar,
      caption: caption,
      downloads: []
    };

    $('.media-item').each((_, el) => {
      const thumb = $(el).find('.thumbnail-img').attr('data-src') || null;

      const links = $(el).find('.download-link');
      let video = null;
      let mp3 = null;
      let image = null;

      links.each((__, a) => {
        const href = $(a).attr('href');
        const text = $(a).text().toLowerCase();

        if (text.includes('video')) video = href;
        else if (text.includes('mp3')) mp3 = href;
        else if (text.includes('photo')) image = href;
      });

      if (video) {
        output.downloads.push({ url: video, quality: 'Video', type: 'video', thumbnail: thumb });
        if (mp3) {
          output.downloads.push({ url: mp3, quality: 'Audio', type: 'audio' });
        }
      } else if (image) {
        output.downloads.push({ url: image, quality: 'Image', type: 'image', thumbnail: thumb });
      }
    });

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
      message: error.message || "Terjadi kesalahan saat mendownload Threads"
    });
  }
};