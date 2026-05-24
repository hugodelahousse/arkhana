#!/usr/bin/env swift
// Generates subject masks for tarot card images using Apple Vision framework.
// Usage: swift scripts/generate-masks.swift [--instances] [cardSlug...]
// If no slugs given, processes all 78 cards.
//
// Outputs:
//   public/cards/masks/{slug}.png         — merged foreground mask
//   public/cards/masks/centroids.json     — center of gravity per mask (0–1 normalized)
//   --instances: public/cards/masks/{slug}_i{N}.png per instance

import Foundation
import Vision
import CoreImage
import AppKit

let CDN = "https://cdn.jsdelivr.net/gh/metabismuth/tarot-json@master/cards"

let allSlugs: [String] = {
    var slugs: [String] = []
    for i in 0...21 { slugs.append("m\(String(format: "%02d", i))") }
    for prefix in ["w", "c", "s", "p"] {
        for i in 1...14 { slugs.append("\(prefix)\(String(format: "%02d", i))") }
    }
    return slugs
}()

func downloadImage(_ url: URL) -> NSImage? {
    guard let data = try? Data(contentsOf: url) else { return nil }
    return NSImage(data: data)
}

struct SegmentationResult {
    let merged: CGImage
    let instances: [(index: Int, mask: CGImage)]
}

func segment(image: NSImage) -> SegmentationResult? {
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }

    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    do { try handler.perform([request]) }
    catch { print("  Vision error: \(error)"); return nil }

    guard let result = request.results?.first else { print("  No result"); return nil }

    let context = CIContext()
    func maskToCGImage(_ buf: CVPixelBuffer) -> CGImage? {
        let ci = CIImage(cvPixelBuffer: buf)
        return context.createCGImage(ci, from: ci.extent)
    }

    guard let mergedBuf = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler),
          let merged = maskToCGImage(mergedBuf) else { return nil }

    var instances: [(Int, CGImage)] = []
    for idx in result.allInstances {
        if let buf = try? result.generateScaledMaskForImage(forInstances: IndexSet(integer: idx), from: handler),
           let img = maskToCGImage(buf) { instances.append((idx, img)) }
    }

    return SegmentationResult(merged: merged, instances: instances)
}

struct Centroid: Codable {
    let x: Double
    let y: Double
}

func computeCentroid(of cgImage: CGImage) -> Centroid {
    let w = cgImage.width
    let h = cgImage.height
    let bytesPerRow = w
    var pixels = [UInt8](repeating: 0, count: w * h)

    guard let ctx = CGContext(
        data: &pixels, width: w, height: h,
        bitsPerComponent: 8, bytesPerRow: bytesPerRow,
        space: CGColorSpaceCreateDeviceGray(),
        bitmapInfo: CGImageAlphaInfo.none.rawValue
    ) else { return Centroid(x: 0.5, y: 0.5) }

    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: w, height: h))

    var sumX: Double = 0, sumY: Double = 0, total: Double = 0
    for row in 0..<h {
        for col in 0..<w {
            let v = Double(pixels[row * bytesPerRow + col])
            if v > 10 {
                sumX += Double(col) * v
                sumY += Double(row) * v
                total += v
            }
        }
    }

    guard total > 0 else { return Centroid(x: 0.5, y: 0.5) }
    return Centroid(
        x: (sumX / total) / Double(w),
        y: (sumY / total) / Double(h)
    )
}

struct TextRegion {
    let name: CGImage?
    let top: CGImage?
}

func extractTextMasks(from cgImage: CGImage) -> TextRegion {
    let w = cgImage.width, h = cgImage.height

    // Use Vision text detection to find text bounding boxes
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .fast
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do { try handler.perform([request]) } catch { return TextRegion(name: nil, top: nil) }

    guard let results = request.results, !results.isEmpty else {
        return TextRegion(name: nil, top: nil)
    }

    // Read card pixels
    var pixels = [UInt8](repeating: 0, count: w * h * 4)
    guard let ctx = CGContext(data: &pixels, width: w, height: h,
        bitsPerComponent: 8, bytesPerRow: w * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return TextRegion(name: nil, top: nil) }
    ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: w, height: h))

    // Separate text observations into "bottom" (name) and "top" (number/title)
    // Vision uses bottom-left origin with normalized coords
    var nameBoxes: [CGRect] = []
    var topBoxes: [CGRect] = []

    for obs in results {
        let bb = obs.boundingBox
        let midY = 1.0 - (bb.origin.y + bb.height / 2) // flip to top-left origin
        if midY > 0.85 {
            // Bottom text region
            nameBoxes.append(bb)
        } else if midY < 0.12 {
            // Top text region
            topBoxes.append(bb)
        }
    }

    func buildMask(boxes: [CGRect], threshold: Int) -> CGImage? {
        guard !boxes.isEmpty else { return nil }
        var mask = [UInt8](repeating: 0, count: w * h)

        for bb in boxes {
            // Convert from Vision coords (bottom-left, normalized) to pixel coords (top-left)
            let pad = 2 // small padding
            let x0 = max(0, Int(bb.origin.x * Double(w)) - pad)
            let x1 = min(w, Int((bb.origin.x + bb.width) * Double(w)) + pad)
            let y0 = max(0, Int((1.0 - bb.origin.y - bb.height) * Double(h)) - pad)
            let y1 = min(h, Int((1.0 - bb.origin.y) * Double(h)) + pad)

            for y in y0..<y1 {
                for x in x0..<x1 {
                    let idx = (y * w + x) * 4
                    let gray = (Int(pixels[idx]) + Int(pixels[idx+1]) + Int(pixels[idx+2])) / 3
                    if gray < threshold { mask[y * w + x] = 255 }
                }
            }
        }

        let maskCtx = CGContext(data: &mask, width: w, height: h,
            bitsPerComponent: 8, bytesPerRow: w,
            space: CGColorSpaceCreateDeviceGray(),
            bitmapInfo: CGImageAlphaInfo.none.rawValue)!
        return maskCtx.makeImage()
    }

    return TextRegion(
        name: buildMask(boxes: nameBoxes, threshold: 150),
        top: buildMask(boxes: topBoxes, threshold: 150)
    )
}

func savePNG(_ cgImage: CGImage, to path: String) {
    let url = URL(fileURLWithPath: path)
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else { return }
    CGImageDestinationAddImage(dest, cgImage, nil)
    CGImageDestinationFinalize(dest)
}

// --- Main ---

var args = Array(CommandLine.arguments.dropFirst())
let saveInstances = args.contains("--instances")
args.removeAll { $0 == "--instances" }

let slugsToProcess = args.isEmpty ? allSlugs : args

let outDir = "public/cards/masks"
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

// Load existing centroids
let centroidsPath = "\(outDir)/centroids.json"
var centroids: [String: Centroid] = {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: centroidsPath)),
          let decoded = try? JSONDecoder().decode([String: Centroid].self, from: data)
    else { return [:] }
    return decoded
}()

print("Generating masks for \(slugsToProcess.count) card(s)\(saveInstances ? " (with per-instance masks)" : "")...")

for (i, slug) in slugsToProcess.enumerated() {
    let outPath = "\(outDir)/\(slug).png"
    let namePath = "\(outDir)/\(slug)_name.png"
    let topPath = "\(outDir)/\(slug)_top.png"
    let needsMask = !FileManager.default.fileExists(atPath: outPath)
    let needsName = !FileManager.default.fileExists(atPath: namePath)
    let isMajor = slug.hasPrefix("m")
    let needsTop = isMajor && !FileManager.default.fileExists(atPath: topPath)
    let needsCentroid = centroids[slug] == nil

    if !needsMask && !needsName && !needsTop && !needsCentroid {
        print("[\(i+1)/\(slugsToProcess.count)] \(slug) — skipped (exists)")
        continue
    }

    let url = URL(string: "\(CDN)/\(slug).jpg")!
    print("[\(i+1)/\(slugsToProcess.count)] \(slug) —", terminator: "")

    if needsMask || needsName || needsTop {
        print(" downloading...", terminator: "")
        guard let image = downloadImage(url) else { print(" FAILED (download)"); continue }
        guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print(" FAILED"); continue }

        if needsMask {
            print(" segmenting...", terminator: "")
            guard let result = segment(image: image) else { print(" FAILED"); continue }
            savePNG(result.merged, to: outPath)
            let c = computeCentroid(of: result.merged)
            centroids[slug] = c
            print(" \(result.instances.count)inst", terminator: "")
            if saveInstances {
                for (idx, mask) in result.instances {
                    savePNG(mask, to: "\(outDir)/\(slug)_i\(idx).png")
                }
            }
        }

        if needsName || needsTop {
            let textRegion = extractTextMasks(from: cg)
            if needsName, let nameMask = textRegion.name {
                savePNG(nameMask, to: namePath)
                print(" +name", terminator: "")
            }
            if needsTop, let topMask = textRegion.top {
                savePNG(topMask, to: topPath)
                print(" +top", terminator: "")
            }
        }

        print(" — done")
    } else if needsCentroid {
        print(" computing centroid...", terminator: "")
        let maskUrl = URL(fileURLWithPath: outPath)
        guard let maskData = try? Data(contentsOf: maskUrl),
              let nsImage = NSImage(data: maskData),
              let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)
        else { print(" FAILED"); continue }
        let c = computeCentroid(of: cgImage)
        centroids[slug] = c
        print(" done")
    }
}

// Write centroids
let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
let jsonData = try encoder.encode(centroids)
try jsonData.write(to: URL(fileURLWithPath: centroidsPath))
print("Wrote centroids to \(centroidsPath)")

print("Complete.")
