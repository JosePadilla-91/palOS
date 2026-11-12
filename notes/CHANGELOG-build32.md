# palOS 27 Clownfish — build 32

Build 31 plus the changes below.

## BrushBoard 1.8: Marionette (puppet warp)
**Edit › Marionette** bends a layer like a puppet. Pin the parts that should stay, drag the others.

- **Pins:** click on the picture to add one, then drag it. Shift-click selects several, and dragging any of them moves them all. Alt-click a pin, or press Delete, to remove it. Enter commits; Esc cancels.
- **Mode:**
  - **Rigid:** parts keep their shape and size, like stiff card.
  - **Normal:** parts bend and stretch a little.
  - **Distort:** parts stretch and grow freely.
- **Density:** Fewer Points, Normal or More Points, for a coarser or finer mesh. **Expansion** grows the mesh past the layer's edges. **Show Mesh** turns the mesh drawing on or off.
- **Pin depth:** where parts cross, ⬆ brings the part around the selected pins in front and ⬇ sends it behind.
- **Rotate around a pin:** Alt-drag beside a pin to turn the part around it. That pin's rotation becomes **Fixed** and shows its angle; you can also type it in the options bar, or set it back to **Auto**. Shift snaps to 15°.
- **Reopen and keep warping:**
  - after you commit, Edit › Marionette on the same layer brings back every pin where you left it;
  - this works through undo and redo, and after saving and reopening a `.brb` file, which stores the pins and the layer's original pixels;
  - if you've painted on the layer since, the old pins would undo that painting, so Marionette starts fresh on the current pixels instead.
- **Selections:** with a selection active, only the selected pixels are warped.
- **Undo:** one undo step per warp. Text and shape layers become pixel layers when warped.
- **How it works:**
  - the mesh follows the layer's actual shape;
  - the solver is the as-rigid-as-possible method from Igarashi et al. (2005), with each pin placed exactly inside its triangle;
  - the picture is drawn on the GPU with BrushBoard's own high-quality bicubic sampling, so edges stay smooth;
  - dragging re-solves every frame.
- **Languages:** Marionette's text is in English and French (Canada) ("Marionnette"). Other languages show it in English until they're translated.

**BrushBoard's source:** the original TypeScript project is gone. `BrushBoard-1.8.0-source.tar.gz` is the code that actually ships, unpacked and formatted, with every fix since included. Future BrushBoard work starts from it.

## Time Turner
- The logo in the window (title bar 30 px, welcome 44 px, progress 104 px) now uses copies made at exactly those sizes, plus double-size copies for scaled screens. It used to shrink the 512-pixel image in one step, which made its rim jagged.

## Tested in a test copy of this build
- **Marionette:**
  - the mesh follows a test figure's shape;
  - pins on the body, shoulders and feet held while an arm was dragged up; it bent smoothly, with a line inside it bending along and no seams or jagged edges;
  - an arm swung across the body went behind it, then in front after Bring Forward;
  - Alt-drag turned a hand 70°, shown as Rotate: Fixed, 70.2°;
  - Rigid, Normal and Distort all render;
  - Commit, Undo and Redo work;
  - reopening brought back all pins after undo and redo, and after quitting BrushBoard and reopening the saved `.brb`;
  - after painting on the layer, reopening started fresh.
- **Time Turner:** the logo's rim is smooth at 44 px when zoomed in.

## Your package repo
No packaged files changed. BrushBoard.app and Time Turner.app are app bundles, and `usr/share/palos/l10n/fr-CA.json` (21 new lines) isn't in any package; all three only arrive through the ISO.
