<script type="module">
import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe-lightbox.esm.min.js';

const BlogApp = {
    // ════════════════════════════════════════════════════════════════
    //  0. 启动母线 (主信号链)
    // ════════════════════════════════════════════════════════════════
    init() {
        this.initSubtitle();
        this.initNavigation();
        this.initGallery();
        this.initExactTime();
        this.initYouTube();
        this.initExternalLinks();
    },

    // ════════════════════════════════════════════════════════════════
    //  1. 副标题注入 (解决真实 DOM 与 SEO 语义问题)
    // ════════════════════════════════════════════════════════════════
    initSubtitle() {
        const titleContainer = document.querySelector('header .title');
        // 检查是否已经注入过，防止重复
        if (!titleContainer || titleContainer.querySelector('.site-tagline')) return;
        
        const subtitle = document.createElement('span');
        subtitle.className = 'site-tagline';
        subtitle.textContent = ' / 记录即反抗。';
        titleContainer.appendChild(subtitle);
    },

    // ════════════════════════════════════════════════════════════════
    //  2. 响应式导航栏 (保留原有优秀逻辑)
    // ════════════════════════════════════════════════════════════════
    initNavigation() {
        const nav = document.querySelector('nav');
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
    },

    // ════════════════════════════════════════════════════════════════
    //  3. 工业级图片画廊 (基于 PhotoSwipe v5 的懒加载与重构)
    // ════════════════════════════════════════════════════════════════
    initGallery() {
        const images = Array.from(document.querySelectorAll('main img'));
        if (images.length === 0) return;

        // 步骤一：动态重构 DOM 结构，以符合 PhotoSwipe 的严格要求
        images.forEach(img => {
            if (img.parentElement.tagName === 'A' && img.parentElement.classList.contains('pswp-gallery__item')) return;

            const link = document.createElement('a');
            link.href = img.src;
            link.className = 'pswp-gallery__item';
            link.target = '_blank';
            link.setAttribute('data-cropped', 'true');
            link.setAttribute('data-pswp-width', img.naturalWidth || 1600);
            link.setAttribute('data-pswp-height', img.naturalHeight || 1200);

            if (!img.complete) {
                img.onload = () => {
                    link.setAttribute('data-pswp-width', img.naturalWidth);
                    link.setAttribute('data-pswp-height', img.naturalHeight);
                };
            }

            img.parentNode.insertBefore(link, img);
            link.appendChild(img);
        });

        // 步骤二：按父级元素进行自动分组
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
            pswpModule: () => import('https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js'),
            bgOpacity: 0.95,
            spacing: 0.1,
            padding: { top: 20, bottom: 20, left: 0, right: 0 },
            errorMsg: '图片加载失败'
        });

        // 动态劫持并注入底部图注
        lightbox.on('uiRegister', function() {
            lightbox.pswp.ui.registerElement({
                name: 'custom-caption',
                order: 9,
                isButton: false,
                appendTo: 'wrapper',
                html: '',
                onInit: (el, pswp) => {
                    lightbox.pswp.on('change', () => {
                        const currSlideElement = lightbox.pswp.currSlide.data.element;
                        let captionHTML = '';
                        if (currSlideElement) {
                            const container = currSlideElement.parentElement;
                            const nextEl = container.nextElementSibling;
                            if (nextEl && nextEl.tagName === 'FIGCAPTION') {
                                captionHTML = nextEl.innerHTML;
                            } else {
                                const img = currSlideElement.querySelector('img');
                                if (img && img.alt) {
                                    captionHTML = img.alt;
                                }
                            }
                        }
                        el.innerHTML = captionHTML || '';
                    });
                }
            });
        });

        lightbox.init();
    },

    // ════════════════════════════════════════════════════════════════
    //  4. 动态提取并注入具体时间 (Notes 页面专用)
    // ════════════════════════════════════════════════════════════════
    initExactTime() {
        const timeNodes = document.querySelectorAll('.notes ul li time, .gallery ul li time');
        if (timeNodes.length === 0) return;

        timeNodes.forEach(timeNode => {
            const datetimeStr = timeNode.getAttribute('datetime');
            if (!datetimeStr) return;

            const dateObj = new Date(datetimeStr);
            const hours = dateObj.getHours().toString().padStart(2, '0');
            const minutes = dateObj.getMinutes().toString().padStart(2, '0');

            const timeSpan = document.createElement('span');
            timeSpan.className = 'exact-time';
            timeSpan.textContent = `${hours}:${minutes}`;

            const dateContainer = timeNode.closest('span');
            if (dateContainer) {
                dateContainer.appendChild(timeSpan);
            }
        });
    },

    // ════════════════════════════════════════════════════════════════
    //  5. YouTube 并发加载自动嵌入 (支持裸链与 Markdown 自定义文字)
    // ════════════════════════════════════════════════════════════════
    async initYouTube() {
        const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/;
        const targets = [];

        document.querySelectorAll('main a[href]').forEach(a => {
            if (!ytRegex.test(a.href)) return;
            const parent = a.parentElement;
            if (!parent || parent.tagName !== 'P') return;
            if (parent.textContent.trim() !== a.textContent.trim()) return;

            const match = a.href.match(ytRegex);
            const text = a.textContent.trim();
            const isBare = text === a.href ||
                            text === a.href.replace(/^https?:\/\//, '') ||
                            ytRegex.test(text);

            targets.push({ el: parent, videoId: match[1], isBare, customText: isBare ? null : text });
        });

        document.querySelectorAll('main p').forEach(p => {
            if (targets.some(t => t.el === p)) return;
            if (p.children.length > 0) return;

            const text = p.textContent.trim();
            const match = text.match(ytRegex);
            if (!match) return;
            if (text.replace(match[0], '').replace(/^https?:\/\/(www\.)?/, '').replace(/[?&].*$/, '').length > 5) return;

            targets.push({ el: p, videoId: match[1], isBare: true, customText: null });
        });

        if (targets.length === 0) return;

        // Promise.all 并发处理所有视频请求，避免串行阻塞
        await Promise.all(targets.map(async ({ el, videoId, isBare, customText }) => {
            let captionText = customText;

            if (isBare) {
                try {
                    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                    if (resp.ok) {
                        const data = await resp.json();
                        captionText = data.title;
                    }
                } catch { }
                captionText = captionText || '在 YouTube 上观看';
            }

            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            iframe.loading = 'lazy';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;

            const caption = document.createElement('figcaption');
            const captionLink = document.createElement('a');
            captionLink.href = `https://www.youtube.com/watch?v=${videoId}`;
            captionLink.target = '_blank';
            captionLink.rel = 'noopener noreferrer';
            captionLink.textContent = captionText;
            caption.appendChild(captionLink);

            el.replaceWith(iframe, caption);
        }));
    },

    // ════════════════════════════════════════════════════════════════
    //  6. 外部链接新窗口打开 (全局)
    // ════════════════════════════════════════════════════════════════
    initExternalLinks() {
        const host = location.hostname;
        document.querySelectorAll('main a[href]').forEach(a => {
            if (a.classList.contains('pswp-gallery__item')) return;
            try {
                const url = new URL(a.href, location.origin);
                if (url.hostname !== host) {
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                }
            } catch {}
        });
    }
};

// 启动信号
document.addEventListener('DOMContentLoaded', () => BlogApp.init());
</script>