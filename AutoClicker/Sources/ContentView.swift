import SwiftUI
import ApplicationServices

struct ContentView: View {
    @StateObject private var engine = ClickEngine()
    private let hotkey = HotKey()

    // Impostazioni salvate tra un avvio e l'altro
    @AppStorage("cps") private var cps = 100.0
    @AppStorage("button") private var button: MouseBtn = .left
    @AppStorage("kind") private var kind: ClickKind = .single
    @AppStorage("posMode") private var posMode: PosMode = .cursor
    @AppStorage("hasFixed") private var hasFixed = false
    @AppStorage("fixedX") private var fixedX = 0.0
    @AppStorage("fixedY") private var fixedY = 0.0
    @AppStorage("stopMode") private var stopMode: StopMode = .never
    @AppStorage("maxClicks") private var maxClicks = 1000
    @AppStorage("maxSeconds") private var maxSeconds = 10.0
    @AppStorage("jitter") private var jitterPct = 0.0
    @AppStorage("startDelay") private var startDelay = 3.0
    @AppStorage("hotkey") private var hotkeyChoice: HotkeyChoice = .f6

    @State private var trusted = AXIsProcessTrusted()
    @State private var captureCount = 0

    private var canStart: Bool { posMode == .cursor || hasFixed }

    var body: some View {
        VStack(spacing: 0) {
            if !trusted { permissionBanner }

            Form {
                Section("Velocità") {
                    HStack {
                        Slider(value: $cps, in: 1...1000, step: 1)
                        TextField("", value: $cps, format: .number)
                            .frame(width: 60)
                            .multilineTextAlignment(.trailing)
                            .onChange(of: cps) { v in cps = min(max(v, 1), 1000) }
                        Text("click/s")
                    }
                    HStack {
                        ForEach([10.0, 50, 100, 250, 500, 1000], id: \.self) { v in
                            Button("\(Int(v))") { cps = v }.buttonStyle(.bordered)
                        }
                    }
                }

                Section("Click") {
                    Picker("Tasto", selection: $button) {
                        ForEach(MouseBtn.allCases) { Text($0.rawValue).tag($0) }
                    }.pickerStyle(.segmented)
                    Picker("Tipo", selection: $kind) {
                        ForEach(ClickKind.allCases) { Text($0.rawValue).tag($0) }
                    }.pickerStyle(.segmented)
                }

                Section("Posizione") {
                    Picker("Dove", selection: $posMode) {
                        ForEach(PosMode.allCases) { Text($0.rawValue).tag($0) }
                    }.pickerStyle(.segmented)
                    if posMode == .fixed {
                        HStack {
                            Text(hasFixed ? "X: \(Int(fixedX))   Y: \(Int(fixedY))" : "Nessuna posizione impostata")
                                .foregroundStyle(hasFixed ? .primary : .secondary)
                            Spacer()
                            Button(captureCount > 0 ? "Cattura tra \(captureCount)…" : "Cattura posizione") {
                                captureMouse()
                            }.disabled(captureCount > 0)
                        }
                        Text("Premi il pulsante e porta il mouse dove vuoi cliccare: dopo 3 secondi la posizione viene salvata.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }

                Section("Arresto automatico") {
                    Picker("Ferma", selection: $stopMode) {
                        ForEach(StopMode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    if stopMode == .clicks {
                        TextField("Numero di click", value: $maxClicks, format: .number)
                            .onChange(of: maxClicks) { v in if v < 1 { maxClicks = 1 } }
                    }
                    if stopMode == .time {
                        TextField("Secondi", value: $maxSeconds, format: .number)
                            .onChange(of: maxSeconds) { v in if v < 0.1 { maxSeconds = 0.1 } }
                    }
                }

                Section("Avanzate") {
                    HStack {
                        Text("Variazione casuale")
                        Slider(value: $jitterPct, in: 0...50, step: 1)
                        Text("\(Int(jitterPct))%").frame(width: 40, alignment: .trailing)
                    }
                    HStack {
                        Text("Ritardo iniziale")
                        Slider(value: $startDelay, in: 0...10, step: 0.5)
                        Text("\(startDelay, specifier: "%.1f") s").frame(width: 50, alignment: .trailing)
                    }
                    Picker("Tasto avvio/stop", selection: $hotkeyChoice) {
                        ForEach(HotkeyChoice.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .onChange(of: hotkeyChoice) { v in hotkey.register(keyCode: v.keyCode) }
                }
            }
            .formStyle(.grouped)

            statusBar
        }
        .frame(width: 480, height: 760)
        .onAppear {
            HotKey.handler = { toggle() }
            hotkey.register(keyCode: hotkeyChoice.keyCode)
        }
        // Aggiorna contatore, velocità reale e stato del permesso
        .onReceive(Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()) { _ in
            engine.pollUI()
            trusted = AXIsProcessTrusted()
        }
    }

    // MARK: - Parti di UI

    private var permissionBanner: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.yellow)
            Text("Serve il permesso Accessibilità per simulare i click.").font(.callout)
            Spacer()
            Button("Apri Impostazioni") {
                let opts = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
                _ = AXIsProcessTrustedWithOptions(opts)
                if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility") {
                    NSWorkspace.shared.open(url)
                }
            }
        }
        .padding(10)
        .background(Color.yellow.opacity(0.15))
    }

    private var statusBar: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Click eseguiti: \(engine.clicks)").monospacedDigit()
                    Text("Velocità reale: \(Int(engine.rate)) click/s").monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text(engine.isRunning ? "ATTIVO" : "FERMO")
                    .font(.headline)
                    .foregroundStyle(engine.isRunning ? .green : .secondary)
            }
            Button(action: toggle) {
                Text(engine.isRunning ? "Ferma (\(hotkeyChoice.rawValue))" : "Avvia (\(hotkeyChoice.rawValue))")
                    .frame(maxWidth: .infinity)
            }
            .controlSize(.large)
            .buttonStyle(.borderedProminent)
            .tint(engine.isRunning ? .red : .accentColor)
            .disabled(!engine.isRunning && (!canStart || !trusted))
        }
        .padding(14)
    }

    // MARK: - Azioni

    private func toggle() {
        if engine.isRunning {
            engine.stop()
        } else if canStart && trusted {
            engine.start(ClickConfig(
                cps: min(max(cps, 1), 1000),
                button: button,
                kind: kind,
                fixedPoint: posMode == .fixed ? CGPoint(x: fixedX, y: fixedY) : nil,
                stopMode: stopMode,
                maxClicks: max(maxClicks, 1),
                maxSeconds: max(maxSeconds, 0.1),
                jitter: jitterPct / 100,
                startDelay: startDelay
            ))
        }
    }

    // Conto alla rovescia di 3 secondi, poi salva la posizione del cursore
    private func captureMouse() {
        captureCount = 3
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { t in
            captureCount -= 1
            if captureCount <= 0 {
                t.invalidate()
                if let p = CGEvent(source: nil)?.location {
                    fixedX = p.x; fixedY = p.y; hasFixed = true
                    NSSound.beep()
                }
            }
        }
    }
}
