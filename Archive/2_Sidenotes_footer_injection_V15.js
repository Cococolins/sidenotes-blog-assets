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
    //  1. 副标题注入 (真正解决了重影问题的 SEO 解析)
    // ════════════════════════════════════════════════════════════════
    initSubtitle() {
        const h1 = document.querySelector('header .title h1');
        if (!h1 || h1.querySelector('.site-tagline')) return;
        
        const subtitle = document.createElement('span');
        subtitle.className = 'site-tagline';
        subtitle.textContent = ' / 记录即反抗。';
        h1.appendChild(subtitle);
    },

    // ════════════════════════════════════════════════════════════════
    //  2. 响应式导航栏
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
    //  3. 工业级图片画廊 (基于 PhotoSwipe v5)
    // ════════════════════════════════════════════════════════════════
    initGallery() {
        const images = Array.from(document.querySelectorAll('main img'));
        if (images.length === 0) return;

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

        const groups = new Map();
        document.querySelectorAll('main .pswp-gallery__item').forEach(item => {
            const parent = item.parentElement;
            if (!groups.has(parent)) groups.set(parent, []);
            groups.get(parent).push(item);
        });

        groups.forEach((items, parent) => {
            parent.classList.add('pswp-gallery');
        });

        const lightbox = new PhotoSwipeLightbox({
            gallery: '.pswp-gallery',
            children: '.pswp-gallery__item',
            pswpModule: () => import('https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js'),
            bgOpacity: 0.95,
            spacing: 0.1,
            padding: { top: 20, bottom: 20, left: 0, right: 0 },
            errorMsg: '图片加载失败'
        });

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

        // 🌟 预载核心库：利用时间差规避第一次点击的按需加载延迟
        setTimeout(() => {
            import('https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/photoswipe.esm.min.js').catch(()=>{});
        }, 3000);
    },

    // ════════════════════════════════════════════════════════════════
    //  4. 动态提取并注入具体时间 (取代 CSS 强行定时动画)
    // ════════════════════════════════════════════════════════════════
    initExactTime() {
        const timeNodes = document.querySelectorAll('time');
        
        timeNodes.forEach(timeNode => {
            // 所有 time 元素在匹配的最新的 CSS (V27) 中被设置为 opacity: 0。在这里由 JS 判定执行就绪后一并赋予 loaded 显现
            timeNode.classList.add('loaded');

            // 如果不是特定的信息流列表中的 time，就不需要做附加的精准时间提取
            if (!timeNode.closest('.notes ul li') && !timeNode.closest('.gallery ul li')) return;

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
    //  5. YouTube 解析与装载底包
    // ════════════════════════════════════════════════════════════════
    async loadYouTube({ el, videoId, isBare, customText }) {
        let captionText = customText;
        if (isBare) {
            try {
                // 这里的网络请求被挪动到了进入视带时才会发配，省下了巨大的初始流量
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
    },

    // ════════════════════════════════════════════════════════════════
    //  6. YouTube 懒加载调度器 (基于 IntersectionObserver)
    // ════════════════════════════════════════════════════════════════
    initYouTube() {
        const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/;
        const targets = [];

        // 提取带文字标签的 a 链接
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

        // 提取直接贴 URL 的纯文本短落
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

        // 【V15 绝活】设定 Observer，当包裹容器距离视口底端还有 300px 时，开始去解析 JSON 和获取视频名字
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const targetData = targets.find(t => t.el === entry.target);
                        if (targetData) {
                            this.loadYouTube(targetData);
                        }
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '300px 0px' });

            targets.forEach(t => observer.observe(t.el));
        } else {
            // 旧版浏览器：回退到兵分多路并发全量请求
            targets.forEach(t => this.loadYouTube(t));
        }
    },

    // ════════════════════════════════════════════════════════════════
    //  7. 外部链接新窗口打开 (全局)
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

// ════════════════════════════════════════════════════════════════
// 启动信号 (V15 修改项)
// 由于脚本处于 <script type="module"> 环境下，默认遵循 defer 规则，
// 在执行时真实 DOM 已绝对解析完成。去除了画蛇添足的 DOMContentLoaded，直接放行最稳妥。
// ════════════════════════════════════════════════════════════════
BlogApp.init();
</script>
