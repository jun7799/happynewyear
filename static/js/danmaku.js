(() => {
  const el = document.getElementById('danmaku');
  const wishes = Array.isArray(window.WISHES) ? window.WISHES : [];
  const H = el ? el.clientHeight : 180;
  function spawn(text) {
    if (!el) return;
    const b = document.createElement('div');
    b.className = 'bullet';
    const y = Math.random() * (H - 32);
    const dur = 12 + Math.random() * 10;
    b.style.top = `${y}px`;
    b.style.setProperty('--dur', `${dur}s`);
    b.textContent = text;
    el.appendChild(b);
    const remove = () => b.remove();
    b.addEventListener('animationend', remove);
    setTimeout(remove, (dur + 0.2) * 1000);
  }
  let i = 0;
  function next() {
    if (wishes.length === 0) return;
    const w = wishes[i % wishes.length];
    const text = `${w.content} — ${w.author || '匿名'}`;
    spawn(text);
    i++;
  }
  document.addEventListener('DOMContentLoaded', () => {
    for (let k = 0; k < Math.min(6, wishes.length); k++) next();
    setInterval(next, 1200);
  });
})();
