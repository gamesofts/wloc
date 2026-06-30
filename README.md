# Apple WLOC 定位修改

> 测试阶段。修改 Apple 网络定位(WLOC)返回的经纬度 + 精度 + **海拔**。

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
- 海拔查询接口：`GET /api/geo?lat=..&lon=..` → 返回 `{lat,lon,alt,name}`(地面海拔来自 open-meteo,无需 key);带 `?alt=123` 则直接回显。

## 海拔测试

1. 模块参数里填 `altitude`(单位米),或在选点页填海拔 / 勾「自动查询地面海拔」后储存到设备。
   - 留空 = 不改海拔(透传真实值);`0` = 海平面。
2. 触发一次定位,在系统/快捷指令里查看海拔是否变成设定值。
3. 写入规则:`field5 = 海拔(米) × 100`(由脚本里的 `ALTITUDE_SCALE` 控制)。若真机显示的海拔与设定值有固定倍数偏差,改这个常量即可。

## 坐标微扰

- 每次 WLOC 响应会在目标坐标附近加入轻微水平偏移，范围跟随 `accuracy` 参数。
- 连续响应沿上一次偏移缓慢移动；超过 5 分钟未定位，或目标坐标、精度改变时重新生成起点。
- 同一次响应中的 Wi-Fi 与蜂窝位置共享同一偏移，避免出现互相矛盾的位置。

> 持久化存储键名为 `wloc_settings_v2`(与旧版隔离,首次需重新选点储存一次)。
