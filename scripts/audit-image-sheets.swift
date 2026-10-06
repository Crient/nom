// Offline native macOS image decoding/contact sheets. Never writes input files.
import AppKit
import ImageIO
import Foundation
let input = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let data = try Data(contentsOf: URL(fileURLWithPath: input))
let rows = try JSONSerialization.jsonObject(with: data) as! [[String: Any]]
let cs = CGColorSpaceCreateDeviceRGB()
var results = [[String: Any]]()
var decoded = [String: CGImage]()
for row in rows {
    let path = row["copyPath"] as! String
    var out = row
    if let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
       let img = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary) {
        out["width"] = img.width; out["height"] = img.height; out["readable"] = true
        out["decodedFormat"] = CGImageSourceGetType(source) as String? ?? "unknown"
        let small = CGContext(data: nil, width: 9, height: 8, bitsPerComponent: 8, bytesPerRow: 36, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        small.interpolationQuality = .high
        small.draw(img, in: CGRect(x: 0, y: 0, width: 9, height: 8))
        let pixels = small.data!.assumingMemoryBound(to: UInt8.self)
        var hash: UInt64 = 0
        for y in 0..<8 { for x in 0..<8 {
            let a = y*36 + x*4; let b = a+4
            let left = Int(pixels[a])*299 + Int(pixels[a+1])*587 + Int(pixels[a+2])*114
            let right = Int(pixels[b])*299 + Int(pixels[b+1])*587 + Int(pixels[b+2])*114
            hash = (hash << 1) | (left > right ? 1 : 0)
        }}
        out["dHash"] = String(format: "%016llx", hash)
        out["aspectRatio"] = Double(img.width)/Double(img.height)
        // Scale review copies to 480px; keep enough detail to compare food cues.
        let height = Int(Double(img.height)*480/Double(img.width))
        let thumb = CGContext(data: nil, width: 480, height: height, bitsPerComponent: 8, bytesPerRow: 480*4, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        thumb.interpolationQuality = .high
        thumb.draw(img, in: CGRect(x: 0,y: 0,width:480,height:height))
        decoded[row["identifier"] as! String] = thumb.makeImage()!
    } else {out["readable"] = false}
    results.append(out)
}
let batches = Dictionary(grouping: results, by: { $0["batch"] as! Int })
let batchNumbers = CommandLine.arguments.contains("--supplied-only") ? batches.keys.sorted() : Array(1...20)
for batch in batchNumbers {
    let group = (batches[batch] ?? []).sorted { ($0["index"] as! Int) < ($1["index"] as! Int) }
    let cols = 2, tileW = 520, tileH = 405
    let height = max(150, 55 + ((group.count + cols - 1)/cols)*tileH)
    let ctx = CGContext(data: nil, width: cols*tileW, height: height, bitsPerComponent: 8, bytesPerRow: cols*tileW*4, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    ctx.setFillColor(CGColor(gray: 1,alpha:1));ctx.fill(CGRect(x:0,y:0,width:cols*tileW,height:height))
    let gfx = NSGraphicsContext(cgContext: ctx, flipped: false)
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = gfx
    let font = NSFont.systemFont(ofSize: 15)
    let attrs: [NSAttributedString.Key:Any] = [.font:font,.foregroundColor:NSColor.black]
    ("Batch \(batch) — \(group.count) supplied images" as NSString).draw(at:NSPoint(x:16,y:height-35),withAttributes:attrs)
    if group.isEmpty {("No supplied files for this batch" as NSString).draw(at:NSPoint(x:16,y:height-85),withAttributes:attrs)}
    for (i,row) in group.enumerated() {
        let x = (i % cols)*tileW + 18
        let y = height - 55 - (i/cols+1)*tileH
        let id = row["identifier"] as! String
        if let img = decoded[id] {
            let h = min(320, img.height), w = Double(img.width)*Double(h)/Double(img.height)
            ctx.draw(img,in:CGRect(x:Double(x)+(480-w)/2,y:Double(y)+75,width:w,height:Double(h)))
        }
        let size = "\(row["width"] ?? "?")×\(row["height"] ?? "?")"
        ("\(id) · \(size)" as NSString).draw(at:NSPoint(x:x,y:y+47),withAttributes:attrs)
        let filename = row["filename"] as! String
        (filename as NSString).draw(in:NSRect(x:x,y:y+2,width:480,height:40),withAttributes:attrs)
    }
    NSGraphicsContext.restoreGraphicsState()
    let url = URL(fileURLWithPath: "\(output)/batch-\(String(format:"%02d",batch)).png")
    let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1,nil)!
    CGImageDestinationAddImage(dest,ctx.makeImage()!,nil)
    if !CGImageDestinationFinalize(dest) {fatalError("Sheet output failed")}
}
let json = try JSONSerialization.data(withJSONObject: results,options:[.prettyPrinted,.sortedKeys])
try json.write(to:URL(fileURLWithPath:input))
print("Decoded \(results.count) images; wrote \(batchNumbers.count) contact sheets")
