#!/usr/bin/env bash
# 在 macOS 上把本工程编译成无需签名的 IPA（可直接用巨魔 / TrollStore 安装）
# 用法： bash build_ipa.sh
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="IDWatermark"          # 可执行文件 / .app 名字（保持 ASCII）
DISPLAY_NAME="身份证加水印"      # 桌面显示名（在 Info.plist 里）
MIN_IOS="14.0"
BUILD_DIR="build"
APP_DIR="$BUILD_DIR/Payload/${APP_NAME}.app"
IPA_NAME="IDWatermark.ipa"

echo "==> 清理旧产物"
rm -rf "$BUILD_DIR"
mkdir -p "$APP_DIR"

SDK="$(xcrun --sdk iphoneos --show-sdk-path)"
echo "==> iOS SDK: $SDK"
xcrun --sdk iphoneos swiftc --version

echo "==> 编译 arm64 可执行文件"
xcrun --sdk iphoneos swiftc \
  -sdk "$SDK" \
  -target "arm64-apple-ios${MIN_IOS}" \
  -F "$SDK/System/Library/Frameworks" \
  -Xlinker -rpath -Xlinker /usr/lib/swift \
  -O -module-name "$APP_NAME" \
  -framework UIKit -framework WebKit -framework Photos \
  Sources/main.swift Sources/App.swift \
  -o "$APP_DIR/$APP_NAME"

echo "==> 组装 .app"
cp Resources/index.html "$APP_DIR/index.html"
cp Resources/Info.plist "$APP_DIR/Info.plist"
cp "Resources/AppIcon60x60@2x.png" "$APP_DIR/"
cp "Resources/AppIcon60x60@3x.png" "$APP_DIR/"
printf 'APPL????' > "$APP_DIR/PkgInfo"

echo "==> ad-hoc 签名（巨魔不校验证书，这一步只是让包更规范）"
if ! /usr/bin/codesign --force --sign - --timestamp=none "$APP_DIR"; then
  echo "warn: codesign 失败，忽略（巨魔仍可安装）"
fi

echo "==> 打包 IPA"
cd "$BUILD_DIR"
/usr/bin/zip -qry "$IPA_NAME" Payload
cd ..
mv "$BUILD_DIR/$IPA_NAME" "./$IPA_NAME"

echo "==> 完成"
ls -lh "./$IPA_NAME"
/usr/bin/unzip -l "./$IPA_NAME"
echo
echo "IPA 路径：$(pwd)/$IPA_NAME"
echo "下一步：传到 iPhone → 用巨魔（TrollStore）打开该 IPA → Install"
