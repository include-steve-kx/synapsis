# Synapsis
## Product, market, effects, and technical blueprint for iPhone and the web

**Audience:** Founder, product designer, and engineering team building a real-time creative camera instrument
**Research date:** 7 September 2026
**Decision:** Which product architecture, rendering stack, effect system, ML strategy, and interface model should be used for a camera app that runs on iPhone and modern browsers, accepts live cameras and imported media, and supports customizable effect layering?

## Executive answer

Use a **shared framework-free TypeScript interface, delivered directly as the website and packaged for iOS with Capacitor**, while keeping the real-time renderer behind a replaceable adapter:

- **Shared interface:** native Custom Elements and focused DOM modules written in TypeScript, plus one route model, typed store, design-token package, project state, effect manifests, and responsive layout. The website runs the compiled JavaScript directly; the iOS app runs the same built assets inside Capacitor's `WKWebView`. Capacitor packages a web app and gives it native APIs; it does not require React and does not translate JavaScript into Swift ([Capacitor overview](https://capacitorjs.com/docs)).
- **Website renderer:** prefer WebGPU/WGSL when available and use WebGL2 as the compatibility path. Use `getUserMedia()` for live cameras, WebCodecs where its exact codec path works, and `canvas.captureStream()` plus MediaRecorder as the simpler recording fallback.
- **Local-only backend:** for this phase, there is no server application. The “backend” is the on-device media engine: camera/file decode, analyzer cache, flat GPU effect pipeline, recorder/exporter, and local project/asset storage. Live frames never leave the browser or phone.
- **iOS first implementation:** test the same `getUserMedia()` plus WebGPU/WebGL2 renderer inside the Capacitor WebView. WebKit has exposed `getUserMedia()` to suitably configured `WKWebView` apps since iOS 14.3, so this path does not require sending frames to a server or serializing every frame through the Capacitor bridge ([WebKit](https://webkit.org/blog/11353/mediarecorder-api/)).
- **iOS escape hatch:** preserve the same TypeScript interface, but allow the preview rectangle to be backed by a native `AVCaptureSession` plus Metal/Core ML renderer if camera control, sustained performance, depth, or reliable high-resolution recording fails the device benchmark. Only small control messages and project state cross the bridge; pixel buffers stay native.
- **Shared creative contract:** versioned project JSON, effect definitions, normalized controls, preset files, deterministic seeds, capability labels, and golden reference images. The visual result should be close across backends, while genuinely unavailable features degrade explicitly.
- **Cross-platform lesson:** products such as Polycam, Scaniverse, Luma, Matterport, KIRI Engine, RealityScan, Canva, and 8th Wall do not demonstrate that one executable or one renderer is necessary for consistency. They demonstrate a stronger pattern: preserve the product vocabulary and a canonical project/asset contract, then specialize capture, processing, and rendering for each platform. “Same product” is a semantic and visual promise, not a claim that every device runs identical code.

Capacitor remains the recommended application shell because exact interface reuse is a priority and Android is not a first-year requirement. **React is not required.** For this camera-first interface, framework-free TypeScript reduces runtime and dependency surface while remaining manageable if the codebase enforces typed state, lifecycle-safe components, feature modules, and automated UI tests. It is not a requirement that the live renderer also remain pure JavaScript forever. Separating UI reuse from renderer reuse gives the project a low-friction starting point without blocking a native accelerator later.

The previous statement about video applied only to Capacitor's official Camera plugin on the web. The current plugin can open the native camera to record on iOS, but its `recordVideo()` method is explicitly unavailable on Web, and the plugin still returns completed media rather than exposing a continuous processed-frame stream ([Capacitor Camera API](https://capacitorjs.com/docs/apis/camera)). The website does not need that plugin: it records the processed canvas with browser APIs. For live effects inside the iOS WebView, use web camera APIs directly or a native renderer view; do not call the Camera plugin once per frame.

The product opportunity is not “more filters.” It is a **live visual instrument** in which depth, edges, optical flow, touch, device motion, audio, and time can drive any effect parameter. Start with a friendly ordered rack, not a full node editor. Give every effect strong defaults, four performance macros, deeper controls on demand, masks and blend modes, and a reproducible preset/project format.

## Scope, assumptions, and evidence boundaries

The market scan is representative rather than literally exhaustive. App Store inventory changes continuously, regional listings differ, and many small camera utilities have little or no public documentation. Sixteen products were selected to cover depth/point-cloud art, modular visual synthesis, glitch cameras, print simulation, ASCII, slit scan, particles, and broad creative editors. A second precedent study examines eight cross-platform 2D/3D systems: Polycam, Scaniverse, Luma 3D Capture, Matterport, KIRI Engine, RealityScan, Canva, and 8th Wall.

Competitor code, binaries, and private technical documentation were not available. A public description such as “real-time,” “GPU,” “AI,” or “depth-aware” does not identify an API, language, or neural network. The report marks a stack or model as known only when a first-party source states it. File size, visual similarity, and synchronized content are not treated as proof of native, hybrid, or shared-code implementation. Effects and controls proposed later in this report are product and engineering recommendations, not claims about competitor internals.

The target is iOS/iPadOS 18+ and evergreen browsers as of the research date, with capability checks rather than device-name checks. WebGPU is present in current Chrome and Safari 26, but MDN still classifies it as limited availability. Because Safari/WebKit first shipped WebGPU in Safari 26, an iOS 18+ support policy necessarily includes WebViews that must use WebGL2. The app therefore needs runtime feature detection, honest capability labels, and graceful substitutes rather than one universal effect list ([WebKit Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)).

## Recommendation at a glance

| Decision area | Recommendation | Why | Main caveat |
|---|---|---|---|
| Product shape | A camera instrument with Capture, Import, and Patch modes | Unifies live play, postprocessing, and reusable looks | Needs careful progressive disclosure |
| Shared app shell | Framework-free TypeScript + native Custom Elements/DOM; Capacitor packages the same app for iOS | Same interface with a smaller dependency/runtime surface and direct platform control | Requires explicit component lifecycle and state conventions |
| Common render path | WebGPU/WGSL when available; WebGL2 compatibility tier | WebGPU unlocks compute-heavy effects; WebGL2 preserves reach | Some effects need simpler fallbacks on WebGL2 |
| iOS live capture, first spike | `getUserMedia()` inside the configured Capacitor `WKWebView` | Reuses the web camera/render loop without a per-frame native bridge | Browser-class lens access, thermals, and export reliability must be measured |
| iOS native accelerator | Optional native `AVFoundation -> CVMetalTextureCache -> Metal/Core ML` view behind the same TypeScript controls | Keeps exact UI while adding native camera, depth, compute, and recording capabilities | Adds a second renderer for enhanced effects |
| Web capture | `getUserMedia()` + `enumerateDevices()` | Standard live camera access and device selection in secure contexts ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN devices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices)) | Browsers decide which physical cameras and controls are exposed |
| Web video | WebCodecs where supported; MediaRecorder fallback | Frame-level processing and encoder control, with a simpler recording fallback ([W3C WebCodecs](https://www.w3.org/TR/webcodecs/)) | Codec/container combinations must be feature-tested |
| Depth ML | Depth Anything V2 Small F16/P6 in Core ML; run asynchronously at a lower cadence | Apple publishes 49.8 MB and 19 MB Core ML variants; the F16 card reports roughly 31-34 ms inference on tested iPhones ([Apple model gallery](https://developer.apple.com/machine-learning/models/), [Apple model card](https://huggingface.co/apple/coreml-depth-anything-v2-small)) | One inference already consumes about a 30 fps frame budget; do not run it synchronously on every render frame |
| Depth input hierarchy | LiDAR/compatible hardware depth when present; monocular ML everywhere else; depth-off fallback always available | No supported experience depends on owning a LiDAR phone | Sensor and ML depth differ in scale, latency, and edge quality |
| Cross-platform parity | Same UI, project semantics, controls, and presets; capability-labelled render variants | Matches the user's parity goal without pretending hardware is identical | Golden-image tolerances must allow small backend differences |
| Consistency contract | Share design tokens, TS UI components, project/effect schema, asset manifest, control semantics, migration rules, and conformance tests | Mirrors the strongest cross-platform 2D/3D products more closely than “one codebase” | Requires explicit ownership and versioning |
| Capacitor | **Recommended shared shell**, with a replaceable renderer boundary | One UI and route implementation for browser and iOS | Do not make per-frame pixel data a plugin payload |
| Server backend | None for the current product phase | Creation, analysis, projects, presets, and exports remain private and local | Sharing, sync, accounts, and collaborative galleries are explicitly out of scope |
| Development loop | Vite + framework-free TypeScript; separate `tsc --noEmit --watch` | Near-instant module updates without placing type checking on the browser hot path | Browsers execute JavaScript, so TypeScript still needs a fast transform |
| Visual system | Minimal monochrome instrument UI with one cool accent; amber/red only for state and safety | Unifies schematic, retro-computer, and restrained cinematic-future references | Avoid decorative sci-fi noise that competes with the image |

## Market landscape

### What the strongest products teach

The products divide into four useful archetypes.

1. **Focused instruments:** Signal Loss turns one photograph into a navigable depth-derived point cloud; Real Halftone 2 models one printing process; slit-scan apps turn time into their primary material. These products explain their metaphor clearly and give controls that belong to that metaphor.
2. **Deep laboratories:** Mono Lab and One Lab offer large effect libraries, non-destructive or flatten-and-continue workflows, favorites, randomization, and effect-specific control sets.
3. **Performance synthesizers:** Chromatose, Polagone, and VOSC use modulation, MIDI/audio, patches, generators, and macro controls. They reward live play as much as export.
4. **Immediate social cameras:** EFEKT, Hyperspektiv, Glitche, Glitch Art Studio, and Rarevision VHS emphasize point-and-shoot feedback, direct gestures, strong presets, and fast sharing.

The winning combination for this project is focused-instrument clarity at first launch, laboratory depth after exploration, and synthesizer-style modulation for advanced users.

### Interface patterns worth borrowing

- **Show the image, then the instrument.** The live view should occupy most of the screen. Controls live in a rack below it or on a collapsible edge rail.
- **Effect-specific controls beat a universal wall of sliders.** Mono Lab documents that each filter exposes only relevant dials; this keeps a large library approachable.
- **Quick looks before deep tuning.** One Lab’s variants and random mode address blank-canvas anxiety. Use 6-10 thumbnail mutations generated from deterministic seeds.
- **Separate design and performance.** Chromatose’s two-view model is ideal: Design exposes the rack and mappings; Perform exposes four to eight large macros, capture, freeze, and randomize.
- **Map gestures to physical metaphors.** Shake to damage tape, drag to stir particles, hold to accumulate pressure, tilt to redirect gravity, and scrub across a visible scan line.
- **Make preview/export agreement a product requirement.** Mono Lab’s own support material explains that pixel-scaled patterns can look finer at full-resolution export. Store units as normalized, point, or pixel-locked values and let the user choose “match preview” or “maximize detail.”
- **A preset must be inspectable.** Signal Loss exposes what a preset contains. A preset card should list its effect nodes, analyzers, masks, and mapped macros, not remain a mysterious flat thumbnail.

### Representative competitor matrix

| Product | Publicly described effects/workflow | Interface lesson | Public stack / ML evidence | Opportunity left open |
|---|---|---|---|---|
| [Signal Loss](https://www.signalloss.app/) | Single-image depth -> dense point cloud, camera moves, spatial lenses, dozens of live filters, project/preset JSON, still/video/PLY/spatial export | Compose first, disrupt second; camera motion is a creative parameter | First party says on-device depth estimation and live GPU rendering; exact GPU API and model are not disclosed. App Store also describes LiDAR capture on Pro devices ([listing](https://apps.apple.com/us/app/signal-loss/id6775065853)) | Live camera input, general 2D layering, and cross-web parity |
| [Mono Lab](https://apps.apple.com/us/app/mono-lab/id6759029184) | 158 monochrome filters, print, ASCII, dithers, vector output, distortions, surfaces, touch/motion filters, flatten-to-stack | Only show controls that matter; favorites/index; clean capture mode; tactile tools with meaningful verbs | Stack and models undisclosed. “Depth-aware” and subject tools are product behavior, not proof of a specific model. Detailed controls are documented in the [official help](https://monolab.app/help) | Color, live camera as the primary source, and a truly non-destructive rack |
| [DotPress](https://apps.apple.com/us/app/dotpress/id6760323750) | Halftone, threshold, outline, dither, noise, scanlines, ASCII, geometric distortion, metadata | Open -> choose tool -> adjust -> export; customizable favorites toolbar | First party says on-device; implementation and ML are undisclosed | Live video, deep layering, temporal and spatial effects |
| [CMSHT](https://apps.apple.com/us/app/cmsht/id6754469747) | Photo-based design compositions; version 2 added multiple effects | Minimal positioning can be attractive when the app is visually self-explanatory | No public stack or ML evidence | Public documentation, deeper controls, live capture, export clarity |
| [One Lab](https://apps.apple.com/us/app/one-lab-artful-photo-editor/id6741912891) | Large customizable library, effect tree, non-destructive edits, quick looks, random mode, custom chains, keyframes, procedural and 3D tools | Effect tree + quick variants + random discovery scales a large library | Stack and ML undisclosed | A simpler capture-first performance surface and clearer import/export reliability |
| [Chromatose](https://apps.apple.com/us/app/chromatose-visual-synthesizer/id6578449692) | Four generators, unlimited effects/modulation, LFOs, feedback, audio/MIDI, macros, HDR/SDR, patches, external display | Separate Design and Performance views; map many parameters to a few named macros | First party explicitly states a native iOS, Metal-powered engine; no embedded ML claim | Camera-specific shooting ergonomics and still-photo craft |
| [Polagone](https://apps.apple.com/us/app/polagone-visual-synthesizer/id6755683557) | Parametric grids/shapes, generative motion, audio/MIDI, vector/image/video/ProRes export | “Build systems” and preserve them as projects; rich export creates professional value | Stack and ML undisclosed | Live camera manipulation and camera-derived analyzers |
| [EFEKT](https://apps.apple.com/us/app/efekt-video-effects-filters/id1367644508) | 50+ live effects, effect-specific parameters, audio reaction, human/background mode, shape/text/drawing masks, combination | Touch and audio can be first-class inputs; masks should be playful, not only technical | “Human mode” is public behavior; the segmentation implementation/model is undisclosed | Deep project persistence, explicit ordering, pro export, and transparent technical controls |
| [Hyperspektiv](https://apps.apple.com/us/app/hyperspektiv-photo-video-ar/id1058051662) | Live psychedelic/glitch lenses, imports, custom filters, mirroring, AR | Finger movement alters the current lens in real time; the feel of play matters, as Apple’s [developer story](https://apps.apple.com/us/iphone/story/id1334929542) emphasizes | Stack and ML undisclosed | Layer visibility, reproducible parameter systems, and broad export control |
| [Glitche](https://apps.apple.com/us/app/glitch%C3%A9-photo-video-editor/id634467171) | 40+ real-time digital/analog/datamosh effects plus AI-labelled tools | Strong cultural identity and recognizable presets drive adoption | No public implementation/model details for the AI tools | More transparent stack building, parameter modulation, and offline-first privacy story |
| [Glitch Art Studio](https://apps.apple.com/us/app/glitch-art-studio-cam-effects/id1434795782) | Pixel sort, slit scan, dither, ASCII, datamosh, CRT, masks, adjustments, blend modes, camera/photo/video | Broad coverage proves demand for these exact staples | Stack and ML undisclosed | A coherent instrument metaphor and deeper interaction between effects |
| [Rarevision VHS](https://apps.apple.com/us/app/rarevision-vhs-retro-cam/id679454835) | VHS image/audio simulation, timestamp/title, live/imported video, touch or shake glitches | Sensor gestures become memorable when tied to a familiar physical failure mode | Stack and ML undisclosed | Layerable abstract effects and modern spatial/particle tools |
| [Real Halftone 2](https://apps.apple.com/us/app/real-halftone-2/id1632423711) | CMYK screen angles, dot shapes, ruling, gray-component replacement, dot-gain compensation, moire | Domain-correct vocabulary earns specialist trust | Release notes say it no longer depends on UIKit; that suggests a newer UI implementation but does not prove the whole stack. No ML claim | Live video and combination with temporal/interactive effects |
| [ASCII Camera](https://apps.apple.com/us/app/ascii-camera/id6748850196) | Real-time ASCII photo/video, multiple scripts, calibrated glyph coverage, color, camera controls | Character sets are content; preserve actual text as an export when possible | First party explicitly describes pixel buffer -> Metal texture -> grayscale -> character mapping -> output. No ML claim | Layered ASCII, masks, modulation, and web parity |
| [STRATUM](https://apps.apple.com/us/app/stratum-slit-scan/id1525313915) / [Slit Scan Camera](https://apps.apple.com/us/app/slit-scan-camera/id1625934084) | High-speed slit scan, scan patterns/directions/shapes, focus/exposure, multi-lens selection | A visible scan line and temporal direction make an unfamiliar algorithm learnable | Stack and ML undisclosed | Combining temporal storage with depth, edges, particles, and touch |
| [VOSC](https://apps.apple.com/us/app/vosc-visual-particle-synth/id592599278) | Particle oscillators, differential motion, blend modes, modulation, patches | Parameters can produce long-lived exploration when their relationships are legible | Public notes say version 2 used a new graphics engine; API undisclosed; no ML claim | Camera-derived particles and direct field interaction |

## Cross-platform 2D/3D precedents

### Direct answer: they preserve one product, not one executable

The named products do **not** maintain identical functionality on iOS, Android, and the web. Polycam is the clearest counterexample: Space, Floorplan, AI Capture, and 360 capture are iOS-only; Object Mode exists on all three platforms, but Android supports photogrammetry rather than Gaussian-splat capture; Scenes are available on iOS and web, not Android ([capture-mode matrix](https://learn.poly.cam/hc/en-us/articles/48565771018772-Which-Capture-Mode-Should-I-Use), [device support](https://learn.poly.cam/hc/en-us/articles/34419168797972-Which-Devices-Are-Supported-by-Polycam), [Scenes](https://learn.poly.cam/hc/en-us/articles/35174492720404-How-to-Create-a-Scene)). Scaniverse uses mobile for capture while its web product emphasizes upload, processing, organization, inspection, and collaboration. RealityScan offers closely related iOS and Android workflows but deliberately downloads OBJ on iOS and GLB on Android ([RealityScan 1.5](https://dev.epicgames.com/documentation/realityscan-mobile/realityscan-1-5-version?lang=en-US)).

What feels consistent is the **identity and grammar of the product**:

1. the same account, library, project names, thumbnails, statuses, and share links;
2. the same high-level workflow: capture or upload -> process -> inspect/edit -> export/share;
3. the same scene or project object, even when its derived files differ;
4. the same control vocabulary and visual design, reflowed for screen size and input method;
5. explicit platform or hardware gates at the point where a feature becomes unavailable;
6. renderers optimized for their environment rather than a promise of bit-identical output.

Cloud processing is a major equalizer for reconstruction products, but it is not the only answer. Scaniverse historically processed its classic scan modes on-device and now also offers cloud-generated meshes, splats, and VPS assets; KIRI Engine uses cloud photogrammetry and cloud 3D Gaussian Splatting while exposing a local Apple Object Capture path on supported iPhones. Canva provides an especially relevant hybrid precedent: its published architecture combines a web-oriented editor and Cordova mobile shell with native overlays for latency-sensitive pen input, while a Rust design renderer can compile to WebAssembly ([drawing architecture](https://www.canva.dev/blog/engineering/behind-the-draw/), [renderer](https://www.canva.dev/blog/engineering/picking-color-via-eyedropper-on-web-app/)).

[[DIAGRAM_CROSS_PLATFORM]]

### What the products actually do

| Product | Platform reality | Documented processing and asset strategy | Public stack / ML evidence | Lesson for Creative Camera |
|---|---|---|---|---|
| [Polycam](https://poly.cam/get-the-app) | iOS, Android, and web, with an explicit capability matrix rather than exact parity | LiDAR/Space/Floorplan captures can process locally; Object, 360, and splat workflows use cloud processing; finished captures synchronize across mobile and desktop. Photogrammetry output has optimized, medium, full, and raw quality targets ([network/processing](https://learn.poly.cam/hc/en-us/articles/30549172696084-Do-I-Need-Wi-Fi-LTE-to-Process-My-Captures), [processing types](https://learn.poly.cam/hc/en-us/articles/30299027821716-What-Are-the-Different-Photogrammetry-Processing-Types)) | Product renderer and mobile UI stacks are undisclosed. Polycam's public raw-data tooling documents images, camera poses, depth maps, and glTF artifacts, but does not prove the production-app architecture ([Polyform](https://github.com/PolyCam/polyform)) | Treat parity as shared project semantics plus capability labels; generate device-appropriate representations rather than forcing one quality tier |
| [Scaniverse](https://nianticspatial.com/docs/scaniverse/) | iOS/Android capture; web manages sites, scans, processing, assets, and inspection. These surfaces have complementary roles | Classic scans can reconstruct on-device; the newer platform uploads mobile/360 captures and generates meshes, Gaussian splats, and VPS maps in the cloud. SPZ is the portable splat asset | Niantic publishes SPZ as C++ with TypeScript/WebAssembly bindings; it reports roughly 10x size reduction versus PLY. Its wider spatial SDK targets Unity, Swift, Android, and ROS 2 ([SPZ](https://github.com/nianticlabs/spz), [platform launch](https://www.nianticspatial.com/blog/scaniverse)) | A compact canonical format and versioned metadata can connect independently optimized native, web, and downstream renderers |
| [Luma 3D Capture](https://lumalabs.ai/interactive-scenes) | Interactive scenes are promoted for iOS, Android, and web; creation is mobile-oriented and sharing/viewing is universal | Captures become small streamable interactive objects/scenes; Luma advertised about 8 MB for objects, 20 MB for scenes, and 30 fps web viewing. This is asset portability, not proof of one client implementation | The archived first-party web library is TypeScript/JavaScript, WebGL-only, integrates with Three.js/React Three Fiber, and exposes GLSL shader hooks. The mobile renderer and reconstruction stack remain undisclosed ([web examples](https://github.com/lumalabs/luma-web-examples)) | Separate capture/training from a compact runtime representation; expose controlled shader hooks rather than the reconstruction internals |
| [Matterport](https://matterport.com/compatible-mobile-devices) | iOS and Android capture; cloud and browser surfaces edit, manage, view, and distribute digital twins; mobile also supports downstream work | Capture data uploads to Matterport Cloud for processing. Digital twins stream on demand as the viewer moves, allowing large models on mobile and web ([cloud upload](https://matterport.com/matterport-academy/using-360-cameras/upload-to-the-cloud-360-cameras), [platform](https://matterport.com/news/matterport-reinvents-digital-twin-revolutionary-pro3-camera-and-new-cloud-platform)) | Web SDKs are JavaScript/TypeScript-facing; the Web Component depends on Three.js and encapsulates the viewer. Cortex is the named AI engine, but model internals and mobile stack are private ([developer SDK](https://matterport.github.io/developer-docs/), [Web Component](https://matterport.github.io/developer-docs/webcomponent/)) | Stream and cache derived assets; keep the project ID and interaction model stable while device render budgets vary |
| [KIRI Engine](https://www.kiriengine.app/faq/what-is-kiri-engine) | iOS, Android, and web expose photogrammetry, neural reconstruction, and Gaussian-splat workflows; LiDAR/Object Capture remain hardware-specific | Video or image sets upload for cloud photogrammetry/3DGS, then can be viewed, cropped, converted, and exported on phone or browser. Supported Apple devices can use a local Object Capture route ([3DGS guide](https://www.kiriengine.app/blog/3d-gaussian-splatting-a-technical-guide-to-real-time-neural-rendering), [Object Capture](https://www.kiriengine.app/blog/announcement/kiri-engine-real-time-photogrammetry-ios-17-api)) | First party identifies cloud photogrammetry, neural surface reconstruction using an MLP, and a differentiable 3DGS pipeline; client frameworks/render APIs are undisclosed | Use a common workflow with optional hardware fast paths; cloud can equalize heavy post-processing without belonging in the live-frame loop |
| [RealityScan](https://dev.epicgames.com/documentation/realityscan-mobile/RealityScan-Step-by-Step-Guide) | iOS and Android are the creation clients; Sketchfab/browser is principally the distribution surface, not the same editor | Images upload while capture continues; alignment/analysis produces a point-cloud preview; the project is processed remotely and downloaded locally. Cropping moved on-device in version 1.5 | Epic documents AR guidance, automatic object masking, local JSON/project files, and platform-specific OBJ/GLB outputs; implementation and ML model details are undisclosed | Do not confuse a web viewer with full web parity. Shared workflow can coexist with platform-specific file formats and local optimizations |
| [Canva](https://www.canva.com/newsroom/news/introducing-canva-video-suite/) | Web, desktop, iOS, Android, and mobile web share a recognizable editor, with responsive rather than identical layouts | A canonical design model supports editing and autosave across clients; web technologies handle much of the design surface, with specialized export/rasterization and native mobile help where latency demands it | Published engineering posts identify TypeScript/React on web, Swift/Kotlin in mobile work, Cordova-based mobile apps in the 2024 drawing implementation, WebGL filters, a native touch overlay, and a Rust renderer compiled to WASM. These disclosures span years and may not describe every current screen ([languages](https://www.canva.dev/blog/engineering/why-well-always-be-exploring-new-programming-languages-at-canva/), [drawing](https://www.canva.dev/blog/engineering/behind-the-draw/), [WebGL filters](https://www.canva.dev/blog/engineering/alpha-blending-and-webgl/)) | This is the closest public precedent for the proposed Capacitor strategy: share the web-shaped UI, then add narrow native components for input or rendering hot paths |
| [8th Wall / Niantic WebAR](https://info.nianticspatial.com/blog/building-the-next-generation-of-slam-for-the-browser) | An engine/tooling precedent rather than one consumer editor; algorithms run in browsers, native apps, and desktop research tools | Each frontend acquires camera/sensor data; portable backend views own analysis and rendering; the web frontend uses React while browser execution uses WebGL, WebRTC, DeviceMotion, and WebAssembly | First party describes shared C++ visualization modules and a custom C++ Object8 renderer used across desktop, native mobile, and web, with different thread models per frontend | If renderer duplication becomes too expensive, move selected kernels/scene logic into a portable C++ or Rust core compiled to native and WASM—after the simpler architecture proves the need |

### The consistency contract to copy

The precedents suggest eight concrete layers of consistency. For this product phase, every layer below is implemented locally; cloud processing, accounts, sync, and publishing are not part of the architecture.

| Contract layer | Same everywhere | Allowed to vary | MVP implementation |
|---|---|---|---|
| Visual language | typography, color, spacing, iconography, effect thumbnails, gesture names | density, panel position, hover/keyboard affordances | Shared native TS components and CSS-token package |
| Product semantics | Capture, Import, Patch, Design, Perform; parameter names/ranges; reset and randomize behavior | whether a control is a bottom sheet, side panel, or shortcut | Shared route/state machine and effect manifests |
| Project stack | node IDs, linear ordering, modulators, seeds, and fallback policy | backend-specific compiled shaders/pipelines | Versioned local JSON and deterministic preset tests |
| Capability policy | reason codes, labels, substitute/bypass/offline behavior | available cameras, GPU backend, ML provider, maximum resolution | Runtime capability report consumed by the same UI |
| Visual conformance | reference scenes, target intent, acceptable tolerance | small sampling, precision, color-management, and ML differences | Golden images plus perceptual and region-based diff thresholds |
| Canonical asset | stable source media and analysis metadata | cached texture formats, proxy sizes, mesh/splat representation | Local asset manifest first; content-addressed cache |
| Local processing jobs | job schema, status model, provenance, output manifest | browser worker or device-native execution | Local worker/native queue only; no remote adapter |
| Local exchange | backwards-compatible project and preset identity | browser download/import versus iOS share sheet/files | Portable files; no public publishing or sync |

This updates the architecture in a precise way: **reuse policy should be contract-first, not code-first**. Share code wherever it is natural—especially the framework-free TypeScript interface, state, manifests, and WebGPU/WebGL renderer—but do not sacrifice camera access, sustained frame rate, or reliable recording merely to preserve a code-reuse metric. If a Metal backend becomes necessary, it implements the same effect contract and is judged by the same reference scenes.

[[PAGEBREAK]]

### What not to copy

- Do not use cloud reconstruction as a solution for live camera effects. It works for Polycam/KIRI/Matterport because the user accepts a capture-then-process job; a touch-driven live instrument needs the render loop on the device.
- Do not hide asymmetry. Polycam's documented feature matrix is healthier than silently showing a control that behaves differently or fails on one platform.
- Do not make the canonical project equal to one backend's compiled shader state or one platform's media container. RealityScan's OBJ/GLB split illustrates why the project object and its deliverables must be separate.
- Do not adopt a portable C++/Rust engine before profiling proves two renderer implementations are the larger cost. 8th Wall's approach is powerful, but it carries toolchain, FFI, texture-interoperability, debugging, and bundle-size complexity.

## Product concept and information architecture

### Three top-level modes

| Mode | Purpose | Primary surface | Key actions |
|---|---|---|---|
| Capture | Play live and record exactly what is visible | Full-screen viewfinder + compact effect rack | choose camera/lens, focus/exposure/zoom, add effect, perform, photo, record |
| Import | Apply the same engine to a photo or video | Canvas + timeline for video | import, trim, stack, keyframe, render still/video |
| Patch | Build, save, remix, and share looks without media | Effect rack + test scene/thumbnail grid | add/reorder/mask, map macros, save versioned preset/project JSON |

The same `Project` model backs all three modes. Switching source must not destroy the rack. The app should open into Capture, with a prominent import affordance and the last used preset restored only if the user opts in.

### One interface, responsive composition

Use the same native TypeScript UI components, labels, icons, design tokens, shortcuts, project state, and accessibility semantics on iOS and web. “Same UI” should mean that a control has the same name, meaning, range, reset gesture, and visual identity everywhere. It should not mean squeezing a three-column desktop workspace onto a narrow phone.

- **Phone portrait:** canvas dominates; tools open as bottom sheets; the rack is a horizontal strip; only one deep panel is open at a time.
- **Phone landscape:** canvas remains central; the active control or Performance pad becomes a compact side rail.
- **Tablet:** canvas plus one persistent inspector; library and effect browser use split views.
- **Laptop/desktop:** left navigation/project rail, central canvas, right rack/inspector, and an optional bottom timeline. Keyboard shortcuts and drag/drop are additive, never required.

[[DIAGRAM_RESPONSIVE_UI]]

### Keeping vanilla TypeScript clean and manageable

This application does not need a UI framework to be well structured. Its visible interface is a finite set of camera controls, sheets, rack cards, inspectors, timelines, and library views surrounding a GPU-owned canvas. The canvas changes every frame; the DOM should update only when application state changes.

Use these rules from the first commit:

- **Native components:** implement reusable controls as Custom Elements such as `<cc-effect-rack>`, `<cc-param-slider>`, and `<cc-bottom-sheet>`. Give each component typed inputs, explicit `connect()`/`disconnect()` behavior, and no direct access to global project state.
- **One typed store:** actions enter a reducer; selectors expose read-only slices; components subscribe only to the slice they render. Use `EventTarget` or a tiny typed publish/subscribe utility. Keep camera frames and GPU resources out of the store.
- **Feature modules:** organize by Capture, Import, Patch, Projects, and Presets rather than by generic “components,” with shared primitives in `ui/` and platform/media/render adapters outside features.
- **Targeted DOM updates:** create persistent elements once, update attributes/text/styles deliberately, and never rebuild the control tree on every animation frame. The render loop owns the canvas; UI events only write parameter snapshots.
- **CSS tokens and responsive layout:** define colors, spacing, typography, radii, safe-area insets, and breakpoints as CSS custom properties. Use light DOM for ordinary layout and Shadow DOM only where style encapsulation materially helps.
- **Lifecycle and cleanup:** every subscription, media listener, pointer capture, observer, and timer must be disposed when its view disconnects. An `AbortController` per screen/component is a simple cleanup primitive.
- **Small tooling, not no tooling:** use TypeScript strict mode, Vite for builds, ESLint/Prettier, Vitest for state and manifests, and Playwright for complete browser flows and responsive snapshots. None is a runtime UI framework.

```text
src/
  app/          bootstrap, router, typed store, commands
  features/     capture, import, patch, projects, presets
  ui/           custom elements, design tokens, focus/sheet utilities
  media/        camera, photo/video decode, recording, export
  render/       adapter contract, WebGPU, WebGL2, native bridge
  analysis/     depth, flow, blobs, jump-flood distance fields
  effects/      manifests, flat stack evaluator, shaders
  platform/     web capabilities, Capacitor/iOS services
  tests/        state, project fixtures, visual and end-to-end tests
```

Avoid inventing a miniature general-purpose framework. The store needs only actions, selectors, subscriptions, and batched notifications; components need only construction, binding, rendering, and cleanup. If boilerplate later becomes the main cost, a small standards-based helper can be evaluated then without changing the project/effect/media architecture.

### Fast laptop iteration: almost no waiting, not literally no compile

A browser cannot execute TypeScript directly, so literal “no compile” means writing JavaScript, optionally with JSDoc types. That is not recommended for a versioned effect graph with many parameter schemas. Use **Vite with vanilla TypeScript** instead. During development Vite serves source modules on demand and applies hot-module replacement, so changing a control, shader, or screen does not require a full application bundle or page reload. Vite transpiles `.ts` but deliberately does not type-check it; run `tsc --noEmit --watch` as a parallel correctness process and keep production bundling out of the inner loop ([Vite rationale](https://vite.dev/guide/why.html), [Vite TypeScript behavior](https://vite.dev/guide/features.html#typescript)).

The recommended daily loop is intentionally small:

1. `npm run dev` starts the browser workspace with camera fixtures, file drag/drop, and shader hot reload.
2. A replay source feeds recorded short clips or deterministic test frames through the same graph, making effect work faster and more repeatable than requesting the live camera after every refresh.
3. `npm run typecheck -- --watch` and focused unit tests run beside the dev server, not in front of every visual change.
4. The Capacitor shell consumes the same production assets for periodic iPhone checks. Native Xcode compilation is necessary only when native plugin or Metal code changes—not for ordinary TypeScript UI and web-renderer edits.

Keep WGSL and GLSL as small imported text modules beside each effect. HMR should recreate only the changed pipeline and preserve the rest of the project state when safe. Do not introduce code generation, a monorepo orchestrator, SSR, or a UI framework in the MVP.

### Visual identity: a quiet futuristic instrument

The interface should feel like a real image-making device from a near future: precise, spare, technical, and slightly strange. It borrows **systems thinking** from Pure Data patches and electronic diagrams, **clarity and statefulness** from early Mac/Linux tools, and **atmosphere** from cinematic holographic interfaces. It should not copy a film screen, logo, typeface, or distinctive prop design.

| Layer | Default treatment | Reserved exception |
|---|---|---|
| Palette | near-black `#0B0D0F`, graphite `#111417`, off-white `#E7EAEC`, muted gray `#7D858C`, hairline `#30363B` | ice cyan `#62E7FF` for active/live/focus; amber `#E7B35A` for capability or thermal warning; coral red `#FF4D5A` only for recording, destructive action, or critical failure |
| Type | compact neutral sans for labels; monospace with tabular figures for values, timecode, node IDs, and telemetry | slightly expanded uppercase micro-labels for section headers; never use unreadably tiny “sci-fi” text |
| Geometry | one-pixel rules, square corners or 2-4 px radii, clear alignment, generous negative space around the image | circular record control and small patch-port dots where the physical metaphor earns them |
| Depth | opaque panels by default; translucent overlays only when they must sit over the viewfinder | 8-16% tinted glass and a restrained focus glow; no stacked blur layers |
| Motion | direct state transitions around 120-180 ms; moving signal trace only when it communicates activity | honor Reduce Motion and never animate decoration continuously |

Application of the references by mode:

- **Capture** is almost chrome-free. The image dominates; status is a thin instrument readout; only REC turns red. A subtle cyan reticle shows the active touch target.
- **Design** is the schematic surface. Rack cards resemble modules, analyzers and modulators have small ports, and optional wires show signal flow. Wires appear only while mapping or inspecting, so the editor does not become visual spaghetti.
- **Perform** is a dark control surface with four to eight large monochrome zones. A zone gains cyan intensity only while touched; freeze, warning, and record remain semantically colored.
- **Import/timeline** uses old workstation discipline: crisp tracks, tabular timecode, visible selection, and keyboard focus. Avoid fashionable floating cards and excessive rounding.
- **Library/settings** use dense, legible list/grid windows with strong selected/inactive states. Optional later “skins” may explore dithered retro surfaces, but the MVP has one canonical visual system.

This is a mostly monochrome product, not a cyan product. The accent is scarce enough that it always answers a question: *what is live, selected, mapped, warning, or recording?* Contrast, focus rings, labels, and hit targets must remain accessible without relying on glow or color alone.

### Capture interface

- Top bar: library/back, source badge, resolution/frame-rate, capability/thermal indicator, help.
- Viewfinder: tap focus; vertical exposure scrub; pinch or one-finger zoom only when no effect owns the gesture; a small interaction reticle names which effect or field receives touch.
- Bottom strip: camera/source, add effect, rack, shutter/record, freeze, undo, Design/Perform toggle.
- Rack card: thumbnail, enable, solo, mask, blend, reorder handle, and one large “amount” control.
- Control sheet: four primary controls, then Advanced. Double-tap resets a value; drag away for precision; lock excludes a value from randomization.

### Design and Performance views, in plain language

These are **two actual interfaces for the same open project**, not separate editions of the app.

- **Design is the editor.** Use it to add effects, reorder the stack, change detailed parameters, choose masks, and connect modulators. It is the default in Import and Patch and is available from Capture. New users can ignore modulation entirely; advanced users can map `touch`, `motion`, `audio`, `time/LFO`, `depth`, `edge`, `optical flow`, or `blob position` to any parameter.
- **Perform is the live controller.** It hides the long rack and shows a small number of large, named controls such as Melt, Scatter, Echo, Color Drift, Freeze, or Burst. Each control can move several underlying parameters together. It is useful while filming because large targets are easier to play without looking away from the subject.
- Switching views does **not** change the image. It only changes which controls are visible. Design configures the instrument; Perform plays it. Each preset can auto-generate four sensible macros, so Perform is approachable rather than power-user-only. Creating custom macros is an advanced feature.

### Complete MVP screen and page inventory

| Screen / state | Purpose and main elements | Phone / iOS composition | Web / tablet / desktop composition |
|---|---|---|---|
| Welcome | Brand, three sample looks, “Open camera,” “Import,” privacy promise | Full-screen cards; one primary button | Centered panel over animated demo canvas |
| Permissions | Explain camera, microphone, Photos/files, and motion separately before OS prompts | One permission per step; skip where possible | Inline browser permission guidance and retry state |
| Capture | Live processed viewfinder, source/lens, rack, shutter, record, freeze, undo | Edge-to-edge canvas; bottom controls and sheets | Canvas center; rack right; camera/source left; shortcuts shown |
| Source chooser | Available cameras, front/back, import photo/video, test scene | Bottom sheet with preview thumbnails | Popover or left-panel list; drag/drop zone |
| Effect browser | Search, categories, favorites, compatibility badges, preview thumbnails | Full-height sheet; tap adds to rack | Left drawer/grid; hover preview; drag into rack |
| Design view | Ordered rack, selected effect, controls, masks, modulators | Rack strip plus one control sheet | Persistent right rack and inspector; optional routing overlay |
| Effect detail | Four primary parameters, Advanced, reset/randomize/lock, help | Detented bottom sheet | Right inspector with collapsible sections |
| Mask editor | Choose depth/subject/blob/edge mask, invert, feather, paint/erase | Full-screen canvas with compact mask toolbar | Canvas overlay plus right mask inspector |
| Modulation mapper | Connect source to parameter; scale, bias, polarity, easing, clamp | Guided “source -> target -> range” sheet | Patch-cable overlay or routing table beside inspector |
| Perform view | Four to eight macro pads/XY controls, momentary actions, capture | Full-screen playable controls over dimmed canvas | Large pad bank beside canvas; keyboard/MIDI-ready later |
| Import photo editor | Canvas, crop/orientation, rack, before/after, export | Canvas top; tools/rack in sheets | Canvas center, rack right, file info left |
| Import video editor | Player, trim range, playhead, rack, automation, render | Canvas with compact bottom timeline | Full bottom timeline with tracks and keyframe lanes |
| Project library | Local projects, thumbnails, modified date, duplicate/delete/import JSON | Two-column grid; long-press actions | Resizable grid/list with sorting and drag/drop |
| Preset library | Built-in and local presets, categories, compatibility, favorites | Swipeable cards and search sheet | Grid with live preview and details pane |
| Save preset/project | Name, thumbnail frame, included nodes/macros, compatibility note | Modal sheet | Modal dialog; JSON download/import actions visible |
| Export | Still/video, resolution, frame rate, duration, quality, match-preview/max-detail | Step-by-step sheet with size estimate | Side panel with advanced codec/container details |
| Render progress/result | Progress, cancel, thermal/error status, save/share/open file | Full-screen progress then native share sheet | Job card; download/save; reopen project |
| Settings and capabilities | Camera, performance policy, cache, safety, storage, shortcuts, about | Grouped settings list | Settings page with left categories and diagnostic table |
| Help and safety | Gesture guide, effect glossary, photosensitive safety, licenses, privacy | Searchable in-app guide | Searchable documentation panel; shortcut reference |

The future public gallery is deliberately absent from the MVP navigation. Later it can add Publish, Profile, remote assets, reporting, and moderation without changing the local project format.

### Layering model

Use one ordered, strictly flat stack. Every visible node consumes one image and produces one image; analyzer caches and temporal buffers remain private renderer services rather than visible branches. This keeps the phone interface and saved project structure predictable.

Every node supports:

- enable/bypass, solo, reorder, duplicate, delete, and deterministic randomize;
- opacity, blend mode, mask source, and mask invert/feather;
- resolution policy: full, half, quarter, adaptive, or fixed analysis resolution;
- time policy: stateless, previous frame, N-frame ring, accumulation, or simulation state;
- capability requirements and an explicit degraded fallback;
- versioned migration so old presets preserve their look after shader changes.

## Recommended application structure

[[DIAGRAM_ARCHITECTURE]]

Read the structure as three separable, entirely on-device planes. The **product plane** is the shared framework-free TypeScript interface, route/state machine, design tokens, effect manifests, and local project store. The **media plane** is a replaceable capture/analyzer/render/export adapter; WebGPU, WebGL2, and an optional Metal implementation consume the same semantic graph but may schedule it differently. The **asset plane** stores source media, proxies, thumbnails, cached analysis, and completed exports behind a manifest rather than embedding platform filenames in the project. There is no network service in this architecture.

### The local “backend” architecture

```text
shared TypeScript UI + typed project state
                  |
          RenderBackend contract
        /             |              \
 WebGPU full      WebGL2 core      optional iOS native
 WGSL compute     GLSL fragment    AVFoundation + Metal
 + render         + ping-pong      + Core ML + writer
        \             |              /
         local Media/Analysis/Export services
                  |
      local project + asset repository
   web: IndexedDB/OPFS   iOS: app files/Photos
```

The `RenderBackend` contract owns textures and frames. It accepts source handles, a compiled semantic graph, parameter snapshots, touch/modulation input, and output targets; it returns only status, timings, capability information, and export handles. If the iOS native path is added, camera pixels do not cross the Capacitor bridge. The shared TypeScript UI sends small graph and control messages while the native view renders and records in place.

On the web, use IndexedDB for structured project metadata and an origin-private file system where supported for large local blobs, proxies, analysis caches, and interrupted-export staging. Also support explicit project/preset export to ordinary user-visible files so browser storage eviction cannot destroy the only copy. On iOS, keep working files in the app container, import with the system picker, export through Photos or the share sheet, and store only stable content IDs in project JSON.

### MVP backend versus the performance-tested product

| Phase | Media/render backend | Local persistence | Decision rule |
|---|---|---|---|
| Laptop effect laboratory | WebGPU full renderer first; WebGL2 core renderer alongside it; replay fixtures and browser camera | IndexedDB plus local file import/export; OPFS for larger cache where available | Optimize iteration speed and prove the semantic graph, not every browser at once |
| Capacitor MVP | Same TypeScript UI and web renderer inside `WKWebView`; use WebGPU where the target OS exposes it, otherwise WebGL2 core | Capacitor filesystem/app container plus Photos/files adapters | Ship only effects that pass sustained preview and recording tests on the minimum iPhone |
| Product after device gates | Keep the web path if it meets frame-time, thermal, lens, and export targets; otherwise replace only the iOS media/render rectangle with AVFoundation/Metal/Core ML | Same project schema; platform repositories map IDs to their local files | Native acceleration is triggered by measurements, not by a pre-emptive rewrite |

Do not build WebGPU and WebGL2 versions of all 65 effects immediately. The public MVP can have a **WebGPU Full** catalogue and a **WebGL2 Core** catalogue. Core should cover fragment-friendly effects such as color, edge, pixelation, ordered dither, halftone, ASCII, bloom, echo/feedback, and a reduced slit scan. Full adds compute-centric pixel sort, particles, optical flow, reductions, jump flooding, depth inference support, and experimental seam carving. The UI labels the active tier and explains substitutions.

WebGPU is the preferred engineering center because it supplies compute shaders and storage buffers for algorithms that are unnatural in a fragment-only pipeline. WebGL2 remains the compatibility path because it is broadly available in modern browsers, whereas MDN still marks WebGPU as limited availability. WebKit first shipped WebGPU in Safari 26, so an iOS 18+ product necessarily encounters WebViews without it ([WebKit Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API), [MDN WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)).

Do not choose Three.js, Babylon.js, PixiJS, Unity, or a general scene engine as the primary MVP renderer. This product is a camera-texture compute and compositing graph, not mainly a retained 3D scene graph. A thin internal wrapper around WebGPU/WebGL2 resources, passes, timing, and shader diagnostics is easier to align with native Metal later. A scene library may still be used narrowly for a future mesh-preview tool if profiling and scope justify it.

### Shared project contract

```json
{
  "format": "creative-camera-project",
  "version": 5,
  "visualContract": "2026.09",
  "colorSpace": "display-p3-linear",
  "output": { "dynamicRange": "sdr" },
  "capabilityPolicy": "substitute-or-bypass-with-warning",
  "seed": 184467,
  "source": { "kind": "camera-or-import", "orientation": "metadata" },
  "nodes": [
    {
      "id": "fx.pixelSort",
      "implementationVersion": 2,
      "enabled": true,
      "params": { "axis": "flow", "low": 0.22, "high": 0.78, "length": 0.31 },
      "mask": "analysis.depthNear",
      "blend": "source-over",
      "previewScale": "half",
      "fallback": "fx.directionalSmear"
    }
  ],
  "modulations": [
    { "from": "touch.velocity", "to": "fx.pixelSort.length", "scale": 0.55, "ease": "spring" }
  ],
  "automation": []
}
```

The color-space field refers to the internal working space, not the camera’s encoded transfer function. Convert the incoming camera or file into a documented linear working space before arithmetic effects, and convert once at the output. Effects that intentionally simulate encoded-video errors can explicitly request a nonlinear domain.

Keep an adjacent asset manifest keyed by stable content IDs. It may point to an original photo/video, preview proxy, cached depth/flow, rendered thumbnail, or completed export. The web cache and iOS app container can use different local physical URLs while the project continues to refer to the same logical asset. This avoids coupling preset portability to Photos-library identifiers, blob URLs, or one platform's codec.

### Effect-node contract

Each `EffectSpec` should declare an ID and semantic version; input/output texture formats; shader entry points for Metal and WGSL; parameter types, ranges, defaults, units, and UI hints; required analyzers; temporal state and history length; supported precision; estimated cost tier; fallback behavior; randomization ranges; and reference-output fixtures.

The compiler validates the graph, topologically schedules analysis and render passes, fuses compatible color-only stages when practical, aliases transient textures, and inserts color/size conversions only at boundaries. Apple specifically recommends smaller resources, lower-resolution temporary effects, memoryless targets, and heaps for overlapping transient allocations in memory-intensive Metal apps ([Metal memory guidance](https://developer.apple.com/documentation/metal/reducing-the-memory-footprint-of-metal-apps)).

## Real-time pipeline and performance budget

[[DIAGRAM_PIPELINE]]

At 60 fps there are 16.67 ms for capture handoff, analysis updates, simulation, rendering, compositing, presentation, and any recording copy. At 30 fps there are 33.33 ms. Apple’s published Depth Anything V2 Small F16 measurements are approximately 31.1 ms on iPhone 12 Pro Max and 33.9 ms on iPhone 15 Pro Max at the model card’s test size. That model can be useful, but it cannot sit synchronously in a 60 fps path and leaves essentially no 30 fps budget for the rest of the application ([model card](https://huggingface.co/apple/coreml-depth-anything-v2-small)).

Use independent clocks:

- Capture: device cadence, usually 30 or 60 fps.
- Display/render: 60 fps when affordable; 30 fps quality mode for heavy patches.
- Depth ML: 5-15 Hz, asynchronous, with the latest completed depth map retained.
- Optical flow or segmentation: adaptive 5-30 Hz depending on quality and device.
- Particle/fluid simulation: fixed timestep with capped catch-up; render interpolation.
- Export: offline or real-time depending on user choice; offline may use full resolution and higher analyzer cadence.

Depth stabilization should combine confidence gating, temporal exponential smoothing, edge-aware upsampling, and optionally optical-flow reprojection. When LiDAR/TrueDepth is available, synchronize the depth and video outputs; ARKit and AVFoundation expose supported hardware depth, but support must be queried at runtime ([ARKit point-cloud sample](https://developer.apple.com/documentation/arkit/displaying-a-point-cloud-using-scene-depth), [TrueDepth sample](https://developer.apple.com/documentation/avfoundation/streaming-depth-data-from-the-truedepth-camera)).

The quality governor watches measured GPU time, dropped capture frames, encoder backpressure, free memory, and `ProcessInfo.thermalState`. Apple explicitly advises reducing resource use at higher thermal states ([thermal state](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property)). It changes one dimension at a time: analyzer cadence, expensive-node resolution, particle count, history length, then display cadence. Never silently alter final offline export quality.

### Practical performance tiers

| Tier | Preview target | Typical patch | Adaptation |
|---|---|---|---|
| Light | 1080p 60 fps | 3-6 stateless single-pass effects | fuse passes; full-resolution preview |
| Medium | 1080p 30-60 fps | edge/dither/halftone + short feedback or 100k particles | half-resolution heavy nodes; full-resolution composite |
| Heavy | 720p-1080p 30 fps | depth + optical flow + large particles + feedback; animated seam carving or dense jump-flood fields | ML 5-10 Hz; quarter/half analysis; cap particles/history; incrementally update topology/fields |
| Offline | source/export resolution | any supported graph | deterministic frame stepping; maximum-quality analyzers and tiling |

## iOS and Capacitor implementation

### What “port the web app to iOS” means

Capacitor copies the compiled web application into an iOS project and displays it in `WKWebView`; Swift plugins expose native features to JavaScript. The interface can therefore be the same framework-free TypeScript/HTML/CSS code on the website and in the App Store binary. Capacitor does not impose a frontend framework. The official Camera plugin is a capture/picker API, not the render loop: `takePhoto()` returns a photo, `recordVideo()` opens the native camera and returns completed media on native platforms, and `recordVideo()` is not available on Web ([Camera API](https://capacitorjs.com/docs/apis/camera)).

There are three materially different frame paths:

| Path | Where frames travel | What crosses the Capacitor bridge | Recommendation |
|---|---|---|---|
| Web camera in Capacitor | `getUserMedia -> video texture -> WebGPU/WebGL2 -> canvas`, all inside the WebView | Settings and normal app state only | **First implementation to test**; maximum renderer and UI reuse |
| Native camera copied to JavaScript | `CVPixelBuffer -> encode/copy/serialize -> JS -> canvas` every frame | Large pixel payload every frame | **Do not use**; copies and synchronization create latency and memory pressure |
| Native camera and renderer view | `AVCapture -> CVMetalTexture -> Metal/Core ML -> native preview/encoder` | Small parameter snapshots, gestures, status, and file URLs | **Escape hatch/enhanced tier** when measurements justify it |

“No live frame processing” therefore does **not** mean Capacitor itself makes real-time effects impossible, and it does not imply cloud processing. It means the official Camera plugin does not hand JavaScript each live frame. A WebView can acquire and process a live stream with browser APIs, or a custom native view can own the complete frame path. Capacitor explicitly supports local Swift plugins and a custom `CAPBridgeViewController` for native integration ([custom native code](https://capacitorjs.com/docs/ios/custom-code), [custom view controller](https://capacitorjs.com/docs/ios/viewcontroller)).

### WebView-first capture and renderer

Use the same camera, effect graph, and recording code as the website. Configure camera and microphone purpose strings and the `WKUIDelegate` media-capture permission flow. WebKit documents `getUserMedia()` in `WKWebView`, and Apple exposes capture-state and permission delegate APIs for embedded web content ([WebKit](https://webkit.org/blog/11353/mediarecorder-api/), [Apple](https://developer.apple.com/documentation/webkit/wkuidelegate/webview%28_%3Arequestmediacapturepermissionfor%3Ainitiatedbyframe%3Atype%3Adecisionhandler%3A%29)).

This route must still prove: front/rear switching and which lenses are visible; focus/zoom/torch support; device rotation and interruption recovery; processed-canvas recording with synchronized audio; ten- and thirty-minute thermals; memory after repeated imports; and frame pacing while depth or flow analyzers run. If it meets the acceptance gates, no native renderer is needed for the MVP.

### Native accelerator: capture and camera control

Use `AVCaptureVideoDataOutput` to receive frames for processing. Apple warns that BGRA is not a native capture format and consumes considerably more memory, so request a camera-native bi-planar YUV format and sample its planes in Metal where possible ([AVCaptureVideoDataOutput](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput?changes=__4)). `CVMetalTextureCache` exposes Core Video image buffers as Metal textures and is the central low-copy bridge.

Enumerate physical and virtual `AVCaptureDevice` instances, formats, frame-rate ranges, stabilization, HDR, torch, focus, exposure, zoom, and depth capability. Use a single `AVCaptureSession` when one camera is active. `AVCaptureMultiCamSession` supports simultaneous inputs on capable devices and reports hardware/system pressure cost; include multi-camera only after the single-camera engine is stable ([Apple MultiCam](https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession?changes=l_1__8)).

Camera setup and `startRunning()` belong on a session queue, not the main thread. Drop late video frames rather than building latency. Keep orientation and mirroring as metadata/transforms until the renderer; physical buffer rotation wastes bandwidth.

### Native accelerator: renderer

The TypeScript UI continues to own navigation, sheets, accessibility, project state, and all visible controls. A Capacitor `CAPBridgeViewController` subclass hosts an `MTKView` or custom CAMetalLayer-backed preview in the native view hierarchy. The render thread reads an immutable parameter snapshot; JavaScript never performs per-pixel work in this mode. Touch coordinates and control changes cross as small events, while frames remain native.

Use Metal fragment passes for simple resampling/color operations and compute passes for prefix scans, sorting, particle updates, optical-flow advection, and temporal buffers. `MetalPerformanceShaders` can supply optimized primitives where appropriate, while custom Metal offers the control needed for unusual kernels ([Metal Performance Shaders](https://developer.apple.com/documentation/metalperformanceshaders?changes=l__1), [Metal](https://developer.apple.com/documentation/metal?changes=la)). Core Image can accelerate a first prototype and can chain/customize kernels, but a graph dominated by sorting, particles, variable history, and custom simulation will eventually need explicit Metal resource scheduling ([Core Image](https://developer.apple.com/documentation/coreimage?changes=__11%2C__11%2C__11%2C__11)).

### ML and analysis

Use Core ML with `MLComputeUnits.all` initially so the operating system can choose CPU, GPU, or Neural Engine. Profile `cpuAndNeuralEngine` when the Metal renderer is GPU-bound ([ML compute units](https://developer.apple.com/documentation/coreml/mlcomputeunits?changes=_9)).

Depth source priority:

1. synchronized LiDAR scene depth for supported rear-camera AR sessions;
2. compatible AVFoundation depth for TrueDepth or supported capture configurations;
3. embedded monocular model for other cameras and imports;
4. a procedural luminance/edge proxy when depth is disabled or unsupported.

LiDAR is an enhancement, not a requirement. Apple’s ARKit scene-depth sample explicitly checks for LiDAR support, while `AVCaptureDepthDataOutput` only works on compatible camera devices. Every depth-aware effect must therefore accept a common normalized depth texture whose provider can be LiDAR, TrueDepth/other supported camera disparity, monocular ML, or a declared artistic proxy. On ordinary phones, monocular ML supplies relative near/far structure; the UI should label it “Estimated depth” and avoid claiming metric distance ([ARKit point cloud](https://developer.apple.com/documentation/arkit/displaying-a-point-cloud-using-scene-depth), [AVFoundation depth](https://developer.apple.com/documentation/avfoundation/avcapturedepthdataoutput)).

Depth Anything V2 Small is a good baseline because Apple distributes Core ML packages and the Small model is Apache-2.0 licensed; the Base/Large/Giant Depth Anything V2 models use CC-BY-NC-4.0 and should not be shipped in a commercial app without resolving licensing ([official repository](https://github.com/DepthAnything/Depth-Anything-V2)). Treat all monocular output as relative depth unless a metric model and domain support justify meters.

Use Vision’s person segmentation for a fast “subject/background” live mode, and its foreground instance masks for still/import workflows. Vision also exposes per-pixel optical flow, but Apple calls the request resource-intensive, so schedule and profile it as an optional analyzer ([person segmentation](https://developer.apple.com/documentation/vision/vngeneratepersonsegmentationrequest?changes=_7), [optical flow](https://developer.apple.com/documentation/vision/vngenerateopticalflowrequest?changes=l__6_8)).

### Native accelerator: import, recording, and export

Use PhotosPicker for selected images and videos; it can avoid requesting broad library permission and supports user-selected transfer representations ([PhotosPicker](https://developer.apple.com/documentation/photosui/photospicker)). Decode imported video through AVAssetReader into the same normalized frame input used by the camera. Render frames through the graph and feed pixel buffers with timestamps to AVAssetWriter. Apple’s pixel-buffer adaptor exposes a pool and is typically more efficient than managing output buffers independently ([AVAssetWriterInputPixelBufferAdaptor](https://developer.apple.com/documentation/avfoundation/avassetwriterinputpixelbufferadaptor?changes=_4&language=objc)).

For live recording, keep camera audio as a synchronized track and write rendered video frames from the presentation/output texture path. Do not screen-record the view hierarchy. Implement encoder backpressure, cancellation, partial-file cleanup, background interruption handling, and an export test matrix for H.264, HEVC, SDR, wide color, orientation, alpha-capable formats where offered, and audio sync.

## Web implementation

### Capture and source handling

Serve only over HTTPS. Request permission from a user gesture, then call `enumerateDevices()` after permission so labels and non-default devices can become available. Select by `deviceId`, and stop the old track before changing facing mode. `getUserMedia()` and device enumeration are gated by secure context, visibility, permissions, and Permissions Policy ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices)).

The web client must say “available cameras,” not “every physical lens.” Browsers expose a policy-controlled device abstraction. Provide front/back defaults, a device menu, zoom/torch controls only when present in `MediaTrackCapabilities`, and a clear unavailable state.

Use `<input type=file accept="image/*,video/*">` plus drag/drop for imports. Decode images through `createImageBitmap` where suitable. Use `VideoFrame`/WebCodecs for frame-level video paths and promptly close frames; the specification notes that codec resources can be exhausted if not released ([W3C WebCodecs](https://www.w3.org/TR/webcodecs/)).

### Why WebGPU, and why keep WebGL2

WebGPU is useful for much more than the depth model. It has first-class compute shaders and storage buffers, maps to modern APIs such as Metal, and reduces CPU-side overhead for complex GPU workloads. MDN specifically identifies compute-based particles, postprocessing, culling, and model transforms as suitable uses ([MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)).

| Workload | WebGL2 | WebGPU advantage |
|---|---|---|
| Edge, color, pixelation, simple ASCII, ordered dither, halftone, bloom | Excellent fragment-shader fit | Cleaner resource model but not essential |
| Temporal echo, slit scan, feedback | Viable with framebuffer ping-pong and texture rings | More explicit resource scheduling and compute preprocessing |
| Pixel sorting, error diffusion, seam carving, jump flooding, histograms, prefix scans | Awkward multipass render-to-texture algorithms | General compute, workgroups, shared memory, storage buffers, and explicit iterative passes |
| Particles, flow fields, fluid/reaction simulations | Possible but encoded into textures | Natural buffer-based simulation and indirect/compute workflows |
| Optical flow, blob reduction, mesh generation | Possible with many passes and readback traps | Parallel compute and reductions can remain on GPU |
| Monocular depth ML | WebGL execution providers support only a subset and are the legacy GPU route | ONNX Runtime recommends WebGPU for compute-intensive models; GPU tensors can remain GPU-resident ([ORT WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)) |

The recommendation is therefore **WebGPU-first at runtime, not WebGPU-only at launch**. Request WebGPU, profile limits, and use it for all supported effects. If unavailable, instantiate the WebGL2 renderer and expose the compatibility catalogue. Do not default everyone to WebGL2 merely because it is older: that would make the most distinctive effects harder and preserve a second-class architecture on capable devices. Do not require WebGPU either: it would exclude otherwise useful browsers and iOS 18 WebViews.

Run application UI, media demux, and ML orchestration outside the render-critical callback where possible. Dedicated Workers can host WebCodecs objects, and ONNX Runtime Web can use WebGPU, WebGL, WebNN, or WASM execution providers; not every operator is supported by every GPU provider, so validate the exact converted model ([ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/), [ORT providers](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html)).

Do not download a 20-50 MB model on first paint. Ship the camera and 2D effects immediately, lazy-load depth when selected, cache it with a versioned integrity hash, show progress, and offer a no-ML mode. On low-memory mobile browsers, reduce input size and cadence before reducing the main viewfinder resolution.

### Recording and fallback

Preferred: create `VideoFrame`s from the rendered canvas/output and encode with `VideoEncoder` after `isConfigSupported` checks. Mux encoded chunks with a maintained library and preserve timestamps. Simpler fallback: `canvas.captureStream()` into MediaRecorder; the canvas API returns a live MediaStream of its content ([MDN canvas capture](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)).

Maintain a tested output matrix because support for H.264, VP8, VP9, AV1, HEVC, MP4, and WebM differs. Safari has supported the video portion of WebCodecs since 16.4 and later expanded codec support, but feature detection remains mandatory ([WebKit Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/), [WebKit Safari 17.4](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/)).

## Stack alternatives

| Approach | Live iOS camera/GPU | Web reuse | ML/depth | Engineering risk | Verdict |
|---|---|---|---|---|---|
| Capacitor + framework-free TS UI + WebGPU/WebGL renderer, native escape hatch | Browser-class first path; native Metal available if needed | Maximum interface reuse; most renderer reuse | ONNX web first; Core ML/hardware depth in optional native backend | Requires disciplined component/state conventions, renderer boundary, and benchmark gates | **Recommended for these requirements** |
| Pure native Swift/Metal + separate web client | Excellent | Shared schema/tests, but duplicated visible UI | Best iOS camera and ML access | Two UI implementations and parity drift | Safest performance path if the Capacitor spike fails |
| Pure Capacitor with no native renderer option | Browser/WebView-class access only | Maximum code reuse | ONNX web; no hardware-depth path without plugin | Lens control, older-iOS compute, high-res export, and long recordings may cap ambition | Accept only after device evidence, not ideology |
| React Native + VisionCamera + Skia | Strong native camera and GPU path; VisionCamera publicly supports frame processors and Skia rendering ([repository](https://github.com/mrousavy/react-native-vision-camera)) | React concepts reuse, but camera and some Skia web APIs diverge | Native plugins needed for best ML | Dependency/version/bridge surface; web parity incomplete | Good if Android is near-term and team is React Native expert |
| Flutter + camera + Impeller/custom shaders | Strong UI portability; fragment shaders supported ([Flutter](https://docs.flutter.dev/ui/design/graphics/fragment-shaders)) | Flutter web reuse | Platform channels for Core ML/depth | Flutter shader API limits include no vertex shaders, UBOs, or SSBOs in its standard custom fragment path | Fine for 2D filters; custom particle/compute engine still becomes native |
| Rust `wgpu` core + thin Swift/web shells | One WGSL-oriented engine can target Metal and browser WebGPU; `wgpu` officially lists macOS/iOS and WASM backends ([wgpu](https://github.com/gfx-rs/wgpu)) | Highest renderer reuse | Core ML and camera remain platform adapters | Rust FFI, camera-texture interop, build/debug complexity, and web bundle size | Strong option for an experienced Rust/GPU team after a spike |
| Unity | Strong cross-platform 3D/particles | Web build possible | Native integrations/plugins | Heavy runtime, non-native camera/editor UX, download size, and media-pipeline friction | Only choose if the product becomes primarily a 3D scene tool |

### Why not promise one renderer forever?

Use one JavaScript renderer wherever it works, but keep the boundary replaceable. The difficult parts are camera negotiation, GPU texture transport, analyzers, audio/video timestamps, encoder backpressure, thermal response, and deterministic offline export. A native renderer does not threaten UI consistency: the same TypeScript Custom Elements still draw the controls, while the preview rectangle becomes a native surface. A bridge that transfers pixel bytes per frame is unacceptable; a bridge that sends parameter snapshots to a native renderer is small, testable, and viable.

## Effect catalogue

The following catalogue is a proposed product backlog. “Mechanism” describes a practical implementation, not a claim of novelty. Costs assume GPU implementation and are relative. All controls should be automatable and mappable unless marked otherwise. The catalogue includes effect nodes, analyzers, stateful living systems, and compound recipes.

### Organic, recursive, and artificial-life direction

The September 2026 inspiration set adds a useful product family: **living systems**. The common thread is emergence—small local rules or recursive transforms producing visuals that feel biological, unstable, and surprising. Do not flatten all of these into conventional camera filters. Some should generate masks, displacement fields, paths, or simulation state that other nodes can consume.

“Grid subdivide” is usually called **recursive subdivision**. If every square divides into four children, the precise term is **quadtree subdivision**; if rectangles split along alternating or chosen axes, it is **binary-space partitioning (BSP)**. For this app, the most useful effect name is **Adaptive Quadtree Mosaic**: image variance, edges, motion, or touch decide which regions keep subdividing. The Coding Train's quadtree material explicitly demonstrates recursive subdivision, while its broader catalogue also covers webcam-driven marching squares, Worley noise, Hilbert curves, cellular automata, falling sand, fluid simulation, and mathematical marbling ([Quadtree](https://thecodingtrain.com/challenges/98-quadtree/), [Marching Squares](https://thecodingtrain.com/tracks/coding-in-the-cabana/c5-marching-squares/), [challenge catalogue](https://thecodingtrain.com/challenges/)).

| Idea / working node | Product treatment | Mechanism and stackability | Primary controls | MVP path |
|---|---|---|---|---|
| Fractal Field | Generator, mask, or coordinate field—not only a final image | fBM/domain warping for organic texture; Mandelbrot/Julia/IFS/SDF repetition for geometric recursion. Feed it into displacement, color maps, feedback, kaleidoscope, particles, or depth | family, iterations/octaves, scale, lacunarity, gain, warp, drift, camera mix | Single-pass WebGL2 variants first; deeper iteration and 3D raymarching later |
| Adaptive Quadtree Mosaic | Standalone spatial node plus reusable partition map | Recursively split high-detail/high-motion cells; sample one source color or miniature per leaf. Compound with pixelation, time mosaic, edge ink, or random local transforms | detail source, split threshold, min/max cell, depth, sampling, borders, jitter, freeze | CPU-built tree updated at low cadence + GPU draw; later GPU work queue |
| Cellular / Worley Field | Generator, mask, and displacement field | Nearest-seed distance and cell IDs; existing jump-flood infrastructure can accelerate cells and signed-distance operations. Feed cells into palette, cracks, bloom, or mosaic sampling | seed count/source, metric, scale, border, relaxation, drift, palette | WebGL2 fragment approximation now; jump-flood multipass for higher quality |
| Reaction–Diffusion / Algae | Stateful simulation node | Gray–Scott ping-pong fields grow spots, coral, veins, and algae; camera luminance/edges seed chemicals and the output can become a mask, displacement, ink, or particle emitter | feed, kill, diffusion, steps/frame, seed source, touch inject, palette, reset | Low-resolution WebGL2 ping-pong textures; compute acceleration later |
| Lenia Life | Advanced artificial-life node | Continuous cellular automaton with smooth neighborhoods produces fuzzy, resilient organism-like forms. Use camera/depth as habitat or food and composite lifeforms over/through the source | species/rule preset, kernel radius, growth, speed, habitat source, trail, mutation | Post-MVP/WebGPU or Metal; preserve a lower-resolution compatibility mode |
| Mycelium / Physarum Trails | Particle simulation plus trail analyzer | Agents sense a diffusing trail, steer, and deposit more trail. Image edges, bright regions, depth, or touch become attractants; feed the resulting network into glow, displacement, or masking | agents, sensor angle/range, turn rate, deposit, diffusion, decay, attract/repel | Low-resolution GPU particles + two trail textures; reduce agent count on WebGL2 |
| Cellular Automaton | Stateful discrete simulation | Life-like, elementary, cyclic, or user-selected rules evolve a grid. Camera thresholds seed cells; cells mask, posterize, or displace the live image | rule/preset, neighborhood, cell size, speed, birth/death, seed source, wrap, reset | WebGL2 ping-pong texture; one or more steps per frame |
| Falling Sand / Matter | Stateful material simulation | Cell types move using local gravity/collision rules; source color can become grains and touch can pour, erase, heat, or redirect gravity. Best used as a simulation layer/mask, not a transparent “filter” | material, grain size, amount, gravity/tilt, cohesion, lifetime, source sampling, clear | Checkerboard/Margolus-style updates at reduced resolution; cap substeps on phones |
| Space-Filling Scan | Path/analyzer plus visible node | Hilbert, Peano, Morton/Z-order, or self-avoiding paths map 2D pixels to 1D order. Use the order for reveal, slit-scan time, pixel sorting, dithering, or particle emission | curve, order, progress, width, time spread, direction, color/sample mode | Precomputed path/lookup texture; excellent WebGL2 fit |
| Lava Field | Lightweight primitive and compound preset | Moving metaball fields + fBM become soft merging blobs; threshold/contour with smoothstep or marching squares, then sample/displace the camera and add bloom | blobs, radius, merge, buoyancy, turbulence, threshold, refraction, source mix | Analytic metaballs in one WebGL2 pass; true contour mesh optional |
| Marching Contours | Analyzer/render node | Extract isolines from luma, depth, metaballs, noise, or reaction–diffusion; useful for topography, liquid outlines, edge masks, and particle paths | source, threshold count, interpolation, thickness, smoothing, fill, labels | Fragment isobands first; explicit marching geometry later |
| Wave-Function Mosaic | Generator node rather than live camera filter | Constraint-based tile synthesis creates a pattern or transition map; use camera regions/palette as tile evidence, then feed the result into later flat nodes | tile set, symmetry, entropy seed, contradiction mode, reveal rate, source influence | Generate asynchronously at modest grid sizes; not on every video frame |

Lenia is a continuous cellular automaton specifically designed to support diverse, organism-like autonomous patterns ([original Lenia paper](https://arxiv.org/abs/1812.05433)). Gray–Scott reaction–diffusion is a well-established source of spots, stripes, and traveling pattern families ([MIT Gray–Scott page](https://groups.csail.mit.edu/mac/projects/amorphous/GrayScott/)). Fabrice Neyret's work is especially relevant to this direction because it joins procedural texture, multiscale natural phenomena, clouds, lava, and real-time rendering rather than treating “organic” as a single noise preset ([research overview](https://www-evasion.imag.fr/Membres/Fabrice.Neyret/), [publications](https://www-evasion.imag.fr/Membres/Fabrice.Neyret/publis/index-eng.html)).

Recommended compound presets:

- **Algae Glass** = Reaction–Diffusion → Flow Warp → Source Displacement → Bloom.
- **Living Mosaic** = Adaptive Quadtree → Time Mosaic → Edge Ink.
- **Sand Portrait** = Luma/Edge Emitter → Falling Sand → Palette Quantize.
- **Curve Memory** = Hilbert Lookup → Slit Scan → Temporal Dither.
- **Lava Signal** = Metaballs → Domain Warp → Refraction → Bloom.
- **Mycelium Camera** = Physarum Trails attracted to Edges → Glow → Feedback.
- **Cellular Echo** = Cellular Automaton seeded by Frame Difference → Echo → Color Map.
- **Fractal Organ** = Fractal Field → Kaleidoscope → Feedback Tunnel → Audio Modulation.

These looks are ordinary recipes that insert a flat sequence of editable nodes. The reusable primitives—field, path, mask, displacement, history, particles, and palette—matter more than the preset names.

### Bitwave interface reference

The supplied Bitwave screenshot reinforces the current camera-first direction: a large preview, restrained black interface, compact numeric controls, a clear filter/preset distinction, and direct capture feedback. Public metadata describes Bitwave as an iPhone pixel-art photo/video camera centered on ASCII-style processing; its implementation is not publicly documented ([listing](https://appshunter.io/ios/app/bitwave-ascii-camera/id6480365065)). Borrow its immediacy and legible numeric feedback, not a permanent bank of vertical sliders—Synapsis's flat stack requires progressive disclosure so four or five effects do not become an unreadable mixer.

### Naming direction

The user's three candidates establish the right territory: technical, abstract, and slightly biological. **Synapsis** is the strongest conceptually because it means connection/pairing and naturally suggests layered nodes; its spelling and pronunciation require care. **Motiv** is compact and musical/visual but crowded semantically. **System** fits the product thesis but is almost impossible to search or own. These are creative candidates only; trademark, App Store, company-name, and domain clearance remain separate work.

Twenty additional candidates:

1. Phasefield
2. Live Matter
3. Soft System
4. Morphic
5. Motile
6. Signal Organism
7. Strange Loop
8. Fluxform
9. Patternbody
10. Raster Bloom
11. Cell Signal
12. Foldspace
13. Lattice
14. Afterfield
15. Fieldwork
16. Interform
17. Image Organ
18. Recursive
19. Relay
20. Viscera

Recommended first naming round: **Synapsis**, **Phasefield**, **Live Matter**, **Motiv**, and **Soft System**.

### Modulation and analyzers are infrastructure, not filters

Modulation should not appear as one effect card. It is a routing system that lets changing signals animate any control. Analyzers produce reusable data; visual effects consume it. Compute each analyzer once per frame/cadence and share its result across every downstream node.

| Source / analyzer | Output | Example uses | Main controls |
|---|---|---|---|
| Time / LFO / envelope | sine, triangle, pulse, noise, ramp, triggered envelope | pulse bloom, scan slit, rotate halftone, breathe mesh | rate, phase, shape, sync, attack/release, quantize |
| Touch / gesture | position, velocity, pressure/area, path history, touch count | disturb flow, place flare, paint mask, pull particles | coordinate space, smoothing, radius, decay, gesture ownership |
| Device motion | gravity, attitude, rotation rate, acceleration | tilt particles, parallax camera, shake-to-glitch | axes, calibration, smoothing, dead zone, gain |
| Audio | level, bands, onset, beat phase | audio parallax, flash, echo decay, particle bursts | input, bands, gain, attack/release, threshold, beat hold |
| Edge / structure | edge magnitude/direction, corners, line field | doodle strokes, sorting paths, contour masks | operator, scale, threshold, smoothing, confidence |
| Optical flow | per-pixel motion vector and confidence | motion smear, echo stabilization, flow-field advection, datamosh proxy | cadence, scale, quality, confidence, smoothing, max motion |
| Blob tracking | connected regions with centroid, size, bounds, velocity, ID | attach effects to colored objects, make blobs repel particles, trigger events | source channel/color/depth, threshold, morphology, min/max size, tracking memory |
| Depth | normalized relative depth, optional metric depth, confidence | displacement, mesh, fog, occlusion, depth masks | provider, cadence, smoothing, near/far remap, confidence gate |
| Subject / semantic mask | person/foreground/object mask | isolate subject, graffiti background, semantic erosion | target, quality, feather, temporal hold, spill cleanup |
| Jump-flood distance field | nearest-seed ID/coordinate and approximate distance per pixel | Voronoi cells, fast mask dilation/erosion, outlines, region propagation, particle attraction | seed source/count, distance metric, analysis scale, pass cap, wrap mode, precision |

### Pixels, print, and typography

| Effect | Look / behavior | Mechanism | Recommended controls |
|---|---|---|---|
| Pixel sort | Streaks of ordered color that break only selected tonal regions | Build row/column/flow-line segments from threshold crossings; sort samples by luminance, hue, saturation, or channel; compute prefix/segmented operations | axis/flow, low/high threshold, key, direction, segment cap, stride, jitter, mask, hold/freeze |
| Pixelation | Mosaic blocks that can stay crisp or swim | Downsample with nearest/average/median then nearest upscale; optional quantized grid origin | cell X/Y, lock aspect, origin, sampling mode, palette, animated phase |
| Color quantize / posterize | Flat graphic bands | Map linear or perceptual color to N levels or nearest palette color | levels, palette, perceptual/RGB mode, channel link, noise before quantize |
| Psychedelic color warp | Animated hue rivers, solarized bands, and color cycling | Remap hue/saturation from luminance, gradients, noise, depth, or history; optional solarization and palette feedback | color field, hue turns, saturation, solarize, palette, speed, depth/audio weight, feedback |
| Ordered dither | Stable geometric threshold patterns | Bayer/blue-noise threshold matrix sampled against luminance or channel values | matrix/style, scale, threshold, gamma, colors, channel mode, phase |
| Error-diffusion dither | Organic 1-bit or limited-palette texture | Floyd-Steinberg, Atkinson, Jarvis, Stucki, Burkes, or serpentine diffusion; parallel approximations for preview | kernel, palette, strength, scan direction, serpentine, scale, preserve edges |
| Temporal dither | Dots shimmer while perceived tone stays stable | Rotate/noise-jitter thresholds over time while conserving average coverage | rate, coherence, matrix family, persistence, motion lock |
| Halftone | Printed dots/lines that grow with ink density | Rotate screen coordinates, sample cell tone, draw analytic dot/line shapes; CMYK separations for color | ruling, per-channel angle, dot shape, dot gain, under-color removal, ink colors, registration |
| Risograph | Limited inks, misregistration, grain, overprint | Separate into 1-4 plates, screen/dither each, offset/warp plates, multiply/ink blend over paper | inks, separation method, screen, plate offset/rotation, bleed, grain, paper, trapping |
| Engraving / hatching | Curved or crosshatched line illustration | Direction field from image gradients/structure tensor; line density and thickness from tone | angle field, spacing, cross layers, curvature, stroke width, jitter, edge emphasis |
| Stipple | Image rebuilt from variable dots | Blue-noise/Poisson seeds with density rejection or weighted relaxation; tone controls radius/density | density, min spacing, radius, tone response, seed, drift, connect-neighbors |
| ASCII / glyph | Image rebuilt from text characters | Tile luminance/color; select glyph by measured coverage; atlas-render glyph with per-cell color | custom string/set, font, columns/rows, aspect correction, ramp sort/manual order, color mode, background, invert, gamma, tracking |
| Braille / block text | Dense tactile/code mosaic | Same glyph pipeline with Unicode-aware atlas and script-specific coverage calibration | script preset, cell ratio, density, color, bidi-safe export, text/vector/raster output |
| Contour bands | Topographic or posterized isocurves | Quantize luma/depth then detect transitions; optional signed-distance dilation | source luma/depth, interval, thickness, smoothness, labels/ticks, color ramp |
| Edge ink | Neon, pencil, photocopy, or technical outlines | Sobel/Scharr/Laplacian/Canny-like gradients; non-maximum suppression and threshold/hysteresis where needed | operator, threshold, thickness, softness, polarity, source channel, edge color, fill mix |
| Doodle / scribble | Hand-drawn outlines jitter, redraw, and hatch across the image | Trace edge/structure fields into short strokes; stabilize IDs over time, then add controlled wobble and gaps | stroke length/width, density, jitter, redraw rate, hatch angle, paper, color, fill mix |
| Graffiti / spray paint | Stenciled subjects, drips, overspray, marker tags, and rough walls | Flat recipe: edge gate → posterize → spray particles → texture displacement → drip simulation | stencil threshold, cans/colors, spray radius, drip amount/gravity, wall texture, outline, tag layer |
| Cubist collage | Scene breaks into angular viewpoints and colored planes | Flat recipe: measurement → polygonal cells → local transform/time offsets → posterized palette → outlines | plane count, facet scale, viewpoint spread, time spread, palette, edge weight, overlap, subject lock |

### Temporal, analog, and feedback

| Effect | Look / behavior | Mechanism | Recommended controls |
|---|---|---|---|
| Slit scan | Space is assembled from different moments; moving subjects stretch and shear | Ring buffer of frames; output pixel samples history using x/y/radial/noise/depth-based time offset | direction/shape, duration, slit width, scan speed, reverse, loop, history interpolation, visible scan line |
| Time mosaic | Tiles show different moments | Per-tile history index from grid, noise, spiral, or interaction map | grid, time spread, ordering, drift, random seed, tile feather |
| Spectral delay | RGB channels come from different times | Sample each channel from a different history frame and optional spatial offset | R/G/B delay, color space, spatial offset, feedback, recombine mode |
| Temporal echo | Repeated silhouettes and trails | Accumulate prior output or source with decay and transform; optional motion/subject mask | delay, decay, copies, scale/rotation/translation, threshold, color cycle, clear |
| Scan-head memory | A moving bar writes the current frame while the rest holds old content | Persistent texture updated inside a moving mask | axis/path, speed, width, feather, overwrite blend, bounce, touch scrub |
| Rolling-shutter warp | Wobble and lean tied to motion/time | Per-scanline time offset plus camera/optical-flow-derived transform | readout direction, duration, wobble, stabilization, sync to motion/audio |
| Frame-difference ghost | Motion appears as luminous residue | Absolute/signed difference from prior frame; threshold and decay composite | sensitivity, decay, polarity, color, blur, source delay |
| Feedback tunnel | Recursive zoom/rotate mirrors into infinity | Previous output transformed and blended with current frame | scale, rotation, center, decay, blend, chroma drift, edge behavior, clear |
| VHS / composite | Tape noise, chroma bleed, head switching, dropouts | Luma/chroma filtering, subcarrier-like phase error, horizontal jitter, scan noise, time-base instability | tracking, chroma delay/noise, luma bandwidth, dropout, head switch, date/title, audio degradation |
| CRT / display | Curved phosphor display with scanlines and glow | Lens warp, shadow mask, scan modulation, bloom, vignette, persistence | curvature, mask type, pitch, scan strength, bloom, convergence, flicker, bezel |
| Digital glitch | Bars, blocks, channel tears, bit-plane noise, and displaced scan regions | Coordinate block/scan displacement, channel offsets, bit-plane operations, palette corruption, seeded dropout masks | block/line size, displacement, channel split, bit depth, dropout, seed, rate, hold, safe-flash limit |
| Datamosh proxy | Blocks drag and prediction appears to fail | GPU block motion estimation/reuse or controlled codec-transcode path; preview need not corrupt actual compressed stream | block size, motion hold, I-frame trigger, smear decay, threshold, color error |
| Bloom / lens flare | Highlights glow, streak, ghost, and throw colored flare artifacts | Thresholded multiscale blur composite plus procedural/aperture ghosts positioned from bright blobs or touch | threshold, intensity, radius, anamorphic stretch, ghost count, chroma, dirt texture, source/touch position |
| Photocopier sweep | Physical copy-bed stretch and degeneration | Moving scan line samples a user-transformable source; each pass adds toner curve, blur, noise, and defects | scan axis/speed, source drag/rotate/scale, toner, generation, grain, streaks, commit |

### Spatial, depth, and masks

| Effect | Look / behavior | Mechanism | Recommended controls |
|---|---|---|---|
| Seam carve / content-aware collapse | The image narrows, widens, or buckles by removing low-information paths; protected subjects remain while backgrounds implode | Compute an energy map from gradients, saliency, depth, or masks; use dynamic programming to find minimum-energy connected seams, then remove, duplicate, offset, or reveal them. Live preview uses low-resolution/incremental seams; offline export can recompute at source resolution | target width/height, horizontal/vertical, energy source/mix, protect/remove mask, seam rate, remove/insert/displace mode, accumulation, jitter, reveal seams, reset |
| Jump-flood Voronoi | Seeds rapidly claim the image, producing crystalline cells, expanding regions, distance rings, or nearest-color mosaics | Initialize seed coordinates/IDs, then compare candidates at exponentially shrinking jump distances until local refinement; derive nearest-seed regions or approximate signed/unsigned distance fields in logarithmic GPU passes | seed source/count, metric, cell relaxation, jump start/pass cap, distance bands, border width, palette/source color, jitter, animation, wrap, refine passes |
| Depth displacement | Near/far regions slide, ripple, or tear differently | Use sensor/ML depth as a displacement scalar or vector-field weight; edge-aware upsample | depth curve, amount, axis/vector field, near/far clamp, edge protection, hole fill |
| 2.5D / 3D depth mesh | Camera can orbit around an image surface; strong depth can become a sculpted scene | Tessellated grid vertices displaced by depth; original image projected as texture; optional normals, lighting, wireframe, and stylized disocclusions | depth scale, mesh density, camera orbit/FOV, extrusion, lighting, wireframe, crop, hole mode |
| Point cloud | Every sampled pixel becomes a movable colored point | Unproject pixel using depth and camera intrinsics or an artistic normalized camera; render GPU points/splats | density, size, depth curve, FOV, z scale, crop, confidence, splat shape, background |
| Depth slice | Bands of distance separate like cut paper | Quantize depth into layers, offset/rotate each layer, outline gaps | slices, boundaries, spacing, direction, perspective, gap color, feather |
| Depth fog / atmosphere | Distance dissolves into color or particles | Beer-Lambert-like attenuation or artistic curve from depth; noise-modulated density | near/far, density, color, noise, height, light direction, animate |
| Depth contour | Topographic rings wrap objects | Isolines from smoothed depth, optionally combined with surface normals | interval, thickness, smoothness, colors, depth range, normal lighting |
| Depth fracture | Objects tear along depth discontinuities | Segment by depth/edge watershed, then transform shards or particle-emission regions | fracture scale, shard size, force, gravity, heal, subject lock |
| Relight / bas-relief | Photo looks embossed or lit from a new direction | Estimate normals from depth gradients; shade with diffuse/specular/rim model | light XY/Z, height, softness, specular, ambient, source mix, invert relief |
| Subject isolation | Effects target foreground people/objects or background | Sensor/OS segmentation or user-assisted mask; temporal stabilize and feather | subject(s), invert, feather, spill cleanup, hold mask, edge shift |
| Depth-keyed composite | A layer appears only within a distance range | Smooth range gate on depth used as mask | near/far, feather, invert, confidence threshold, fill invalid |
| Kaleidoscope / mirror | Radial or tiled symmetries fold the camera into repeating geometry | Reflect/fold UV coordinates in polar sectors, grids, triangles, or user-defined mirror axes | symmetry count, center, rotation, scale, tile mode, seam soften, animated drift, touch center |
| Optical-flow warp | Moving regions stretch, liquefy, or carry pixels along their measured motion | Advect source/history through the optical-flow vector field; confidence controls hold or fallback behavior | amount, direction, time step, trails, confidence gate, smoothing, clamp, freeze field |
| PS1 / low-poly scene | Chunky geometry, vertex wobble, affine textures, short draw distance, and limited color | Compound render style: coarse depth mesh + vertex snapping + low-resolution render + palette quantize/dither + optional affine-like texture distortion and fog | mesh scale, vertex snap, internal resolution, palette, dither, texture wobble, fog distance, frame cap |

### Particles, fields, and interactive simulation

| Effect | Look / behavior | Mechanism | Recommended controls |
|---|---|---|---|
| Pixel particles | Image breaks into colored particles and reforms | Seed particles from image grid/importance map; GPU buffers store position, velocity, home, color, life; render points/sprites | count, size, sampling source, cohesion/home force, drag, gravity, life, respawn, blend |
| Touch turbulence | Finger pushes, pulls, swirls, or erases the field | Inject impulses/vorticity into a low-resolution vector texture sampled by particles/pixels | mode, radius, force, falloff, persistence, multi-touch, pressure/velocity mapping |
| Flow-field drift | Image material follows organic currents | Curl noise, depth gradients, image structure tensor, audio, or painted vectors define velocity field | field source, scale, speed, curl, depth weight, edge attraction, seed, evolve rate |
| Flocking | Pixel swarms group, align, and avoid | Spatial hash/grid approximates boid neighborhood; combine cohesion/alignment/separation/home | neighborhood, cohesion, alignment, separation, home, predator touch, max speed |
| Fluid ink | Color advects like liquid and reacts to touch | Low-resolution stable-fluid or semi-Lagrangian velocity/dye simulation with pressure projection | viscosity, diffusion, dissipation, vorticity, injection color, force, resolution |
| Elastic surface | Image behaves like cloth, jelly, or a pressure membrane | Mass-spring grid or height-field wave equation with texture displacement | stiffness, damping, mass, radius, force, pin points, recover, tear threshold |
| Reaction-diffusion | Organic spots, veins, and coral grow from the image | Gray-Scott or related two-field simulation; image/edges seed chemicals | feed, kill, diffusion A/B, steps, seed source, palette, reset, touch inject |
| Vortex / event horizon | Pixels and particles orbit and stretch into a singularity | Polar-coordinate warp plus velocity field with angular/radial forces | center, radius, spin, pull, lensing, falloff, touch position, escape/recover |

### Novel compound instruments

| Effect | Look / behavior | Mechanism | Recommended controls |
|---|---|---|---|
| Depth Loom | Near/far ribbons weave across time | Depth bins become ribbons; alternate over/under ordering and sample different history frames | ribbon count, weave phase, depth bias, time spread, fray, tension, colors |
| Worldline Brush | A finger draws a path made from future and past camera frames | Store touch trajectory with timestamps; sample history along path normal/tangent | history span, brush width, time direction, velocity stretch, decay, replay |
| Uncertainty Bloom | ML depth uncertainty becomes visible material | Combine depth temporal variance, invalid pixels, and sensor confidence to seed fog/particles/edges | confidence threshold, bloom radius, palette, particle rate, stabilize, invert |
| Chroma Memory | Color lingers while structure updates | Maintain separate histories for luma and chroma; advect/decay chroma using flow | chroma half-life, luma lag, flow amount, bleed, palette, clear |
| Echo Skeleton | Moving edges leave articulated wire ghosts | Edge map or pose/subject contour sampled over time, then transformed/colored | history, spacing, edge threshold, transform, color cycle, subject-only |
| Semantic Erosion | A chosen subject dissolves into image-derived matter | Subject mask drives particle emission/reaction-diffusion while background remains coherent | target, erosion rate, direction, particle style, regenerate, edge roughness |
| Time Topography | Contours encode both depth and age | Build isolines from a weighted depth/history field; color by timestamp | depth/time mix, interval, drift, palette, persistence, line width |
| Audio Parallax | Music pushes depth layers like a speaker cone | Band-limited audio envelopes modulate depth displacement, camera FOV, and particles | band mapping, gain, attack/release, depth curve, stereo direction, beat hold |
| Living Dither | Dither dots behave as agents but preserve local tone | Occupancy target from luminance; agents move in a field while local density feedback conserves tone | kernel/agent mode, mobility, coherence, field, tone stiffness, size, color |
| Occlusion Garden | Particles grow only behind or between depth layers | Emit on depth discontinuities and use depth test/soft occlusion to reveal hidden structures | seed edge, growth, gravity, occlusion softness, depth range, bloom, prune touch |

### How the requested additions fit the flat stack

| Requested idea | Best treatment | Builds on / supplies | Why |
|---|---|---|---|
| Modulation | Core routing system | time/LFO, touch, motion, audio, depth, edge, flow, blobs -> any parameter | One reusable system creates far more combinations than a “modulation filter” |
| Datamosh | Standalone temporal node with optional compound presets | optical flow/block motion + frame history + digital glitch | It needs its own motion-hold semantics, but becomes richer when flow and glitch drive it |
| Blob tracking | Analyzer | threshold/color/depth mask -> labeled centroids, bounds, velocity, IDs | The tracking data should drive many effects rather than draw one fixed look |
| Optical flow | Analyzer plus visible warp node | motion vectors -> warp, particles, stabilized echo, datamosh, slit scan | Flow is both useful data and an effect users may want directly |
| Glitch | Standalone primitive plus preset family | digital glitch + datamosh + spectral delay + feedback + audio/LFO | Separate controllable failure modes combine into more surprising “glitch” instruments |
| 3D mesh | Standalone geometry node | depth + tessellation + camera/lighting | It changes the representation, so it deserves an explicit node and capability badge |
| LSD / psychedelic visuals | Compound preset family | kaleidoscope/mirror + feedback + hue warp + reaction-diffusion + bloom + audio/LFO | The desired look is a changing family, not one algorithm; label it “Psychedelic” in product UI |
| Echo | Standalone temporal node | history ring + transform + optional subject/flow mask | Common, understandable, and useful as a building block for trails and ghosts |
| Flares / blooms | Standalone optics node | highlight/blob detection + multiscale blur + procedural ghosts | Reusable finishing effect and modulator target; touch can place the flare |
| PS1 / retro / low-poly | Flat recipe | depth-like displacement → vertex snap → pixelation → quantize/dither → fog | Users want the coherent style while retaining separate primitives for remixing |
| Doodle / scribble | Standalone stylization node | edges/structure field + temporal stroke identities | It needs stroke-specific controls but can feed graffiti and animated illustration presets |
| Graffiti | Flat recipe | edge gate → posterize → spray/stipple → drips → texture | The look is strongest as a readable sequence rather than an opaque monolith |
| Cubism / Picasso-like | Flat recipe | measurement → polygon facets → viewpoint/time offsets → palette → outline | Multiple local perspectives and planes remain independently editable operations |
| Seam carving | Standalone spatial/temporal node | energy map + minimum-energy seams + protect/remove masks; optionally feeds slit scan or feedback | It changes image topology rather than merely warping coordinates, so it needs explicit state, resolution, and preview/export rules |
| Jump flooding | Reusable analyzer plus visible Voronoi node | seeds/masks -> nearest-seed field and approximate distance -> cells, contours, mask growth, particles | The GPU algorithm is most valuable as shared infrastructure, while the visible node exposes its crystalline and propagating-region aesthetics |

Compound looks live in the Inspiration Gallery. Applying “PS1 Scene” or “Graffiti” inserts its ingredients directly into the flat rack as ordinary independent nodes, with no wrapper, nesting, or hidden processing.

## Effects to ship first

### Technical prototype: prove the architecture

Implement six nodes that exercise different engine requirements:

1. Edge Ink - neighborhood sampling and masks.
2. Pixel Sort - segmented compute and thresholding.
3. Slit Scan - history ring buffer and time mapping.
4. ASCII - glyph atlas, text/color choices, and resolution semantics.
5. Pixel Particles + Touch Turbulence - storage buffers, simulation, and gestures.
6. Depth Displacement - asynchronous analyzer side input and temporal stability.

If those stack, record, import, export, suspend/resume, rotate, and survive ten-minute thermal tests, the core architecture is credible.

### Public MVP

Ship the six prototype effects plus Ordered Dither, Halftone, Pixelation, Temporal Echo, Digital Glitch, Bloom/Lens Flare, Chromatic Aberration/Spectral Delay, and Feedback Tunnel. Include 30-50 excellent presets, 6 blend modes, touch/motion/audio/LFO modulators, photo/video import, still/video export, project save, and visual capability labels. Keep node-graph branching and full keyframing for the next release.

### Differentiating release

Add Seam Carve, Jump-flood Voronoi/distance fields, 2.5D/3D mesh and point cloud, blob tracking, optical-flow warp/modulation, Depth Loom, Worldline Brush, Living Dither, subject masks, PS1 Scene, Doodle, Graffiti, Cubist Collage, Psychedelic instruments, automation recording, custom glyph import, user-shared preset JSON, and richer desktop Performance controls. These combine proven primitives into inspectable systems that are difficult to express in filter-only apps.

## Delivery plan and gates

| Phase | Outcome | Exit gate |
|---|---|---|
| 0. Two-week feasibility spike | Shared framework-free TypeScript UI in browser and Capacitor; WebView camera-to-WebGPU/WebGL2-to-record loop; ONNX depth cadence; a narrow native camera/Metal proof only as the documented escape hatch | Measured frame times, lens access, memory, color, orientation, audio sync, and ten-minute thermal behavior on lower/mid/current devices |
| 1. Engine foundation | Shared project schema, parameter system, texture pool, stack compiler, preview/export paths, capability matrix, golden tests | Identical preset semantics on iOS/web; no frame-byte bridge; deterministic offline frame sequence |
| 2. Six-effect vertical slice | Prototype effects, gestures, analyzer cache, import, record, save project | Effects layer in arbitrary order; preview/export look agreement is documented and tested |
| 3. MVP product | Capture/Import/Patch UX, preset browser, macros, fourteen effects, onboarding, safety controls | Beta creators can make, reproduce, export, and share a look without developer help |
| 4. Quality and launch | Device/browser matrix, crash/thermal/memory tuning, accessibility, privacy, StoreKit, support content | Sustained sessions, interrupted recording recovery, clean App Review package, observable performance metrics |
| 5. Instrument expansion | Advanced modulation, depth/flow compounds, desktop performance, shareable patch ecosystem | Versioned migrations and moderation/distribution rules are stable |

The timetable is a sequencing proposal, not a fixed estimate. Staffing, prior Metal/WebGPU experience, export formats, Android scope, and design polish will dominate calendar time.

## Test and observability strategy

### Golden visual tests

For each effect version, render reference images at fixed sizes, seeds, times, color spaces, and parameter extremes. Compare with perceptual tolerances rather than byte equality where different GPUs legitimately round differently. Run the same fixture pack through WebGPU, WebGL2, and Metal whenever those implementations exist; classify differences as exact, perceptually equivalent, intentional substitute, or failure. Include transparent edges, Display P3 primaries, skin tones, fine lines, very dark gradients, portrait/landscape, front-camera mirroring, odd video dimensions, and long histories. Add responsive UI snapshots at phone, tablet, and desktop breakpoints; Canva's published visual-regression practice is a useful precedent for testing multiple browsers, widths, and text directions ([Canva VRT](https://www.canva.dev/blog/engineering/why-we-left-manual-ui-testing-behind/)).

### Performance tests

Record CPU/GPU frame time percentiles, capture drops, render misses, analyzer cadence, texture/buffer high-water mark, encoder queue depth, model latency, memory warnings, and thermal-state transitions. Define budgets per effect and reject patches that exceed a device’s capability unless the user deliberately enters offline mode.

### Export tests

Validate duration, first/last timestamps, audio drift, rotation metadata, color tags, frame count, cancellation cleanup, background interruption, low storage, Photos permission choices, iCloud-only imports, and round-trip decoding. Test preview matching separately from maximum-detail export.

### Safety and accessibility

Provide a Photosensitive Safety toggle that caps full-screen flashes and disables random high-frequency luminance modulation. Warn before presets that exceed a measured flash threshold. Offer Reduce Motion behavior for the interface without disabling user-authored motion in exports. Controls need labels, numeric readouts, large hit targets, high-contrast focus, and alternatives to shake/tilt/touch gestures.

Apple requires explicit consent and a clear indication when camera, microphone, screen, or user activity is recorded, and expects data minimization and clear purpose strings ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)). Prefer on-device processing, PhotosPicker, no account requirement for creation, and an accurate privacy label.

## Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| “One codebase” pressure forces native frames through the bridge | Copies, latency, GC stalls, and fragile recording | Keep a frame entirely inside the WebView GPU path or entirely native; bridge only small state changes |
| Framework-free UI becomes ad hoc | State drift, duplicate event wiring, memory leaks, and hard-to-test screens | Typed reducer/selectors, Custom Element lifecycle rules, AbortController cleanup, feature boundaries, and Playwright flows |
| Depth consumes the frame budget | Jank and heat | Async 5-15 Hz inference, P6/smaller input, hardware depth first, flow-assisted reuse, quality governor |
| Preview and export differ | Users cannot trust the instrument | Normalized units, explicit pixel-locked mode, same graph, golden tests, “match preview” export |
| Unlimited stacking exhausts memory | Termination or device loss | Graph cost estimate, texture aliasing, node resolution policies, history caps, graceful disable |
| Browser support varies | Missing effects or failed recording | Capability screen, WebGL2/WASM fallbacks, codec probes, clear degraded labels |
| Visual identity drifts across backends | A preset feels like a different product on iOS and web | One semantic effect manifest, reference scenes, perceptual tolerances, and review of intentional substitutions |
| Temporal effects break seeking/export | Nondeterministic frames | Fixed timestep, seeded randomness, reset/seek protocol, preroll and checkpointed state |
| User presets break after updates | Lost creative work | Version every node, migrate parameters, retain legacy shaders when necessary, snapshot tests |
| ML/model licensing is overlooked | Commercial/legal exposure | Ship Apache-2.0 Small only after attribution review; maintain model BOM; avoid NC variants |
| Thermal throttling appears late | Long-session frame collapse | Ten- and thirty-minute device tests; use thermal state and measured GPU time; degrade gradually |
| Flashing/glitch content harms users | Safety and trust issue | preset analysis, warning, safety mode, strobe limits, interface Reduce Motion |

## Product decisions now resolved

| Question | Decision | Architectural consequence |
|---|---|---|
| Android in year one | No | Optimize the wrapper and any native accelerator for iOS; do not accept Android-driven abstraction cost yet |
| HDR in the MVP | No | Use a documented SDR working/output path first; keep color-space fields versioned so HDR can be added later |
| UI framework | None for the MVP; use framework-free TypeScript, native DOM, and Custom Elements | Smaller dependency/runtime surface; requires a typed store, explicit component lifecycles, and strict module boundaries |
| iOS/web parity | Keep behavior and UI as close as possible; permit capability-labelled differences only when technically necessary | Share framework-free TS UI and project semantics; maintain WebGL2, WebGPU, and optional Metal capability tiers |
| Preset storage | Local in MVP; publishing/storage/sharing later | No account or backend required; save project JSON and thumbnails locally and support import/export |
| Server backend | None in the current phase | All live processing, analysis, media, projects, presets, caches, and exports remain on device |
| Product identity | Camera-first instrument; monochrome, schematic, retro-computer discipline, restrained cinematic-future accents | Open to Capture; reveal the modular rack progressively; Perform is an alternate live-control surface |

### Remaining engineering gates, not product ambiguities

1. Set the minimum supported iOS version and test WebGPU availability inside that exact `WKWebView`; iOS 18 support means WebGL2 must remain viable.
2. Define the target-device matrix: one lower-bound iPhone, one mid-tier device, one current Pro device, an iPad, Safari/macOS, Chrome/macOS or Windows, and at least one non-WebGPU browser path.
3. Decide the exact MVP recording/export matrix after codec probes: minimum still format, one dependable processed-video format per platform, maximum duration, and audio behavior.
4. Write measurable escape-hatch gates. Example: introduce the native renderer if the WebView cannot sustain 30 fps at the chosen preview resolution for the medium proof patch, drops or desynchronizes recorded frames, cannot expose required rear-camera switching, or exceeds the thermal limit during a ten-minute session.
5. Decide whether presets that contain unsupported nodes open with substitutes, bypass those nodes, or render offline only. The recommendation is explicit substitute where meaningful, otherwise bypass with a visible warning.
6. Define the conformance fixture pack and tolerances before a second renderer exists. The Metal escape hatch should have to prove semantic and visual compatibility, not invent its own controls.
7. Prototype navigation, bottom-sheet focus management, component disconnection, and repeated route changes in Safari and the target `WKWebView`; framework-free code must pass leak and accessibility checks before feature expansion.

## Final recommendation

Build the shared framework-free TypeScript application first and package it with **Capacitor for iOS**. Use Vite for the fast laptop loop, native Custom Elements/DOM modules, one typed store, CSS design tokens, one responsive UI, one project/effect contract, and an asset manifest that separates logical media from platform storage. There is no server backend: the browser and iPhone each own capture, analysis, rendering, recording, projects, caches, and exports locally. In both the website and initial iOS build, acquire the camera with `getUserMedia()`, select **WebGPU when available**, and fall back to a deliberately scoped WebGL2 Core renderer. Use browser recording APIs for the processed canvas; the absence of `recordVideo()` in Capacitor's web plugin does not prevent website recording.

Before expanding the catalogue, run a two-week physical-device spike with the six proof effects, processed video plus audio, imports, suspend/resume, orientation changes, depth ML, and ten-minute thermal tests. Keep the renderer behind an adapter from day one. If the WebView path misses the acceptance gates, retain the same TypeScript interface and add a native `AVFoundation/Metal/Core ML` preview/encoder backend; send only controls and state across the Capacitor bridge. The cross-platform precedents strengthen this recommendation: Polycam and Scaniverse openly specialize capabilities, Luma and Matterport normalize results into portable/streamed assets, and Canva uses a hybrid shell with narrow native acceleration.

Do not begin with a shared C++/Rust engine. Preserve that option at the kernel boundary: stable tensor/texture formats, explicit resource ownership, deterministic uniforms, and backend-neutral fixtures. If maintaining WGSL, GLSL, and Metal implementations later becomes the dominant cost, move only the expensive shared algorithms into Rust or C++ compiled for native and WebAssembly, following the 8th Wall pattern. That is an earned migration, not an MVP prerequisite.

LiDAR is always optional. Hardware depth improves latency and geometry on supported devices; monocular depth supplies relative structure elsewhere; every depth effect has a non-depth or depth-off fallback. The flagship experience remains “turn the camera into material”: depth, blobs, edges, and optical flow analyze the scene; touch, motion, sound, and time modulate it; an ordered flat rack layers primitives; Design builds the instrument, and Perform plays it. Its visual language is a quiet monochrome instrument—schematic lines, workstation typography, sparse cool highlights, amber warnings, and red only when recording or destructive state demands attention.

## Source notes

The links below are the principal evidence used. Live documentation and App Store pages were accessed 6-7 September 2026 unless another date is shown.

### Market and product sources

- Signal Loss, official product page, “Photos into 3D point clouds,” undated live page: https://www.signalloss.app/
- Apple App Store, Signal Loss by Inner Circle, current listing/version history: https://apps.apple.com/us/app/signal-loss/id6775065853
- Apple App Store, Mono Lab by Inner Circle, current listing/version history: https://apps.apple.com/us/app/mono-lab/id6759029184
- Mono Lab, official Help, version 5.1, controls and workflow: https://monolab.app/help
- Apple App Store, DotPress by Inner Circle: https://apps.apple.com/us/app/dotpress/id6760323750
- Apple App Store, CMSHT by Denis Krupin: https://apps.apple.com/us/app/cmsht/id6754469747
- Apple App Store, One Lab by Ilixa Ltd.: https://apps.apple.com/us/app/one-lab-artful-photo-editor/id6741912891
- Apple App Store, Chromatose by Edward Rooth: https://apps.apple.com/us/app/chromatose-visual-synthesizer/id6578449692
- Apple App Store, Polagone by Fingerlab: https://apps.apple.com/us/app/polagone-visual-synthesizer/id6755683557
- Apple App Store, EFEKT by PicsArt: https://apps.apple.com/us/app/efekt-video-effects-filters/id1367644508
- Apple App Store, Hyperspektiv by Phantom Force: https://apps.apple.com/us/app/hyperspektiv-photo-video-ar/id1058051662
- Apple App Store editorial, “Distort Your Reality,” developer interview: https://apps.apple.com/us/iphone/story/id1334929542
- Apple App Store, Glitche by Glitche Ltd.: https://apps.apple.com/us/app/glitch%C3%A9-photo-video-editor/id634467171
- Apple App Store, Glitch Art Studio by NET Sigma: https://apps.apple.com/us/app/glitch-art-studio-cam-effects/id1434795782
- Apple App Store, Rarevision VHS by Rarevision: https://apps.apple.com/us/app/rarevision-vhs-retro-cam/id679454835
- Apple App Store, Real Halftone 2 by Tomoki Kobayashi: https://apps.apple.com/us/app/real-halftone-2/id1632423711
- Apple App Store, ASCII Camera: https://apps.apple.com/us/app/ascii-camera/id6748850196
- Apple App Store, AACamera by Masamichi Nakada: https://apps.apple.com/us/app/aacamera-ascii-video-photo/id6758904067
- Apple App Store, GT ASCII Camera: https://apps.apple.com/us/app/gt-ascii-camera/id6759784105
- Apple App Store, STRATUM Slit Scan: https://apps.apple.com/us/app/stratum-slit-scan/id1525313915
- Apple App Store, Slit Scan Camera by Anton Heestand: https://apps.apple.com/us/app/slit-scan-camera/id1625934084
- Apple App Store, VOSC Visual Particle Synth: https://apps.apple.com/us/app/vosc-visual-particle-synth/id592599278

### Cross-platform 2D/3D precedent sources

- Polycam, downloads for iOS, Android, and web: https://poly.cam/get-the-app
- Polycam Help, Getting Started and common navigation: https://learn.poly.cam/hc/en-us/articles/39279656782996-Getting-Started-with-Polycam
- Polycam Help, capture-mode and platform matrix: https://learn.poly.cam/hc/en-us/articles/48565771018772-Which-Capture-Mode-Should-I-Use
- Polycam Help, supported devices and Android limitations: https://learn.poly.cam/hc/en-us/articles/34419168797972-Which-Devices-Are-Supported-by-Polycam
- Polycam Help, local versus cloud processing and cross-device availability: https://learn.poly.cam/hc/en-us/articles/30549172696084-Do-I-Need-Wi-Fi-LTE-to-Process-My-Captures
- Polycam Help, target-specific photogrammetry processing types: https://learn.poly.cam/hc/en-us/articles/30299027821716-What-Are-the-Different-Photogrammetry-Processing-Types
- Polycam Help, Scenes platform support: https://learn.poly.cam/hc/en-us/articles/35174492720404-How-to-Create-a-Scene
- Polycam, public Polyform raw-capture format and conversion tools: https://github.com/PolyCam/polyform
- Niantic Spatial, Scaniverse release notes, on-device classic processing and later cloud/web access: https://www.nianticspatial.com/capture/scaniverse-release-notes
- Niantic Spatial, Scaniverse mobile and web platform launch, 7 April 2026: https://www.nianticspatial.com/blog/scaniverse
- Niantic Spatial, Scaniverse quickstart and generated mesh/splat/VPS assets: https://nianticspatial.com/docs/scaniverse/quickstart/
- Niantic, open SPZ C++ and TypeScript/WASM library: https://github.com/nianticlabs/spz
- Niantic Spatial, SPZ 4 architecture and web/WASM performance, 5 May 2026: https://www.nianticspatial.com/blog/spz4
- Luma AI, Interactive Scenes platform, streaming-size, and web-frame-rate claims: https://lumalabs.ai/interactive-scenes
- Apple App Store, Luma 3D Capture current listing/version history: https://apps.apple.com/us/app/luma-3d-capture/id1615849914
- Google Play, Luma AI 3D Capture listing: https://play.google.com/store/apps/details?id=ai.lumalabs.polar
- Luma AI, archived WebGL/Three.js Interactive Scenes library and examples: https://github.com/lumalabs/luma-web-examples
- Matterport, compatible iOS and Android capture devices: https://matterport.com/compatible-mobile-devices
- Matterport Academy, capture-app upload and cloud processing: https://matterport.com/matterport-academy/using-360-cameras/upload-to-the-cloud-360-cameras
- Matterport, cloud digital-twin platform and streamed mobile/web models: https://matterport.com/news/matterport-reinvents-digital-twin-revolutionary-pro3-camera-and-new-cloud-platform
- Matterport, JavaScript/TypeScript-facing Showcase SDKs: https://matterport.github.io/developer-docs/
- Matterport, Showcase Web Component and Three.js dependency: https://matterport.github.io/developer-docs/webcomponent/
- KIRI Engine, platform and algorithm overview: https://www.kiriengine.app/faq/what-is-kiri-engine
- KIRI Engine, cloud photogrammetry across iOS, Android, and web: https://www.kiriengine.app/blog/explained/what-is-photogrammetry
- KIRI Engine, cloud 3D Gaussian Splatting pipeline: https://www.kiriengine.app/blog/3d-gaussian-splatting-a-technical-guide-to-real-time-neural-rendering
- KIRI Engine, local Apple Object Capture option on supported devices: https://www.kiriengine.app/blog/announcement/kiri-engine-real-time-photogrammetry-ios-17-api
- Epic Games, RealityScan mobile system requirements: https://dev.epicgames.com/documentation/realityscan-mobile/RealityScan-System-Requirements-and-Installation?lang=en-US
- Epic Games, RealityScan capture/upload/process workflow: https://dev.epicgames.com/documentation/realityscan-mobile/RealityScan-Step-by-Step-Guide
- Epic Games, RealityScan 1.5 on-device cropping and platform-specific downloads: https://dev.epicgames.com/documentation/realityscan-mobile/realityscan-1-5-version?lang=en-US
- Canva Engineering, published language choices across web and mobile, 5 October 2018: https://www.canva.dev/blog/engineering/why-well-always-be-exploring-new-programming-languages-at-canva/
- Canva Engineering, Cordova mobile drawing path and custom native input overlay, 14 March 2024: https://www.canva.dev/blog/engineering/behind-the-draw/
- Canva Engineering, Rust-to-WASM design renderer: https://www.canva.dev/blog/engineering/picking-color-via-eyedropper-on-web-app/
- Canva Engineering, WebGL image-filter pipeline: https://www.canva.dev/blog/engineering/alpha-blending-and-webgl/
- Canva Engineering, visual regression across browsers, directions, and widths: https://www.canva.dev/blog/engineering/why-we-left-manual-ui-testing-behind/
- Niantic/8th Wall Engineering, portable C++ vision/rendering modules with native and web frontends: https://info.nianticspatial.com/blog/building-the-next-generation-of-slam-for-the-browser

### Apple platform sources

- Apple Developer, AVCaptureVideoDataOutput: https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput
- Apple Developer, CVMetalTextureCache: https://developer.apple.com/documentation/CoreVideo/cvmetaltexturecache-q3j
- Apple Developer, AVCaptureMultiCamSession: https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession
- Apple Developer, Video technology overview and reader/writer pipeline: https://developer.apple.com/documentation/technologyoverviews/video
- Apple Developer, AVAssetWriterInputPixelBufferAdaptor: https://developer.apple.com/documentation/avfoundation/avassetwriterinputpixelbufferadaptor
- Apple Developer, PhotosPicker: https://developer.apple.com/documentation/photosui/photospicker
- Apple Developer, Metal: https://developer.apple.com/documentation/metal
- Apple Developer, Metal Performance Shaders: https://developer.apple.com/documentation/metalperformanceshaders
- Apple Developer, reducing Metal memory footprint: https://developer.apple.com/documentation/metal/reducing-the-memory-footprint-of-metal-apps
- Apple Developer, Core Image: https://developer.apple.com/documentation/coreimage
- Apple Developer, Core ML: https://developer.apple.com/documentation/CoreML
- Apple Developer, MLComputeUnits: https://developer.apple.com/documentation/coreml/mlcomputeunits
- Apple Developer, Depth Anything V2 model gallery: https://developer.apple.com/machine-learning/models/
- Apple/Hugging Face, Core ML Depth Anything V2 Small model card and measured inference: https://huggingface.co/apple/coreml-depth-anything-v2-small
- Depth Anything team, official V2 repository and license split: https://github.com/DepthAnything/Depth-Anything-V2
- Apple Developer, ARKit smoothed scene depth: https://developer.apple.com/documentation/arkit/arframe/smoothedscenedepth
- Apple Developer, displaying a point cloud using scene depth: https://developer.apple.com/documentation/arkit/displaying-a-point-cloud-using-scene-depth
- Apple Developer, AVCaptureDepthDataOutput: https://developer.apple.com/documentation/avfoundation/avcapturedepthdataoutput
- Apple Developer, streaming TrueDepth: https://developer.apple.com/documentation/avfoundation/streaming-depth-data-from-the-truedepth-camera
- Apple Developer, Vision person segmentation: https://developer.apple.com/documentation/vision/vngeneratepersonsegmentationrequest
- Apple Developer, Vision optical flow: https://developer.apple.com/documentation/vision/vngenerateopticalflowrequest
- Apple Developer, ProcessInfo thermal state: https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property
- Apple Developer, App Review Guidelines, live version: https://developer.apple.com/app-store/review/guidelines/

### Web and alternative-stack sources

- Vite, rationale for native-ESM development and hot-module replacement: https://vite.dev/guide/why.html
- Vite, TypeScript transpilation and separate type-checking behavior: https://vite.dev/guide/features.html#typescript
- MDN, WebGL and WebGL2 API overview and broad modern-browser availability: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API

- Capacitor v8 documentation, overview and web/native model: https://capacitorjs.com/docs
- Capacitor v8 documentation, Camera API: https://capacitorjs.com/docs/apis/camera
- Capacitor v8 documentation, custom native iOS code: https://capacitorjs.com/docs/ios/custom-code
- Capacitor v8 documentation, custom `CAPBridgeViewController`: https://capacitorjs.com/docs/ios/viewcontroller
- WebKit, “MediaRecorder API,” including `getUserMedia()` in `WKWebView`, 23 November 2020: https://webkit.org/blog/11353/mediarecorder-api/
- Apple Developer, `WKUIDelegate` media-capture permission decision: https://developer.apple.com/documentation/webkit/wkuidelegate/webview%28_%3Arequestmediacapturepermissionfor%3Ainitiatedbyframe%3Atype%3Adecisionhandler%3A%29
- WebKit, “WebKit Features in Safari 26.0,” 15 September 2025: https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- WebKit, “WebKit Features for Safari 26.2,” 12 December 2025: https://webkit.org/blog/17640/webkit-features-for-safari-26-2/
- WebKit, Safari 16.4 WebCodecs support, 27 March 2023: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/
- Chrome for Developers, WebGPU overview, updated 11 August 2025: https://developer.chrome.com/docs/web-platform/webgpu/overview
- MDN, WebGPU API, live documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MDN, getUserMedia, live documentation: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN, enumerateDevices, updated 30 November 2025: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
- W3C, WebCodecs Working Draft, 2026: https://www.w3.org/TR/webcodecs/
- MDN, canvas captureStream: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
- ONNX Runtime, Web tutorial and execution providers: https://onnxruntime.ai/docs/tutorials/web/
- ONNX Runtime, WebGPU Execution Provider: https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html
- ONNX Runtime Web, using the WebGPU execution provider: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- ONNX Runtime Web, performance diagnosis and provider guidance: https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html
- gfx-rs, wgpu official repository, v29 released 2 May 2026: https://github.com/gfx-rs/wgpu
- VisionCamera official repository/documentation: https://github.com/mrousavy/react-native-vision-camera
- Flutter, custom fragment shader documentation: https://docs.flutter.dev/ui/design/graphics/fragment-shaders

## Material limitations

- No competitor binary was decompiled or dynamically instrumented. Proprietary stacks, shader languages, render graphs, training data, model names, and on-device execution providers remain unknown unless first-party text disclosed them.
- App Store prices, rankings, ratings, version notes, and availability are volatile and region-specific; they are descriptive snapshots, not market-size estimates.
- No hands-on usability study or device benchmark was performed for this report. Competitor interface findings come from official descriptions, help pages, release notes, and one Apple editorial interview.
- Cross-platform “same look” judgments are based on published workflows, documentation, and product screenshots, not source-code access or controlled side-by-side usability tests. Where first-party engineering posts span several years, they are historical evidence of an architectural technique, not proof that every current screen still uses that stack.
- A synchronized account or visually similar UI does not reveal whether clients share code. The report distinguishes documented technologies from architectural inference and avoids naming proprietary frameworks where the vendor has not done so.
- Web camera enumeration cannot guarantee access to every physical phone lens. Browser and operating-system policy decide which devices and controls are exposed.
- The proposed effort sequence is not a staffing estimate. A measured feasibility spike is required before committing schedule or budget.
- Depth performance numbers come from Apple’s model card on specified model/device/OS configurations. End-to-end cadence will differ with preprocessing, scheduling, thermals, and simultaneous GPU load.
