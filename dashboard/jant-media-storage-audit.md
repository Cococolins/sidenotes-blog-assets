# Jant 媒体上传与存储审计

状态：源码审计完成，作为 Sidenotes Composer 第二阶段输入
审计日期：2026-07-25
Jant 源码基线：`680e579ad7a161b8af8120d6238b3193aff4236e`

## 1. 结论

Jant 的图片、视频、音频和文档托管不是路线图，而是当前已经实现的完整系统。

在 Cloudflare 部署中，它默认使用：

```text
Cloudflare Worker + D1 + R2
```

其中：

- R2 保存二进制文件；
- D1 的 `media` 记录保存 MIME、原始文件名、storage key、宽高、时长、
  blurhash、waveform、poster key、summary 等 metadata；
- Composer 在浏览器端预处理图片、视频和音频；
- upload session 根据 storage driver 选择 relay、multipart relay 或
  presigned PUT；
- `R2_PUBLIC_URL` 或 `S3_PUBLIC_URL` 负责公开分发，未配置时才由应用代理。

这套架构值得学习，但不能只复制一个 `fetch()`：最有价值的是它把「媒体处理」、
「上传传输」、「对象存储」、「metadata」和「post attachment 关系」分成了
独立层。

## 2. 存储驱动

Jant 有统一的 `StorageDriver`：

```text
put / get / head / delete
listAllKeys
copy
presignPut
createMultipartUpload / uploadPart / complete / abort
```

当前 runtime 默认值：

| Runtime | 默认 driver | 可选 driver |
| --- | --- | --- |
| Cloudflare Workers | `r2` | `r2`、`s3` |
| Node／Docker | `local` | `local`、`s3` |

### 2.1 Cloudflare R2 binding

`wrangler.toml` 中直接绑定：

```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "<project>-media"
```

应用通过 Cloudflare Workers 的 `R2Bucket` API 进行 put、get、head、delete 和
multipart upload。

### 2.2 S3-compatible

也可以把 R2 当成 S3-compatible object store，或者换成 AWS S3、Backblaze
B2、MinIO 等。

这一 driver 使用 AWS SDK，并额外支持：

- presigned PUT；
- server-side copy；
- S3 CORS；
- 更通用的 Node／Cloudflare 部署。

对 Sidenotes 来说，**R2 的 S3-compatible API 比原生 Workers binding 更值得
优先评估**：它允许 Bear Dashboard 浏览器使用短时 presigned URL 直传 R2，
不必让大文件字节全部经过自己的 Worker。

## 3. 浏览器端处理

Jant 不是把任意原文件直接扔进 bucket，而是在浏览器内先归一化。

### 3.1 图片

- HEIC／HEIF 先转 JPEG；
- 调整尺寸并转成 WebP；
- 提取宽高；
- 生成 blurhash；
- 再进入 upload session。

### 3.2 视频

使用 `mediabunny` 和 WebCodecs：

- 转成 H.264／AAC MP4；
- 长边不超过 1920px，短边不超过 1080px；
- 输出尺寸保证为偶数；
- 处理 rotation metadata；
- 生成 640px WebP poster；
- 生成 blurhash；
- 记录时长和宽高。

### 3.3 音频

同样使用 `mediabunny` 和 WebCodecs：

- 转成 AAC；
- 放入 M4A／MP4 container；
- 丢弃可能存在的视频轨；
- 从原文件计算约 100 个 waveform peaks；
- waveform 作为 JSON metadata 保存。

### 3.4 文档与其他附件

PDF 可 inline；HTML 与 JavaScript 等危险文本强制 attachment disposition。
未知类型仍可归为 archive，但图片、视频、音频的 inline 格式受到严格限制：

- image：WebP、PNG、JPEG；
- video：MP4；
- audio：MP4／M4A；
- document preview：PDF。

服务端还检查 magic bytes，不能只伪造 MIME header。

## 4. Upload session

当前主要流程是：

```text
POST /api/uploads/init
  → 返回 upload session 与 transport
  → 上传正文 bytes
  → 可选上传 video poster
  → POST complete
  → 校验
  → 从临时 key 移到最终 key
  → 创建 media DB row
```

临时与最终对象大致是：

```text
media/{siteId}/tmp/{uploadSessionId}/source.ext
media/{siteId}/tmp/{uploadSessionId}/poster.webp

media/{siteId}/files/{mediaId}.ext
media/{siteId}/posters/{mediaId}.webp
```

upload session 默认 15 分钟过期。

### 4.1 transport 选择

#### S3 driver

后端签发短时 presigned PUT，浏览器直接上传到 object storage。

#### R2 Workers binding

小文件通过 Worker relay。

文件达到 95 MiB 后使用 R2 multipart relay：

- 每个 part 为 50 MiB；
- 浏览器逐 part 上传并显示总进度；
- complete 时传回 part number 与 ETag；
- 设计目的之一是避开 Workers 单次约 100 MB request body 边界。

传输失败时调用 abort，清理 multipart 和临时对象。

## 5. 完成与数据记录

complete 阶段再次验证：

- 预期尺寸；
- MIME 和实际文件签名；
- 可选 checksum；
- 图片尺寸；
- poster 格式；
- storage object 是否真实存在。

然后写入 media record：

```text
id
storageKey
provider
mimeType
originalName
size
width / height
durationSeconds
blurhash
waveform
posterKey
summary / chars
mediaKind
```

post 保存时只引用 media ID；文件上传与 post publish 因而可以解耦。Composer
会等所有 pending uploads 完成后才真正提交 post。

## 6. 公开分发

官方强烈建议配置：

```toml
[vars]
R2_PUBLIC_URL = "https://media.example.com"
```

并把 R2 bucket 绑定到自己的 media custom domain。若不配置，Jant 通过 Worker
的 `/media/*` 路径代理媒体，会额外消耗 Worker request。

图片还可以配置：

```text
IMAGE_TRANSFORM_URL=https://media.example.com/cdn-cgi/image
```

用于 Cloudflare Image Transformations。视频与音频当前是普通对象 URL 加
HTML5 player，不是 Cloudflare Stream 那样的自适应码率视频服务。

## 7. 删除、恢复与备份

这里有一个容易忽略的差别：

- 使用原生 R2 Workers binding 时没有 server-side copy，删除对象立即生效；
- 使用 S3-compatible driver，包括通过 S3 API 访问 R2，可以先把文件复制到
  `trash/`，记录在 `storage_purge`，30 天后才物理删除。

无论哪一种，完整备份都必须同时包含：

1. D1／SQLite／Postgres 中的内容和 media rows；
2. R2／S3／local storage 中的对象。

GitHub Sync 只保存 Markdown 与媒体 URL，不复制媒体 bytes，因此不能代替 R2
备份。

## 8. iOS 与移动端限制

Jant 的代码已经针对移动端大文件内存做了处理：视频转码完成后尽快释放原始
Blob，避免同时持有 300 MB 原文件、转码结果、上传 chunk 和 decoder buffer
导致 iOS Safari tab 被系统重载。

但它仍然依赖 WebCodecs：

- 没有 `VideoEncoder` 时拒绝视频处理；
- 没有 `AudioEncoder` 时拒绝音频处理；
- 当前错误文案建议改用 Chrome 或 Edge。

因此不能把 Jant 当前实现理解成「iPhone 上传视频已经普遍可靠」。Sidenotes
第二阶段需要在真实目标设备上决定：

- 支持的最低 iOS／Safari 版本；
- iOS 是否客户端转码，还是原文件直传后由服务端处理；
- 是否限制文件大小、分辨率和时长；
- 页面退后台、锁屏、网络切换后的 resumable upload；
- 是否允许没有 poster／waveform 的降级上传。

## 9. Sidenotes 第二阶段建议

### 9.1 最小后端

建立一个独立的 Cloudflare Worker：

```text
POST /uploads/init
POST /uploads/{id}/complete
POST /uploads/{id}/abort
DELETE /media/{id}
```

Worker 负责：

- 校验 Bear 登录之外的 Sidenotes upload token；
- 签发短时 R2 S3 presigned PUT；
- 限制 MIME、size 与站点 namespace；
- complete 时 `HEAD` 对象并记录 metadata；
- 返回稳定的 media URL。

Dashboard Footer 永远不包含 R2 secret。

### 9.2 第一版媒体格式

建议按顺序上线：

1. MP3／M4A 音频直传；
2. 已经是 H.264／AAC 的 MP4 直传；
3. video poster；
4. waveform；
5. 浏览器转码；
6. resumable multipart；
7. 其他文档。

先允许可播放的常见格式直传，比一开始在 iPhone 上复制完整转码链更稳。

### 9.3 与 Bear 内容的关系

上传完成后，Composer 得到：

```json
{
  "id": "media-id",
  "url": "https://media.sidenotes.cc/...",
  "mimeType": "video/mp4",
  "posterUrl": "https://media.sidenotes.cc/...",
  "durationSeconds": 42
}
```

第一阶段可以把 URL 与必要 metadata 序列化进 Bear Markdown／HTML；以后如果
Sidenotes 建立独立内容 API，再将 Bear metadata 引用升级成真正的 media ID。

## 10. 研究依据

- Jant Configuration：<https://jant.me/docs/configuration>
- Deploy to Cloudflare：<https://jant.me/docs/deployment>
- Writing and organizing：<https://jant.me/docs/writing-and-organizing>
- Backups and recovery：<https://jant.me/docs/backups>
- Upload session service：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/services/upload-session.ts>
- Storage drivers：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/lib/storage.ts>
- Compose upload bridge：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/compose-bridge.ts>
- Video processor：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/video-processor.ts>
- Audio processor：
  <https://github.com/jant-me/jant/blob/680e579ad7a161b8af8120d6238b3193aff4236e/packages/core/src/client/audio-processor.ts>
