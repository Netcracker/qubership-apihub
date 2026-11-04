// Escape closes only the innermost open layer: a menu inside the settings panel, or a popover inside a dialog, closes
// before the layer around it (QUAL-3). Layers register in the order they open.

const layers: (() => void)[] = [];

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !layers.length) return;
  layers[layers.length - 1]();
}

// Returns the function that removes the layer again.
export function onEscape(close: () => void): () => void {
  if (!layers.length) document.addEventListener('keydown', onKeyDown);
  layers.push(close);
  return () => {
    const index = layers.lastIndexOf(close);
    if (index >= 0) layers.splice(index, 1);
    if (!layers.length) document.removeEventListener('keydown', onKeyDown);
  };
}
