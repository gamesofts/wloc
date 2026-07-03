# Apple WLOC 定位修改

修改 Apple 网络定位服务（Wi-Fi/基站）返回的经纬度和精度，同时保留原始定位响应中的海拔值。在线选点、地图分享链接和快捷指令最终都将坐标写入设备本地。

## 订阅地址

| 工具 | 订阅链接 |
|------|----------|
| Surge | `https://raw.githubusercontent.com/gamesofts/wloc/refs/heads/geo/modules/wloc.sgmodule` |
| Loon | `https://raw.githubusercontent.com/gamesofts/wloc/refs/heads/geo/modules/wloc.lpx` |
| Stash | `https://raw.githubusercontent.com/gamesofts/wloc/refs/heads/geo/modules/wloc.stoverride` |
| Quantumult X | `https://raw.githubusercontent.com/gamesofts/wloc/refs/heads/geo/modules/wloc.conf` |
| Shadowrocket（小火箭） | `https://raw.githubusercontent.com/gamesofts/wloc/refs/heads/geo/modules/wloc.module` |

MITM 主机名：`gs-loc.apple.com, gs-loc-cn.apple.com`

## 快捷指令

- [wloc 设置地理位置](https://www.icloud.com/shortcuts/a82717d8fdad4e6280866fcf911173f7)
- [wloc 清理恢复位置](https://www.icloud.com/shortcuts/f42632d406504f24a2cd163af4fe012f)

设置位置：在 Apple 地图或高德地图中选点并分享给“wloc 设置地理位置”。清理位置：运行“wloc 清理恢复位置”。

地图链接统一由本项目接口解析：

```text
https://wloc.gamesofts.net/api/parse
```

如果导入的旧版快捷指令仍使用其他 Worker 地址，请把其中的解析接口替换为上述地址。接口只解析本次请求，不保存链接或坐标。

## 在线选点

打开：<https://wloc.gamesofts.net>

1. 安装对应代理工具的模块并启用 MITM。
2. 在地图上选点、搜索地点或粘贴地图分享链接。
3. 点击“储存到设备”。
4. 下次触发 Apple 网络定位时生效。

选点页支持：

- Apple 地图、Google Maps、高德、百度及坐标文本解析
- 地点搜索和浏览器当前位置
- 收藏多个位置并快速切换
- 查询或清除当前生效坐标
- 卫星、WGS84、高德等地图图层

## iOS 高版本注意事项

> iOS 26/27 及更高版本可能长时间复用 `locationd` 中的旧定位缓存。即使代理日志显示响应已修改，系统也可能暂时继续显示旧位置。

切换位置后未生效时，建议：

1. 先在选点页储存目标坐标。
2. 关闭定位服务并重启设备。
3. 确认代理和 MITM 已启用，再打开定位服务。
4. 打开地图重新验证。

仅开关飞行模式或定位服务不一定能清除高版本系统缓存。

## 工作原理

```text
选点页或快捷指令
  → 请求 gs-loc.apple.com/wloc-settings/save
  → wloc-settings.js 写入设备本地 wloc_settings_v2
  → Apple WLOC 返回二进制定位响应
  → wloc.js 修改经纬度和精度
  → 原始海拔字段保持不变
```

数据优先级：设备已储存坐标 > 模块参数 > 默认透传模式。

| 参数 | 说明 | 默认值 |
|------|------|--------|
| longitude | 目标经度 | `null`（透传） |
| latitude | 目标纬度 | `null`（透传） |
| accuracy | 水平精度（米） | `25` |
| logLevel | 日志级别 | `info` |

每次响应会在目标坐标附近加入与 `accuracy` 匹配的连续微扰。海拔不接受配置：原响应有值则原样保留，没有则不补写。

## 恢复真实定位

推荐直接关闭或删除模块。也可以在选点页“当前生效坐标”区域点击“清除数据”，清除 `wloc_settings_v2`。

清除后，如果模块参数仍是默认坐标，脚本进入透传模式，不再修改 WLOC 响应。iOS 高版本可能仍需重启以清除系统缓存。

## 数据存储

- 当前生效坐标：保存在代理工具的 `$persistentStore`，键名为 `wloc_settings_v2`。
- 收藏位置：保存在浏览器 `localStorage`。
- 旧数据中的 `altitude` 会被忽略，下次保存位置时自然移除。
- Worker 不使用 KV、数据库或用户账户。

## 自部署 Worker

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gamesofts/wloc/tree/geo/worker)

手动部署：

```bash
git clone --branch geo --single-branch https://github.com/gamesofts/wloc.git
cd wloc/worker
npm install
npx wrangler login
npm run deploy
```

本项目生产 Worker：<https://wloc.gamesofts.net>

Pages 部署：

```bash
cd worker
npm install
npx wrangler pages deploy -c wrangler.pages.jsonc
```

## 常见问题

- 页面无法储存：确认模块已启用、MITM 证书已信任、当前网络经过代理。
- 定位仍是真实位置：Apple 在 GPS 信号较强时可能忽略网络定位结果。
- 切换位置后仍显示旧值：按上面的 iOS 高版本流程重启设备。
- Stash：直接订阅 `.stoverride`，无需通过 Script Hub 转换。
- Egern：可使用 Surge 模块。

更详细的操作说明见 [docs/shortcut-guide.md](docs/shortcut-guide.md)。

## 致谢

- Yu9191/wloc（上游项目）
- [proxypin-wloc-spoofer](https://github.com/FFF686868/proxypin-wloc-spoofer)
- [NSNanoCat/Util](https://github.com/NSNanoCat/util)
