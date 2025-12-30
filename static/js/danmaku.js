/**
 * 许愿池弹幕效果 v2.0
 * 说干就干，旋转跳跃我闭着眼
 */
(() => {
  const el = document.getElementById('danmaku');
  const wishes = Array.isArray(window.WISHES) ? window.WISHES : [];
  const H = el ? el.clientHeight : 200;

  // 弹幕样式池
  const STYLE_CLASSES = ['style-1', 'style-2', 'style-3', 'style-4', 'style-5'];

  // 表情装饰池
  const EMOJIS = ['🎉', '✨', '🎊', '🌟', '💫', '🏮', '🎆', '🎇', '🧨', '🥰', '💖', '🎁'];

  /**
   * 获取随机弹幕样式
   */
  function getRandomStyle() {
    return STYLE_CLASSES[Math.floor(Math.random() * STYLE_CLASSES.length)];
  }

  /**
   * 获取随机大小缩放
   */
  function getRandomScale() {
    return 0.85 + Math.random() * 0.3; // 0.85 - 1.15
  }

  /**
   * 获取随机表情
   */
  function getRandomEmoji() {
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  }

  /**
   * 创建弹幕元素
   */
  function spawn(wish) {
    if (!el) return;

    const b = document.createElement('div');
    b.className = `bullet ${getRandomStyle()}`;

    // 随机位置
    const y = Math.random() * (H - 40);
    b.style.top = `${y}px`;

    // 随机速度
    const dur = 10 + Math.random() * 12;
    b.style.setProperty('--dur', `${dur}s`);

    // 随机大小
    const scale = getRandomScale();
    b.style.transform = `translateX(100vw) scale(${scale})`;

    // 组合文本
    const author = wish.author || '匿名';
    b.textContent = `${wish.content} — ${author}`;

    // 30% 概率加个表情装饰
    if (Math.random() < 0.3) {
      b.textContent += ` ${getRandomEmoji()}`;
    }

    el.appendChild(b);

    // 动画结束后移除
    const remove = () => {
      b.style.transition = 'opacity 0.3s ease';
      b.style.opacity = '0';
      setTimeout(() => b.remove(), 300);
    };

    b.addEventListener('animationend', remove);
    setTimeout(remove, (dur + 0.5) * 1000);
  }

  /**
   * 循环播放下一个愿望
   */
  let i = 0;
  function next() {
    if (wishes.length === 0) return;
    const w = wishes[i % wishes.length];
    spawn(w);
    i++;
  }

  /**
   * 页面加载完成后初始化
   */
  document.addEventListener('DOMContentLoaded', () => {
    // 初始发射 8 条弹幕
    const initialCount = Math.min(8, wishes.length);
    for (let k = 0; k < initialCount; k++) {
      setTimeout(() => next(), k * 150);
    }

    // 之后每隔 1 秒发射一条
    setInterval(next, 1000);
  });

})();
