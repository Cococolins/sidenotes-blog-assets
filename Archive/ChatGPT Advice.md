
## RE1

我认真通读了你这套「Sidenotes / 顺带一提」的 CSS、脚本和项目说明。先直接说判断：这已经不是「能用的个人博客定制」，而是一套相当成熟、带有明确设计哲学和工程意识的前端系统了。

尤其难得的是，你不是在堆功能，而是在持续建立一套自己的版式语言：从字体策略、中文排版、图片叙事，到 Notes / Gallery 的内容结构，都已经形成了鲜明的个人风格。

但如果站在资深前端工程师 + 长期维护者的角度，我会很直接地指出：现在这套系统最大的挑战，已经不是「视觉够不够好」，而是**可维护性、兼容性边界，以及性能债务开始累积**。

我分几个层面拆给你看。

你现在最值得优先处理的，是 CSS 复杂选择器的长期风险。

你大量使用了 `:has()` 做智能布局，这是非常聪明、也很现代的方案，比如这些：

main p:has(> :is(img, a.pswp-gallery__item):nth-of-type(2))  
main > p:has(:is(img, .pswp-gallery__item))  
.gallery ul > li > div > p:has(:is(img, .pswp-gallery__item))

这些规则在视觉上效果非常好，几乎实现了「内容驱动布局」。

但问题是，`:has()` 在浏览器里属于**高成本回流选择器**。

尤其你这里大量作用在：

main p  
li  
div

这种高频节点上。

页面文章一长，Notes 一多，DOM 稍微复杂一点，浏览器每次重排都要重新计算。

尤其 sticky header、lightbox DOM 注入、移动菜单开关，都会触发布局 recalculation。

短期没问题，长期文章多了，移动端会开始变卡。

这是我认为目前最大的技术债。

我的建议不是不用，而是**把结构判断前置到 JS**。

比如图片段落可以在脚本初始化时直接加 class：

p.classList.add(`img-count-${count}`);

然后 CSS 改成：

.img-count-2 { grid-template-columns: repeat(2,1fr); }  
.img-count-3 { grid-template-columns: repeat(3,1fr); }

这样浏览器只做 class 匹配，不做动态结构扫描。

这是非常值得做的一次架构升级。

它会明显降低样式系统复杂度。

第二个我想直接挑战你的，是字体加载策略。

你现在把 `@font-face` 直接写进主 CSS：

src: url(https://cdn.jsdelivr.net/fontsource/fonts/noto-serif...)

而且是 variable font。

审美上我完全理解你的选择。

但从真实访问体验上，它可能拖慢首屏。

尤其你的站点是文本主导型博客。

读者第一眼最重要的是文字出现速度。

目前你虽然用了：

font-display: swap;

这是对的。

但我认为还不够。

更好的方案是把英文字体和中文渲染彻底分离。

因为你的中文主体实际主要由系统字体承担。

真正远程加载的是拉丁字符。

所以可以更激进一点：

1. 正文默认系统 serif
2. 仅英文长文模块启用 Noto Serif
3. 标题继续 system-ui

比如：

.article-en {  
  font-family: 'Noto Serif', serif;  
}

这样首屏几乎零阻塞。

现在全站级字体加载，对于 Notes 流这种短内容页面其实性价比不高。

第三个重点，是你的 Footer Script 已经开始承担太多职责。

这一点我会非常严肃地提醒你。

现在脚本同时负责：

- 导航
- 图片 DOM 重构
- 灯箱
- caption 注入
- 时间转换
- YouTube embed
- 外链处理

这已经接近一个小型 runtime layer 了。

问题不是代码写得不好。

恰恰相反，IIFE 分块非常清晰。

问题在于：

**这些模块之间已经开始共享 DOM 假设。**

比如 PhotoSwipe 依赖：

figcaption 是 p 的兄弟节点

YouTube 模块也在改写：

p -> iframe + figcaption

这两者未来非常容易发生冲突。

比如以后文章里插入 video + image mixed block，就可能误伤。

我建议你开始建立一个很轻量的「初始化管线」。

比如：

initNavigation();  
initMedia();  
initEmbeds();  
initExternalLinks();

然后明确顺序：

1. 内容结构增强
2. media rebuild
3. lightbox bind
4. 外链处理

这样未来扩展会稳很多。

第四个是一个我非常喜欢，但必须提醒你的点。

你现在在用 CSS 伪元素写副标题：

header .title h1::after

视觉非常优雅。

但 SEO 和可访问性层面不理想。

屏幕阅读器通常不会很好读取伪元素内容。

你的副标题：

「记录即反抗」

其实是非常重要的品牌语义。

我建议把它改为真实 DOM，由 header injection 或 footer script 注入。

例如：

const subtitle = document.createElement('span')  
subtitle.className = 'site-tagline'

这样对搜索引擎和辅助阅读设备更友好。

第五个我想从产品层面给你一个建议。

你的 changelog 很有生命力。

这是博客最迷人的部分之一。

但目前它还是纯日志。

我觉得可以继续进化成：

**公开建站叙事**

比如：

- 本次修改的动机
- 遇到的问题
- 为什么采用这个技术方案
- 放弃了什么方案

它会非常像一个持续展开的创作手记。

这和你博客「记录即反抗」的哲学是高度一致的。

技术日志本身就能成为内容。

这是很多个人站点做不到的。

最后我给一个优先级建议，非常实际：

P1（建议立刻优化）

- 减少 `:has()` 高频使用
- JS 初始化流程模块化
- 降低字体首屏成本

P2（中期）

- DOM 语义增强（副标题、caption）
- script 依赖顺序整理

P3（长期）

- 为 Notes / Gallery 建立统一内容组件语言
- changelog 产品化

坦白说，你这个站已经进入「作品」阶段，而不是「博客模板」阶段了。

真正需要关注的已经不是「还能加什么效果」，而是这套系统是否能陪你写三年、五年。

这才是成熟前端系统真正的考验。

如果你愿意，我下一步可以继续从**信息架构和阅读体验设计**角度，专门帮你审视首页与栏目结构，看看它是否真的服务于你的写作和播客身份。


## RE2

我把你的这套结构仔细看了一遍。先说判断：这已经不是「简单改 Bear Blog」的程度了，而是你在一个极度受限的平台里，硬生生做出了一套有自己语言的前端系统。最难得的不是功能，而是你已经开始形成一种统一的视觉逻辑——字体、间距、图像、信息层级之间是互相照应的，而不是东拼西凑。这点在 CSS 的整体组织里很明显。

不过从专业角度看，仍然有几个地方值得继续打磨，而且这些优化会影响的是「长期维护性」与「细节体验」，不是表面上的功能增加。

你现在最大的潜在问题，其实是 CSS 对现代选择器的依赖已经很高，尤其大量使用 `:has()`。像下面这种：

`main > p:has(:is(img, .pswp-gallery__item))`

这种写法非常优雅，但浏览器支持仍然有现实边界。Safari 15.3 以下、较旧 Android WebView 都会直接失效。你目前的多图网格、图注间距、notes / gallery 逻辑，有不少都建立在这个之上。  
如果你希望这个博客以后几年仍然稳定，建议把「增强体验」和「基础布局」分层：

基础层：  
只保证单图正常、正文正常。

增强层：  
再用 `@supports selector(:has(*))` 包裹高级布局。

例如可以这样控制：

@supports selector(:has(*)) {  
  main p:has(> img:nth-of-type(2)) {  
    display: grid;  
  }  
}

这样旧浏览器至少不会排版崩掉，只是退回朴素版本。

第二个问题，是你现在的字体加载策略仍然稍重。你用了可变字体 `Noto Serif`，这是好事，但正文只需要 Latin 范围，yet 你同时让正文主字体栈承担中英文混排，浏览器会频繁做 fallback。  
你现在的这一层：

`"CJK Dash Fix", 'Noto Serif', "Optima"...`

会让一些浏览器在行内文字上反复切字形。

更稳的方式，是把拉丁和中文拆开，让中文通过 `lang()` 控制，而不是靠 fallback 猜：

body {  
  font-family: 'Noto Serif', "Optima", serif;  
}  
  
:lang(zh) {  
  font-family: "PingFang SC", "Noto Serif SC", sans-serif;  
}

这样浏览器渲染时更明确，混排时也更省资源。

第三个问题在脚本层：你目前的 YouTube 自动转 iframe 逻辑是串行执行的。  
也就是说，如果一页有多个视频，它会一个个等待：

for (...) {  
  await fetch(...)  
}

这会拖慢页面。

应该改成并发：

await Promise.all(targets.map(async target => {  
  ...  
}));

这样页面里多个视频会同时请求 metadata，首屏会更轻快，尤其海外访问时差别会明显。

第四个地方，是 PhotoSwipe 的初始化时机还可以再优化。你现在页面一加载就扫描所有图片并重构 DOM。  
对于图片很多的 notes 或 gallery，这会增加主线程负担。

更理想的是：  
等用户第一次点击图片时再初始化 lightbox。

也就是 lazy-init：

document.addEventListener('click', e => {  
  if (!lightboxInitialized && e.target.matches('main img')) {  
    initLightbox();  
  }  
});

这种做法会让静态阅读页面更安静，交互只在需要时发生。

第五个问题比较隐蔽：你的 header 现在是 sticky：

header {  
  position: sticky;  
}

同时又给 body 留了固定 padding。  
这在 iOS Safari 里有机会出现轻微 repaint 抖动，尤其滚动时字体会闪一下。  
原因是 sticky + 自定义字体 + backdrop 区域重绘。

建议加：

header {  
  transform: translateZ(0);  
  will-change: transform;  
}

这样能让浏览器提前把 header 放到独立合成层，滚动会更稳。

还有一个你可能会在以后感受到的问题，是维护成本。

你现在 CSS 已经接近一个「主题系统」规模，但仍然是单文件。  
短期可控，长期会越来越难改，因为模块之间开始互相影响。

Bear Blog 虽然没有构建流程，但你可以逻辑上拆分：  
用明显的 section token，比如：

/* ========== Typography ========== */  
/* ========== Layout ========== */  
/* ========== Notes ========== */

你已经部分这么做了，但还可以更严格一点：  
每个模块只允许改自己区域，减少跨模块覆盖。

否则半年后你自己也会忘记某个 margin 是谁覆盖谁。

最后一个更偏审美层面的建议：

你现在整个站点非常克制，但 link hover 稍微有点「技术感太强」：

text-underline-offset: 4px;

在正文里这个跳动会有一点显眼。  
如果你希望它更像纸面阅读，而不是 Web UI，可以让 hover 更轻：

a:hover {  
  text-underline-offset: 2px;  
  text-decoration-thickness: 0.06em;  
}

这样它仍然有反馈，但不会抢正文的气息。

我觉得你现在真正值得做的，不是再继续加新功能，而是开始把这个博客从「能实现」往「可长期维护」推一步。  
因为你现在已经有了自己的视觉语言，接下来需要保护它，不让后面的功能把它弄乱。

如果你愿意，我可以下一步帮你专门看一下你这套 `notes / gallery` 的布局逻辑，看看能不能把那部分 CSS 再压缩成更干净的一层，减少重复选择器。