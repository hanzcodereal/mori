(function() {
  const toast = (msg) => {
    const e = document.createElement('div');
    e.className = 'custom-toast';
    e.textContent = msg;
    document.body.appendChild(e);
    setTimeout(() => e.classList.add('show'), 10);
    setTimeout(() => {
      e.classList.remove('show');
      setTimeout(() => e.remove(), 300);
    }, 2500);
  };

  const $ = id => document.getElementById(id);
  const urlInput = $('urlInput');
  const pasteBtn = $('pasteBtn');
  const clearBtn = $('clearBtn');
  const downloadBtn = $('downloadBtn');
  const loader = $('loader');
  const loaderText = $('loaderText');
  const resultSection = $('resultSection');
  const resultTitle = $('resultTitle');
  const downloadList = $('downloadList');
  const closeResult = $('closeResult');
  const slidesWrapper = $('slidesWrapper');
  const sliderNav = $('sliderNav');
  const slidePrev = $('slidePrevBtn');
  const slideNext = $('slideNextBtn');
  const slideIndicator = $('slideIndicator');
  const infoOverlay = $('infoOverlay');
  const closeInfo = $('closeInfoModal');
  const infoTitle = $('infoTitle');
  const infoMessage = $('infoMessage');
  const progressContainer = $('progressContainer');
  const progressBar = $('progressBar');

  let slideItems = [];
  let curSlide = 0;
  let progressTimer = null;

  function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getFileExtension(url) {
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop().toLowerCase();
    const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'm4a', 'wav', 'flac', 'm4v', 'mov', 'avi'];
    return validExt.includes(ext) ? ext : '';
  }

  function generateFilename(title, quality, type, url) {
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    const timestamp = getTimestamp();
    const ext = getFileExtension(url) || (type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'jpg');
    const qualityLabel = quality.replace(/\s+/g, '_').toLowerCase();
    return `${cleanTitle}_${qualityLabel}_${timestamp}.${ext}`;
  }

  pasteBtn.onclick = async () => {
    try {
      const text = await navigator.clipboard?.readText?.() || '';
      if (text && text.trim()) {
        urlInput.value = text.trim();
        urlInput.dispatchEvent(new Event('input'));
        toast('Link pasted');
      } else {
        toast('Clipboard is empty');
      }
    } catch {
      toast('Cannot read clipboard');
    }
  };

  clearBtn.onclick = () => {
    urlInput.value = '';
    clearBtn.classList.add('hidden');
  };

  urlInput.oninput = () => {
    clearBtn.classList.toggle('hidden', !urlInput.value);
  };

  closeResult.onclick = () => {
    resultSection.classList.add('hidden');
  };

  const getPlatform = (url) => {
    const u = url.toLowerCase();
    if (u.includes('tiktok.com') || u.includes('vt.tiktok.com')) return 'tiktok';
    if (u.includes('facebook.com') || u.includes('fb.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.includes('spotify.com')) return 'spotify';
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('music.apple.com') || u.includes('apple.com/music')) return 'applemusic';
    if (u.includes('threads.net') || u.includes('threads.com') || u.includes('threads')) return 'threads';
    if (u.includes('pin.it') || u.includes('pinterest.com')) return 'pinterest';
    return null;
  };

  const platformLabels = {
    tiktok: 'TikTok',
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    spotify: 'Spotify',
    youtube: 'YouTube',
    applemusic: 'Apple Music',
    threads: 'Threads',
    pinterest: 'Pinterest'
  };

  function startProgress() {
    if (!progressContainer || !progressBar) return;
    progressContainer.classList.remove('hidden');
    let pct = 0;
    progressBar.style.width = '0%';
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      pct += (90 - pct) * 0.1 + 1;
      if (pct > 90) pct = 90;
      progressBar.style.width = pct + '%';
    }, 200);
  }

  function finishProgress(success) {
    if (!progressContainer || !progressBar) return;
    clearInterval(progressTimer);
    progressBar.style.width = success ? '100%' : progressBar.style.width;
    setTimeout(() => {
      progressContainer.classList.add('hidden');
      progressBar.style.width = '0%';
    }, success ? 400 : 0);
  }

  downloadBtn.onclick = async () => {
    const url = urlInput.value.trim();
    if (!url) {
      toast('Paste a link first');
      return;
    }

    const platform = getPlatform(url);
    if (!platform) {
      toast('Unsupported platform');
      return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Processing...';
    loader.classList.remove('hidden');
    resultSection.classList.add('hidden');
    if (loaderText) loaderText.textContent = `Analyzing ${platformLabels[platform] || 'link'}...`;
    startProgress();

    try {
      const response = await fetch(`/api/${platform}?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!data.status) {
        throw new Error(data.message || 'Download failed');
      }

      const payload = data.data || data.result;
      if (!payload || !payload.downloads || !payload.downloads.length) {
        throw new Error('No downloadable media found');
      }

      finishProgress(true);
      renderResult(payload);
      toast('Media loaded successfully');
    } catch (error) {
      finishProgress(false);
      toast('Error: ' + error.message);
      loader.classList.add('hidden');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Analyze';
    }
  };

  function buildSlideItems(data) {
    const imageDownloads = (data.downloads || []).filter(d => d.type === 'image');
    if (imageDownloads.length) {
      return imageDownloads.map(d => d.url);
    }
    if (data.thumbnail) {
      return [data.thumbnail];
    }
    return [];
  }

  function renderResult(data) {
    loader.classList.add('hidden');
    resultSection.classList.remove('hidden');

    let title = (data.title || 'Content').replace(/#[^\s#]+/g, '').trim();
    if (data.username && !title.includes(data.username)) {
      title = `${title} - @${data.username}`;
    }
    resultTitle.textContent = title.slice(0, 80);

    downloadList.innerHTML = '';
    slidesWrapper.innerHTML = '';
    curSlide = 0;

    slideItems = buildSlideItems(data);
    if (slideItems.length) {
      slideItems.forEach((src, i) => {
        const s = document.createElement('div');
        s.className = `preview-slide ${i === 0 ? 'active' : ''}`;
        const img = document.createElement('img');
        img.src = src;
        img.referrerPolicy = 'no-referrer';
        img.style.width = '100%';
        img.onerror = () => { s.remove(); };
        s.appendChild(img);
        slidesWrapper.appendChild(s);
      });
      if (slideItems.length > 1) {
        sliderNav.classList.remove('hidden');
        slideIndicator.textContent = `1/${slideItems.length}`;
      } else {
        sliderNav.classList.add('hidden');
      }
    } else {
      sliderNav.classList.add('hidden');
    }

    const downloads = data.downloads || [];
    if (!downloads.length) {
      const msg = document.createElement('div');
      msg.className = 'dl-empty';
      msg.textContent = 'No download link available for this content.';
      downloadList.appendChild(msg);
    } else {
      downloads.forEach((dl) => {
        const btn = document.createElement('button');
        btn.className = 'dl-item';
        const label = dl.quality || dl.type || 'Media';
        btn.innerHTML = `<div>${label}</div><span>${dl.type || 'Media'}</span>`;
        btn.onclick = () => {
          if (dl.url) {
            const filename = generateFilename(title, label, dl.type, dl.url);
            downloadFile(dl.url, filename);
            toast('Download started: ' + label);
          } else {
            toast('Download link unavailable');
          }
        };
        downloadList.appendChild(btn);
      });
    }

    resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  function updateSlider() {
    const slides = slidesWrapper.querySelectorAll('.preview-slide');
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === curSlide);
    });
    slideIndicator.textContent = `${curSlide + 1}/${slideItems.length || 1}`;
    slidePrev.disabled = curSlide === 0;
    slideNext.disabled = curSlide >= slideItems.length - 1;
  }

  slidePrev.onclick = () => {
    if (curSlide > 0) {
      curSlide--;
      updateSlider();
    }
  };

  slideNext.onclick = () => {
    if (curSlide < slideItems.length - 1) {
      curSlide++;
      updateSlider();
    }
  };

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const example = chip.dataset.example || '';
      if (example) {
        urlInput.value = example;
        urlInput.dispatchEvent(new Event('input'));
        toast(`Example: ${chip.querySelector('span').textContent}`);
        urlInput.focus();
      }
    });
  });

  if (closeInfo) closeInfo.onclick = () => infoOverlay.classList.add('hidden');
  if (infoOverlay) {
    infoOverlay.onclick = (e) => {
      if (e.target === infoOverlay) infoOverlay.classList.add('hidden');
    };
  }

  window.showInfo = (title, message) => {
    infoTitle.textContent = title;
    infoMessage.innerHTML = message;
    infoOverlay.classList.remove('hidden');
  };
})();