# Fable World art direction

## Visual code

- Elevated three-quarter top-down camera, shared by the player, creatures, resources, and buildings.
- Premium stylized 3D rendering with painterly surfaces and chunky silhouettes that survive at 48–72 px.
- Industrial fantasy: worn iron, brass fasteners, leather harnesses, carved stone, living wood, and restrained cyan aether light.
- Dark textured terrain keeps bright creatures and production structures readable.
- Every creature remains recognizable from silhouette before color or UI labels are considered.

## Runtime assets

- `fables/fables-atlas-a.png`: the first ten Heartgrove, Mistfen, and Sundust species.
- `fables/fables-atlas-b.png`: ten Sundust, Emberpeak, and Starfrost species.
- `nova/ground-*.png`: five biome ground treatments adapted from the existing internal Fable Factory Nova set.
- `nova/build-*.png`: base structures using the same internal material language as Fable Factory.
- `nova/node-*.png`, `tree.png`, and `player.png`: detailed world objects and the explorer sprite.

## Generation prompt set

The two atlases were generated with the built-in image generation tool using the existing Fable Factory atlas as a style/camera reference only. Each prompt requested exactly ten original creatures in a 5×2 atlas, a consistent elevated camera, full-body silhouettes, industrial-fantasy details, neutral studio lighting, and a flat magenta chroma background. The prompts explicitly prohibited copied subjects, franchise characters, text, scenery, shadows, borders, and trademarks.

The chroma background was removed locally with the Imagegen skill's soft-matte/despill workflow. Runtime code samples cells directly from the two transparent atlases, avoiding twenty separate network requests.
