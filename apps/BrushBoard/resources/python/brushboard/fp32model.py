"""Turn a weight-quantized ONNX model (DequantizeLinear on constant weights, including block-wise int8)
into a plain float32 model with the same weights. GPU runtimes cannot run block-wise dequantization;
the float model computes exactly what the CPU computes after dequantizing.

Run as: python -m brushboard.fp32model SRC DST   (needs the `onnx` package, installed with a GPU pack)."""
from __future__ import annotations

import sys

import numpy as np


def convert(src: str, dst: str) -> dict:
    import onnx
    from onnx import numpy_helper

    m = onnx.load(src)
    g = m.graph
    init = {i.name: i for i in g.initializer}
    keep = []
    done = 0
    for node in g.node:
        if node.op_type != "DequantizeLinear" or node.input[0] not in init:
            keep.append(node)
            continue
        q = numpy_helper.to_array(init[node.input[0]]).astype(np.float32)
        s = numpy_helper.to_array(init[node.input[1]]).astype(np.float32)
        zp = numpy_helper.to_array(init[node.input[2]]).astype(np.float32) if len(node.input) > 2 and node.input[2] in init else np.zeros_like(s)
        attrs = {a.name: onnx.helper.get_attribute_value(a) for a in node.attribute}
        axis = attrs.get("axis", 1) % max(1, q.ndim)
        block = attrs.get("block_size", 0)
        if block and s.ndim == q.ndim:
            # block-wise: each scale covers `block` consecutive elements along `axis`
            s = np.repeat(s, block, axis=axis)
            zp = np.repeat(zp, block, axis=axis)
            sl = [slice(None)] * q.ndim
            sl[axis] = slice(0, q.shape[axis])
            s, zp = s[tuple(sl)], zp[tuple(sl)]
        elif s.ndim == 1 and q.ndim > 1 and s.size > 1:
            shape = [1] * q.ndim
            shape[axis] = s.size
            s, zp = s.reshape(shape), zp.reshape(shape)
        w = ((q - zp) * s).astype(np.float32)
        g.initializer.append(numpy_helper.from_array(w, node.output[0]))
        done += 1
    del g.node[:]
    g.node.extend(keep)
    used = {i for n in g.node for i in n.input} | {o.name for o in g.output}
    live = [i for i in g.initializer if i.name in used]
    del g.initializer[:]
    g.initializer.extend(live)
    onnx.save(m, dst)
    return {"dequantized": done}


if __name__ == "__main__":
    print(convert(sys.argv[1], sys.argv[2]))
