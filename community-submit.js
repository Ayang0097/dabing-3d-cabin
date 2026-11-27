(() => {
  const $ = id => document.getElementById(id);
  const status = $('post-status'), confirm = $('post-confirm');
  const invite = $('post-invite-code'), verify = $('post-invite-verify'), retry = $('post-retry');
  const inviteEndpoint = '/api/community/invite';
  const postUrl = new URL('/submit', location.href).href;
  const setup =
    '请保存一个名为「投稿到大冰的小屋」的私有技能。' +
    '当我明确说「把这个 Bot 投稿到大冰的小屋」，整理当前 Bot 可以公开分享的角色资料。' +
    '生成 JSON 对象 p，包含 v（整数 1）、requestId（Python uuid.uuid4().hex）、name（Bot 名称，1 至 20 字）、' +
    'job（岗位，1 至 20 字）和 instructions（可公开的工作方法，1 至 2400 字，保留输入、步骤和输出格式）。' +
    '只取可公开的角色资料。用 Python 计算：import json,gzip,base64,uuid；' +
    'encoded=base64.urlsafe_b64encode(gzip.compress(json.dumps(p,ensure_ascii=False,separators=(",",":")).encode("utf-8"))).decode().rstrip("=")。' +
    '在回复中给我预览名称、岗位和工作指令，并说明这些内容会公开。' +
    '回复末尾用实际编码给我一个可点击的 Markdown 链接：[一键投稿并公开](' + postUrl + '#post=实际encoded)。' +
    '由我本人点击链接提交。';
  const grok = CabinBotPacket.promptLink(setup);
  $('post-grok').hidden = !grok;
  if (grok) $('post-grok').href = grok;
  $('post-copy').onclick = async () => {
    try {
      await navigator.clipboard.writeText(setup);
      status.textContent = '已复制。到 Grok Bot 对话粘贴发送，保存投稿技能。';
    } catch {
      const field = $('post-setup-text');
      field.hidden = false;
      field.value = setup;
      field.select();
      status.textContent = '请复制选中的指令。';
    }
  };

  let packet, revision = 0;

  function showInvite(message = '') {
    $('post-setup').hidden = true;
    $('post-preview').hidden = true;
    $('post-invite').hidden = false;
    confirm.disabled = true;
    verify.disabled = false;
    status.textContent = message;
  }

  invite.addEventListener('input', () => {
    invite.removeAttribute('aria-invalid');
    status.textContent = '';
  });

  $('post-invite-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (verify.disabled) return;
    const code = invite.value.trim();
    if (!code) {
      invite.setAttribute('aria-invalid', 'true');
      status.textContent = '请填写屋主发给你的邀请码。';
      invite.focus();
      return;
    }
    const version = revision;
    verify.disabled = true;
    status.textContent = '正在验证邀请码…';
    try {
      const response = await fetch(inviteEndpoint, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code}), signal:AbortSignal.timeout(8_000),
      });
      const data = await response.json();
      if (version !== revision) return;
      if (!response.ok || data.authorized !== true) {
        if (response.status === 403) {
          invite.setAttribute('aria-invalid', 'true');
          invite.focus();
          invite.select();
        }
        status.textContent = data.error || '暂时无法验证邀请码，请再试一次。';
        return;
      }
      invite.value = '';
      invite.removeAttribute('aria-invalid');
      // Activating this browser grants permission. Publishing a waiting Bot needs a separate click.
      await showPacket(false, true);
    } catch {
      if (version === revision) status.textContent = '小屋暂时连不上，请再试一次。';
    } finally {
      if (version === revision) verify.disabled = false;
    }
  });

  async function publish() {
    if (!packet || confirm.disabled) return;
    const current = packet;
    confirm.disabled = true;
    status.textContent = '正在把 ' + current.name + ' 带进小屋…';
    try {
      const response = await fetch('/api/community/bots', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({packet:current, publish:true}),
        signal:AbortSignal.timeout(12_000),
      });
      const data = await response.json();
      if (packet !== current) return;
      if (response.status === 403 && data.code === 'invite_required') {
        showInvite('投稿资格需要重新验证。请向屋主确认邀请码，再回来提交这只 Bot。');
        invite.focus();
        return;
      }
      if (!response.ok) throw new Error(data.error || '暂时提交不了，请点一下重试。');
      if (!/^post-[a-f0-9]{32}$/.test(data.bot?.id)) throw new Error('小屋暂未返回入屋编号，请重试。');
      if (packet === current) location.replace('/#bot=' + data.bot.id);
    } catch (error) {
      if (packet !== current) return;
      status.textContent = error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
        ? '小屋暂时连不上，请点一下重试。' : error.message;
      confirm.disabled = false;
    }
  }

  $('post-form').addEventListener('submit', event => {
    event.preventDefault();
    publish();
  });

  async function showPacket(activated, justVerified = false) {
    const version = ++revision;
    const encoded = new URLSearchParams(location.hash.slice(1)).get('post');
    packet = null;
    confirm.disabled = true;
    $('post-invite').hidden = true;
    $('post-preview').hidden = true;
    $('post-setup').hidden = true;
    retry.hidden = true;
    status.textContent = '正在检查投稿资格…';
    try {
      const response = await fetch(inviteEndpoint, {cache:'no-store', signal:AbortSignal.timeout(8_000)});
      const data = await response.json();
      if (version !== revision) return;
      if (!response.ok || typeof data.authorized !== 'boolean') throw new Error();
      if (!data.authorized) {
        showInvite(justVerified ? '请允许这个浏览器保存小屋的 Cookie，再验证一次。' : '');
        return;
      }
    } catch {
      if (version === revision) {
        status.textContent = '暂时无法检查投稿资格，请重试。';
        retry.hidden = false;
      }
      return;
    }
    if (!encoded) {
      $('post-setup').hidden = false;
      status.textContent = justVerified ? '已验证邀请码，可以为 Grok 开启投稿了。' : '';
      return;
    }
    let current;
    try {
      const value = await CabinBotPacket.decode(encoded, 18_000);
      if (value?.v !== 1 || !/^[a-f0-9]{32}$/.test(value.requestId) ||
          ['name', 'job', 'instructions'].some(key => typeof value[key] !== 'string' || !value[key].trim()))
        throw new Error('Incomplete packet');
      // Only fields on the public preview ever travel to the submission endpoint.
      const {v, requestId, name, job, instructions, shape, color} = value;
      current = {v, requestId, name, job, instructions, shape, color};
    } catch {
      if (version === revision) {
        $('post-setup').hidden = false;
        status.textContent = '这条投稿链接不完整。请回 Grok 生成一条新链接。';
      }
      return;
    }

    if (version !== revision) return;
    packet = current;
    $('post-name').textContent = packet.name;
    $('post-job').textContent = packet.job;
    $('post-instructions').textContent = packet.instructions;
    $('post-setup').hidden = true;
    $('post-preview').hidden = false;
    confirm.disabled = false;
    status.textContent = justVerified ? '已验证邀请码。核对 Bot 资料后，点击「一键投稿并公开」。' : '';

    const navigation = performance.getEntriesByType('navigation')[0];
    if (!activated || !document.body.hasAttribute('data-link-clicked') ||
        navigation?.type !== 'navigate' || window !== window.top) return;

    // Grok previews the public profile before showing the confirmation link.
    function whenVisible() {
      if (document.hidden || document.prerendering) return;
      document.removeEventListener('visibilitychange', whenVisible);
      if (packet === current) publish();
    }
    document.addEventListener('visibilitychange', whenVisible);
    whenVisible();
  }

  retry.onclick = () => showPacket(false);
  window.addEventListener('hashchange', () => showPacket(false));
  showPacket(true);
})();
