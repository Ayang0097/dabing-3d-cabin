(() => {
  const $ = id => document.getElementById(id);
  const request = window.CabinBotApi;
  const access = $('ownerAccess'), panel = $('ownerTools'), ownerInput = $('ownerKey');
  const issue = $('issueMember'), rotate = $('rotateMember'), assign = $('assignBot');
  const shared = $('sharedKeyForm'), logout = $('ownerExit'), more = $('moreLegacy');
  const rotateChoice = $('rotateChoice'), assignChoice = $('assignChoice'), legacy = $('legacyBot');
  const issuedKey = $('issuedKey'), keyResult = $('keyResult'), status = $('ownerStatus');
  const statusHome = status.parentElement;
  const unassigned = new Map();
  let members = [], ownerKey = '', next, busy = false;

  function show(message, placement = statusHome, error = false) {
    if (status.parentElement !== placement) placement.append(status);
    status.textContent = message;
    status.toggleAttribute('data-error', error);
  }

  function updateButtons() {
    access.querySelector('button').disabled = !request || busy;
    issue.querySelector('button').disabled = shared.querySelector('button').disabled = busy;
    rotate.querySelector('button').disabled = busy || !rotateChoice.value;
    assign.querySelector('[type=submit]').disabled = busy || !assignChoice.value || !legacy.value;
    more.disabled = logout.disabled = busy;
  }

  function choices(select, records, empty) {
    const previous = select.value;
    select.replaceChildren(new Option(empty, ''));
    for (const {id, label} of records) select.add(new Option(label, id));
    if (records.some(record => record.id === previous)) select.value = previous;
  }

  function renderChoices() {
    choices(rotateChoice, members, '选择成员');
    choices(assignChoice, members, '选择成员');
    const legacyOptions = [...unassigned.values()].map(bot => ({
      id:bot.id, label:bot.name + ' · ' + bot.job + ' · ' + bot.id.slice(-6).toUpperCase(),
    }));
    choices(legacy, legacyOptions, unassigned.size ? '选择待绑定的 BOT' : '暂无待绑定的 BOT');
    more.hidden = !next;
  }

  function showRoster(page, append = false) {
    if (!append) unassigned.clear();
    for (const bot of page.bots) unassigned.set(bot.id, bot);
    next = page.next;
    members = page.members;
    renderChoices();
  }

  const memberRequest = (action, data = {}) => request('members', {ownerKey, action, ...data});

  function endSession() {
    ownerKey = '';
    next = undefined;
    members = [];
    unassigned.clear();
    renderChoices();
    issuedKey.value = '';
    keyResult.hidden = true;
    for (const form of panel.querySelectorAll('form')) form.reset();
    access.reset();
    panel.hidden = true;
    access.hidden = false;
    show('');
    updateButtons();
  }

  async function run(task, placement = statusHome) {
    if (!request || busy) return;
    busy = true;
    updateButtons();
    show('正在处理…', placement);
    try {
      await task();
    } catch (error) {
      if (error.status === 403) {
        endSession();
        placement = statusHome;
        ownerInput.focus();
      }
      show(error.message, placement, true);
    } finally {
      busy = false;
      updateButtons();
    }
  }

  function displayKey(key, message) {
    issuedKey.value = key;
    keyResult.hidden = false;
    show(message, keyResult.parentElement);
    issuedKey.focus();
    issuedKey.select();
  }

  access.addEventListener('submit', event => {
    event.preventDefault();
    const key = ownerInput.value.trim();
    ownerInput.value = '';
    run(async () => {
      const page = await request('members', {ownerKey:key, action:'list'});
      ownerKey = key;
      showRoster(page);
      access.hidden = true;
      panel.hidden = false;
      show('');
      $('memberLabel').focus();
    });
  });

  issue.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const {member, uploadKey} = await memberRequest('issue', {label:$('memberLabel').value});
      members.push(member);
      members.sort((a,b) => a.label.localeCompare(b.label));
      renderChoices();
      issue.reset();
      displayKey(uploadKey, '已为「' + member.label + '」发放个人密钥。');
    }, issue.parentElement);
  });

  rotate.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const label = rotateChoice.selectedOptions[0].textContent;
      const {uploadKey} = await memberRequest('rotate', {memberId:rotateChoice.value});
      displayKey(uploadKey, '已为「' + label + '」重发个人密钥。');
    }, rotate.parentElement);
  });

  assign.addEventListener('submit', event => {
    event.preventDefault();
    run(async () => {
      const botId = legacy.value, bot = unassigned.get(botId).name;
      const label = assignChoice.selectedOptions[0].textContent;
      await memberRequest('assign', {botId, memberId:assignChoice.value});
      unassigned.delete(botId);
      renderChoices();
      show('已将「' + bot + '」绑定给「' + label + '」。', assign.parentElement);
    }, assign.parentElement);
  });

  shared.addEventListener('submit', event => {
    event.preventDefault();
    const uploadKey = $('sharedKey').value;
    shared.reset();
    run(async () => {
      await request('upload-key', {ownerKey, uploadKey});
      show('共用投稿密钥已更新。', shared.parentElement);
    }, shared.parentElement);
  });
  more.addEventListener('click', () => run(async () => {
    showRoster(await memberRequest('list', {before:next}), true);
    show('');
  }, assign.parentElement));
  panel.addEventListener('change', updateButtons);
  $('copyIssuedKey').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(issuedKey.value);
      show('已复制个人密钥。', keyResult.parentElement);
    } catch {
      issuedKey.focus();
      issuedKey.select();
      show('已选中密钥，可以手动复制。', keyResult.parentElement);
    }
  });
  logout.addEventListener('click', () => {
    endSession();
    ownerInput.focus();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) endSession(); });
  updateButtons();
  if (!request) show('上传服务暂未启用。', statusHome, true);
})();
