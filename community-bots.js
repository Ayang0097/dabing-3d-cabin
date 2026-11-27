window.CabinCommunity = (() => {
  const publication = window.CabinPublication;
  const endpoint = publication ? publication.botsEndpoint : '/api/community/bots';
  const enabled = publication ? Boolean(endpoint) : document.body.hasAttribute('data-community');
  const publicId = /^post-[a-f0-9]{32}$/;
  let newest = [], featured = null, timer, polling = false;

  async function request(path) {
    const response = await fetch(endpoint + path, {
      cache:'no-cache', signal:AbortSignal.timeout(6_000),
    });
    if (!response.ok) throw new Error('小屋暂时读不到投稿，可以再试一次。');
    return response.json();
  }

  function sync() {
    Cabin.syncCommunityBots(featured ? [featured, ...newest] : newest, featured?.id);
  }

  async function poll() {
    clearTimeout(timer);
    if (document.hidden || polling) return;
    polling = true;
    try {
      let page = await request('');
      const fresh = [...page.bots];
      // Posts are immutable and newest first. Reuse the known tail once the
      // current page overlaps the previous poll, including polls after sleep.
      while (page.next && fresh.length < Cabin.capacity) {
        const previous = newest.findIndex(bot => bot.id === fresh.at(-1).id);
        if (previous >= 0) {
          fresh.push(...newest.slice(previous + 1));
          break;
        }
        page = await request('?before=' + page.next);
        fresh.push(...page.bots);
      }
      newest = fresh.slice(0, Cabin.capacity);
      sync();
    } catch {
      // Keep the in-room Bots available through a brief network failure.
    } finally {
      polling = false;
      if (!document.hidden) timer = setTimeout(poll, publication ? 45_000 : 5_000);
    }
  }

  function visit(profile) {
    if (!CabinBotCatalog.fromCommunity(profile)) return;
    featured = profile;
    sync();
    if (!Cabin.byId(profile.id)) {
      Cabin.toast(profile.name + '已在投稿名册里，过道空出来后可以再来见它。');
      return;
    }
    history.replaceState(null, '', '#bot=' + profile.id);
    Cabin.showImportedBot(profile.id);
  }

  async function openPermalink() {
    const id = new URLSearchParams(location.hash.slice(1)).get('bot');
    if (!publicId.test(id)) return;
    try {
      const {bot} = await request('/' + id);
      if (new URLSearchParams(location.hash.slice(1)).get('bot') === id) visit(bot);
    } catch {
      Cabin.toast('暂时找不到这位 Bot，刷新后可以重试。');
    }
  }

  function mount(box) {
    box.innerHTML = '<div class="grok-actions roster-actions">' +
      '<button class="quiet" data-act="roster">在店伙伴</button></div>' +
      '<div class="community-list"></div><p class="hint" role="status"></p>' +
      '<button type="button" class="quiet post-more" hidden>更多投稿</button>';
    const list = box.querySelector('.community-list'), status = box.querySelector('[role=status]');
    const more = box.querySelector('.post-more');
    let next;

    async function load() {
      more.disabled = true;
      status.textContent = '正在翻名册…';
      try {
        const page = await request(next ? '?before=' + next : '');
        if (!list.isConnected) return;
        for (const profile of page.bots) {
          const record = CabinBotCatalog.fromCommunity(profile);
          if (!record) continue;
          const row = document.createElement('button');
          row.type = 'button';
          row.className = 'roster-row';
          const title = document.createElement('span');
          title.className = 'row-main';
          const name = document.createElement('b');
          name.textContent = record.name;
          const job = document.createElement('small');
          job.textContent = record.job;
          title.append(name, job);
          row.append(title);
          row.onclick = () => visit(profile);
          list.append(row);
        }
        next = page.next;
        status.textContent = list.childElementCount ? '' : '等第一位投稿伙伴到屋。';
        more.textContent = '更多投稿';
        more.hidden = !next;
      } catch {
        status.textContent = '名册暂时读不到，请再试。';
        more.textContent = '重试';
        more.hidden = false;
      } finally {
        more.disabled = false;
      }
    }

    more.onclick = load;
    load();
  }

  function init() {
    if (!enabled) return;
    window.addEventListener('hashchange', openPermalink);
    document.addEventListener('visibilitychange', poll);
    openPermalink();
    poll();
  }

  return {enabled, init, mount};
})();
