/**
 * 新年许愿池弹幕效果 v3.0
 * 国潮新年风 - 弹幕升级版
 */
(() => {
  const el = document.getElementById('danmaku');
  const wishes = Array.isArray(window.WISHES) ? window.WISHES : [];
  const H = el ? el.clientHeight : 180;

  // 弹幕样式池 - 国潮配色
  const STYLE_CLASSES = ['style-1', 'style-2', 'style-3', 'style-4', 'style-5'];

  // 新年表情装饰池
  const EMOJIS = ['🏮', '🎉', '✨', '🎊', '🌟', '💫', '🎆', '🎇', '🧨', '🥰', '💖', '🎁', '🐍', '🧧'];

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
    return 0.9 + Math.random() * 0.25;
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

    // 随机位置 - 上下留出空间
    const y = Math.random() * (H - 50) + 10;
    b.style.top = `${y}px`;

    // 随机速度 - 8-18秒
    const dur = 8 + Math.random() * 10;
    b.style.setProperty('--dur', `${dur}s`);

    // 随机大小 - 通过 CSS 变量设置，避免与动画 transform 冲突
    const scale = getRandomScale();
    b.style.setProperty('--scale', scale);

    // 组合文本 - 限制内容最多20个字
    const author = wish.author || '匿名';
    let content = wish.content || '';
    if (content.length > 20) {
      content = content.substring(0, 20) + '...';
    }
    b.textContent = `${content} — ${author}`;

    // 40% 概率加个表情装饰
    if (Math.random() < 0.4) {
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
    setTimeout(remove, (dur + 1) * 1000);
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
    // 初始发射 10 条弹幕
    const initialCount = Math.min(10, wishes.length);
    for (let k = 0; k < initialCount; k++) {
      setTimeout(() => next(), k * 120);
    }

    // 之后每隔 0.8 秒发射一条
    setInterval(next, 800);

    // 事件委托：鼠标悬停暂停弹幕
    el.addEventListener('mouseover', (e) => {
      const bullet = e.target.closest('.bullet');
      if (bullet) {
        bullet.classList.add('paused');
        bullet.style.animationPlayState = 'paused';
      }
    });

    el.addEventListener('mouseout', (e) => {
      const bullet = e.target.closest('.bullet');
      if (bullet) {
        bullet.classList.remove('paused');
        bullet.style.animationPlayState = 'running';
      }
    });
  });

})();
