import Cocoa
import WebKit
import UniformTypeIdentifiers

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var webView: WKWebView!
    let smoke = CommandLine.arguments.contains("--smoke-test")
    lazy var settings = smoke ? UserDefaults(suiteName: "com.sizingstudio.desktop.smoketest")! : UserDefaults.standard
    let keys: Set<String> = ["cluster-sizing-local-v2", "cluster-approved-defaults-v2", "cluster-theme"]
    var exportReceived = false
    var pageURL: URL!

    func applicationDidFinishLaunching(_ notification: Notification) {
        if smoke { settings.removeObject(forKey: "calculatorSettings") }
        let resources = Bundle.main.resourceURL!
        let website = resources.appendingPathComponent("website", isDirectory: true)
        pageURL = website.appendingPathComponent("index.html")
        let configuration = WKWebViewConfiguration()
        // Native preferences make settings independent of the app's folder or WebKit's file origin.
        configuration.websiteDataStore = .nonPersistent()
        configuration.userContentController.add(self, name: "settings")
        configuration.userContentController.add(self, name: "exportCSV")
        do { try installStorageScript(configuration.userContentController) }
        catch { fail(error.localizedDescription); return }
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1220, height: 850), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Sizing Studio"
        window.minSize = NSSize(width: 720, height: 540)
        window.contentView = webView
        window.setFrameAutosaveName("SizingStudioWindow")
        window.center()
        installMenu()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        webView.loadFileURL(pageURL, allowingReadAccessTo: website)
        if smoke {
            DispatchQueue.main.asyncAfter(deadline: .now() + 40) { self.fail("Mac smoke test timed out") }
        }
    }

    func installStorageScript(_ controller: WKUserContentController) throws {
        let snapshot = settings.dictionary(forKey: "calculatorSettings") as? [String: String] ?? [:]
        let json = String(data: try JSONSerialization.data(withJSONObject: snapshot), encoding: .utf8)!
        let bridge = try String(contentsOf: Bundle.main.resourceURL!.appendingPathComponent("storage.js"), encoding: .utf8)
        controller.removeAllUserScripts()
        controller.addUserScript(WKUserScript(source: "window.__savedSettings = \(json);\n" + bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func installMenu() {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        menu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Sizing Studio", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Sizing Studio", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        let edit = NSMenuItem()
        edit.title = "Edit"
        edit.submenu = NSMenu(title: "Edit")
        for (title, selector, key) in [("Undo", "undo:", "z"), ("Redo", "redo:", "Z"), ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            edit.submenu!.addItem(withTitle: title, action: Selector(selector), keyEquivalent: key)
        }
        menu.addItem(edit)
        NSApp.mainMenu = menu
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func isLocal(_ url: URL?) -> Bool {
        guard let url = url, url.isFileURL else { return false }
        return url.standardizedFileURL.path == pageURL.standardizedFileURL.path
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(isLocal(navigationAction.request.url) ? .allow : .cancel)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, isLocal(message.frameInfo.request.url) else { return }
        if message.name == "settings", let values = message.body as? [String: String], values.allSatisfy({ keys.contains($0.key) }), values.values.reduce(0, { $0 + $1.utf8.count }) < 2_000_000 {
            settings.set(values, forKey: "calculatorSettings")
            do { try installStorageScript(userContentController) }
            catch { fail(error.localizedDescription) }
        } else if message.name == "exportCSV", let csv = message.body as? String, csv.utf8.count < 2_000_000 {
            if smoke {
                exportReceived = csv.contains("\"Deployment\",\"aio\"") && csv.contains("All-in-one (AIO)")
                return
            }
            let panel = NSSavePanel()
            panel.title = "Export VM specifications"
            panel.nameFieldStringValue = "Cluster_VM_Specifications.csv"
            panel.allowedContentTypes = [.commaSeparatedText]
            panel.canCreateDirectories = true
            panel.beginSheetModal(for: window) { response in
                guard response == .OK, let url = panel.url else { return }
                do { try csv.write(to: url, atomically: true, encoding: .utf8) }
                catch { self.fail("Could not save CSV: \(error.localizedDescription)") }
            }
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard isLocal(frame.request.url) else { completionHandler(false); return }
        let alert = NSAlert()
        alert.messageText = "Sizing Studio"
        alert.informativeText = message
        alert.addButton(withTitle: "Reset to defaults")
        alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn) }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = "Sizing Studio"
        alert.informativeText = message
        alert.beginSheetModal(for: window) { _ in completionHandler() }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail(error.localizedDescription) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail(error.localizedDescription) }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard smoke else { return }
        do {
            let script = try String(contentsOf: Bundle.main.resourceURL!.appendingPathComponent("smoke.js"), encoding: .utf8)
            webView.evaluateJavaScript(script) { result, error in
                guard error == nil, result as? String == "PASS" else { self.fail(error?.localizedDescription ?? "Web smoke test failed"); return }
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    guard self.exportReceived, let saved = self.settings.dictionary(forKey: "calculatorSettings") as? [String: String], saved["cluster-sizing-local-v2"]?.contains("1234") == true else { self.fail("Native export or settings bridge failed"); return }
                    print("PASS: native WebKit, EPS, ingestion, AIO, retention, all tabs, export bridge, settings bridge")
                    self.settings.removeObject(forKey: "calculatorSettings")
                    exit(0)
                }
            }
        } catch { fail(error.localizedDescription) }
    }

    func fail(_ text: String) {
        if smoke { fputs("FAIL: \(text)\n", stderr); exit(1) }
        let alert = NSAlert()
        alert.messageText = "Sizing Studio"
        alert.informativeText = text
        alert.runModal()
    }
}

let application = NSApplication.shared
application.setActivationPolicy(.regular)
let delegate = AppDelegate()
application.delegate = delegate
application.run()
