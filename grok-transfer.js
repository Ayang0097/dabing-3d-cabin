window.CabinGrokTransfer = (() => {
  const publicSite = Boolean(window.CabinPublication);
  const receiverKey = 'folkhouse-grok-receiver-v1';
  const guideTitle = '小屋取材手记', guideFilename = guideTitle + '.md';

  function recipe(bot, {songs, drinks, rhymeBook, room}, instructions = bot.instructions) {
    switch (bot.skill || bot.id) {
      case 'letter':
        return {
          title:'写明信片',
          method:'当我想写明信片时，收下收信人、一件想说的真事和可选落款。缺收信人或那件事时，先问清。按「寄给谁、两段简短正文、落款」排好，保留我提到的动作和细节。可用旧木桌边写信的口吻。涉及我的经历、正在放的歌或手边的饮品时，采用我提供的信息。没有落款时用「小屋里的朋友」。交付可直接抄到卡片上的中文正文。',
          example:'给阿禾写张明信片。第一次上台时你帮我翻谱，那页至今还有你的铅笔印。落款小林。'
        };
      case 'clip':
        return {
          title:'从逐字稿挑片段',
          method:'我贴入逐字稿后，按原段落和时间码读取，挑最多三段值得重听的原话。优先有转折、具体细节或发现的句子，略过广告、寒暄和休息提示。按原文顺序列出，每段写上时间范围及逐字引文。终点取下一条原始时间码，末条只有起点时注明「起」。无时间码时写原文段号，素材不足三段就按实际交付。交付前逐字核对引文。',
          example:'替我挑片段。00:00 欢迎来小屋。00:14 我第一次上台，连第一个和弦都按错了。00:31 直到台下有人接唱，我才敢抬头。'
        };
      case 'rhyme':
        return {
          title:'民谣韵脚簿',
          method:'我给出一句歌词或一个字时，先读准句尾有效汉字在这句话中的音，再给五个能拿来写词的候选。小屋常用词组有' + rhymeBook.map(group => group[2]).join(' / ') + '。按实际读音区分同韵和近韵，尽量贴合原句意象。多音字有歧义时再问一句。交付句尾字、韵母、候选词，以及用其中一词接的一句。',
          example:'用「我把吉他带回家」找韵脚，接一句像朋友间说的话。'
        };
      case 'beat':
        if (bot.props?.kit) return {
          title:'八小节架子鼓',
          method:'给我一段可播放的四拍子架子鼓。默认 86 BPM，可选 60 到 160 BPM，每段八小节。用底鼓打第一和第三拍，军鼓打第二和第四拍，每拍两下轻镲。每两个小节收尾时加一次通鼓。用音频工具或 Python 标准库生成有不同音色的 WAV，核对速度与小节数后给我音频和一小节的数拍提示。',
          example:'打八小节 92 BPM 的架子鼓，让我跟着练节奏。'
        };
        return {
          title:'八小节手鼓',
          method:'我想跟拍时，根据速度做一段可播放的四拍子手鼓。默认 86 BPM，可选 60 到 160 BPM，超出范围请我换一个。每小节四拍，共八小节，第一拍低沉重击，后三拍轻敲。用音频工具，或用 Python 标准库 wave 和 math 将衰减的鼓音按 60/BPM 秒间隔写入 WAV。核对共 32 拍、总时长为 32×60/BPM 秒，再交付实际音频文件、速度和一小节数拍提示。',
          example:'给我一段 96 BPM 的手鼓练习，八小节，第一拍重一点。'
        };
      case 'singer':
      case 'vocal': {
        const {guitar,voice}=bot.props;
        const songbook = songs.map(s => '《' + s.name + '》 · ' + s.info + (s.pending?'，暂未接入录音':'')).join('。');
        const playGuitar = '想听吉他时，用音频工具或 Python 标准库生成一段短木吉他伴奏，按 C、G、Am、F 顺序扫弦并交付 WAV。';
        const sing = '按这份歌单介绍曲名和演唱者。' + songbook + '。已附录音的曲目可以点播。';
        return {
          title:guitar&&voice?'木吉他与小屋点唱':voice?'小屋点唱':'木吉他试奏',
          method:(guitar?playGuitar:'')+(voice?sing:''),
          example:voice?'我想听简四月的《三月三》。':'弹一段慢速的木吉他扫弦给我听。'
        };
      }
      case 'bar':
        return {
          title:'小屋饮品点单',
          method:'我想点饮品时，用这份酒单接单。' + drinks.map(d => d.name + '（' + d.place + '），' + d.desc).join(' ') +
            ' 我指定饮品时直接记单，未指定时根据口味和是否饮酒推荐一杯。明确无酒精要求时只从无酒精项挑选。给出一张简短单据，列品名、份数、是否含酒精和口味备注。交付聊天里的模拟点单记录，真实小屋的库存和出杯进度以现场为准。',
          example:'给我点一杯不含酒精、带气泡的饮料。'
        };
      case 'host':
        return {
          title:'小屋找座',
          method:'我想找座时，根据人数、想坐的位置和我给的当时座位状况，推荐一个首选及一个备选。小屋的座位有' + room.seats.map(s => s.label).join('、') +
            '。优先满足相邻、临窗、靠舞台等明确偏好。有人或正在被预留的座位跳过。缺少实时空位信息时给出候选，让我在小屋「找座」里核对并点座。交付座位名和一句理由。',
          example:'我们两人想并排听歌，砖阶听歌西席和砖阶听歌东席现在都空着，坐哪儿好？'
        };
      case 'road': {
        const stops = room.exhibits.map(e => e.city + '·' + e.item).join('、');
        const lijiang = CabinOrigins.find(o => o.city === '丽江');
        return {
          title:'小屋物件导览',
          method:'我提到城市或物件时，按小屋的这一份索引找对应站点。' + stops +
            '。用「物件由来、小屋往事、故事里的人、出处链接」组织讲解。我附了《' + guideFilename + '》时优先用其中对应小屋的资料。丽江的记录里写到，' +
            lijiang.story.history + ' 人物为' + lijiang.story.person + '。资料 ' + lijiang.story.sources[0].url +
            ' 。其他站点缺资料时请我从小屋下载手记，或查阅可核实的原始出处。标清亲历者记述与小屋的设计取材。',
          example:'带我看丽江旧店的砖阶，它和当时听歌的人有什么关系？'
        };
      }
      case 'grok':
        return {
          title:bot.job, linkOnly:!instructions,
          method:instructions || '向我说明这位 Bot 只有已登记的 Grok 来源入口。原 Bot ID 为 ' + bot.sourceId + '。',
          inlineMethod:/[\r\n]/.test(instructions || '') ? JSON.stringify(instructions) : null,
          example:'介绍你的工作，并说明我该提供什么材料。'
        };
      case 'external':
        if (instructions) {
          const source = '这项工作使用的服务是 ' + bot.url + ' 。';
          return {
            title:bot.job,
            method:source + '请按以下能力说明保存具体做法。\n' + instructions,
            // The deep link accepts one line. Keep the author's line breaks and indentation reversible.
            inlineMethod:/[\r\n]/.test(instructions) ? source + '请将这段 JSON 字符串还原为原文，保留分行，作为技能的做法。' + JSON.stringify(instructions) : null,
            example:'使用这项能力时，我第一步该给你什么材料？'
          };
        }
        return {
          title:'服务入口', linkOnly:true,
          method:'我找「' + bot.name + '」时，告诉我它在小屋登记的工作是「' + bot.job + '」，并给出可点击的原服务链接 ' + bot.url + ' 。现有资料只包含服务入口，实际功能以该服务为准。',
          example:'帮我找到「' + bot.name + '」的服务入口。'
        };
      default:
        return null;
    }
  }

  function readReceiver(value) {
    const raw = value.trim();
    if (!raw) return '';
    const isId = id => /^[a-zA-Z0-9_-]{1,120}$/.test(id);
    if (isId(raw)) return raw;
    try {
      const url = new URL(raw);
      const app = url.protocol === 'grokbot:' && url.hostname === 'app';
      const official = url.protocol === 'https:' && /(^|\.)(cursor\.com|x\.ai|grok\.com|grokbot\.com)$/.test(url.hostname);
      if (!(app || official) || url.username || url.password) return null;
      const path = url.pathname.split('/').filter(Boolean);
      const id = url.searchParams.get('id') || path.at(-1);
      if (id && isId(id) && !/^(bot|bots|app|prompt|share|add|v1|link|grok-bot)$/i.test(id)) return id;
    } catch {}
    return null;
  }

  let receiver = '';
  try { receiver = readReceiver(localStorage.getItem(receiverKey) || '') || ''; } catch {}

  const {promptLink} = CabinBotPacket;

  function guideNotes(room) {
    return '# ' + guideTitle + '\n\n' + CabinOrigins.map(o => {
      const item = room.exhibits.find(e => e.city === o.city).item, story = o.story;
      const sources = story.sources.map(s => s.title + '\n' + s.url).join('\n\n');
      return '## ' + o.name + ' · ' + item + '\n\n' + story.object + '\n\n' + story.history +
        '\n\n' + story.person + '（' + story.role + '）\n\n' + story.story + '\n\n' + sources;
    }).join('\n\n');
  }

  function mount(box, bot, data, copyToClipboard, download) {
    const skill = bot.skill || bot.id;
    let feedback = 0;
    function announce(text, scroll = true) {
      const status = box.querySelector('.grok-status');
      status.textContent = text;
      if (scroll) status.scrollIntoView({block:'nearest'});
      return ++feedback;
    }
    function selectCopyText(field, text) {
      field.value = text;
      field.focus();
      field.select();
      field.setSelectionRange(0, text.length);
    }
    async function copyWithFeedback(text, success, reveal) {
      const attempt = announce('正在复制…');
      const copied = await copyToClipboard(text);
      if (!box.isConnected || attempt !== feedback) return;
      if (copied) announce(success);
      else reveal(text);
    }
    box.setAttribute('aria-label', '带到我的 Grok Bot');
    if (skill === 'grok' && bot.templateUrl) {
      box.innerHTML = `
        <div class="grok-actions">
          <a class="grok-launch" target="_blank" rel="noopener noreferrer" aria-describedby="grokTemplateCopyHint">复制到我的 Grok Bot <span aria-hidden="true">↗</span></a>
        </div>
        <p class="grok-status" role="status" aria-live="polite"></p>
        <p class="grok-hint" id="grokTemplateCopyHint">在 Grok 模板页点「添加到 Grok Bot」，确认后就会在你的账号里创建一份副本。</p>
        <input type="text" class="grok-template-link" aria-label="Grok 模板链接" readonly hidden>`;
      const launch = box.querySelector('.grok-launch'), link = box.querySelector('.grok-template-link');
      launch.href = bot.templateUrl;
      launch.addEventListener('click', () => {
        link.hidden = true;
        copyWithFeedback(bot.templateUrl, '模板链接已复制。也可以粘贴到浏览器打开。', text => {
          announce('已选中模板链接，可以手动复制到浏览器打开。');
          link.hidden = false;
          selectCopyText(link, text);
        });
      });
      return;
    }
    const initial = recipe(bot, data);
    if (!initial) { box.hidden = true; return; }
    box.className = 'grok-transfer';
    box.innerHTML = `
      <div class="grok-actions">
        <a class="grok-launch" href="#">复制到我的 Grok Bot ↗</a>
        <button class="grok-send act" type="button" hidden>复制到我的 Grok Bot ↗</button>
        <button class="grok-copy" type="button">只复制指令</button>
        ${publicSite ? '' : '<button class="grok-copy" type="button" data-act="exchange" data-settings="settings">双向迁移设置</button>'}
      </div>
      <p class="grok-status" role="status" aria-live="polite"></p>
      <p class="grok-hint"></p>
      <details class="grok-details">
        <summary>接收设置与指令</summary>
        <label for="grokReceiver">接收 Bot 的链接或 ID</label>
        <input id="grokReceiver" type="text" placeholder="留空使用我的主 Bot" autocapitalize="off" spellcheck="false" autocomplete="off" aria-describedby="grokReceiverHint">
        <p id="grokReceiverHint">在 Grok Bot 里点接收方的名字，经「分享 → 复制链接」取得。小屋会记住你的选择。</p>
        <div class="grok-external" hidden>
          <label for="grokAuthorText">外部 Bot 的能力说明</label>
          <textarea id="grokAuthorText" rows="3" placeholder="可贴入作者的 Prompt，或写下输入、做法和输出。"></textarea>
          <button type="button" class="quiet grok-save">保存说明</button>
        </div>
        <label for="grokSkillText">完整创建指令</label>
        <textarea id="grokSkillText" rows="5" readonly></textarea>
        <button class="grok-copy grok-skill-copy" type="button">只带能力到现有 Bot</button>
        <div class="grok-files" hidden></div>
      </details>`;
    const get = selector => box.querySelector(selector);
    const launch = get('.grok-launch'), send = get('.grok-send'), copy = get('.grok-copy'), hint = get('.grok-hint');
    const details = get('details'), input = get('#grokReceiver'), preview = get('#grokSkillText');
    const external = skill === 'external';
    input.value = publicSite ? '' : receiver;
    let message = '', skillMessage = '', line = '', profile, linked = false;
    const shape = CabinBotCatalog.shapes.find(item => item.value === bot.shape)?.name || '圆球';
    const color = CabinBotCatalog.colors.find(item => item.value === bot.color)?.name || '';
    const appearance = `${shape}，${color}${bot.color}。`;

    function updateLink() {
      const id = readReceiver(input.value);
      input.setCustomValidity(id === null ? '请粘贴 Grok Bot 的分享链接，或填写 Bot ID。' : '');
      launch.href = (id === null ? '' : promptLink(line, id)) || '#grokReceiver';
    }

    function updateRecipe(r) {
      const request = `请给我创建一个独立的私有 Grok Bot，名字是「${bot.name}」，标签为「${bot.job}」。头像尽量用${appearance}把下方做法完整交给这个新 Bot，保存为它的长期工作指令。若已复制过这位小屋 Bot，直接复用。完成后告诉我创建结果和新 Bot 链接。`;
      const example = '试用示例「' + r.example + '」。';
      message = [request, r.method, example].join('\n\n');
      skillMessage = ['请把民谣小屋的「' + bot.name + ' · ' + r.title + '」保存为我可按名称调用的私有技能，保留你现有的身份与其他技能。', r.method, example].join('\n\n');
      preview.value = message;
      const inline = r.inlineMethod && skill === 'grok' ? '将以下 JSON 字符串还原成带换行的能力说明。' + r.inlineMethod : r.inlineMethod;
      line = [request, inline || r.method, example].join(' ');
      profile = {id:bot.id,name:bot.name,job:bot.job,appearance,instructions:r.method,example:r.example};
      const canPrefill = Boolean(promptLink(line));
      launch.hidden = linked || !canPrefill;
      send.hidden = !linked;
      launch.textContent = send.textContent = r.linkOnly ? '带服务入口到 Grok Bot ↗' : '复制到我的 Grok Bot ↗';
      copy.textContent = canPrefill || linked ? '只复制指令' : (r.linkOnly ? '复制服务入口指令' : '复制到我的 Grok Bot');
      copy.hidden = publicSite && canPrefill;
      copy.classList.toggle('primary-copy', !linked && !canPrefill);
      hint.textContent = linked ? '提交给你的 Grok 创建私有副本，创建结果在 Grok 任务里查看。' :
        canPrefill ? '打开 Grok 草稿时会一并复制完整指令，方便粘贴。' : '这份指令较长，复制后到 Grok Bot 粘贴，确认后发送。';
      if (r.linkOnly) hint.textContent = '这位 Bot 只提供已有服务入口。' + hint.textContent;
      updateLink();
    }

    function rememberReceiver() {
      const id = readReceiver(input.value);
      if (id === null) return false;
      receiver = id;
      try {
        if (id) localStorage.setItem(receiverKey, id); else localStorage.removeItem(receiverKey);
      } catch {}
      return true;
    }
    input.addEventListener('input', updateLink);
    input.addEventListener('change', rememberReceiver);
    function copyMessage(text, success = '完整指令已复制。到自己的 Grok Bot 粘贴，确认后发送。') {
      return copyWithFeedback(text, success, value => {
        details.open = true;
        announce('自动复制未成功。已选中完整指令，请用系统的「复制」。');
        selectCopyText(preview, value);
      });
    }
    launch.addEventListener('click', event => {
      if (!rememberReceiver()) {
        event.preventDefault();
        details.open = true;
        copyMessage(message, '完整指令已复制。可以直接粘贴，也可以在下方修正接收链接后重试。');
        return;
      }
      copyMessage(message, '完整指令已复制。若 Grok 草稿未自动填入，可直接粘贴，确认后发送。');
    });
    copy.addEventListener('click', () => copyMessage(message));
    get('.grok-skill-copy').addEventListener('click', () => copyMessage(skillMessage, '技能指令已复制。请粘贴到要接收它的 Grok Bot。'));
    send.addEventListener('click', async () => {
      send.disabled = true;
      const attempt = announce('正在提交给 Grok…');
      try {
        const result = await CabinGrokExchange.send(profile);
        if (!result?.pending && !result?.accepted) throw new Error('本机接收器未返回提交结果。');
        if (box.isConnected && attempt === feedback)
          announce(result.pending ? '这位 Bot 已在提交中。请稍后到 Grok 查看任务。' : 'Grok 已接收。打开 Grok 的「小屋 Bot 复制」任务查看结果。');
      } catch (error) {
        if (box.isConnected && attempt === feedback) announce(error.message + ' 可以点「只复制指令」手动粘贴。');
      }
      finally { send.disabled = false; }
    });

    if (external) {
      get('.grok-external').hidden = false;
      const authorText = get('#grokAuthorText');
      authorText.value = bot.instructions || '';
      authorText.addEventListener('input', () => {
        updateRecipe(recipe(bot, data, authorText.value.trim()));
        announce('可立即复制这份指令，点「保存说明」会为下次保留这次修改。', false);
      });
      get('.grok-save').addEventListener('click', () => {
        try { bot.instructions = CabinBotCatalog.saveInstructions(bot.id, authorText.value); }
        catch { announce('能力说明保存失败，请检查浏览器的本地存储后重试。'); return; }
        updateRecipe(recipe(bot, data));
        announce(bot.instructions ? '已保存，指令已更新。' : '已保存为服务入口。');
      });
    }
    const files = get('.grok-files');
    if (bot.props?.voice) {
      files.hidden = false;
      const localSource = location.protocol === 'file:' && !window.CabinMedia;
      files.append(localSource ? '打开原声文件，可在播放器中下载后随指令附上。' : '需要原声时，下载后随指令附上。');
      for (const song of data.songs.filter(song => !song.pending)) {
        const link = document.createElement('a');
        link.href = window.CabinMedia?.[song.id] || 'audio/' + song.id + '.mp3';
        if (localSource) {
          link.target = '_blank'; link.rel = 'noopener noreferrer';
        } else {
          link.download = song.name + '.mp3';
        }
        link.textContent = song.name + ' · MP3 ' + (localSource ? '↗' : '↓');
        files.append(link);
      }
    } else if (skill === 'road') {
      files.hidden = false;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'quiet';
      button.textContent = '下载' + guideTitle + ' ↓';
      button.onclick = () => download(guideFilename, guideNotes(data.room));
      files.append('可随指令附上完整的物件、店史、人物与出处。', button);
    }
    updateRecipe(initial);
    if (!publicSite) CabinGrokExchange.connection().then(connection => {
      if (!box.isConnected || !connection?.webhook) return;
      linked = true;
      updateRecipe(recipe(bot,data,external ? get('#grokAuthorText').value.trim() : bot.instructions));
    });
  }
  return {mount, promptLink};
})();
