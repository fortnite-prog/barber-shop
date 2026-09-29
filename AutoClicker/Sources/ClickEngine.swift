import Foundation
import CoreGraphics

// Motore dei click: gira su un thread dedicato ad alta priorità.
// Il timing usa sleep + spin finale, così a 1000 cps l'intervallo (1 ms) resta preciso.
final class ClickEngine: ObservableObject {
    @Published var isRunning = false
    @Published var clicks = 0
    @Published var rate = 0.0        // click/s misurati davvero

    private let lock = NSLock()
    private var counter = 0
    private var stopFlag = false
    private var lastCount = 0
    private var lastPoll: UInt64 = 0

    private func now() -> UInt64 { clock_gettime_nsec_np(CLOCK_UPTIME_RAW) }
    private func stopped() -> Bool { lock.lock(); defer { lock.unlock() }; return stopFlag }
    private func setStop(_ v: Bool) { lock.lock(); stopFlag = v; lock.unlock() }
    private func currentCount() -> Int { lock.lock(); defer { lock.unlock() }; return counter }
    private func increment() { lock.lock(); counter += 1; lock.unlock() }

    // Da chiamare dal main thread
    func start(_ config: ClickConfig) {
        guard !isRunning else { return }
        lock.lock(); counter = 0; stopFlag = false; lock.unlock()
        clicks = 0; rate = 0; lastCount = 0; lastPoll = now()
        isRunning = true
        let t = Thread { [weak self] in self?.run(config) }
        t.qualityOfService = .userInteractive
        t.start()
    }

    func stop() { setStop(true) }

    // Aggiorna contatore e velocità mostrati in UI (chiamata dal timer della UI)
    func pollUI() {
        let n = currentCount()
        let t = now()
        let dt = Double(t &- lastPoll) / 1e9
        if isRunning, dt > 0 { rate = Double(n - lastCount) / dt }
        lastCount = n; lastPoll = t
        clicks = n
    }

    private func waitUntil(_ target: UInt64) {
        while true {
            let n = now()
            if n >= target { return }
            let rem = target - n
            if rem > 300_000 { usleep(UInt32((rem - 200_000) / 1000)) } // dormi lasciando 0,2 ms di margine
            // altrimenti spin
        }
    }

    private func post(_ c: ClickConfig, source: CGEventSource?, at pos: CGPoint) {
        let repeats = c.kind == .double ? 2 : 1
        for n in 1...repeats {
            if let d = CGEvent(mouseEventSource: source, mouseType: c.button.downType,
                               mouseCursorPosition: pos, mouseButton: c.button.cgButton) {
                d.setIntegerValueField(.mouseEventClickState, value: Int64(n))
                d.post(tap: .cghidEventTap)
            }
            if let u = CGEvent(mouseEventSource: source, mouseType: c.button.upType,
                               mouseCursorPosition: pos, mouseButton: c.button.cgButton) {
                u.setIntegerValueField(.mouseEventClickState, value: Int64(n))
                u.post(tap: .cghidEventTap)
            }
        }
    }

    private func run(_ c: ClickConfig) {
        defer {
            DispatchQueue.main.async {
                self.clicks = self.currentCount()
                self.rate = 0
                self.isRunning = false
            }
        }

        // Ritardo iniziale (interrompibile)
        let delayEnd = now() + UInt64(c.startDelay * 1e9)
        while now() < delayEnd {
            if stopped() { return }
            usleep(20_000)
        }

        let source = CGEventSource(stateID: .hidSystemState)
        if let p = c.fixedPoint { CGWarpMouseCursorPosition(p) }

        let baseNs = 1e9 / max(c.cps, 1)
        let startT = now()
        var next = startT

        while !stopped() {
            if c.stopMode == .clicks, currentCount() >= c.maxClicks { break }
            if c.stopMode == .time, Double(now() - startT) / 1e9 >= c.maxSeconds { break }

            let pos = c.fixedPoint ?? (CGEvent(source: nil)?.location ?? .zero)
            post(c, source: source, at: pos)
            increment()

            var interval = baseNs
            if c.jitter > 0 { interval *= 1 + Double.random(in: -c.jitter...c.jitter) }
            next += UInt64(max(interval, 0))

            // Se il sistema resta indietro, non recuperare a raffica
            let n = now()
            if n > next + 50_000_000 { next = n }
            waitUntil(next)
        }
    }
}
