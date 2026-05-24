#!/usr/bin/env swift
// Analyzes where dark (text) pixels sit in the bottom portion of a card image.
// Usage: swift scripts/analyze-text-region.swift [slug]  (default: c11)

import Foundation
import AppKit

let CDN = "https://cdn.jsdelivr.net/gh/metabismuth/tarot-json@master/cards"
let slug = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "c11"

let url = URL(string: "\(CDN)/\(slug).jpg")!
guard let data = try? Data(contentsOf: url),
      let nsImage = NSImage(data: data),
      let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
else { print("Failed to load \(slug)"); exit(1) }

let w = cgImage.width, h = cgImage.height
var pixels = [UInt8](repeating: 0, count: w * h * 4)
let ctx = CGContext(data: &pixels, width: w, height: h,
    bitsPerComponent: 8, bytesPerRow: w * 4,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: w, height: h))

print("\(slug): \(w)x\(h)")
print("Dark pixels per row (bottom 25%, threshold < 150):")

for row in (h * 3 / 4)..<h {
    var darkCount = 0
    for col in 10..<(w - 10) {
        let idx = (row * w + col) * 4
        let gray = (Int(pixels[idx]) + Int(pixels[idx+1]) + Int(pixels[idx+2])) / 3
        if gray < 150 { darkCount += 1 }
    }
    if darkCount > 3 {
        let pct = String(format: "%.1f", Double(row) / Double(h) * 100)
        print("  y=\(row) (\(pct)%): \(darkCount) dark px")
    }
}
