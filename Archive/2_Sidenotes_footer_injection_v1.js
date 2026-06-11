<script>
(function() {
    const images = Array.from(document.querySelectorAll('main img'));
    if (images.length === 0) return;
    // 创建画廊结构
    const overlay = document.createElement('div');
    overlay.className = 'img-enlarged-overlay';
    overlay.innerHTML = `
        <div class="nav-zone nav-prev"></div>
        <div class="nav-zone nav-next"></div>
        <img src="" id="gallery-img">
    `;
    document.body.appendChild(overlay);
    const galleryImg = document.getElementById('gallery-img');
    let currentIndex = 0;
    function updateGallery(index) {
        if (index < 0) index = images.length - 1;
        if (index >= images.length) index = 0;
        currentIndex = index;
        galleryImg.src = images[currentIndex].src;
    }

    function openGallery(index) {
        updateGallery(index);
        overlay.style.display = 'flex';
        document.body.classList.add('no-scroll');
    }

    function closeGallery() {
        overlay.style.display = 'none';
        document.body.classList.remove('no-scroll');
    }

    // 绑定点击图片打开画廊
    images.forEach((img, index) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            openGallery(index);
        });
    });

    // 翻页逻辑
    overlay.querySelector('.nav-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        updateGallery(currentIndex - 1);
    });

    overlay.querySelector('.nav-next').addEventListener('click', (e) => {
        e.stopPropagation();
        updateGallery(currentIndex + 1);
    });

    // 点击图片本身关闭
    galleryImg.addEventListener('click', closeGallery);

    // 键盘支持
    document.addEventListener('keydown', (e) => {
        if (overlay.style.display === 'flex') {
            if (e.key === 'ArrowLeft') updateGallery(currentIndex - 1);
            if (e.key === 'ArrowRight') updateGallery(currentIndex + 1);
            if (e.key === 'Escape') closeGallery();
        }
    });
})();
</script>