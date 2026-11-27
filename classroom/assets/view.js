(() => {
  const room = window.BotRoomScene;
  const seatMap = document.getElementById('seat-map');
  const labels = Array.from({length:room.seatCount}, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.className = 'seat';
    label.setAttribute('role', 'listitem');
    label.setAttribute('aria-label', number + ' 号座位');
    label.textContent = number;
    seatMap.append(label);
    return label;
  });
  room.makeClassroom(document.getElementById('room'), (number, x, y) => {
    const label = labels[number - 1];
    label.style.left = x.toFixed(3) + '%';
    label.style.top = y.toFixed(3) + '%';
  });
  document.getElementById('room-title').focus({preventScroll:true});

  const embedded = parent !== window && new URLSearchParams(location.search).get('from') === 'cabin';
  if (embedded) {
    const returnToCabin = () => parent.postMessage('cabin-classroom-return', location.origin);
    document.getElementById('back').addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      returnToCabin();
    });
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      returnToCabin();
    });
    parent.postMessage('cabin-classroom-ready', location.origin);
  }
})();
