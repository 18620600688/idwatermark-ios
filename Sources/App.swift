//  身份证加水印 · iOS 客户端（原生壳 + 本地网页界面）
//  所有处理都在本机 WebView 内完成，不联网；保存图片走系统相册接口。

import UIKit
import WebKit
import Photos

final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        let win = UIWindow(frame: UIScreen.main.bounds)
        win.rootViewController = RootViewController()
        win.makeKeyAndVisible()
        window = win
        return true
    }
}

final class RootViewController: UIViewController, WKScriptMessageHandler {

    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(self, name: "idwm")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.bounces = false
        webView.backgroundColor = UIColor(red: 0.94, green: 0.95, blue: 0.96, alpha: 1)
        webView.isOpaque = false
        view.addSubview(webView)

        guard let url = Bundle.main.url(forResource: "index", withExtension: "html") else {
            showFatal("找不到内置页面 index.html")
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    // MARK: - JS 桥

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }
        let action = (body["action"] as? String) ?? "photos"
        let rawName = (body["name"] as? String) ?? "watermark"
        let name = sanitize(rawName)

        guard let dataString = body["data"] as? String,
              let comma = dataString.range(of: ","),
              let data = Data(base64Encoded: String(dataString[comma.upperBound...]),
                              options: .ignoreUnknownCharacters),
              let image = UIImage(data: data) else {
            notify(status: "error", message: "图片数据无效")
            return
        }

        if action == "share" {
            share(image: image, name: name)
        } else {
            saveToPhotos(image)
        }
    }

    // MARK: - 存入相册

    private func saveToPhotos(_ image: UIImage) {
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                self.notify(status: "error", message: "没有相册权限，请在「设置 → 隐私 → 照片」里允许")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                PHAssetChangeRequest.creationRequestForAsset(from: image)
            }, completionHandler: { success, error in
                if success {
                    self.notify(status: "ok", message: "已存入相册")
                } else {
                    self.notify(status: "error",
                                message: error?.localizedDescription ?? "保存失败")
                }
            })
        }
    }

    // MARK: - 分享 / 存到「文件」

    private func share(image: UIImage, name: String) {
        DispatchQueue.main.async {
            var items: [Any] = [image]
            let tmp = FileManager.default.temporaryDirectory
                .appendingPathComponent(name.hasSuffix(".png") || name.hasSuffix(".jpg") ? name : name + ".png")
            if let data = image.pngData(), (try? data.write(to: tmp)) != nil {
                items.insert(tmp, at: 0)
            }
            let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
            if let pop = vc.popoverPresentationController {
                pop.sourceView = self.view
                pop.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.maxY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            self.present(vc, animated: true)
        }
    }

    // MARK: - 工具

    private func sanitize(_ name: String) -> String {
        let bad = CharacterSet(charactersIn: "\\/:*?\"<>|\n\r\t")
        let cleaned = name.components(separatedBy: bad).joined(separator: "_")
        let trimmed = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "watermark" }
        return String(trimmed.prefix(60))
    }

    private func notify(status: String, message: String) {
        DispatchQueue.main.async {
            let payload: [String: Any] = ["status": status, "message": message]
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            let js = "window.__nativeResult && window.__nativeResult(\(json));"
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func showFatal(_ text: String) {
        let label = UILabel(frame: view.bounds)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .darkGray
        label.text = text
        view.addSubview(label)
    }
}
