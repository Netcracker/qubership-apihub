# Architecture model

The sources of the APIHUB architecture model. One Python file, `capability/model.py`, holds the capability map, the
containers, and the ArchiMate elements. The generators here turn it into the capability map on the landing site, the
architecture deck, the ArchiMate model, and the draw.io, Markdown, and slide versions of the capability set. The C4 set
has its own hand-written source, `c4/APIHUB_C4_architecture.md`.

Generated files are not committed; [`.gitignore`](.gitignore) lists them. Run each generator from its own folder.

## Folders

| Folder | Sources | Generates |
|---|---|---|
| `capability/` | `model.py`, `export_json.py`, `gen_md.py`, `gen_drawio.py`, `drawio_base.py`, `gen_archi.py`, `gen_pptx.js` | Landing data, Markdown, draw.io, Archi model, 17-slide deck |
| `c4/` | `APIHUB_C4_architecture.md`, `gen_drawio.py`, `gen_pptx.js` | draw.io pages, 36-slide deck |
| `deck/` | `gen.js`, `lib.js` | 26-slide architecture deck (C4 plus the capability map) |
| `summary/` | `gen.js` | 21-slide visual summary |

`c4/APIHUB_C4_architecture.md` is both a source and a deliverable: edit it by hand. Its Mermaid diagrams are the input
of the PNG files that the C4 deck uses.

## Landing site data

`capability/export_json.py` writes `model.py` as JSON. By default it overwrites
`sites/landing/src/data/capability-model.json`, which the landing site imports:

```bash
python -I tools/architecture-model/capability/export_json.py
```

Edit `model.py`, run the exporter, and commit both files. Do not edit the JSON by hand. The output keeps the key names
and key order that `sites/landing/src/data/architecture.ts` expects.

The two deck generators read `model.json` from their current folder. Write it there with `--out`:

```bash
cd tools/architecture-model/capability
python -I export_json.py --out model.json
```

## Regenerate the outputs

The Python generators need Python 3 and no packages. They read `model.py` from `capability/` and write into the
current folder.

```bash
cd tools/architecture-model/capability
python gen_md.py       # APIHUB_capability_architecture.md
python gen_drawio.py   # APIHUB_capability_architecture.drawio
python gen_archi.py    # APIHUB_capability_model.archimate

cd ../c4
python gen_drawio.py   # APIHUB_C4_architecture.drawio, written next to the script
```

The `.js` generators build native PowerPoint shapes with [pptxgenjs](https://gitbrent.github.io/PptxGenJS/). Install it
outside the repository, so it does not touch the pnpm workspace:

```bash
mkdir -p "$TMPDIR/pptx" && cd "$TMPDIR/pptx" && npm i --no-save pptxgenjs
export NODE_PATH="$PWD/node_modules"
```

Then run a generator from its folder:

- `deck/`: export the data with `python -I ../capability/export_json.py --out model.json`, then `node gen.js` writes
  `APIHUB_architecture_deck.pptx`.
- `summary/`: `node gen.js` writes `APIHUB_visual_summary.pptx`. It needs no data file.
- `capability/`: `node gen_pptx.js` writes `APIHUB_capability_architecture.pptx`. It needs `model.json` and two PNG
  files in `png_slides/` (`A1_layered.png`, `A2_realization.png`).

`c4/gen_pptx.js` writes `APIHUB_C4_architecture.pptx` and expects the rendered diagrams in `c4/png_slides/`.

## Rendered diagrams

The C4 deck and the capability deck embed PNG files of Mermaid diagrams. Render them with
[mermaid-cli](https://github.com/mermaid-js/mermaid-cli): extract a diagram from the Markdown into a `.mmd` file, then
run `npx -y @mermaid-js/mermaid-cli -i L1_context.mmd -o png_slides/L1_context.png`. The file names the decks expect are
in the `fitImage` calls of `c4/gen_pptx.js` and `capability/gen_pptx.js`.

## Keep the facts current

Versions and module names in the model come from the monorepo: `backend/.go-version`, the `FROM` line of
`frontend/ui/Dockerfile`, and `frontend/build-task-consumer/package.json`. When one of them changes, update the text in
`model.py`, the generators, and `c4/APIHUB_C4_architecture.md`, then rerun the exporter.
