# Apple WLOC 定位修改

> 测试阶段。修改 Apple 网络定位(WLOC)返回的经纬度和精度，保留原始定位响应中的海拔值。

## 订阅地址

| 工具 | 订阅链接 |
|------|----------|
| Surge | `https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/geo/modules/wloc.sgmodule` |
| Loon | `https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/geo/modules/wloc.lpx` |
| Stash | `https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/geo/modules/wloc.stoverride` |
| QuantumultX | `https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/geo/modules/wloc.conf` |
| Shadowrocket(小火箭) | `https://raw.githubusercontent.com/Yu9191/wloc/refs/heads/geo/modules/wloc.module` |

MITM 主机名：`gs-loc.apple.com, gs-loc-cn.apple.com`

## Worker 地址

- 选点页：https://wloc-spoofer.daoyufan.workers.dev/

脚本只修改经纬度和精度。WLOC 响应中已有的海拔字段保持原样，缺失时也不会补写。

## 坐标微扰

- 每次 WLOC 响应会在目标坐标附近加入轻微水平偏移，范围跟随 `accuracy` 参数。
- 连续响应沿上一次偏移缓慢移动；超过 5 分钟未定位，或目标坐标、精度改变时重新生成起点。
- 同一次响应中的 Wi-Fi 与蜂窝位置共享同一偏移，避免出现互相矛盾的位置。

> 持久化存储键名为 `wloc_settings_v2`。旧数据中的 `altitude` 会被忽略，下次保存位置时自然移除。
