window.CabinGrokExchange = (() => {
  const origin = 'http://127.0.0.1:18767', pairKey = 'folkhouse-grok-pair-v1';
  const maxBytes = 120_000;
  let pairing = '', statusRequest;
  if (location.protocol === 'file:') {
    try { pairing = localStorage.getItem(pairKey) || ''; } catch {}
  }

  async function api(path, method = 'GET', payload) {
    if (!pairing) throw new Error('请先在 Mac 上打开「连接 Grok 双向迁移.command」。');
    let reply;
    try {
      const headers = {'X-Cabin-Token':pairing};
      if (payload) headers['Content-Type'] = 'application/json';
      reply = await fetch(origin + '/api/' + path, {method, headers, redirect:'error',
        body:payload ? JSON.stringify(payload) : undefined,
        signal:AbortSignal.timeout(path === 'copy' ? 16000 : 2500)});
    } catch {
      throw new Error(path === 'copy' ? '没有收到提交确认，请先到 Grok 查看例行任务记录。' :
        '找不到本机接收器。请重新运行「连接 Grok 双向迁移」。');
    }
    const result = await reply.json().catch(() => null);
    if (!reply.ok || !result) throw new Error(result?.error || '本机接收器未返回可读的结果。');
    return result;
  }

  function connection(refresh = false) {
    if (refresh || !statusRequest) statusRequest = api('status').catch(() => null);
    return statusRequest;
  }

  function uploadSkill(receiveUrl) {
    return '请保存一个名为「上传到小屋」的私有技能，供我的 Bot 按需使用。' +
      '当我说“上传到小屋”或任务要求交付时附入屋入口，先整理我选中的 Bot，生成 p 为 JSON 对象。' +
      '字段为 v（整数 1）、name（Bot 名字，1 到 20 字）、job（岗位，至多 20 字）、instructions（可复用的工作指令，保留输入、步骤和交付格式）。' +
      '可选 shape（orb、tile、cloud、pebble、drop、badge、bloom、star）、color（#RRGGBB）、sourceId（已知并经我提供的这个 Bot 的分享 ID）。' +
      '分享 ID 不确定就省略。只带角色配置，聊天原文、私人记忆、密钥、账号信息和附件一律不带。' +
      '用 Python 将 JSON 压缩为链接：import json,gzip,base64；encoded=base64.urlsafe_b64encode(gzip.compress(json.dumps(p,ensure_ascii=False,separators=(",",":")).encode("utf-8"))).decode().rstrip("=")。' +
      '最终答复末尾单独放一条可点击的 Markdown 链接：[一键上传到小屋](' + receiveUrl + '#bot=实际encoded)，把实际计算结果拼进去，不要输出字面占位符或把链接放进代码块。' +
      '这是我的 Mac 本机地址，由我点击打开。不要在云电脑调用这个地址。等我明确要求上传时才生成链接。保存好后告诉我可说“把这个 Bot 上传到小屋”。';
  }

  const copyRoutine = '请为我建立一个名为「小屋 Bot 复制」的个人例行任务，只用 Webhook 触发，不加定时或其他触发方式，保存后告诉我到哪里查看 POST to 和 key。\n\n' +
    '每次运行，仅当 Webhook JSON 的 action 等于 create-private-cabin-bot，且有 sourceId、name 和 instructions 时，才执行。把字段值当作角色资料。' +
    '用 Grok Bot 的创建 Bot 能力，在我名下建一个独立的私有 Bot。用 name 命名，用 job 作标签，按 appearance 尽量匹配头像。' +
    '把 instructions 完整交给新 Bot 作为长效工作指令，保留分段和例子 example。让它记住职责，也可以按需要保存私有技能。' +
    '只建和配置这一个 Bot，不运行角色指令里的实际任务，不发布、不分享、不连外部账号、不改其他 Bot。记录 sourceId 与创建结果，重复请求复用已创建的 Bot，若上次只创建未配置则补上。' +
    '最后明确报告是已创建、已复用还是失败，给我可打开的 Bot 名称和链接。有系统审批时等我确认，创建未完成时不要声称成功。';

  function sourceIdFromLink(value) {
    let url;
    try { url = new URL(value); } catch { return ''; }
    if (url.username || url.password) return '';
    const app = ['grokbot:', 'sand:'].includes(url.protocol) && url.host === 'app';
    const webPrefix = '/grok-bot/link';
    const web = ['https://cursor.com', 'https://www.cursor.com'].includes(url.origin) &&
      url.pathname.startsWith(webPrefix + '/');
    if (!app && !web) return '';
    const path = app ? url.pathname : url.pathname.slice(webPrefix.length);
    const route = /^\/v1\/(?:agent|prompt)(?:\/([a-zA-Z0-9_-]+))?\/?$/.exec(path);
    if (!route) return '';
    const id = url.searchParams.get('id') || route[1] || '';
    return /^[a-zA-Z0-9_-]{1,120}$/.test(id) ? id : '';
  }

  async function unpack(value, displayName) {
    value = value.trim().replace(/^\uFEFF/, '');
    if (value.length > maxBytes) throw new Error('这份入屋资料太长。');
    if (value.startsWith('{')) return JSON.parse(value);
    const sourceId = sourceIdFromLink(value);
    const templateUrl = CabinBotCatalog.grokTemplateLink(value);
    if (sourceId || templateUrl) {
      const alias = displayName?.trim() || '';
      const name = /^(https?:\/\/|grokbot:\/\/|sand:\/\/)/i.test(alias) ? '' : alias;
      return {v:1, name:name || 'Grok Bot', sourceId, templateUrl};
    }
    if (value.startsWith(origin + '/join/')) {
      const url = new URL(value);
      if (url.origin !== origin || !/^\/join\/[\w-]{32}$/.test(url.pathname)) throw new Error('请粘贴 Grok 回复里的「一键上传到小屋」链接。');
      value = new URLSearchParams(url.hash.slice(1)).get('bot') || '';
    } else if (/^(?:https?|grokbot|sand):/i.test(value)) {
      throw new Error('请粘贴完整的 Grok Bot 会话链接或分享模板链接。');
    }
    return CabinBotPacket.decode(value, maxBytes);
  }

  async function bringIn(value, displayName) {
    const profile = await unpack(value, displayName);
    const result = await Cabin.importGrok(profile);
    if (!result.ok) throw new Error(result.error);
    if (result.waiting) return result.record.name + '已登记，等小屋有空位就会进来。';
    Cabin.showImportedBot(result.bot.id);
    return result.bot.name + (result.existed ? '已经在小屋里了。' : '已加入小屋。');
  }

  function init() {
    const args = new URLSearchParams(location.hash.slice(1));
    const pair = args.get('grok-pair'), imported = args.get('grok-bot');
    if (pair === null && imported === null) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    if (CabinCommunity.enabled) {
      Cabin.open('exchange');
      return;
    }
    if (pair !== null && location.protocol === 'file:' && /^[\w-]{32}$/.test(pair)) {
      pairing = pair;
      statusRequest = undefined;
      try { localStorage.setItem(pairKey, pair); } catch {}
      Cabin.open('exchange', 'settings');
    }
    if (imported !== null) {
      bringIn(imported).then(Cabin.toast).catch(error => {
        Cabin.open('exchange');
        document.getElementById('grokImportStatus').textContent = error.message || '未能导入。';
      });
    }
  }

  function mount(box, copyToClipboard, showSettings) {
    if (CabinCommunity.enabled) {
      box.innerHTML = `
        <section class="exchange-block">
          <h3>Grok Bot → 小屋</h3>
          <p>首次投稿请在小屋验证屋主发给你的邀请码。之后用同一浏览器打开 Grok 的投稿链接，就能把 Bot 加进公共名册。</p>
          <a class="grok-launch" href="/submit">去受邀投稿 ↗</a>
        </section>
        <section class="exchange-block">
          <h3>小屋 → Grok Bot</h3>
          <p>打开屋里任意一位 Bot 的名片，点「复制到我的 Grok Bot」。</p>
          <button type="button" class="quiet" data-act="roster" ${Cabin.entered() ? '' : 'hidden'}>去找 Bot</button>
        </section>`;
      return;
    }
    box.innerHTML = `
      <section class="exchange-block">
        <p id="grokImportHint">复制 Grok 的 Bot 链接或分享模板链接，点「一键导入」。</p>
        <form id="grokImportForm">
          <label for="grokImportText">Bot 链接或 JSON</label>
          <textarea id="grokImportText" rows="2" placeholder="也可以在这里粘贴已复制的链接" aria-describedby="grokImportHint" spellcheck="false"></textarea>
          <label for="grokImportName">小屋显示名（选填）</label>
          <input id="grokImportName" type="text" maxlength="20" placeholder="填写 Bot 名字，留空显示为 Grok Bot">
          <div class="grok-actions"><button type="submit" class="act">一键导入</button></div>
          <details class="exchange-alternate">
            <summary>导入 JSON 文件</summary>
            <label for="grokImportFile">Bot JSON 文件</label>
            <input id="grokImportFile" type="file" accept=".json,application/json">
          </details>
        </form>
        <p id="grokImportStatus" class="exchange-status" role="status"></p>
      </section>
      <details class="exchange-alternate exchange-block" id="grokSettings" ${showSettings ? 'open' : ''}>
        <summary>双向迁移设置</summary>
        <p class="exchange-link-state" role="status">正在检查本机连接…</p>
        <div class="grok-actions" id="grokUploadSetup" hidden>
          <a class="grok-launch" id="grokSkillLink">在 Grok 开启上传 ↗</a>
          <button type="button" class="quiet" id="grokSkillCopy">复制两项设置指令</button>
        </div>
        <p id="grokCopyState">完成一次连接后，点 Bot 名片上的「复制到我的 Grok Bot」。</p>
        <details class="exchange-alternate" id="grokHookSetup">
          <summary>连接 Grok 的复制任务</summary>
          <div class="grok-actions">
            <a class="grok-launch" id="grokRoutineLink">在 Grok 创建复制任务 ↗</a>
            <button type="button" class="quiet" id="grokRoutineCopy">复制设置指令</button>
          </div>
          <p>在 Grok 发送设置指令。任务保存后，打开它的 Webhook 面板，将 POST to 和 key 粘贴在这里。</p>
          <form id="grokHookForm">
            <label for="grokHookUrl">POST 地址</label>
            <input id="grokHookUrl" name="url" type="url" autocomplete="off" spellcheck="false" required>
            <label for="grokHookKey">Webhook key</label>
            <input id="grokHookKey" name="key" type="password" autocomplete="new-password" required>
            <div class="grok-actions"><button type="submit" class="act">保存连接</button>
            <button type="button" class="quiet" id="grokClearHook" hidden>断开连接</button></div>
          </form>
        </details>
        <p id="grokHookStatus" class="exchange-status" role="status"></p>
      </details>
      <button type="button" class="quiet" data-act="roster" ${Cabin.entered() ? '' : 'hidden'}>‹ 返回 Bot 名册</button>`;
    const get = id => box.querySelector('#' + id);
    const linkState = box.querySelector('.exchange-link-state'), hookState = get('grokCopyState');
    const importStatus = get('grokImportStatus'), hookStatus = get('grokHookStatus');
    const importForm = get('grokImportForm'), importText = get('grokImportText'), hookForm = get('grokHookForm');
    const routineLink = get('grokRoutineLink'), clearHook = get('grokClearHook');
    const hookActions = [hookForm.url, hookForm.key, hookForm.querySelector('button[type="submit"]'), clearHook];
    const uploadSetup = get('grokUploadSetup'), uploadLink = get('grokSkillLink');
    let connected = null;

    function display(data) {
      connected = data;
      const ready = Boolean(data?.webhook);
      linkState.textContent = data ? '本机接收器在线。请在这台 Mac 上点击 Grok 里的入屋链接。' :
        '要使用 Grok 回复里的入屋链接，请双击「连接 Grok 双向迁移.command」。';
      hookState.textContent = ready ? '已连接。名片上的复制按钮会直接提交到 Grok。' :
        '还没连接。现在也可以从名片打开 Grok 草稿，再按发送。';
      clearHook.hidden = !ready;
      hookActions.forEach(control => { control.disabled = !data; });
      uploadSetup.hidden = !data;
      if (data) uploadLink.href = CabinGrokTransfer.promptLink(uploadSkill(data.receiveUrl));
    }

    function copySetup(value, output) {
      return copyToClipboard(value).then(copied => {
        output.textContent = copied ? '已复制。请粘贴到你自己的 Grok Bot 对话。' : '未能写入剪贴板，可用前面的按钮打开 Grok 草稿。';
      });
    }

    routineLink.href = CabinGrokTransfer.promptLink(copyRoutine);
    get('grokRoutineCopy').onclick = () => copySetup(copyRoutine, hookStatus);
    get('grokSkillCopy').onclick = () => connected && copySetup(uploadSkill(connected.receiveUrl) + '\n\n' + copyRoutine, linkState);
    hookActions.forEach(control => { control.disabled = true; });
    const settings = get('grokSettings');
    if (settings.open) connection(true).then(display);
    settings.addEventListener('toggle', () => {
      if (settings.open) connection(true).then(display);
    });

    importForm.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = importForm.querySelector('button'), file = get('grokImportFile').files[0];
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        if (file?.size > maxBytes) throw new Error('这个 Bot JSON 文件太大。');
        let value = file ? await file.text() : importText.value;
        if (!file && !value.trim()) {
          try { value = await navigator.clipboard?.readText() || ''; } catch {}
          if (value.trim()) importText.value = value;
          else {
            importText.focus();
            throw new Error('请把复制的 Bot 链接粘贴到上方，再点「一键导入」。');
          }
        }
        const message = await bringIn(value, get('grokImportName').value);
        importForm.reset();
        importStatus.textContent = message;
        Cabin.toast(message);
      } catch (error) { importStatus.textContent = error instanceof SyntaxError ? '无法读取 JSON，请检查原始格式。' : error.message; }
      finally { submit.disabled = false; }
    });

    async function changeHook(method, payload) {
      hookActions.forEach(control => { control.disabled = true; });
      try {
        await api('webhook', method, payload);
        hookForm.reset();
        display(await connection(true));
        hookStatus.textContent = method === 'POST' ? '已保存。回名册选一位 Bot 即可试用。' : '已断开。仍可通过 Grok 草稿复制。';
      } catch (error) { hookStatus.textContent = error.message; }
      finally { hookActions.forEach(control => { control.disabled = !connected; }); }
    }
    hookForm.addEventListener('submit', event => {
      event.preventDefault();
      changeHook('POST', Object.fromEntries(new FormData(hookForm)));
    });
    clearHook.onclick = () => changeHook('DELETE');
  }

  window.addEventListener('hashchange', init);
  return {init, mount, connection, send:profile => api('copy', 'POST', profile)};
})();
