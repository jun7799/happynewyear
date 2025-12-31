/**
 * 新年许愿池特效合集
 * 国潮新年风 - 飘雪、烟花、卡片翻转、分享图片生成
 */
(() => {
  'use strict';

  // ============================================
  // 飘雪效果
  // ============================================
  function initSnowEffect() {
    const container = document.querySelector('.snow-container');
    if (!container) return;

    const snowflakes = ['❄', '❅', '❆', '✻', '✼', '❉'];
    const createSnowflake = () => {
      const snow = document.createElement('div');
      snow.className = 'snowflake';
      snow.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
      snow.style.left = Math.random() * 100 + '%';
      snow.style.fontSize = (0.6 + Math.random() * 0.8) + 'rem';
      snow.style.opacity = 0.3 + Math.random() * 0.5;
      snow.style.setProperty('--drift', (-20 + Math.random() * 40) + 'px');
      snow.style.animationDuration = (8 + Math.random() * 12) + 's';
      container.appendChild(snow);

      setTimeout(() => snow.remove(), 20000);
    };

    // 初始创建
    for (let i = 0; i < 15; i++) {
      setTimeout(createSnowflake, i * 200);
    }
    // 持续创建
    setInterval(createSnowflake, 800);
  }

  // ============================================
  // 烟花效果
  // ============================================
  function initFireworks() {
    const container = document.querySelector('.fireworks-container');
    if (!container) return;

    const colors = ['#FFD700', '#FF6B6B', '#FF69B4', '#9B59B6', '#06D6A0', '#FFA000'];

    const createFirework = () => {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.left = (20 + Math.random() * 60) + '%';
      firework.style.top = (10 + Math.random() * 40) + '%';
      firework.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      firework.style.setProperty('--scale', 15 + Math.random() * 25);
      firework.style.setProperty('--duration', 0.8 + Math.random() * 0.6 + 's');
      container.appendChild(firework);

      setTimeout(() => firework.remove(), 1500);
    };

    // 随机触发
    const scheduleFirework = () => {
      const delay = 3000 + Math.random() * 5000;
      setTimeout(() => {
        createFirework();
        scheduleFirework();
      }, delay);
    };
    scheduleFirework();
  }

  // ============================================
  // 卡片翻转效果
  // ============================================
  function initCardFlip() {
    const cards = document.querySelectorAll('.wish-card');

    cards.forEach(card => {
      const flipBtn = card.querySelector('.flip-btn');
      if (!flipBtn) return;

      // 点击翻转按钮
      flipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.classList.toggle('flipped');
      });

      // 点击卡片翻转（但排除分享按钮）
      card.addEventListener('click', (e) => {
        if (e.target.closest('.share-btn')) return;
        card.classList.toggle('flipped');
      });
    });
  }

  // ============================================
  // 分享卡片图片生成
  // ============================================
  function initShareCard() {
    const shareBtns = document.querySelectorAll('.share-btn');
    const modal = document.getElementById('shareModal');
    const canvas = document.getElementById('shareCanvas');
    const closeBtn = document.querySelector('.share-modal-close');
    const downloadBtn = document.getElementById('downloadBtn');

    if (!modal || !canvas) return;

    let currentImageBlob = null;

    // 关闭模态框
    const closeModal = () => {
      modal.classList.remove('active');
      currentImageBlob = null;
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // 下载图片
    downloadBtn.addEventListener('click', () => {
      if (!currentImageBlob) return;

      const url = URL.createObjectURL(currentImageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `新年许愿卡_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('图片已保存 ✨');
    });

    // 生成分享卡片
    shareBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const content = btn.dataset.content || '';
        const author = btn.dataset.author || '匿名';

        // 先获取跳转链接，然后生成卡片
        showLoading();
        fetchRedirectUrl().then(redirectUrl => {
          generateShareCard(content, author, redirectUrl);
          modal.classList.add('active');
        }).catch(err => {
          console.error('获取跳转链接失败:', err);
          // 失败时使用默认链接
          generateShareCard(content, author, 'https://wish.baihehuakai666.asia/');
          modal.classList.add('active');
        }).finally(() => {
          hideLoading();
        });
      });
    });

    // 显示加载状态
    function showLoading() {
      downloadBtn.textContent = '加载中...';
      downloadBtn.disabled = true;
    }

    // 隐藏加载状态
    function hideLoading() {
      downloadBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 13L10 3M10 13L6 9M10 13L14 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 13V15C3 15.9319 3 16.3978 3.15224 16.7654C3.35523 17.2554 3.74458 17.6448 4.23463 17.8478C4.60218 18 5.06812 18 6 18H14C14.9319 18 15.3978 18 15.7654 17.8478C16.2554 17.6448 16.6448 17.2554 16.8478 16.7654C17 16.3978 17 15.9319 17 15V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        保存图片
      `;
      downloadBtn.disabled = false;
    }

    // 获取跳转链接
    async function fetchRedirectUrl() {
      try {
        const response = await fetch('/api/redirect-url');
        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error('获取跳转链接失败:', error);
        throw error;
      }
    }

    // 生成二维码并返回 Data URL
    function generateQRCodeDataURL(url, size = 150) {
      return new Promise((resolve, reject) => {
        // 创建一个隐藏的 div 用于生成二维码
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        document.body.appendChild(div);

        try {
          // 使用 qrcodejs2 生成二维码 - 使用红色系配色
          const qr = new QRCode(div, {
            text: url,
            width: size,
            height: size,
            colorDark: '#C62828',        // 深红色
            colorLight: '#FFF8F0',       // 米白色
            correctLevel: QRCode.CorrectLevel.M
          });

          // 等待二维码生成完成
          setTimeout(() => {
            const canvas = div.querySelector('canvas');
            if (canvas) {
              // 给二维码加个红色边框效果
              const ctx = canvas.getContext('2d');
              ctx.strokeStyle = '#D32F2F';
              ctx.lineWidth = 4;
              ctx.strokeRect(0, 0, size, size);

              const dataURL = canvas.toDataURL('image/png');
              document.body.removeChild(div);
              resolve(dataURL);
            } else {
              // 如果 canvas 不存在，尝试 img
              const img = div.querySelector('img');
              if (img && img.src) {
                document.body.removeChild(div);
                resolve(img.src);
              } else {
                document.body.removeChild(div);
                reject(new Error('二维码生成失败'));
              }
            }
          }, 100);
        } catch (error) {
          document.body.removeChild(div);
          reject(error);
        }
      });
    }

    /**
     * 使用 Canvas 生成分享卡片
     */
    async function generateShareCard(content, author, redirectUrl) {
      const ctx = canvas.getContext('2d');
      const width = 750;
      const height = 1100;

      // 设置 Canvas 实际尺寸（用于生成高清图片）
      canvas.width = width;
      canvas.height = height;

      // ============ 背景区域 ============
      // 背景渐变
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#FFF8F0');
      bgGradient.addColorStop(0.3, '#FDFBF7');
      bgGradient.addColorStop(1, '#FFE8E8');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 顶部装饰条 - 渐变
      const topGradient = ctx.createLinearGradient(0, 0, width, 0);
      topGradient.addColorStop(0, '#D32F2F');
      topGradient.addColorStop(0.5, '#FFD700');
      topGradient.addColorStop(1, '#D32F2F');
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, 0, width, 16);

      // 底部装饰条
      ctx.fillStyle = topGradient;
      ctx.fillRect(0, height - 16, width, 16);

      // ============ 顶部标题区 ============
      ctx.fillStyle = '#D32F2F';
      ctx.font = 'bold 52px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('新年许愿池', width / 2, 85);

      ctx.fillStyle = '#888';
      ctx.font = '20px "Noto Serif SC", serif';
      ctx.fillText('2025 NEW YEAR WISH', width / 2, 115);

      // 装饰线
      ctx.strokeStyle = 'rgba(211, 47, 47, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, 128);
      ctx.lineTo(width / 2 + 80, 128);
      ctx.stroke();

      // ============ 灯笼装饰 ============
      drawLantern(ctx, 70, 160);
      drawLantern(ctx, width - 70, 160);

      // ============ 愿望内容卡片 ============
      const cardY = 220;
      const cardHeight = 400;  // 增加高度

      // 卡片阴影
      ctx.shadowColor = 'rgba(211, 47, 47, 0.15)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;

      // 卡片背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      roundRect(ctx, 50, cardY, width - 100, cardHeight, 24);
      ctx.fill();

      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 卡片边框 - 渐变
      const cardBorderGradient = ctx.createLinearGradient(50, cardY, width - 50, cardY);
      cardBorderGradient.addColorStop(0, '#D32F2F');
      cardBorderGradient.addColorStop(0.5, '#FFD700');
      cardBorderGradient.addColorStop(1, '#D32F2F');
      ctx.strokeStyle = cardBorderGradient;
      ctx.lineWidth = 3;
      roundRect(ctx, 50, cardY, width - 100, cardHeight, 24);
      ctx.stroke();

      // 顶部装饰 emoji
      ctx.font = '42px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏮', width / 2, cardY + 55);

      // 愿望内容（限制最多 4 行，超出显示省略号）
      ctx.fillStyle = '#1A1A1A';
      ctx.font = '34px "Noto Serif SC", serif';
      const maxWidth = width - 140;
      const lines = wrapText(ctx, content, maxWidth);
      const lineHeight = 52;
      let textY = cardY + 115;

      // 最多显示 4 行
      const maxLines = 4;
      const displayLines = lines.slice(0, maxLines);

      displayLines.forEach((line, index) => {
        // 如果是最后一行且原内容还有更多行，添加省略号
        if (index === maxLines - 1 && lines.length > maxLines) {
          let displayLine = line;
          // 尝试添加省略号
          const testLine = line + '...';
          const metrics = ctx.measureText(testLine);
          if (metrics.width <= maxWidth) {
            displayLine = testLine;
          } else {
            // 如果加了省略号超宽，逐个删除字符直到能放下
            while (displayLine.length > 0 && ctx.measureText(displayLine + '...').width > maxWidth) {
              displayLine = displayLine.slice(0, -1);
            }
            displayLine += '...';
          }
          ctx.fillText(displayLine, width / 2, textY);
        } else {
          ctx.fillText(line, width / 2, textY);
        }
        textY += lineHeight;
      });

      // 分隔线
      ctx.strokeStyle = 'rgba(211, 47, 47, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(120, cardY + cardHeight - 50);
      ctx.lineTo(width - 120, cardY + cardHeight - 50);
      ctx.stroke();

      // 作者
      ctx.fillStyle = '#888';
      ctx.font = '20px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('— ' + author + ' —', width / 2, cardY + cardHeight - 22);

      // ============ 二维码区域（简洁版，无背景框）============
      // 计算卡片和底部之间的中间位置
      const cardBottom = cardY + cardHeight;
      const bottomY = height - 80;  // 底部祝福语上方留出空间
      const middleY = (cardBottom + bottomY) / 2;
      const qrY = middleY - 70;  // 二维码区域中心对齐中间位置

      // 二维码标题（简洁，无边框）
      ctx.fillStyle = '#D32F2F';
      ctx.font = 'bold 26px "Noto Serif SC", serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码许愿 · 分享祝福', width / 2, qrY);

      // 生成二维码
      try {
        const qrDataURL = await generateQRCodeDataURL(redirectUrl, 140);

        const img = new Image();
        img.onload = () => {
          const qrSize = 140;
          const qrX = (width - qrSize) / 2;
          const qrDrawY = qrY + 45;

          // 二维码阴影
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;

          // 白色背景
          const bgPadding = 12;
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, qrX - bgPadding, qrDrawY - bgPadding, qrSize + bgPadding * 2, qrSize + bgPadding * 2, 16);
          ctx.fill();

          // 重置阴影
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // 绘制二维码
          ctx.drawImage(img, qrX, qrDrawY, qrSize, qrSize);

          // 二维码下方装饰
          ctx.fillStyle = '#C62828';
          ctx.font = 'bold 16px "Noto Serif SC", serif';
          ctx.textAlign = 'center';
          ctx.fillText('✨ 新年许愿池 ✨', width / 2, qrDrawY + qrSize + 25);

          // 底部祝福语 - 根据二维码位置动态调整
          const bottomTextY = qrDrawY + qrSize + 80;
          ctx.fillStyle = '#D32F2F';
          ctx.font = 'bold 30px "Noto Serif SC", serif';
          ctx.fillText('愿你的愿望成真', width / 2, bottomTextY);

          // 底部装饰 emoji
          ctx.font = '22px serif';
          ctx.fillText('🧧', 80, bottomTextY + 30);
          ctx.fillText('🎆', width - 80, bottomTextY + 30);

          // 转换为 Blob
          canvas.toBlob((blob) => {
            currentImageBlob = blob;
          }, 'image/png');
        };
        img.onerror = () => {
          console.error('二维码图片加载失败');
          drawBottomContent(ctx, width, height, qrY);
          canvas.toBlob((blob) => {
            currentImageBlob = blob;
          }, 'image/png');
        };
        img.src = qrDataURL;

      } catch (error) {
        console.error('二维码生成失败:', error);
        drawBottomContent(ctx, width, height, qrY);
        canvas.toBlob((blob) => {
          currentImageBlob = blob;
        }, 'image/png');
      }
    }

    // 绘制底部内容（备用）
    function drawBottomContent(ctx, width, height, startY) {
      const bottomY = startY + 50;
      ctx.fillStyle = '#D32F2F';
      ctx.font = 'bold 32px "Noto Serif SC", serif';
      ctx.fillText('愿你的愿望成真', width / 2, bottomY);

      ctx.fillStyle = '#666';
      ctx.font = '20px "Noto Serif SC", serif';
      ctx.fillText('✨ 新年好运连连 ✨', width / 2, bottomY + 35);

      ctx.font = '24px serif';
      ctx.fillText('🧧', 100, height - 60);
      ctx.fillText('🎆', width - 100, height - 60);
    }

    /**
     * 绘制灯笼
     */
    function drawLantern(ctx, x, y) {
      // 灯笼主体
      const gradient = ctx.createRadialGradient(x, y + 30, 5, x, y + 30, 35);
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(1, '#C62828');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y + 30, 30, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      // 金色边框
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + 10, 20, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + 50, 20, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    /**
     * 绘制圆角矩形
     */
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    /**
     * 文本自动换行
     */
    function wrapText(ctx, text, maxWidth) {
      const words = text.split('');
      const lines = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i];
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      // 最多显示 5 行
      return lines.slice(0, 5);
    }

    /**
     * 显示提示信息
     */
    function showToast(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: linear-gradient(135deg, #D32F2F, #C62828);
        color: white;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(211, 47, 47, 0.3);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1001;
      `;
      document.body.appendChild(toast);

      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  // ============================================
  // 初始化所有功能
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    initSnowEffect();
    initFireworks();
    initCardFlip();
    initShareCard();
  });

})();
