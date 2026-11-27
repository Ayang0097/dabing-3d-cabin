(() => {
  const $ = id => document.getElementById(id);
  const form = document.querySelector('[data-mode="upload"], [data-mode="manage"]');
  const manage = form.dataset.mode === 'manage';
  const submit = form.querySelector('[type=submit]');
  const verify = $('verifyUpload');
  const verifyButton = verify?.querySelector('[type=submit]');
  const status = $('post-status');
  const uploadKey = $('uploadKey');
  const endpoint = window.CabinPublication?.botsEndpoint;
  if (!endpoint) {
    status.textContent = '上传服务暂未启用。';
    return;
  }
  const url = new URL(manage ? 'upload-key' : endpoint, endpoint);
  let draft;
  let signature;
  let identifier;
  let verifiedKey = '';

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

  function showError(error, keyField) {
    if (error.status === 403) {
      keyField.setAttribute('aria-invalid', 'true');
      keyField.focus();
      keyField.select();
    }
    status.textContent = error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
      ? '小屋暂时连不上，请稍后重试。' : error.message;
  }

  function requireNewKey() {
    verifiedKey = '';
    uploadKey.value = '';
    form.hidden = true;
    verify.hidden = false;
  }

  async function restoreDraft() {
    const encoded = new URLSearchParams(location.hash.slice(1)).get('post');
    if (!encoded) return;
    try {
      const value = await CabinBotPacket.decode(encoded, 18_000);
      if (value?.v !== 1 || !/^[a-f0-9]{32}$/.test(value.requestId)) throw new Error();
      draft = value;
      for (const [id, key] of [['botName', 'name'], ['botJob', 'job'], ['instructions', 'instructions'], ['templateUrl', 'templateUrl']]) {
        if (typeof draft[key] === 'string') $(id).value = draft[key];
      }
    } catch {
      status.textContent = '这条投稿链接不完整。你可以在这里直接填写 BOT 资料。';
    }
  }

  if (!manage) {
    restoreDraft().finally(() => { verifyButton.disabled = false; });
    window.addEventListener('pageshow', event => {
      if (event.persisted) requireNewKey();
    });
    verify.addEventListener('submit', async event => {
      event.preventDefault();
      if (verifyButton.disabled) return;
      const key = uploadKey.value.trim();
      uploadKey.removeAttribute('aria-invalid');
      verifyButton.disabled = true;
      status.textContent = '正在验证上传密钥…';
      try {
        const result = await sendJson(new URL('verify-upload-key', endpoint), {uploadKey:key});
        if (result.valid !== true) throw new Error('没有收到密钥验证确认，请重试。');
        verifiedKey = key;
        uploadKey.value = '';
        verify.hidden = true;
        form.hidden = false;
        submit.disabled = false;
        status.textContent = '密钥已验证，可以填写并提交这位 BOT。';
        $('botName').focus();
      } catch (error) {
        showError(error, uploadKey);
      } finally {
        verifyButton.disabled = false;
      }
    });
  } else submit.disabled = false;

  function submission() {
    const packet = {
      v:1, name:$('botName').value, job:$('botJob').value,
      instructions:$('instructions').value, templateUrl:$('templateUrl').value,
      shape:draft?.shape, color:draft?.color,
    };
    const nextSignature = JSON.stringify(packet);
    if (nextSignature !== signature) {
      identifier = signature === undefined && draft
        ? draft.requestId : crypto.randomUUID().replace(/-/g, '');
      signature = nextSignature;
    }
    return {uploadKey:verifiedKey, publish:true, packet:{...packet, requestId:identifier}};
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    if (!manage && !verifiedKey) {
      requireNewKey();
      uploadKey.focus();
      return;
    }
    if (!manage && !$('instructions').value.trim() && !$('templateUrl').value.trim()) {
      status.textContent = '请填写公开工作指令或 Grok 模板链接。';
      $('instructions').focus();
      return;
    }
    uploadKey.removeAttribute('aria-invalid');
    const payload = manage ? {ownerKey:$('ownerKey').value, uploadKey:uploadKey.value} : submission();
    if (!manage) verifiedKey = '';
    status.textContent = manage ? '正在更新上传密钥…' : '正在上传 BOT…';
    submit.disabled = true;
    try {
      const result = await sendJson(url, payload);
      if (manage && result.updated === true) {
        form.reset();
        status.textContent = '上传密钥已更新。现在可以用新密钥上传。';
      } else if (!manage && /^post-[a-f0-9]{32}$/.test(result.bot?.id)) {
        requireNewKey();
        location.replace('./#bot=' + result.bot.id);
      } else throw new Error('没有收到确认，请稍后重试。');
    } catch (error) {
      if (!manage) requireNewKey();
      showError(error, manage ? $('ownerKey') : uploadKey);
    } finally {
      submit.disabled = false;
    }
  });
})();
