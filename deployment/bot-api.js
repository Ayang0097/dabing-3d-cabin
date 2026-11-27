(() => {
  const endpoint = window.CabinPublication?.botsEndpoint;
  if (!endpoint) return;

  window.CabinBotApi = async function(path, payload, method = 'POST') {
    let response, result;
    try {
      response = await fetch(new URL(path, endpoint), {
        method,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload),
        credentials:'omit',
        signal:AbortSignal.timeout(12_000),
      });
      result = await response.json();
    } catch {
      throw new Error('小屋暂时连不上，请稍后重试。');
    }
    if (!response.ok) {
      const error = new Error(result.error || '暂时无法提交，请稍后重试。');
      error.status = response.status;
      throw error;
    }
    return result;
  };
})();
