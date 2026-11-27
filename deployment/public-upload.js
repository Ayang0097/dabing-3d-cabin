(() => {
  const $ = id => document.getElementById(id);
  const form = document.querySelector('[data-mode="upload"]');
  const submit = form.querySelector('[type=submit]');
  const status = $('post-status');
  const statusHome = status.parentElement;
  const uploadKey = $('uploadKey');
  const templateLink = $('templateUrl');
  const botName = $('botName');
  const botJob = $('botJob');
  const botShape = $('botShape');
  const request = window.CabinBotApi;
  const editing = new URLSearchParams(location.search).get('mode') === 'edit';
  const access = $('myBotsAccess');
  const accessSubmit = access.querySelector('[type=submit]');
  const keyInput = $('personalKey');
  const choice = $('myBotChoice');
  const more = $('moreMyBots');
  const tools = $('myBotsTools');
  const leave = $('switchPersonalKey');
  const bots = new Map();
  let memberKey = '', next, activeBot;
  let busy = false;
  let lastSubmission;
  let requestId;
  const setAppearance = mountAppearance();

  function mountAppearance() {
    const {shapes, colors, portrait} = CabinBotArt;
    const swatches = $('botColors');
    const currentColor = $('botColorName');
    const preview = $('botPreview');

    function swatch(color, checked) {
      const label = document.createElement('label');
      label.className = 'upload-swatch';
      label.title = color.name;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'botColor';
      input.value = color.value;
      input.checked = checked;
      input.setAttribute('aria-label', color.name);
      const sample = document.createElement('span');
      sample.style.setProperty('--swatch-color', color.value);
      label.append(input, sample);
      swatches.append(label);
      return label;
    }

    for (const shape of shapes) botShape.add(new Option(shape.name, shape.value));
    colors.forEach((color, index) => swatch(color, index === 0));

    function updatePreview() {
      const color = form.elements.botColor.value;
      currentColor.textContent = colors.find(choice => choice.value === color)?.name || '原有颜色';
      preview.src = portrait(botShape.value, color);
    }
    botShape.addEventListener('change', updatePreview);
    swatches.addEventListener('change', updatePreview);
    updatePreview();
    let custom;
    return ({shape, color}) => {
      botShape.value = shapes.some(option => option.value === shape) ? shape : shapes[0].value;
      custom?.remove();
      custom = null;
      if (!colors.some(option => option.value === color) && /^#[a-f0-9]{6}$/i.test(color)) {
        custom = swatch({name:'原有颜色', value:color}, true);
      }
      form.elements.botColor.value = /^#[a-f0-9]{6}$/i.test(color) ? color : colors[0].value;
      updatePreview();
    };
  }

  function setStatus(message, error = false, field) {
    const placement = field?.closest('.upload-field') || statusHome;
    if (placement !== status.parentElement) placement.append(status);
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }

  function updateSubmit() {
    const identified = editing ? memberKey && activeBot : uploadKey.value.trim();
    submit.disabled = !request || busy || !identified || !botName.value.trim() ||
      (templateLink.required && !templateLink.value.trim());
    accessSubmit.disabled = !request || busy;
    choice.disabled = busy || !bots.size;
    more.disabled = busy;
    leave.disabled = busy;
  }

  function showError(error) {
    let field;
    if (error.status === 403) {
      if (editing) endEditing();
      field = editing ? keyInput : uploadKey;
    } else if (error.status === 400) {
      if (error.message.includes('链接')) field = templateLink;
      else if (error.message.includes('Bot 名称')) field = botName;
      else if (error.message.includes('岗位')) field = botJob;
    }
    setStatus(error.message, true, field);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      field.select();
    }
  }

  function endEditing() {
    memberKey = '';
    next = undefined;
    activeBot = null;
    bots.clear();
    choice.replaceChildren();
    access.reset();
    access.hidden = false;
    tools.hidden = form.hidden = true;
    setStatus('');
    updateSubmit();
  }

  function selectBot() {
    activeBot = bots.get(choice.value);
    form.hidden = !activeBot;
    if (activeBot) {
      botName.value = activeBot.name;
      botJob.value = activeBot.job;
      templateLink.value = activeBot.templateUrl || '';
      templateLink.required = !activeBot.instructions;
      $('templateLabel').textContent = templateLink.required ? 'BOT 链接' : 'BOT 链接（选填）';
      setAppearance(activeBot);
    }
    updateSubmit();
  }

  async function loadMine(key, append = false) {
    if (busy) return;
    busy = true;
    updateSubmit();
    setStatus('正在读取你的 BOT…');
    try {
      const page = await request('mine', {uploadKey:key, before:append ? next : undefined});
      memberKey = key;
      next = page.next;
      for (const bot of page.bots) {
        if (bots.has(bot.id)) continue;
        bots.set(bot.id, bot);
        choice.add(new Option(bot.name, bot.id));
      }
      tools.hidden = false;
      access.hidden = true;
      more.hidden = !next;
      setStatus(bots.size ? '' : '这把个人密钥还没有已上传的 BOT。');
      if (!append) selectBot();
    } catch (error) {
      showError(error);
    } finally {
      busy = false;
      updateSubmit();
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

  if (editing) {
    document.title = '我的 BOT · 大冰的小屋';
    $('uploadTitle').textContent = '我的 BOT';
    $('uploadSwitch').textContent = '上传 BOT';
    $('uploadSwitch').href = './upload.html';
    $('uploadKeyField').hidden = true;
    uploadKey.disabled = true;
    $('uploadNote').hidden = true;
    submit.firstChild.textContent = '保存修改';
    endEditing();
    access.addEventListener('submit', event => {
      event.preventDefault();
      if (accessSubmit.disabled) return;
      const key = keyInput.value.trim();
      keyInput.value = '';
      keyInput.removeAttribute('aria-invalid');
      loadMine(key);
    });
    choice.addEventListener('change', () => {
      setStatus('');
      selectBot();
    });
    more.addEventListener('click', () => loadMine(memberKey, true));
    leave.addEventListener('click', () => {
      endEditing();
      keyInput.focus();
    });
  } else {
    form.hidden = false;
    restoreDraft();
  }
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (editing) endEditing();
    else uploadKey.value = '';
    updateSubmit();
  });
  updateSubmit();
  if (!request) setStatus('上传服务暂未启用。', true);

  function readPacket() {
    const templateUrl = templateLink.value.trim();
    return {
      v:1,
      name:botName.value.trim(),
      job:botJob.value.trim() || (templateUrl ? 'Grok 模板' : 'Grok 助手'),
      templateUrl,
      shape:botShape.value,
      color:form.elements.botColor.value,
    };
  }

  function submission(packet) {
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
    const packet = readPacket();
    const payload = editing ? {uploadKey:memberKey, revision:activeBot.revision, packet} : submission(packet);
    uploadKey.value = '';
    busy = true;
    setStatus(editing ? '正在保存修改…' : '正在上传 BOT…');
    updateSubmit();
    try {
      const result = editing
        ? await request('bots/' + activeBot.id, payload, 'PATCH')
        : await request('bots', payload);
      if (/^post-[a-f0-9]{32}$/.test(result.bot?.id)) {
        memberKey = '';
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
