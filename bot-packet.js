window.CabinBotPacket = (() => {
  async function decode(encoded, maxBytes = 120_000) {
    if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 32000)
      throw new Error('无法读取入屋资料。请使用完整入屋链接或 Bot JSON。');
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const {done, value:chunk} = await stream.read();
        if (done) break;
        size += chunk.length;
        if (size > maxBytes) throw new Error('这份入屋资料太长。');
        chunks.push(chunk);
      }
    } finally { await stream.cancel().catch(() => {}); }
    return JSON.parse(await new Blob(chunks).text());
  }

  function promptLink(message, id = '') {
    const line = message.replace(/[\r\n]+/g, ' ');
    if (!line || line.length > 1000) return '';
    const params = new URLSearchParams();
    if (id) params.set('id', id);
    params.set('text', line);
    return 'grokbot://app/v1/prompt?' + params.toString().replace(/\+/g, '%20');
  }

  return {decode, promptLink};
})();
