import Foundation
import CoreGraphics

// Tasto del mouse da simulare
enum MouseBtn: String, CaseIterable, Identifiable {
    case left = "Sinistro", right = "Destro", middle = "Centrale"
    var id: String { rawValue }

    var downType: CGEventType {
        switch self {
        case .left: return .leftMouseDown
        case .right: return .rightMouseDown
        case .middle: return .otherMouseDown
        }
    }
    var upType: CGEventType {
        switch self {
        case .left: return .leftMouseUp
        case .right: return .rightMouseUp
        case .middle: return .otherMouseUp
        }
    }
    var cgButton: CGMouseButton {
        switch self {
        case .left: return .left
        case .right: return .right
        case .middle: return .center
        }
    }
}

enum ClickKind: String, CaseIterable, Identifiable {
    case single = "Singolo", double = "Doppio"
    var id: String { rawValue }
}

enum PosMode: String, CaseIterable, Identifiable {
    case cursor = "Sotto il cursore", fixed = "Posizione fissa"
    var id: String { rawValue }
}

enum StopMode: String, CaseIterable, Identifiable {
    case never = "Mai (manuale)", clicks = "Dopo N click", time = "Dopo N secondi"
    var id: String { rawValue }
}

// Tasti di avvio/stop (codici tasto virtuali macOS)
enum HotkeyChoice: String, CaseIterable, Identifiable {
    case f5 = "F5", f6 = "F6", f7 = "F7", f8 = "F8", f9 = "F9", f10 = "F10"
    var id: String { rawValue }
    var keyCode: UInt32 {
        switch self {
        case .f5: return 96
        case .f6: return 97
        case .f7: return 98
        case .f8: return 100
        case .f9: return 101
        case .f10: return 109
        }
    }
}

// Copia "congelata" delle impostazioni, letta dal thread dei click
struct ClickConfig {
    var cps: Double
    var button: MouseBtn
    var kind: ClickKind
    var fixedPoint: CGPoint?
    var stopMode: StopMode
    var maxClicks: Int
    var maxSeconds: Double
    var jitter: Double      // variazione casuale dell'intervallo, 0...0.5
    var startDelay: Double  // secondi prima del primo click
}
