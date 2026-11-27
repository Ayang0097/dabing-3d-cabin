const botsPath = '/api/community/bots';
const keyPath = '/api/community/upload-key';
const verifyKeyPath = '/api/community/verify-upload-key';
const requestId = /^[a-f0-9]{32}$/;
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

async function keyDigest(key) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(key)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

function publicProfile(payload) {
  const packet = payload.packet;
  if (payload.publish !== true || packet?.v !== 1 || typeof packet.requestId !== 'string' || !requestId.test(packet.requestId)) {
    throw new RequestError(400, '请确认 Bot 资料并提交公开投稿。');
  }
  const templateUrl = readTemplate(packet.templateUrl);
  const profile = {
    v:1,
    name:readText(packet.name, 'Bot 名称', 20),
    job:readText(packet.job, '岗位', 20),
    instructions:readText(packet.instructions, '工作指令', 2400, {optional:Boolean(templateUrl), multiline:true}),
    shape:shapeOptions.has(packet.shape) ? packet.shape : 'orb',
    color:typeof packet.color === 'string' && /^#[a-f0-9]{6}$/i.test(packet.color) ? packet.color.toLowerCase() : '#27d875',
    ...(templateUrl ? {templateUrl} : {}),
  };
  return {id:'post-' + packet.requestId, data:JSON.stringify(profile)};
}

function record(row) {
  return {...JSON.parse(row.data), id:row.id, createdAt:row.created_at};
}

async function listBots(db, before) {
  if (before && (!/^[1-9]\d*$/.test(before) || !Number.isSafeInteger(Number(before)))) {
    throw new RequestError(400, '投稿名册页码无效。');
  }
  const ordered = ' ORDER BY seq DESC LIMIT ?';
  const rows = before
    ? await db.prepare('SELECT * FROM community_bots WHERE seq < ?' + ordered).bind(Number(before), pageSize + 1).all()
    : await db.prepare('SELECT * FROM community_bots' + ordered).bind(pageSize + 1).all();
  return {
    bots:rows.results.slice(0, pageSize).map(record),
    next:rows.results.length > pageSize ? rows.results[pageSize - 1].seq : null,
  };
}

async function updateUploadKey(env, payload) {
  const owner = normalizeKey(env.BOT_OWNER_KEY);
  const supplied = normalizeKey(payload.ownerKey);
  if (!owner) throw new RequestError(503, '屋主密钥设置暂未启用。');
  if (!supplied || !sameDigest(await keyDigest(supplied), await keyDigest(owner))) {
    throw new RequestError(403, '屋主密钥不正确。');
  }
  const newKey = normalizeKey(payload.uploadKey);
  if (newKey.length < 16) throw new RequestError(400, '上传密钥需填写 16 到 256 个字符。');
  const digest = await keyDigest(newKey);
  if (sameDigest(digest, await keyDigest(owner))) {
    throw new RequestError(400, '请为上传使用单独的密钥。');
  }
  await env.DB.prepare(
    'INSERT INTO cabin_upload_key (id, digest) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET digest=excluded.digest'
  ).bind(digest).run();
}

async function requireUploadKey(db, key) {
  const supplied = normalizeKey(key);
  if (!supplied) throw new RequestError(403, '请填写屋主提供的上传密钥。');
  const authorized = await db.prepare('SELECT digest FROM cabin_upload_key WHERE id = 1').first('digest');
  if (!authorized || !sameDigest(await keyDigest(supplied), authorized)) {
    throw new RequestError(403, '上传密钥不正确或已更换。');
  }
  return authorized;
}

async function publishBot(env, payload) {
  const authorized = await requireUploadKey(env.DB, payload.uploadKey);
  const {id, data} = publicProfile(payload);
  // Recheck within the write so a rotated key cannot authorize a late upload.
  const insert = env.DB.prepare(
    'INSERT INTO community_bots (id, created_at, data) SELECT ?, ?, ? ' +
    'WHERE EXISTS (SELECT 1 FROM cabin_upload_key WHERE id = 1 AND digest = ?) ON CONFLICT(id) DO NOTHING'
  ).bind(id, Date.now(), data, authorized);
  const select = env.DB.prepare('SELECT * FROM community_bots WHERE id = ?').bind(id);
  const [written, read] = await env.DB.batch([insert, select]);
  const row = read.results[0];
  if (!row) throw new RequestError(403, '上传密钥已更换，请向屋主核对。');
  if (row.data !== data) throw new RequestError(409, '这个投稿编号已经用过，请重新生成投稿链接。');
  return {bot:record(row), created:written.meta.changes === 1};
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
      const isWriteRoute = pathname === botsPath || pathname === keyPath || pathname === verifyKeyPath;
      if (request.method === 'OPTIONS' && isWriteRoute && allowed) {
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        headers.set('Access-Control-Max-Age', '600');
        return new Response(null, {status:204, headers});
      }
      if (request.method === 'POST' && isWriteRoute) {
        if (origin && !allowed) throw new RequestError(403, '请从小屋的上传页提交。');
        const payload = await readJson(request);
        if (pathname === keyPath) {
          await updateUploadKey(env, payload);
          return reply(200, {updated:true});
        }
        if (pathname === verifyKeyPath) {
          await requireUploadKey(env.DB, payload.uploadKey);
          return reply(200, {valid:true});
        }
        const result = await publishBot(env, payload);
        return reply(result.created ? 201 : 200, result);
      }
      if (request.method === 'GET') {
        if (pathname === botsPath) return reply(200, await listBots(env.DB, searchParams.get('before')));
        const id = pathname.slice(botsPath.length + 1);
        if (pathname.startsWith(botsPath + '/') && botId.test(id)) {
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
