"""
Example automation script — run it with File › Scripts › Run Python Script…

`app` (a brushboard.Context) is injected; you can also `import brushboard` and use `brushboard.app`.
Define main(app) or set RESULT to report back to the UI.
"""
import numpy as np


def main(app):
    doc = app.document
    if doc is None:
        # create a new document with a warm vellum gradient
        h, w = 800, 1200
        y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
        img = np.zeros((h, w, 4), np.float32)
        img[..., 0] = 0.95 - 0.25 * y
        img[..., 1] = 0.90 - 0.30 * y
        img[..., 2] = 0.80 - 0.35 * y
        img[..., 3] = 1
        app.new_document(img, name="Vellum")
        return "Created a new vellum document"
    # otherwise: add a 50% gray overlay layer set to Soft Light for dodge & burn
    h, w = doc["height"], doc["width"]
    gray = np.full((h, w, 4), 0.5, np.float32)
    gray[..., 3] = 1
    app.add_layer(gray, name="Dodge & Burn", blend="softLight")
    app.message("Paint white/black on the 'Dodge & Burn' layer with a soft low-flow brush.")
    return "Added a dodge & burn layer"
