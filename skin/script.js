/* =========================================================
   3477 simple skin - IF  ·  script.js
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  var safeStorage = {
    get: function (key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* 저장소가 막혀 있어도 나머지 기능은 동작합니다. */ }
    }
  };

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function getConfig() {
    var el = document.getElementById('skin-config');
    return (el && el.dataset) || {};
  }

  /* 유튜브 주소에서 영상 ID 추출 */
  function getYouTubeVideoId(value) {
    if (!value) return '';
    var text = String(value).trim();
    var match = text.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^\s#]*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/i);
    return match ? match[1] : '';
  }
  window.getYouTubeVideoId = getYouTubeVideoId;

  /* 플레이리스트 커버: 영상 + 가사 펼치기 */
  window.openPlaylistPlayer = function (btn) {
    var container = btn.nextElementSibling;
    if (!container) return;

    if (container.style.display === 'block') {
      container.style.display = 'none';
      container.replaceChildren();
      return;
    }

    var rawUrl = btn.getAttribute('data-url') || '';
    var rawSummary = btn.getAttribute('data-summary') || '';
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawSummary;
    var summaryText = tempDiv.innerText || tempDiv.textContent || '';
    var videoId = getYouTubeVideoId(rawUrl);
    var lyrics = summaryText;

    if (!videoId) {
      videoId = getYouTubeVideoId(summaryText);
      if (videoId) lyrics = summaryText.replace(/https?:\/\/\S+/i, '').trim();
    }

    container.replaceChildren();

    if (videoId) {
      var embedWrap = document.createElement('div');
      embedWrap.className = 'yt-embed-wrap';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + videoId;
      iframe.title = 'YouTube 동영상 플레이어';
      iframe.loading = 'lazy';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      embedWrap.appendChild(iframe);
      container.appendChild(embedWrap);
    } else if (/^https?:\/\//i.test(rawUrl)) {
      var opened = window.open(rawUrl, '_blank', 'noopener,noreferrer');
      if (opened) opened.opener = null;
      return;
    }

    if (lyrics.trim() !== '') {
      var lyricsEl = document.createElement('div');
      lyricsEl.className = 'pl-lyrics';
      lyricsEl.textContent = lyrics;
      container.appendChild(lyricsEl);
    }

    if (container.childElementCount > 0) container.style.display = 'block';
  };

  /* 토스트 */
  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  /* 화면 잠금 (서랍·검색창이 열렸을 때) */
  var locks = 0;
  var hasGutter = !!(window.CSS && CSS.supports && CSS.supports('scrollbar-gutter', 'stable'));
  function lockScroll(on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    var lock = locks > 0;
    if (lock === document.body.classList.contains('no-scroll')) return;
    /* scrollbar-gutter 미지원 브라우저: 사라지는 스크롤바 폭만큼 채워서 화면이 밀리지 않게 */
    if (!hasGutter) {
      var bar = window.innerWidth - document.documentElement.clientWidth;
      root.style.setProperty('--scrollbar-comp', lock && bar > 0 ? bar + 'px' : '0px');
    }
    document.body.classList.toggle('no-scroll', lock);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var cfg = getConfig();
    var bodyId = document.body.id || '';
    var path = decodeURIComponent(window.location.pathname.replace(/\/+$/, '')) || '/';

    /* ---------- 0. 페이지 종류 · 프레임 ---------- */
    var isHome = bodyId === 'tt-body-index' || path === '/';
    var hasCover = !!document.querySelector('.cover-stack');
    var browserBody = document.getElementById('browser-body');
    var frameHasContent = !!(browserBody && browserBody.children.length);

    root.classList.toggle('is-home', isHome);
    root.classList.toggle('home-has-cover', isHome && hasCover);
    if (!frameHasContent) $('.browser-frame') && $('.browser-frame').classList.add('is-empty');
    if (cfg.frame === 'on' && !isHome && frameHasContent) root.classList.add('framed');
    if (cfg.excerpt === 'on') root.classList.add('show-excerpt');

    /* ---------- 1. 라이트 / 다크 ---------- */
    var themeButtons = $$('.theme-toggle');
    var updateThemeButtons = function () {
      var isDark = root.getAttribute('data-mode') === 'dark';
      themeButtons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
        btn.title = isDark ? '라이트 모드' : '다크 모드';
      });
    };
    updateThemeButtons();
    themeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-mode', next);
        safeStorage.set('theme', next);
        updateThemeButtons();
      });
    });

    /* ---------- 2. 서랍 메뉴 ---------- */
    var drawer = document.getElementById('sidebar');
    var overlay = document.getElementById('dimmed-overlay');
    var menuButtons = $$('.menu-open');
    var lastFocus = null;

    var setMenuOpen = function (isOpen) {
      if (!drawer || !overlay) return;
      if (drawer.classList.contains('open') === isOpen) return;
      drawer.classList.toggle('open', isOpen);
      overlay.classList.toggle('active', isOpen);
      drawer.setAttribute('aria-hidden', String(!isOpen));
      menuButtons.forEach(function (b) { b.setAttribute('aria-expanded', String(isOpen)); });
      lockScroll(isOpen);
      if (isOpen) {
        window.dispatchEvent(new Event('skin:draweropen'));
        lastFocus = document.activeElement;
        var closeBtn = document.getElementById('drawer-close');
        if (closeBtn) closeBtn.focus({ preventScroll: true });
      } else if (lastFocus && lastFocus.focus) {
        lastFocus.focus({ preventScroll: true });
      }
    };
    menuButtons.forEach(function (b) { b.addEventListener('click', function () { setMenuOpen(true); }); });
    if (overlay) overlay.addEventListener('click', function () { setMenuOpen(false); });
    var drawerClose = document.getElementById('drawer-close');
    if (drawerClose) drawerClose.addEventListener('click', function () { setMenuOpen(false); });

    /* 링크 섹션: 모두 비어 있으면 숨김 */
    var linkSection = $('.drawer-link-section');
    if (linkSection) {
      var visibleLinks = $$('.drawer-links a', linkSection).filter(function (a) {
        var href = (a.getAttribute('href') || '').trim();
        return href && href !== '#' && a.textContent.trim();
      });
      if (!visibleLinks.length) linkSection.classList.add('is-empty');
    }

    /* 로그인 / 관리 / 글쓰기 */
    var renderAccount = function () {
      var box = document.getElementById('drawer-account');
      if (!box) return;
      var role = (window.T && window.T.config && window.T.config.ROLE) ? window.T.config.ROLE : '';
      var isLogin = role !== '' && role !== 'none' && role !== 'guest';
      var here = encodeURIComponent(window.location.href);
      var html = '';
      if (role === 'owner' || role === 'admin' || role === 'editor') {
        html += '<a href="/manage/newpost"><i class="fa-solid fa-pen"></i> 글쓰기</a>';
        html += '<a href="/manage"><i class="fa-solid fa-gear"></i> 관리</a>';
      }
      html += isLogin
        ? '<a href="https://www.tistory.com/auth/logout?redirectUrl=' + here + '"><i class="fa-solid fa-right-from-bracket"></i> 로그아웃</a>'
        : '<a href="https://www.tistory.com/auth/login?redirectUrl=' + here + '"><i class="fa-solid fa-right-to-bracket"></i> 로그인</a>';
      box.innerHTML = html;
    };
    renderAccount();
    setTimeout(renderAccount, 300);

    /* ---------- 3. 카테고리 ---------- */
    var categoryIcons = {};
    String(cfg.categoryIcons || '').split('|').forEach(function (pair) {
      var idx = pair.indexOf('=');
      if (idx < 1) return;
      var name = pair.slice(0, idx).trim();
      var icon = pair.slice(idx + 1).trim();
      if (name && icon) categoryIcons[name.toLowerCase()] = icon;
    });
    var iconFor = function (name, fallback) {
      return categoryIcons[String(name || '').trim().toLowerCase()] || fallback;
    };

    var catRoot = $('.drawer-cats');
    if (catRoot) {
      $$('.category_list li', catRoot).forEach(function (li) {
        var a = li.querySelector(':scope > a');
        if (!a) return;
        var isSub = !!li.closest('.sub_category_list');
        var cnt = a.querySelector('.c_cnt');
        var count = cnt ? cnt.textContent.replace(/[()\s]/g, '') : '';
        var isNew = !!a.querySelector('img');
        var name = '';
        a.childNodes.forEach(function (node) { if (node.nodeType === 3) name += node.textContent; });
        name = name.trim();

        a.textContent = '';
        var icon = document.createElement('i');
        icon.className = 'cat-icon ' + iconFor(name, isSub ? 'fa-solid fa-hashtag' : 'fa-solid fa-folder');
        var nameEl = document.createElement('span');
        nameEl.className = 'cat-name';
        nameEl.textContent = name;
        a.appendChild(icon);
        a.appendChild(nameEl);
        if (isNew) {
          var badge = document.createElement('span');
          badge.className = 'cat-new';
          badge.textContent = 'N';
          a.appendChild(badge);
        }
        if (count !== '') {
          var countEl = document.createElement('span');
          countEl.className = 'cat-count';
          countEl.textContent = count;
          a.appendChild(countEl);
        }

        var linkPath = '';
        try { linkPath = decodeURIComponent(new URL(a.href, window.location.href).pathname.replace(/\/+$/, '')); } catch (e) {}
        if (linkPath && linkPath === path) {
          a.classList.add('active');
          var parentLi = li.parentElement && li.parentElement.closest('li');
          if (parentLi) parentLi.classList.add('open');
        }

        var subList = li.querySelector(':scope > ul');
        if (subList) {
          var toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'cat-toggle';
          toggle.setAttribute('aria-label', name + ' 하위 카테고리 펼치기');
          toggle.setAttribute('aria-expanded', String(li.classList.contains('open')));
          toggle.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
          a.insertAdjacentElement('afterend', toggle);
          toggle.addEventListener('click', function (e) {
            e.preventDefault();
            var open = li.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
          });
        }
      });
      $$('.category_list > li.open > .cat-toggle', catRoot).forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });
    }

    /* ---------- 4. 하단 메뉴 · 메뉴 타일 활성 표시 ---------- */
    var markActive = function (links) {
      links.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#') return;
        var target = '';
        try { target = decodeURIComponent(new URL(href, window.location.href).pathname.replace(/\/+$/, '')) || '/'; } catch (e) { return; }
        var active = target === '/' ? path === '/' : (path === target || path.indexOf(target + '/') === 0);
        a.classList.toggle('active', active);
      });
    };
    markActive($$('.bottom-nav a'));
    markActive($$('.drawer-tile'));

    /* ---------- 5. 검색 시트 ---------- */
    var sheet = document.getElementById('search-sheet');
    var sheetInput = document.getElementById('search-sheet-input');
    var sheetForm = document.getElementById('search-sheet-form');
    var setSearchOpen = function (open) {
      if (!sheet || sheet.classList.contains('open') === open) return;
      setMenuOpen(false);
      sheet.classList.toggle('open', open);
      sheet.setAttribute('aria-hidden', String(!open));
      lockScroll(open);
      if (open) {
        var tagBox = document.getElementById('search-sheet-tags');
        if (tagBox && !tagBox.childElementCount) {
          $$('.tagcloud-cover-wrap .tag-cloud a, .tag-page .tag-cloud a').slice(0, 12).forEach(function (t) {
            var link = document.createElement('a');
            link.href = t.href;
            link.textContent = '#' + t.textContent.replace(/^#/, '').trim();
            tagBox.appendChild(link);
          });
        }
        setTimeout(function () { sheetInput && sheetInput.focus(); }, 60);
      }
    };
    $$('.search-open').forEach(function (b) { b.addEventListener('click', function () { setSearchOpen(true); }); });
    $$('a[href="#search"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); setSearchOpen(true); });
    });
    if (sheet) $$('[data-close]', sheet).forEach(function (el) { el.addEventListener('click', function () { setSearchOpen(false); }); });
    if (sheetForm) {
      sheetForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = (sheetInput.value || '').trim();
        if (q) window.location.href = '/search/' + encodeURIComponent(q);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (sheet && sheet.classList.contains('open')) setSearchOpen(false);
      else if (drawer && drawer.classList.contains('open')) setMenuOpen(false);
    });

    /* ---------- 6. 브라우저 바 ---------- */
    var urlBtn = document.getElementById('browser-url');
    if (urlBtn) {
      var shown = window.location.host + decodeURIComponent(window.location.pathname);
      if (window.location.search) shown += decodeURIComponent(window.location.search);
      urlBtn.querySelector('span').textContent = shown.replace(/\/$/, '');
      urlBtn.addEventListener('click', function () {
        var href = window.location.href;
        var done = function () { toast('주소를 복사했어요'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(href).then(done, function () { window.prompt('주소를 복사하세요', href); });
        } else {
          window.prompt('주소를 복사하세요', href);
        }
      });
    }
    var backBtn = document.getElementById('browser-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        var sameSite = document.referrer && document.referrer.indexOf(window.location.host) !== -1;
        if (sameSite && window.history.length > 1) window.history.back();
        else window.location.href = '/';
      });
    }

    /* ---------- 7. 상단 바 ---------- */
    var topbar = $('.topbar');
    if (topbar) {
      var scrolled = false;
      var ticking = false;
      var update = function () {
        ticking = false;
        var on = window.scrollY > 24;
        if (on !== scrolled) { scrolled = on; topbar.classList.toggle('scrolled', on); }
      };
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      }, { passive: true });
      update();
    }

    /* ---------- 7-1. 떠 있는 스크롤바 (마우스 환경) ---------- */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      root.classList.add('custom-scrollbar');
      var sbBox = document.createElement('div');
      sbBox.className = 'page-scrollbar';
      sbBox.setAttribute('aria-hidden', 'true');
      var sbThumb = document.createElement('div');
      sbThumb.className = 'page-scrollbar-thumb';
      sbBox.appendChild(sbThumb);
      document.body.appendChild(sbBox);

      var docH = 0, viewH = 0, thumbH = 0, sbTick = false;
      var sbMeasure = function () {
        docH = document.documentElement.scrollHeight;
        viewH = window.innerHeight;
        var scrollable = docH > viewH + 1;
        sbBox.classList.toggle('is-hidden', !scrollable);
        if (!scrollable) return;
        thumbH = Math.max(40, viewH * viewH / docH);
        sbThumb.style.height = thumbH + 'px';
      };
      var sbPaint = function () {
        sbTick = false;
        var range = docH - viewH;
        if (range <= 0) return;
        var y = Math.min(Math.max(window.scrollY / range, 0), 1) * (viewH - thumbH);
        sbThumb.style.transform = 'translateY(' + y + 'px)';
      };
      var sbQueue = function () { if (!sbTick) { sbTick = true; requestAnimationFrame(sbPaint); } };
      var sbRefresh = function () { sbMeasure(); sbQueue(); };
      sbRefresh();
      window.addEventListener('scroll', sbQueue, { passive: true });
      window.addEventListener('resize', sbRefresh, { passive: true });
      window.addEventListener('load', sbRefresh);
      if (window.ResizeObserver) new ResizeObserver(sbRefresh).observe(document.body);

      var dragStartY = 0, dragStartScroll = 0;
      sbThumb.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        sbMeasure();
        dragStartY = e.clientY;
        dragStartScroll = window.scrollY;
        sbThumb.setPointerCapture(e.pointerId);
        sbBox.classList.add('dragging');
        root.classList.add('scrollbar-dragging');
      });
      sbThumb.addEventListener('pointermove', function (e) {
        if (!sbBox.classList.contains('dragging')) return;
        var ratio = (docH - viewH) / Math.max(1, viewH - thumbH);
        window.scrollTo(0, dragStartScroll + (e.clientY - dragStartY) * ratio);
      });
      var sbEnd = function () {
        sbBox.classList.remove('dragging');
        root.classList.remove('scrollbar-dragging');
      };
      sbThumb.addEventListener('pointerup', sbEnd);
      sbThumb.addEventListener('pointercancel', sbEnd);
    }

    /* ---------- 8. 목록 ---------- */
    var viewStyles = ['list', 'gallery', 'memo'];
    $$('.post-content-wrap').forEach(function (wrap) {
      var categoryStyle = (wrap.dataset.listStyle || '').trim();
      var defaultStyle = viewStyles.filter(function (s) { return wrap.classList.contains(s); })[0] || 'list';
      var selected = viewStyles.indexOf(categoryStyle) !== -1 ? categoryStyle : defaultStyle;
      viewStyles.forEach(function (s) { wrap.classList.remove(s); });
      wrap.classList.add(selected);
      if (!wrap.querySelector('.post-item')) wrap.style.display = 'none';
    });

    $$('.post-item').forEach(function (item) {
      var summary = item.querySelector('.post-excerpt');
      var text = summary ? summary.textContent : '';
      if (/보호되어 있는 글|보호된 글/.test(text)) item.classList.add('locked');
      if (!item.querySelector('.post-thumb')) item.classList.add('no-thumb');
    });

    /* 목록 제목 아이콘 */
    var listIcon = $('.list-icon');
    if (listIcon) {
      var iconClass = 'fa-solid fa-folder-open';
      if (/^\/tag\//.test(path)) iconClass = 'fa-solid fa-hashtag';
      else if (/^\/search\//.test(path)) iconClass = 'fa-solid fa-magnifying-glass';
      else if (/^\/archive\//.test(path)) iconClass = 'fa-regular fa-calendar';
      else if (/^\/category/.test(path)) {
        var segs = path.split('/').slice(2).reverse();
        for (var i = 0; i < segs.length; i++) {
          var found = iconFor(segs[i], '');
          if (found) { iconClass = found; break; }
        }
      }
      listIcon.className = iconClass + ' list-icon';
    }

    /* 본문 카테고리 아이콘 */
    $$('.article-category').forEach(function (a) {
      var icon = a.querySelector('.article-cat-icon');
      var label = a.querySelector('span');
      if (!icon || !label) return;
      var parts = label.textContent.split('/').map(function (s) { return s.trim(); }).reverse();
      for (var j = 0; j < parts.length; j++) {
        var found = iconFor(parts[j], '');
        if (found) { icon.className = found + ' article-cat-icon'; return; }
      }
    });

    /* 글 태그: 쉼표 제거 */
    $$('.article-tags').forEach(function (box) {
      Array.prototype.slice.call(box.childNodes).forEach(function (node) {
        if (node.nodeType === 3) node.remove();
      });
    });

    /* 태그 모음 개수 */
    var tagCount = $('.tag-count');
    if (tagCount) tagCount.textContent = $$('.tag-page .tag-cloud li').length;

    /* 위젯 제목: 커버 이름이 비어 있으면 기본 이름 */
    $$('.widget-title[data-default]').forEach(function (h) {
      var span = h.querySelector('span');
      if (span && !span.textContent.trim()) span.textContent = h.getAttribute('data-default');
    });

    /* ---------- 9. 날짜에서 시간 제거 ---------- */
    $$('.post-date, .article-date, .comment-date, .rel-date').forEach(function (el) {
      var text = el.textContent.trim();
      var m = text.match(/^(\d{4}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}\.?).*$/);
      el.textContent = m ? m[1].replace(/\s+/g, ' ').trim() : text.replace(/\s+\d{1,2}:\d{2}(?::\d{2})?\s*$/, '');
    });

    /* ---------- 10. 페이지 번호 ---------- */
    var paging = $('.paging');
    if (paging) {
      var nums = $$('.paging-nums a', paging);
      var current = nums.filter(function (l) {
        return l.classList.contains('selected') || !!l.querySelector('.selected') || l.getAttribute('aria-current') === 'page';
      })[0];
      if (!current && nums.length) {
        var qp = parseInt(new URL(window.location.href).searchParams.get('page'), 10);
        var pm = window.location.pathname.match(/\/page\/(\d+)/);
        var cur = isFinite(qp) ? qp : (pm ? parseInt(pm[1], 10) : 1);
        current = nums.filter(function (l) { return parseInt(l.textContent.trim(), 10) === cur; })[0];
      }
      nums.forEach(function (l) {
        var label = l.textContent.trim();
        if (/^\d+$/.test(label)) l.setAttribute('aria-label', label + '페이지');
      });
      if (current) { current.classList.add('is-current'); current.setAttribute('aria-current', 'page'); }
      $$('.no-more-prev, .no-more-next', paging).forEach(function (l) {
        l.removeAttribute('href');
        l.setAttribute('aria-disabled', 'true');
        l.setAttribute('tabindex', '-1');
      });
      if (nums.length <= 1 && $$('.paging-arrow[aria-disabled="true"]', paging).length === 2) paging.style.display = 'none';
    }

    /* ---------- 11. 배너 슬라이드 ---------- */
    $$('.banner-widget').forEach(function (wrap) {
      var track = wrap.querySelector('.banner-track');
      var slides = track ? $$('.banner-slide', track) : [];
      var dotsBox = wrap.querySelector('.banner-dots');
      if (slides.length <= 1) { wrap.classList.add('is-static'); return; }

      var index = 0;
      var dots = slides.map(function () {
        var dot = document.createElement('span');
        dotsBox.appendChild(dot);
        return dot;
      });
      var go = function (n) {
        index = (n + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        dots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
      };
      go(0);
      wrap.querySelector('.banner-btn.prev').addEventListener('click', function () { go(index - 1); restart(); });
      wrap.querySelector('.banner-btn.next').addEventListener('click', function () { go(index + 1); restart(); });

      var timer = null;
      var paused = false;
      var visible = true;
      if (window.IntersectionObserver) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(wrap);
      }
      var restart = function () {
        clearInterval(timer);
        timer = setInterval(function () { if (!paused && visible && !document.hidden) go(index + 1); }, 5000);
      };
      wrap.addEventListener('mouseenter', function () { paused = true; });
      wrap.addEventListener('mouseleave', function () { paused = false; });
      restart();

      var startX = null;
      var moved = false;
      track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; moved = false; }, { passive: true });
      track.addEventListener('touchmove', function (e) {
        if (startX !== null && Math.abs(e.touches[0].clientX - startX) > 8) moved = true;
      }, { passive: true });
      track.addEventListener('touchend', function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
        startX = null;
      });
      track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    });

    /* ---------- 12. D-Day (설정한 날을 1일로) ---------- */
    $$('.dday-card').forEach(function (card) {
      var str = (card.getAttribute('data-date') || '').trim().replace(/[.\/]/g, '-').replace(/\s+/g, '').replace(/-$/, '');
      var parts = str.split('-').map(function (n) { return parseInt(n, 10); });
      var resultEl = card.querySelector('.dday-result');
      var labelEl = card.querySelector('.dday-label');
      if (parts.length < 3 || parts.some(isNaN)) { if (resultEl) resultEl.textContent = '-'; return; }
      var target = new Date(parts[0], parts[1] - 1, parts[2]);
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var diff = Math.round((today.getTime() - target.getTime()) / 86400000);
      if (diff >= 0) {
        resultEl.textContent = (diff + 1).toLocaleString() + '일';
      } else {
        resultEl.textContent = 'D' + diff;
        if (labelEl) labelEl.textContent = '남은 날';
      }
    });

    /* ---------- 13. 캘린더 커버 ---------- */
    $$('.calendar-widget').forEach(function (widget) {
      var grid = widget.querySelector('.cal-grid');
      var monthEl = widget.querySelector('.cal-month');
      var listEl = widget.querySelector('.cal-events');
      var events = [];
      var loose = [];

      $$('.cal-src', widget).forEach(function (src) {
        var dateText = (src.querySelector('.cal-src-date') || {}).textContent || '';
        var desc = ((src.querySelector('.cal-src-desc') || {}).textContent || '').trim();
        dateText = dateText.trim();
        var full = dateText.match(/^(\d{4})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
        var annual = dateText.match(/^(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*일?\.?$/);
        var rest = '';
        if (full) {
          rest = dateText.slice(full[0].length).replace(/^[\s.일]+/, '').trim();
          events.push({ y: +full[1], m: +full[2], d: +full[3], label: desc || rest || dateText });
        } else if (annual) {
          events.push({ y: null, m: +annual[1], d: +annual[2], label: desc || dateText });
        } else if (dateText || desc) {
          loose.push({ label: [dateText, desc].filter(Boolean).join(' · ') });
        }
      });

      var now = new Date();
      var viewY = now.getFullYear();
      var viewM = now.getMonth() + 1;
      var weekNames = ['일', '월', '화', '수', '목', '금', '토'];

      var render = function () {
        monthEl.textContent = viewY + '. ' + (viewM < 10 ? '0' : '') + viewM;
        grid.textContent = '';
        weekNames.forEach(function (w) {
          var s = document.createElement('span');
          s.className = 'cal-week';
          s.textContent = w;
          grid.appendChild(s);
        });
        var first = new Date(viewY, viewM - 1, 1).getDay();
        var days = new Date(viewY, viewM, 0).getDate();
        for (var b = 0; b < first; b++) grid.appendChild(document.createElement('span'));

        var monthEvents = events.filter(function (ev) { return ev.m === viewM && (ev.y === null || ev.y === viewY); });
        for (var d = 1; d <= days; d++) {
          var cell = document.createElement('span');
          var dow = (first + d - 1) % 7;
          cell.className = 'cal-day' + (dow === 0 ? ' sun' : '') + (dow === 6 ? ' sat' : '');
          if (viewY === now.getFullYear() && viewM === now.getMonth() + 1 && d === now.getDate()) cell.classList.add('today');
          cell.setAttribute('aria-label', d + '일');
          cell.textContent = d;
          var hit = monthEvents.filter(function (ev) { return ev.d === d; });
          if (hit.length) {
            cell.classList.add('has-event');
            cell.title = hit.map(function (ev) { return ev.label; }).join(', ');
            var marks = document.createElement('span');
            marks.className = 'cal-marks';
            marks.appendChild(document.createElement('i'));
            cell.appendChild(marks);
          }
          grid.appendChild(cell);
        }

        listEl.textContent = '';
        monthEvents.slice().sort(function (a, b) { return a.d - b.d; }).forEach(function (ev) {
          var li = document.createElement('li');
          var day = document.createElement('span');
          day.className = 'cal-event-day';
          day.textContent = ev.d + '일';
          var label = document.createElement('span');
          label.className = 'cal-event-label';
          label.textContent = ev.label;
          li.appendChild(day);
          li.appendChild(label);
          listEl.appendChild(li);
        });
        loose.forEach(function (ev) {
          var li = document.createElement('li');
          var label = document.createElement('span');
          label.className = 'cal-event-label';
          label.textContent = ev.label;
          li.appendChild(label);
          listEl.appendChild(li);
        });
      };

      widget.querySelector('.cal-prev').addEventListener('click', function () {
        viewM -= 1; if (viewM < 1) { viewM = 12; viewY -= 1; } render();
      });
      widget.querySelector('.cal-next').addEventListener('click', function () {
        viewM += 1; if (viewM > 12) { viewM = 1; viewY += 1; } render();
      });
      render();
    });

    /* ---------- 14. 투두리스트 체크 유지 ---------- */
    $$('.todo-list input[type="checkbox"]').forEach(function (checkbox, index) {
      var textEl = checkbox.nextElementSibling;
      if (!textEl) return;
      var key = 'todo-check-' + index + '-' + textEl.textContent.trim();
      if (safeStorage.get(key) === 'true') checkbox.checked = true;
      checkbox.addEventListener('change', function () { safeStorage.set(key, checkbox.checked); });
    });

    /* ---------- 15. BGM 플레이어 ---------- */
    initBgm();
  });

  function initBgm() {
    var wrap = document.getElementById('bgm-player-wrap');
    if (!wrap) return;

    var list = [];
    for (var i = 1; i <= 6; i++) {
      var url = wrap.getAttribute('data-u' + i);
      var id = getYouTubeVideoId(url);
      if (id) list.push({ title: wrap.getAttribute('data-t' + i) || ('Track ' + i), id: id });
    }

    var titleEl = document.getElementById('bgm-title');
    var subEl = document.getElementById('bgm-sub');
    var thumb = document.getElementById('bgm-thumb');
    var playBtn = document.getElementById('bgm-play-btn');
    var prevBtn = document.getElementById('bgm-prev-btn');
    var nextBtn = document.getElementById('bgm-next-btn');
    var videoBtn = document.getElementById('bgm-video-btn');
    var volInput = document.getElementById('bgm-vol');
    var progress = document.getElementById('yt-progress');
    var videoBox = document.getElementById('bgm-video');
    var videoTitle = document.getElementById('bgm-video-title');
    var videoClose = document.getElementById('bgm-video-close');

    if (!list.length) {
      titleEl.textContent = 'BGM이 설정되지 않음';
      subEl.textContent = '준비 중';
      $$('button, input', wrap).forEach(function (c) { c.disabled = true; });
      return;
    }

    var current = 0;
    var player = null;
    titleEl.textContent = list[0].title;
    if (videoTitle) videoTitle.textContent = list[0].title;

    var setVideoOpen = function (open) {
      if (!videoBox) return;
      videoBox.classList.toggle('open', open);
      videoBox.setAttribute('aria-hidden', String(!open));
      videoBtn.classList.toggle('active', open);
    };
    videoBtn.addEventListener('click', function () { setVideoOpen(!videoBox.classList.contains('open')); });
    if (videoClose) videoClose.addEventListener('click', function () { setVideoOpen(false); });

    var setPlaying = function (playing) {
      playBtn.innerHTML = playing ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
      playBtn.setAttribute('aria-label', playing ? '일시정지' : '재생');
      thumb.classList.toggle('spinning', playing);
      subEl.textContent = playing ? 'Now playing' : 'Ready to play';
    };

    var showTitle = function () {
      titleEl.textContent = list[current].title;
      if (videoTitle) videoTitle.textContent = list[current].title;
    };

    var pendingPlay = false;
    var loadTrack = function () {
      showTitle();
      if (!player) { pendingPlay = true; ensurePlayer(); return; }
      player.loadVideoById(list[current].id);
      setPlaying(true);
    };

    var timer = null;
    var startProgress = function () {
      clearInterval(timer);
      timer = setInterval(function () {
        var dur = player.getDuration();
        if (dur > 0) progress.style.width = (player.getCurrentTime() / dur * 100) + '%';
      }, 1000);
    };
    var stopProgress = function () { clearInterval(timer); timer = null; };

    /* 유튜브 플레이어는 무거워서, 메뉴를 처음 열거나 재생할 때만 불러옵니다. */
    var requested = false;
    var ensurePlayer = function () {
      if (requested) return;
      requested = true;
      subEl.textContent = '불러오는 중...';
      var create = function () {
        player = new window.YT.Player('yt-player-iframe', {
          width: '100%',
          height: '100%',
          videoId: list[current].id,
          playerVars: { autoplay: 0, controls: 1, playsinline: 1 },
          events: {
            onReady: function () {
              player.setVolume(volInput.value * 100);
              subEl.textContent = 'Ready to play';
              if (pendingPlay) { pendingPlay = false; player.playVideo(); }
            },
            onStateChange: function (event) {
              var S = window.YT.PlayerState;
              if (event.data === S.PLAYING) { setPlaying(true); startProgress(); }
              else if (event.data === S.PAUSED || event.data === S.ENDED) {
                setPlaying(false);
                stopProgress();
                if (event.data === S.ENDED) { current = (current + 1) % list.length; loadTrack(); }
              }
            }
          }
        });
      };
      if (window.YT && window.YT.Player) { create(); return; }
      var prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prevReady === 'function') prevReady();
        create();
      };
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = function () {
        titleEl.textContent = 'BGM을 불러오지 못했습니다';
        subEl.textContent = '재생을 누르면 다시 시도해요';
        tag.remove();
        requested = false;
      };
      document.head.appendChild(tag);
    };
    window.addEventListener('skin:draweropen', ensurePlayer);
    videoBtn.addEventListener('click', ensurePlayer);

    playBtn.addEventListener('click', function () {
      if (!player || !player.getPlayerState) { pendingPlay = true; ensurePlayer(); return; }
      if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
    });
    prevBtn.addEventListener('click', function () { current = (current - 1 + list.length) % list.length; loadTrack(); });
    nextBtn.addEventListener('click', function () { current = (current + 1) % list.length; loadTrack(); });
    volInput.addEventListener('input', function (e) { if (player && player.setVolume) player.setVolume(e.target.value * 100); });
  }

  /* ---------- 16. 슬라이드 갤러리 (자동 흐름 + 드래그) ---------- */
  window.addEventListener('load', function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    $$('.cover-slide-container').forEach(function (container) {
      var isDown = false;
      var startX = 0;
      var scrollLeft = 0;
      var items = $$('.cover-slide-item', container);
      if (!items.length) return;

      var gap = parseFloat(window.getComputedStyle(container).gap) || 0;
      var originalWidth = 0;
      items.forEach(function (item) { originalWidth += item.offsetWidth + gap; });
      if (!originalWidth) return;

      items.forEach(function (item) { container.appendChild(item.cloneNode(true)); });
      items.forEach(function (item) { container.appendChild(item.cloneNode(true)); });

      var pointerX = function (e) {
        if (e.touches && e.touches.length) return e.touches[0].pageX;
        return typeof e.pageX === 'number' ? e.pageX : null;
      };
      var start = function (e) {
        var x = pointerX(e);
        if (x === null) return;
        isDown = true;
        container.classList.add('active');
        startX = x - container.offsetLeft;
        scrollLeft = container.scrollLeft;
      };
      var stop = function () { isDown = false; container.classList.remove('active'); };
      var move = function (e) {
        if (!isDown) return;
        var x = pointerX(e);
        if (x === null) return;
        e.preventDefault();
        container.scrollLeft = scrollLeft - (x - container.offsetLeft - startX) * 2;
      };

      container.addEventListener('mousedown', start);
      container.addEventListener('touchstart', start, { passive: false });
      container.addEventListener('mouseleave', stop);
      container.addEventListener('mouseup', stop);
      container.addEventListener('touchend', stop);
      container.addEventListener('mousemove', move);
      container.addEventListener('touchmove', move, { passive: false });

      /* 위치를 변수로 들고 쓰기만 해서 매 프레임 레이아웃 계산을 피하고, 화면에 보일 때만 움직입니다. */
      var pos = 0;
      var running = false;
      var visible = false;
      var step = function () {
        if (!visible || document.hidden || reduceMotion.matches) { running = false; return; }
        if (!isDown) {
          pos += 0.6;
          if (pos >= originalWidth) pos -= originalWidth;
          container.scrollLeft = pos;
        }
        requestAnimationFrame(step);
      };
      var run = function () {
        if (running || !visible) return;
        running = true;
        requestAnimationFrame(step);
      };
      container.addEventListener('scroll', function () {
        if (!isDown) return;
        var x = container.scrollLeft;
        if (x <= 0) { x += originalWidth; scrollLeft += originalWidth; container.scrollLeft = x; }
        else if (x >= originalWidth * 2) { x -= originalWidth; scrollLeft -= originalWidth; container.scrollLeft = x; }
        pos = x % originalWidth;
      }, { passive: true });
      if (window.IntersectionObserver) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; run(); }).observe(container);
      } else { visible = true; run(); }
      document.addEventListener('visibilitychange', run);
    });
  });
})();
