const botsPath = '/api/community/bots';
const keyPath = '/api/community/upload-key';
const verifyKeyPath = '/api/community/verify-upload-key';
const membersPath = '/api/community/members';
const minePath = '/api/community/mine';
const identifier = /^[a-f0-9]{32}$/;
const botId = /^post-[a-f0-9]{32}$/;
const shapeOptions = new Set(['orb', 'tile', 'cloud', 'pebble', 'drop', 'badge', 'bloom', 'star']);
const pageSize = 12;
const maxBody = 18_000;
const encoder = new TextEncoder();

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readJson(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json' || !request.body) {
    throw new RequestError(415, '请从小屋的上传页提交。');
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', {fatal:true});
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) throw new RequestError(413, '投稿内容太长，请缩短后再提交。');
      text += decoder.decode(value, {stream:true});
    }
    const value = JSON.parse(text + decoder.decode());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, '无法读取投稿资料。');
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function normalizeKey(value) {
  return typeof value === 'string' && value.length <= 256 ? value.trim() : '';
}

const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const keyDigest = async key => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(key))));

function sameDigest(first, second) {
  return crypto.subtle.timingSafeEqual(encoder.encode(first), encoder.encode(second));
}

function readText(value, label, limit, {optional = false, multiline = false} = {}) {
  const text = typeof value === 'string' ? value.trim().replace(/\r\n/g, '\n') : '';
  if ((!text && !optional) || text.length > limit) {
    throw new RequestError(400, label + '需要在 1 到 ' + limit + ' 字之间。');
  }
  if (/[\x00-\x08\x0b-\x1f\x7f]/.test(text) || (!multiline && /[\n\t]/.test(text))) {
    throw new RequestError(400, '请检查' + label + '里的换行和特殊字符。');
  }
  return text;
}

function readTemplate(value) {
  const text = readText(value, 'Grok 模板链接', 1000, {optional:true});
  if (!text) return '';
  try {
    const url = new URL(text);
    const match = /^\/bot\/([A-Za-z0-9_-]{16,120})\/?$/.exec(url.pathname);
    if (match && ['https://x.ai', 'https://www.x.ai'].includes(url.origin) && !url.username && !url.password) {
      return 'https://x.ai/bot/' + match[1];
    }
  } catch {}
  throw new RequestError(400, '请填写完整的 Grok Bot 分享模板链接。');
}

function profileData(packet, instructions) {
  const templateUrl = readTemplate(packet.templateUrl);
  const profile = {
    v:1,
    name:readText(packet.name, 'Bot 名称', 20),
    job:readText(packet.job, '岗位', 20),
    instructions:readText(instructions, '工作指令', 2400, {optional:Boolean(templateUrl), multiline:true}),
    shape:shapeOptions.has(packet.shape) ? packet.shape : 'orb',
    color:typeof packet.color === 'string' && /^#[a-f0-9]{6}$/i.test(packet.color) ? packet.color.toLowerCase() : '#27d875',
    ...(templateUrl ? {templateUrl} : {}),
  };
  return JSON.stringify(profile);
}

function record(row) {
  return {...JSON.parse(row.data), id:row.id, createdAt:row.created_at, revision:row.revision};
}

async function listBots(db, before, memberId) {
  if (before && (!/^[1-9]\d*$/.test(before) || !Number.isSafeInteger(Number(before)))) {
    throw new RequestError(400, '投稿名册页码无效。');
  }
  const conditions = [], values = [];
  if (memberId === null) conditions.push('member_id IS NULL');
  else if (memberId) {
    conditions.push('member_id = ?');
    values.push(memberId);
  }
  if (before) {
    conditions.push('seq < ?');
    values.push(Number(before));
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const rows = await db.prepare('SELECT * FROM community_bots' + where + ' ORDER BY seq DESC LIMIT ?')
    .bind(...values, pageSize + 1).all();
  return {
    bots:rows.results.slice(0, pageSize).map(record),
    next:rows.results.length > pageSize ? rows.results[pageSize - 1].seq : null,
  };
}

async function requireOwner(env, key) {
  const owner = normalizeKey(env.BOT_OWNER_KEY);
  const supplied = normalizeKey(key);
  if (!owner) throw new RequestError(503, '屋主密钥设置暂未启用。');
  const digest = await keyDigest(owner);
  if (!supplied || !sameDigest(await keyDigest(supplied), digest)) {
    throw new RequestError(403, '屋主密钥不正确。');
  }
  return digest;
}

async function updateUploadKey(env, payload) {
  const ownerDigest = await requireOwner(env, payload.ownerKey);
  const newKey = normalizeKey(payload.uploadKey);
  if (newKey.length < 16) throw new RequestError(400, '上传密钥需填写 16 到 256 个字符。');
  const digest = await keyDigest(newKey);
  if (sameDigest(digest, ownerDigest)) {
    throw new RequestError(400, '请为上传使用单独的密钥。');
  }
  if (await env.DB.prepare('SELECT id FROM cabin_members WHERE digest = ?').bind(digest).first('id')) {
    throw new RequestError(400, '请给共用投稿单独设置一把密钥。');
  }
  await env.DB.prepare(
    'INSERT INTO cabin_upload_key (id, digest) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest'
  ).bind(digest).run();
}

async function requireUploadKey(db, key, personalOnly = false) {
  const supplied = normalizeKey(key);
  if (!supplied) throw new RequestError(403, '请填写屋主提供的上传密钥。');
  const digest = await keyDigest(supplied);
  const memberId = await db.prepare('SELECT id FROM cabin_members WHERE digest = ?').bind(digest).first('id');
  if (memberId) return {memberId, digest};
  const authorized = await db.prepare('SELECT digest FROM cabin_upload_key WHERE id = 1').first('digest');
  if (!authorized || !sameDigest(digest, authorized)) {
    throw new RequestError(403, '上传密钥不正确或已更换。');
  }
  if (personalOnly) throw new RequestError(403, '请用屋主发给你的个人密钥。共用密钥的投稿归属由屋主确认。');
  return {memberId:null, digest};
}

function uploadKeyCondition({memberId, digest}) {
  return memberId
    ? {sql:'EXISTS (SELECT 1 FROM cabin_members WHERE id = ? AND digest = ?)', values:[memberId, digest]}
    : {sql:'EXISTS (SELECT 1 FROM cabin_upload_key WHERE id = 1 AND digest = ?)', values:[digest]};
}

async function publishBot(env, payload) {
  const authorized = await requireUploadKey(env.DB, payload.uploadKey);
  const packet = payload.packet;
  if (payload.publish !== true || packet?.v !== 1 || typeof packet.requestId !== 'string' || !identifier.test(packet.requestId)) {
    throw new RequestError(400, '请确认 Bot 资料并提交公开投稿。');
  }
  const id = 'post-' + packet.requestId;
  const data = profileData(packet, packet.instructions);
  const gate = uploadKeyCondition(authorized);
  // Recheck within the write so a rotated key cannot authorize a late upload.
  const insert = env.DB.prepare(
    'INSERT INTO community_bots (id, created_at, data, member_id) SELECT ?, ?, ?, ? ' +
    'WHERE ' + gate.sql + ' ON CONFLICT(id) DO NOTHING'
  ).bind(id, Date.now(), data, authorized.memberId, ...gate.values);
  const select = env.DB.prepare('SELECT * FROM community_bots WHERE id = ? AND ' + gate.sql).bind(id, ...gate.values);
  const [written, read] = await env.DB.batch([insert, select]);
  const row = read.results[0];
  if (!row) throw new RequestError(403, '上传密钥已更换，请向屋主核对。');
  if (row.member_id !== authorized.memberId || row.data !== data) {
    throw new RequestError(409, '这个投稿编号已经用过，请重新打开上传页。');
  }
  return {bot:record(row), created:written.meta.changes === 1};
}

async function editBot(db, id, payload) {
  const authorized = await requireUploadKey(db, payload.uploadKey, true);
  const {memberId} = authorized;
  const {packet, revision} = payload;
  if (packet?.v !== 1 || !Number.isSafeInteger(revision) || revision < 0) {
    throw new RequestError(400, '请重新打开要编辑的 BOT。');
  }
  const row = await db.prepare('SELECT * FROM community_bots WHERE id = ? AND member_id = ?').bind(id, memberId).first();
  if (!row) throw new RequestError(404, '请从「我的 BOT」选择要编辑的投稿。');
  const data = profileData(packet, JSON.parse(row.data).instructions);
  const gate = uploadKeyCondition(authorized);
  const update = db.prepare('UPDATE community_bots SET data = ?, revision = revision + 1 ' +
    'WHERE id = ? AND member_id = ? AND revision = ? AND ' + gate.sql)
    .bind(data, id, memberId, revision, ...gate.values);
  const select = db.prepare('SELECT * FROM community_bots WHERE id = ? AND member_id = ? AND ' + gate.sql)
    .bind(id, memberId, ...gate.values);
  const [changed, refreshed] = await db.batch([update, select]);
  if (!refreshed.results[0]) throw new RequestError(403, '上传密钥已更换，请向屋主核对。');
  if (changed.meta.changes !== 1) throw new RequestError(409, '这位 BOT 已在其他页面更新。请重新载入后再编辑。');
  return {bot:record(refreshed.results[0])};
}

async function manageMembers(env, payload) {
  await requireOwner(env, payload.ownerKey);
  const db = env.DB;
  if (payload.action === 'list') {
    const {results:members} = await db.prepare('SELECT id, label FROM cabin_members ORDER BY label COLLATE NOCASE, id').all();
    const unassigned = await listBots(db, payload.before, null);
    return {members, ...unassigned};
  }
  if (payload.action === 'issue') {
    const label = readText(payload.label, '成员姓名或备注', 40);
    const id = crypto.randomUUID().replace(/-/g, '');
    const uploadKey = 'cabin_' + hex(crypto.getRandomValues(new Uint8Array(24)));
    const issued = await db.prepare('INSERT INTO cabin_members (id, label, digest) VALUES (?, ?, ?) ON CONFLICT(label) DO NOTHING')
      .bind(id, label, await keyDigest(uploadKey)).run();
    if (issued.meta.changes !== 1) throw new RequestError(409, '这个成员已有个人密钥，可选择重发。');
    return {member:{id, label}, uploadKey};
  }
  const memberId = payload.memberId;
  if (typeof memberId !== 'string' || !identifier.test(memberId)) throw new RequestError(400, '请选择成员。');
  if (payload.action === 'rotate') {
    const uploadKey = 'cabin_' + hex(crypto.getRandomValues(new Uint8Array(24)));
    const updated = await db.prepare('UPDATE cabin_members SET digest = ? WHERE id = ?')
      .bind(await keyDigest(uploadKey), memberId).run();
    if (updated.meta.changes !== 1) throw new RequestError(404, '请刷新页面后再选成员。');
    return {uploadKey};
  }
  if (payload.action === 'assign') {
    if (typeof payload.botId !== 'string' || !botId.test(payload.botId)) throw new RequestError(400, '请选择待绑定的 BOT。');
    const updated = await db.prepare('UPDATE community_bots SET member_id = ? WHERE id = ? AND member_id IS NULL ' +
      'AND EXISTS (SELECT 1 FROM cabin_members WHERE id = ?)').bind(memberId, payload.botId, memberId).run();
    if (updated.meta.changes !== 1) throw new RequestError(409, '请刷新列表，再选择待绑定的 BOT 和对应成员。');
    return {assigned:true};
  }
  throw new RequestError(400, '请从设置页选择密钥操作。');
}

export default {
  async fetch(request, env) {
    const {pathname, searchParams} = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = origin && origin === env.CABIN_SITE_ORIGIN;
    const headers = new Headers({
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff',
      'Vary':'Origin',
    });
    if (request.method === 'GET') headers.set('Access-Control-Allow-Origin', '*');
    else if (allowed) headers.set('Access-Control-Allow-Origin', origin);
    const reply = (status, data) => new Response(JSON.stringify(data), {status, headers});
    try {
      const id = pathname.startsWith(botsPath + '/') ? pathname.slice(botsPath.length + 1) : '';
      const isPostRoute = [botsPath, keyPath, verifyKeyPath, membersPath, minePath].includes(pathname);
      const isBot = botId.test(id);
      if (request.method === 'OPTIONS' && (isPostRoute || isBot) && allowed) {
        headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        headers.set('Access-Control-Max-Age', '600');
        return new Response(null, {status:204, headers});
      }
      if ((request.method === 'POST' && isPostRoute) || (request.method === 'PATCH' && isBot)) {
        if (origin && !allowed) throw new RequestError(403, '请从小屋的上传页提交。');
        const payload = await readJson(request);
        if (request.method === 'PATCH') return reply(200, await editBot(env.DB, id, payload));
        if (pathname === membersPath) return reply(200, await manageMembers(env, payload));
        if (pathname === minePath) {
          const {memberId} = await requireUploadKey(env.DB, payload.uploadKey, true);
          return reply(200, await listBots(env.DB, payload.before, memberId));
        }
        if (pathname === keyPath) {
          await updateUploadKey(env, payload);
          return reply(200, {updated:true});
        }
        if (pathname === verifyKeyPath) {
          const {memberId} = await requireUploadKey(env.DB, payload.uploadKey);
          return reply(200, {valid:true, personal:Boolean(memberId)});
        }
        const result = await publishBot(env, payload);
        return reply(result.created ? 201 : 200, result);
      }
      if (request.method === 'GET') {
        if (pathname === botsPath) return reply(200, await listBots(env.DB, searchParams.get('before')));
        if (isBot) {
          const row = await env.DB.prepare('SELECT * FROM community_bots WHERE id = ?').bind(id).first();
          if (row) return reply(200, {bot:record(row)});
        }
      }
      return reply(404, {error:'小屋里没有这个请求。'});
    } catch (error) {
      if (error instanceof RequestError) return reply(error.status, {error:error.message});
      console.error('Cabin BOT API request failed', error?.name);
      return reply(503, {error:'小屋的投稿服务暂时连不上，请稍后再试。'});
    }
  },
};
