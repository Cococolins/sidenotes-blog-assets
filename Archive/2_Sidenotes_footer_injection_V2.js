<script>
// ════════════════════════════════════════════════════════════════
//  1. 响应式导航栏
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
//  2. 图片画廊
//
//  缩放核心思路（业界标准做法）：
//  保持 transform-origin: 50% 50%（CSS 默认），
//  用 (x, y) 记录图片「中心点」相对于 overlay 中心的偏移量。
//  缩放时维持「捏合中心」不动的公式为：
//    new_x = pivot_x + (old_x - pivot_x) * (newScale / oldScale)
//  其中 pivot_x = 捏合中心相对于 overlay 中心的坐标
//
//  关闭方式：只有下滑，阈值用手势开始到当前的实时累计距离
// ════════════════════════════════════════════════════════════════
(function () {
    const allImages = Array.from(document.querySelectorAll('main img'));
    if (allImages.length === 0) return;

    // ── 按父元素分组 ──────────────────────────────────────────
    const groups = new Map();
    allImages.forEach(img => {
        const p = img.parentElement;
        if (!groups.has(p)) groups.set(p, []);
        groups.get(p).push(img);
    });

    const imageData = allImages.map(img => {
        const siblings   = groups.get(img.parentElement);
        const switchable = siblings.length >= 2;
        return {
            el:           img,
            group:        switchable ? siblings : null,
            indexInGroup: switchable ? siblings.indexOf(img) : -1,
        };
    });

    // ── overlay ──────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'img-enlarged-overlay';
    overlay.innerHTML = `
        <button class="gallery-arrow prev" aria-label="上一张">&#8249;</button>
        <button class="gallery-arrow next" aria-label="下一张">&#8250;</button>
        <img src="" id="gallery-img" alt="">
        <div class="gallery-counter" id="gallery-counter"></div>
    `;
    document.body.appendChild(overlay);

    const galleryImg = document.getElementById('gallery-img');
    const counter    = document.getElementById('gallery-counter');
    const btnPrev    = overlay.querySelector('.gallery-arrow.prev');
    const btnNext    = overlay.querySelector('.gallery-arrow.next');

    let currentData       = null;
    let currentGroupIndex = 0;

    // ── 变换状态 ─────────────────────────────────────────────
    // x, y：图片中心 相对于 overlay 中心 的偏移（px）
    // scale：当前缩放倍率
    // transform-origin 保持默认 50% 50%
    let x = 0, y = 0, scale = 1;
    const MAX_SCALE = 5;

    function applyTransform(animated) {
        galleryImg.style.transition = animated ? 'transform 0.25s ease' : 'none';
        galleryImg.style.transform  = `translate(${x}px, ${y}px) scale(${scale})`;
    }

    function resetTransform(animated) {
        x = 0; y = 0; scale = 1;
        applyTransform(animated);
    }

    // overlay 中心点（屏幕坐标）
    function overlayCenter() {
        return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 };
    }

    // 将缩放后的图片限制在合理范围内（防止完全移出屏幕）
    function clamp() {
        const { cx, cy } = overlayCenter();
        // 图片当前渲染尺寸
        const iw = galleryImg.offsetWidth  * scale;
        const ih = galleryImg.offsetHeight * scale;
        const maxX = Math.max(0, (iw - window.innerWidth)  / 2 + window.innerWidth  * 0.1);
        const maxY = Math.max(0, (ih - window.innerHeight) / 2 + window.innerHeight * 0.1);
        x = Math.max(-maxX, Math.min(maxX, x));
        y = Math.max(-maxY, Math.min(maxY, y));
    }

    // ── 画廊控制 ──────────────────────────────────────────────
    function updateUI() {
        const sw = currentData?.group;
        btnPrev.style.display = sw ? '' : 'none';
        btnNext.style.display = sw ? '' : 'none';
        counter.style.display = sw ? '' : 'none';
        if (sw) counter.textContent = `${currentGroupIndex + 1} / ${sw.length}`;
    }

    function loadImage(data, groupIdx) {
        currentData       = data;
        currentGroupIndex = groupIdx >= 0 ? groupIdx : data.indexInGroup;
        const img = data.group ? data.group[currentGroupIndex] : data.el;
        galleryImg.src = img.src;
        galleryImg.alt = img.alt || '';
        updateUI();
    }

    function openGallery(data) {
        loadImage(data, data.indexInGroup);
        resetTransform(false);
        overlay.style.display  = 'flex';
        overlay.style.opacity  = '1';
        overlay.style.transform = '';
        document.body.classList.add('no-scroll');
    }

    function closeGallery() {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
        overlay.style.transform = '';
        resetTransform(false);
        document.body.classList.remove('no-scroll');
        currentData = null;
    }

    function slideToGroupIndex(newIdx, direction) {
        if (!currentData?.group) return;
        const len = currentData.group.length;
        if (newIdx < 0) newIdx = len - 1;
        if (newIdx >= len) newIdx = 0;
        if (scale !== 1) { resetTransform(true); return; }

        galleryImg.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        galleryImg.style.transform  = `translateX(${direction === 'left' ? '-60vw' : '60vw'}) scale(1)`;
        galleryImg.style.opacity    = '0';

        setTimeout(() => {
            loadImage(currentData, newIdx);
            x = 0; y = 0; scale = 1;
            const enterX = direction === 'left' ? '60vw' : '-60vw';
            galleryImg.style.transition = 'none';
            galleryImg.style.transform  = `translateX(${enterX}) scale(1)`;
            galleryImg.style.opacity    = '1';
            galleryImg.getBoundingClientRect(); // 强制重排
            galleryImg.style.transition = 'transform 0.2s ease';
            galleryImg.style.transform  = 'translate(0,0) scale(1)';
        }, 180);
    }

    // ── 事件绑定 ──────────────────────────────────────────────
    imageData.forEach(data => {
        data.el.addEventListener('click', (e) => {
            e.stopPropagation();
            openGallery(data);
        });
    });

    // 鼠标点击 overlay 关闭图片
    // touch 事件会在 click 前触发，用标志位区分，避免手指操作误关闭
    let _touchFired = false;
    overlay.addEventListener('touchstart', () => { _touchFired = true; }, { passive: true, capture: true });
    overlay.addEventListener('click', (e) => {
        if (_touchFired) { _touchFired = false; return; }
        if (e.target === btnPrev || e.target === btnNext) return;
        closeGallery();
    });

    btnPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        slideToGroupIndex(currentGroupIndex - 1, 'right');
    });
    btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        slideToGroupIndex(currentGroupIndex + 1, 'left');
    });

    document.addEventListener('keydown', (e) => {
        if (overlay.style.display !== 'flex') return;
        if (e.key === 'ArrowLeft'  && currentData?.group) slideToGroupIndex(currentGroupIndex - 1, 'right');
        if (e.key === 'ArrowRight' && currentData?.group) slideToGroupIndex(currentGroupIndex + 1, 'left');
        if (e.key === 'Escape') closeGallery();
    });


    // ════════════════════════════════════════════════════════
    //  触摸手势
    //  关键修复：
    //  1. 捏合用「相对于 overlay 中心」的坐标系，不依赖 naturalW/H
    //  2. 关闭阈值用实时累计 dy，而非 touchend 里的残差
    //  3. 向下滑关闭改为移动 overlay 整体，视觉更自然
    // ════════════════════════════════════════════════════════

    let lockAxis   = null;    // 'h' | 'v' | 'pinch' | 'pan' | null
    let gestureStartX = 0;
    let gestureStartY = 0;
    let lastX = 0, lastY = 0;

    // 捏合状态
    let pinchStartDist  = 0;
    let pinchStartScale = 1;
    let pinchStartX     = 0;  // 捏合开始时的 x
    let pinchStartY     = 0;
    let pinchPivotX     = 0;  // 捏合中心相对于 overlay 中心的偏移
    let pinchPivotY     = 0;

    function touchDist(t) {
        return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }
    function touchMid(t) {
        return {
            x: (t[0].clientX + t[1].clientX) / 2,
            y: (t[0].clientY + t[1].clientY) / 2,
        };
    }

    overlay.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            lockAxis        = 'pinch';
            pinchStartDist  = touchDist(e.touches);
            pinchStartScale = scale;
            pinchStartX     = x;
            pinchStartY     = y;

            // 捏合中心在 overlay 坐标系中的位置（相对于 overlay 中心）
            const mid  = touchMid(e.touches);
            const { cx, cy } = overlayCenter();
            pinchPivotX = mid.x - cx;
            pinchPivotY = mid.y - cy;

            galleryImg.style.transition = 'none';

        } else if (e.touches.length === 1) {
            gestureStartX = lastX = e.touches[0].clientX;
            gestureStartY = lastY = e.touches[0].clientY;
            lockAxis  = null;
            galleryImg.style.transition = 'none';
        }
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {

        if (e.touches.length === 2 && lockAxis === 'pinch') {
            e.preventDefault();
            const d        = touchDist(e.touches);
            const newScale = Math.max(1, Math.min(MAX_SCALE,
                                pinchStartScale * (d / pinchStartDist)));
            const ratio    = newScale / pinchStartScale;

            // 核心公式：保持捏合中心点在图片上的位置不变
            // new_x = pivot + (old_x - pivot) * ratio
            x = pinchPivotX + (pinchStartX - pinchPivotX) * ratio;
            y = pinchPivotY + (pinchStartY - pinchPivotY) * ratio;
            scale = newScale;
            applyTransform(false);

        } else if (e.touches.length === 1 && lockAxis !== 'pinch') {
            const curX = e.touches[0].clientX;
            const curY = e.touches[0].clientY;
            const totalDX = curX - gestureStartX;
            const totalDY = curY - gestureStartY;
            const diffX   = curX - lastX;
            const diffY   = curY - lastY;

            // 方向锁定
            if (!lockAxis && (Math.abs(totalDX) > 8 || Math.abs(totalDY) > 8)) {
                if (Math.abs(totalDX) > Math.abs(totalDY)) {
                    lockAxis = (scale > 1 || !currentData?.group) ? 'pan' : 'h';
                } else {
                    lockAxis = scale > 1 ? 'pan' : 'v';
                }
            }

            if (lockAxis === 'h') {
                e.preventDefault();
                galleryImg.style.transform =
                    `translate(${totalDX}px, 0) scale(1)`;

            } else if (lockAxis === 'v') {
                e.preventDefault();
                // 移动整个 overlay 实现下滑关闭效果（更接近 iOS 相册）
                const progress = Math.max(0, Math.min(totalDY / 300, 1));
                overlay.style.transform = `translateY(${totalDY}px)`;
                overlay.style.opacity   = String(1 - progress * 0.7);

            } else if (lockAxis === 'pan') {
                e.preventDefault();
                x += diffX;
                y += diffY;
                clamp();
                applyTransform(false);
            }

            lastX = curX;
            lastY = curY;
        }
    }, { passive: false });

    overlay.addEventListener('touchend', (e) => {
        if (lockAxis === 'pinch') {
            if (scale <= 1.05) resetTransform(true);
            else { clamp(); applyTransform(true); }
            lockAxis = null;
            return;
        }

        // totalDY 用手势开始到结束的累计值（lastY 是最后一次 touchmove 记录的）
        const totalDX = lastX - gestureStartX;
        const totalDY = lastY - gestureStartY;

        if (lockAxis === 'h') {
            if (Math.abs(totalDX) > 55) {
                slideToGroupIndex(
                    totalDX < 0 ? currentGroupIndex + 1 : currentGroupIndex - 1,
                    totalDX < 0 ? 'left' : 'right'
                );
            } else {
                // 弹回
                galleryImg.style.transition = 'transform 0.22s ease';
                applyTransform(true);
            }
        } else if (lockAxis === 'v') {
            // 上滑或下滑超过 60px 则关闭
            if (Math.abs(totalDY) > 60) {
                overlay.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                overlay.style.transform = `translateY(${totalDY < 0 ? -window.innerHeight : window.innerHeight}px)`;
                overlay.style.opacity    = '0';
                setTimeout(() => {
                    overlay.style.transition = '';
                    closeGallery();
                }, 260);
            } else {
                // 弹回
                overlay.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
                overlay.style.transform  = 'translateY(0)';
                overlay.style.opacity    = '1';
                setTimeout(() => { overlay.style.transition = ''; }, 300);
            }
        }
        // 轻点（未锁定方向）→ 不关闭

        lockAxis = null;
    });

})();
</script>