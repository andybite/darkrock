/* Каталог DarkRock: рисует фильтры, карточки, наборы и окно товара из products.js. */
(function () {
  var P = window.DR_PRODUCTS || [], B = window.DR_BUNDLES || [], C = window.DR_CATEGORIES || [];
  var byId = {};
  P.forEach(function (p) { byId[p.id] = p; });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function rub(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
  function bundleFull(b) { return b.items.reduce(function (s, id) { return s + (byId[id] ? byId[id].price : 0); }, 0); }
  function bundleLive(b) { return b.items.every(function (id) { return byId[id] && byId[id].status === 'live'; }); }

  // ---------- карточки ----------
  function productCard(p) {
    var soon = p.status !== 'live';
    var img = p.gallery[0];
    return '<article class="pcard' + (soon ? ' pcard--soon' : '') + '" data-cats="' + p.cats.join(' ') + '">' +
      '<div class="pcard__head"><span class="pcard__cat">' + esc(p.catName) + '</span>' +
      (p.isNew ? '<span class="badge">Новинка</span>' : '') + (soon ? '<span class="badge badge--muted">Скоро</span>' : '') + '</div>' +
      '<h3>' + esc(p.title) + '</h3><p>' + esc(p.short) + '</p>' +
      '<div class="pcard__preview">' +
        (img ? '<img src="' + img.src + '" alt="' + esc(img.alt) + '" loading="lazy">' : '<div class="pcard__blank"></div>') +
        '<span class="pcard__label">' + esc(p.label) + '</span></div>' +
      '<div class="pcard__foot"><span class="price">' + rub(p.price) + '</span>' +
        (soon ? '<span class="muted">Готовим</span>' : '<a class="btn" href="#' + p.id + '">Подробнее</a>') + '</div>' +
      '</article>';
  }

  function bundleCard(b) {
    var items = b.items.map(function (id) { return byId[id]; }).filter(Boolean);
    var full = bundleFull(b), live = bundleLive(b);
    return '<article class="pcard pcard--bundle" data-cats="bundles">' +
      '<div class="pcard__head"><span class="pcard__cat">Набор · ' + items.length + ' шаблона</span>' +
      (live ? '' : '<span class="badge badge--muted">Скоро</span>') + '</div>' +
      '<h3>' + esc(b.title) + '</h3><p>' + esc(b.text) + '</p>' +
      '<ul class="bundle__items">' + items.map(function (p) { return '<li>' + esc(p.title) + '<span>' + rub(p.price) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="pcard__foot"><span class="price">' + rub(b.price) + ' <s>' + rub(full) + '</s></span>' +
        (live ? '<a class="btn" href="#' + b.id + '">Подробнее</a>' : '<span class="muted">Готовим</span>') + '</div>' +
      '</article>';
  }

  var grid = document.getElementById('catalog-grid');
  grid.innerHTML = P.map(productCard).join('') + B.map(bundleCard).join('');
  document.getElementById('bundles-grid').innerHTML = B.map(bundleCard).join('');

  // ---------- фильтры ----------
  var filters = document.getElementById('filters');
  filters.innerHTML = C.map(function (c, i) {
    return '<button type="button" role="tab" class="chip' + (i ? '' : ' is-on') + '" data-f="' + c.id + '">' + esc(c.name) + '</button>';
  }).join('');
  filters.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (!btn) return;
    [].forEach.call(filters.children, function (b) { b.classList.toggle('is-on', b === btn); });
    var f = btn.dataset.f;
    [].forEach.call(grid.children, function (card) {
      var cats = card.dataset.cats.split(' ');
      // «Все» — только отдельные шаблоны, наборы — во вкладке «Наборы» и в своём блоке ниже
      card.hidden = f === 'all' ? cats.indexOf('bundles') >= 0 : cats.indexOf(f) < 0;
    });
  });
  filters.firstChild.click();

  // ---------- окно товара ----------
  var modal = document.getElementById('modal'), body = document.getElementById('modal-body');

  function payBlock(id, title, price, pay) {
    return '<div class="order"><div class="order__row"><span>Ваш заказ</span><b>' + esc(title) + '</b></div>' +
      '<div class="order__row"><span>К оплате</span><b class="price">' + rub(price) + '</b></div>' +
      (pay && !window.DR_SALES_PAUSED
        ? '<a class="btn btn--big btn--wide" href="' + esc(pay) + '" data-product="' + id + '">Перейти к оплате</a>'
        : '<span class="btn btn--big btn--wide btn--off">' + (window.DR_SALES_PAUSED ? 'Продажи временно приостановлены' : 'Оплата скоро откроется') + '</span>') +
      '<p class="note">' + (window.DR_SALES_PAUSED ? 'Приём оплаты временно приостановлен. Если хотите купить — напишите на goodflow.sales@gmail.com, сообщим, когда продажи откроются.' : 'Ссылка на таблицу откроется сразу после оплаты. Работает в Google Таблицах и Excel.') + '<br>' +
      'Для личного использования — передача и перепродажа запрещены (<a href="oferta.html">оферта</a>).</p></div>';
  }

  function gallery(imgs) {
    if (!imgs.length) return '';
    return '<div class="gal"><div class="gal__main"><img id="gal-img" src="' + imgs[0].src + '" alt="' + esc(imgs[0].alt) + '">' +
      '<span class="gal__count" id="gal-count">1 / ' + imgs.length + '</span></div>' +
      '<div class="gal__thumbs">' + imgs.map(function (g, i) {
        return '<button type="button" class="gal__thumb' + (i ? '' : ' is-on') + '" data-i="' + i + '"><img src="' + g.src + '" alt="" loading="lazy"></button>';
      }).join('') + '</div></div>';
  }

  function productView(p) {
    var deals = B.filter(function (b) { return b.items.indexOf(p.id) >= 0 && bundleLive(b); });
    return gallery(p.gallery) +
      '<p class="pcard__cat">' + esc(p.catName) + '</p><h2 id="modal-title">' + esc(p.title) + '</h2><p class="lead lead--tight">' + esc(p.short) + '</p>' +
      '<h3>Что внутри</h3><ul class="ticks">' + p.inside.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '<h3>Как это работает</h3><ol class="steps">' + p.how.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      (deals.length ? '<h3>Выгоднее в наборе</h3>' + deals.map(function (b) {
        return '<a class="deal" href="#' + b.id + '"><span>' + esc(b.title) + ' — ' + b.items.length + ' шаблона</span><b>' + rub(b.price) +
          ' <s>' + rub(bundleFull(b)) + '</s></b></a>';
      }).join('') : '') +
      payBlock(p.id, p.title, p.price, p.pay);
  }

  function bundleView(b) {
    var items = b.items.map(function (id) { return byId[id]; });
    var imgs = [];
    items.forEach(function (p) { imgs = imgs.concat(p.gallery.slice(0, 2)); });
    return gallery(imgs) +
      '<p class="pcard__cat">Набор · ' + items.length + ' шаблона</p><h2 id="modal-title">' + esc(b.title) + '</h2><p class="lead lead--tight">' + esc(b.text) + '</p>' +
      '<h3>В наборе</h3><ul class="bundle__items">' + items.map(function (p) {
        return '<li><a href="#' + p.id + '">' + esc(p.title) + '</a><span>' + rub(p.price) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="note">По отдельности — ' + rub(bundleFull(b)) + ', в наборе — ' + rub(b.price) + '. Экономия ' + rub(bundleFull(b) - b.price) + '.</p>' +
      payBlock(b.id, 'Набор «' + b.title + '»', b.price, b.pay);
  }

  var gal = [];
  function open(id) {
    var p = byId[id], b = B.filter(function (x) { return x.id === id; })[0];
    if (p && p.status === 'live') { body.innerHTML = productView(p); gal = p.gallery; }
    else if (b && bundleLive(b)) { body.innerHTML = bundleView(b); gal = [].concat.apply([], b.items.map(function (i) { return byId[i].gallery.slice(0, 2); })); }
    else return false;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    modal.querySelector('.modal__box').scrollTop = 0;
    return true;
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }
  function route() {
    var id = location.hash.slice(1);
    if (!id || document.getElementById(id)) { if (!modal.hidden) close(); return; }
    if (!open(id) && !modal.hidden) close();
  }

  body.addEventListener('click', function (e) {
    var t = e.target.closest('.gal__thumb');
    if (!t) return;
    var i = +t.dataset.i;
    document.getElementById('gal-img').src = gal[i].src;
    document.getElementById('gal-img').alt = gal[i].alt;
    document.getElementById('gal-count').textContent = (i + 1) + ' / ' + gal.length;
    [].forEach.call(t.parentNode.children, function (x) { x.classList.toggle('is-on', x === t); });
  });
  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  window.addEventListener('hashchange', route);
  route();

  // ---------- cookie ----------
  var cookie = document.getElementById('cookie');
  try { if (!localStorage.getItem('dr_cookie_ok')) cookie.hidden = false; } catch (e) { cookie.hidden = false; }
  document.getElementById('cookie-ok').addEventListener('click', function () {
    cookie.hidden = true;
    try { localStorage.setItem('dr_cookie_ok', '1'); } catch (e) {}
  });
})();
