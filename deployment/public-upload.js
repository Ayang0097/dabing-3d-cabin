(() => {
  const $ = id => document.getElementById(id);
  const form = document.querySelector('[data-mode="upload"], [data-mode="manage"]');
  const manage = form.dataset.mode === 'manage';
  const submit = form.querySelector('[type=submit]');
  const status = $('post-status');
  const uploadKey = $('uploadKey');
  const ownerKey = $('ownerKey');
  const templateLink = $('templateUrl');
  const endpoint = window.CabinPublication?.botsEndpoint;
  if (!endpoint) {
    setStatus('上传服务暂未启用。', true);
    return;
  }
  const url = new URL(manage ? 'upload-key' : endpoint, endpoint);
  let busy = false;
  let lastTemplateUrl;
  let requestId;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }

  function updateSubmit() {
    submit.disabled = busy || (!manage && (!uploadKey.value.trim() || !templateLink.value.trim()));
  }

  async function sendJson(url, payload) {
    const response = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      credentials:'omit',
      signal:AbortSignal.timeout(12_000),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || '暂时无法提交，请稍后重试。');
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function showError(error) {
    let field;
    if (error.status === 403) field = manage ? ownerKey : uploadKey;
    else if (error.status === 400 && !manage) field = templateLink;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      field.select();
    }
    const message = error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
      ? '小屋暂时连不上，请稍后重试。' : error.message;
    setStatus(message, true);
  }

  async function restoreDraft() {
    const encoded = new URLSearchParams(location.hash.slice(1)).get('post');
    if (!encoded) return;
    try {
      const value = await CabinBotPacket.decode(encoded, 18_000);
      const link = value?.templateUrl;
      if (value?.v !== 1 || typeof link !== 'string' || !link.trim() || link.length > 1000) throw new Error();
      if (!templateLink.value) templateLink.value = link;
      updateSubmit();
    } catch {
      if (!templateLink.value) setStatus('这条投稿链接没有带分享模板，请粘贴 Grok 的公开分享模板链接。', true);
    }
  }

  form.addEventListener('input', event => {
    event.target.removeAttribute('aria-invalid');
    if (status.hasAttribute('data-error')) setStatus('');
    updateSubmit();
  });

  if (!manage) {
    restoreDraft();
    window.addEventListener('pageshow', event => {
      if (event.persisted) {
        uploadKey.value = '';
        updateSubmit();
      }
    });
  }
  updateSubmit();

  function submission() {
    const templateUrl = templateLink.value.trim();
    if (templateUrl !== lastTemplateUrl) {
      requestId = crypto.randomUUID().replace(/-/g, '');
      lastTemplateUrl = templateUrl;
    }
    const name = 'Grok Bot · ' + requestId.slice(0, 6).toUpperCase();
    return {
      uploadKey:uploadKey.value.trim(), publish:true,
      packet:{v:1, requestId, name, job:'Grok 模板', templateUrl},
    };
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    uploadKey.removeAttribute('aria-invalid');
    const payload = manage ? {ownerKey:ownerKey.value, uploadKey:uploadKey.value} : submission();
    if (!manage) uploadKey.value = '';
    busy = true;
    setStatus(manage ? '正在更新上传密钥…' : '正在上传 BOT…');
    updateSubmit();
    try {
      const result = await sendJson(url, payload);
      if (manage && result.updated === true) {
        form.reset();
        setStatus('上传密钥已更新。现在可以用新密钥上传。');
      } else if (!manage && /^post-[a-f0-9]{32}$/.test(result.bot?.id)) {
        location.replace('./#bot=' + result.bot.id);
      } else throw new Error('没有收到确认，请稍后重试。');
    } catch (error) {
      showError(error);
    } finally {
      busy = false;
      updateSubmit();
    }
  });
})();
