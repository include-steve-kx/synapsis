# Synapsis

Synapsis is a local-only creative camera instrument for iPhone and the web. It is built with framework-free TypeScript, Vite, WebGL2, and Capacitor. Camera frames, imported media, projects, looks, captures, and recordings remain on the current device.

## Flat effect system

The renderer is deliberately simple: the camera or imported media passes through one ordered, flat list of nodes. Every node consumes the previous image and produces the next image. There are no nested nodes or hidden compound pipelines.

Synapsis v2 includes 47 stackable effects organized into six library sections:

- Trace / Print
- Pixel / Structure
- Color / Light
- Space / Optics
- Time / Signal
- Organic / Systems

Alongside familiar processes such as pixel sorting, dithering, ASCII, slit scan, datamosh, halftone, and glitch, the library includes abstract primitives such as Measure, Difference, Fold, Divide, Cells, Gate, Soften, Displace, Palette, Quantize, Contour, Path, Melt, Culture, Life, Grain, Trails, and Assembly.

The Inspiration Gallery contains built-in compound looks represented as ordinary flat recipes. Loading or appending a recipe creates independently editable nodes in the rack. Save any current stack to My Looks for local reuse.

## Interface

- **Capture** keeps the camera and capture controls prominent.
- **Design** opens the ordered effect rack and detailed controls.
- **Perform** exposes the first parameter of the first four nodes as large touch controls.
- Tap **Randomize** to create a new stack. Press and hold it to choose 1–6 random nodes. Locked nodes survive randomization.
- Each rack node supports bypass, lock, duplicate, reset, randomize, expand, reorder, and delete.
- On phones, tap an active-effect chip to open that node directly.

The UI stays monochrome and overlays the full-bleed canvas. White/black inversion communicates pressed and selected states; red is reserved for recording and amber for warnings.

## Start and stop the web app

```sh
cd ~/Desktop/github-projects/synapsis
npm install
npm run dev
```

Open <http://localhost:5173>, choose **Open Camera**, and approve camera access.

Stop the server by returning to its Terminal window and pressing **Control-C**.

## Validate a change

```sh
npm test
npm run build
```

The production website is generated in `dist/`. These commands do not publish it.

## Run on iPhone

Connect the iPhone, unlock it, and run:

```sh
cd ~/Desktop/github-projects/synapsis
npm run ios:sync
npm run ios:open
```

Select the **Synapsis** scheme and the connected phone in Xcode, then press Run. The application identifier is `studio.synapsis.camera`.

The Capacitor application uses the same web interface and WebGL2 renderer as the website. Processed video recording depends on `canvas.captureStream()` and `MediaRecorder` support in the current WebView; still capture and project export use the native share sheet when available.

## Current implementation notes

- WebGL2 is the compatibility baseline. A renderer boundary leaves room for a future all-WebGPU backend.
- Temporal effects keep history per node, so multiple feedback processes do not share or overwrite one global history buffer.
- Preview resolution adapts between 50% and 100% when sustained frame rate drops, while project parameters remain unchanged.
- Depth-like displacement is currently image-derived; LiDAR is not required. Monocular ML depth remains a later performance-gated module.
- Jump Field and Seam Melt are real-time visual interpretations of jump flooding and seam carving, not full offline solvers.
- Processed recordings currently contain no microphone audio.

## License

MIT
