(() => {
  const $ = id => document.getElementById(id);
  const form = document.querySelector('.public-upload-form');
  const manage = form.dataset.mode === 'manage';
  const submit = form.querySelector('[type=submit]');
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
    submit.disabled = true;
    restoreDraft().finally(() => { submit.disabled = false; });
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
    return {uploadKey:uploadKey.value, publish:true, packet:{...packet, requestId:identifier}};
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    if (!manage && !$('instructions').value.trim() && !$('templateUrl').value.trim()) {
      status.textContent = '请填写公开工作指令或 Grok 模板链接。';
      $('instructions').focus();
      return;
    }
    uploadKey.removeAttribute('aria-invalid');
    const payload = manage ? {ownerKey:$('ownerKey').value, uploadKey:uploadKey.value} : submission();
    status.textContent = manage ? '正在更新上传密钥…' : '正在上传 BOT…';
    submit.disabled = true;
    try {
      const response = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        credentials:'omit',
        signal:AbortSignal.timeout(12_000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          const keyField = manage ? $('ownerKey') : uploadKey;
          keyField.setAttribute('aria-invalid', 'true');
          keyField.focus();
          keyField.select();
        }
        throw new Error(result.error || '暂时无法提交，请稍后重试。');
      }
      if (manage && result.updated === true) {
        form.reset();
        status.textContent = '上传密钥已更新。现在可以用新密钥上传。';
      } else if (!manage && /^post-[a-f0-9]{32}$/.test(result.bot?.id)) {
        uploadKey.value = '';
        location.replace('./#bot=' + result.bot.id);
      } else throw new Error('没有收到确认，请稍后重试。');
    } catch (error) {
      status.textContent = error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
        ? '小屋暂时连不上，请稍后重试。' : error.message;
    } finally {
      submit.disabled = false;
    }
  });
})();
