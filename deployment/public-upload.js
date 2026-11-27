(() => {
  const $ = id => document.getElementById(id);
  const form = document.querySelector('[data-mode="upload"], [data-mode="manage"]');
  const manage = form.dataset.mode === 'manage';
  const submit = form.querySelector('[type=submit]');
  const status = $('post-status');
  const statusHome = status.parentElement;
  const uploadKey = $('uploadKey');
  const ownerKey = $('ownerKey');
  const templateLink = $('templateUrl');
  const botName = $('botName');
  const botJob = $('botJob');
  const botShape = $('botShape');
  const endpoint = window.CabinPublication?.botsEndpoint;
  if (!manage) mountAppearance();
  if (!endpoint) {
    setStatus('上传服务暂未启用。', true);
    return;
  }
  const url = new URL(manage ? 'upload-key' : endpoint, endpoint);
  let busy = false;
  let lastSubmission;
  let requestId;

  function mountAppearance() {
    const {shapes, colors, portrait} = CabinBotArt;
    const swatches = $('botColors');
    const currentColor = $('botColorName');
    const preview = $('botPreview');

    for (const shape of shapes) botShape.add(new Option(shape.name, shape.value));
    colors.forEach((color, index) => {
      const label = document.createElement('label');
      label.className = 'upload-swatch';
      label.title = color.name;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'botColor';
      input.value = color.value;
      input.checked = index === 0;
      input.setAttribute('aria-label', color.name);
      const sample = document.createElement('span');
      sample.style.setProperty('--swatch-color', color.value);
      label.append(input, sample);
      swatches.append(label);
    });

    function updatePreview() {
      const color = colors.find(choice => choice.value === form.elements.botColor.value);
      currentColor.textContent = color.name;
      preview.src = portrait(botShape.value, color.value);
    }
    botShape.addEventListener('change', updatePreview);
    swatches.addEventListener('change', updatePreview);
    updatePreview();
  }

  function setStatus(message, error = false, field) {
    const placement = field?.closest('.upload-field') || statusHome;
    if (placement !== status.parentElement) placement.append(status);
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }

  function updateSubmit() {
    submit.disabled = busy || (!manage && [uploadKey, templateLink, botName].some(field => !field.value.trim()));
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
    else if (error.status === 400 && !manage) {
      if (error.message.includes('链接')) field = templateLink;
      else if (error.message.includes('Bot 名称')) field = botName;
      else if (error.message.includes('岗位')) field = botJob;
    }
    const message = error instanceof TypeError || error instanceof SyntaxError || error.name === 'TimeoutError'
      ? '小屋暂时连不上，请稍后重试。' : error.message;
    setStatus(message, true, field);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      field.select();
    }
  }

  async function restoreDraft() {
    const encoded = new URLSearchParams(location.hash.slice(1)).get('post');
    if (!encoded) return;
    try {
      const value = await CabinBotPacket.decode(encoded, 18_000);
      const link = value?.templateUrl;
      if (value?.v !== 1 || typeof link !== 'string' || !link.trim() || link.length > 1000) throw new Error();
      if (!templateLink.value) templateLink.value = link;
      for (const [field, text] of [[botName, value.name], [botJob, value.job]]) {
        if (!field.value && typeof text === 'string' && text.length <= field.maxLength) field.value = text;
      }
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
    const packet = {
      v:1,
      name:botName.value.trim(),
      job:botJob.value.trim() || 'Grok 模板',
      templateUrl:templateLink.value.trim(),
      shape:botShape.value,
      color:form.elements.botColor.value,
    };
    const signature = JSON.stringify(packet);
    if (signature !== lastSubmission) {
      requestId = crypto.randomUUID().replace(/-/g, '');
      lastSubmission = signature;
    }
    return {
      uploadKey:uploadKey.value.trim(), publish:true,
      packet:{...packet, requestId},
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
