window.CabinBotCatalog = (() => {
  const shapes = [
    {name:'圆球', value:'orb'}, {name:'方糖', value:'tile'},
    {name:'云朵', value:'cloud'}, {name:'卵石', value:'pebble'},
    {name:'水滴', value:'drop'}, {name:'徽章', value:'badge'},
    {name:'花朵', value:'bloom'}, {name:'星星', value:'star'}
  ];
  const {palette} = CabinBotArt;
  const colors = [
    {name:'薄荷绿', value:palette.green}, {name:'晴空蓝', value:palette.blue},
    {name:'草莓红', value:palette.red}, {name:'橘子橙', value:palette.orange},
    {name:'柠檬黄', value:palette.yellow}, {name:'海盐青', value:palette.teal},
    {name:'葡萄紫', value:palette.violet}, {name:'莓果粉', value:palette.pink},
    {name:'青苹果绿', value:palette.lime}, {name:'栗棕', value:palette.brown},
    {name:'墨灰', value:palette.gray}, {name:'墨黑', value:palette.black}
  ];
  // Saved local guests keep the exact color picked in the previous creator.
  const legacyColors = new Set([
    '#13c16f','#3a9de6','#d3554e','#ec8c37','#e5ad38','#1ab5ab','#9970d8','#e36b99'
  ]);
  const roles = window.CabinCharacters.roles;
  const normalizeOutfit = window.CabinBotAccessories.normalize;
  // A separate key per resident also preserves additions made in another tab.
  const keyPrefix = 'folkhouse-custom-bot-v1:';
  const roleOutfitPrefix = 'folkhouse-role-outfit-v1:';
  const idFormat = /^guest-[a-f0-9]{32}$/;
  const grokIdFormat = /^[a-zA-Z0-9_-]{1,120}$/;
  const text = value => typeof value === 'string' ? value.trim() : '';

  function grokTemplateLink(value) {
    try {
      const url = new URL(value);
      if (!['https://x.ai', 'https://www.x.ai'].includes(url.origin) || url.username || url.password) return '';
      const match = /^\/bot\/([a-zA-Z0-9_-]{16,120})\/?$/.exec(url.pathname);
      return match ? 'https://x.ai/bot/' + match[1] : '';
    } catch { return ''; }
  }

  function fields(raw, allowLegacyColor=false) {
    const name = text(raw?.name), job = text(raw?.job);
    if (!name || name.length > 20) return {error:'给 Bot 取一个 1 到 20 字的名字。'};
    if (job.length > 20) return {error:'工作名称最多可写 20 字。'};
    const {shape, color, skill} = raw;
    const grok = skill === 'grok';
    const validColor = grok
      ? typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)
      : colors.some(c => c.value === color) || (allowLegacyColor && legacyColors.has(color));
    if (!shapes.some(s => s.value === shape) || !validColor)
      return {error:'请从小屋的外形和颜色中各选一个。'};
    const role = roles.find(r => r.id === skill);
    if (!role && skill !== 'external' && !grok) return {error:'请选择这个 Bot 的工作。'};
    let url = '';
    if (skill === 'external') {
      try {
        const link = new URL(text(raw.url));
        if (link.protocol !== 'https:' || link.username || link.password) throw new Error();
        url = link.href;
      } catch {
        return {error:'请填写第三方 Bot 的完整 HTTPS 链接。'};
      }
    }
    const instructions = skill === 'external' || grok ? text(raw.instructions) : '';
    const sourceId = grok ? text(raw.sourceId) : '';
    const templateUrl = grok && raw.templateUrl ? grokTemplateLink(raw.templateUrl) : '';
    if (grok && raw.templateUrl && !templateUrl) return {error:'请填写完整的 Grok 分享模板链接。'};
    if (grok && ((!instructions && !sourceId && !templateUrl) || instructions.length > 16_000 || (sourceId && !grokIdFormat.test(sourceId))))
      return {error:'请带上可复用的能力说明，或有效的 Grok Bot ID。'};
    const defaultJob = grok ? (templateUrl ? 'Grok 模板' : 'Grok 助手') : '外部助手';
    return {name, shape, color, skill, job:job || (role?.guest??role)?.job || defaultJob, url, instructions,
      outfit:normalizeOutfit(raw.outfit), ...(grok ? {sourceId, templateUrl} : {})};
  }

  function prepare(raw) {
    const info = fields(raw);
    if (info.error) return {ok:false, error:info.error};
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const id = 'guest-' + Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
    return {ok:true, record:{...info, id, createdAt:Date.now()}};
  }

  function grokFields(raw) {
    const shape = shapes.some(s => s.value === raw.shape) ? raw.shape : 'orb';
    const color = typeof raw.color === 'string' && /^#[\da-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : colors[0].value;
    return fields({...raw, shape, color, skill:'grok'});
  }

  async function prepareGrok(raw) {
    if (raw?.v !== 1) return {ok:false, error:'这个文件不是小屋支持的 Grok Bot 入屋资料。'};
    const info = grokFields(raw);
    if (info.error) return {ok:false, error:info.error};
    let source = ['name',info.name.toLowerCase(),info.job.toLowerCase()];
    if (info.templateUrl) source = ['template',info.templateUrl];
    else if (info.sourceId) source = ['id',info.sourceId];
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(source)));
    const id = 'guest-' + Array.from(new Uint8Array(digest, 0, 16), n => n.toString(16).padStart(2, '0')).join('');
    return {ok:true, record:{...info, id, createdAt:Date.now()}};
  }

  function fromCommunity(raw) {
    if (raw?.v !== 1 || !/^post-[a-f0-9]{32}$/.test(raw.id) || !Number.isFinite(raw.createdAt)) return null;
    const {name, job, instructions, shape, color, templateUrl} = raw;
    const info = grokFields({name, job, instructions, shape, color, templateUrl});
    if (info.error) return null;
    return {...info, id:raw.id, createdAt:raw.createdAt, community:true};
  }

  function all() {
    const records = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(keyPrefix)) continue;
        const id = key.slice(keyPrefix.length);
        if (!idFormat.test(id)) continue;
        try {
          const raw = JSON.parse(localStorage.getItem(key));
          const info = fields(raw,true);
          if (!info.error && raw.id === id && Number.isFinite(raw.createdAt))
            records.push({...info, id, createdAt:raw.createdAt});
        } catch { /* A damaged entry should not prevent the other residents loading. */ }
      }
    } catch { /* The existing room still opens if browser storage is unavailable. */ }
    return records.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  function save(record) {
    localStorage.setItem(keyPrefix + record.id, JSON.stringify(record));
  }

  function saveInstructions(id, instructions) {
    if (!idFormat.test(id)) throw new Error('找不到这位伙伴。');
    const record = JSON.parse(localStorage.getItem(keyPrefix + id));
    if (record?.id !== id || record.skill !== 'external') throw new Error('找不到这个外部 Bot。');
    const value = text(instructions);
    save({...record, instructions:value});
    return value;
  }

  function roleOutfit(id) {
    try { return normalizeOutfit(JSON.parse(localStorage.getItem(roleOutfitPrefix + id))); }
    catch { return normalizeOutfit(); }
  }

  function saveOutfit(id,outfit) {
    if (roles.some(role=>role.id===id)) {
      if (Object.values(outfit).every(style=>style==='none')) localStorage.removeItem(roleOutfitPrefix+id);
      else localStorage.setItem(roleOutfitPrefix+id,JSON.stringify(outfit));
      return;
    }
    if (!idFormat.test(id)) throw new Error('找不到这位伙伴。');
    const record=JSON.parse(localStorage.getItem(keyPrefix+id));
    if (record?.id!==id) throw new Error('找不到这位伙伴。');
    save({...record,outfit});
  }

  function definition(record) {
    const role = roles.find(r => r.id === record.skill);
    const grok = record.skill === 'grok';
    const capability = role?.guest ?? role;
    return {
      ...record, scale:Math.min(role?.scale ?? Infinity, .32*CabinCharacters.guestScale),
      base:0, yaw:0,
      tool:capability?.tool ?? (grok?'在 Grok 中使用':'打开 Bot'), short:role?.short ?? (grok?'G':'访'),
      about:capability?.about ?? (grok?'从 Grok 带来的小屋伙伴。':'带着自己的工作来到小屋，点开链接就能去找它。')
    };
  }
  return {shapes, colors, grokTemplateLink, prepare, prepareGrok, fromCommunity, all, save, saveInstructions, roleOutfit, saveOutfit, definition};
})();
