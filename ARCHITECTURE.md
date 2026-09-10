# Synapsis v2 architecture

## Invariants

1. A project contains one ordered `nodes` array.
2. Every node accepts the current image and produces the next image.
3. Nodes never contain other nodes, recipes, or hidden pipelines.
4. Gallery recipes are authoring templates. Applying one creates ordinary independent nodes.
5. Camera frames and imported media remain on the device.

## Runtime flow

```text
camera / image / video
        ↓
flat node stack
        ↓
WebGL2 ping-pong renderer
        ↓
preview / capture / recording
```

The current renderer uses one WebGL2 source texture and two reusable intermediate textures. Temporal nodes receive a history texture keyed by their node ID, preventing one feedback node from overwriting another node's memory. Deleted node histories are released on the next render.

`EffectDefinition` is the catalog contract: display metadata, category, four normalized controls, capability flags, and cost. `EffectNodeV2` is saved state: identity, kind, bypass and lock states, deterministic seed, and parameter values.

Shared analysis and a future WebGPU backend may be added as renderer internals, but they must not change the flat project format or introduce visible branching.

## Local persistence

- `synapsis.current.v2`: active project
- `synapsis.projects.v2`: named project copies
- `synapsis.looks.v2`: user-authored flat recipes
- `synapsis.random-count.v2`: random stack length

Earlier storage namespaces are intentionally not read or migrated.

## Quality policy

The preview starts at full device resolution, capped at 2× device pixel ratio. Sustained low frame rate reduces the render scale in 10% steps to a 50% floor. Recovery uses a longer hysteresis window before increasing quality. Project parameters never change when preview quality changes.

## Backend boundary

WebGL2 is required for every shipping node. A future WebGPU implementation must render an entire active stack; Synapsis does not mix WebGL2 and WebGPU textures during one frame. Backend differences should be covered by fixed-input, fixed-seed visual fixtures.
