<script type="module">
// ════════════════════════════════════════════════════════════════
//  1. 响应式导航栏 (保留原有优秀逻辑)
// ════════════════════════════════════════════════════════════════
(function () {
    const nav    = document.querySelector('nav');
    const header = document.querySelector('header');
    if (!nav || !header) return;

    const navLinks = Array.from(nav.querySelectorAll('p a'));
    if (navLinks.length === 0) return;

    const hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', '展开菜单');
    hamburger.textContent = '☰';
    nav.appendChild(hamburger);

    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'nav-mobile-menu';
    navLinks.forEach(a => {
        const link = document.createElement('a');
        link.href = a.href;
        link.textContent = a.textContent;
        mobileMenu.appendChild(link);
    });
    document.body.appendChild(mobileMenu);

    function positionMenu() {
        const rect = header.getBoundingClientRect();
        mobileMenu.style.top   = rect.bottom + 'px';
        mobileMenu.style.left  = rect.left   + 'px';
        mobileMenu.style.width = rect.width  + 'px';
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = mobileMenu.classList.toggle('open');
        hamburger.textContent = isOpen ? '✕' : '☰';
        if (isOpen) positionMenu();
    });
    document.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburger.textContent = '☰';
    });
})();

// ════════════════════════════════════════════════════════════════
//  2. 工业级图片画廊 (基于 PhotoSwipe v5)
// ════════════════════════════════════════════════════════════════
import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';

(function () {
    const images = Array.from(document.querySelectorAll('main img'));
    if (images.length === 0) return;

    // 步骤一：动态重构 DOM 结构，以符合 PhotoSwipe 的严格要求
    images.forEach(img => {
        // 防止由于路由变化等原因导致的重复包装
        if (img.parentElement.tagName === 'A' && img.parentElement.classList.contains('pswp-gallery__item')) return;

        const link = document.createElement('a');
        link.href = img.src;
        link.className = 'pswp-gallery__item';
        link.target = '_blank';
        link.setAttribute('data-cropped', 'true'); // 优化点击动画的起点
        
        // 赋予默认的后备尺寸
        link.setAttribute('data-pswp-width', img.naturalWidth || 1600);
        link.setAttribute('data-pswp-height', img.naturalHeight || 1200);

        // 图片加载完毕后，获取最真实的物理尺寸以保证动画的完美映射
        if (!img.complete) {
            img.onload = () => {
                link.setAttribute('data-pswp-width', img.naturalWidth);
                link.setAttribute('data-pswp-height', img.naturalHeight);
            };
        }

        // 插入到 DOM 中
        img.parentNode.insertBefore(link, img);
        link.appendChild(img);
    });

    // 步骤二：按父级元素进行自动分组（还原你原本「同段落图片左右滑动」的设计意图）
    const groups = new Map();
    document.querySelectorAll('main .pswp-gallery__item').forEach(item => {
        const parent = item.parentElement;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push(item);
    });

    groups.forEach((items, parent) => {
        parent.classList.add('pswp-gallery');
    });

    // 步骤三：引擎初始化与物理参数设置
    const lightbox = new PhotoSwipeLightbox({
        gallery: '.pswp-gallery',
        children: '.pswp-gallery__item',
        // 动态加载核心模块，避免首屏阻塞
        pswpModule: () => import('https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js'),
        bgOpacity: 0.95, // 沉浸式暗化背景
        spacing: 0.1,    // 图片间距
        padding: { top: 20, bottom: 20, left: 0, right: 0 }, // 安全边距
        errorMsg: '图片加载失败'
    });

    lightbox.init();
})();

// ════════════════════════════════════════════════════════════════
//  3. 动态提取并注入具体时间 (Notes 页面专用)
// ════════════════════════════════════════════════════════════════
(function () {
    // 仅捕获 notes 页面的时间节点，避免误伤其他页面
    const timeNodes = document.querySelectorAll('.notes-stream ul li time');
    if (timeNodes.length === 0) return;

    timeNodes.forEach(timeNode => {
        const datetimeStr = timeNode.getAttribute('datetime');
        if (!datetimeStr) return;

        // 解析时间字符串，浏览器会自动将其转换为访问者的本地时区时间
        const dateObj = new Date(datetimeStr);
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // 创建用于显示精确时间的节点
        const timeSpan = document.createElement('span');
        timeSpan.className = 'exact-time';
        timeSpan.textContent = timeStr;

        // 寻找外层的日期容器 (即原本设定为 grid-column: 1 / 2 的 span)
        const dateContainer = timeNode.closest('span');
        if (dateContainer) {
            dateContainer.appendChild(timeSpan);
        }
    });
})();

</script>