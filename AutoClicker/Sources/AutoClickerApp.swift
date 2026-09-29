import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    // Chiudendo la finestra l'app termina (e i click si fermano)
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}

@main
struct AutoClickerApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        WindowGroup("AutoClicker") {
            ContentView()
        }
        .windowResizability(.contentSize)
    }
}
