# 大模型配置中心

## 后台使用

入口：`/{locale}/model-config`，侧栏“系统 > 大模型配置”。查看须有 `settings.read`，保存、删除、分配及测试须有 `settings.write`。默认只有平台管理员具有这些权限。

1. 新增文本连接，填写名称、API 协议、真实模型 ID 或 Endpoint ID、API Base URL、API Key 和超时，启用并保存。
2. 新增生图连接，选择豆包/火山方舟协议和当前账号获准调用的 Seedream 模型 ID，填写其 Key，启用并保存。文本与图片模型分别配置，同一个 Ark Key 可分别用于两条连接。
3. 在“应用分配”中选择模型并保存。支持设计建议与文案、设计器生图、商品上品对话、商品图片优化、销售与客服助手五个场景。切换到“服务器环境变量”保留旧部署配置；“停用”阻止该场景调用真实模型，现有文字建议/上品仍可使用降级逻辑。
4. 测试连接会调用真实模型并可能产生费用，需要确认。生图测试会生成一张 2048x2048 图片，只检验生成响应，不存入商品库。测试结果不等同于业务场景验收，尤其不证明指定文本模型支持工具调用或指定图片模型支持图片编辑。
5. API Key 输入框保存后清空；再次打开只显示已配置状态。留空保存可保留原 Key；更改 API 服务商或地址必须重新输入 Key，防止旧凭据误发给新端点。移除 Key 前须停用连接。已分配模型须先解除分配才能删除。

## 支持范围

- 文本：豆包/Ark、OpenAI Chat Completions 兼容协议、Anthropic Messages。DeepSeek、通义千问等可通过对应兼容服务地址配置；具体模型的 JSON 输出和工具调用能力需实际验证。
- 生图与商品图片优化：豆包 Seedream 的 `images/generations` 协议，采用 base64 图片响应；不下载模型返回的任意 URL。其他图片服务、OpenAI Responses、视频、语音、Embedding/RAG 和图片内容识别尚未接入。
- 印刷可用性检查和现有抠图保持原有规则/降级实现，不会因保存模型配置而变成视觉模型分析。
- 运行时每次请求读取已保存的场景分配，API 不需要为模型切换而重启。已发出的请求使用其开始时的配置。
- 模型连接状态“已配置”表示配置和 Key 可解密，不代表服务商鉴权、余额或模型权限已通过验证。

## 服务器前置配置

生产环境必须具备 PostgreSQL `DATABASE_URL`、已有 `entity_snapshots` 表、HTTPS 管理后台及 API，以及只从反向代理暴露的业务入口。本模块使用 `model_configuration` snapshot，不新增数据库迁移，但旧版本服务器必须先确认已有基础迁移。

在服务器私密环境变量中配置 `MODEL_CONFIG_ENCRYPTION_KEY`，值为 64 位十六进制随机字符串，可用 `openssl rand -hex 32` 私密生成。只在服务器配置，不在浏览器、Git、构建参数、日志或聊天中发布。生成一次后妥善保管；API 容器需持有同一个值。示例环境文件只保留空变量名。

模型 Key 通过 HTTPS 后台提交，服务端使用 AES-256-GCM 与随机 nonce 加密后保存到 PostgreSQL。数据库和审计记录中不保存明文 Key；配置响应不返回 Key 或密文。缺失/变更加密密钥会使旧 Key 锁定，须恢复原加密密钥或重新输入服务商 Key。备份数据库时必须把加密密钥作为独立秘密备份，数据库单独恢复不足以解密。当前不提供自动轮换/多版本主密钥。

默认允许的 API 域名：`ark.cn-beijing.volces.com`、`api.openai.com`、`api.anthropic.com`、`api.deepseek.com`、`api.moonshot.cn`、`dashscope.aliyuncs.com`。私有网关不允许；其他公共网关须由服务器维护者在 `MODEL_API_ALLOWED_HOSTS` 增加精确 HTTPS 主机名后重启 API，不能使用通配符。地址不能含用户名、密码、查询参数或非标准端口。

出站请求验证 DNS 全部解析地址，阻止本机、内网、云元数据及特殊 IP，连接固定到已验证的 IP，同时保留原域名的 TLS 校验，不跟随重定向。请求限制超时和 30MB 响应大小。反向代理图片调用超时应至少 210 秒。参考：[OWASP SSRF 防护](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)、[火山方舟图片生成 API](https://docs.volcengine.com/docs/ark/image-generation-api?lang=zh)。

## 持久化、限额及发布

生产保存等待数据库确认，失败不会切换当前配置；启动时配置存储不可用则闭锁配置读取，恢复数据库后重启 API。无数据库的本地演示是临时内存模式，会明确显示警告。密钥必须在 API 运行时注入，不能作为 `NEXT_PUBLIC_*`。

当前沿用平台单 API 进程架构。配置缓存、版本冲突锁和测试限额在进程内，不支持多实例一致性，正式发布只能使用单 API 实例，扩容前须增加数据库版本比较与失效通知。连接测试每个管理员每天 10 次，失败也计入，进程重启会重置；不是账单级配额。业务图片限额沿用已有配置。配置审计记录仅包含操作、版本和测试结果，不包含 Key 或密文。

上线顺序：备份业务数据及独立主密钥，确认基础版本与迁移，注入服务器主密钥及必要域名白名单，构建 API/后台，先在测试环境验证保存/重启恢复、真实文本、Seedream 生图/图片编辑和助手工具调用，再升级正式容器。保留旧镜像及数据库备份。不可直接覆盖旧线上 `.env.production` 或混入其他未确认升级。

本地并行预览可使用 `NEXT_DIST_DIR=output/playwright/model-config-next` 和独立端口，避免更改另一预览的 Next 构建目录。该目录为测试生成文件，不提交。
