import './styles.css';
import { createEffect, createProject, EFFECT_CATEGORIES, EFFECTS, effectDefinition, isProject, normalizeProject, randomizeEffect, randomEffectStack } from './effects';
import { BUILTIN_RECIPES, instantiateRecipe } from './gallery';
import { WebGLRenderer } from './renderer';
import { cloneProject, deleteLook, deleteProject, loadLooks, loadProject, loadProjects, RANDOM_COUNT_KEY, saveLook, saveProject, saveProjectCopy } from './storage';
import type { EffectKind, EffectNodeV2, GalleryRecipe, ParameterKey, PointerState, ProjectV2 } from './types';

type ViewMode = 'capture' | 'design' | 'perform';

const icon = (name: string) => ({
  camera: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>',
  import: '<svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M4 19h16"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>',
  still: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3"/></svg>',
  random: '<svg viewBox="0 0 24 24"><path d="M4 7h3c5 0 5 10 10 10h3M17 14l3 3-3 3M4 17h3c2.2 0 3.5-1.9 4.7-4M17 4l3 3-3 3M13.2 9c1-1.2 2.1-2 3.8-2h3"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M5 8V4m0 0h4M5 4l3 3a7 7 0 1 1-2 7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg>',
}[name] ?? '');

class SynapsisApp extends HTMLElement {
  private project: ProjectV2 = loadProject();
  private projects: ProjectV2[] = loadProjects();
  private looks: GalleryRecipe[] = loadLooks();
  private renderer?: WebGLRenderer;
  private source?: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
  private stream?: MediaStream;
  private frameRequest = 0;
  private startTime = performance.now();
  private pointer: PointerState = { x: .5, y: .5, active: 0, velocity: 0 };
  private previousPointer = { x: .5, y: .5, time: performance.now() };
  private cameraDevices: MediaDeviceInfo[] = [];
  private currentDevice = 0;
  private recorder?: MediaRecorder;
  private recordingChunks: Blob[] = [];
  private demoCanvas = document.createElement('canvas');
  private demoContext = this.demoCanvas.getContext('2d')!;
  private lastFrameTime = performance.now();
  private measuredFps = 0;
  private randomCount = Math.max(1, Math.min(6, Number(localStorage.getItem(RANDOM_COUNT_KEY)) || 3));
  private expandedEffectId = this.project.nodes[0]?.id ?? '';
  private qualityScale = 1;
  private lowFpsWindows = 0;
  private highFpsWindows = 0;
  private lastQualityCheck = performance.now();

  connectedCallback(): void {
    this.innerHTML = `
      <main class="app-shell" data-mode="capture">
        <header class="topbar">
          <div class="brand"><span class="brand-mark"></span><span>SYNAPSIS</span><small>LOCAL / V2</small></div>
          <nav class="mode-switch" aria-label="Workspace">
            <button data-mode-button="capture" class="active" aria-label="Capture"><span class="mode-long">CAPTURE</span><span class="mode-short">CAP</span></button>
            <button data-mode-button="design" aria-label="Design"><span class="mode-long">DESIGN</span><span class="mode-short">DSN</span></button>
            <button data-mode-button="perform" aria-label="Perform"><span class="mode-long">PERFORM</span><span class="mode-short">PRF</span></button>
          </nav>
          <div class="telemetry"><span id="fps">-- FPS</span><span id="gpu">GPU / --</span><span class="local-indicator">● LOCAL</span></div>
        </header>

        <section class="workspace">
          <aside class="source-rail">
            <button class="tool-button" id="cameraButton" title="Start camera">${icon('camera')}<span>CAMERA</span></button>
            <button class="tool-button" id="flipButton" title="Switch camera">${icon('flip')}<span>FLIP</span></button>
            <button class="tool-button" id="importButton" title="Import local image or video">${icon('import')}<span>IMPORT</span></button>
            <input id="mediaInput" type="file" accept="image/*,video/*" hidden />
            <div class="rail-rule"></div>
            <button class="tool-button" id="galleryButton"><span class="text-icon">G</span><span>GALLERY</span></button>
            <button class="tool-button" id="presetsButton"><span class="text-icon">P</span><span>PROJECTS</span></button>
            <input id="projectInput" type="file" accept="application/json,.json" hidden />
          </aside>

          <section class="stage-column">
            <div class="stage" id="stage">
              <canvas id="outputCanvas" aria-label="Processed camera image"></canvas>
              <video id="sourceVideo" playsinline muted loop hidden></video>
              <div class="stage-grid" aria-hidden="true"></div>
              <div class="reticle" id="reticle"><i></i><i></i></div>
              <div class="stage-readout top"><span id="sourceLabel">DEMO SIGNAL</span><span>SDR / LIVE</span></div>
              <div class="stage-readout bottom"><span id="resolution">0000 × 0000</span><span id="qualityIndicator" hidden>QUALITY / 100%</span><span id="effectCount">02 NODES</span></div>
              <button class="start-overlay" id="startOverlay"><strong>OPEN CAMERA</strong><span>Frames remain on this device</span></button>
              <div class="message" id="message" role="status"></div>
            </div>
            <div class="transport">
              <button id="addEffectButton" class="transport-secondary">${icon('add')} ADD EFFECT</button>
              <div class="capture-controls">
                <button id="photoButton" class="capture-button still" aria-label="Take processed photo">${icon('still')}</button>
                <button id="recordButton" class="capture-button record" aria-label="Record processed video"><span></span></button>
              </div>
              <button id="randomizeButton" class="transport-secondary randomize" aria-label="Randomize effect stack. Long press to change count">${icon('random')} <span class="transport-label">RANDOMIZE · ${this.randomCount}</span></button>
              <button id="effectsButton" class="transport-secondary effects-toggle" aria-label="Open effect controls"><span class="transport-label">EFFECTS</span></button>
            </div>
            <div id="mobileEffectStrip" class="mobile-effect-strip" aria-label="Active effects"></div>
          </section>

          <aside class="rack-panel">
            <div class="drawer-grabber" aria-hidden="true"></div>
            <div class="panel-heading"><div><small>PATCH / ${this.escape(this.project.name)}</small><h1>FLAT EFFECT RACK</h1></div><div class="panel-actions"><button id="bypassAllButton">BYPASS</button><button id="saveLookButton">SAVE LOOK</button><button id="closeRackButton" class="mobile-only">DONE</button></div></div>
            <div id="rack" class="rack"></div>
          </aside>

          <section class="perform-panel" aria-label="Performance controls">
            <div class="performance-heading"><small>MACRO SURFACE</small><span>TOUCH + DRAG</span></div>
            <div id="macroGrid" class="macro-grid"></div>
          </section>
        </section>
      </main>

      <dialog id="effectDialog" class="instrument-dialog">
        <form method="dialog"><header><div><small>NODE LIBRARY</small><h2>ADD EFFECT</h2></div><button value="cancel" aria-label="Close">×</button></header></form>
        <div id="effectLibrary" class="effect-library"></div>
      </dialog>

      <dialog id="galleryDialog" class="instrument-dialog gallery-dialog">
        <form method="dialog"><header><div><small>FLAT STACK RECIPES</small><h2>INSPIRATION GALLERY</h2></div><button value="cancel" aria-label="Close">×</button></header></form>
        <div class="gallery-tabs"><button data-gallery-tab="builtin" class="active">BUILT-IN</button><button data-gallery-tab="local">MY LOOKS</button></div>
        <div id="galleryList" class="gallery-list"></div>
      </dialog>

      <dialog id="presetDialog" class="instrument-dialog">
        <form method="dialog"><header><div><small>ON-DEVICE STORAGE</small><h2>LOCAL PROJECTS</h2></div><button value="cancel" aria-label="Close">×</button></header></form>
        <div class="preset-actions"><button id="newProjectButton">NEW</button><button id="saveProjectButton">SAVE</button><button id="importProjectButton">IMPORT</button><button id="exportProjectButton">EXPORT</button></div>
        <div id="presetList" class="preset-list"></div>
      </dialog>

      <dialog id="randomDialog" class="instrument-dialog compact-dialog">
        <form method="dialog"><header><div><small>RANDOM PATCH</small><h2>STACK SIZE</h2></div><button value="cancel" aria-label="Close">×</button></header></form>
        <div class="random-settings">
          <label><span>NUMBER OF EFFECTS</span><output id="randomCountOutput">${this.randomCount}</output></label>
          <input id="randomCountInput" type="range" min="1" max="6" step="1" value="${this.randomCount}" />
          <div class="tick-row"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>
          <button id="applyRandomButton">CREATE RANDOM STACK</button>
        </div>
      </dialog>
    `;

    const canvas = this.querySelector<HTMLCanvasElement>('#outputCanvas')!;
    try {
      this.renderer = new WebGLRenderer(canvas);
    } catch (error) {
      this.showMessage(error instanceof Error ? error.message : 'GPU initialization failed.', true);
      return;
    }
    this.demoCanvas.width = 1280; this.demoCanvas.height = 720;
    this.source = this.demoCanvas;
    this.bindControls();
    this.renderEffectLibrary();
    this.renderRack();
    this.renderProjects();
    this.renderGallery('builtin');
    this.renderMacros();
    this.updateCapabilities();
    this.frameRequest = requestAnimationFrame(this.frame);
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this.frameRequest);
    this.stopStream();
    this.renderer?.destroy();
  }

  private bindControls(): void {
    this.querySelectorAll<HTMLButtonElement>('[data-mode-button]').forEach((button) => button.addEventListener('click', () => this.setMode(button.dataset.modeButton as ViewMode)));
    this.q('#cameraButton').addEventListener('click', () => void this.startCamera());
    this.q('#startOverlay').addEventListener('click', () => void this.startCamera());
    this.q('#flipButton').addEventListener('click', () => void this.flipCamera());
    this.q('#importButton').addEventListener('click', () => this.q<HTMLInputElement>('#mediaInput').click());
    this.q<HTMLInputElement>('#mediaInput').addEventListener('change', (event) => void this.importMedia((event.currentTarget as HTMLInputElement).files?.[0]));
    this.q('#addEffectButton').addEventListener('click', () => this.dialog('#effectDialog').showModal());
    this.q('#galleryButton').addEventListener('click', () => { this.renderGallery('builtin'); this.dialog('#galleryDialog').showModal(); });
    this.q('#presetsButton').addEventListener('click', () => this.dialog('#presetDialog').showModal());
    this.q('#saveLookButton').addEventListener('click', () => this.saveCurrentLook());
    this.q('#photoButton').addEventListener('click', () => void this.takePhoto());
    this.q('#recordButton').addEventListener('click', () => void this.toggleRecording());
    this.bindRandomizeButton();
    this.q('#effectsButton').addEventListener('click', () => this.toggleEffectEditor());
    this.q('#bypassAllButton').addEventListener('click', () => this.toggleAll());
    this.q('#closeRackButton').addEventListener('click', () => this.setMode('capture'));
    this.q('#exportProjectButton').addEventListener('click', () => void this.exportProject());
    this.q('#saveProjectButton').addEventListener('click', () => this.saveCurrentProject());
    this.q('#importProjectButton').addEventListener('click', () => this.q<HTMLInputElement>('#projectInput').click());
    this.q<HTMLInputElement>('#projectInput').addEventListener('change', (event) => void this.importProject((event.currentTarget as HTMLInputElement).files?.[0]));
    this.q('#newProjectButton').addEventListener('click', () => {
      this.project = createProject(); this.expandedEffectId = this.project.nodes[0]?.id ?? ''; this.persistAndRender(); this.dialog('#presetDialog').close(); this.showMessage('New local project created.');
    });
    this.querySelectorAll<HTMLButtonElement>('[data-gallery-tab]').forEach((button) => button.addEventListener('click', () => this.renderGallery(button.dataset.galleryTab === 'local' ? 'local' : 'builtin')));
    const randomInput = this.q<HTMLInputElement>('#randomCountInput');
    randomInput.addEventListener('input', () => {
      this.randomCount = Number(randomInput.value);
      this.q('#randomCountOutput').textContent = String(this.randomCount);
      localStorage.setItem(RANDOM_COUNT_KEY, String(this.randomCount));
      this.updateRandomButton();
    });
    this.q('#applyRandomButton').addEventListener('click', () => { this.randomizeEffects(); this.dialog('#randomDialog').close(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.lastFrameTime = performance.now(); this.renderer?.resetHistory(); } });
    const stage = this.q<HTMLElement>('#stage');
    stage.addEventListener('pointerdown', (event) => {
      if ((event.target as Element).closest('button')) return;
      stage.setPointerCapture(event.pointerId); this.updatePointer(event, 1);
    });
    stage.addEventListener('pointermove', (event) => { if (!(event.target as Element).closest('button') && event.buttons) this.updatePointer(event, 1); });
    stage.addEventListener('pointerup', (event) => {
      if ((event.target as Element).closest('button')) return;
      this.updatePointer(event, 0);
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    });
    stage.addEventListener('pointercancel', (event) => { if (!(event.target as Element).closest('button')) this.updatePointer(event, 0); });
  }

  private bindRandomizeButton(): void {
    const button = this.q<HTMLButtonElement>('#randomizeButton');
    let timer = 0;
    let longPress = false;
    const cancel = () => { if (timer) window.clearTimeout(timer); timer = 0; };
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      longPress = false;
      button.setPointerCapture(event.pointerId);
      timer = window.setTimeout(() => {
        longPress = true;
        button.classList.add('long-press');
        this.dialog('#randomDialog').showModal();
        navigator.vibrate?.(25);
      }, 560);
    });
    button.addEventListener('pointerup', () => {
      cancel(); button.classList.remove('long-press');
      if (!longPress) this.randomizeEffects();
    });
    button.addEventListener('pointercancel', () => { cancel(); button.classList.remove('long-press'); });
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private randomizeEffects(): void {
    const locked = this.project.nodes.filter((node) => node.locked);
    this.project.nodes = [...locked, ...randomEffectStack(this.randomCount)];
    this.expandedEffectId = this.project.nodes[0]?.id ?? '';
    this.persistAndRender();
    this.showMessage(`Random ${this.randomCount}-effect stack created.`);
    navigator.vibrate?.(12);
  }

  private updateRandomButton(): void {
    const label = this.q('#randomizeButton .transport-label');
    label.textContent = `RANDOMIZE · ${this.randomCount}`;
  }

  private frame = (now: number): void => {
    this.drawDemo(now);
    if (this.source && this.renderer && this.isSourceReady(this.source)) {
      try { this.renderer.render(this.source, this.project.nodes, this.pointer, (now - this.startTime) / 1000); }
      catch (error) { this.showMessage(error instanceof Error ? error.message : 'Render error.', true); }
    }
    const delta = now - this.lastFrameTime;
    if (delta > 0) this.measuredFps += ((1000 / delta) - this.measuredFps) * .05;
    this.lastFrameTime = now;
    if (Math.floor(now / 500) !== Math.floor((now - delta) / 500)) {
      this.q('#fps').textContent = `${Math.round(this.measuredFps).toString().padStart(2, '0')} FPS`;
      const canvas = this.q<HTMLCanvasElement>('#outputCanvas');
      this.q('#resolution').textContent = `${canvas.width} × ${canvas.height}`;
    }
    this.adaptQuality(now);
    this.pointer.velocity *= .9;
    this.frameRequest = requestAnimationFrame(this.frame);
  };

  private drawDemo(now: number): void {
    if (this.source !== this.demoCanvas) return;
    const ctx = this.demoContext, width = this.demoCanvas.width, height = this.demoCanvas.height;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#050505'); gradient.addColorStop(.55, '#1c1c1c'); gradient.addColorStop(1, '#000');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1;
    for (let x=0;x<width;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    for (let y=0;y<height;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    const t = now / 1000;
    for (let i=0;i<7;i++) {
      const x=width*(.12+i*.13)+Math.sin(t*(.3+i*.07))*50, y=height*(.5+Math.sin(i*1.7+t*.45)*.23), radius=35+i*8;
      ctx.fillStyle = i===3 ? '#ffffff' : `rgba(235,235,235,${.18+i*.055})`;
      ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#ffffff';ctx.font='700 64px ui-monospace, monospace';ctx.fillText('NO INPUT',70,100);
    ctx.fillStyle='#888888';ctx.font='24px ui-monospace, monospace';ctx.fillText('OPEN CAMERA OR IMPORT LOCAL MEDIA',74,142);
  }

  private adaptQuality(now: number): void {
    if (now - this.lastQualityCheck < 2000 || !this.renderer || this.measuredFps <= 0) return;
    this.lastQualityCheck = now;
    const target = matchMedia('(max-width: 900px)').matches ? 30 : 55;
    if (this.measuredFps < target * .78) { this.lowFpsWindows += 1; this.highFpsWindows = 0; }
    else if (this.measuredFps > target * .94) { this.highFpsWindows += 1; this.lowFpsWindows = 0; }
    else { this.lowFpsWindows = 0; this.highFpsWindows = 0; }
    if (this.lowFpsWindows >= 2 && this.qualityScale > .5) {
      this.qualityScale = Math.max(.5, this.qualityScale - .1); this.lowFpsWindows = 0;
    } else if (this.highFpsWindows >= 4 && this.qualityScale < 1) {
      this.qualityScale = Math.min(1, this.qualityScale + .1); this.highFpsWindows = 0;
    } else if (this.lowFpsWindows >= 3 && this.qualityScale <= .5) {
      const heaviest = [...this.project.nodes].filter((node) => node.enabled && !node.locked).sort((a, b) => (effectDefinition(b.kind).cost ?? 1) - (effectDefinition(a.kind).cost ?? 1))[0];
      if (heaviest) { heaviest.enabled = false; this.lowFpsWindows = 0; this.persistAndRender(); this.showMessage(`${effectDefinition(heaviest.kind).name} bypassed to recover frame rate.`); }
    }
    this.renderer.setQualityScale(this.qualityScale);
    const indicator = this.q<HTMLElement>('#qualityIndicator');
    indicator.hidden = this.qualityScale >= .999;
    indicator.textContent = `QUALITY / ${Math.round(this.qualityScale * 100)}%`;
  }

  private async startCamera(deviceId?: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) { this.showMessage('Camera access is unavailable in this context.', true); return; }
    this.showMessage('Requesting camera…');
    this.stopStream();
    try {
      const constraints: MediaStreamConstraints = { audio: false, video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = this.q<HTMLVideoElement>('#sourceVideo');
      video.srcObject = this.stream; video.hidden = true; video.muted = true; await video.play();
      this.source = video;
      this.cameraDevices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
      const activeId = this.stream.getVideoTracks()[0]?.getSettings().deviceId;
      this.currentDevice = Math.max(0, this.cameraDevices.findIndex((device) => device.deviceId === activeId));
      this.q('#sourceLabel').textContent = this.stream.getVideoTracks()[0]?.label?.toUpperCase() || 'LIVE CAMERA';
      this.q('#startOverlay').classList.add('hidden');
      this.renderer?.resetHistory();
      this.showMessage('Camera live. Processing stays on device.');
    } catch (error) {
      this.source = this.demoCanvas;
      this.q('#startOverlay').classList.remove('hidden');
      this.showMessage(error instanceof Error ? error.message : 'Camera permission failed.', true);
    }
  }

  private async flipCamera(): Promise<void> {
    if (!this.cameraDevices.length) { await this.startCamera(); return; }
    this.currentDevice = (this.currentDevice + 1) % this.cameraDevices.length;
    await this.startCamera(this.cameraDevices[this.currentDevice].deviceId);
  }

  private async importMedia(file?: File): Promise<void> {
    if (!file) return;
    this.stopStream();
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const video = this.q<HTMLVideoElement>('#sourceVideo');
      video.srcObject = null; video.src = url; video.loop = true; video.muted = true; video.playsInline = true; await video.play(); this.source = video;
    } else if (file.type.startsWith('image/')) {
      const image = new Image(); image.src = url; await image.decode(); this.source = image;
    } else { this.showMessage('Choose an image or video file.', true); return; }
    this.q('#sourceLabel').textContent = file.name.toUpperCase();
    this.q('#startOverlay').classList.add('hidden');
    this.renderer?.resetHistory();
    this.showMessage(`Loaded ${file.name} locally.`);
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
  }

  private renderEffectLibrary(): void {
    const library = this.q('#effectLibrary');
    let effectIndex = 0;
    library.innerHTML = EFFECT_CATEGORIES.map((category) => {
      const effects = EFFECTS.filter((effect) => effect.category === category.id);
      if (!effects.length) return '';
      const headingId = `effect-category-${category.id}`;
      const choices = effects.map((effect) => {
        effectIndex += 1;
        return `<button class="effect-choice" data-kind="${effect.kind}"><span>${String(effectIndex).padStart(2,'0')}</span><div><strong>${effect.name}</strong><small>${effect.description}</small></div><b>＋</b></button>`;
      }).join('');
      return `<section class="effect-section" aria-labelledby="${headingId}"><header class="effect-section-heading" id="${headingId}"><strong>${category.name}</strong><small>${category.description}</small></header>${choices}</section>`;
    }).join('');
    library.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((button) => button.addEventListener('click', () => {
      this.project.nodes.push(createEffect(button.dataset.kind as EffectKind));
      this.expandedEffectId = this.project.nodes.at(-1)?.id ?? '';
      this.persistAndRender(); this.dialog('#effectDialog').close(); this.setMode('design');
    }));
  }

  private renderRack(): void {
    const rack = this.q('#rack');
    if (this.project.nodes.length && !this.project.nodes.some((effect) => effect.id === this.expandedEffectId)) this.expandedEffectId = this.project.nodes[0].id;
    rack.innerHTML = this.project.nodes.length ? this.project.nodes.map((effect) => this.effectCard(effect)).join('') : '<div class="empty-state">NO ACTIVE NODES<br><small>ADD EFFECT TO BEGIN</small></div>';
    rack.querySelectorAll<HTMLElement>('[data-effect-id]').forEach((card) => this.bindEffectCard(card));
    this.q('#effectCount').textContent = `${String(this.project.nodes.length).padStart(2,'0')} NODES`;
    this.renderEffectStrip();
  }

  private effectCard(effect: EffectNodeV2): string {
    const definition = effectDefinition(effect.kind);
    const controls = definition.params.map((parameter) => {
      const value = effect.parameters[parameter.key];
      const display = parameter.format?.(value) ?? Number(value.toFixed(2)).toString();
      return `<label class="parameter"><span>${parameter.name}<output data-output="${parameter.key}">${display}</output></span><input data-param="${parameter.key}" type="range" min="${parameter.min}" max="${parameter.max}" step="${parameter.step}" value="${value}" /></label>`;
    }).join('');
    const charset = effect.kind === 'ascii' ? `<label class="charset"><span>CHARACTER SET</span><input data-charset value="${this.escape(effect.parameters.charset ?? '')}" maxlength="24" /></label>` : '';
    return `<article class="effect-card ${effect.enabled ? '' : 'disabled'} ${effect.id === this.expandedEffectId ? 'expanded' : ''}" data-effect-id="${effect.id}">
      <header><button data-toggle aria-label="Toggle ${definition.name}" title="Toggle effect"><i></i></button><div class="effect-title"><h3>${definition.name}</h3></div><div class="node-actions"><button data-lock class="${effect.locked ? 'active' : ''}" aria-label="${effect.locked ? 'Unlock' : 'Lock'} ${definition.name}" title="${effect.locked ? 'Unlock' : 'Lock'}">L</button><button data-duplicate aria-label="Duplicate ${definition.name}" title="Duplicate">⧉</button><button data-reset aria-label="Reset ${definition.name}" title="Reset">${icon('reset')}</button><button data-randomize aria-label="Randomize ${definition.name}" title="Randomize">${icon('random')}</button><button class="expand-control" data-expand aria-label="Show ${definition.name} controls" aria-expanded="${effect.id === this.expandedEffectId}" title="Effect controls">${icon('chevron')}</button><button data-move="-1" aria-label="Move ${definition.name} up" title="Move up">↑</button><button data-move="1" aria-label="Move ${definition.name} down" title="Move down">↓</button><button data-remove aria-label="Remove ${definition.name}" title="Delete">×</button></div></header>
      <div class="parameters">${controls}${charset}</div>
    </article>`;
  }

  private bindEffectCard(card: HTMLElement): void {
    const id = card.dataset.effectId!;
    const locate = () => this.project.nodes.find((effect) => effect.id === id)!;
    const replace = (replacement: EffectNodeV2, message: string) => {
      const index = this.project.nodes.findIndex((effect) => effect.id === id);
      if (index < 0) return;
      const current = this.project.nodes[index];
      replacement.id = current.id;
      replacement.enabled = current.enabled;
      replacement.locked = current.locked;
      replacement.seed = current.seed;
      this.project.nodes[index] = replacement;
      this.expandedEffectId = id;
      this.persistAndRender();
      this.showMessage(message);
    };
    card.querySelector<HTMLButtonElement>('[data-expand]')!.addEventListener('click', () => {
      this.expandedEffectId = this.expandedEffectId === id ? '' : id;
      this.renderRack();
      requestAnimationFrame(() => this.querySelector<HTMLElement>(`[data-effect-id="${id}"]`)?.scrollIntoView({ block: 'nearest' }));
    });
    card.querySelector<HTMLButtonElement>('[data-toggle]')!.addEventListener('click', () => { locate().enabled = !locate().enabled; this.persistAndRender(); });
    card.querySelector<HTMLButtonElement>('[data-reset]')!.addEventListener('click', () => replace(createEffect(locate().kind), `${effectDefinition(locate().kind).name} reset.`));
    card.querySelector<HTMLButtonElement>('[data-randomize]')!.addEventListener('click', () => replace(randomizeEffect(locate().kind), `${effectDefinition(locate().kind).name} randomized.`));
    card.querySelector<HTMLButtonElement>('[data-lock]')!.addEventListener('click', () => { locate().locked = !locate().locked; this.persistAndRender(); });
    card.querySelector<HTMLButtonElement>('[data-duplicate]')!.addEventListener('click', () => {
      const index = this.project.nodes.findIndex((node) => node.id === id), duplicate = structuredClone(locate());
      duplicate.id = crypto.randomUUID(); duplicate.seed = crypto.getRandomValues(new Uint32Array(1))[0]; duplicate.locked = false;
      this.project.nodes.splice(index + 1, 0, duplicate); this.expandedEffectId = duplicate.id; this.persistAndRender();
    });
    card.querySelector<HTMLButtonElement>('[data-remove]')!.addEventListener('click', () => { this.project.nodes = this.project.nodes.filter((effect) => effect.id !== id); this.persistAndRender(); });
    card.querySelectorAll<HTMLButtonElement>('[data-move]').forEach((button) => button.addEventListener('click', () => {
      const from = this.project.nodes.findIndex((effect) => effect.id === id), to = Math.max(0, Math.min(this.project.nodes.length - 1, from + Number(button.dataset.move)));
      const [effect] = this.project.nodes.splice(from, 1); this.project.nodes.splice(to, 0, effect); this.persistAndRender();
    }));
    card.querySelectorAll<HTMLInputElement>('[data-param]').forEach((input) => input.addEventListener('input', () => {
      const effect = locate(), key = input.dataset.param as ParameterKey; effect.parameters[key] = Number(input.value);
      const definition = effectDefinition(effect.kind).params.find((parameter) => parameter.key === key)!;
      card.querySelector<HTMLOutputElement>(`[data-output="${key}"]`)!.textContent = definition.format?.(effect.parameters[key]) ?? Number(effect.parameters[key].toFixed(2)).toString();
      saveProject(this.project);
    }));
    card.querySelector<HTMLInputElement>('[data-charset]')?.addEventListener('input', (event) => { locate().parameters.charset = (event.currentTarget as HTMLInputElement).value; saveProject(this.project); });
  }

  private renderEffectStrip(): void {
    const strip = this.q('#mobileEffectStrip');
    strip.innerHTML = this.project.nodes.length
      ? `<button class="strip-label" data-open-rack>FX ${this.project.nodes.length}</button>${this.project.nodes.map((effect, index) => `<button class="effect-chip ${effect.enabled ? '' : 'disabled'}" data-chip-id="${effect.id}"><span>${String(index + 1).padStart(2, '0')}</span>${this.escape(effectDefinition(effect.kind).name)}</button>`).join('')}`
      : '<button class="strip-label" data-add-empty>＋ ADD EFFECT</button>';
    strip.querySelector<HTMLElement>('[data-open-rack]')?.addEventListener('click', () => this.setMode('design'));
    strip.querySelector<HTMLElement>('[data-add-empty]')?.addEventListener('click', () => this.dialog('#effectDialog').showModal());
    strip.querySelectorAll<HTMLButtonElement>('[data-chip-id]').forEach((chip) => chip.addEventListener('click', () => {
      this.expandedEffectId = chip.dataset.chipId!;
      this.renderRack();
      this.setMode('design');
      requestAnimationFrame(() => this.querySelector<HTMLElement>(`[data-effect-id="${this.expandedEffectId}"]`)?.scrollIntoView({ block: 'nearest' }));
    }));
  }

  private renderMacros(): void {
    const macroGrid = this.q('#macroGrid');
    const effectSlots = this.project.nodes.slice(0, 4);
    macroGrid.innerHTML = Array.from({ length: 4 }, (_, index) => {
      const effect = effectSlots[index];
      return `<button class="macro-pad" data-macro="${index}" ${effect ? '' : 'disabled'}><small>MACRO ${index+1}</small><strong>${effect ? effectDefinition(effect.kind).name : 'UNASSIGNED'}</strong><span>${effect ? Math.round(effect.parameters.p0 * 100) : '—'}</span></button>`;
    }).join('');
    macroGrid.querySelectorAll<HTMLButtonElement>('[data-macro]').forEach((pad) => {
      const index = Number(pad.dataset.macro), effect = effectSlots[index]; if (!effect) return;
      const definition = effectDefinition(effect.kind).params[0];
      const set = (event: PointerEvent) => {
        const rect = pad.getBoundingClientRect(), normalized = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        effect.parameters.p0 = definition.min + normalized * (definition.max - definition.min); pad.querySelector('span')!.textContent = Math.round(normalized * 100).toString(); saveProject(this.project);
      };
      pad.addEventListener('pointerdown', (event) => { pad.setPointerCapture(event.pointerId); set(event); });
      pad.addEventListener('pointermove', (event) => { if (event.buttons) set(event); });
    });
  }

  private renderGallery(tab: 'builtin' | 'local'): void {
    this.querySelectorAll<HTMLButtonElement>('[data-gallery-tab]').forEach((button) => button.classList.toggle('active', button.dataset.galleryTab === tab));
    const recipes = tab === 'builtin' ? [...BUILTIN_RECIPES] : this.looks;
    const list = this.q('#galleryList');
    list.innerHTML = recipes.length ? recipes.map((recipe, index) => {
      const names = recipe.nodes.map((node) => effectDefinition(node.kind).name).join(' → ');
      return `<article class="gallery-card" data-recipe-index="${index}"><header><div><small>${this.escape(recipe.creator)} / ${recipe.nodes.length} NODES</small><strong>${this.escape(recipe.title)}</strong></div>${tab === 'local' ? '<button data-delete-look aria-label="Delete look">×</button>' : ''}</header><p>${this.escape(recipe.description)}</p><div class="recipe-chain">${this.escape(names)}</div><footer><button data-apply-recipe="replace">USE</button><button data-apply-recipe="append">APPEND</button></footer></article>`;
    }).join('') : '<div class="empty-state">NO SAVED LOOKS<br><small>SAVE THE CURRENT FLAT STACK FROM DESIGN MODE</small></div>';
    list.querySelectorAll<HTMLElement>('[data-recipe-index]').forEach((card) => {
      const index = Number(card.dataset.recipeIndex), recipe = recipes[index];
      card.querySelectorAll<HTMLButtonElement>('[data-apply-recipe]').forEach((button) => button.addEventListener('click', () => this.applyRecipe(recipe, button.dataset.applyRecipe === 'append' ? 'append' : 'replace')));
      card.querySelector<HTMLButtonElement>('[data-delete-look]')?.addEventListener('click', () => { this.looks = deleteLook(index); this.renderGallery('local'); });
    });
  }

  private applyRecipe(recipe: GalleryRecipe, mode: 'replace' | 'append'): void {
    const nodes = instantiateRecipe(recipe);
    this.project.nodes = mode === 'append' ? [...this.project.nodes, ...nodes] : nodes;
    this.project.name = recipe.title;
    this.expandedEffectId = nodes[0]?.id ?? '';
    this.persistAndRender();
    this.dialog('#galleryDialog').close();
    this.setMode('design');
    this.showMessage(`${recipe.title} ${mode === 'append' ? 'appended' : 'loaded'} as ${nodes.length} editable nodes.`);
  }

  private renderProjects(): void {
    const list = this.q('#presetList');
    list.innerHTML = this.projects.length ? this.projects.map((project, index) => `<article><button data-load="${index}"><small>${String(index+1).padStart(2,'0')} / ${project.nodes.length} NODES</small><strong>${this.escape(project.name)}</strong></button><button data-delete="${index}" aria-label="Delete project">×</button></article>`).join('') : '<div class="empty-state">NO SAVED PROJECTS<br><small>EVERYTHING REMAINS ON THIS DEVICE</small></div>';
    list.querySelectorAll<HTMLButtonElement>('[data-load]').forEach((button) => button.addEventListener('click', () => { this.project = cloneProject(this.projects[Number(button.dataset.load)]); this.persistAndRender(); this.dialog('#presetDialog').close(); }));
    list.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((button) => button.addEventListener('click', () => { this.projects = deleteProject(Number(button.dataset.delete)); this.renderProjects(); }));
  }

  private saveCurrentProject(): void {
    const name = prompt('Project name', this.project.name);
    if (!name) return;
    this.project.name = name.slice(0, 60);
    saveProject(this.project);
    this.projects = saveProjectCopy(this.project);
    this.renderProjects();
    this.showMessage('Project copy saved on this device.');
  }

  private saveCurrentLook(): void {
    const name = prompt('Look name', this.project.name);
    if (!name) return;
    this.looks = saveLook(this.project, name); this.renderGallery('local'); this.showMessage('Look saved on this device.');
  }

  private async takePhoto(): Promise<void> {
    if (!this.renderer) return;
    try { await this.saveBlob(await this.renderer.snapshot(), `synapsis-${this.timestamp()}.png`); this.flashStage(); }
    catch (error) { this.showMessage(error instanceof Error ? error.message : 'Photo failed.', true); }
  }

  private async toggleRecording(): Promise<void> {
    if (this.recorder?.state === 'recording') { this.recorder.stop(); return; }
    const canvas = this.q<HTMLCanvasElement>('#outputCanvas');
    if (!canvas.captureStream || !globalThis.MediaRecorder) { this.showMessage('Processed video recording is unavailable here. Still capture works.', true); return; }
    const mimeTypes = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
    const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
    try {
      this.recordingChunks = [];
      this.recorder = new MediaRecorder(canvas.captureStream(30), mimeType ? { mimeType } : undefined);
      this.recorder.ondataavailable = (event) => { if (event.data.size) this.recordingChunks.push(event.data); };
      this.recorder.onstop = () => void this.finishRecording(this.recorder?.mimeType || mimeType || 'video/webm');
      this.recorder.start(500);
      this.q('#recordButton').classList.add('recording'); this.q('.app-shell').classList.add('is-recording'); this.showMessage('Recording processed video locally…');
    } catch (error) { this.showMessage(error instanceof Error ? error.message : 'Recording failed.', true); }
  }

  private async finishRecording(mimeType: string): Promise<void> {
    this.q('#recordButton').classList.remove('recording'); this.q('.app-shell').classList.remove('is-recording');
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    await this.saveBlob(new Blob(this.recordingChunks, { type: mimeType }), `synapsis-${this.timestamp()}.${extension}`);
    this.showMessage('Recording complete.');
  }

  private async exportProject(): Promise<void> {
    await this.saveBlob(new Blob([JSON.stringify(this.project, null, 2)], { type: 'application/json' }), `synapsis-project-${this.timestamp()}.json`);
  }

  private async importProject(file?: File): Promise<void> {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isProject(parsed)) throw new Error('This is not a valid Synapsis v2 project.');
      this.project = normalizeProject(parsed); this.persistAndRender(); this.dialog('#presetDialog').close(); this.showMessage('Project imported locally.');
    } catch (error) { this.showMessage(error instanceof Error ? error.message : 'Project import failed.', true); }
  }

  private async saveBlob(blob: Blob, filename: string): Promise<void> {
    const file = new File([blob], filename, { type: blob.type });
    const shareData = { files: [file], title: filename };
    const native = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    if (native && navigator.share && (!navigator.canShare || navigator.canShare(shareData))) { await navigator.share(shareData); return; }
    const url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  private setMode(mode: ViewMode): void {
    this.q('.app-shell').setAttribute('data-mode', mode);
    this.querySelectorAll<HTMLButtonElement>('[data-mode-button]').forEach((button) => {
      const active = button.dataset.modeButton === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const effectsButton = this.q<HTMLButtonElement>('#effectsButton');
    effectsButton.classList.toggle('active', mode === 'design');
    effectsButton.setAttribute('aria-pressed', String(mode === 'design'));
  }

  private toggleEffectEditor(): void {
    const current = this.q('.app-shell').getAttribute('data-mode');
    this.setMode(current === 'design' ? 'capture' : 'design');
  }

  private toggleAll(): void {
    const shouldEnable = this.project.nodes.every((effect) => !effect.enabled);
    this.project.nodes.forEach((effect) => { effect.enabled = shouldEnable; }); this.persistAndRender();
    this.q('#bypassAllButton').textContent = shouldEnable ? 'BYPASS' : 'ENABLE';
  }

  private persistAndRender(): void { saveProject(this.project); this.renderRack(); this.renderMacros(); this.renderer?.resetHistory(); }

  private updatePointer(event: PointerEvent, active: number): void {
    const rect = this.q('#stage').getBoundingClientRect(), now = performance.now();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = 1 - Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const distance = Math.hypot(x - this.previousPointer.x, y - this.previousPointer.y), delta = Math.max(1, now - this.previousPointer.time);
    this.pointer = { x, y, active, velocity: Math.min(4, distance / delta * 800) };
    this.previousPointer = { x, y, time: now };
    const reticle = this.q('#reticle'); reticle.style.left = `${x*100}%`; reticle.style.top = `${(1-y)*100}%`; reticle.classList.toggle('active', Boolean(active));
  }

  private updateCapabilities(): void {
    this.q('#gpu').textContent = `GPU / WEBGL2${'gpu' in navigator ? ' + WEBGPU' : ''}`;
  }

  private showMessage(message: string, error = false): void {
    const element = this.q('#message'); element.textContent = message; element.classList.toggle('error', error); element.classList.add('visible');
    window.setTimeout(() => element.classList.remove('visible'), 3200);
  }

  private flashStage(): void { const stage = this.q('#stage'); stage.classList.add('flash'); setTimeout(() => stage.classList.remove('flash'), 140); }
  private timestamp(): string { return new Date().toISOString().replace(/[:.]/g, '-'); }
  private isSourceReady(source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): boolean { return source instanceof HTMLVideoElement ? source.readyState >= 2 : source instanceof HTMLImageElement ? source.complete : true; }
  private q<T extends Element = HTMLElement>(selector: string): T { return this.querySelector<T>(selector)!; }
  private dialog(selector: string): HTMLDialogElement { return this.q<HTMLDialogElement>(selector); }
  private escape(value: string): string { const element = document.createElement('span'); element.textContent = value; return element.innerHTML; }
}

customElements.define('synapsis-app', SynapsisApp);
