const axios = require('axios');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6',
  'Content-Type': 'application/json',
  'x-csrftoken': 'daaaed19c58a2787b0d6a23620be18e1',
  'Cookie': 'csrftoken=daaaed19c58a2787b0d6a23620be18e1; _auth=1'
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
    let finalUrl = url;
    if (/pin\.it/i.test(url)) {
      const r = await axios.head(url, { maxRedirects: 5 });
      finalUrl = r.request?.res?.responseUrl || r.config?.url;
    }

    const pinId = finalUrl.match(/\/pin\/(\d+)/)?.[1];

    if (!pinId) {
      return res.status(400).json({
        status: false,
        message: "URL Pinterest tidak valid"
      });
    }

    const [r1, r2] = await Promise.all([
      axios.post('https://id.pinterest.com/_/graphql/', {
        queryHash: '5444a9d6e1f023c6785830bbadc6f60fe2bb7a8775b86f77905d400cfb06991b',
        variables: { pinId, isAuth: true, isDesktop: false, isUnauth: false, shouldPrefetchStoryPinFragment: false, shouldSkipImageViewerOnPageQuery: true }
      }, { headers }),
      axios.post('https://id.pinterest.com/_/graphql/', {
        queryHash: 'a03317b3c9329575ec06fe3aeff2a3f194dae93a4eaaf4d16eab671fd2efd198',
        variables: { pinId, isAuth: true, isDesktop: false, isUnauth: false, shouldDefer: false, shouldFetchAIInsight: false, shouldShowSeoDrawerOption: false }
      }, { headers })
    ]);

    const a = r1.data?.data?.v3GetPinQueryv2?.data;
    const b = r2.data?.data?.v3GetPinQueryv2?.data;

    if (!a && !b) {
      return res.status(400).json({
        status: false,
        message: "Gagal mengambil data Pinterest"
      });
    }

    const username = b?.pinner?.username || a?.nativeCreator?.username || a?.pinner?.username || '';
    const fullName = b?.pinner?.fullName || b?.nativeCreator?.fullName || a?.closeupAttribution?.fullName || a?.nativeCreator?.fullName || '';
    const title = b?.title?.trim() || b?.closeupUnifiedDescription?.trim() || b?.description?.trim() || 'Pinterest Pin';
    const description = b?.description?.trim() || b?.closeupUnifiedDescription?.trim() || '';
    const likesCount = b?.totalReactionCount || 0;
    const commentCount = b?.aggregatedPinData?.commentCount || 0;
    const createdAt = b?.createdAt || '';

    const images = Object.keys(a || {}).filter(k => k.startsWith('images_')).map(k => ({ url: a[k]?.url || '', name: k.replace('images_', '') }));
    const video = b?.storyPinData?.pages?.[0]?.blocks?.[0]?.videoDataV2?.videoList720P?.v720P || b?.videos?.videoList?.v720P;

    const output = {
      title: title,
      username: username,
      fullName: fullName,
      description: description,
      likesCount: likesCount,
      commentCount: commentCount,
      createdAt: createdAt,
      downloads: []
    };

    if (images && images.length > 0) {
      images.forEach((img, i) => {
        if (img.url) {
          output.downloads.push({ url: img.url, quality: `Image ${i+1}`, type: 'image' });
        }
      });
    }

    if (video) {
      output.downloads.push({ url: video.url || video, quality: 'Video', type: 'video' });
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
      message: error.message || "Terjadi kesalahan saat mendownload Pinterest"
    });
  }
};