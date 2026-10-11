// Offline rendering of original QuickTime music events. No audio output device is used.
// Called by render-v3-startup-music.py; requires macOS AVFoundation and a DLS bank.
import Foundation
import AVFoundation
let input=try Data(contentsOf:URL(fileURLWithPath:CommandLine.arguments[1]))
let source=try JSONSerialization.jsonObject(with:input) as! [String:Any]
let scale=source["timeScale"] as! Int
let ticks=source["durationTicks"] as! Int
let sampleRate=44100.0
let engine=AVAudioEngine()
let format=AVAudioFormat(standardFormatWithSampleRate:sampleRate,channels:2)!
let parts=source["parts"] as! [String:[String:Any]]
let bank=URL(fileURLWithPath:CommandLine.arguments[3])
struct Event {let frame:Int64;let order:Int;let part:Int;let voice:Int;let kind:String;let a:UInt8;let b:UInt8}
// QT notes have independent durations, even when the same key overlaps.
// Route overlaps to separate sampler layers so an earlier note-off cannot
// prematurely release the later note. Controllers are broadcast to every layer.
var keyEnds:[String:[Int64]]=[:]
var layerCounts:[Int:Int]=[:]
var events:[Event]=[]
for row in source["events"] as! [[Any]] {
 let kind=row[0] as! String,time=row[1] as! Int,part=row[2] as! Int,a=row[3] as! Int,b=row[4] as! Int
 let frame=Int64((Double(time)*sampleRate/Double(scale)).rounded())
 if kind=="note" {
  let duration=row[5] as! Int
  let end=Int64((Double(time+duration)*sampleRate/Double(scale)).rounded())
  let key="\(part):\(a)";var ends=keyEnds[key] ?? []
  let voice=ends.firstIndex(where:{$0<=frame}) ?? ends.count
  if voice==ends.count {ends.append(end)} else {ends[voice]=end}
  keyEnds[key]=ends;layerCounts[part]=max(layerCounts[part] ?? 1,voice+1)
  events.append(Event(frame:frame,order:2,part:part,voice:voice,kind:kind,a:UInt8(a),b:UInt8(b)))
  events.append(Event(frame:end,order:1,part:part,voice:voice,kind:"off",a:UInt8(a),b:0))
 } else {events.append(Event(frame:frame,order:0,part:part,voice:0,kind:kind,a:UInt8(a),b:UInt8(b)))}
}
events.sort { $0.frame==$1.frame ? $0.order<$1.order : $0.frame<$1.frame }
var samplers:[Int:[AVAudioUnitSampler]]=[:]
for key in parts.keys.sorted() {
 let request=parts[key]!
 let part=Int(key)!;var layers:[AVAudioUnitSampler]=[]
 for _ in 0..<(layerCounts[part] ?? 1) {
  let sampler=AVAudioUnitSampler()
  engine.attach(sampler);engine.connect(sampler,to:engine.mainMixerNode,format:format)
  try sampler.loadSoundBankInstrument(at:bank,program:UInt8((request["gmNumber"] as! Int)-1),bankMSB:121,bankLSB:0)
  layers.append(sampler)
 }
 samplers[part]=layers
}
try engine.enableManualRenderingMode(.offline,format:format,maximumFrameCount:1024)
try engine.start()
let outputFormat=AVAudioFormat(commonFormat:.pcmFormatFloat32,sampleRate:sampleRate,channels:2,interleaved:true)!
let output=try AVAudioFile(forWriting:URL(fileURLWithPath:CommandLine.arguments[2]),settings:outputFormat.settings)
let buffer=AVAudioPCMBuffer(pcmFormat:format,frameCapacity:1024)!
let end=Int64((Double(ticks)*sampleRate/Double(scale)).rounded());var index=0;var attempts=0
while engine.manualRenderingSampleTime<end {
 let current=engine.manualRenderingSampleTime
 while index<events.count && events[index].frame<=current {
  let event=events[index],sampler=samplers[event.part]![event.voice]
  if event.kind=="note" {sampler.startNote(event.a,withVelocity:event.b,onChannel:UInt8(event.part))}
  else if event.kind=="off" {sampler.stopNote(event.a,onChannel:UInt8(event.part))}
  else {for layer in samplers[event.part]! {layer.sendController(event.a,withValue:event.b,onChannel:UInt8(event.part))}}
  index+=1
 }
 let boundary=index<events.count ? min(end,events[index].frame):end
 let count=AVAudioFrameCount(min(1024,boundary-current))
 let status=try engine.renderOffline(count,to:buffer)
 if status == .success {try output.write(from:buffer);attempts=0}
 else {attempts+=1;if attempts>100 {fatalError("Offline renderer stalled: \(status)")}}
}
engine.stop()
let report:[String:Any] = ["frames":end,"layers":Dictionary(uniqueKeysWithValues:layerCounts.map {(String($0.key),$0.value)})]
print(String(data:try JSONSerialization.data(withJSONObject:report,options:.sortedKeys),encoding:.utf8)!)
