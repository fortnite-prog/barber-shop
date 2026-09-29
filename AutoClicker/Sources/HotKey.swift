import Carbon.HIToolbox

// Scorciatoia globale (funziona anche con l'app in secondo piano, senza permessi extra)
final class HotKey {
    static var handler: (() -> Void)?
    private static var installed = false
    private var ref: EventHotKeyRef?

    func register(keyCode: UInt32) {
        unregister()
        if !HotKey.installed {
            var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                     eventKind: UInt32(kEventHotKeyPressed))
            InstallEventHandler(GetApplicationEventTarget(), { _, _, _ in
                HotKey.handler?()
                return noErr
            }, 1, &spec, nil, nil)
            HotKey.installed = true
        }
        let id = EventHotKeyID(signature: OSType(0x41434C4B), id: 1)
        RegisterEventHotKey(keyCode, 0, id, GetApplicationEventTarget(), 0, &ref)
    }

    func unregister() {
        if let r = ref { UnregisterEventHotKey(r); ref = nil }
    }
}
