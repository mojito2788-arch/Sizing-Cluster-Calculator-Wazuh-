import Cocoa
let output = CommandLine.arguments[1]
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(calibratedRed: 0.10, green: 0.28, blue: 0.52, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 32, y: 32, width: 960, height: 960), xRadius: 210, yRadius: 210).fill()
let text: NSString = "S"
let attributes: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 640, weight: .bold), .foregroundColor: NSColor.white]
let size = text.size(withAttributes: attributes)
text.draw(at: NSPoint(x: (1024-size.width)/2, y: (1024-size.height)/2), withAttributes: attributes)
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
