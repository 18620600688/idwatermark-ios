# 身份证加水印 · iOS 版（巨魔 / TrollStore 免签名安装）

这是一个**不需要证书、不需要 App Store** 的 iOS 应用：

- 原生壳（WKWebView + 相册保存），界面就是已经验证过的网页版
- 全程本地处理，不联网、不申请网络权限
- 支持：选照片（可多选）/ 平铺或单个大字水印 / 颜色、透明度、字号、旋转 /
  存入相册 / 全部存相册 / 分享（可存到「文件」）
- 最低支持 iOS 14.0（巨魔支持的范围：iOS 14.0 – 16.6.1 / 17.0）

## 目录结构

```
.github/workflows/build-ipa.yml   ← GitHub 云端自动编译配置
Sources/main.swift                ← 程序入口
Sources/App.swift                 ← 原生壳：WebView + 相册保存 + 分享
Resources/index.html              ← 界面（触屏适配版）
Resources/Info.plist              ← 应用信息（名字/图标/权限描述）
Resources/AppIcon*.png            ← 桌面图标
build_ipa.sh                      ← macOS 上一条命令打包（无需 Xcode 工程）
tools/make_ios_icon.py            ← 重新生成图标的脚本
```

## 方法一：GitHub 云端编译（推荐，没有 Mac 也能出 IPA）

1. 注册 / 登录 [github.com](https://github.com)
2. 右上角 **+** → **New repository** → 名字随便（如 `idwatermark-ios`），
   选 **Public**（公共仓库的 macOS 编译分钟数免费），点 **Create repository**
3. 在新仓库页点 **uploading an existing file**，
   把本文件夹（`ios-app`）里的**全部内容**（包括 `.github` 文件夹）拖进上传框 → **Commit changes**
   - 注意：拖的是 `ios-app` 文件夹**里面的东西**，不要多套一层目录
4. 顶部 **Actions** 标签 → 左侧 **Build unsigned IPA** → 正在跑的黄点变绿 ✓（约 2~5 分钟）
5. 点进这次运行 → 页面下方 **Artifacts** → 下载 **IDWatermark-ipa**（zip，解压出 `IDWatermark.ipa`）
6. 把 IPA 传到手机：微信「文件传输助手」/ QQ / 隔空投送均可
7. 手机上：文件 App 里长按 IPA → **分享** → **TrollStore** → **Install**

> 如果 Actions 报错，把报错那一页发给我，我来修。

## 方法二：有 Mac 的话

```bash
cd ios-app
bash build_ipa.sh
```
产物就是当前目录下的 `IDWatermark.ipa`（不需要装 Xcode 工程，系统自带 swiftc 即可，但需要装过 Xcode 或 Command Line Tools）。

## 常见问题

- **巨魔里看不到 IPA / 打不开**：确认文件扩展名是 `.ipa`；微信传输有时会改名，长按 → 重命名。
- **安装后图标是灰的**：正常现象，点开即用；重启一次桌面（或注销重登）即可恢复。
- **保存提示没有相册权限**：设置 → 隐私与安全性 → 照片 → 身份证加水印 → 允许「添加照片」。
- **想改默认水印文字 / 名字**：改 `Resources/index.html` 里的默认值，或 `Info.plist` 里的 `CFBundleDisplayName`，重新编译即可。
