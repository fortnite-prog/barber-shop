// Autoclicker per macOS (Apple Silicon e Intel) - nessuna dipendenza.
// Compilazione:  swiftc -O autoclicker.swift -o autoclicker
// Uso:           ./autoclicker [click_al_secondo]   (0 = massima velocità possibile)
// Comandi:       F6 = avvia/ferma   |   Ctrl+C = esci
// Clicca dove si trova il cursore in quel momento.

import Cocoa
import CoreGraphics

// --- Configurazione ---
let toggleKeyCode: Int64 = 97   // tasto F6
let cps: Double = {
    if CommandLine.arguments.count > 1, let v = Double(CommandLine.arguments[1]), v >= 0 { return v }
    return 100 // default: 100 click al secondo
}()

// --- Stato condiviso tra thread ---
let lock = NSLock()
var running = false
func isRunning() -> Bool { lock.lock(); defer { lock.unlock() }; return running }
func setRunning(_ v: Bool) { lock.lock(); running = v; lock.unlock() }

let source = CGEventSource(stateID: .hidSystemState)
let clickQueue = DispatchQueue(label: "autoclicker.loop", qos: .userInteractive)

// Un click completo (giù + su) alla posizione attuale del cursore
func clickOnce() {
    let pos = CGEvent(source: nil)?.location ?? .zero
    for type in [CGEventType.leftMouseDown, .leftMouseUp] {
        guard let e = CGEvent(mouseEventSource: source, mouseType: type,
                              mouseCursorPosition: pos, mouseButton: .left) else { continue }
        e.setIntegerValueField(.mouseEventClickState, value: 1)
        e.post(tap: .cghidEventTap)
    }
}

func startLoop() {
    // Intervallo in microsecondi; con cps = 0 non c'è nessuna pausa
    let intervalUs: UInt32 = cps > 0 ? UInt32(1_000_000 / cps) : 0
    clickQueue.async {
        while isRunning() {
            clickOnce()
            if intervalUs > 0 { usleep(intervalUs) }
        }
    }
}

// --- Hotkey globale (richiede permesso Accessibilità) ---
let callback: CGEventTapCallBack = { _, type, event, _ in
    if type == .keyDown,
       event.getIntegerValueField(.keyboardEventKeycode) == toggleKeyCode,
       event.getIntegerValueField(.keyboardEventAutorepeat) == 0 {
        if isRunning() {
            setRunning(false)
            print("⏹  Fermo")
        } else {
            setRunning(true)
            print("▶️  Attivo (\(cps > 0 ? "\(Int(cps)) click/s" : "massima velocità"))")
            startLoop()
        }
        return nil // consuma il tasto F6
    }
    return Unmanaged.passUnretained(event)
}

let mask = CGEventMask(1 << CGEventType.keyDown.rawValue)
guard let tap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap,
                                  options: .defaultTap, eventsOfInterest: mask,
                                  callback: callback, userInfo: nil) else {
    print("❌ Permesso mancante. Vai in Impostazioni di Sistema > Privacy e sicurezza > Accessibilità")
    print("   (e anche 'Monitoraggio input') e abilita l'app da cui lanci questo programma (Terminale).")
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: tap, enable: true)

print("Autoclicker pronto. Premi F6 per avviare/fermare. Ctrl+C per uscire.")
CFRunLoopRun()
