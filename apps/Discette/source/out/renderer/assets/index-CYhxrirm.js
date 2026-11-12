var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReact_production_min;
function requireReact_production_min() {
  if (hasRequiredReact_production_min) return react_production_min;
  hasRequiredReact_production_min = 1;
  var l = Symbol.for("react.element"), n = Symbol.for("react.portal"), p = Symbol.for("react.fragment"), q = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z = Symbol.iterator;
  function A(a) {
    if (null === a || "object" !== typeof a) return null;
    a = z && a[z] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var B = { isMounted: function() {
    return false;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, C = Object.assign, D = {};
  function E(a, b2, e) {
    this.props = a;
    this.context = b2;
    this.refs = D;
    this.updater = e || B;
  }
  E.prototype.isReactComponent = {};
  E.prototype.setState = function(a, b2) {
    if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, a, b2, "setState");
  };
  E.prototype.forceUpdate = function(a) {
    this.updater.enqueueForceUpdate(this, a, "forceUpdate");
  };
  function F() {
  }
  F.prototype = E.prototype;
  function G(a, b2, e) {
    this.props = a;
    this.context = b2;
    this.refs = D;
    this.updater = e || B;
  }
  var H = G.prototype = new F();
  H.constructor = G;
  C(H, E.prototype);
  H.isPureReactComponent = true;
  var I = Array.isArray, J = Object.prototype.hasOwnProperty, K = { current: null }, L = { key: true, ref: true, __self: true, __source: true };
  function M(a, b2, e) {
    var d, c = {}, k = null, h = null;
    if (null != b2) for (d in void 0 !== b2.ref && (h = b2.ref), void 0 !== b2.key && (k = "" + b2.key), b2) J.call(b2, d) && !L.hasOwnProperty(d) && (c[d] = b2[d]);
    var g = arguments.length - 2;
    if (1 === g) c.children = e;
    else if (1 < g) {
      for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
      c.children = f;
    }
    if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
    return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
  }
  function N(a, b2) {
    return { $$typeof: l, type: a.type, key: b2, ref: a.ref, props: a.props, _owner: a._owner };
  }
  function O(a) {
    return "object" === typeof a && null !== a && a.$$typeof === l;
  }
  function escape(a) {
    var b2 = { "=": "=0", ":": "=2" };
    return "$" + a.replace(/[=:]/g, function(a2) {
      return b2[a2];
    });
  }
  var P = /\/+/g;
  function Q(a, b2) {
    return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b2.toString(36);
  }
  function R(a, b2, e, d, c) {
    var k = typeof a;
    if ("undefined" === k || "boolean" === k) a = null;
    var h = false;
    if (null === a) h = true;
    else switch (k) {
      case "string":
      case "number":
        h = true;
        break;
      case "object":
        switch (a.$$typeof) {
          case l:
          case n:
            h = true;
        }
    }
    if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b2, e, "", function(a2) {
      return a2;
    })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b2.push(c)), 1;
    h = 0;
    d = "" === d ? "." : d + ":";
    if (I(a)) for (var g = 0; g < a.length; g++) {
      k = a[g];
      var f = d + Q(k, g);
      h += R(k, b2, e, f, c);
    }
    else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b2, e, f, c);
    else if ("object" === k) throw b2 = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b2 ? "object with keys {" + Object.keys(a).join(", ") + "}" : b2) + "). If you meant to render a collection of children, use an array instead.");
    return h;
  }
  function S(a, b2, e) {
    if (null == a) return a;
    var d = [], c = 0;
    R(a, d, "", "", function(a2) {
      return b2.call(e, a2, c++);
    });
    return d;
  }
  function T(a) {
    if (-1 === a._status) {
      var b2 = a._result;
      b2 = b2();
      b2.then(function(b3) {
        if (0 === a._status || -1 === a._status) a._status = 1, a._result = b3;
      }, function(b3) {
        if (0 === a._status || -1 === a._status) a._status = 2, a._result = b3;
      });
      -1 === a._status && (a._status = 0, a._result = b2);
    }
    if (1 === a._status) return a._result.default;
    throw a._result;
  }
  var U = { current: null }, V = { transition: null }, W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
  function X() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  react_production_min.Children = { map: S, forEach: function(a, b2, e) {
    S(a, function() {
      b2.apply(this, arguments);
    }, e);
  }, count: function(a) {
    var b2 = 0;
    S(a, function() {
      b2++;
    });
    return b2;
  }, toArray: function(a) {
    return S(a, function(a2) {
      return a2;
    }) || [];
  }, only: function(a) {
    if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
    return a;
  } };
  react_production_min.Component = E;
  react_production_min.Fragment = p;
  react_production_min.Profiler = r;
  react_production_min.PureComponent = G;
  react_production_min.StrictMode = q;
  react_production_min.Suspense = w;
  react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
  react_production_min.act = X;
  react_production_min.cloneElement = function(a, b2, e) {
    if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
    var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
    if (null != b2) {
      void 0 !== b2.ref && (k = b2.ref, h = K.current);
      void 0 !== b2.key && (c = "" + b2.key);
      if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
      for (f in b2) J.call(b2, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b2[f] && void 0 !== g ? g[f] : b2[f]);
    }
    var f = arguments.length - 2;
    if (1 === f) d.children = e;
    else if (1 < f) {
      g = Array(f);
      for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
      d.children = g;
    }
    return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
  };
  react_production_min.createContext = function(a) {
    a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
    a.Provider = { $$typeof: t, _context: a };
    return a.Consumer = a;
  };
  react_production_min.createElement = M;
  react_production_min.createFactory = function(a) {
    var b2 = M.bind(null, a);
    b2.type = a;
    return b2;
  };
  react_production_min.createRef = function() {
    return { current: null };
  };
  react_production_min.forwardRef = function(a) {
    return { $$typeof: v, render: a };
  };
  react_production_min.isValidElement = O;
  react_production_min.lazy = function(a) {
    return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
  };
  react_production_min.memo = function(a, b2) {
    return { $$typeof: x, type: a, compare: void 0 === b2 ? null : b2 };
  };
  react_production_min.startTransition = function(a) {
    var b2 = V.transition;
    V.transition = {};
    try {
      a();
    } finally {
      V.transition = b2;
    }
  };
  react_production_min.unstable_act = X;
  react_production_min.useCallback = function(a, b2) {
    return U.current.useCallback(a, b2);
  };
  react_production_min.useContext = function(a) {
    return U.current.useContext(a);
  };
  react_production_min.useDebugValue = function() {
  };
  react_production_min.useDeferredValue = function(a) {
    return U.current.useDeferredValue(a);
  };
  react_production_min.useEffect = function(a, b2) {
    return U.current.useEffect(a, b2);
  };
  react_production_min.useId = function() {
    return U.current.useId();
  };
  react_production_min.useImperativeHandle = function(a, b2, e) {
    return U.current.useImperativeHandle(a, b2, e);
  };
  react_production_min.useInsertionEffect = function(a, b2) {
    return U.current.useInsertionEffect(a, b2);
  };
  react_production_min.useLayoutEffect = function(a, b2) {
    return U.current.useLayoutEffect(a, b2);
  };
  react_production_min.useMemo = function(a, b2) {
    return U.current.useMemo(a, b2);
  };
  react_production_min.useReducer = function(a, b2, e) {
    return U.current.useReducer(a, b2, e);
  };
  react_production_min.useRef = function(a) {
    return U.current.useRef(a);
  };
  react_production_min.useState = function(a) {
    return U.current.useState(a);
  };
  react_production_min.useSyncExternalStore = function(a, b2, e) {
    return U.current.useSyncExternalStore(a, b2, e);
  };
  react_production_min.useTransition = function() {
    return U.current.useTransition();
  };
  react_production_min.version = "18.3.1";
  return react_production_min;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  {
    react.exports = requireReact_production_min();
  }
  return react.exports;
}
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactJsxRuntime_production_min;
function requireReactJsxRuntime_production_min() {
  if (hasRequiredReactJsxRuntime_production_min) return reactJsxRuntime_production_min;
  hasRequiredReactJsxRuntime_production_min = 1;
  var f = requireReact(), k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p = { key: true, ref: true, __self: true, __source: true };
  function q(c, a, g) {
    var b2, d = {}, e = null, h = null;
    void 0 !== g && (e = "" + g);
    void 0 !== a.key && (e = "" + a.key);
    void 0 !== a.ref && (h = a.ref);
    for (b2 in a) m.call(a, b2) && !p.hasOwnProperty(b2) && (d[b2] = a[b2]);
    if (c && c.defaultProps) for (b2 in a = c.defaultProps, a) void 0 === d[b2] && (d[b2] = a[b2]);
    return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
  }
  reactJsxRuntime_production_min.Fragment = l;
  reactJsxRuntime_production_min.jsx = q;
  reactJsxRuntime_production_min.jsxs = q;
  return reactJsxRuntime_production_min;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production_min();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var client = {};
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredScheduler_production_min;
function requireScheduler_production_min() {
  if (hasRequiredScheduler_production_min) return scheduler_production_min;
  hasRequiredScheduler_production_min = 1;
  (function(exports) {
    function f(a, b2) {
      var c = a.length;
      a.push(b2);
      a: for (; 0 < c; ) {
        var d = c - 1 >>> 1, e = a[d];
        if (0 < g(e, b2)) a[d] = b2, a[c] = e, c = d;
        else break a;
      }
    }
    function h(a) {
      return 0 === a.length ? null : a[0];
    }
    function k(a) {
      if (0 === a.length) return null;
      var b2 = a[0], c = a.pop();
      if (c !== b2) {
        a[0] = c;
        a: for (var d = 0, e = a.length, w = e >>> 1; d < w; ) {
          var m = 2 * (d + 1) - 1, C = a[m], n = m + 1, x = a[n];
          if (0 > g(C, c)) n < e && 0 > g(x, C) ? (a[d] = x, a[n] = c, d = n) : (a[d] = C, a[m] = c, d = m);
          else if (n < e && 0 > g(x, c)) a[d] = x, a[n] = c, d = n;
          else break a;
        }
      }
      return b2;
    }
    function g(a, b2) {
      var c = a.sortIndex - b2.sortIndex;
      return 0 !== c ? c : a.id - b2.id;
    }
    if ("object" === typeof performance && "function" === typeof performance.now) {
      var l = performance;
      exports.unstable_now = function() {
        return l.now();
      };
    } else {
      var p = Date, q = p.now();
      exports.unstable_now = function() {
        return p.now() - q;
      };
    }
    var r = [], t = [], u = 1, v = null, y = 3, z = false, A = false, B = false, D = "function" === typeof setTimeout ? setTimeout : null, E = "function" === typeof clearTimeout ? clearTimeout : null, F = "undefined" !== typeof setImmediate ? setImmediate : null;
    "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function G(a) {
      for (var b2 = h(t); null !== b2; ) {
        if (null === b2.callback) k(t);
        else if (b2.startTime <= a) k(t), b2.sortIndex = b2.expirationTime, f(r, b2);
        else break;
        b2 = h(t);
      }
    }
    function H(a) {
      B = false;
      G(a);
      if (!A) if (null !== h(r)) A = true, I(J);
      else {
        var b2 = h(t);
        null !== b2 && K(H, b2.startTime - a);
      }
    }
    function J(a, b2) {
      A = false;
      B && (B = false, E(L), L = -1);
      z = true;
      var c = y;
      try {
        G(b2);
        for (v = h(r); null !== v && (!(v.expirationTime > b2) || a && !M()); ) {
          var d = v.callback;
          if ("function" === typeof d) {
            v.callback = null;
            y = v.priorityLevel;
            var e = d(v.expirationTime <= b2);
            b2 = exports.unstable_now();
            "function" === typeof e ? v.callback = e : v === h(r) && k(r);
            G(b2);
          } else k(r);
          v = h(r);
        }
        if (null !== v) var w = true;
        else {
          var m = h(t);
          null !== m && K(H, m.startTime - b2);
          w = false;
        }
        return w;
      } finally {
        v = null, y = c, z = false;
      }
    }
    var N = false, O = null, L = -1, P = 5, Q = -1;
    function M() {
      return exports.unstable_now() - Q < P ? false : true;
    }
    function R() {
      if (null !== O) {
        var a = exports.unstable_now();
        Q = a;
        var b2 = true;
        try {
          b2 = O(true, a);
        } finally {
          b2 ? S() : (N = false, O = null);
        }
      } else N = false;
    }
    var S;
    if ("function" === typeof F) S = function() {
      F(R);
    };
    else if ("undefined" !== typeof MessageChannel) {
      var T = new MessageChannel(), U = T.port2;
      T.port1.onmessage = R;
      S = function() {
        U.postMessage(null);
      };
    } else S = function() {
      D(R, 0);
    };
    function I(a) {
      O = a;
      N || (N = true, S());
    }
    function K(a, b2) {
      L = D(function() {
        a(exports.unstable_now());
      }, b2);
    }
    exports.unstable_IdlePriority = 5;
    exports.unstable_ImmediatePriority = 1;
    exports.unstable_LowPriority = 4;
    exports.unstable_NormalPriority = 3;
    exports.unstable_Profiling = null;
    exports.unstable_UserBlockingPriority = 2;
    exports.unstable_cancelCallback = function(a) {
      a.callback = null;
    };
    exports.unstable_continueExecution = function() {
      A || z || (A = true, I(J));
    };
    exports.unstable_forceFrameRate = function(a) {
      0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < a ? Math.floor(1e3 / a) : 5;
    };
    exports.unstable_getCurrentPriorityLevel = function() {
      return y;
    };
    exports.unstable_getFirstCallbackNode = function() {
      return h(r);
    };
    exports.unstable_next = function(a) {
      switch (y) {
        case 1:
        case 2:
        case 3:
          var b2 = 3;
          break;
        default:
          b2 = y;
      }
      var c = y;
      y = b2;
      try {
        return a();
      } finally {
        y = c;
      }
    };
    exports.unstable_pauseExecution = function() {
    };
    exports.unstable_requestPaint = function() {
    };
    exports.unstable_runWithPriority = function(a, b2) {
      switch (a) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          a = 3;
      }
      var c = y;
      y = a;
      try {
        return b2();
      } finally {
        y = c;
      }
    };
    exports.unstable_scheduleCallback = function(a, b2, c) {
      var d = exports.unstable_now();
      "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
      switch (a) {
        case 1:
          var e = -1;
          break;
        case 2:
          e = 250;
          break;
        case 5:
          e = 1073741823;
          break;
        case 4:
          e = 1e4;
          break;
        default:
          e = 5e3;
      }
      e = c + e;
      a = { id: u++, callback: b2, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
      c > d ? (a.sortIndex = c, f(t, a), null === h(r) && a === h(t) && (B ? (E(L), L = -1) : B = true, K(H, c - d))) : (a.sortIndex = e, f(r, a), A || z || (A = true, I(J)));
      return a;
    };
    exports.unstable_shouldYield = M;
    exports.unstable_wrapCallback = function(a) {
      var b2 = y;
      return function() {
        var c = y;
        y = b2;
        try {
          return a.apply(this, arguments);
        } finally {
          y = c;
        }
      };
    };
  })(scheduler_production_min);
  return scheduler_production_min;
}
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler.exports;
  hasRequiredScheduler = 1;
  {
    scheduler.exports = requireScheduler_production_min();
  }
  return scheduler.exports;
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var hasRequiredReactDom_production_min;
function requireReactDom_production_min() {
  if (hasRequiredReactDom_production_min) return reactDom_production_min;
  hasRequiredReactDom_production_min = 1;
  var aa = requireReact(), ca = requireScheduler();
  function p(a) {
    for (var b2 = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b2 += "&args[]=" + encodeURIComponent(arguments[c]);
    return "Minified React error #" + a + "; visit " + b2 + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var da = /* @__PURE__ */ new Set(), ea = {};
  function fa(a, b2) {
    ha(a, b2);
    ha(a + "Capture", b2);
  }
  function ha(a, b2) {
    ea[a] = b2;
    for (a = 0; a < b2.length; a++) da.add(b2[a]);
  }
  var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
  function oa(a) {
    if (ja.call(ma, a)) return true;
    if (ja.call(la, a)) return false;
    if (ka.test(a)) return ma[a] = true;
    la[a] = true;
    return false;
  }
  function pa(a, b2, c, d) {
    if (null !== c && 0 === c.type) return false;
    switch (typeof b2) {
      case "function":
      case "symbol":
        return true;
      case "boolean":
        if (d) return false;
        if (null !== c) return !c.acceptsBooleans;
        a = a.toLowerCase().slice(0, 5);
        return "data-" !== a && "aria-" !== a;
      default:
        return false;
    }
  }
  function qa(a, b2, c, d) {
    if (null === b2 || "undefined" === typeof b2 || pa(a, b2, c, d)) return true;
    if (d) return false;
    if (null !== c) switch (c.type) {
      case 3:
        return !b2;
      case 4:
        return false === b2;
      case 5:
        return isNaN(b2);
      case 6:
        return isNaN(b2) || 1 > b2;
    }
    return false;
  }
  function v(a, b2, c, d, e, f, g) {
    this.acceptsBooleans = 2 === b2 || 3 === b2 || 4 === b2;
    this.attributeName = d;
    this.attributeNamespace = e;
    this.mustUseProperty = c;
    this.propertyName = a;
    this.type = b2;
    this.sanitizeURL = f;
    this.removeEmptyString = g;
  }
  var z = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
    z[a] = new v(a, 0, false, a, null, false, false);
  });
  [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
    var b2 = a[0];
    z[b2] = new v(b2, 1, false, a[1], null, false, false);
  });
  ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
    z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
  });
  ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
    z[a] = new v(a, 2, false, a, null, false, false);
  });
  "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
    z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
  });
  ["checked", "multiple", "muted", "selected"].forEach(function(a) {
    z[a] = new v(a, 3, true, a, null, false, false);
  });
  ["capture", "download"].forEach(function(a) {
    z[a] = new v(a, 4, false, a, null, false, false);
  });
  ["cols", "rows", "size", "span"].forEach(function(a) {
    z[a] = new v(a, 6, false, a, null, false, false);
  });
  ["rowSpan", "start"].forEach(function(a) {
    z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
  });
  var ra = /[\-:]([a-z])/g;
  function sa(a) {
    return a[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
    var b2 = a.replace(
      ra,
      sa
    );
    z[b2] = new v(b2, 1, false, a, null, false, false);
  });
  "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
    var b2 = a.replace(ra, sa);
    z[b2] = new v(b2, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
  });
  ["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
    var b2 = a.replace(ra, sa);
    z[b2] = new v(b2, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
  });
  ["tabIndex", "crossOrigin"].forEach(function(a) {
    z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
  });
  z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
  ["src", "href", "action", "formAction"].forEach(function(a) {
    z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
  });
  function ta(a, b2, c, d) {
    var e = z.hasOwnProperty(b2) ? z[b2] : null;
    if (null !== e ? 0 !== e.type : d || !(2 < b2.length) || "o" !== b2[0] && "O" !== b2[0] || "n" !== b2[1] && "N" !== b2[1]) qa(b2, c, e, d) && (c = null), d || null === e ? oa(b2) && (null === c ? a.removeAttribute(b2) : a.setAttribute(b2, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b2 = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b2) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b2, c) : a.setAttribute(b2, c)));
  }
  var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
  var Ia = Symbol.for("react.offscreen");
  var Ja = Symbol.iterator;
  function Ka(a) {
    if (null === a || "object" !== typeof a) return null;
    a = Ja && a[Ja] || a["@@iterator"];
    return "function" === typeof a ? a : null;
  }
  var A = Object.assign, La;
  function Ma(a) {
    if (void 0 === La) try {
      throw Error();
    } catch (c) {
      var b2 = c.stack.trim().match(/\n( *(at )?)/);
      La = b2 && b2[1] || "";
    }
    return "\n" + La + a;
  }
  var Na = false;
  function Oa(a, b2) {
    if (!a || Na) return "";
    Na = true;
    var c = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (b2) if (b2 = function() {
        throw Error();
      }, Object.defineProperty(b2.prototype, "props", { set: function() {
        throw Error();
      } }), "object" === typeof Reflect && Reflect.construct) {
        try {
          Reflect.construct(b2, []);
        } catch (l) {
          var d = l;
        }
        Reflect.construct(a, [], b2);
      } else {
        try {
          b2.call();
        } catch (l) {
          d = l;
        }
        a.call(b2.prototype);
      }
      else {
        try {
          throw Error();
        } catch (l) {
          d = l;
        }
        a();
      }
    } catch (l) {
      if (l && d && "string" === typeof l.stack) {
        for (var e = l.stack.split("\n"), f = d.stack.split("\n"), g = e.length - 1, h = f.length - 1; 1 <= g && 0 <= h && e[g] !== f[h]; ) h--;
        for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f[h]) {
          if (1 !== g || 1 !== h) {
            do
              if (g--, h--, 0 > h || e[g] !== f[h]) {
                var k = "\n" + e[g].replace(" at new ", " at ");
                a.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", a.displayName));
                return k;
              }
            while (1 <= g && 0 <= h);
          }
          break;
        }
      }
    } finally {
      Na = false, Error.prepareStackTrace = c;
    }
    return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
  }
  function Pa(a) {
    switch (a.tag) {
      case 5:
        return Ma(a.type);
      case 16:
        return Ma("Lazy");
      case 13:
        return Ma("Suspense");
      case 19:
        return Ma("SuspenseList");
      case 0:
      case 2:
      case 15:
        return a = Oa(a.type, false), a;
      case 11:
        return a = Oa(a.type.render, false), a;
      case 1:
        return a = Oa(a.type, true), a;
      default:
        return "";
    }
  }
  function Qa(a) {
    if (null == a) return null;
    if ("function" === typeof a) return a.displayName || a.name || null;
    if ("string" === typeof a) return a;
    switch (a) {
      case ya:
        return "Fragment";
      case wa:
        return "Portal";
      case Aa:
        return "Profiler";
      case za:
        return "StrictMode";
      case Ea:
        return "Suspense";
      case Fa:
        return "SuspenseList";
    }
    if ("object" === typeof a) switch (a.$$typeof) {
      case Ca:
        return (a.displayName || "Context") + ".Consumer";
      case Ba:
        return (a._context.displayName || "Context") + ".Provider";
      case Da:
        var b2 = a.render;
        a = a.displayName;
        a || (a = b2.displayName || b2.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
        return a;
      case Ga:
        return b2 = a.displayName || null, null !== b2 ? b2 : Qa(a.type) || "Memo";
      case Ha:
        b2 = a._payload;
        a = a._init;
        try {
          return Qa(a(b2));
        } catch (c) {
        }
    }
    return null;
  }
  function Ra(a) {
    var b2 = a.type;
    switch (a.tag) {
      case 24:
        return "Cache";
      case 9:
        return (b2.displayName || "Context") + ".Consumer";
      case 10:
        return (b2._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return a = b2.render, a = a.displayName || a.name || "", b2.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      case 7:
        return "Fragment";
      case 5:
        return b2;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return Qa(b2);
      case 8:
        return b2 === za ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if ("function" === typeof b2) return b2.displayName || b2.name || null;
        if ("string" === typeof b2) return b2;
    }
    return null;
  }
  function Sa(a) {
    switch (typeof a) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return a;
      case "object":
        return a;
      default:
        return "";
    }
  }
  function Ta(a) {
    var b2 = a.type;
    return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b2 || "radio" === b2);
  }
  function Ua(a) {
    var b2 = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b2), d = "" + a[b2];
    if (!a.hasOwnProperty(b2) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
      var e = c.get, f = c.set;
      Object.defineProperty(a, b2, { configurable: true, get: function() {
        return e.call(this);
      }, set: function(a2) {
        d = "" + a2;
        f.call(this, a2);
      } });
      Object.defineProperty(a, b2, { enumerable: c.enumerable });
      return { getValue: function() {
        return d;
      }, setValue: function(a2) {
        d = "" + a2;
      }, stopTracking: function() {
        a._valueTracker = null;
        delete a[b2];
      } };
    }
  }
  function Va(a) {
    a._valueTracker || (a._valueTracker = Ua(a));
  }
  function Wa(a) {
    if (!a) return false;
    var b2 = a._valueTracker;
    if (!b2) return true;
    var c = b2.getValue();
    var d = "";
    a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
    a = d;
    return a !== c ? (b2.setValue(a), true) : false;
  }
  function Xa(a) {
    a = a || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof a) return null;
    try {
      return a.activeElement || a.body;
    } catch (b2) {
      return a.body;
    }
  }
  function Ya(a, b2) {
    var c = b2.checked;
    return A({}, b2, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
  }
  function Za(a, b2) {
    var c = null == b2.defaultValue ? "" : b2.defaultValue, d = null != b2.checked ? b2.checked : b2.defaultChecked;
    c = Sa(null != b2.value ? b2.value : c);
    a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b2.type || "radio" === b2.type ? null != b2.checked : null != b2.value };
  }
  function ab(a, b2) {
    b2 = b2.checked;
    null != b2 && ta(a, "checked", b2, false);
  }
  function bb(a, b2) {
    ab(a, b2);
    var c = Sa(b2.value), d = b2.type;
    if (null != c) if ("number" === d) {
      if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
    } else a.value !== "" + c && (a.value = "" + c);
    else if ("submit" === d || "reset" === d) {
      a.removeAttribute("value");
      return;
    }
    b2.hasOwnProperty("value") ? cb(a, b2.type, c) : b2.hasOwnProperty("defaultValue") && cb(a, b2.type, Sa(b2.defaultValue));
    null == b2.checked && null != b2.defaultChecked && (a.defaultChecked = !!b2.defaultChecked);
  }
  function db(a, b2, c) {
    if (b2.hasOwnProperty("value") || b2.hasOwnProperty("defaultValue")) {
      var d = b2.type;
      if (!("submit" !== d && "reset" !== d || void 0 !== b2.value && null !== b2.value)) return;
      b2 = "" + a._wrapperState.initialValue;
      c || b2 === a.value || (a.value = b2);
      a.defaultValue = b2;
    }
    c = a.name;
    "" !== c && (a.name = "");
    a.defaultChecked = !!a._wrapperState.initialChecked;
    "" !== c && (a.name = c);
  }
  function cb(a, b2, c) {
    if ("number" !== b2 || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
  }
  var eb = Array.isArray;
  function fb(a, b2, c, d) {
    a = a.options;
    if (b2) {
      b2 = {};
      for (var e = 0; e < c.length; e++) b2["$" + c[e]] = true;
      for (c = 0; c < a.length; c++) e = b2.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
    } else {
      c = "" + Sa(c);
      b2 = null;
      for (e = 0; e < a.length; e++) {
        if (a[e].value === c) {
          a[e].selected = true;
          d && (a[e].defaultSelected = true);
          return;
        }
        null !== b2 || a[e].disabled || (b2 = a[e]);
      }
      null !== b2 && (b2.selected = true);
    }
  }
  function gb(a, b2) {
    if (null != b2.dangerouslySetInnerHTML) throw Error(p(91));
    return A({}, b2, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
  }
  function hb(a, b2) {
    var c = b2.value;
    if (null == c) {
      c = b2.children;
      b2 = b2.defaultValue;
      if (null != c) {
        if (null != b2) throw Error(p(92));
        if (eb(c)) {
          if (1 < c.length) throw Error(p(93));
          c = c[0];
        }
        b2 = c;
      }
      null == b2 && (b2 = "");
      c = b2;
    }
    a._wrapperState = { initialValue: Sa(c) };
  }
  function ib(a, b2) {
    var c = Sa(b2.value), d = Sa(b2.defaultValue);
    null != c && (c = "" + c, c !== a.value && (a.value = c), null == b2.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
    null != d && (a.defaultValue = "" + d);
  }
  function jb(a) {
    var b2 = a.textContent;
    b2 === a._wrapperState.initialValue && "" !== b2 && null !== b2 && (a.value = b2);
  }
  function kb(a) {
    switch (a) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function lb(a, b2) {
    return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b2) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b2 ? "http://www.w3.org/1999/xhtml" : a;
  }
  var mb, nb = (function(a) {
    return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b2, c, d, e) {
      MSApp.execUnsafeLocalFunction(function() {
        return a(b2, c, d, e);
      });
    } : a;
  })(function(a, b2) {
    if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b2;
    else {
      mb = mb || document.createElement("div");
      mb.innerHTML = "<svg>" + b2.valueOf().toString() + "</svg>";
      for (b2 = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
      for (; b2.firstChild; ) a.appendChild(b2.firstChild);
    }
  });
  function ob(a, b2) {
    if (b2) {
      var c = a.firstChild;
      if (c && c === a.lastChild && 3 === c.nodeType) {
        c.nodeValue = b2;
        return;
      }
    }
    a.textContent = b2;
  }
  var pb = {
    animationIterationCount: true,
    aspectRatio: true,
    borderImageOutset: true,
    borderImageSlice: true,
    borderImageWidth: true,
    boxFlex: true,
    boxFlexGroup: true,
    boxOrdinalGroup: true,
    columnCount: true,
    columns: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    flexOrder: true,
    gridArea: true,
    gridRow: true,
    gridRowEnd: true,
    gridRowSpan: true,
    gridRowStart: true,
    gridColumn: true,
    gridColumnEnd: true,
    gridColumnSpan: true,
    gridColumnStart: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    tabSize: true,
    widows: true,
    zIndex: true,
    zoom: true,
    fillOpacity: true,
    floodOpacity: true,
    stopOpacity: true,
    strokeDasharray: true,
    strokeDashoffset: true,
    strokeMiterlimit: true,
    strokeOpacity: true,
    strokeWidth: true
  }, qb = ["Webkit", "ms", "Moz", "O"];
  Object.keys(pb).forEach(function(a) {
    qb.forEach(function(b2) {
      b2 = b2 + a.charAt(0).toUpperCase() + a.substring(1);
      pb[b2] = pb[a];
    });
  });
  function rb(a, b2, c) {
    return null == b2 || "boolean" === typeof b2 || "" === b2 ? "" : c || "number" !== typeof b2 || 0 === b2 || pb.hasOwnProperty(a) && pb[a] ? ("" + b2).trim() : b2 + "px";
  }
  function sb(a, b2) {
    a = a.style;
    for (var c in b2) if (b2.hasOwnProperty(c)) {
      var d = 0 === c.indexOf("--"), e = rb(c, b2[c], d);
      "float" === c && (c = "cssFloat");
      d ? a.setProperty(c, e) : a[c] = e;
    }
  }
  var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
  function ub(a, b2) {
    if (b2) {
      if (tb[a] && (null != b2.children || null != b2.dangerouslySetInnerHTML)) throw Error(p(137, a));
      if (null != b2.dangerouslySetInnerHTML) {
        if (null != b2.children) throw Error(p(60));
        if ("object" !== typeof b2.dangerouslySetInnerHTML || !("__html" in b2.dangerouslySetInnerHTML)) throw Error(p(61));
      }
      if (null != b2.style && "object" !== typeof b2.style) throw Error(p(62));
    }
  }
  function vb(a, b2) {
    if (-1 === a.indexOf("-")) return "string" === typeof b2.is;
    switch (a) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return false;
      default:
        return true;
    }
  }
  var wb = null;
  function xb(a) {
    a = a.target || a.srcElement || window;
    a.correspondingUseElement && (a = a.correspondingUseElement);
    return 3 === a.nodeType ? a.parentNode : a;
  }
  var yb = null, zb = null, Ab = null;
  function Bb(a) {
    if (a = Cb(a)) {
      if ("function" !== typeof yb) throw Error(p(280));
      var b2 = a.stateNode;
      b2 && (b2 = Db(b2), yb(a.stateNode, a.type, b2));
    }
  }
  function Eb(a) {
    zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
  }
  function Fb() {
    if (zb) {
      var a = zb, b2 = Ab;
      Ab = zb = null;
      Bb(a);
      if (b2) for (a = 0; a < b2.length; a++) Bb(b2[a]);
    }
  }
  function Gb(a, b2) {
    return a(b2);
  }
  function Hb() {
  }
  var Ib = false;
  function Jb(a, b2, c) {
    if (Ib) return a(b2, c);
    Ib = true;
    try {
      return Gb(a, b2, c);
    } finally {
      if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
    }
  }
  function Kb(a, b2) {
    var c = a.stateNode;
    if (null === c) return null;
    var d = Db(c);
    if (null === d) return null;
    c = d[b2];
    a: switch (b2) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
        a = !d;
        break a;
      default:
        a = false;
    }
    if (a) return null;
    if (c && "function" !== typeof c) throw Error(p(231, b2, typeof c));
    return c;
  }
  var Lb = false;
  if (ia) try {
    var Mb = {};
    Object.defineProperty(Mb, "passive", { get: function() {
      Lb = true;
    } });
    window.addEventListener("test", Mb, Mb);
    window.removeEventListener("test", Mb, Mb);
  } catch (a) {
    Lb = false;
  }
  function Nb(a, b2, c, d, e, f, g, h, k) {
    var l = Array.prototype.slice.call(arguments, 3);
    try {
      b2.apply(c, l);
    } catch (m) {
      this.onError(m);
    }
  }
  var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
    Ob = true;
    Pb = a;
  } };
  function Tb(a, b2, c, d, e, f, g, h, k) {
    Ob = false;
    Pb = null;
    Nb.apply(Sb, arguments);
  }
  function Ub(a, b2, c, d, e, f, g, h, k) {
    Tb.apply(this, arguments);
    if (Ob) {
      if (Ob) {
        var l = Pb;
        Ob = false;
        Pb = null;
      } else throw Error(p(198));
      Qb || (Qb = true, Rb = l);
    }
  }
  function Vb(a) {
    var b2 = a, c = a;
    if (a.alternate) for (; b2.return; ) b2 = b2.return;
    else {
      a = b2;
      do
        b2 = a, 0 !== (b2.flags & 4098) && (c = b2.return), a = b2.return;
      while (a);
    }
    return 3 === b2.tag ? c : null;
  }
  function Wb(a) {
    if (13 === a.tag) {
      var b2 = a.memoizedState;
      null === b2 && (a = a.alternate, null !== a && (b2 = a.memoizedState));
      if (null !== b2) return b2.dehydrated;
    }
    return null;
  }
  function Xb(a) {
    if (Vb(a) !== a) throw Error(p(188));
  }
  function Yb(a) {
    var b2 = a.alternate;
    if (!b2) {
      b2 = Vb(a);
      if (null === b2) throw Error(p(188));
      return b2 !== a ? null : a;
    }
    for (var c = a, d = b2; ; ) {
      var e = c.return;
      if (null === e) break;
      var f = e.alternate;
      if (null === f) {
        d = e.return;
        if (null !== d) {
          c = d;
          continue;
        }
        break;
      }
      if (e.child === f.child) {
        for (f = e.child; f; ) {
          if (f === c) return Xb(e), a;
          if (f === d) return Xb(e), b2;
          f = f.sibling;
        }
        throw Error(p(188));
      }
      if (c.return !== d.return) c = e, d = f;
      else {
        for (var g = false, h = e.child; h; ) {
          if (h === c) {
            g = true;
            c = e;
            d = f;
            break;
          }
          if (h === d) {
            g = true;
            d = e;
            c = f;
            break;
          }
          h = h.sibling;
        }
        if (!g) {
          for (h = f.child; h; ) {
            if (h === c) {
              g = true;
              c = f;
              d = e;
              break;
            }
            if (h === d) {
              g = true;
              d = f;
              c = e;
              break;
            }
            h = h.sibling;
          }
          if (!g) throw Error(p(189));
        }
      }
      if (c.alternate !== d) throw Error(p(190));
    }
    if (3 !== c.tag) throw Error(p(188));
    return c.stateNode.current === c ? a : b2;
  }
  function Zb(a) {
    a = Yb(a);
    return null !== a ? $b(a) : null;
  }
  function $b(a) {
    if (5 === a.tag || 6 === a.tag) return a;
    for (a = a.child; null !== a; ) {
      var b2 = $b(a);
      if (null !== b2) return b2;
      a = a.sibling;
    }
    return null;
  }
  var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
  function mc(a) {
    if (lc && "function" === typeof lc.onCommitFiberRoot) try {
      lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
    } catch (b2) {
    }
  }
  var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
  function nc(a) {
    a >>>= 0;
    return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
  }
  var rc = 64, sc = 4194304;
  function tc(a) {
    switch (a & -a) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return a & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return a & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return a;
    }
  }
  function uc(a, b2) {
    var c = a.pendingLanes;
    if (0 === c) return 0;
    var d = 0, e = a.suspendedLanes, f = a.pingedLanes, g = c & 268435455;
    if (0 !== g) {
      var h = g & ~e;
      0 !== h ? d = tc(h) : (f &= g, 0 !== f && (d = tc(f)));
    } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f && (d = tc(f));
    if (0 === d) return 0;
    if (0 !== b2 && b2 !== d && 0 === (b2 & e) && (e = d & -d, f = b2 & -b2, e >= f || 16 === e && 0 !== (f & 4194240))) return b2;
    0 !== (d & 4) && (d |= c & 16);
    b2 = a.entangledLanes;
    if (0 !== b2) for (a = a.entanglements, b2 &= d; 0 < b2; ) c = 31 - oc(b2), e = 1 << c, d |= a[c], b2 &= ~e;
    return d;
  }
  function vc(a, b2) {
    switch (a) {
      case 1:
      case 2:
      case 4:
        return b2 + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return b2 + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function wc(a, b2) {
    for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f = a.pendingLanes; 0 < f; ) {
      var g = 31 - oc(f), h = 1 << g, k = e[g];
      if (-1 === k) {
        if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b2);
      } else k <= b2 && (a.expiredLanes |= h);
      f &= ~h;
    }
  }
  function xc(a) {
    a = a.pendingLanes & -1073741825;
    return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
  }
  function yc() {
    var a = rc;
    rc <<= 1;
    0 === (rc & 4194240) && (rc = 64);
    return a;
  }
  function zc(a) {
    for (var b2 = [], c = 0; 31 > c; c++) b2.push(a);
    return b2;
  }
  function Ac(a, b2, c) {
    a.pendingLanes |= b2;
    536870912 !== b2 && (a.suspendedLanes = 0, a.pingedLanes = 0);
    a = a.eventTimes;
    b2 = 31 - oc(b2);
    a[b2] = c;
  }
  function Bc(a, b2) {
    var c = a.pendingLanes & ~b2;
    a.pendingLanes = b2;
    a.suspendedLanes = 0;
    a.pingedLanes = 0;
    a.expiredLanes &= b2;
    a.mutableReadLanes &= b2;
    a.entangledLanes &= b2;
    b2 = a.entanglements;
    var d = a.eventTimes;
    for (a = a.expirationTimes; 0 < c; ) {
      var e = 31 - oc(c), f = 1 << e;
      b2[e] = 0;
      d[e] = -1;
      a[e] = -1;
      c &= ~f;
    }
  }
  function Cc(a, b2) {
    var c = a.entangledLanes |= b2;
    for (a = a.entanglements; c; ) {
      var d = 31 - oc(c), e = 1 << d;
      e & b2 | a[d] & b2 && (a[d] |= b2);
      c &= ~e;
    }
  }
  var C = 0;
  function Dc(a) {
    a &= -a;
    return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
  }
  var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Sc(a, b2) {
    switch (a) {
      case "focusin":
      case "focusout":
        Lc = null;
        break;
      case "dragenter":
      case "dragleave":
        Mc = null;
        break;
      case "mouseover":
      case "mouseout":
        Nc = null;
        break;
      case "pointerover":
      case "pointerout":
        Oc.delete(b2.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Pc.delete(b2.pointerId);
    }
  }
  function Tc(a, b2, c, d, e, f) {
    if (null === a || a.nativeEvent !== f) return a = { blockedOn: b2, domEventName: c, eventSystemFlags: d, nativeEvent: f, targetContainers: [e] }, null !== b2 && (b2 = Cb(b2), null !== b2 && Fc(b2)), a;
    a.eventSystemFlags |= d;
    b2 = a.targetContainers;
    null !== e && -1 === b2.indexOf(e) && b2.push(e);
    return a;
  }
  function Uc(a, b2, c, d, e) {
    switch (b2) {
      case "focusin":
        return Lc = Tc(Lc, a, b2, c, d, e), true;
      case "dragenter":
        return Mc = Tc(Mc, a, b2, c, d, e), true;
      case "mouseover":
        return Nc = Tc(Nc, a, b2, c, d, e), true;
      case "pointerover":
        var f = e.pointerId;
        Oc.set(f, Tc(Oc.get(f) || null, a, b2, c, d, e));
        return true;
      case "gotpointercapture":
        return f = e.pointerId, Pc.set(f, Tc(Pc.get(f) || null, a, b2, c, d, e)), true;
    }
    return false;
  }
  function Vc(a) {
    var b2 = Wc(a.target);
    if (null !== b2) {
      var c = Vb(b2);
      if (null !== c) {
        if (b2 = c.tag, 13 === b2) {
          if (b2 = Wb(c), null !== b2) {
            a.blockedOn = b2;
            Ic(a.priority, function() {
              Gc(c);
            });
            return;
          }
        } else if (3 === b2 && c.stateNode.current.memoizedState.isDehydrated) {
          a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
          return;
        }
      }
    }
    a.blockedOn = null;
  }
  function Xc(a) {
    if (null !== a.blockedOn) return false;
    for (var b2 = a.targetContainers; 0 < b2.length; ) {
      var c = Yc(a.domEventName, a.eventSystemFlags, b2[0], a.nativeEvent);
      if (null === c) {
        c = a.nativeEvent;
        var d = new c.constructor(c.type, c);
        wb = d;
        c.target.dispatchEvent(d);
        wb = null;
      } else return b2 = Cb(c), null !== b2 && Fc(b2), a.blockedOn = c, false;
      b2.shift();
    }
    return true;
  }
  function Zc(a, b2, c) {
    Xc(a) && c.delete(b2);
  }
  function $c() {
    Jc = false;
    null !== Lc && Xc(Lc) && (Lc = null);
    null !== Mc && Xc(Mc) && (Mc = null);
    null !== Nc && Xc(Nc) && (Nc = null);
    Oc.forEach(Zc);
    Pc.forEach(Zc);
  }
  function ad(a, b2) {
    a.blockedOn === b2 && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
  }
  function bd(a) {
    function b2(b3) {
      return ad(b3, a);
    }
    if (0 < Kc.length) {
      ad(Kc[0], a);
      for (var c = 1; c < Kc.length; c++) {
        var d = Kc[c];
        d.blockedOn === a && (d.blockedOn = null);
      }
    }
    null !== Lc && ad(Lc, a);
    null !== Mc && ad(Mc, a);
    null !== Nc && ad(Nc, a);
    Oc.forEach(b2);
    Pc.forEach(b2);
    for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
    for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
  }
  var cd = ua.ReactCurrentBatchConfig, dd = true;
  function ed(a, b2, c, d) {
    var e = C, f = cd.transition;
    cd.transition = null;
    try {
      C = 1, fd(a, b2, c, d);
    } finally {
      C = e, cd.transition = f;
    }
  }
  function gd(a, b2, c, d) {
    var e = C, f = cd.transition;
    cd.transition = null;
    try {
      C = 4, fd(a, b2, c, d);
    } finally {
      C = e, cd.transition = f;
    }
  }
  function fd(a, b2, c, d) {
    if (dd) {
      var e = Yc(a, b2, c, d);
      if (null === e) hd(a, b2, d, id, c), Sc(a, d);
      else if (Uc(e, a, b2, c, d)) d.stopPropagation();
      else if (Sc(a, d), b2 & 4 && -1 < Rc.indexOf(a)) {
        for (; null !== e; ) {
          var f = Cb(e);
          null !== f && Ec(f);
          f = Yc(a, b2, c, d);
          null === f && hd(a, b2, d, id, c);
          if (f === e) break;
          e = f;
        }
        null !== e && d.stopPropagation();
      } else hd(a, b2, d, null, c);
    }
  }
  var id = null;
  function Yc(a, b2, c, d) {
    id = null;
    a = xb(d);
    a = Wc(a);
    if (null !== a) if (b2 = Vb(a), null === b2) a = null;
    else if (c = b2.tag, 13 === c) {
      a = Wb(b2);
      if (null !== a) return a;
      a = null;
    } else if (3 === c) {
      if (b2.stateNode.current.memoizedState.isDehydrated) return 3 === b2.tag ? b2.stateNode.containerInfo : null;
      a = null;
    } else b2 !== a && (a = null);
    id = a;
    return null;
  }
  function jd(a) {
    switch (a) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (ec()) {
          case fc:
            return 1;
          case gc:
            return 4;
          case hc:
          case ic:
            return 16;
          case jc:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var kd = null, ld = null, md = null;
  function nd() {
    if (md) return md;
    var a, b2 = ld, c = b2.length, d, e = "value" in kd ? kd.value : kd.textContent, f = e.length;
    for (a = 0; a < c && b2[a] === e[a]; a++) ;
    var g = c - a;
    for (d = 1; d <= g && b2[c - d] === e[f - d]; d++) ;
    return md = e.slice(a, 1 < d ? 1 - d : void 0);
  }
  function od(a) {
    var b2 = a.keyCode;
    "charCode" in a ? (a = a.charCode, 0 === a && 13 === b2 && (a = 13)) : a = b2;
    10 === a && (a = 13);
    return 32 <= a || 13 === a ? a : 0;
  }
  function pd() {
    return true;
  }
  function qd() {
    return false;
  }
  function rd(a) {
    function b2(b3, d, e, f, g) {
      this._reactName = b3;
      this._targetInst = e;
      this.type = d;
      this.nativeEvent = f;
      this.target = g;
      this.currentTarget = null;
      for (var c in a) a.hasOwnProperty(c) && (b3 = a[c], this[c] = b3 ? b3(f) : f[c]);
      this.isDefaultPrevented = (null != f.defaultPrevented ? f.defaultPrevented : false === f.returnValue) ? pd : qd;
      this.isPropagationStopped = qd;
      return this;
    }
    A(b2.prototype, { preventDefault: function() {
      this.defaultPrevented = true;
      var a2 = this.nativeEvent;
      a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
    }, stopPropagation: function() {
      var a2 = this.nativeEvent;
      a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
    }, persist: function() {
    }, isPersistent: pd });
    return b2;
  }
  var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
    return a.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
    return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
  }, movementX: function(a) {
    if ("movementX" in a) return a.movementX;
    a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
    return wd;
  }, movementY: function(a) {
    return "movementY" in a ? a.movementY : xd;
  } }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
    return "clipboardData" in a ? a.clipboardData : window.clipboardData;
  } }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Nd = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Pd(a) {
    var b2 = this.nativeEvent;
    return b2.getModifierState ? b2.getModifierState(a) : (a = Od[a]) ? !!b2[a] : false;
  }
  function zd() {
    return Pd;
  }
  var Qd = A({}, ud, { key: function(a) {
    if (a.key) {
      var b2 = Md[a.key] || a.key;
      if ("Unidentified" !== b2) return b2;
    }
    return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
    return "keypress" === a.type ? od(a) : 0;
  }, keyCode: function(a) {
    return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  }, which: function(a) {
    return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
  } }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
    deltaX: function(a) {
      return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
    },
    deltaY: function(a) {
      return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
  ia && "documentMode" in document && (be = document.documentMode);
  var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
  function ge(a, b2) {
    switch (a) {
      case "keyup":
        return -1 !== $d.indexOf(b2.keyCode);
      case "keydown":
        return 229 !== b2.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function he(a) {
    a = a.detail;
    return "object" === typeof a && "data" in a ? a.data : null;
  }
  var ie = false;
  function je(a, b2) {
    switch (a) {
      case "compositionend":
        return he(b2);
      case "keypress":
        if (32 !== b2.which) return null;
        fe = true;
        return ee;
      case "textInput":
        return a = b2.data, a === ee && fe ? null : a;
      default:
        return null;
    }
  }
  function ke(a, b2) {
    if (ie) return "compositionend" === a || !ae && ge(a, b2) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
    switch (a) {
      case "paste":
        return null;
      case "keypress":
        if (!(b2.ctrlKey || b2.altKey || b2.metaKey) || b2.ctrlKey && b2.altKey) {
          if (b2.char && 1 < b2.char.length) return b2.char;
          if (b2.which) return String.fromCharCode(b2.which);
        }
        return null;
      case "compositionend":
        return de && "ko" !== b2.locale ? null : b2.data;
      default:
        return null;
    }
  }
  var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
  function me(a) {
    var b2 = a && a.nodeName && a.nodeName.toLowerCase();
    return "input" === b2 ? !!le[a.type] : "textarea" === b2 ? true : false;
  }
  function ne(a, b2, c, d) {
    Eb(d);
    b2 = oe(b2, "onChange");
    0 < b2.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b2 }));
  }
  var pe = null, qe = null;
  function re(a) {
    se(a, 0);
  }
  function te(a) {
    var b2 = ue(a);
    if (Wa(b2)) return a;
  }
  function ve(a, b2) {
    if ("change" === a) return b2;
  }
  var we = false;
  if (ia) {
    var xe;
    if (ia) {
      var ye = "oninput" in document;
      if (!ye) {
        var ze = document.createElement("div");
        ze.setAttribute("oninput", "return;");
        ye = "function" === typeof ze.oninput;
      }
      xe = ye;
    } else xe = false;
    we = xe && (!document.documentMode || 9 < document.documentMode);
  }
  function Ae() {
    pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
  }
  function Be(a) {
    if ("value" === a.propertyName && te(qe)) {
      var b2 = [];
      ne(b2, qe, a, xb(a));
      Jb(re, b2);
    }
  }
  function Ce(a, b2, c) {
    "focusin" === a ? (Ae(), pe = b2, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
  }
  function De(a) {
    if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
  }
  function Ee(a, b2) {
    if ("click" === a) return te(b2);
  }
  function Fe(a, b2) {
    if ("input" === a || "change" === a) return te(b2);
  }
  function Ge(a, b2) {
    return a === b2 && (0 !== a || 1 / a === 1 / b2) || a !== a && b2 !== b2;
  }
  var He = "function" === typeof Object.is ? Object.is : Ge;
  function Ie(a, b2) {
    if (He(a, b2)) return true;
    if ("object" !== typeof a || null === a || "object" !== typeof b2 || null === b2) return false;
    var c = Object.keys(a), d = Object.keys(b2);
    if (c.length !== d.length) return false;
    for (d = 0; d < c.length; d++) {
      var e = c[d];
      if (!ja.call(b2, e) || !He(a[e], b2[e])) return false;
    }
    return true;
  }
  function Je(a) {
    for (; a && a.firstChild; ) a = a.firstChild;
    return a;
  }
  function Ke(a, b2) {
    var c = Je(a);
    a = 0;
    for (var d; c; ) {
      if (3 === c.nodeType) {
        d = a + c.textContent.length;
        if (a <= b2 && d >= b2) return { node: c, offset: b2 - a };
        a = d;
      }
      a: {
        for (; c; ) {
          if (c.nextSibling) {
            c = c.nextSibling;
            break a;
          }
          c = c.parentNode;
        }
        c = void 0;
      }
      c = Je(c);
    }
  }
  function Le(a, b2) {
    return a && b2 ? a === b2 ? true : a && 3 === a.nodeType ? false : b2 && 3 === b2.nodeType ? Le(a, b2.parentNode) : "contains" in a ? a.contains(b2) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b2) & 16) : false : false;
  }
  function Me() {
    for (var a = window, b2 = Xa(); b2 instanceof a.HTMLIFrameElement; ) {
      try {
        var c = "string" === typeof b2.contentWindow.location.href;
      } catch (d) {
        c = false;
      }
      if (c) a = b2.contentWindow;
      else break;
      b2 = Xa(a.document);
    }
    return b2;
  }
  function Ne(a) {
    var b2 = a && a.nodeName && a.nodeName.toLowerCase();
    return b2 && ("input" === b2 && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b2 || "true" === a.contentEditable);
  }
  function Oe(a) {
    var b2 = Me(), c = a.focusedElem, d = a.selectionRange;
    if (b2 !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
      if (null !== d && Ne(c)) {
        if (b2 = d.start, a = d.end, void 0 === a && (a = b2), "selectionStart" in c) c.selectionStart = b2, c.selectionEnd = Math.min(a, c.value.length);
        else if (a = (b2 = c.ownerDocument || document) && b2.defaultView || window, a.getSelection) {
          a = a.getSelection();
          var e = c.textContent.length, f = Math.min(d.start, e);
          d = void 0 === d.end ? f : Math.min(d.end, e);
          !a.extend && f > d && (e = d, d = f, f = e);
          e = Ke(c, f);
          var g = Ke(
            c,
            d
          );
          e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b2 = b2.createRange(), b2.setStart(e.node, e.offset), a.removeAllRanges(), f > d ? (a.addRange(b2), a.extend(g.node, g.offset)) : (b2.setEnd(g.node, g.offset), a.addRange(b2)));
        }
      }
      b2 = [];
      for (a = c; a = a.parentNode; ) 1 === a.nodeType && b2.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
      "function" === typeof c.focus && c.focus();
      for (c = 0; c < b2.length; c++) a = b2[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
    }
  }
  var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
  function Ue(a, b2, c) {
    var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
    Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b2 = new td("onSelect", "select", null, b2, c), a.push({ event: b2, listeners: d }), b2.target = Qe)));
  }
  function Ve(a, b2) {
    var c = {};
    c[a.toLowerCase()] = b2.toLowerCase();
    c["Webkit" + a] = "webkit" + b2;
    c["Moz" + a] = "moz" + b2;
    return c;
  }
  var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
  ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
  function Ze(a) {
    if (Xe[a]) return Xe[a];
    if (!We[a]) return a;
    var b2 = We[a], c;
    for (c in b2) if (b2.hasOwnProperty(c) && c in Ye) return Xe[a] = b2[c];
    return a;
  }
  var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function ff(a, b2) {
    df.set(a, b2);
    fa(b2, [a]);
  }
  for (var gf = 0; gf < ef.length; gf++) {
    var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
    ff(jf, "on" + kf);
  }
  ff($e, "onAnimationEnd");
  ff(af, "onAnimationIteration");
  ff(bf, "onAnimationStart");
  ff("dblclick", "onDoubleClick");
  ff("focusin", "onFocus");
  ff("focusout", "onBlur");
  ff(cf, "onTransitionEnd");
  ha("onMouseEnter", ["mouseout", "mouseover"]);
  ha("onMouseLeave", ["mouseout", "mouseover"]);
  ha("onPointerEnter", ["pointerout", "pointerover"]);
  ha("onPointerLeave", ["pointerout", "pointerover"]);
  fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
  fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
  fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
  fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
  fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
  fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
  function nf(a, b2, c) {
    var d = a.type || "unknown-event";
    a.currentTarget = c;
    Ub(d, b2, void 0, a);
    a.currentTarget = null;
  }
  function se(a, b2) {
    b2 = 0 !== (b2 & 4);
    for (var c = 0; c < a.length; c++) {
      var d = a[c], e = d.event;
      d = d.listeners;
      a: {
        var f = void 0;
        if (b2) for (var g = d.length - 1; 0 <= g; g--) {
          var h = d[g], k = h.instance, l = h.currentTarget;
          h = h.listener;
          if (k !== f && e.isPropagationStopped()) break a;
          nf(e, h, l);
          f = k;
        }
        else for (g = 0; g < d.length; g++) {
          h = d[g];
          k = h.instance;
          l = h.currentTarget;
          h = h.listener;
          if (k !== f && e.isPropagationStopped()) break a;
          nf(e, h, l);
          f = k;
        }
      }
    }
    if (Qb) throw a = Rb, Qb = false, Rb = null, a;
  }
  function D(a, b2) {
    var c = b2[of];
    void 0 === c && (c = b2[of] = /* @__PURE__ */ new Set());
    var d = a + "__bubble";
    c.has(d) || (pf(b2, a, 2, false), c.add(d));
  }
  function qf(a, b2, c) {
    var d = 0;
    b2 && (d |= 4);
    pf(c, a, d, b2);
  }
  var rf = "_reactListening" + Math.random().toString(36).slice(2);
  function sf(a) {
    if (!a[rf]) {
      a[rf] = true;
      da.forEach(function(b3) {
        "selectionchange" !== b3 && (mf.has(b3) || qf(b3, false, a), qf(b3, true, a));
      });
      var b2 = 9 === a.nodeType ? a : a.ownerDocument;
      null === b2 || b2[rf] || (b2[rf] = true, qf("selectionchange", false, b2));
    }
  }
  function pf(a, b2, c, d) {
    switch (jd(b2)) {
      case 1:
        var e = ed;
        break;
      case 4:
        e = gd;
        break;
      default:
        e = fd;
    }
    c = e.bind(null, b2, c, a);
    e = void 0;
    !Lb || "touchstart" !== b2 && "touchmove" !== b2 && "wheel" !== b2 || (e = true);
    d ? void 0 !== e ? a.addEventListener(b2, c, { capture: true, passive: e }) : a.addEventListener(b2, c, true) : void 0 !== e ? a.addEventListener(b2, c, { passive: e }) : a.addEventListener(b2, c, false);
  }
  function hd(a, b2, c, d, e) {
    var f = d;
    if (0 === (b2 & 1) && 0 === (b2 & 2) && null !== d) a: for (; ; ) {
      if (null === d) return;
      var g = d.tag;
      if (3 === g || 4 === g) {
        var h = d.stateNode.containerInfo;
        if (h === e || 8 === h.nodeType && h.parentNode === e) break;
        if (4 === g) for (g = d.return; null !== g; ) {
          var k = g.tag;
          if (3 === k || 4 === k) {
            if (k = g.stateNode.containerInfo, k === e || 8 === k.nodeType && k.parentNode === e) return;
          }
          g = g.return;
        }
        for (; null !== h; ) {
          g = Wc(h);
          if (null === g) return;
          k = g.tag;
          if (5 === k || 6 === k) {
            d = f = g;
            continue a;
          }
          h = h.parentNode;
        }
      }
      d = d.return;
    }
    Jb(function() {
      var d2 = f, e2 = xb(c), g2 = [];
      a: {
        var h2 = df.get(a);
        if (void 0 !== h2) {
          var k2 = td, n = a;
          switch (a) {
            case "keypress":
              if (0 === od(c)) break a;
            case "keydown":
            case "keyup":
              k2 = Rd;
              break;
            case "focusin":
              n = "focus";
              k2 = Fd;
              break;
            case "focusout":
              n = "blur";
              k2 = Fd;
              break;
            case "beforeblur":
            case "afterblur":
              k2 = Fd;
              break;
            case "click":
              if (2 === c.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              k2 = Bd;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              k2 = Dd;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              k2 = Vd;
              break;
            case $e:
            case af:
            case bf:
              k2 = Hd;
              break;
            case cf:
              k2 = Xd;
              break;
            case "scroll":
              k2 = vd;
              break;
            case "wheel":
              k2 = Zd;
              break;
            case "copy":
            case "cut":
            case "paste":
              k2 = Jd;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              k2 = Td;
          }
          var t = 0 !== (b2 & 4), J = !t && "scroll" === a, x = t ? null !== h2 ? h2 + "Capture" : null : h2;
          t = [];
          for (var w = d2, u; null !== w; ) {
            u = w;
            var F = u.stateNode;
            5 === u.tag && null !== F && (u = F, null !== x && (F = Kb(w, x), null != F && t.push(tf(w, F, u))));
            if (J) break;
            w = w.return;
          }
          0 < t.length && (h2 = new k2(h2, n, null, c, e2), g2.push({ event: h2, listeners: t }));
        }
      }
      if (0 === (b2 & 7)) {
        a: {
          h2 = "mouseover" === a || "pointerover" === a;
          k2 = "mouseout" === a || "pointerout" === a;
          if (h2 && c !== wb && (n = c.relatedTarget || c.fromElement) && (Wc(n) || n[uf])) break a;
          if (k2 || h2) {
            h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
            if (k2) {
              if (n = c.relatedTarget || c.toElement, k2 = d2, n = n ? Wc(n) : null, null !== n && (J = Vb(n), n !== J || 5 !== n.tag && 6 !== n.tag)) n = null;
            } else k2 = null, n = d2;
            if (k2 !== n) {
              t = Bd;
              F = "onMouseLeave";
              x = "onMouseEnter";
              w = "mouse";
              if ("pointerout" === a || "pointerover" === a) t = Td, F = "onPointerLeave", x = "onPointerEnter", w = "pointer";
              J = null == k2 ? h2 : ue(k2);
              u = null == n ? h2 : ue(n);
              h2 = new t(F, w + "leave", k2, c, e2);
              h2.target = J;
              h2.relatedTarget = u;
              F = null;
              Wc(e2) === d2 && (t = new t(x, w + "enter", n, c, e2), t.target = u, t.relatedTarget = J, F = t);
              J = F;
              if (k2 && n) b: {
                t = k2;
                x = n;
                w = 0;
                for (u = t; u; u = vf(u)) w++;
                u = 0;
                for (F = x; F; F = vf(F)) u++;
                for (; 0 < w - u; ) t = vf(t), w--;
                for (; 0 < u - w; ) x = vf(x), u--;
                for (; w--; ) {
                  if (t === x || null !== x && t === x.alternate) break b;
                  t = vf(t);
                  x = vf(x);
                }
                t = null;
              }
              else t = null;
              null !== k2 && wf(g2, h2, k2, t, false);
              null !== n && null !== J && wf(g2, J, n, t, true);
            }
          }
        }
        a: {
          h2 = d2 ? ue(d2) : window;
          k2 = h2.nodeName && h2.nodeName.toLowerCase();
          if ("select" === k2 || "input" === k2 && "file" === h2.type) var na = ve;
          else if (me(h2)) if (we) na = Fe;
          else {
            na = De;
            var xa = Ce;
          }
          else (k2 = h2.nodeName) && "input" === k2.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
          if (na && (na = na(a, d2))) {
            ne(g2, na, c, e2);
            break a;
          }
          xa && xa(a, h2, d2);
          "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
        }
        xa = d2 ? ue(d2) : window;
        switch (a) {
          case "focusin":
            if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
            break;
          case "focusout":
            Se = Re = Qe = null;
            break;
          case "mousedown":
            Te = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Te = false;
            Ue(g2, c, e2);
            break;
          case "selectionchange":
            if (Pe) break;
          case "keydown":
          case "keyup":
            Ue(g2, c, e2);
        }
        var $a;
        if (ae) b: {
          switch (a) {
            case "compositionstart":
              var ba = "onCompositionStart";
              break b;
            case "compositionend":
              ba = "onCompositionEnd";
              break b;
            case "compositionupdate":
              ba = "onCompositionUpdate";
              break b;
          }
          ba = void 0;
        }
        else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
        ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
        if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
      }
      se(g2, b2);
    });
  }
  function tf(a, b2, c) {
    return { instance: a, listener: b2, currentTarget: c };
  }
  function oe(a, b2) {
    for (var c = b2 + "Capture", d = []; null !== a; ) {
      var e = a, f = e.stateNode;
      5 === e.tag && null !== f && (e = f, f = Kb(a, c), null != f && d.unshift(tf(a, f, e)), f = Kb(a, b2), null != f && d.push(tf(a, f, e)));
      a = a.return;
    }
    return d;
  }
  function vf(a) {
    if (null === a) return null;
    do
      a = a.return;
    while (a && 5 !== a.tag);
    return a ? a : null;
  }
  function wf(a, b2, c, d, e) {
    for (var f = b2._reactName, g = []; null !== c && c !== d; ) {
      var h = c, k = h.alternate, l = h.stateNode;
      if (null !== k && k === d) break;
      5 === h.tag && null !== l && (h = l, e ? (k = Kb(c, f), null != k && g.unshift(tf(c, k, h))) : e || (k = Kb(c, f), null != k && g.push(tf(c, k, h))));
      c = c.return;
    }
    0 !== g.length && a.push({ event: b2, listeners: g });
  }
  var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
  function zf(a) {
    return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
  }
  function Af(a, b2, c) {
    b2 = zf(b2);
    if (zf(a) !== b2 && c) throw Error(p(425));
  }
  function Bf() {
  }
  var Cf = null, Df = null;
  function Ef(a, b2) {
    return "textarea" === a || "noscript" === a || "string" === typeof b2.children || "number" === typeof b2.children || "object" === typeof b2.dangerouslySetInnerHTML && null !== b2.dangerouslySetInnerHTML && null != b2.dangerouslySetInnerHTML.__html;
  }
  var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
    return Hf.resolve(null).then(a).catch(If);
  } : Ff;
  function If(a) {
    setTimeout(function() {
      throw a;
    });
  }
  function Kf(a, b2) {
    var c = b2, d = 0;
    do {
      var e = c.nextSibling;
      a.removeChild(c);
      if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
        if (0 === d) {
          a.removeChild(e);
          bd(b2);
          return;
        }
        d--;
      } else "$" !== c && "$?" !== c && "$!" !== c || d++;
      c = e;
    } while (c);
    bd(b2);
  }
  function Lf(a) {
    for (; null != a; a = a.nextSibling) {
      var b2 = a.nodeType;
      if (1 === b2 || 3 === b2) break;
      if (8 === b2) {
        b2 = a.data;
        if ("$" === b2 || "$!" === b2 || "$?" === b2) break;
        if ("/$" === b2) return null;
      }
    }
    return a;
  }
  function Mf(a) {
    a = a.previousSibling;
    for (var b2 = 0; a; ) {
      if (8 === a.nodeType) {
        var c = a.data;
        if ("$" === c || "$!" === c || "$?" === c) {
          if (0 === b2) return a;
          b2--;
        } else "/$" === c && b2++;
      }
      a = a.previousSibling;
    }
    return null;
  }
  var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
  function Wc(a) {
    var b2 = a[Of];
    if (b2) return b2;
    for (var c = a.parentNode; c; ) {
      if (b2 = c[uf] || c[Of]) {
        c = b2.alternate;
        if (null !== b2.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
          if (c = a[Of]) return c;
          a = Mf(a);
        }
        return b2;
      }
      a = c;
      c = a.parentNode;
    }
    return null;
  }
  function Cb(a) {
    a = a[Of] || a[uf];
    return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
  }
  function ue(a) {
    if (5 === a.tag || 6 === a.tag) return a.stateNode;
    throw Error(p(33));
  }
  function Db(a) {
    return a[Pf] || null;
  }
  var Sf = [], Tf = -1;
  function Uf(a) {
    return { current: a };
  }
  function E(a) {
    0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
  }
  function G(a, b2) {
    Tf++;
    Sf[Tf] = a.current;
    a.current = b2;
  }
  var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
  function Yf(a, b2) {
    var c = a.type.contextTypes;
    if (!c) return Vf;
    var d = a.stateNode;
    if (d && d.__reactInternalMemoizedUnmaskedChildContext === b2) return d.__reactInternalMemoizedMaskedChildContext;
    var e = {}, f;
    for (f in c) e[f] = b2[f];
    d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b2, a.__reactInternalMemoizedMaskedChildContext = e);
    return e;
  }
  function Zf(a) {
    a = a.childContextTypes;
    return null !== a && void 0 !== a;
  }
  function $f() {
    E(Wf);
    E(H);
  }
  function ag(a, b2, c) {
    if (H.current !== Vf) throw Error(p(168));
    G(H, b2);
    G(Wf, c);
  }
  function bg(a, b2, c) {
    var d = a.stateNode;
    b2 = b2.childContextTypes;
    if ("function" !== typeof d.getChildContext) return c;
    d = d.getChildContext();
    for (var e in d) if (!(e in b2)) throw Error(p(108, Ra(a) || "Unknown", e));
    return A({}, c, d);
  }
  function cg(a) {
    a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
    Xf = H.current;
    G(H, a);
    G(Wf, Wf.current);
    return true;
  }
  function dg(a, b2, c) {
    var d = a.stateNode;
    if (!d) throw Error(p(169));
    c ? (a = bg(a, b2, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
    G(Wf, c);
  }
  var eg = null, fg = false, gg = false;
  function hg(a) {
    null === eg ? eg = [a] : eg.push(a);
  }
  function ig(a) {
    fg = true;
    hg(a);
  }
  function jg() {
    if (!gg && null !== eg) {
      gg = true;
      var a = 0, b2 = C;
      try {
        var c = eg;
        for (C = 1; a < c.length; a++) {
          var d = c[a];
          do
            d = d(true);
          while (null !== d);
        }
        eg = null;
        fg = false;
      } catch (e) {
        throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
      } finally {
        C = b2, gg = false;
      }
    }
    return null;
  }
  var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
  function tg(a, b2) {
    kg[lg++] = ng;
    kg[lg++] = mg;
    mg = a;
    ng = b2;
  }
  function ug(a, b2, c) {
    og[pg++] = rg;
    og[pg++] = sg;
    og[pg++] = qg;
    qg = a;
    var d = rg;
    a = sg;
    var e = 32 - oc(d) - 1;
    d &= ~(1 << e);
    c += 1;
    var f = 32 - oc(b2) + e;
    if (30 < f) {
      var g = e - e % 5;
      f = (d & (1 << g) - 1).toString(32);
      d >>= g;
      e -= g;
      rg = 1 << 32 - oc(b2) + e | c << e | d;
      sg = f + a;
    } else rg = 1 << f | c << e | d, sg = a;
  }
  function vg(a) {
    null !== a.return && (tg(a, 1), ug(a, 1, 0));
  }
  function wg(a) {
    for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
    for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
  }
  var xg = null, yg = null, I = false, zg = null;
  function Ag(a, b2) {
    var c = Bg(5, null, null, 0);
    c.elementType = "DELETED";
    c.stateNode = b2;
    c.return = a;
    b2 = a.deletions;
    null === b2 ? (a.deletions = [c], a.flags |= 16) : b2.push(c);
  }
  function Cg(a, b2) {
    switch (a.tag) {
      case 5:
        var c = a.type;
        b2 = 1 !== b2.nodeType || c.toLowerCase() !== b2.nodeName.toLowerCase() ? null : b2;
        return null !== b2 ? (a.stateNode = b2, xg = a, yg = Lf(b2.firstChild), true) : false;
      case 6:
        return b2 = "" === a.pendingProps || 3 !== b2.nodeType ? null : b2, null !== b2 ? (a.stateNode = b2, xg = a, yg = null, true) : false;
      case 13:
        return b2 = 8 !== b2.nodeType ? null : b2, null !== b2 ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b2, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b2, c.return = a, a.child = c, xg = a, yg = null, true) : false;
      default:
        return false;
    }
  }
  function Dg(a) {
    return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
  }
  function Eg(a) {
    if (I) {
      var b2 = yg;
      if (b2) {
        var c = b2;
        if (!Cg(a, b2)) {
          if (Dg(a)) throw Error(p(418));
          b2 = Lf(c.nextSibling);
          var d = xg;
          b2 && Cg(a, b2) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
        }
      } else {
        if (Dg(a)) throw Error(p(418));
        a.flags = a.flags & -4097 | 2;
        I = false;
        xg = a;
      }
    }
  }
  function Fg(a) {
    for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
    xg = a;
  }
  function Gg(a) {
    if (a !== xg) return false;
    if (!I) return Fg(a), I = true, false;
    var b2;
    (b2 = 3 !== a.tag) && !(b2 = 5 !== a.tag) && (b2 = a.type, b2 = "head" !== b2 && "body" !== b2 && !Ef(a.type, a.memoizedProps));
    if (b2 && (b2 = yg)) {
      if (Dg(a)) throw Hg(), Error(p(418));
      for (; b2; ) Ag(a, b2), b2 = Lf(b2.nextSibling);
    }
    Fg(a);
    if (13 === a.tag) {
      a = a.memoizedState;
      a = null !== a ? a.dehydrated : null;
      if (!a) throw Error(p(317));
      a: {
        a = a.nextSibling;
        for (b2 = 0; a; ) {
          if (8 === a.nodeType) {
            var c = a.data;
            if ("/$" === c) {
              if (0 === b2) {
                yg = Lf(a.nextSibling);
                break a;
              }
              b2--;
            } else "$" !== c && "$!" !== c && "$?" !== c || b2++;
          }
          a = a.nextSibling;
        }
        yg = null;
      }
    } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
    return true;
  }
  function Hg() {
    for (var a = yg; a; ) a = Lf(a.nextSibling);
  }
  function Ig() {
    yg = xg = null;
    I = false;
  }
  function Jg(a) {
    null === zg ? zg = [a] : zg.push(a);
  }
  var Kg = ua.ReactCurrentBatchConfig;
  function Lg(a, b2, c) {
    a = c.ref;
    if (null !== a && "function" !== typeof a && "object" !== typeof a) {
      if (c._owner) {
        c = c._owner;
        if (c) {
          if (1 !== c.tag) throw Error(p(309));
          var d = c.stateNode;
        }
        if (!d) throw Error(p(147, a));
        var e = d, f = "" + a;
        if (null !== b2 && null !== b2.ref && "function" === typeof b2.ref && b2.ref._stringRef === f) return b2.ref;
        b2 = function(a2) {
          var b3 = e.refs;
          null === a2 ? delete b3[f] : b3[f] = a2;
        };
        b2._stringRef = f;
        return b2;
      }
      if ("string" !== typeof a) throw Error(p(284));
      if (!c._owner) throw Error(p(290, a));
    }
    return a;
  }
  function Mg(a, b2) {
    a = Object.prototype.toString.call(b2);
    throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b2).join(", ") + "}" : a));
  }
  function Ng(a) {
    var b2 = a._init;
    return b2(a._payload);
  }
  function Og(a) {
    function b2(b3, c2) {
      if (a) {
        var d2 = b3.deletions;
        null === d2 ? (b3.deletions = [c2], b3.flags |= 16) : d2.push(c2);
      }
    }
    function c(c2, d2) {
      if (!a) return null;
      for (; null !== d2; ) b2(c2, d2), d2 = d2.sibling;
      return null;
    }
    function d(a2, b3) {
      for (a2 = /* @__PURE__ */ new Map(); null !== b3; ) null !== b3.key ? a2.set(b3.key, b3) : a2.set(b3.index, b3), b3 = b3.sibling;
      return a2;
    }
    function e(a2, b3) {
      a2 = Pg(a2, b3);
      a2.index = 0;
      a2.sibling = null;
      return a2;
    }
    function f(b3, c2, d2) {
      b3.index = d2;
      if (!a) return b3.flags |= 1048576, c2;
      d2 = b3.alternate;
      if (null !== d2) return d2 = d2.index, d2 < c2 ? (b3.flags |= 2, c2) : d2;
      b3.flags |= 2;
      return c2;
    }
    function g(b3) {
      a && null === b3.alternate && (b3.flags |= 2);
      return b3;
    }
    function h(a2, b3, c2, d2) {
      if (null === b3 || 6 !== b3.tag) return b3 = Qg(c2, a2.mode, d2), b3.return = a2, b3;
      b3 = e(b3, c2);
      b3.return = a2;
      return b3;
    }
    function k(a2, b3, c2, d2) {
      var f2 = c2.type;
      if (f2 === ya) return m(a2, b3, c2.props.children, d2, c2.key);
      if (null !== b3 && (b3.elementType === f2 || "object" === typeof f2 && null !== f2 && f2.$$typeof === Ha && Ng(f2) === b3.type)) return d2 = e(b3, c2.props), d2.ref = Lg(a2, b3, c2), d2.return = a2, d2;
      d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
      d2.ref = Lg(a2, b3, c2);
      d2.return = a2;
      return d2;
    }
    function l(a2, b3, c2, d2) {
      if (null === b3 || 4 !== b3.tag || b3.stateNode.containerInfo !== c2.containerInfo || b3.stateNode.implementation !== c2.implementation) return b3 = Sg(c2, a2.mode, d2), b3.return = a2, b3;
      b3 = e(b3, c2.children || []);
      b3.return = a2;
      return b3;
    }
    function m(a2, b3, c2, d2, f2) {
      if (null === b3 || 7 !== b3.tag) return b3 = Tg(c2, a2.mode, d2, f2), b3.return = a2, b3;
      b3 = e(b3, c2);
      b3.return = a2;
      return b3;
    }
    function q(a2, b3, c2) {
      if ("string" === typeof b3 && "" !== b3 || "number" === typeof b3) return b3 = Qg("" + b3, a2.mode, c2), b3.return = a2, b3;
      if ("object" === typeof b3 && null !== b3) {
        switch (b3.$$typeof) {
          case va:
            return c2 = Rg(b3.type, b3.key, b3.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b3), c2.return = a2, c2;
          case wa:
            return b3 = Sg(b3, a2.mode, c2), b3.return = a2, b3;
          case Ha:
            var d2 = b3._init;
            return q(a2, d2(b3._payload), c2);
        }
        if (eb(b3) || Ka(b3)) return b3 = Tg(b3, a2.mode, c2, null), b3.return = a2, b3;
        Mg(a2, b3);
      }
      return null;
    }
    function r(a2, b3, c2, d2) {
      var e2 = null !== b3 ? b3.key : null;
      if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b3, "" + c2, d2);
      if ("object" === typeof c2 && null !== c2) {
        switch (c2.$$typeof) {
          case va:
            return c2.key === e2 ? k(a2, b3, c2, d2) : null;
          case wa:
            return c2.key === e2 ? l(a2, b3, c2, d2) : null;
          case Ha:
            return e2 = c2._init, r(
              a2,
              b3,
              e2(c2._payload),
              d2
            );
        }
        if (eb(c2) || Ka(c2)) return null !== e2 ? null : m(a2, b3, c2, d2, null);
        Mg(a2, c2);
      }
      return null;
    }
    function y(a2, b3, c2, d2, e2) {
      if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b3, a2, "" + d2, e2);
      if ("object" === typeof d2 && null !== d2) {
        switch (d2.$$typeof) {
          case va:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k(b3, a2, d2, e2);
          case wa:
            return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l(b3, a2, d2, e2);
          case Ha:
            var f2 = d2._init;
            return y(a2, b3, c2, f2(d2._payload), e2);
        }
        if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m(b3, a2, d2, e2, null);
        Mg(b3, d2);
      }
      return null;
    }
    function n(e2, g2, h2, k2) {
      for (var l2 = null, m2 = null, u = g2, w = g2 = 0, x = null; null !== u && w < h2.length; w++) {
        u.index > w ? (x = u, u = null) : x = u.sibling;
        var n2 = r(e2, u, h2[w], k2);
        if (null === n2) {
          null === u && (u = x);
          break;
        }
        a && u && null === n2.alternate && b2(e2, u);
        g2 = f(n2, g2, w);
        null === m2 ? l2 = n2 : m2.sibling = n2;
        m2 = n2;
        u = x;
      }
      if (w === h2.length) return c(e2, u), I && tg(e2, w), l2;
      if (null === u) {
        for (; w < h2.length; w++) u = q(e2, h2[w], k2), null !== u && (g2 = f(u, g2, w), null === m2 ? l2 = u : m2.sibling = u, m2 = u);
        I && tg(e2, w);
        return l2;
      }
      for (u = d(e2, u); w < h2.length; w++) x = y(u, e2, w, h2[w], k2), null !== x && (a && null !== x.alternate && u.delete(null === x.key ? w : x.key), g2 = f(x, g2, w), null === m2 ? l2 = x : m2.sibling = x, m2 = x);
      a && u.forEach(function(a2) {
        return b2(e2, a2);
      });
      I && tg(e2, w);
      return l2;
    }
    function t(e2, g2, h2, k2) {
      var l2 = Ka(h2);
      if ("function" !== typeof l2) throw Error(p(150));
      h2 = l2.call(h2);
      if (null == h2) throw Error(p(151));
      for (var u = l2 = null, m2 = g2, w = g2 = 0, x = null, n2 = h2.next(); null !== m2 && !n2.done; w++, n2 = h2.next()) {
        m2.index > w ? (x = m2, m2 = null) : x = m2.sibling;
        var t2 = r(e2, m2, n2.value, k2);
        if (null === t2) {
          null === m2 && (m2 = x);
          break;
        }
        a && m2 && null === t2.alternate && b2(e2, m2);
        g2 = f(t2, g2, w);
        null === u ? l2 = t2 : u.sibling = t2;
        u = t2;
        m2 = x;
      }
      if (n2.done) return c(
        e2,
        m2
      ), I && tg(e2, w), l2;
      if (null === m2) {
        for (; !n2.done; w++, n2 = h2.next()) n2 = q(e2, n2.value, k2), null !== n2 && (g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
        I && tg(e2, w);
        return l2;
      }
      for (m2 = d(e2, m2); !n2.done; w++, n2 = h2.next()) n2 = y(m2, e2, w, n2.value, k2), null !== n2 && (a && null !== n2.alternate && m2.delete(null === n2.key ? w : n2.key), g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
      a && m2.forEach(function(a2) {
        return b2(e2, a2);
      });
      I && tg(e2, w);
      return l2;
    }
    function J(a2, d2, f2, h2) {
      "object" === typeof f2 && null !== f2 && f2.type === ya && null === f2.key && (f2 = f2.props.children);
      if ("object" === typeof f2 && null !== f2) {
        switch (f2.$$typeof) {
          case va:
            a: {
              for (var k2 = f2.key, l2 = d2; null !== l2; ) {
                if (l2.key === k2) {
                  k2 = f2.type;
                  if (k2 === ya) {
                    if (7 === l2.tag) {
                      c(a2, l2.sibling);
                      d2 = e(l2, f2.props.children);
                      d2.return = a2;
                      a2 = d2;
                      break a;
                    }
                  } else if (l2.elementType === k2 || "object" === typeof k2 && null !== k2 && k2.$$typeof === Ha && Ng(k2) === l2.type) {
                    c(a2, l2.sibling);
                    d2 = e(l2, f2.props);
                    d2.ref = Lg(a2, l2, f2);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                  c(a2, l2);
                  break;
                } else b2(a2, l2);
                l2 = l2.sibling;
              }
              f2.type === ya ? (d2 = Tg(f2.props.children, a2.mode, h2, f2.key), d2.return = a2, a2 = d2) : (h2 = Rg(f2.type, f2.key, f2.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f2), h2.return = a2, a2 = h2);
            }
            return g(a2);
          case wa:
            a: {
              for (l2 = f2.key; null !== d2; ) {
                if (d2.key === l2) if (4 === d2.tag && d2.stateNode.containerInfo === f2.containerInfo && d2.stateNode.implementation === f2.implementation) {
                  c(a2, d2.sibling);
                  d2 = e(d2, f2.children || []);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                } else {
                  c(a2, d2);
                  break;
                }
                else b2(a2, d2);
                d2 = d2.sibling;
              }
              d2 = Sg(f2, a2.mode, h2);
              d2.return = a2;
              a2 = d2;
            }
            return g(a2);
          case Ha:
            return l2 = f2._init, J(a2, d2, l2(f2._payload), h2);
        }
        if (eb(f2)) return n(a2, d2, f2, h2);
        if (Ka(f2)) return t(a2, d2, f2, h2);
        Mg(a2, f2);
      }
      return "string" === typeof f2 && "" !== f2 || "number" === typeof f2 ? (f2 = "" + f2, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f2), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f2, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
    }
    return J;
  }
  var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
  function $g() {
    Zg = Yg = Xg = null;
  }
  function ah(a) {
    var b2 = Wg.current;
    E(Wg);
    a._currentValue = b2;
  }
  function bh(a, b2, c) {
    for (; null !== a; ) {
      var d = a.alternate;
      (a.childLanes & b2) !== b2 ? (a.childLanes |= b2, null !== d && (d.childLanes |= b2)) : null !== d && (d.childLanes & b2) !== b2 && (d.childLanes |= b2);
      if (a === c) break;
      a = a.return;
    }
  }
  function ch(a, b2) {
    Xg = a;
    Zg = Yg = null;
    a = a.dependencies;
    null !== a && null !== a.firstContext && (0 !== (a.lanes & b2) && (dh = true), a.firstContext = null);
  }
  function eh(a) {
    var b2 = a._currentValue;
    if (Zg !== a) if (a = { context: a, memoizedValue: b2, next: null }, null === Yg) {
      if (null === Xg) throw Error(p(308));
      Yg = a;
      Xg.dependencies = { lanes: 0, firstContext: a };
    } else Yg = Yg.next = a;
    return b2;
  }
  var fh = null;
  function gh(a) {
    null === fh ? fh = [a] : fh.push(a);
  }
  function hh(a, b2, c, d) {
    var e = b2.interleaved;
    null === e ? (c.next = c, gh(b2)) : (c.next = e.next, e.next = c);
    b2.interleaved = c;
    return ih(a, d);
  }
  function ih(a, b2) {
    a.lanes |= b2;
    var c = a.alternate;
    null !== c && (c.lanes |= b2);
    c = a;
    for (a = a.return; null !== a; ) a.childLanes |= b2, c = a.alternate, null !== c && (c.childLanes |= b2), c = a, a = a.return;
    return 3 === c.tag ? c.stateNode : null;
  }
  var jh = false;
  function kh(a) {
    a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function lh(a, b2) {
    a = a.updateQueue;
    b2.updateQueue === a && (b2.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
  }
  function mh(a, b2) {
    return { eventTime: a, lane: b2, tag: 0, payload: null, callback: null, next: null };
  }
  function nh(a, b2, c) {
    var d = a.updateQueue;
    if (null === d) return null;
    d = d.shared;
    if (0 !== (K & 2)) {
      var e = d.pending;
      null === e ? b2.next = b2 : (b2.next = e.next, e.next = b2);
      d.pending = b2;
      return ih(a, c);
    }
    e = d.interleaved;
    null === e ? (b2.next = b2, gh(d)) : (b2.next = e.next, e.next = b2);
    d.interleaved = b2;
    return ih(a, c);
  }
  function oh(a, b2, c) {
    b2 = b2.updateQueue;
    if (null !== b2 && (b2 = b2.shared, 0 !== (c & 4194240))) {
      var d = b2.lanes;
      d &= a.pendingLanes;
      c |= d;
      b2.lanes = c;
      Cc(a, c);
    }
  }
  function ph(a, b2) {
    var c = a.updateQueue, d = a.alternate;
    if (null !== d && (d = d.updateQueue, c === d)) {
      var e = null, f = null;
      c = c.firstBaseUpdate;
      if (null !== c) {
        do {
          var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
          null === f ? e = f = g : f = f.next = g;
          c = c.next;
        } while (null !== c);
        null === f ? e = f = b2 : f = f.next = b2;
      } else e = f = b2;
      c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f, shared: d.shared, effects: d.effects };
      a.updateQueue = c;
      return;
    }
    a = c.lastBaseUpdate;
    null === a ? c.firstBaseUpdate = b2 : a.next = b2;
    c.lastBaseUpdate = b2;
  }
  function qh(a, b2, c, d) {
    var e = a.updateQueue;
    jh = false;
    var f = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
    if (null !== h) {
      e.shared.pending = null;
      var k = h, l = k.next;
      k.next = null;
      null === g ? f = l : g.next = l;
      g = k;
      var m = a.alternate;
      null !== m && (m = m.updateQueue, h = m.lastBaseUpdate, h !== g && (null === h ? m.firstBaseUpdate = l : h.next = l, m.lastBaseUpdate = k));
    }
    if (null !== f) {
      var q = e.baseState;
      g = 0;
      m = l = k = null;
      h = f;
      do {
        var r = h.lane, y = h.eventTime;
        if ((d & r) === r) {
          null !== m && (m = m.next = {
            eventTime: y,
            lane: 0,
            tag: h.tag,
            payload: h.payload,
            callback: h.callback,
            next: null
          });
          a: {
            var n = a, t = h;
            r = b2;
            y = c;
            switch (t.tag) {
              case 1:
                n = t.payload;
                if ("function" === typeof n) {
                  q = n.call(y, q, r);
                  break a;
                }
                q = n;
                break a;
              case 3:
                n.flags = n.flags & -65537 | 128;
              case 0:
                n = t.payload;
                r = "function" === typeof n ? n.call(y, q, r) : n;
                if (null === r || void 0 === r) break a;
                q = A({}, q, r);
                break a;
              case 2:
                jh = true;
            }
          }
          null !== h.callback && 0 !== h.lane && (a.flags |= 64, r = e.effects, null === r ? e.effects = [h] : r.push(h));
        } else y = { eventTime: y, lane: r, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m ? (l = m = y, k = q) : m = m.next = y, g |= r;
        h = h.next;
        if (null === h) if (h = e.shared.pending, null === h) break;
        else r = h, h = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
      } while (1);
      null === m && (k = q);
      e.baseState = k;
      e.firstBaseUpdate = l;
      e.lastBaseUpdate = m;
      b2 = e.shared.interleaved;
      if (null !== b2) {
        e = b2;
        do
          g |= e.lane, e = e.next;
        while (e !== b2);
      } else null === f && (e.shared.lanes = 0);
      rh |= g;
      a.lanes = g;
      a.memoizedState = q;
    }
  }
  function sh(a, b2, c) {
    a = b2.effects;
    b2.effects = null;
    if (null !== a) for (b2 = 0; b2 < a.length; b2++) {
      var d = a[b2], e = d.callback;
      if (null !== e) {
        d.callback = null;
        d = c;
        if ("function" !== typeof e) throw Error(p(191, e));
        e.call(d);
      }
    }
  }
  var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
  function xh(a) {
    if (a === th) throw Error(p(174));
    return a;
  }
  function yh(a, b2) {
    G(wh, b2);
    G(vh, a);
    G(uh, th);
    a = b2.nodeType;
    switch (a) {
      case 9:
      case 11:
        b2 = (b2 = b2.documentElement) ? b2.namespaceURI : lb(null, "");
        break;
      default:
        a = 8 === a ? b2.parentNode : b2, b2 = a.namespaceURI || null, a = a.tagName, b2 = lb(b2, a);
    }
    E(uh);
    G(uh, b2);
  }
  function zh() {
    E(uh);
    E(vh);
    E(wh);
  }
  function Ah(a) {
    xh(wh.current);
    var b2 = xh(uh.current);
    var c = lb(b2, a.type);
    b2 !== c && (G(vh, a), G(uh, c));
  }
  function Bh(a) {
    vh.current === a && (E(uh), E(vh));
  }
  var L = Uf(0);
  function Ch(a) {
    for (var b2 = a; null !== b2; ) {
      if (13 === b2.tag) {
        var c = b2.memoizedState;
        if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b2;
      } else if (19 === b2.tag && void 0 !== b2.memoizedProps.revealOrder) {
        if (0 !== (b2.flags & 128)) return b2;
      } else if (null !== b2.child) {
        b2.child.return = b2;
        b2 = b2.child;
        continue;
      }
      if (b2 === a) break;
      for (; null === b2.sibling; ) {
        if (null === b2.return || b2.return === a) return null;
        b2 = b2.return;
      }
      b2.sibling.return = b2.return;
      b2 = b2.sibling;
    }
    return null;
  }
  var Dh = [];
  function Eh() {
    for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
    Dh.length = 0;
  }
  var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
  function P() {
    throw Error(p(321));
  }
  function Mh(a, b2) {
    if (null === b2) return false;
    for (var c = 0; c < b2.length && c < a.length; c++) if (!He(a[c], b2[c])) return false;
    return true;
  }
  function Nh(a, b2, c, d, e, f) {
    Hh = f;
    M = b2;
    b2.memoizedState = null;
    b2.updateQueue = null;
    b2.lanes = 0;
    Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
    a = c(d, e);
    if (Jh) {
      f = 0;
      do {
        Jh = false;
        Kh = 0;
        if (25 <= f) throw Error(p(301));
        f += 1;
        O = N = null;
        b2.updateQueue = null;
        Fh.current = Qh;
        a = c(d, e);
      } while (Jh);
    }
    Fh.current = Rh;
    b2 = null !== N && null !== N.next;
    Hh = 0;
    O = N = M = null;
    Ih = false;
    if (b2) throw Error(p(300));
    return a;
  }
  function Sh() {
    var a = 0 !== Kh;
    Kh = 0;
    return a;
  }
  function Th() {
    var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
    return O;
  }
  function Uh() {
    if (null === N) {
      var a = M.alternate;
      a = null !== a ? a.memoizedState : null;
    } else a = N.next;
    var b2 = null === O ? M.memoizedState : O.next;
    if (null !== b2) O = b2, N = a;
    else {
      if (null === a) throw Error(p(310));
      N = a;
      a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
      null === O ? M.memoizedState = O = a : O = O.next = a;
    }
    return O;
  }
  function Vh(a, b2) {
    return "function" === typeof b2 ? b2(a) : b2;
  }
  function Wh(a) {
    var b2 = Uh(), c = b2.queue;
    if (null === c) throw Error(p(311));
    c.lastRenderedReducer = a;
    var d = N, e = d.baseQueue, f = c.pending;
    if (null !== f) {
      if (null !== e) {
        var g = e.next;
        e.next = f.next;
        f.next = g;
      }
      d.baseQueue = e = f;
      c.pending = null;
    }
    if (null !== e) {
      f = e.next;
      d = d.baseState;
      var h = g = null, k = null, l = f;
      do {
        var m = l.lane;
        if ((Hh & m) === m) null !== k && (k = k.next = { lane: 0, action: l.action, hasEagerState: l.hasEagerState, eagerState: l.eagerState, next: null }), d = l.hasEagerState ? l.eagerState : a(d, l.action);
        else {
          var q = {
            lane: m,
            action: l.action,
            hasEagerState: l.hasEagerState,
            eagerState: l.eagerState,
            next: null
          };
          null === k ? (h = k = q, g = d) : k = k.next = q;
          M.lanes |= m;
          rh |= m;
        }
        l = l.next;
      } while (null !== l && l !== f);
      null === k ? g = d : k.next = h;
      He(d, b2.memoizedState) || (dh = true);
      b2.memoizedState = d;
      b2.baseState = g;
      b2.baseQueue = k;
      c.lastRenderedState = d;
    }
    a = c.interleaved;
    if (null !== a) {
      e = a;
      do
        f = e.lane, M.lanes |= f, rh |= f, e = e.next;
      while (e !== a);
    } else null === e && (c.lanes = 0);
    return [b2.memoizedState, c.dispatch];
  }
  function Xh(a) {
    var b2 = Uh(), c = b2.queue;
    if (null === c) throw Error(p(311));
    c.lastRenderedReducer = a;
    var d = c.dispatch, e = c.pending, f = b2.memoizedState;
    if (null !== e) {
      c.pending = null;
      var g = e = e.next;
      do
        f = a(f, g.action), g = g.next;
      while (g !== e);
      He(f, b2.memoizedState) || (dh = true);
      b2.memoizedState = f;
      null === b2.baseQueue && (b2.baseState = f);
      c.lastRenderedState = f;
    }
    return [f, d];
  }
  function Yh() {
  }
  function Zh(a, b2) {
    var c = M, d = Uh(), e = b2(), f = !He(d.memoizedState, e);
    f && (d.memoizedState = e, dh = true);
    d = d.queue;
    $h(ai.bind(null, c, d, a), [a]);
    if (d.getSnapshot !== b2 || f || null !== O && O.memoizedState.tag & 1) {
      c.flags |= 2048;
      bi(9, ci.bind(null, c, d, e, b2), void 0, null);
      if (null === Q) throw Error(p(349));
      0 !== (Hh & 30) || di(c, b2, e);
    }
    return e;
  }
  function di(a, b2, c) {
    a.flags |= 16384;
    a = { getSnapshot: b2, value: c };
    b2 = M.updateQueue;
    null === b2 ? (b2 = { lastEffect: null, stores: null }, M.updateQueue = b2, b2.stores = [a]) : (c = b2.stores, null === c ? b2.stores = [a] : c.push(a));
  }
  function ci(a, b2, c, d) {
    b2.value = c;
    b2.getSnapshot = d;
    ei(b2) && fi(a);
  }
  function ai(a, b2, c) {
    return c(function() {
      ei(b2) && fi(a);
    });
  }
  function ei(a) {
    var b2 = a.getSnapshot;
    a = a.value;
    try {
      var c = b2();
      return !He(a, c);
    } catch (d) {
      return true;
    }
  }
  function fi(a) {
    var b2 = ih(a, 1);
    null !== b2 && gi(b2, a, 1, -1);
  }
  function hi(a) {
    var b2 = Th();
    "function" === typeof a && (a = a());
    b2.memoizedState = b2.baseState = a;
    a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
    b2.queue = a;
    a = a.dispatch = ii.bind(null, M, a);
    return [b2.memoizedState, a];
  }
  function bi(a, b2, c, d) {
    a = { tag: a, create: b2, destroy: c, deps: d, next: null };
    b2 = M.updateQueue;
    null === b2 ? (b2 = { lastEffect: null, stores: null }, M.updateQueue = b2, b2.lastEffect = a.next = a) : (c = b2.lastEffect, null === c ? b2.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b2.lastEffect = a));
    return a;
  }
  function ji() {
    return Uh().memoizedState;
  }
  function ki(a, b2, c, d) {
    var e = Th();
    M.flags |= a;
    e.memoizedState = bi(1 | b2, c, void 0, void 0 === d ? null : d);
  }
  function li(a, b2, c, d) {
    var e = Uh();
    d = void 0 === d ? null : d;
    var f = void 0;
    if (null !== N) {
      var g = N.memoizedState;
      f = g.destroy;
      if (null !== d && Mh(d, g.deps)) {
        e.memoizedState = bi(b2, c, f, d);
        return;
      }
    }
    M.flags |= a;
    e.memoizedState = bi(1 | b2, c, f, d);
  }
  function mi(a, b2) {
    return ki(8390656, 8, a, b2);
  }
  function $h(a, b2) {
    return li(2048, 8, a, b2);
  }
  function ni(a, b2) {
    return li(4, 2, a, b2);
  }
  function oi(a, b2) {
    return li(4, 4, a, b2);
  }
  function pi(a, b2) {
    if ("function" === typeof b2) return a = a(), b2(a), function() {
      b2(null);
    };
    if (null !== b2 && void 0 !== b2) return a = a(), b2.current = a, function() {
      b2.current = null;
    };
  }
  function qi(a, b2, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return li(4, 4, pi.bind(null, b2, a), c);
  }
  function ri() {
  }
  function si(a, b2) {
    var c = Uh();
    b2 = void 0 === b2 ? null : b2;
    var d = c.memoizedState;
    if (null !== d && null !== b2 && Mh(b2, d[1])) return d[0];
    c.memoizedState = [a, b2];
    return a;
  }
  function ti(a, b2) {
    var c = Uh();
    b2 = void 0 === b2 ? null : b2;
    var d = c.memoizedState;
    if (null !== d && null !== b2 && Mh(b2, d[1])) return d[0];
    a = a();
    c.memoizedState = [a, b2];
    return a;
  }
  function ui(a, b2, c) {
    if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
    He(c, b2) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
    return b2;
  }
  function vi(a, b2) {
    var c = C;
    C = 0 !== c && 4 > c ? c : 4;
    a(true);
    var d = Gh.transition;
    Gh.transition = {};
    try {
      a(false), b2();
    } finally {
      C = c, Gh.transition = d;
    }
  }
  function wi() {
    return Uh().memoizedState;
  }
  function xi(a, b2, c) {
    var d = yi(a);
    c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
    if (zi(a)) Ai(b2, c);
    else if (c = hh(a, b2, c, d), null !== c) {
      var e = R();
      gi(c, a, d, e);
      Bi(c, b2, d);
    }
  }
  function ii(a, b2, c) {
    var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
    if (zi(a)) Ai(b2, e);
    else {
      var f = a.alternate;
      if (0 === a.lanes && (null === f || 0 === f.lanes) && (f = b2.lastRenderedReducer, null !== f)) try {
        var g = b2.lastRenderedState, h = f(g, c);
        e.hasEagerState = true;
        e.eagerState = h;
        if (He(h, g)) {
          var k = b2.interleaved;
          null === k ? (e.next = e, gh(b2)) : (e.next = k.next, k.next = e);
          b2.interleaved = e;
          return;
        }
      } catch (l) {
      } finally {
      }
      c = hh(a, b2, e, d);
      null !== c && (e = R(), gi(c, a, d, e), Bi(c, b2, d));
    }
  }
  function zi(a) {
    var b2 = a.alternate;
    return a === M || null !== b2 && b2 === M;
  }
  function Ai(a, b2) {
    Jh = Ih = true;
    var c = a.pending;
    null === c ? b2.next = b2 : (b2.next = c.next, c.next = b2);
    a.pending = b2;
  }
  function Bi(a, b2, c) {
    if (0 !== (c & 4194240)) {
      var d = b2.lanes;
      d &= a.pendingLanes;
      c |= d;
      b2.lanes = c;
      Cc(a, c);
    }
  }
  var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b2) {
    Th().memoizedState = [a, void 0 === b2 ? null : b2];
    return a;
  }, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b2, c) {
    c = null !== c && void 0 !== c ? c.concat([a]) : null;
    return ki(
      4194308,
      4,
      pi.bind(null, b2, a),
      c
    );
  }, useLayoutEffect: function(a, b2) {
    return ki(4194308, 4, a, b2);
  }, useInsertionEffect: function(a, b2) {
    return ki(4, 2, a, b2);
  }, useMemo: function(a, b2) {
    var c = Th();
    b2 = void 0 === b2 ? null : b2;
    a = a();
    c.memoizedState = [a, b2];
    return a;
  }, useReducer: function(a, b2, c) {
    var d = Th();
    b2 = void 0 !== c ? c(b2) : b2;
    d.memoizedState = d.baseState = b2;
    a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b2 };
    d.queue = a;
    a = a.dispatch = xi.bind(null, M, a);
    return [d.memoizedState, a];
  }, useRef: function(a) {
    var b2 = Th();
    a = { current: a };
    return b2.memoizedState = a;
  }, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
    return Th().memoizedState = a;
  }, useTransition: function() {
    var a = hi(false), b2 = a[0];
    a = vi.bind(null, a[1]);
    Th().memoizedState = a;
    return [b2, a];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(a, b2, c) {
    var d = M, e = Th();
    if (I) {
      if (void 0 === c) throw Error(p(407));
      c = c();
    } else {
      c = b2();
      if (null === Q) throw Error(p(349));
      0 !== (Hh & 30) || di(d, b2, c);
    }
    e.memoizedState = c;
    var f = { value: c, getSnapshot: b2 };
    e.queue = f;
    mi(ai.bind(
      null,
      d,
      f,
      a
    ), [a]);
    d.flags |= 2048;
    bi(9, ci.bind(null, d, f, c, b2), void 0, null);
    return c;
  }, useId: function() {
    var a = Th(), b2 = Q.identifierPrefix;
    if (I) {
      var c = sg;
      var d = rg;
      c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
      b2 = ":" + b2 + "R" + c;
      c = Kh++;
      0 < c && (b2 += "H" + c.toString(32));
      b2 += ":";
    } else c = Lh++, b2 = ":" + b2 + "r" + c.toString(32) + ":";
    return a.memoizedState = b2;
  }, unstable_isNewReconciler: false }, Ph = {
    readContext: eh,
    useCallback: si,
    useContext: eh,
    useEffect: $h,
    useImperativeHandle: qi,
    useInsertionEffect: ni,
    useLayoutEffect: oi,
    useMemo: ti,
    useReducer: Wh,
    useRef: ji,
    useState: function() {
      return Wh(Vh);
    },
    useDebugValue: ri,
    useDeferredValue: function(a) {
      var b2 = Uh();
      return ui(b2, N.memoizedState, a);
    },
    useTransition: function() {
      var a = Wh(Vh)[0], b2 = Uh().memoizedState;
      return [a, b2];
    },
    useMutableSource: Yh,
    useSyncExternalStore: Zh,
    useId: wi,
    unstable_isNewReconciler: false
  }, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
    return Xh(Vh);
  }, useDebugValue: ri, useDeferredValue: function(a) {
    var b2 = Uh();
    return null === N ? b2.memoizedState = a : ui(b2, N.memoizedState, a);
  }, useTransition: function() {
    var a = Xh(Vh)[0], b2 = Uh().memoizedState;
    return [a, b2];
  }, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
  function Ci(a, b2) {
    if (a && a.defaultProps) {
      b2 = A({}, b2);
      a = a.defaultProps;
      for (var c in a) void 0 === b2[c] && (b2[c] = a[c]);
      return b2;
    }
    return b2;
  }
  function Di(a, b2, c, d) {
    b2 = a.memoizedState;
    c = c(d, b2);
    c = null === c || void 0 === c ? b2 : A({}, b2, c);
    a.memoizedState = c;
    0 === a.lanes && (a.updateQueue.baseState = c);
  }
  var Ei = { isMounted: function(a) {
    return (a = a._reactInternals) ? Vb(a) === a : false;
  }, enqueueSetState: function(a, b2, c) {
    a = a._reactInternals;
    var d = R(), e = yi(a), f = mh(d, e);
    f.payload = b2;
    void 0 !== c && null !== c && (f.callback = c);
    b2 = nh(a, f, e);
    null !== b2 && (gi(b2, a, e, d), oh(b2, a, e));
  }, enqueueReplaceState: function(a, b2, c) {
    a = a._reactInternals;
    var d = R(), e = yi(a), f = mh(d, e);
    f.tag = 1;
    f.payload = b2;
    void 0 !== c && null !== c && (f.callback = c);
    b2 = nh(a, f, e);
    null !== b2 && (gi(b2, a, e, d), oh(b2, a, e));
  }, enqueueForceUpdate: function(a, b2) {
    a = a._reactInternals;
    var c = R(), d = yi(a), e = mh(c, d);
    e.tag = 2;
    void 0 !== b2 && null !== b2 && (e.callback = b2);
    b2 = nh(a, e, d);
    null !== b2 && (gi(b2, a, d, c), oh(b2, a, d));
  } };
  function Fi(a, b2, c, d, e, f, g) {
    a = a.stateNode;
    return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b2.prototype && b2.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f) : true;
  }
  function Gi(a, b2, c) {
    var d = false, e = Vf;
    var f = b2.contextType;
    "object" === typeof f && null !== f ? f = eh(f) : (e = Zf(b2) ? Xf : H.current, d = b2.contextTypes, f = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
    b2 = new b2(c, f);
    a.memoizedState = null !== b2.state && void 0 !== b2.state ? b2.state : null;
    b2.updater = Ei;
    a.stateNode = b2;
    b2._reactInternals = a;
    d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
    return b2;
  }
  function Hi(a, b2, c, d) {
    a = b2.state;
    "function" === typeof b2.componentWillReceiveProps && b2.componentWillReceiveProps(c, d);
    "function" === typeof b2.UNSAFE_componentWillReceiveProps && b2.UNSAFE_componentWillReceiveProps(c, d);
    b2.state !== a && Ei.enqueueReplaceState(b2, b2.state, null);
  }
  function Ii(a, b2, c, d) {
    var e = a.stateNode;
    e.props = c;
    e.state = a.memoizedState;
    e.refs = {};
    kh(a);
    var f = b2.contextType;
    "object" === typeof f && null !== f ? e.context = eh(f) : (f = Zf(b2) ? Xf : H.current, e.context = Yf(a, f));
    e.state = a.memoizedState;
    f = b2.getDerivedStateFromProps;
    "function" === typeof f && (Di(a, b2, f, c), e.state = a.memoizedState);
    "function" === typeof b2.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b2 = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b2 !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
    "function" === typeof e.componentDidMount && (a.flags |= 4194308);
  }
  function Ji(a, b2) {
    try {
      var c = "", d = b2;
      do
        c += Pa(d), d = d.return;
      while (d);
      var e = c;
    } catch (f) {
      e = "\nError generating stack: " + f.message + "\n" + f.stack;
    }
    return { value: a, source: b2, stack: e, digest: null };
  }
  function Ki(a, b2, c) {
    return { value: a, source: null, stack: null != c ? c : null, digest: null != b2 ? b2 : null };
  }
  function Li(a, b2) {
    try {
      console.error(b2.value);
    } catch (c) {
      setTimeout(function() {
        throw c;
      });
    }
  }
  var Mi = "function" === typeof WeakMap ? WeakMap : Map;
  function Ni(a, b2, c) {
    c = mh(-1, c);
    c.tag = 3;
    c.payload = { element: null };
    var d = b2.value;
    c.callback = function() {
      Oi || (Oi = true, Pi = d);
      Li(a, b2);
    };
    return c;
  }
  function Qi(a, b2, c) {
    c = mh(-1, c);
    c.tag = 3;
    var d = a.type.getDerivedStateFromError;
    if ("function" === typeof d) {
      var e = b2.value;
      c.payload = function() {
        return d(e);
      };
      c.callback = function() {
        Li(a, b2);
      };
    }
    var f = a.stateNode;
    null !== f && "function" === typeof f.componentDidCatch && (c.callback = function() {
      Li(a, b2);
      "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
      var c2 = b2.stack;
      this.componentDidCatch(b2.value, { componentStack: null !== c2 ? c2 : "" });
    });
    return c;
  }
  function Si(a, b2, c) {
    var d = a.pingCache;
    if (null === d) {
      d = a.pingCache = new Mi();
      var e = /* @__PURE__ */ new Set();
      d.set(b2, e);
    } else e = d.get(b2), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b2, e));
    e.has(c) || (e.add(c), a = Ti.bind(null, a, b2, c), b2.then(a, a));
  }
  function Ui(a) {
    do {
      var b2;
      if (b2 = 13 === a.tag) b2 = a.memoizedState, b2 = null !== b2 ? null !== b2.dehydrated ? true : false : true;
      if (b2) return a;
      a = a.return;
    } while (null !== a);
    return null;
  }
  function Vi(a, b2, c, d, e) {
    if (0 === (a.mode & 1)) return a === b2 ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b2 = mh(-1, 1), b2.tag = 2, nh(c, b2, 1))), c.lanes |= 1), a;
    a.flags |= 65536;
    a.lanes = e;
    return a;
  }
  var Wi = ua.ReactCurrentOwner, dh = false;
  function Xi(a, b2, c, d) {
    b2.child = null === a ? Vg(b2, null, c, d) : Ug(b2, a.child, c, d);
  }
  function Yi(a, b2, c, d, e) {
    c = c.render;
    var f = b2.ref;
    ch(b2, e);
    d = Nh(a, b2, c, d, f, e);
    c = Sh();
    if (null !== a && !dh) return b2.updateQueue = a.updateQueue, b2.flags &= -2053, a.lanes &= ~e, Zi(a, b2, e);
    I && c && vg(b2);
    b2.flags |= 1;
    Xi(a, b2, d, e);
    return b2.child;
  }
  function $i(a, b2, c, d, e) {
    if (null === a) {
      var f = c.type;
      if ("function" === typeof f && !aj(f) && void 0 === f.defaultProps && null === c.compare && void 0 === c.defaultProps) return b2.tag = 15, b2.type = f, bj(a, b2, f, d, e);
      a = Rg(c.type, null, d, b2, b2.mode, e);
      a.ref = b2.ref;
      a.return = b2;
      return b2.child = a;
    }
    f = a.child;
    if (0 === (a.lanes & e)) {
      var g = f.memoizedProps;
      c = c.compare;
      c = null !== c ? c : Ie;
      if (c(g, d) && a.ref === b2.ref) return Zi(a, b2, e);
    }
    b2.flags |= 1;
    a = Pg(f, d);
    a.ref = b2.ref;
    a.return = b2;
    return b2.child = a;
  }
  function bj(a, b2, c, d, e) {
    if (null !== a) {
      var f = a.memoizedProps;
      if (Ie(f, d) && a.ref === b2.ref) if (dh = false, b2.pendingProps = d = f, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
      else return b2.lanes = a.lanes, Zi(a, b2, e);
    }
    return cj(a, b2, c, d, e);
  }
  function dj(a, b2, c) {
    var d = b2.pendingProps, e = d.children, f = null !== a ? a.memoizedState : null;
    if ("hidden" === d.mode) if (0 === (b2.mode & 1)) b2.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
    else {
      if (0 === (c & 1073741824)) return a = null !== f ? f.baseLanes | c : c, b2.lanes = b2.childLanes = 1073741824, b2.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b2.updateQueue = null, G(ej, fj), fj |= a, null;
      b2.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
      d = null !== f ? f.baseLanes : c;
      G(ej, fj);
      fj |= d;
    }
    else null !== f ? (d = f.baseLanes | c, b2.memoizedState = null) : d = c, G(ej, fj), fj |= d;
    Xi(a, b2, e, c);
    return b2.child;
  }
  function gj(a, b2) {
    var c = b2.ref;
    if (null === a && null !== c || null !== a && a.ref !== c) b2.flags |= 512, b2.flags |= 2097152;
  }
  function cj(a, b2, c, d, e) {
    var f = Zf(c) ? Xf : H.current;
    f = Yf(b2, f);
    ch(b2, e);
    c = Nh(a, b2, c, d, f, e);
    d = Sh();
    if (null !== a && !dh) return b2.updateQueue = a.updateQueue, b2.flags &= -2053, a.lanes &= ~e, Zi(a, b2, e);
    I && d && vg(b2);
    b2.flags |= 1;
    Xi(a, b2, c, e);
    return b2.child;
  }
  function hj(a, b2, c, d, e) {
    if (Zf(c)) {
      var f = true;
      cg(b2);
    } else f = false;
    ch(b2, e);
    if (null === b2.stateNode) ij(a, b2), Gi(b2, c, d), Ii(b2, c, d, e), d = true;
    else if (null === a) {
      var g = b2.stateNode, h = b2.memoizedProps;
      g.props = h;
      var k = g.context, l = c.contextType;
      "object" === typeof l && null !== l ? l = eh(l) : (l = Zf(c) ? Xf : H.current, l = Yf(b2, l));
      var m = c.getDerivedStateFromProps, q = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
      q || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Hi(b2, g, d, l);
      jh = false;
      var r = b2.memoizedState;
      g.state = r;
      qh(b2, d, g, e);
      k = b2.memoizedState;
      h !== d || r !== k || Wf.current || jh ? ("function" === typeof m && (Di(b2, c, m, d), k = b2.memoizedState), (h = jh || Fi(b2, c, h, d, r, k, l)) ? (q || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b2.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b2.flags |= 4194308), b2.memoizedProps = d, b2.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b2.flags |= 4194308), d = false);
    } else {
      g = b2.stateNode;
      lh(a, b2);
      h = b2.memoizedProps;
      l = b2.type === b2.elementType ? h : Ci(b2.type, h);
      g.props = l;
      q = b2.pendingProps;
      r = g.context;
      k = c.contextType;
      "object" === typeof k && null !== k ? k = eh(k) : (k = Zf(c) ? Xf : H.current, k = Yf(b2, k));
      var y = c.getDerivedStateFromProps;
      (m = "function" === typeof y || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q || r !== k) && Hi(b2, g, d, k);
      jh = false;
      r = b2.memoizedState;
      g.state = r;
      qh(b2, d, g, e);
      var n = b2.memoizedState;
      h !== q || r !== n || Wf.current || jh ? ("function" === typeof y && (Di(b2, c, y, d), n = b2.memoizedState), (l = jh || Fi(b2, c, l, d, r, n, k) || false) ? (m || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n, k), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n, k)), "function" === typeof g.componentDidUpdate && (b2.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b2.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b2.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b2.flags |= 1024), b2.memoizedProps = d, b2.memoizedState = n), g.props = d, g.state = n, g.context = k, d = l) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b2.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b2.flags |= 1024), d = false);
    }
    return jj(a, b2, c, d, f, e);
  }
  function jj(a, b2, c, d, e, f) {
    gj(a, b2);
    var g = 0 !== (b2.flags & 128);
    if (!d && !g) return e && dg(b2, c, false), Zi(a, b2, f);
    d = b2.stateNode;
    Wi.current = b2;
    var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
    b2.flags |= 1;
    null !== a && g ? (b2.child = Ug(b2, a.child, null, f), b2.child = Ug(b2, null, h, f)) : Xi(a, b2, h, f);
    b2.memoizedState = d.state;
    e && dg(b2, c, true);
    return b2.child;
  }
  function kj(a) {
    var b2 = a.stateNode;
    b2.pendingContext ? ag(a, b2.pendingContext, b2.pendingContext !== b2.context) : b2.context && ag(a, b2.context, false);
    yh(a, b2.containerInfo);
  }
  function lj(a, b2, c, d, e) {
    Ig();
    Jg(e);
    b2.flags |= 256;
    Xi(a, b2, c, d);
    return b2.child;
  }
  var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
  function nj(a) {
    return { baseLanes: a, cachePool: null, transitions: null };
  }
  function oj(a, b2, c) {
    var d = b2.pendingProps, e = L.current, f = false, g = 0 !== (b2.flags & 128), h;
    (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
    if (h) f = true, b2.flags &= -129;
    else if (null === a || null !== a.memoizedState) e |= 1;
    G(L, e & 1);
    if (null === a) {
      Eg(b2);
      a = b2.memoizedState;
      if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b2.mode & 1) ? b2.lanes = 1 : "$!" === a.data ? b2.lanes = 8 : b2.lanes = 1073741824, null;
      g = d.children;
      a = d.fallback;
      return f ? (d = b2.mode, f = b2.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f ? (f.childLanes = 0, f.pendingProps = g) : f = pj(g, d, 0, null), a = Tg(a, d, c, null), f.return = b2, a.return = b2, f.sibling = a, b2.child = f, b2.child.memoizedState = nj(c), b2.memoizedState = mj, a) : qj(b2, g);
    }
    e = a.memoizedState;
    if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b2, g, d, h, e, c);
    if (f) {
      f = d.fallback;
      g = b2.mode;
      e = a.child;
      h = e.sibling;
      var k = { mode: "hidden", children: d.children };
      0 === (g & 1) && b2.child !== e ? (d = b2.child, d.childLanes = 0, d.pendingProps = k, b2.deletions = null) : (d = Pg(e, k), d.subtreeFlags = e.subtreeFlags & 14680064);
      null !== h ? f = Pg(h, f) : (f = Tg(f, g, c, null), f.flags |= 2);
      f.return = b2;
      d.return = b2;
      d.sibling = f;
      b2.child = d;
      d = f;
      f = b2.child;
      g = a.child.memoizedState;
      g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
      f.memoizedState = g;
      f.childLanes = a.childLanes & ~c;
      b2.memoizedState = mj;
      return d;
    }
    f = a.child;
    a = f.sibling;
    d = Pg(f, { mode: "visible", children: d.children });
    0 === (b2.mode & 1) && (d.lanes = c);
    d.return = b2;
    d.sibling = null;
    null !== a && (c = b2.deletions, null === c ? (b2.deletions = [a], b2.flags |= 16) : c.push(a));
    b2.child = d;
    b2.memoizedState = null;
    return d;
  }
  function qj(a, b2) {
    b2 = pj({ mode: "visible", children: b2 }, a.mode, 0, null);
    b2.return = a;
    return a.child = b2;
  }
  function sj(a, b2, c, d) {
    null !== d && Jg(d);
    Ug(b2, a.child, null, c);
    a = qj(b2, b2.pendingProps.children);
    a.flags |= 2;
    b2.memoizedState = null;
    return a;
  }
  function rj(a, b2, c, d, e, f, g) {
    if (c) {
      if (b2.flags & 256) return b2.flags &= -257, d = Ki(Error(p(422))), sj(a, b2, g, d);
      if (null !== b2.memoizedState) return b2.child = a.child, b2.flags |= 128, null;
      f = d.fallback;
      e = b2.mode;
      d = pj({ mode: "visible", children: d.children }, e, 0, null);
      f = Tg(f, e, g, null);
      f.flags |= 2;
      d.return = b2;
      f.return = b2;
      d.sibling = f;
      b2.child = d;
      0 !== (b2.mode & 1) && Ug(b2, a.child, null, g);
      b2.child.memoizedState = nj(g);
      b2.memoizedState = mj;
      return f;
    }
    if (0 === (b2.mode & 1)) return sj(a, b2, g, null);
    if ("$!" === e.data) {
      d = e.nextSibling && e.nextSibling.dataset;
      if (d) var h = d.dgst;
      d = h;
      f = Error(p(419));
      d = Ki(f, d, void 0);
      return sj(a, b2, g, d);
    }
    h = 0 !== (g & a.childLanes);
    if (dh || h) {
      d = Q;
      if (null !== d) {
        switch (g & -g) {
          case 4:
            e = 2;
            break;
          case 16:
            e = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            e = 32;
            break;
          case 536870912:
            e = 268435456;
            break;
          default:
            e = 0;
        }
        e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
        0 !== e && e !== f.retryLane && (f.retryLane = e, ih(a, e), gi(d, a, e, -1));
      }
      tj();
      d = Ki(Error(p(421)));
      return sj(a, b2, g, d);
    }
    if ("$?" === e.data) return b2.flags |= 128, b2.child = a.child, b2 = uj.bind(null, a), e._reactRetry = b2, null;
    a = f.treeContext;
    yg = Lf(e.nextSibling);
    xg = b2;
    I = true;
    zg = null;
    null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b2);
    b2 = qj(b2, d.children);
    b2.flags |= 4096;
    return b2;
  }
  function vj(a, b2, c) {
    a.lanes |= b2;
    var d = a.alternate;
    null !== d && (d.lanes |= b2);
    bh(a.return, b2, c);
  }
  function wj(a, b2, c, d, e) {
    var f = a.memoizedState;
    null === f ? a.memoizedState = { isBackwards: b2, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f.isBackwards = b2, f.rendering = null, f.renderingStartTime = 0, f.last = d, f.tail = c, f.tailMode = e);
  }
  function xj(a, b2, c) {
    var d = b2.pendingProps, e = d.revealOrder, f = d.tail;
    Xi(a, b2, d.children, c);
    d = L.current;
    if (0 !== (d & 2)) d = d & 1 | 2, b2.flags |= 128;
    else {
      if (null !== a && 0 !== (a.flags & 128)) a: for (a = b2.child; null !== a; ) {
        if (13 === a.tag) null !== a.memoizedState && vj(a, c, b2);
        else if (19 === a.tag) vj(a, c, b2);
        else if (null !== a.child) {
          a.child.return = a;
          a = a.child;
          continue;
        }
        if (a === b2) break a;
        for (; null === a.sibling; ) {
          if (null === a.return || a.return === b2) break a;
          a = a.return;
        }
        a.sibling.return = a.return;
        a = a.sibling;
      }
      d &= 1;
    }
    G(L, d);
    if (0 === (b2.mode & 1)) b2.memoizedState = null;
    else switch (e) {
      case "forwards":
        c = b2.child;
        for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
        c = e;
        null === c ? (e = b2.child, b2.child = null) : (e = c.sibling, c.sibling = null);
        wj(b2, false, e, c, f);
        break;
      case "backwards":
        c = null;
        e = b2.child;
        for (b2.child = null; null !== e; ) {
          a = e.alternate;
          if (null !== a && null === Ch(a)) {
            b2.child = e;
            break;
          }
          a = e.sibling;
          e.sibling = c;
          c = e;
          e = a;
        }
        wj(b2, true, c, null, f);
        break;
      case "together":
        wj(b2, false, null, null, void 0);
        break;
      default:
        b2.memoizedState = null;
    }
    return b2.child;
  }
  function ij(a, b2) {
    0 === (b2.mode & 1) && null !== a && (a.alternate = null, b2.alternate = null, b2.flags |= 2);
  }
  function Zi(a, b2, c) {
    null !== a && (b2.dependencies = a.dependencies);
    rh |= b2.lanes;
    if (0 === (c & b2.childLanes)) return null;
    if (null !== a && b2.child !== a.child) throw Error(p(153));
    if (null !== b2.child) {
      a = b2.child;
      c = Pg(a, a.pendingProps);
      b2.child = c;
      for (c.return = b2; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b2;
      c.sibling = null;
    }
    return b2.child;
  }
  function yj(a, b2, c) {
    switch (b2.tag) {
      case 3:
        kj(b2);
        Ig();
        break;
      case 5:
        Ah(b2);
        break;
      case 1:
        Zf(b2.type) && cg(b2);
        break;
      case 4:
        yh(b2, b2.stateNode.containerInfo);
        break;
      case 10:
        var d = b2.type._context, e = b2.memoizedProps.value;
        G(Wg, d._currentValue);
        d._currentValue = e;
        break;
      case 13:
        d = b2.memoizedState;
        if (null !== d) {
          if (null !== d.dehydrated) return G(L, L.current & 1), b2.flags |= 128, null;
          if (0 !== (c & b2.child.childLanes)) return oj(a, b2, c);
          G(L, L.current & 1);
          a = Zi(a, b2, c);
          return null !== a ? a.sibling : null;
        }
        G(L, L.current & 1);
        break;
      case 19:
        d = 0 !== (c & b2.childLanes);
        if (0 !== (a.flags & 128)) {
          if (d) return xj(a, b2, c);
          b2.flags |= 128;
        }
        e = b2.memoizedState;
        null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
        G(L, L.current);
        if (d) break;
        else return null;
      case 22:
      case 23:
        return b2.lanes = 0, dj(a, b2, c);
    }
    return Zi(a, b2, c);
  }
  var zj, Aj, Bj, Cj;
  zj = function(a, b2) {
    for (var c = b2.child; null !== c; ) {
      if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
      else if (4 !== c.tag && null !== c.child) {
        c.child.return = c;
        c = c.child;
        continue;
      }
      if (c === b2) break;
      for (; null === c.sibling; ) {
        if (null === c.return || c.return === b2) return;
        c = c.return;
      }
      c.sibling.return = c.return;
      c = c.sibling;
    }
  };
  Aj = function() {
  };
  Bj = function(a, b2, c, d) {
    var e = a.memoizedProps;
    if (e !== d) {
      a = b2.stateNode;
      xh(uh.current);
      var f = null;
      switch (c) {
        case "input":
          e = Ya(a, e);
          d = Ya(a, d);
          f = [];
          break;
        case "select":
          e = A({}, e, { value: void 0 });
          d = A({}, d, { value: void 0 });
          f = [];
          break;
        case "textarea":
          e = gb(a, e);
          d = gb(a, d);
          f = [];
          break;
        default:
          "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
      }
      ub(c, d);
      var g;
      c = null;
      for (l in e) if (!d.hasOwnProperty(l) && e.hasOwnProperty(l) && null != e[l]) if ("style" === l) {
        var h = e[l];
        for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
      } else "dangerouslySetInnerHTML" !== l && "children" !== l && "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && "autoFocus" !== l && (ea.hasOwnProperty(l) ? f || (f = []) : (f = f || []).push(l, null));
      for (l in d) {
        var k = d[l];
        h = null != e ? e[l] : void 0;
        if (d.hasOwnProperty(l) && k !== h && (null != k || null != h)) if ("style" === l) if (h) {
          for (g in h) !h.hasOwnProperty(g) || k && k.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
          for (g in k) k.hasOwnProperty(g) && h[g] !== k[g] && (c || (c = {}), c[g] = k[g]);
        } else c || (f || (f = []), f.push(
          l,
          c
        )), c = k;
        else "dangerouslySetInnerHTML" === l ? (k = k ? k.__html : void 0, h = h ? h.__html : void 0, null != k && h !== k && (f = f || []).push(l, k)) : "children" === l ? "string" !== typeof k && "number" !== typeof k || (f = f || []).push(l, "" + k) : "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && (ea.hasOwnProperty(l) ? (null != k && "onScroll" === l && D("scroll", a), f || h === k || (f = [])) : (f = f || []).push(l, k));
      }
      c && (f = f || []).push("style", c);
      var l = f;
      if (b2.updateQueue = l) b2.flags |= 4;
    }
  };
  Cj = function(a, b2, c, d) {
    c !== d && (b2.flags |= 4);
  };
  function Dj(a, b2) {
    if (!I) switch (a.tailMode) {
      case "hidden":
        b2 = a.tail;
        for (var c = null; null !== b2; ) null !== b2.alternate && (c = b2), b2 = b2.sibling;
        null === c ? a.tail = null : c.sibling = null;
        break;
      case "collapsed":
        c = a.tail;
        for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
        null === d ? b2 || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
    }
  }
  function S(a) {
    var b2 = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
    if (b2) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
    else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
    a.subtreeFlags |= d;
    a.childLanes = c;
    return b2;
  }
  function Ej(a, b2, c) {
    var d = b2.pendingProps;
    wg(b2);
    switch (b2.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return S(b2), null;
      case 1:
        return Zf(b2.type) && $f(), S(b2), null;
      case 3:
        d = b2.stateNode;
        zh();
        E(Wf);
        E(H);
        Eh();
        d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
        if (null === a || null === a.child) Gg(b2) ? b2.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b2.flags & 256) || (b2.flags |= 1024, null !== zg && (Fj(zg), zg = null));
        Aj(a, b2);
        S(b2);
        return null;
      case 5:
        Bh(b2);
        var e = xh(wh.current);
        c = b2.type;
        if (null !== a && null != b2.stateNode) Bj(a, b2, c, d, e), a.ref !== b2.ref && (b2.flags |= 512, b2.flags |= 2097152);
        else {
          if (!d) {
            if (null === b2.stateNode) throw Error(p(166));
            S(b2);
            return null;
          }
          a = xh(uh.current);
          if (Gg(b2)) {
            d = b2.stateNode;
            c = b2.type;
            var f = b2.memoizedProps;
            d[Of] = b2;
            d[Pf] = f;
            a = 0 !== (b2.mode & 1);
            switch (c) {
              case "dialog":
                D("cancel", d);
                D("close", d);
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", d);
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], d);
                break;
              case "source":
                D("error", d);
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  d
                );
                D("load", d);
                break;
              case "details":
                D("toggle", d);
                break;
              case "input":
                Za(d, f);
                D("invalid", d);
                break;
              case "select":
                d._wrapperState = { wasMultiple: !!f.multiple };
                D("invalid", d);
                break;
              case "textarea":
                hb(d, f), D("invalid", d);
            }
            ub(c, f);
            e = null;
            for (var g in f) if (f.hasOwnProperty(g)) {
              var h = f[g];
              "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f.suppressHydrationWarning && Af(
                d.textContent,
                h,
                a
              ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
            }
            switch (c) {
              case "input":
                Va(d);
                db(d, f, true);
                break;
              case "textarea":
                Va(d);
                jb(d);
                break;
              case "select":
              case "option":
                break;
              default:
                "function" === typeof f.onClick && (d.onclick = Bf);
            }
            d = e;
            b2.updateQueue = d;
            null !== d && (b2.flags |= 4);
          } else {
            g = 9 === e.nodeType ? e : e.ownerDocument;
            "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
            "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
            a[Of] = b2;
            a[Pf] = d;
            zj(a, b2, false, false);
            b2.stateNode = a;
            a: {
              g = vb(c, d);
              switch (c) {
                case "dialog":
                  D("cancel", a);
                  D("close", a);
                  e = d;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  D("load", a);
                  e = d;
                  break;
                case "video":
                case "audio":
                  for (e = 0; e < lf.length; e++) D(lf[e], a);
                  e = d;
                  break;
                case "source":
                  D("error", a);
                  e = d;
                  break;
                case "img":
                case "image":
                case "link":
                  D(
                    "error",
                    a
                  );
                  D("load", a);
                  e = d;
                  break;
                case "details":
                  D("toggle", a);
                  e = d;
                  break;
                case "input":
                  Za(a, d);
                  e = Ya(a, d);
                  D("invalid", a);
                  break;
                case "option":
                  e = d;
                  break;
                case "select":
                  a._wrapperState = { wasMultiple: !!d.multiple };
                  e = A({}, d, { value: void 0 });
                  D("invalid", a);
                  break;
                case "textarea":
                  hb(a, d);
                  e = gb(a, d);
                  D("invalid", a);
                  break;
                default:
                  e = d;
              }
              ub(c, e);
              h = e;
              for (f in h) if (h.hasOwnProperty(f)) {
                var k = h[f];
                "style" === f ? sb(a, k) : "dangerouslySetInnerHTML" === f ? (k = k ? k.__html : void 0, null != k && nb(a, k)) : "children" === f ? "string" === typeof k ? ("textarea" !== c || "" !== k) && ob(a, k) : "number" === typeof k && ob(a, "" + k) : "suppressContentEditableWarning" !== f && "suppressHydrationWarning" !== f && "autoFocus" !== f && (ea.hasOwnProperty(f) ? null != k && "onScroll" === f && D("scroll", a) : null != k && ta(a, f, k, g));
              }
              switch (c) {
                case "input":
                  Va(a);
                  db(a, d, false);
                  break;
                case "textarea":
                  Va(a);
                  jb(a);
                  break;
                case "option":
                  null != d.value && a.setAttribute("value", "" + Sa(d.value));
                  break;
                case "select":
                  a.multiple = !!d.multiple;
                  f = d.value;
                  null != f ? fb(a, !!d.multiple, f, false) : null != d.defaultValue && fb(
                    a,
                    !!d.multiple,
                    d.defaultValue,
                    true
                  );
                  break;
                default:
                  "function" === typeof e.onClick && (a.onclick = Bf);
              }
              switch (c) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  d = !!d.autoFocus;
                  break a;
                case "img":
                  d = true;
                  break a;
                default:
                  d = false;
              }
            }
            d && (b2.flags |= 4);
          }
          null !== b2.ref && (b2.flags |= 512, b2.flags |= 2097152);
        }
        S(b2);
        return null;
      case 6:
        if (a && null != b2.stateNode) Cj(a, b2, a.memoizedProps, d);
        else {
          if ("string" !== typeof d && null === b2.stateNode) throw Error(p(166));
          c = xh(wh.current);
          xh(uh.current);
          if (Gg(b2)) {
            d = b2.stateNode;
            c = b2.memoizedProps;
            d[Of] = b2;
            if (f = d.nodeValue !== c) {
              if (a = xg, null !== a) switch (a.tag) {
                case 3:
                  Af(d.nodeValue, c, 0 !== (a.mode & 1));
                  break;
                case 5:
                  true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
              }
            }
            f && (b2.flags |= 4);
          } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b2, b2.stateNode = d;
        }
        S(b2);
        return null;
      case 13:
        E(L);
        d = b2.memoizedState;
        if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
          if (I && null !== yg && 0 !== (b2.mode & 1) && 0 === (b2.flags & 128)) Hg(), Ig(), b2.flags |= 98560, f = false;
          else if (f = Gg(b2), null !== d && null !== d.dehydrated) {
            if (null === a) {
              if (!f) throw Error(p(318));
              f = b2.memoizedState;
              f = null !== f ? f.dehydrated : null;
              if (!f) throw Error(p(317));
              f[Of] = b2;
            } else Ig(), 0 === (b2.flags & 128) && (b2.memoizedState = null), b2.flags |= 4;
            S(b2);
            f = false;
          } else null !== zg && (Fj(zg), zg = null), f = true;
          if (!f) return b2.flags & 65536 ? b2 : null;
        }
        if (0 !== (b2.flags & 128)) return b2.lanes = c, b2;
        d = null !== d;
        d !== (null !== a && null !== a.memoizedState) && d && (b2.child.flags |= 8192, 0 !== (b2.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
        null !== b2.updateQueue && (b2.flags |= 4);
        S(b2);
        return null;
      case 4:
        return zh(), Aj(a, b2), null === a && sf(b2.stateNode.containerInfo), S(b2), null;
      case 10:
        return ah(b2.type._context), S(b2), null;
      case 17:
        return Zf(b2.type) && $f(), S(b2), null;
      case 19:
        E(L);
        f = b2.memoizedState;
        if (null === f) return S(b2), null;
        d = 0 !== (b2.flags & 128);
        g = f.rendering;
        if (null === g) if (d) Dj(f, false);
        else {
          if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b2.child; null !== a; ) {
            g = Ch(a);
            if (null !== g) {
              b2.flags |= 128;
              Dj(f, false);
              d = g.updateQueue;
              null !== d && (b2.updateQueue = d, b2.flags |= 4);
              b2.subtreeFlags = 0;
              d = c;
              for (c = b2.child; null !== c; ) f = c, a = d, f.flags &= 14680066, g = f.alternate, null === g ? (f.childLanes = 0, f.lanes = a, f.child = null, f.subtreeFlags = 0, f.memoizedProps = null, f.memoizedState = null, f.updateQueue = null, f.dependencies = null, f.stateNode = null) : (f.childLanes = g.childLanes, f.lanes = g.lanes, f.child = g.child, f.subtreeFlags = 0, f.deletions = null, f.memoizedProps = g.memoizedProps, f.memoizedState = g.memoizedState, f.updateQueue = g.updateQueue, f.type = g.type, a = g.dependencies, f.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
              G(L, L.current & 1 | 2);
              return b2.child;
            }
            a = a.sibling;
          }
          null !== f.tail && B() > Gj && (b2.flags |= 128, d = true, Dj(f, false), b2.lanes = 4194304);
        }
        else {
          if (!d) if (a = Ch(g), null !== a) {
            if (b2.flags |= 128, d = true, c = a.updateQueue, null !== c && (b2.updateQueue = c, b2.flags |= 4), Dj(f, true), null === f.tail && "hidden" === f.tailMode && !g.alternate && !I) return S(b2), null;
          } else 2 * B() - f.renderingStartTime > Gj && 1073741824 !== c && (b2.flags |= 128, d = true, Dj(f, false), b2.lanes = 4194304);
          f.isBackwards ? (g.sibling = b2.child, b2.child = g) : (c = f.last, null !== c ? c.sibling = g : b2.child = g, f.last = g);
        }
        if (null !== f.tail) return b2 = f.tail, f.rendering = b2, f.tail = b2.sibling, f.renderingStartTime = B(), b2.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b2;
        S(b2);
        return null;
      case 22:
      case 23:
        return Hj(), d = null !== b2.memoizedState, null !== a && null !== a.memoizedState !== d && (b2.flags |= 8192), d && 0 !== (b2.mode & 1) ? 0 !== (fj & 1073741824) && (S(b2), b2.subtreeFlags & 6 && (b2.flags |= 8192)) : S(b2), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(p(156, b2.tag));
  }
  function Ij(a, b2) {
    wg(b2);
    switch (b2.tag) {
      case 1:
        return Zf(b2.type) && $f(), a = b2.flags, a & 65536 ? (b2.flags = a & -65537 | 128, b2) : null;
      case 3:
        return zh(), E(Wf), E(H), Eh(), a = b2.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b2.flags = a & -65537 | 128, b2) : null;
      case 5:
        return Bh(b2), null;
      case 13:
        E(L);
        a = b2.memoizedState;
        if (null !== a && null !== a.dehydrated) {
          if (null === b2.alternate) throw Error(p(340));
          Ig();
        }
        a = b2.flags;
        return a & 65536 ? (b2.flags = a & -65537 | 128, b2) : null;
      case 19:
        return E(L), null;
      case 4:
        return zh(), null;
      case 10:
        return ah(b2.type._context), null;
      case 22:
      case 23:
        return Hj(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
  function Lj(a, b2) {
    var c = a.ref;
    if (null !== c) if ("function" === typeof c) try {
      c(null);
    } catch (d) {
      W(a, b2, d);
    }
    else c.current = null;
  }
  function Mj(a, b2, c) {
    try {
      c();
    } catch (d) {
      W(a, b2, d);
    }
  }
  var Nj = false;
  function Oj(a, b2) {
    Cf = dd;
    a = Me();
    if (Ne(a)) {
      if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
      else a: {
        c = (c = a.ownerDocument) && c.defaultView || window;
        var d = c.getSelection && c.getSelection();
        if (d && 0 !== d.rangeCount) {
          c = d.anchorNode;
          var e = d.anchorOffset, f = d.focusNode;
          d = d.focusOffset;
          try {
            c.nodeType, f.nodeType;
          } catch (F) {
            c = null;
            break a;
          }
          var g = 0, h = -1, k = -1, l = 0, m = 0, q = a, r = null;
          b: for (; ; ) {
            for (var y; ; ) {
              q !== c || 0 !== e && 3 !== q.nodeType || (h = g + e);
              q !== f || 0 !== d && 3 !== q.nodeType || (k = g + d);
              3 === q.nodeType && (g += q.nodeValue.length);
              if (null === (y = q.firstChild)) break;
              r = q;
              q = y;
            }
            for (; ; ) {
              if (q === a) break b;
              r === c && ++l === e && (h = g);
              r === f && ++m === d && (k = g);
              if (null !== (y = q.nextSibling)) break;
              q = r;
              r = q.parentNode;
            }
            q = y;
          }
          c = -1 === h || -1 === k ? null : { start: h, end: k };
        } else c = null;
      }
      c = c || { start: 0, end: 0 };
    } else c = null;
    Df = { focusedElem: a, selectionRange: c };
    dd = false;
    for (V = b2; null !== V; ) if (b2 = V, a = b2.child, 0 !== (b2.subtreeFlags & 1028) && null !== a) a.return = b2, V = a;
    else for (; null !== V; ) {
      b2 = V;
      try {
        var n = b2.alternate;
        if (0 !== (b2.flags & 1024)) switch (b2.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (null !== n) {
              var t = n.memoizedProps, J = n.memoizedState, x = b2.stateNode, w = x.getSnapshotBeforeUpdate(b2.elementType === b2.type ? t : Ci(b2.type, t), J);
              x.__reactInternalSnapshotBeforeUpdate = w;
            }
            break;
          case 3:
            var u = b2.stateNode.containerInfo;
            1 === u.nodeType ? u.textContent = "" : 9 === u.nodeType && u.documentElement && u.removeChild(u.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(p(163));
        }
      } catch (F) {
        W(b2, b2.return, F);
      }
      a = b2.sibling;
      if (null !== a) {
        a.return = b2.return;
        V = a;
        break;
      }
      V = b2.return;
    }
    n = Nj;
    Nj = false;
    return n;
  }
  function Pj(a, b2, c) {
    var d = b2.updateQueue;
    d = null !== d ? d.lastEffect : null;
    if (null !== d) {
      var e = d = d.next;
      do {
        if ((e.tag & a) === a) {
          var f = e.destroy;
          e.destroy = void 0;
          void 0 !== f && Mj(b2, c, f);
        }
        e = e.next;
      } while (e !== d);
    }
  }
  function Qj(a, b2) {
    b2 = b2.updateQueue;
    b2 = null !== b2 ? b2.lastEffect : null;
    if (null !== b2) {
      var c = b2 = b2.next;
      do {
        if ((c.tag & a) === a) {
          var d = c.create;
          c.destroy = d();
        }
        c = c.next;
      } while (c !== b2);
    }
  }
  function Rj(a) {
    var b2 = a.ref;
    if (null !== b2) {
      var c = a.stateNode;
      switch (a.tag) {
        case 5:
          a = c;
          break;
        default:
          a = c;
      }
      "function" === typeof b2 ? b2(a) : b2.current = a;
    }
  }
  function Sj(a) {
    var b2 = a.alternate;
    null !== b2 && (a.alternate = null, Sj(b2));
    a.child = null;
    a.deletions = null;
    a.sibling = null;
    5 === a.tag && (b2 = a.stateNode, null !== b2 && (delete b2[Of], delete b2[Pf], delete b2[of], delete b2[Qf], delete b2[Rf]));
    a.stateNode = null;
    a.return = null;
    a.dependencies = null;
    a.memoizedProps = null;
    a.memoizedState = null;
    a.pendingProps = null;
    a.stateNode = null;
    a.updateQueue = null;
  }
  function Tj(a) {
    return 5 === a.tag || 3 === a.tag || 4 === a.tag;
  }
  function Uj(a) {
    a: for (; ; ) {
      for (; null === a.sibling; ) {
        if (null === a.return || Tj(a.return)) return null;
        a = a.return;
      }
      a.sibling.return = a.return;
      for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
        if (a.flags & 2) continue a;
        if (null === a.child || 4 === a.tag) continue a;
        else a.child.return = a, a = a.child;
      }
      if (!(a.flags & 2)) return a.stateNode;
    }
  }
  function Vj(a, b2, c) {
    var d = a.tag;
    if (5 === d || 6 === d) a = a.stateNode, b2 ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b2) : c.insertBefore(a, b2) : (8 === c.nodeType ? (b2 = c.parentNode, b2.insertBefore(a, c)) : (b2 = c, b2.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b2.onclick || (b2.onclick = Bf));
    else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b2, c), a = a.sibling; null !== a; ) Vj(a, b2, c), a = a.sibling;
  }
  function Wj(a, b2, c) {
    var d = a.tag;
    if (5 === d || 6 === d) a = a.stateNode, b2 ? c.insertBefore(a, b2) : c.appendChild(a);
    else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b2, c), a = a.sibling; null !== a; ) Wj(a, b2, c), a = a.sibling;
  }
  var X = null, Xj = false;
  function Yj(a, b2, c) {
    for (c = c.child; null !== c; ) Zj(a, b2, c), c = c.sibling;
  }
  function Zj(a, b2, c) {
    if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
      lc.onCommitFiberUnmount(kc, c);
    } catch (h) {
    }
    switch (c.tag) {
      case 5:
        U || Lj(c, b2);
      case 6:
        var d = X, e = Xj;
        X = null;
        Yj(a, b2, c);
        X = d;
        Xj = e;
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
        break;
      case 18:
        null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
        break;
      case 4:
        d = X;
        e = Xj;
        X = c.stateNode.containerInfo;
        Xj = true;
        Yj(a, b2, c);
        X = d;
        Xj = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
          e = d = d.next;
          do {
            var f = e, g = f.destroy;
            f = f.tag;
            void 0 !== g && (0 !== (f & 2) ? Mj(c, b2, g) : 0 !== (f & 4) && Mj(c, b2, g));
            e = e.next;
          } while (e !== d);
        }
        Yj(a, b2, c);
        break;
      case 1:
        if (!U && (Lj(c, b2), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
          d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
        } catch (h) {
          W(c, b2, h);
        }
        Yj(a, b2, c);
        break;
      case 21:
        Yj(a, b2, c);
        break;
      case 22:
        c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b2, c), U = d) : Yj(a, b2, c);
        break;
      default:
        Yj(a, b2, c);
    }
  }
  function ak(a) {
    var b2 = a.updateQueue;
    if (null !== b2) {
      a.updateQueue = null;
      var c = a.stateNode;
      null === c && (c = a.stateNode = new Kj());
      b2.forEach(function(b3) {
        var d = bk.bind(null, a, b3);
        c.has(b3) || (c.add(b3), b3.then(d, d));
      });
    }
  }
  function ck(a, b2) {
    var c = b2.deletions;
    if (null !== c) for (var d = 0; d < c.length; d++) {
      var e = c[d];
      try {
        var f = a, g = b2, h = g;
        a: for (; null !== h; ) {
          switch (h.tag) {
            case 5:
              X = h.stateNode;
              Xj = false;
              break a;
            case 3:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
            case 4:
              X = h.stateNode.containerInfo;
              Xj = true;
              break a;
          }
          h = h.return;
        }
        if (null === X) throw Error(p(160));
        Zj(f, g, e);
        X = null;
        Xj = false;
        var k = e.alternate;
        null !== k && (k.return = null);
        e.return = null;
      } catch (l) {
        W(e, b2, l);
      }
    }
    if (b2.subtreeFlags & 12854) for (b2 = b2.child; null !== b2; ) dk(b2, a), b2 = b2.sibling;
  }
  function dk(a, b2) {
    var c = a.alternate, d = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        ck(b2, a);
        ek(a);
        if (d & 4) {
          try {
            Pj(3, a, a.return), Qj(3, a);
          } catch (t) {
            W(a, a.return, t);
          }
          try {
            Pj(5, a, a.return);
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 1:
        ck(b2, a);
        ek(a);
        d & 512 && null !== c && Lj(c, c.return);
        break;
      case 5:
        ck(b2, a);
        ek(a);
        d & 512 && null !== c && Lj(c, c.return);
        if (a.flags & 32) {
          var e = a.stateNode;
          try {
            ob(e, "");
          } catch (t) {
            W(a, a.return, t);
          }
        }
        if (d & 4 && (e = a.stateNode, null != e)) {
          var f = a.memoizedProps, g = null !== c ? c.memoizedProps : f, h = a.type, k = a.updateQueue;
          a.updateQueue = null;
          if (null !== k) try {
            "input" === h && "radio" === f.type && null != f.name && ab(e, f);
            vb(h, g);
            var l = vb(h, f);
            for (g = 0; g < k.length; g += 2) {
              var m = k[g], q = k[g + 1];
              "style" === m ? sb(e, q) : "dangerouslySetInnerHTML" === m ? nb(e, q) : "children" === m ? ob(e, q) : ta(e, m, q, l);
            }
            switch (h) {
              case "input":
                bb(e, f);
                break;
              case "textarea":
                ib(e, f);
                break;
              case "select":
                var r = e._wrapperState.wasMultiple;
                e._wrapperState.wasMultiple = !!f.multiple;
                var y = f.value;
                null != y ? fb(e, !!f.multiple, y, false) : r !== !!f.multiple && (null != f.defaultValue ? fb(
                  e,
                  !!f.multiple,
                  f.defaultValue,
                  true
                ) : fb(e, !!f.multiple, f.multiple ? [] : "", false));
            }
            e[Pf] = f;
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 6:
        ck(b2, a);
        ek(a);
        if (d & 4) {
          if (null === a.stateNode) throw Error(p(162));
          e = a.stateNode;
          f = a.memoizedProps;
          try {
            e.nodeValue = f;
          } catch (t) {
            W(a, a.return, t);
          }
        }
        break;
      case 3:
        ck(b2, a);
        ek(a);
        if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
          bd(b2.containerInfo);
        } catch (t) {
          W(a, a.return, t);
        }
        break;
      case 4:
        ck(b2, a);
        ek(a);
        break;
      case 13:
        ck(b2, a);
        ek(a);
        e = a.child;
        e.flags & 8192 && (f = null !== e.memoizedState, e.stateNode.isHidden = f, !f || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
        d & 4 && ak(a);
        break;
      case 22:
        m = null !== c && null !== c.memoizedState;
        a.mode & 1 ? (U = (l = U) || m, ck(b2, a), U = l) : ck(b2, a);
        ek(a);
        if (d & 8192) {
          l = null !== a.memoizedState;
          if ((a.stateNode.isHidden = l) && !m && 0 !== (a.mode & 1)) for (V = a, m = a.child; null !== m; ) {
            for (q = V = m; null !== V; ) {
              r = V;
              y = r.child;
              switch (r.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Pj(4, r, r.return);
                  break;
                case 1:
                  Lj(r, r.return);
                  var n = r.stateNode;
                  if ("function" === typeof n.componentWillUnmount) {
                    d = r;
                    c = r.return;
                    try {
                      b2 = d, n.props = b2.memoizedProps, n.state = b2.memoizedState, n.componentWillUnmount();
                    } catch (t) {
                      W(d, c, t);
                    }
                  }
                  break;
                case 5:
                  Lj(r, r.return);
                  break;
                case 22:
                  if (null !== r.memoizedState) {
                    gk(q);
                    continue;
                  }
              }
              null !== y ? (y.return = r, V = y) : gk(q);
            }
            m = m.sibling;
          }
          a: for (m = null, q = a; ; ) {
            if (5 === q.tag) {
              if (null === m) {
                m = q;
                try {
                  e = q.stateNode, l ? (f = e.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (h = q.stateNode, k = q.memoizedProps.style, g = void 0 !== k && null !== k && k.hasOwnProperty("display") ? k.display : null, h.style.display = rb("display", g));
                } catch (t) {
                  W(a, a.return, t);
                }
              }
            } else if (6 === q.tag) {
              if (null === m) try {
                q.stateNode.nodeValue = l ? "" : q.memoizedProps;
              } catch (t) {
                W(a, a.return, t);
              }
            } else if ((22 !== q.tag && 23 !== q.tag || null === q.memoizedState || q === a) && null !== q.child) {
              q.child.return = q;
              q = q.child;
              continue;
            }
            if (q === a) break a;
            for (; null === q.sibling; ) {
              if (null === q.return || q.return === a) break a;
              m === q && (m = null);
              q = q.return;
            }
            m === q && (m = null);
            q.sibling.return = q.return;
            q = q.sibling;
          }
        }
        break;
      case 19:
        ck(b2, a);
        ek(a);
        d & 4 && ak(a);
        break;
      case 21:
        break;
      default:
        ck(
          b2,
          a
        ), ek(a);
    }
  }
  function ek(a) {
    var b2 = a.flags;
    if (b2 & 2) {
      try {
        a: {
          for (var c = a.return; null !== c; ) {
            if (Tj(c)) {
              var d = c;
              break a;
            }
            c = c.return;
          }
          throw Error(p(160));
        }
        switch (d.tag) {
          case 5:
            var e = d.stateNode;
            d.flags & 32 && (ob(e, ""), d.flags &= -33);
            var f = Uj(a);
            Wj(a, f, e);
            break;
          case 3:
          case 4:
            var g = d.stateNode.containerInfo, h = Uj(a);
            Vj(a, h, g);
            break;
          default:
            throw Error(p(161));
        }
      } catch (k) {
        W(a, a.return, k);
      }
      a.flags &= -3;
    }
    b2 & 4096 && (a.flags &= -4097);
  }
  function hk(a, b2, c) {
    V = a;
    ik(a);
  }
  function ik(a, b2, c) {
    for (var d = 0 !== (a.mode & 1); null !== V; ) {
      var e = V, f = e.child;
      if (22 === e.tag && d) {
        var g = null !== e.memoizedState || Jj;
        if (!g) {
          var h = e.alternate, k = null !== h && null !== h.memoizedState || U;
          h = Jj;
          var l = U;
          Jj = g;
          if ((U = k) && !l) for (V = e; null !== V; ) g = V, k = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k ? (k.return = g, V = k) : jk(e);
          for (; null !== f; ) V = f, ik(f), f = f.sibling;
          V = e;
          Jj = h;
          U = l;
        }
        kk(a);
      } else 0 !== (e.subtreeFlags & 8772) && null !== f ? (f.return = e, V = f) : kk(a);
    }
  }
  function kk(a) {
    for (; null !== V; ) {
      var b2 = V;
      if (0 !== (b2.flags & 8772)) {
        var c = b2.alternate;
        try {
          if (0 !== (b2.flags & 8772)) switch (b2.tag) {
            case 0:
            case 11:
            case 15:
              U || Qj(5, b2);
              break;
            case 1:
              var d = b2.stateNode;
              if (b2.flags & 4 && !U) if (null === c) d.componentDidMount();
              else {
                var e = b2.elementType === b2.type ? c.memoizedProps : Ci(b2.type, c.memoizedProps);
                d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
              }
              var f = b2.updateQueue;
              null !== f && sh(b2, f, d);
              break;
            case 3:
              var g = b2.updateQueue;
              if (null !== g) {
                c = null;
                if (null !== b2.child) switch (b2.child.tag) {
                  case 5:
                    c = b2.child.stateNode;
                    break;
                  case 1:
                    c = b2.child.stateNode;
                }
                sh(b2, g, c);
              }
              break;
            case 5:
              var h = b2.stateNode;
              if (null === c && b2.flags & 4) {
                c = h;
                var k = b2.memoizedProps;
                switch (b2.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    k.autoFocus && c.focus();
                    break;
                  case "img":
                    k.src && (c.src = k.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (null === b2.memoizedState) {
                var l = b2.alternate;
                if (null !== l) {
                  var m = l.memoizedState;
                  if (null !== m) {
                    var q = m.dehydrated;
                    null !== q && bd(q);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(p(163));
          }
          U || b2.flags & 512 && Rj(b2);
        } catch (r) {
          W(b2, b2.return, r);
        }
      }
      if (b2 === a) {
        V = null;
        break;
      }
      c = b2.sibling;
      if (null !== c) {
        c.return = b2.return;
        V = c;
        break;
      }
      V = b2.return;
    }
  }
  function gk(a) {
    for (; null !== V; ) {
      var b2 = V;
      if (b2 === a) {
        V = null;
        break;
      }
      var c = b2.sibling;
      if (null !== c) {
        c.return = b2.return;
        V = c;
        break;
      }
      V = b2.return;
    }
  }
  function jk(a) {
    for (; null !== V; ) {
      var b2 = V;
      try {
        switch (b2.tag) {
          case 0:
          case 11:
          case 15:
            var c = b2.return;
            try {
              Qj(4, b2);
            } catch (k) {
              W(b2, c, k);
            }
            break;
          case 1:
            var d = b2.stateNode;
            if ("function" === typeof d.componentDidMount) {
              var e = b2.return;
              try {
                d.componentDidMount();
              } catch (k) {
                W(b2, e, k);
              }
            }
            var f = b2.return;
            try {
              Rj(b2);
            } catch (k) {
              W(b2, f, k);
            }
            break;
          case 5:
            var g = b2.return;
            try {
              Rj(b2);
            } catch (k) {
              W(b2, g, k);
            }
        }
      } catch (k) {
        W(b2, b2.return, k);
      }
      if (b2 === a) {
        V = null;
        break;
      }
      var h = b2.sibling;
      if (null !== h) {
        h.return = b2.return;
        V = h;
        break;
      }
      V = b2.return;
    }
  }
  var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
  function R() {
    return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
  }
  function yi(a) {
    if (0 === (a.mode & 1)) return 1;
    if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
    if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
    a = C;
    if (0 !== a) return a;
    a = window.event;
    a = void 0 === a ? 16 : jd(a.type);
    return a;
  }
  function gi(a, b2, c, d) {
    if (50 < yk) throw yk = 0, zk = null, Error(p(185));
    Ac(a, c, d);
    if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b2.mode & 1) && (Gj = B() + 500, fg && jg());
  }
  function Dk(a, b2) {
    var c = a.callbackNode;
    wc(a, b2);
    var d = uc(a, a === Q ? Z : 0);
    if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
    else if (b2 = d & -d, a.callbackPriority !== b2) {
      null != c && bc(c);
      if (1 === b2) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
        0 === (K & 6) && jg();
      }), c = null;
      else {
        switch (Dc(d)) {
          case 1:
            c = fc;
            break;
          case 4:
            c = gc;
            break;
          case 16:
            c = hc;
            break;
          case 536870912:
            c = jc;
            break;
          default:
            c = hc;
        }
        c = Fk(c, Gk.bind(null, a));
      }
      a.callbackPriority = b2;
      a.callbackNode = c;
    }
  }
  function Gk(a, b2) {
    Ak = -1;
    Bk = 0;
    if (0 !== (K & 6)) throw Error(p(327));
    var c = a.callbackNode;
    if (Hk() && a.callbackNode !== c) return null;
    var d = uc(a, a === Q ? Z : 0);
    if (0 === d) return null;
    if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b2) b2 = Ik(a, d);
    else {
      b2 = d;
      var e = K;
      K |= 2;
      var f = Jk();
      if (Q !== a || Z !== b2) uk = null, Gj = B() + 500, Kk(a, b2);
      do
        try {
          Lk();
          break;
        } catch (h) {
          Mk(a, h);
        }
      while (1);
      $g();
      mk.current = f;
      K = e;
      null !== Y ? b2 = 0 : (Q = null, Z = 0, b2 = T);
    }
    if (0 !== b2) {
      2 === b2 && (e = xc(a), 0 !== e && (d = e, b2 = Nk(a, e)));
      if (1 === b2) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      if (6 === b2) Ck(a, d);
      else {
        e = a.current.alternate;
        if (0 === (d & 30) && !Ok(e) && (b2 = Ik(a, d), 2 === b2 && (f = xc(a), 0 !== f && (d = f, b2 = Nk(a, f))), 1 === b2)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
        a.finishedWork = e;
        a.finishedLanes = d;
        switch (b2) {
          case 0:
          case 1:
            throw Error(p(345));
          case 2:
            Pk(a, tk, uk);
            break;
          case 3:
            Ck(a, d);
            if ((d & 130023424) === d && (b2 = fk + 500 - B(), 10 < b2)) {
              if (0 !== uc(a, 0)) break;
              e = a.suspendedLanes;
              if ((e & d) !== d) {
                R();
                a.pingedLanes |= a.suspendedLanes & e;
                break;
              }
              a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b2);
              break;
            }
            Pk(a, tk, uk);
            break;
          case 4:
            Ck(a, d);
            if ((d & 4194240) === d) break;
            b2 = a.eventTimes;
            for (e = -1; 0 < d; ) {
              var g = 31 - oc(d);
              f = 1 << g;
              g = b2[g];
              g > e && (e = g);
              d &= ~f;
            }
            d = e;
            d = B() - d;
            d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
            if (10 < d) {
              a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
              break;
            }
            Pk(a, tk, uk);
            break;
          case 5:
            Pk(a, tk, uk);
            break;
          default:
            throw Error(p(329));
        }
      }
    }
    Dk(a, B());
    return a.callbackNode === c ? Gk.bind(null, a) : null;
  }
  function Nk(a, b2) {
    var c = sk;
    a.current.memoizedState.isDehydrated && (Kk(a, b2).flags |= 256);
    a = Ik(a, b2);
    2 !== a && (b2 = tk, tk = c, null !== b2 && Fj(b2));
    return a;
  }
  function Fj(a) {
    null === tk ? tk = a : tk.push.apply(tk, a);
  }
  function Ok(a) {
    for (var b2 = a; ; ) {
      if (b2.flags & 16384) {
        var c = b2.updateQueue;
        if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
          var e = c[d], f = e.getSnapshot;
          e = e.value;
          try {
            if (!He(f(), e)) return false;
          } catch (g) {
            return false;
          }
        }
      }
      c = b2.child;
      if (b2.subtreeFlags & 16384 && null !== c) c.return = b2, b2 = c;
      else {
        if (b2 === a) break;
        for (; null === b2.sibling; ) {
          if (null === b2.return || b2.return === a) return true;
          b2 = b2.return;
        }
        b2.sibling.return = b2.return;
        b2 = b2.sibling;
      }
    }
    return true;
  }
  function Ck(a, b2) {
    b2 &= ~rk;
    b2 &= ~qk;
    a.suspendedLanes |= b2;
    a.pingedLanes &= ~b2;
    for (a = a.expirationTimes; 0 < b2; ) {
      var c = 31 - oc(b2), d = 1 << c;
      a[c] = -1;
      b2 &= ~d;
    }
  }
  function Ek(a) {
    if (0 !== (K & 6)) throw Error(p(327));
    Hk();
    var b2 = uc(a, 0);
    if (0 === (b2 & 1)) return Dk(a, B()), null;
    var c = Ik(a, b2);
    if (0 !== a.tag && 2 === c) {
      var d = xc(a);
      0 !== d && (b2 = d, c = Nk(a, d));
    }
    if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b2), Dk(a, B()), c;
    if (6 === c) throw Error(p(345));
    a.finishedWork = a.current.alternate;
    a.finishedLanes = b2;
    Pk(a, tk, uk);
    Dk(a, B());
    return null;
  }
  function Qk(a, b2) {
    var c = K;
    K |= 1;
    try {
      return a(b2);
    } finally {
      K = c, 0 === K && (Gj = B() + 500, fg && jg());
    }
  }
  function Rk(a) {
    null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
    var b2 = K;
    K |= 1;
    var c = ok.transition, d = C;
    try {
      if (ok.transition = null, C = 1, a) return a();
    } finally {
      C = d, ok.transition = c, K = b2, 0 === (K & 6) && jg();
    }
  }
  function Hj() {
    fj = ej.current;
    E(ej);
  }
  function Kk(a, b2) {
    a.finishedWork = null;
    a.finishedLanes = 0;
    var c = a.timeoutHandle;
    -1 !== c && (a.timeoutHandle = -1, Gf(c));
    if (null !== Y) for (c = Y.return; null !== c; ) {
      var d = c;
      wg(d);
      switch (d.tag) {
        case 1:
          d = d.type.childContextTypes;
          null !== d && void 0 !== d && $f();
          break;
        case 3:
          zh();
          E(Wf);
          E(H);
          Eh();
          break;
        case 5:
          Bh(d);
          break;
        case 4:
          zh();
          break;
        case 13:
          E(L);
          break;
        case 19:
          E(L);
          break;
        case 10:
          ah(d.type._context);
          break;
        case 22:
        case 23:
          Hj();
      }
      c = c.return;
    }
    Q = a;
    Y = a = Pg(a.current, null);
    Z = fj = b2;
    T = 0;
    pk = null;
    rk = qk = rh = 0;
    tk = sk = null;
    if (null !== fh) {
      for (b2 = 0; b2 < fh.length; b2++) if (c = fh[b2], d = c.interleaved, null !== d) {
        c.interleaved = null;
        var e = d.next, f = c.pending;
        if (null !== f) {
          var g = f.next;
          f.next = e;
          d.next = g;
        }
        c.pending = d;
      }
      fh = null;
    }
    return a;
  }
  function Mk(a, b2) {
    do {
      var c = Y;
      try {
        $g();
        Fh.current = Rh;
        if (Ih) {
          for (var d = M.memoizedState; null !== d; ) {
            var e = d.queue;
            null !== e && (e.pending = null);
            d = d.next;
          }
          Ih = false;
        }
        Hh = 0;
        O = N = M = null;
        Jh = false;
        Kh = 0;
        nk.current = null;
        if (null === c || null === c.return) {
          T = 1;
          pk = b2;
          Y = null;
          break;
        }
        a: {
          var f = a, g = c.return, h = c, k = b2;
          b2 = Z;
          h.flags |= 32768;
          if (null !== k && "object" === typeof k && "function" === typeof k.then) {
            var l = k, m = h, q = m.tag;
            if (0 === (m.mode & 1) && (0 === q || 11 === q || 15 === q)) {
              var r = m.alternate;
              r ? (m.updateQueue = r.updateQueue, m.memoizedState = r.memoizedState, m.lanes = r.lanes) : (m.updateQueue = null, m.memoizedState = null);
            }
            var y = Ui(g);
            if (null !== y) {
              y.flags &= -257;
              Vi(y, g, h, f, b2);
              y.mode & 1 && Si(f, l, b2);
              b2 = y;
              k = l;
              var n = b2.updateQueue;
              if (null === n) {
                var t = /* @__PURE__ */ new Set();
                t.add(k);
                b2.updateQueue = t;
              } else n.add(k);
              break a;
            } else {
              if (0 === (b2 & 1)) {
                Si(f, l, b2);
                tj();
                break a;
              }
              k = Error(p(426));
            }
          } else if (I && h.mode & 1) {
            var J = Ui(g);
            if (null !== J) {
              0 === (J.flags & 65536) && (J.flags |= 256);
              Vi(J, g, h, f, b2);
              Jg(Ji(k, h));
              break a;
            }
          }
          f = k = Ji(k, h);
          4 !== T && (T = 2);
          null === sk ? sk = [f] : sk.push(f);
          f = g;
          do {
            switch (f.tag) {
              case 3:
                f.flags |= 65536;
                b2 &= -b2;
                f.lanes |= b2;
                var x = Ni(f, k, b2);
                ph(f, x);
                break a;
              case 1:
                h = k;
                var w = f.type, u = f.stateNode;
                if (0 === (f.flags & 128) && ("function" === typeof w.getDerivedStateFromError || null !== u && "function" === typeof u.componentDidCatch && (null === Ri || !Ri.has(u)))) {
                  f.flags |= 65536;
                  b2 &= -b2;
                  f.lanes |= b2;
                  var F = Qi(f, h, b2);
                  ph(f, F);
                  break a;
                }
            }
            f = f.return;
          } while (null !== f);
        }
        Sk(c);
      } catch (na) {
        b2 = na;
        Y === c && null !== c && (Y = c = c.return);
        continue;
      }
      break;
    } while (1);
  }
  function Jk() {
    var a = mk.current;
    mk.current = Rh;
    return null === a ? Rh : a;
  }
  function tj() {
    if (0 === T || 3 === T || 2 === T) T = 4;
    null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
  }
  function Ik(a, b2) {
    var c = K;
    K |= 2;
    var d = Jk();
    if (Q !== a || Z !== b2) uk = null, Kk(a, b2);
    do
      try {
        Tk();
        break;
      } catch (e) {
        Mk(a, e);
      }
    while (1);
    $g();
    K = c;
    mk.current = d;
    if (null !== Y) throw Error(p(261));
    Q = null;
    Z = 0;
    return T;
  }
  function Tk() {
    for (; null !== Y; ) Uk(Y);
  }
  function Lk() {
    for (; null !== Y && !cc(); ) Uk(Y);
  }
  function Uk(a) {
    var b2 = Vk(a.alternate, a, fj);
    a.memoizedProps = a.pendingProps;
    null === b2 ? Sk(a) : Y = b2;
    nk.current = null;
  }
  function Sk(a) {
    var b2 = a;
    do {
      var c = b2.alternate;
      a = b2.return;
      if (0 === (b2.flags & 32768)) {
        if (c = Ej(c, b2, fj), null !== c) {
          Y = c;
          return;
        }
      } else {
        c = Ij(c, b2);
        if (null !== c) {
          c.flags &= 32767;
          Y = c;
          return;
        }
        if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
        else {
          T = 6;
          Y = null;
          return;
        }
      }
      b2 = b2.sibling;
      if (null !== b2) {
        Y = b2;
        return;
      }
      Y = b2 = a;
    } while (null !== b2);
    0 === T && (T = 5);
  }
  function Pk(a, b2, c) {
    var d = C, e = ok.transition;
    try {
      ok.transition = null, C = 1, Wk(a, b2, c, d);
    } finally {
      ok.transition = e, C = d;
    }
    return null;
  }
  function Wk(a, b2, c, d) {
    do
      Hk();
    while (null !== wk);
    if (0 !== (K & 6)) throw Error(p(327));
    c = a.finishedWork;
    var e = a.finishedLanes;
    if (null === c) return null;
    a.finishedWork = null;
    a.finishedLanes = 0;
    if (c === a.current) throw Error(p(177));
    a.callbackNode = null;
    a.callbackPriority = 0;
    var f = c.lanes | c.childLanes;
    Bc(a, f);
    a === Q && (Y = Q = null, Z = 0);
    0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
      Hk();
      return null;
    }));
    f = 0 !== (c.flags & 15990);
    if (0 !== (c.subtreeFlags & 15990) || f) {
      f = ok.transition;
      ok.transition = null;
      var g = C;
      C = 1;
      var h = K;
      K |= 4;
      nk.current = null;
      Oj(a, c);
      dk(c, a);
      Oe(Df);
      dd = !!Cf;
      Df = Cf = null;
      a.current = c;
      hk(c);
      dc();
      K = h;
      C = g;
      ok.transition = f;
    } else a.current = c;
    vk && (vk = false, wk = a, xk = e);
    f = a.pendingLanes;
    0 === f && (Ri = null);
    mc(c.stateNode);
    Dk(a, B());
    if (null !== b2) for (d = a.onRecoverableError, c = 0; c < b2.length; c++) e = b2[c], d(e.value, { componentStack: e.stack, digest: e.digest });
    if (Oi) throw Oi = false, a = Pi, Pi = null, a;
    0 !== (xk & 1) && 0 !== a.tag && Hk();
    f = a.pendingLanes;
    0 !== (f & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
    jg();
    return null;
  }
  function Hk() {
    if (null !== wk) {
      var a = Dc(xk), b2 = ok.transition, c = C;
      try {
        ok.transition = null;
        C = 16 > a ? 16 : a;
        if (null === wk) var d = false;
        else {
          a = wk;
          wk = null;
          xk = 0;
          if (0 !== (K & 6)) throw Error(p(331));
          var e = K;
          K |= 4;
          for (V = a.current; null !== V; ) {
            var f = V, g = f.child;
            if (0 !== (V.flags & 16)) {
              var h = f.deletions;
              if (null !== h) {
                for (var k = 0; k < h.length; k++) {
                  var l = h[k];
                  for (V = l; null !== V; ) {
                    var m = V;
                    switch (m.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Pj(8, m, f);
                    }
                    var q = m.child;
                    if (null !== q) q.return = m, V = q;
                    else for (; null !== V; ) {
                      m = V;
                      var r = m.sibling, y = m.return;
                      Sj(m);
                      if (m === l) {
                        V = null;
                        break;
                      }
                      if (null !== r) {
                        r.return = y;
                        V = r;
                        break;
                      }
                      V = y;
                    }
                  }
                }
                var n = f.alternate;
                if (null !== n) {
                  var t = n.child;
                  if (null !== t) {
                    n.child = null;
                    do {
                      var J = t.sibling;
                      t.sibling = null;
                      t = J;
                    } while (null !== t);
                  }
                }
                V = f;
              }
            }
            if (0 !== (f.subtreeFlags & 2064) && null !== g) g.return = f, V = g;
            else b: for (; null !== V; ) {
              f = V;
              if (0 !== (f.flags & 2048)) switch (f.tag) {
                case 0:
                case 11:
                case 15:
                  Pj(9, f, f.return);
              }
              var x = f.sibling;
              if (null !== x) {
                x.return = f.return;
                V = x;
                break b;
              }
              V = f.return;
            }
          }
          var w = a.current;
          for (V = w; null !== V; ) {
            g = V;
            var u = g.child;
            if (0 !== (g.subtreeFlags & 2064) && null !== u) u.return = g, V = u;
            else b: for (g = w; null !== V; ) {
              h = V;
              if (0 !== (h.flags & 2048)) try {
                switch (h.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Qj(9, h);
                }
              } catch (na) {
                W(h, h.return, na);
              }
              if (h === g) {
                V = null;
                break b;
              }
              var F = h.sibling;
              if (null !== F) {
                F.return = h.return;
                V = F;
                break b;
              }
              V = h.return;
            }
          }
          K = e;
          jg();
          if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
            lc.onPostCommitFiberRoot(kc, a);
          } catch (na) {
          }
          d = true;
        }
        return d;
      } finally {
        C = c, ok.transition = b2;
      }
    }
    return false;
  }
  function Xk(a, b2, c) {
    b2 = Ji(c, b2);
    b2 = Ni(a, b2, 1);
    a = nh(a, b2, 1);
    b2 = R();
    null !== a && (Ac(a, 1, b2), Dk(a, b2));
  }
  function W(a, b2, c) {
    if (3 === a.tag) Xk(a, a, c);
    else for (; null !== b2; ) {
      if (3 === b2.tag) {
        Xk(b2, a, c);
        break;
      } else if (1 === b2.tag) {
        var d = b2.stateNode;
        if ("function" === typeof b2.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
          a = Ji(c, a);
          a = Qi(b2, a, 1);
          b2 = nh(b2, a, 1);
          a = R();
          null !== b2 && (Ac(b2, 1, a), Dk(b2, a));
          break;
        }
      }
      b2 = b2.return;
    }
  }
  function Ti(a, b2, c) {
    var d = a.pingCache;
    null !== d && d.delete(b2);
    b2 = R();
    a.pingedLanes |= a.suspendedLanes & c;
    Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
    Dk(a, b2);
  }
  function Yk(a, b2) {
    0 === b2 && (0 === (a.mode & 1) ? b2 = 1 : (b2 = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
    var c = R();
    a = ih(a, b2);
    null !== a && (Ac(a, b2, c), Dk(a, c));
  }
  function uj(a) {
    var b2 = a.memoizedState, c = 0;
    null !== b2 && (c = b2.retryLane);
    Yk(a, c);
  }
  function bk(a, b2) {
    var c = 0;
    switch (a.tag) {
      case 13:
        var d = a.stateNode;
        var e = a.memoizedState;
        null !== e && (c = e.retryLane);
        break;
      case 19:
        d = a.stateNode;
        break;
      default:
        throw Error(p(314));
    }
    null !== d && d.delete(b2);
    Yk(a, c);
  }
  var Vk;
  Vk = function(a, b2, c) {
    if (null !== a) if (a.memoizedProps !== b2.pendingProps || Wf.current) dh = true;
    else {
      if (0 === (a.lanes & c) && 0 === (b2.flags & 128)) return dh = false, yj(a, b2, c);
      dh = 0 !== (a.flags & 131072) ? true : false;
    }
    else dh = false, I && 0 !== (b2.flags & 1048576) && ug(b2, ng, b2.index);
    b2.lanes = 0;
    switch (b2.tag) {
      case 2:
        var d = b2.type;
        ij(a, b2);
        a = b2.pendingProps;
        var e = Yf(b2, H.current);
        ch(b2, c);
        e = Nh(null, b2, d, a, e, c);
        var f = Sh();
        b2.flags |= 1;
        "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b2.tag = 1, b2.memoizedState = null, b2.updateQueue = null, Zf(d) ? (f = true, cg(b2)) : f = false, b2.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b2), e.updater = Ei, b2.stateNode = e, e._reactInternals = b2, Ii(b2, d, a, c), b2 = jj(null, b2, d, true, f, c)) : (b2.tag = 0, I && f && vg(b2), Xi(null, b2, e, c), b2 = b2.child);
        return b2;
      case 16:
        d = b2.elementType;
        a: {
          ij(a, b2);
          a = b2.pendingProps;
          e = d._init;
          d = e(d._payload);
          b2.type = d;
          e = b2.tag = Zk(d);
          a = Ci(d, a);
          switch (e) {
            case 0:
              b2 = cj(null, b2, d, a, c);
              break a;
            case 1:
              b2 = hj(null, b2, d, a, c);
              break a;
            case 11:
              b2 = Yi(null, b2, d, a, c);
              break a;
            case 14:
              b2 = $i(null, b2, d, Ci(d.type, a), c);
              break a;
          }
          throw Error(p(
            306,
            d,
            ""
          ));
        }
        return b2;
      case 0:
        return d = b2.type, e = b2.pendingProps, e = b2.elementType === d ? e : Ci(d, e), cj(a, b2, d, e, c);
      case 1:
        return d = b2.type, e = b2.pendingProps, e = b2.elementType === d ? e : Ci(d, e), hj(a, b2, d, e, c);
      case 3:
        a: {
          kj(b2);
          if (null === a) throw Error(p(387));
          d = b2.pendingProps;
          f = b2.memoizedState;
          e = f.element;
          lh(a, b2);
          qh(b2, d, null, c);
          var g = b2.memoizedState;
          d = g.element;
          if (f.isDehydrated) if (f = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b2.updateQueue.baseState = f, b2.memoizedState = f, b2.flags & 256) {
            e = Ji(Error(p(423)), b2);
            b2 = lj(a, b2, d, c, e);
            break a;
          } else if (d !== e) {
            e = Ji(Error(p(424)), b2);
            b2 = lj(a, b2, d, c, e);
            break a;
          } else for (yg = Lf(b2.stateNode.containerInfo.firstChild), xg = b2, I = true, zg = null, c = Vg(b2, null, d, c), b2.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
          else {
            Ig();
            if (d === e) {
              b2 = Zi(a, b2, c);
              break a;
            }
            Xi(a, b2, d, c);
          }
          b2 = b2.child;
        }
        return b2;
      case 5:
        return Ah(b2), null === a && Eg(b2), d = b2.type, e = b2.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f && Ef(d, f) && (b2.flags |= 32), gj(a, b2), Xi(a, b2, g, c), b2.child;
      case 6:
        return null === a && Eg(b2), null;
      case 13:
        return oj(a, b2, c);
      case 4:
        return yh(b2, b2.stateNode.containerInfo), d = b2.pendingProps, null === a ? b2.child = Ug(b2, null, d, c) : Xi(a, b2, d, c), b2.child;
      case 11:
        return d = b2.type, e = b2.pendingProps, e = b2.elementType === d ? e : Ci(d, e), Yi(a, b2, d, e, c);
      case 7:
        return Xi(a, b2, b2.pendingProps, c), b2.child;
      case 8:
        return Xi(a, b2, b2.pendingProps.children, c), b2.child;
      case 12:
        return Xi(a, b2, b2.pendingProps.children, c), b2.child;
      case 10:
        a: {
          d = b2.type._context;
          e = b2.pendingProps;
          f = b2.memoizedProps;
          g = e.value;
          G(Wg, d._currentValue);
          d._currentValue = g;
          if (null !== f) if (He(f.value, g)) {
            if (f.children === e.children && !Wf.current) {
              b2 = Zi(a, b2, c);
              break a;
            }
          } else for (f = b2.child, null !== f && (f.return = b2); null !== f; ) {
            var h = f.dependencies;
            if (null !== h) {
              g = f.child;
              for (var k = h.firstContext; null !== k; ) {
                if (k.context === d) {
                  if (1 === f.tag) {
                    k = mh(-1, c & -c);
                    k.tag = 2;
                    var l = f.updateQueue;
                    if (null !== l) {
                      l = l.shared;
                      var m = l.pending;
                      null === m ? k.next = k : (k.next = m.next, m.next = k);
                      l.pending = k;
                    }
                  }
                  f.lanes |= c;
                  k = f.alternate;
                  null !== k && (k.lanes |= c);
                  bh(
                    f.return,
                    c,
                    b2
                  );
                  h.lanes |= c;
                  break;
                }
                k = k.next;
              }
            } else if (10 === f.tag) g = f.type === b2.type ? null : f.child;
            else if (18 === f.tag) {
              g = f.return;
              if (null === g) throw Error(p(341));
              g.lanes |= c;
              h = g.alternate;
              null !== h && (h.lanes |= c);
              bh(g, c, b2);
              g = f.sibling;
            } else g = f.child;
            if (null !== g) g.return = f;
            else for (g = f; null !== g; ) {
              if (g === b2) {
                g = null;
                break;
              }
              f = g.sibling;
              if (null !== f) {
                f.return = g.return;
                g = f;
                break;
              }
              g = g.return;
            }
            f = g;
          }
          Xi(a, b2, e.children, c);
          b2 = b2.child;
        }
        return b2;
      case 9:
        return e = b2.type, d = b2.pendingProps.children, ch(b2, c), e = eh(e), d = d(e), b2.flags |= 1, Xi(a, b2, d, c), b2.child;
      case 14:
        return d = b2.type, e = Ci(d, b2.pendingProps), e = Ci(d.type, e), $i(a, b2, d, e, c);
      case 15:
        return bj(a, b2, b2.type, b2.pendingProps, c);
      case 17:
        return d = b2.type, e = b2.pendingProps, e = b2.elementType === d ? e : Ci(d, e), ij(a, b2), b2.tag = 1, Zf(d) ? (a = true, cg(b2)) : a = false, ch(b2, c), Gi(b2, d, e), Ii(b2, d, e, c), jj(null, b2, d, true, a, c);
      case 19:
        return xj(a, b2, c);
      case 22:
        return dj(a, b2, c);
    }
    throw Error(p(156, b2.tag));
  };
  function Fk(a, b2) {
    return ac(a, b2);
  }
  function $k(a, b2, c, d) {
    this.tag = a;
    this.key = c;
    this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
    this.index = 0;
    this.ref = null;
    this.pendingProps = b2;
    this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
    this.mode = d;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function Bg(a, b2, c, d) {
    return new $k(a, b2, c, d);
  }
  function aj(a) {
    a = a.prototype;
    return !(!a || !a.isReactComponent);
  }
  function Zk(a) {
    if ("function" === typeof a) return aj(a) ? 1 : 0;
    if (void 0 !== a && null !== a) {
      a = a.$$typeof;
      if (a === Da) return 11;
      if (a === Ga) return 14;
    }
    return 2;
  }
  function Pg(a, b2) {
    var c = a.alternate;
    null === c ? (c = Bg(a.tag, b2, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b2, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
    c.flags = a.flags & 14680064;
    c.childLanes = a.childLanes;
    c.lanes = a.lanes;
    c.child = a.child;
    c.memoizedProps = a.memoizedProps;
    c.memoizedState = a.memoizedState;
    c.updateQueue = a.updateQueue;
    b2 = a.dependencies;
    c.dependencies = null === b2 ? null : { lanes: b2.lanes, firstContext: b2.firstContext };
    c.sibling = a.sibling;
    c.index = a.index;
    c.ref = a.ref;
    return c;
  }
  function Rg(a, b2, c, d, e, f) {
    var g = 2;
    d = a;
    if ("function" === typeof a) aj(a) && (g = 1);
    else if ("string" === typeof a) g = 5;
    else a: switch (a) {
      case ya:
        return Tg(c.children, e, f, b2);
      case za:
        g = 8;
        e |= 8;
        break;
      case Aa:
        return a = Bg(12, c, b2, e | 2), a.elementType = Aa, a.lanes = f, a;
      case Ea:
        return a = Bg(13, c, b2, e), a.elementType = Ea, a.lanes = f, a;
      case Fa:
        return a = Bg(19, c, b2, e), a.elementType = Fa, a.lanes = f, a;
      case Ia:
        return pj(c, e, f, b2);
      default:
        if ("object" === typeof a && null !== a) switch (a.$$typeof) {
          case Ba:
            g = 10;
            break a;
          case Ca:
            g = 9;
            break a;
          case Da:
            g = 11;
            break a;
          case Ga:
            g = 14;
            break a;
          case Ha:
            g = 16;
            d = null;
            break a;
        }
        throw Error(p(130, null == a ? a : typeof a, ""));
    }
    b2 = Bg(g, c, b2, e);
    b2.elementType = a;
    b2.type = d;
    b2.lanes = f;
    return b2;
  }
  function Tg(a, b2, c, d) {
    a = Bg(7, a, d, b2);
    a.lanes = c;
    return a;
  }
  function pj(a, b2, c, d) {
    a = Bg(22, a, d, b2);
    a.elementType = Ia;
    a.lanes = c;
    a.stateNode = { isHidden: false };
    return a;
  }
  function Qg(a, b2, c) {
    a = Bg(6, a, null, b2);
    a.lanes = c;
    return a;
  }
  function Sg(a, b2, c) {
    b2 = Bg(4, null !== a.children ? a.children : [], a.key, b2);
    b2.lanes = c;
    b2.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
    return b2;
  }
  function al(a, b2, c, d, e) {
    this.tag = b2;
    this.containerInfo = a;
    this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode = this.pendingContext = this.context = null;
    this.callbackPriority = 0;
    this.eventTimes = zc(0);
    this.expirationTimes = zc(-1);
    this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
    this.entanglements = zc(0);
    this.identifierPrefix = d;
    this.onRecoverableError = e;
    this.mutableSourceEagerHydrationData = null;
  }
  function bl(a, b2, c, d, e, f, g, h, k) {
    a = new al(a, b2, c, h, k);
    1 === b2 ? (b2 = 1, true === f && (b2 |= 8)) : b2 = 0;
    f = Bg(3, null, null, b2);
    a.current = f;
    f.stateNode = a;
    f.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
    kh(f);
    return a;
  }
  function cl(a, b2, c) {
    var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b2, implementation: c };
  }
  function dl(a) {
    if (!a) return Vf;
    a = a._reactInternals;
    a: {
      if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
      var b2 = a;
      do {
        switch (b2.tag) {
          case 3:
            b2 = b2.stateNode.context;
            break a;
          case 1:
            if (Zf(b2.type)) {
              b2 = b2.stateNode.__reactInternalMemoizedMergedChildContext;
              break a;
            }
        }
        b2 = b2.return;
      } while (null !== b2);
      throw Error(p(171));
    }
    if (1 === a.tag) {
      var c = a.type;
      if (Zf(c)) return bg(a, c, b2);
    }
    return b2;
  }
  function el(a, b2, c, d, e, f, g, h, k) {
    a = bl(c, d, true, a, e, f, g, h, k);
    a.context = dl(null);
    c = a.current;
    d = R();
    e = yi(c);
    f = mh(d, e);
    f.callback = void 0 !== b2 && null !== b2 ? b2 : null;
    nh(c, f, e);
    a.current.lanes = e;
    Ac(a, e, d);
    Dk(a, d);
    return a;
  }
  function fl(a, b2, c, d) {
    var e = b2.current, f = R(), g = yi(e);
    c = dl(c);
    null === b2.context ? b2.context = c : b2.pendingContext = c;
    b2 = mh(f, g);
    b2.payload = { element: a };
    d = void 0 === d ? null : d;
    null !== d && (b2.callback = d);
    a = nh(e, b2, g);
    null !== a && (gi(a, e, g, f), oh(a, e, g));
    return g;
  }
  function gl(a) {
    a = a.current;
    if (!a.child) return null;
    switch (a.child.tag) {
      case 5:
        return a.child.stateNode;
      default:
        return a.child.stateNode;
    }
  }
  function hl(a, b2) {
    a = a.memoizedState;
    if (null !== a && null !== a.dehydrated) {
      var c = a.retryLane;
      a.retryLane = 0 !== c && c < b2 ? c : b2;
    }
  }
  function il(a, b2) {
    hl(a, b2);
    (a = a.alternate) && hl(a, b2);
  }
  function jl() {
    return null;
  }
  var kl = "function" === typeof reportError ? reportError : function(a) {
    console.error(a);
  };
  function ll(a) {
    this._internalRoot = a;
  }
  ml.prototype.render = ll.prototype.render = function(a) {
    var b2 = this._internalRoot;
    if (null === b2) throw Error(p(409));
    fl(a, b2, null, null);
  };
  ml.prototype.unmount = ll.prototype.unmount = function() {
    var a = this._internalRoot;
    if (null !== a) {
      this._internalRoot = null;
      var b2 = a.containerInfo;
      Rk(function() {
        fl(null, a, null, null);
      });
      b2[uf] = null;
    }
  };
  function ml(a) {
    this._internalRoot = a;
  }
  ml.prototype.unstable_scheduleHydration = function(a) {
    if (a) {
      var b2 = Hc();
      a = { blockedOn: null, target: a, priority: b2 };
      for (var c = 0; c < Qc.length && 0 !== b2 && b2 < Qc[c].priority; c++) ;
      Qc.splice(c, 0, a);
      0 === c && Vc(a);
    }
  };
  function nl(a) {
    return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
  }
  function ol(a) {
    return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
  }
  function pl() {
  }
  function ql(a, b2, c, d, e) {
    if (e) {
      if ("function" === typeof d) {
        var f = d;
        d = function() {
          var a2 = gl(g);
          f.call(a2);
        };
      }
      var g = el(b2, d, a, 0, null, false, false, "", pl);
      a._reactRootContainer = g;
      a[uf] = g.current;
      sf(8 === a.nodeType ? a.parentNode : a);
      Rk();
      return g;
    }
    for (; e = a.lastChild; ) a.removeChild(e);
    if ("function" === typeof d) {
      var h = d;
      d = function() {
        var a2 = gl(k);
        h.call(a2);
      };
    }
    var k = bl(a, 0, false, null, null, false, false, "", pl);
    a._reactRootContainer = k;
    a[uf] = k.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk(function() {
      fl(b2, k, c, d);
    });
    return k;
  }
  function rl(a, b2, c, d, e) {
    var f = c._reactRootContainer;
    if (f) {
      var g = f;
      if ("function" === typeof e) {
        var h = e;
        e = function() {
          var a2 = gl(g);
          h.call(a2);
        };
      }
      fl(b2, g, a, e);
    } else g = ql(c, b2, a, e, d);
    return gl(g);
  }
  Ec = function(a) {
    switch (a.tag) {
      case 3:
        var b2 = a.stateNode;
        if (b2.current.memoizedState.isDehydrated) {
          var c = tc(b2.pendingLanes);
          0 !== c && (Cc(b2, c | 1), Dk(b2, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
        }
        break;
      case 13:
        Rk(function() {
          var b3 = ih(a, 1);
          if (null !== b3) {
            var c2 = R();
            gi(b3, a, 1, c2);
          }
        }), il(a, 1);
    }
  };
  Fc = function(a) {
    if (13 === a.tag) {
      var b2 = ih(a, 134217728);
      if (null !== b2) {
        var c = R();
        gi(b2, a, 134217728, c);
      }
      il(a, 134217728);
    }
  };
  Gc = function(a) {
    if (13 === a.tag) {
      var b2 = yi(a), c = ih(a, b2);
      if (null !== c) {
        var d = R();
        gi(c, a, b2, d);
      }
      il(a, b2);
    }
  };
  Hc = function() {
    return C;
  };
  Ic = function(a, b2) {
    var c = C;
    try {
      return C = a, b2();
    } finally {
      C = c;
    }
  };
  yb = function(a, b2, c) {
    switch (b2) {
      case "input":
        bb(a, c);
        b2 = c.name;
        if ("radio" === c.type && null != b2) {
          for (c = a; c.parentNode; ) c = c.parentNode;
          c = c.querySelectorAll("input[name=" + JSON.stringify("" + b2) + '][type="radio"]');
          for (b2 = 0; b2 < c.length; b2++) {
            var d = c[b2];
            if (d !== a && d.form === a.form) {
              var e = Db(d);
              if (!e) throw Error(p(90));
              Wa(d);
              bb(d, e);
            }
          }
        }
        break;
      case "textarea":
        ib(a, c);
        break;
      case "select":
        b2 = c.value, null != b2 && fb(a, !!c.multiple, b2, false);
    }
  };
  Gb = Qk;
  Hb = Rk;
  var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
  var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
    a = Zb(a);
    return null === a ? null : a.stateNode;
  }, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!vl.isDisabled && vl.supportsFiber) try {
      kc = vl.inject(ul), lc = vl;
    } catch (a) {
    }
  }
  reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
  reactDom_production_min.createPortal = function(a, b2) {
    var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!nl(b2)) throw Error(p(200));
    return cl(a, b2, null, c);
  };
  reactDom_production_min.createRoot = function(a, b2) {
    if (!nl(a)) throw Error(p(299));
    var c = false, d = "", e = kl;
    null !== b2 && void 0 !== b2 && (true === b2.unstable_strictMode && (c = true), void 0 !== b2.identifierPrefix && (d = b2.identifierPrefix), void 0 !== b2.onRecoverableError && (e = b2.onRecoverableError));
    b2 = bl(a, 1, false, null, null, c, false, d, e);
    a[uf] = b2.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    return new ll(b2);
  };
  reactDom_production_min.findDOMNode = function(a) {
    if (null == a) return null;
    if (1 === a.nodeType) return a;
    var b2 = a._reactInternals;
    if (void 0 === b2) {
      if ("function" === typeof a.render) throw Error(p(188));
      a = Object.keys(a).join(",");
      throw Error(p(268, a));
    }
    a = Zb(b2);
    a = null === a ? null : a.stateNode;
    return a;
  };
  reactDom_production_min.flushSync = function(a) {
    return Rk(a);
  };
  reactDom_production_min.hydrate = function(a, b2, c) {
    if (!ol(b2)) throw Error(p(200));
    return rl(null, a, b2, true, c);
  };
  reactDom_production_min.hydrateRoot = function(a, b2, c) {
    if (!nl(a)) throw Error(p(405));
    var d = null != c && c.hydratedSources || null, e = false, f = "", g = kl;
    null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
    b2 = el(b2, null, a, 1, null != c ? c : null, e, false, f, g);
    a[uf] = b2.current;
    sf(a);
    if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b2.mutableSourceEagerHydrationData ? b2.mutableSourceEagerHydrationData = [c, e] : b2.mutableSourceEagerHydrationData.push(
      c,
      e
    );
    return new ml(b2);
  };
  reactDom_production_min.render = function(a, b2, c) {
    if (!ol(b2)) throw Error(p(200));
    return rl(null, a, b2, false, c);
  };
  reactDom_production_min.unmountComponentAtNode = function(a) {
    if (!ol(a)) throw Error(p(40));
    return a._reactRootContainer ? (Rk(function() {
      rl(null, null, a, false, function() {
        a._reactRootContainer = null;
        a[uf] = null;
      });
    }), true) : false;
  };
  reactDom_production_min.unstable_batchedUpdates = Qk;
  reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b2, c, d) {
    if (!ol(c)) throw Error(p(200));
    if (null == a || void 0 === a._reactInternals) throw Error(p(38));
    return rl(a, b2, c, false, d);
  };
  reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
  return reactDom_production_min;
}
var hasRequiredReactDom;
function requireReactDom() {
  if (hasRequiredReactDom) return reactDom.exports;
  hasRequiredReactDom = 1;
  function checkDCE() {
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
      return;
    }
    try {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
      console.error(err);
    }
  }
  {
    checkDCE();
    reactDom.exports = requireReactDom_production_min();
  }
  return reactDom.exports;
}
var hasRequiredClient;
function requireClient() {
  if (hasRequiredClient) return client;
  hasRequiredClient = 1;
  var m = requireReactDom();
  {
    client.createRoot = m.createRoot;
    client.hydrateRoot = m.hydrateRoot;
  }
  return client;
}
var clientExports = requireClient();
var reactExports = requireReact();
const emptyActivity = {
  importing: { active: false, done: 0, total: 0, current: "", label: "" },
  sync: null,
  artFetch: { active: false, done: 0, total: 0 }
};
let state = {
  ready: false,
  tracks: /* @__PURE__ */ new Map(),
  allTracks: [],
  libVersion: 0,
  playlists: [],
  devices: [],
  deviceTracks: /* @__PURE__ */ new Map(),
  devVersion: 0,
  settings: null,
  activity: emptyActivity,
  source: "music",
  search: "",
  selection: /* @__PURE__ */ new Set(),
  anchor: null,
  browser: { genre: null, artist: null, album: null },
  dialog: null,
  renamingPlaylist: null,
  scrollRequest: null,
  message: null
};
const listeners$1 = /* @__PURE__ */ new Set();
const getState = () => state;
function setState(patch) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  listeners$1.forEach((l) => l());
}
const subscribe = (l) => {
  listeners$1.add(l);
  return () => listeners$1.delete(l);
};
function useStore(sel) {
  return reactExports.useSyncExternalStore(subscribe, () => sel(state));
}
const api = () => window.discette;
async function initStore() {
  const b2 = api();
  const [tracks, playlists, devices, settings, activity] = await Promise.all([
    b2.library.tracks(),
    b2.playlists.all(),
    b2.devices.list(),
    b2.settings.get(),
    b2.library.activity()
  ]);
  const map = new Map(tracks.map((t) => [t.id, t]));
  setState({
    ready: true,
    tracks: map,
    allTracks: tracks,
    libVersion: 1,
    playlists,
    devices,
    settings,
    activity,
    source: validSource(settings.ui.lastSource, playlists, devices) ? settings.ui.lastSource : "music"
  });
  b2.library.onDelta(applyDelta);
  b2.playlists.onChanged((p) => setState({ playlists: p }));
  b2.devices.onChanged((d) => {
    setState((s) => {
      const ids = new Set(d.map((x) => x.id));
      const deviceTracks = new Map([...s.deviceTracks].filter(([k]) => ids.has(k)));
      const source = s.source.startsWith("dev:") && !ids.has(s.source.slice(4)) ? "music" : s.source;
      return { devices: d, deviceTracks, source, devVersion: s.devVersion + 1 };
    });
  });
  b2.devices.onTracks(({ deviceId, tracks: tracks2, reset }) => {
    setState((s) => {
      const m = new Map(s.deviceTracks);
      m.set(deviceId, reset ? tracks2 : [...m.get(deviceId) ?? [], ...tracks2]);
      return { deviceTracks: m, devVersion: s.devVersion + 1 };
    });
  });
  for (const d of devices) {
    void b2.devices.tracks(d.id).then(
      (t) => setState((s) => {
        const m = new Map(s.deviceTracks);
        m.set(d.id, t);
        return { deviceTracks: m, devVersion: s.devVersion + 1 };
      })
    );
  }
  b2.settings.onChanged((settings2) => setState({ settings: settings2 }));
  b2.library.onActivity((activity2) => setState({ activity: { ...activity2 } }));
  b2.library.onMessage((m) => setState({ message: m }));
}
function validSource(src, playlists, devices) {
  if (src.startsWith("pl:")) return playlists.some((p) => p.id === Number(src.slice(3)));
  if (src.startsWith("dev:")) return devices.some((d) => d.id === src.slice(4));
  return ["music", "movies", "tvshows", "musicvideos", "homevideos"].includes(src);
}
let pendingDelta = [];
let deltaTimer = null;
function applyDelta(d) {
  pendingDelta.push(d);
  if (deltaTimer != null) return;
  deltaTimer = window.setTimeout(() => {
    deltaTimer = null;
    const batch = pendingDelta;
    pendingDelta = [];
    setState((s) => {
      const m = new Map(s.tracks);
      for (const x of batch) {
        for (const t of x.upserted) m.set(t.id, t);
        for (const id of x.removed) m.delete(id);
      }
      return { tracks: m, allTracks: [...m.values()], libVersion: s.libVersion + 1 };
    });
  }, 60);
}
let uiSaveTimer = null;
window.addEventListener("beforeunload", () => {
  if (uiSaveTimer != null) void api().settings.set({ ui: getState().settings.ui });
});
function updateUi(patch) {
  setState((s) => ({ settings: { ...s.settings, ui: { ...s.settings.ui, ...patch } } }));
  if (uiSaveTimer != null) clearTimeout(uiSaveTimer);
  uiSaveTimer = window.setTimeout(() => {
    void api().settings.set({ ui: getState().settings.ui });
  }, 400);
}
function selectSource(source) {
  if (source === getState().source) return;
  setState({ source, selection: /* @__PURE__ */ new Set(), anchor: null, browser: { genre: null, artist: null, album: null }, search: "" });
  updateUi({ lastSource: source });
}
function trackFor(id) {
  if (id > 0) return state.tracks.get(id);
  for (const list of state.deviceTracks.values()) {
    const t = list.find((x) => x.id === id);
    if (t) return t;
  }
  return void 0;
}
function showMessage(title, detail) {
  setState({ message: { title, detail } });
}
let ps = {
  current: null,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  queue: [],
  index: -1,
  upNext: [],
  sourceKey: "",
  info: null,
  videoVisible: false,
  subtitle: -1
};
const listeners = /* @__PURE__ */ new Set();
function set(p) {
  ps = { ...ps, ...p };
  listeners.forEach((l) => l());
}
const getPlayer = () => ps;
function usePlayer(sel) {
  return reactExports.useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => sel(ps)
  );
}
const media = document.createElement("video");
media.preload = "auto";
media.className = "media-el";
media.crossOrigin = "anonymous";
let streamOffset = 0;
let originalOrder = [];
let countedPlay = false;
let loadToken = 0;
function initPlayer(volume, shuffle, repeat) {
  media.volume = volume;
  set({ volume, shuffle, repeat });
  media.addEventListener("timeupdate", () => {
    const time = streamOffset + media.currentTime;
    set({ time });
    const c = ps.current;
    if (c && !countedPlay && ps.duration > 0 && time > Math.min(ps.duration * 0.5, 240)) {
      countedPlay = true;
      void window.discette.library.played(c.id);
    }
  });
  media.addEventListener("durationchange", () => {
    if (ps.info?.seekable && isFinite(media.duration)) set({ duration: media.duration });
  });
  media.addEventListener("play", () => set({ playing: true }));
  media.addEventListener("pause", () => set({ playing: false }));
  media.addEventListener("waiting", () => set({ loading: true }));
  media.addEventListener("playing", () => set({ loading: false }));
  media.addEventListener("canplay", () => set({ loading: false }));
  media.addEventListener("volumechange", () => set({ volume: media.volume, muted: media.muted }));
  media.addEventListener("ended", () => {
    if (ps.current && !countedPlay) void window.discette.library.played(ps.current.id);
    countedPlay = true;
    if (ps.repeat === "one") {
      void seek(0).then(() => media.play());
      return;
    }
    void next(true);
  });
  media.addEventListener("error", () => {
    if (!ps.current || !media.src) return;
    set({ loading: false, playing: false });
    const t = ps.current;
    showMessage(`“${t.title}” could not be played.`, media.error?.message || "The file format may not be supported.");
  });
  setupMediaSession();
}
function shuffled(ids, first) {
  const rest = ids.filter((x) => x !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first ? [first, ...rest] : rest;
}
async function playList(ids, startIndex, sourceKey) {
  if (!ids.length) return;
  startIndex = Math.max(0, Math.min(startIndex, ids.length - 1));
  originalOrder = ids;
  const first = ids[startIndex];
  const queue = ps.shuffle ? shuffled(ids, first) : ids;
  const index = ps.shuffle ? 0 : startIndex;
  set({ queue, index, sourceKey });
  await load(queue[index]);
}
async function load(id, autoplay) {
  const t = trackFor(id);
  if (!t) return;
  const token = ++loadToken;
  countedPlay = false;
  streamOffset = 0;
  set({ current: t, loading: true, time: 0, duration: t.duration, info: null, subtitle: -1, videoVisible: t.mediaKind !== "music" });
  const info = await window.discette.library.playback(id);
  if (token !== loadToken) return;
  if (!info || "error" in info) {
    set({ loading: false, playing: false });
    showMessage(`“${t.title}” could not be played.`, info && "error" in info ? info.error : "The item is no longer available.");
    return;
  }
  set({ info });
  while (media.firstChild) media.removeChild(media.firstChild);
  info.subtitles.forEach((s) => {
    const el = document.createElement("track");
    el.kind = "subtitles";
    el.label = s.label;
    el.srclang = s.lang;
    el.src = s.url;
    media.appendChild(el);
  });
  media.src = info.url;
  updateMediaSession(t);
  {
    try {
      await media.play();
    } catch (e) {
      if (e.name !== "AbortError") console.warn(e);
    }
  }
}
function togglePlay() {
  if (!ps.current) {
    window.dispatchEvent(new CustomEvent("discette:play-selection"));
    return;
  }
  if (media.paused) void media.play();
  else media.pause();
}
async function next(auto = false) {
  if (!auto && ps.current && ps.time > 2 && ps.time < 20) void window.discette.library.skipped(ps.current.id);
  if (ps.upNext.length) {
    const [id, ...rest] = ps.upNext;
    set({ upNext: rest });
    await load(id);
    return;
  }
  let i = ps.index + 1;
  if (i >= ps.queue.length) {
    if (ps.repeat === "all" && ps.queue.length) {
      if (ps.shuffle) set({ queue: shuffled(originalOrder, 0) });
      i = 0;
    } else {
      media.pause();
      set({ playing: false, index: ps.queue.length ? 0 : -1 });
      if (auto) {
        media.removeAttribute("src");
        media.load();
        set({ current: null, time: 0, videoVisible: false });
      }
      return;
    }
  }
  set({ index: i });
  await load(ps.queue[i]);
}
async function prev() {
  if (ps.time > 3 || ps.index <= 0) {
    await seek(0);
    if (media.paused) void media.play();
    return;
  }
  const i = ps.index - 1;
  set({ index: i });
  await load(ps.queue[i]);
}
async function seek(t) {
  if (!ps.current || !ps.info) return;
  t = Math.max(0, Math.min(t, (ps.duration || 0) - 0.25));
  if (ps.info.seekable) {
    media.currentTime = t;
    set({ time: t });
    return;
  }
  const wasPlaying = !media.paused;
  streamOffset = t;
  const subs = [...media.querySelectorAll("track")];
  media.src = `${ps.info.url}?t=${t.toFixed(2)}&n=${Date.now()}`;
  subs.forEach((s) => media.appendChild(s));
  set({ time: t, loading: true });
  if (wasPlaying) await media.play().catch(() => void 0);
}
function setVolume(v) {
  media.volume = Math.max(0, Math.min(1, v));
  media.muted = false;
  updateUi({ volume: media.volume });
}
function toggleShuffle() {
  const shuffle = !ps.shuffle;
  if (ps.current && originalOrder.length) {
    if (shuffle) set({ queue: shuffled(originalOrder, ps.current.id), index: 0 });
    else set({ queue: originalOrder, index: Math.max(0, originalOrder.indexOf(ps.current.id)) });
  }
  set({ shuffle });
  updateUi({ shuffle });
}
function cycleRepeat() {
  const repeat = ps.repeat === "off" ? "all" : ps.repeat === "all" ? "one" : "off";
  set({ repeat });
  updateUi({ repeat });
}
function playNext(ids) {
  set({ upNext: [...ids, ...ps.upNext] });
}
function addToUpNext(ids) {
  set({ upNext: [...ps.upNext, ...ids] });
}
function stop() {
  media.pause();
  media.removeAttribute("src");
  media.load();
  set({ current: null, playing: false, time: 0, videoVisible: false, info: null });
}
function setVideoVisible(v) {
  set({ videoVisible: v });
}
function setSubtitle(i) {
  const tracks = media.textTracks;
  for (let k = 0; k < tracks.length; k++) tracks[k].mode = k === i ? "showing" : "disabled";
  set({ subtitle: i });
}
function refreshCurrent() {
  if (!ps.current) return;
  const t = trackFor(ps.current.id);
  if (t && t !== ps.current) {
    set({ current: t });
    updateMediaSession(t);
  }
}
function setupMediaSession() {
  const ms = navigator.mediaSession;
  if (!ms) return;
  ms.setActionHandler("play", () => void media.play());
  ms.setActionHandler("pause", () => media.pause());
  ms.setActionHandler("previoustrack", () => void prev());
  ms.setActionHandler("nexttrack", () => void next());
  ms.setActionHandler("seekto", (d) => d.seekTime != null && void seek(d.seekTime));
  ms.setActionHandler("stop", () => stop());
}
const artDataCache = /* @__PURE__ */ new Map();
async function artDataUrl(key) {
  if (artDataCache.has(key)) return artDataCache.get(key);
  try {
    const blob = await (await fetch(`discette://art/${key}`)).blob();
    const url = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    if (artDataCache.size > 50) artDataCache.clear();
    artDataCache.set(key, url);
    return url;
  } catch {
    return null;
  }
}
function updateMediaSession(t) {
  const ms = navigator.mediaSession;
  if (!ms) return;
  const meta = { title: t.title, artist: t.mediaKind === "tvshow" ? t.show : t.artist, album: t.album };
  ms.metadata = new MediaMetadata(meta);
  if (t.artKey) {
    void artDataUrl(t.artKey).then((src) => {
      if (src && ps.current?.id === t.id) ms.metadata = new MediaMetadata({ ...meta, artwork: [{ src, sizes: "300x300", type: "image/jpeg" }] });
    });
  }
}
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor(sec % 3600 / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
function formatSize(bytes) {
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + " TB";
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  if (bytes >= 1e3) return Math.round(bytes / 1e3) + " KB";
  return bytes + " bytes";
}
function formatTotalDuration(sec) {
  const days = sec / 86400;
  if (days >= 1) return `${days.toFixed(1)} days`;
  const hours = sec / 3600;
  if (hours >= 1) return `${hours.toFixed(1)} hours`;
  const min = Math.round(sec / 60);
  if (min >= 1) return `${min} ${min === 1 ? "minute" : "minutes"}`;
  const s = Math.round(sec);
  return `${s} ${s === 1 ? "second" : "seconds"}`;
}
function formatDate(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" });
}
function albumKey(t) {
  const artist = t.compilation ? "Various Artists" : t.albumArtist || t.artist || "Unknown Artist";
  return `${artist}\0${t.album || "Unknown Album"}`;
}
function sortName(s) {
  return s.toLocaleLowerCase().replace(/^(the|a|an)\s+/, "");
}
function plural(n, word, pluralWord = word + "s") {
  return `${n.toLocaleString()} ${n === 1 ? word : pluralWord}`;
}
const STRING_FIELDS = [
  { key: "title", label: "Name" },
  { key: "artist", label: "Artist" },
  { key: "albumArtist", label: "Album Artist" },
  { key: "album", label: "Album" },
  { key: "genre", label: "Genre" },
  { key: "composer", label: "Composer" },
  { key: "comment", label: "Comments" },
  { key: "show", label: "Show" }
];
const NUMBER_FIELDS = [
  { key: "year", label: "Year" },
  { key: "rating", label: "Rating" },
  { key: "playCount", label: "Plays" },
  { key: "skipCount", label: "Skips" },
  { key: "bpm", label: "BPM" },
  { key: "bitrate", label: "Bit Rate" },
  { key: "duration", label: "Time (seconds)" },
  { key: "trackNo", label: "Track Number" },
  { key: "season", label: "Season" },
  { key: "episode", label: "Episode" },
  { key: "size", label: "Size (MB)" }
];
const DATE_FIELDS = [
  { key: "dateAdded", label: "Date Added" },
  { key: "lastPlayed", label: "Last Played" }
];
const OTHER_FIELDS = [
  { key: "mediaKind", label: "Media Kind" },
  { key: "compilation", label: "Compilation" },
  { key: "playlist", label: "Playlist" }
];
const ALL_FIELDS = [...STRING_FIELDS, ...NUMBER_FIELDS, ...DATE_FIELDS, ...OTHER_FIELDS];
function fieldType(f) {
  if (STRING_FIELDS.some((x) => x.key === f)) return "string";
  if (NUMBER_FIELDS.some((x) => x.key === f)) return "number";
  if (DATE_FIELDS.some((x) => x.key === f)) return "date";
  if (f === "mediaKind") return "kind";
  if (f === "compilation") return "bool";
  return "playlist";
}
const OPS_BY_TYPE = {
  string: [
    { op: "contains", label: "contains" },
    { op: "notContains", label: "does not contain" },
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" },
    { op: "startsWith", label: "starts with" },
    { op: "endsWith", label: "ends with" }
  ],
  number: [
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" },
    { op: "gt", label: "is greater than" },
    { op: "lt", label: "is less than" },
    { op: "inRange", label: "is in the range" }
  ],
  date: [
    { op: "inLast", label: "is in the last" },
    { op: "notInLast", label: "is not in the last" },
    { op: "before", label: "is before" },
    { op: "after", label: "is after" }
  ],
  kind: [
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" }
  ],
  bool: [
    { op: "isTrue", label: "is true" },
    { op: "isFalse", label: "is false" }
  ],
  playlist: [
    { op: "is", label: "is" },
    { op: "isNot", label: "is not" }
  ]
};
function defaultRule() {
  return { field: "artist", op: "contains", value: "" };
}
function defaultSmartRules() {
  return {
    match: "all",
    rules: [defaultRule()],
    limit: { enabled: false, count: 25, unit: "items", selectBy: "random" },
    liveUpdating: true
  };
}
const DAY = 864e5;
function unitMs(u) {
  return u === "weeks" ? 7 * DAY : u === "months" ? 30 * DAY : DAY;
}
function numValue(t, f) {
  if (f === "size") return t.size / 1e6;
  return t[f] ?? 0;
}
function matchRule(t, r, ctx) {
  const type = fieldType(r.field);
  switch (type) {
    case "string": {
      const v = String(t[r.field] ?? "").toLocaleLowerCase();
      const q = String(r.value ?? "").toLocaleLowerCase();
      switch (r.op) {
        case "contains":
          return v.includes(q);
        case "notContains":
          return !v.includes(q);
        case "is":
          return v === q;
        case "isNot":
          return v !== q;
        case "startsWith":
          return v.startsWith(q);
        case "endsWith":
          return v.endsWith(q);
      }
      return false;
    }
    case "number": {
      const v = numValue(t, r.field);
      const a = Number(r.value) || 0;
      switch (r.op) {
        case "is":
          return v === a;
        case "isNot":
          return v !== a;
        case "gt":
          return v > a;
        case "lt":
          return v < a;
        case "inRange": {
          const b2 = Number(r.value2 ?? a);
          return v >= Math.min(a, b2) && v <= Math.max(a, b2);
        }
      }
      return false;
    }
    case "date": {
      const v = t[r.field] ?? 0;
      switch (r.op) {
        case "inLast":
          return v > 0 && v >= ctx.now - (Number(r.value) || 0) * unitMs(r.unit);
        case "notInLast":
          return v === 0 || v < ctx.now - (Number(r.value) || 0) * unitMs(r.unit);
        case "before":
          return v > 0 && v < Date.parse(String(r.value));
        case "after":
          return v > Date.parse(String(r.value));
      }
      return false;
    }
    case "kind":
      return r.op === "is" ? t.mediaKind === r.value : t.mediaKind !== r.value;
    case "bool":
      return r.op === "isTrue" ? !!t.compilation : !t.compilation;
    case "playlist": {
      if (ctx.depth > 8) return false;
      const members = ctx.resolvePlaylist(String(r.value), ctx.depth + 1);
      return r.op === "is" ? members.has(t.id) : !members.has(t.id);
    }
  }
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function selectComparator(sel, seed) {
  const s = (x) => sortName(x);
  switch (sel) {
    case "random":
      return (a, b2) => hashStr(seed + a.pid) - hashStr(seed + b2.pid);
    case "title":
      return (a, b2) => s(a.title).localeCompare(s(b2.title));
    case "album":
      return (a, b2) => s(a.album).localeCompare(s(b2.album));
    case "artist":
      return (a, b2) => s(a.artist).localeCompare(s(b2.artist));
    case "genre":
      return (a, b2) => s(a.genre).localeCompare(s(b2.genre));
    case "highestRating":
      return (a, b2) => b2.rating - a.rating;
    case "lowestRating":
      return (a, b2) => a.rating - b2.rating;
    case "mostPlayed":
      return (a, b2) => b2.playCount - a.playCount;
    case "leastPlayed":
      return (a, b2) => a.playCount - b2.playCount;
    case "mostRecentlyAdded":
      return (a, b2) => b2.dateAdded - a.dateAdded;
    case "leastRecentlyAdded":
      return (a, b2) => a.dateAdded - b2.dateAdded;
    case "mostRecentlyPlayed":
      return (a, b2) => b2.lastPlayed - a.lastPlayed;
    case "leastRecentlyPlayed":
      return (a, b2) => a.lastPlayed - b2.lastPlayed;
  }
}
function applyLimit(tracks, rules, seed) {
  const lim = rules.limit;
  if (!lim.enabled || lim.count <= 0) return tracks;
  const sorted = [...tracks].sort(selectComparator(lim.selectBy, seed));
  if (lim.unit === "items") return sorted.slice(0, lim.count);
  const out = [];
  let total = 0;
  const max = lim.unit === "minutes" ? lim.count * 60 : lim.unit === "hours" ? lim.count * 3600 : lim.unit === "MB" ? lim.count * 1e6 : lim.count * 1e9;
  for (const t of sorted) {
    const amount = lim.unit === "minutes" || lim.unit === "hours" ? t.duration : t.size;
    if (total + amount > max) continue;
    total += amount;
    out.push(t);
  }
  return out;
}
function evaluateSmart(rules, tracks, ctxBase) {
  const byPid = new Map(ctxBase.playlists.map((p) => [p.pid, p]));
  const cache = /* @__PURE__ */ new Map();
  const ctx = {
    now: ctxBase.now ?? Date.now(),
    playlists: byPid,
    depth: ctxBase.depth ?? 0,
    resolvePlaylist: (pid, depth) => {
      const hit = cache.get(pid);
      if (hit) return hit;
      const p = byPid.get(pid);
      let set2 = /* @__PURE__ */ new Set();
      if (p) {
        if (p.kind === "normal") set2 = new Set(p.trackIds);
        else if (p.rules) set2 = new Set(evaluateSmart(p.rules, tracks, { ...ctxBase, depth, seed: p.pid }).map((t) => t.id));
      }
      cache.set(pid, set2);
      return set2;
    }
  };
  if (!rules.liveUpdating && rules.snapshot) {
    const ids = new Set(rules.snapshot);
    return tracks.filter((t) => ids.has(t.id));
  }
  const active = rules.rules.filter((r) => fieldType(r.field) !== "string" || r.op === "isNot" || r.op === "is" || String(r.value) !== "");
  const matched = active.length === 0 ? tracks.slice() : tracks.filter(
    (t) => rules.match === "all" ? active.every((r) => matchRule(t, r, ctx)) : active.some((r) => matchRule(t, r, ctx))
  );
  return applyLimit(matched, rules, ctxBase.seed ?? "");
}
function resolvePlaylistTracks(p, tracks, playlists, byId) {
  if (p.kind === "smart" && p.rules) return evaluateSmart(p.rules, tracks, { playlists, seed: p.pid });
  const map = byId ?? new Map(tracks.map((t) => [t.id, t]));
  const out = [];
  for (const id of p.trackIds) {
    const t = map.get(id);
    if (t) out.push(t);
  }
  return out;
}
const MEDIA_KIND_LABELS = {
  music: "Music",
  movie: "Movie",
  tvshow: "TV Show",
  musicvideo: "Music Video",
  homevideo: "Home Video"
};
const LIBRARY_SOURCES = [
  { id: "music", label: "Music", kind: "music" },
  { id: "movies", label: "Movies", kind: "movie" },
  { id: "tvshows", label: "TV Shows", kind: "tvshow" },
  { id: "musicvideos", label: "Music Videos", kind: "musicvideo" },
  { id: "homevideos", label: "Home Videos", kind: "homevideo" }
];
function playlistOf(s) {
  return s.source.startsWith("pl:") ? s.playlists.find((p) => p.id === Number(s.source.slice(3))) : void 0;
}
function sourceRows(s) {
  const src = s.source;
  const lib = LIBRARY_SOURCES.find((x) => x.id === src);
  if (lib) return s.allTracks.filter((t) => t.mediaKind === lib.kind).map((t, i) => ({ key: t.id, pos: i + 1, t }));
  if (src.startsWith("pl:")) {
    const p = playlistOf(s);
    if (!p) return [];
    if (p.kind === "smart") return resolvePlaylistTracks(p, s.allTracks, s.playlists, s.tracks).map((t, i) => ({ key: t.id, pos: i + 1, t }));
    const rows = [];
    p.trackIds.forEach((id, i) => {
      const t = s.tracks.get(id);
      if (t) rows.push({ key: i, pos: i + 1, t });
    });
    return rows;
  }
  if (src.startsWith("dev:")) return (s.deviceTracks.get(src.slice(4)) ?? []).map((t, i) => ({ key: t.id, pos: i + 1, t }));
  return [];
}
function sourceLabel(s) {
  const lib = LIBRARY_SOURCES.find((x) => x.id === s.source);
  if (lib) return lib.label;
  if (s.source.startsWith("pl:")) return playlistOf(s)?.name ?? "Playlist";
  if (s.source.startsWith("dev:")) return s.devices.find((d) => d.id === s.source.slice(4))?.name ?? "Device";
  return "";
}
function columnSetFor(s) {
  if (s.source === "music") return "music";
  if (s.source === "movies") return "movie";
  if (s.source === "tvshows") return "tvshow";
  if (s.source === "musicvideos" || s.source === "homevideos") return "video";
  if (s.source.startsWith("pl:")) return "playlist";
  return "device";
}
function coverGroupKey(set2, t) {
  if (t.mediaKind === "tvshow") return `tv\0${t.show}\0${t.season}`;
  if (t.mediaKind !== "music") return `v\0${t.id}`;
  if (set2 === "device" && !t.album) return `d\0${t.artist}`;
  return albumKey(t);
}
const cmpStr = (a, b2) => a === b2 ? 0 : !a ? 1 : !b2 ? -1 : sortName(a).localeCompare(sortName(b2), void 0, { numeric: true });
const albumOrder = (a, b2) => cmpStr(a.album, b2.album) || (a.discNo || 1) - (b2.discNo || 1) || (a.trackNo || 999) - (b2.trackNo || 999) || cmpStr(a.title, b2.title);
const episodeOrder = (a, b2) => cmpStr(a.show, b2.show) || a.season - b2.season || a.episode - b2.episode || cmpStr(a.title, b2.title);
const ALL_COLUMNS = [
  { key: "playing", label: "", width: 22, value: () => "", special: "playing" },
  { key: "pos", label: "#", width: 40, align: "right", value: (r) => r.pos, compare: (a, b2) => a.pos - b2.pos },
  { key: "title", label: "Name", width: 260, value: (r) => r.t.title, compare: (a, b2) => cmpStr(a.t.title, b2.t.title) },
  { key: "duration", label: "Time", width: 58, align: "right", value: (r) => formatTime(r.t.duration), compare: (a, b2) => a.t.duration - b2.t.duration },
  {
    key: "artist",
    label: "Artist",
    width: 170,
    value: (r) => r.t.artist,
    compare: (a, b2) => cmpStr(a.t.albumArtist || a.t.artist, b2.t.albumArtist || b2.t.artist) || (a.t.year || 0) - (b2.t.year || 0) || albumOrder(a.t, b2.t)
  },
  { key: "albumArtist", label: "Album Artist", width: 150, value: (r) => r.t.albumArtist, compare: (a, b2) => cmpStr(a.t.albumArtist, b2.t.albumArtist) || albumOrder(a.t, b2.t) },
  { key: "album", label: "Album", width: 190, value: (r) => r.t.album, compare: (a, b2) => albumOrder(a.t, b2.t) || cmpStr(a.t.albumArtist || a.t.artist, b2.t.albumArtist || b2.t.artist) },
  { key: "genre", label: "Genre", width: 100, value: (r) => r.t.genre, compare: (a, b2) => cmpStr(a.t.genre, b2.t.genre) || cmpStr(a.t.artist, b2.t.artist) || albumOrder(a.t, b2.t) },
  { key: "rating", label: "Rating", width: 80, value: (r) => r.t.rating, compare: (a, b2) => b2.t.rating - a.t.rating, special: "rating" },
  { key: "playCount", label: "Plays", width: 50, align: "right", value: (r) => r.t.playCount || "", compare: (a, b2) => b2.t.playCount - a.t.playCount },
  { key: "year", label: "Year", width: 50, align: "right", value: (r) => r.t.year || "", compare: (a, b2) => a.t.year - b2.t.year || albumOrder(a.t, b2.t) },
  { key: "trackNo", label: "Track #", width: 64, align: "right", value: (r) => r.t.trackNo ? r.t.trackCount ? `${r.t.trackNo} of ${r.t.trackCount}` : r.t.trackNo : "", compare: (a, b2) => a.t.trackNo - b2.t.trackNo },
  { key: "discNo", label: "Disc #", width: 56, align: "right", value: (r) => r.t.discNo ? r.t.discCount ? `${r.t.discNo} of ${r.t.discCount}` : r.t.discNo : "", compare: (a, b2) => a.t.discNo - b2.t.discNo },
  { key: "composer", label: "Composer", width: 140, value: (r) => r.t.composer, compare: (a, b2) => cmpStr(a.t.composer, b2.t.composer) },
  { key: "show", label: "Show", width: 170, value: (r) => r.t.show, compare: (a, b2) => episodeOrder(a.t, b2.t) },
  { key: "season", label: "Season", width: 58, align: "right", value: (r) => r.t.season || "", compare: (a, b2) => episodeOrder(a.t, b2.t) },
  { key: "episode", label: "Episode", width: 62, align: "right", value: (r) => r.t.episode || "", compare: (a, b2) => episodeOrder(a.t, b2.t) },
  { key: "description", label: "Description", width: 260, value: (r) => r.t.description, compare: (a, b2) => cmpStr(a.t.description, b2.t.description) },
  { key: "mediaKind", label: "Media Kind", width: 90, value: (r) => MEDIA_KIND_LABELS[r.t.mediaKind], compare: (a, b2) => a.t.mediaKind.localeCompare(b2.t.mediaKind) },
  { key: "kind", label: "Kind", width: 110, value: (r) => fileKind(r.t), compare: (a, b2) => fileKind(a.t).localeCompare(fileKind(b2.t)) },
  { key: "bitrate", label: "Bit Rate", width: 76, align: "right", value: (r) => r.t.bitrate ? `${r.t.bitrate} kbps` : "", compare: (a, b2) => a.t.bitrate - b2.t.bitrate },
  { key: "sampleRate", label: "Sample Rate", width: 86, align: "right", value: (r) => r.t.sampleRate ? `${(r.t.sampleRate / 1e3).toFixed(1)} kHz` : "", compare: (a, b2) => a.t.sampleRate - b2.t.sampleRate },
  { key: "resolution", label: "Resolution", width: 86, align: "right", value: (r) => r.t.width ? `${r.t.width}×${r.t.height}` : "", compare: (a, b2) => a.t.width * a.t.height - b2.t.width * b2.t.height },
  { key: "size", label: "Size", width: 72, align: "right", value: (r) => formatSize(r.t.size), compare: (a, b2) => a.t.size - b2.t.size },
  { key: "dateAdded", label: "Date Added", width: 150, value: (r) => formatDate(r.t.dateAdded), compare: (a, b2) => b2.t.dateAdded - a.t.dateAdded },
  { key: "lastPlayed", label: "Last Played", width: 150, value: (r) => formatDate(r.t.lastPlayed), compare: (a, b2) => b2.t.lastPlayed - a.t.lastPlayed },
  { key: "skipCount", label: "Skips", width: 50, align: "right", value: (r) => r.t.skipCount || "", compare: (a, b2) => b2.t.skipCount - a.t.skipCount },
  { key: "bpm", label: "BPM", width: 50, align: "right", value: (r) => r.t.bpm || "", compare: (a, b2) => a.t.bpm - b2.t.bpm },
  { key: "comment", label: "Comments", width: 180, value: (r) => r.t.comment, compare: (a, b2) => cmpStr(a.t.comment, b2.t.comment) }
];
const COLUMN_BY_KEY = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
function fileKind(t) {
  const map = {
    mp3: "MPEG audio",
    m4a: /alac/i.test(t.codec) ? "Apple Lossless" : "AAC audio",
    flac: "FLAC audio",
    ogg: "Ogg Vorbis",
    opus: "Opus audio",
    wav: "WAV audio",
    aif: "AIFF audio",
    aiff: "AIFF audio",
    wma: "Windows Media audio",
    mp4: "MPEG-4 video",
    m4v: "MPEG-4 video",
    mkv: "Matroska video",
    webm: "WebM video",
    avi: "AVI video",
    mov: "QuickTime movie"
  };
  return map[t.container] ?? `${t.container.toUpperCase()} file`;
}
const DEFAULT_COLUMNS = {
  music: ["playing", "title", "duration", "artist", "album", "genre", "rating", "playCount"],
  playlist: ["playing", "pos", "title", "duration", "artist", "album", "genre", "rating", "playCount"],
  movie: ["playing", "title", "duration", "year", "genre", "rating", "playCount", "dateAdded"],
  tvshow: ["playing", "show", "season", "episode", "title", "duration", "description", "playCount"],
  video: ["playing", "title", "duration", "artist", "genre", "rating", "playCount"],
  device: ["playing", "title", "duration", "artist", "album", "genre", "kind", "size"]
};
const DEFAULT_SORT = {
  music: { key: "artist", dir: 1 },
  playlist: { key: "pos", dir: 1 },
  movie: { key: "title", dir: 1 },
  tvshow: { key: "show", dir: 1 },
  video: { key: "title", dir: 1 },
  device: { key: "artist", dir: 1 }
};
function columnsFor(set2, saved) {
  const s = saved[set2];
  if (s && s.length) {
    const known = new Set(s.map((c) => c.key));
    return [...s.filter((c) => COLUMN_BY_KEY.has(c.key)), ...ALL_COLUMNS.filter((c) => !known.has(c.key)).map((c) => ({ key: c.key, width: c.width, visible: false }))];
  }
  const vis = DEFAULT_COLUMNS[set2];
  return [
    ...vis.map((k) => ({ key: k, width: COLUMN_BY_KEY.get(k).width, visible: true })),
    ...ALL_COLUMNS.filter((c) => !vis.includes(c.key)).map((c) => ({ key: c.key, width: c.width, visible: false }))
  ];
}
function sortRows(rows, key, dir) {
  const col = COLUMN_BY_KEY.get(key);
  if (!col?.compare) return rows;
  const out = rows.slice();
  out.sort((a, b2) => col.compare(a, b2) * dir || a.pos - b2.pos);
  return out;
}
function searchRows(rows, q) {
  const terms = q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter((r) => {
    const t = r.t;
    const hay = `${t.title}
${t.artist}
${t.albumArtist}
${t.album}
${t.genre}
${t.composer}
${t.show}`.toLocaleLowerCase();
    return terms.every((x) => hay.includes(x));
  });
}
const artistOf = (t) => t.compilation ? "Compilations" : t.albumArtist || t.artist || "Unknown Artist";
const genreOf = (t) => t.genre || "Unknown Genre";
function browserDims(set2) {
  const genre = { label: "Genres", noun: "Genre", get: genreOf };
  if (set2 === "tvshow")
    return [genre, { label: "Shows", noun: "Show", get: (t) => t.show || "Unknown Show" }, { label: "Seasons", noun: "Season", get: (t) => t.season ? `Season ${t.season}` : "No Season" }];
  if (set2 === "movie")
    return [genre, { label: "Years", noun: "Year", get: (t) => t.year ? String(t.year) : "Unknown Year" }, { label: "Ratings", noun: "Rating", get: (t) => t.rating ? "★".repeat(t.rating / 20) : "Unrated" }];
  return [genre, { label: "Artists", noun: "Artist", get: artistOf }, { label: "Albums", noun: "Album", get: (t) => t.album || "Unknown Album" }];
}
function browserLists(rows, sel, set2) {
  const [d1, d2, d3] = browserDims(set2);
  const a = /* @__PURE__ */ new Set();
  const b2 = /* @__PURE__ */ new Set();
  const c = /* @__PURE__ */ new Set();
  for (const r of rows) {
    const v1 = d1.get(r.t);
    a.add(v1);
    if (sel.genre && v1 !== sel.genre) continue;
    const v2 = d2.get(r.t);
    b2.add(v2);
    if (sel.artist && v2 !== sel.artist) continue;
    c.add(d3.get(r.t));
  }
  const sorted = (x) => [...x].sort((p, q) => sortName(p).localeCompare(sortName(q), void 0, { numeric: true }));
  return { genres: sorted(a), artists: sorted(b2), albums: sorted(c) };
}
function applyBrowser(rows, sel, set2) {
  if (!sel.genre && !sel.artist && !sel.album) return rows;
  const [d1, d2, d3] = browserDims(set2);
  return rows.filter(
    (r) => (!sel.genre || d1.get(r.t) === sel.genre) && (!sel.artist || d2.get(r.t) === sel.artist) && (!sel.album || d3.get(r.t) === sel.album)
  );
}
function artUrl(key, size = "thumb") {
  return `discette://art/${key}${size === "full" ? "?s=full" : ""}`;
}
const b = () => window.discette;
function visibleRows() {
  const s = getState();
  let rows = sourceRows(s);
  rows = searchRows(rows, s.search);
  const set2 = columnSetFor(s);
  if (s.settings.ui.columnBrowser) rows = applyBrowser(rows, s.browser, set2);
  const sort = s.settings.ui.sort[s.source] ?? s.settings.ui.sort[set2] ?? DEFAULT_SORT[set2];
  return sortRows(rows, sort.key, sort.dir);
}
function selectedRows() {
  const sel = getState().selection;
  return visibleRows().filter((r) => sel.has(r.key));
}
function selectedTracks() {
  return selectedRows().map((r) => r.t);
}
function playRows(rows, startKey) {
  if (!rows.length) return;
  const ids = rows.map((r) => r.t.id);
  const start = startKey == null ? 0 : Math.max(0, rows.findIndex((r) => r.key === startKey));
  void playList(ids, start, getState().source);
}
function playSelectionOrAll() {
  const rows = visibleRows();
  const sel = getState().selection;
  const first = rows.find((r) => sel.has(r.key));
  if (getPlayer().shuffle && !first) {
    playRows(rows, rows[Math.floor(Math.random() * rows.length)]?.key ?? null);
    return;
  }
  playRows(rows, first?.key ?? null);
}
function selectAll() {
  setState({ selection: new Set(visibleRows().map((r) => r.key)) });
}
async function addFiles() {
  const paths = await b().dialogs.openFiles();
  if (paths.length) void b().library.import(paths);
}
async function addFolder() {
  const paths = await b().dialogs.openFolder();
  if (paths.length) void b().library.import(paths);
}
function uniqueName(base) {
  const names = new Set(getState().playlists.map((p) => p.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
async function newPlaylist(trackIds = []) {
  const name = (() => {
    const tracks = trackIds.map((id) => getState().tracks.get(id)).filter(Boolean);
    const albums = new Set(tracks.map((t) => t.album));
    const artists = new Set(tracks.map((t) => t.albumArtist || t.artist));
    if (tracks.length && albums.size === 1 && tracks[0].album) return `${artists.size === 1 ? [...artists][0] + " - " : ""}${tracks[0].album}`;
    return "untitled playlist";
  })();
  const p = await b().playlists.create(uniqueName(name), "normal", null, trackIds.filter((x) => x > 0));
  selectSource(`pl:${p.id}`);
  setState({ renamingPlaylist: p.id });
}
function newSmartPlaylist() {
  setState({ dialog: { type: "smart" } });
}
async function createSmartPlaylist(name, rules = defaultSmartRules()) {
  const p = await b().playlists.create(uniqueName(name || "untitled playlist"), "smart", rules, []);
  selectSource(`pl:${p.id}`);
}
async function addToPlaylist(playlistId, ids, at) {
  const p = getState().playlists.find((x) => x.id === playlistId);
  if (!p || p.kind !== "normal") return;
  const add = ids.filter((x) => x > 0);
  if (!add.length) return;
  const list = p.trackIds.slice();
  list.splice(at ?? list.length, 0, ...add);
  await b().playlists.setTracks(p.id, list);
}
async function reorderPlaylist(positions, to) {
  const p = playlistOf(getState());
  if (!p || p.kind !== "normal") return;
  const posSet = new Set(positions);
  const moving = p.trackIds.filter((_, i) => posSet.has(i));
  const rest = [];
  let insertAt = 0;
  p.trackIds.forEach((id, i) => {
    if (posSet.has(i)) return;
    if (i < to) insertAt++;
    rest.push(id);
  });
  rest.splice(insertAt, 0, ...moving);
  await b().playlists.setTracks(p.id, rest);
  setState({ selection: new Set(moving.map((_, k) => insertAt + k)) });
}
async function deleteSelection() {
  const s = getState();
  const rows = selectedRows();
  if (!rows.length) return;
  const pl = playlistOf(s);
  if (pl) {
    if (pl.kind === "smart") return;
    const positions = new Set(rows.map((r3) => r3.key));
    const r2 = await b().dialogs.message({ type: "question", message: `Are you sure you want to remove the selected ${rows.length === 1 ? "item" : "items"} from the list?`, buttons: ["Remove", "Cancel"], defaultId: 0, cancelId: 1 });
    if (r2.response !== 0) return;
    await b().playlists.setTracks(pl.id, pl.trackIds.filter((_, i) => !positions.has(i)));
    setState({ selection: /* @__PURE__ */ new Set() });
    return;
  }
  if (s.source.startsWith("dev:")) {
    const deviceId = s.source.slice(4);
    const r2 = await b().dialogs.message({ type: "warning", message: `Delete ${plural(rows.length, "item")} from “${s.devices.find((d) => d.id === deviceId)?.name}”?`, detail: "The files will be permanently removed from the device.", buttons: ["Delete", "Cancel"], defaultId: 1, cancelId: 1 });
    if (r2.response !== 0) return;
    const errors = await b().devices.deleteTracks(deviceId, rows.map((r3) => r3.t.id));
    if (errors.length) showMessage("Some items could not be deleted.", errors.join("\n"));
    setState({ selection: /* @__PURE__ */ new Set() });
    return;
  }
  const r = await b().dialogs.message({
    type: "warning",
    message: `Are you sure you want to delete the selected ${rows.length === 1 ? "item" : plural(rows.length, "item")} from your Discette library?`,
    detail: "Choose whether to keep the files in your Discette Media folder or move them to the Trash.",
    buttons: ["Move to Trash", "Keep Files", "Cancel"],
    defaultId: 1,
    cancelId: 2
  });
  if (r.response === 2) return;
  const ids = rows.map((x) => x.t.id);
  if (getPlayer().current && ids.includes(getPlayer().current.id)) stop();
  await b().library.remove(ids, r.response === 0);
  setState({ selection: /* @__PURE__ */ new Set() });
}
function getInfo() {
  const rows = selectedRows();
  if (!rows.length) return;
  setState({ dialog: { type: "info", ids: rows.map((r) => r.t.id), list: rows.length === 1 ? visibleRows().map((r) => r.t.id) : void 0 } });
}
function setView(mode) {
  const s = getState();
  updateUi({ viewMode: { ...s.settings.ui.viewMode, [s.source]: mode } });
}
function goToCurrent() {
  const cur = getPlayer().current;
  if (!cur) return;
  const s = getState();
  if (getPlayer().sourceKey && getPlayer().sourceKey !== s.source) selectSource(getPlayer().sourceKey);
  setTimeout(() => {
    const row = visibleRows().find((r) => r.t.id === cur.id);
    if (row) setState({ selection: /* @__PURE__ */ new Set([row.key]), anchor: row.key, scrollRequest: { key: row.key, n: Date.now() } });
  }, 30);
}
async function exportPlaylist() {
  const p = playlistOf(getState());
  if (p) await b().playlists.exportM3U(p.id);
  else showMessage("Select a playlist to export.");
}
async function renamePlaylist(id, name) {
  if (name.trim()) await b().playlists.update(id, { name: name.trim() });
  setState({ renamingPlaylist: null });
}
async function deletePlaylist(id) {
  const p = getState().playlists.find((x) => x.id === id);
  if (!p) return;
  const r = await b().dialogs.message({ type: "question", message: `Are you sure you want to delete the playlist “${p.name}”?`, buttons: ["Delete", "Cancel"], defaultId: 0, cancelId: 1 });
  if (r.response !== 0) return;
  if (getState().source === `pl:${id}`) selectSource("music");
  await b().playlists.delete(id);
}
async function duplicatePlaylist(id) {
  const p = getState().playlists.find((x) => x.id === id);
  if (!p) return;
  await b().playlists.create(uniqueName(p.name + " copy"), p.kind, p.rules, p.trackIds);
}
async function ejectDevice(id) {
  const err = await b().devices.eject(id);
  if (err) showMessage("The device could not be ejected.", err);
}
async function syncNow(deviceId) {
  const err = await b().devices.sync(deviceId);
  if (err && !/complete/i.test(err)) showMessage("Sync problem", err);
}
async function rowContextMenu() {
  const s = getState();
  const rows = selectedRows();
  if (!rows.length) return;
  const onDevice = s.source.startsWith("dev:");
  const pl = playlistOf(s);
  const ids = rows.map((r) => r.t.id);
  const items = [
    { id: "play", label: "Play" },
    { id: "playNext", label: "Play Next" },
    { id: "upNext", label: "Add to Up Next" },
    { type: "separator" }
  ];
  if (onDevice) {
    items.push({ id: "import", label: rows.length > 1 ? `Import ${rows.length} Items to Library` : "Import to Library" });
    items.push({ id: "info", label: "Get Info" });
    items.push({ id: "reveal", label: "Show in File Manager" });
    items.push({ type: "separator" }, { id: "delete", label: "Delete from Device…" });
  } else {
    items.push({ id: "info", label: "Get Info" });
    items.push({
      label: "Rating",
      submenu: [0, 1, 2, 3, 4, 5].map((n) => ({
        id: `rate:${n * 20}`,
        label: n === 0 ? "None" : "★".repeat(n),
        type: "checkbox",
        checked: rows.every((r) => r.t.rating === n * 20)
      }))
    });
    items.push({
      label: "Add to Playlist",
      submenu: [
        { id: "newpl", label: "New Playlist from Selection" },
        ...s.playlists.some((p) => p.kind === "normal") ? [{ type: "separator" }] : [],
        ...s.playlists.filter((p) => p.kind === "normal").map((p) => ({ id: `addpl:${p.id}`, label: p.name }))
      ]
    });
    const devs = s.devices.filter((d) => d.mountPath);
    if (devs.length) items.push({ label: "Copy to Device", submenu: devs.map((d) => ({ id: `copyto:${d.id}`, label: d.name })) });
    items.push({ type: "separator" });
    items.push({ id: "reveal", label: "Show in File Manager" });
    items.push({ id: "art", label: "Get Album Artwork" });
    items.push({ id: "refresh", label: "Re-read Tags from File" });
    items.push({ type: "separator" });
    if (pl && pl.kind === "normal") items.push({ id: "remove", label: "Remove from Playlist" });
    else if (!pl) items.push({ id: "delete", label: "Delete from Library…" });
  }
  const choice = await b().contextMenu(items);
  if (!choice) return;
  if (choice === "play") playRows(visibleRows(), rows[0].key);
  else if (choice === "playNext") playNext(ids);
  else if (choice === "upNext") addToUpNext(ids);
  else if (choice === "info") getInfo();
  else if (choice === "reveal") void b().library.showInFolder(ids[0]);
  else if (choice === "import") {
    const r = await b().devices.importTracks(ids);
    showMessage(`Imported ${plural(r.added, "item")} from the device.`);
  } else if (choice === "delete" || choice === "remove") void deleteSelection();
  else if (choice.startsWith("rate:")) void b().library.rate(ids, Number(choice.slice(5)));
  else if (choice === "newpl") void newPlaylist(ids);
  else if (choice.startsWith("addpl:")) void addToPlaylist(Number(choice.slice(6)), ids);
  else if (choice.startsWith("copyto:")) {
    const err = await b().devices.copyTo(choice.slice(7), ids);
    if (err) showMessage("Some items could not be copied.", err);
  } else if (choice === "art") {
    const n = await b().library.fetchArt(ids, true);
    showMessage(n ? `Found artwork for ${plural(n, "album")}.` : "No artwork was found for the selected items.");
  } else if (choice === "refresh") void b().library.refresh(ids);
}
async function handleMenuCommand(c) {
  if (typeof c === "string" && c.startsWith("paladin-play:")) {
    const ids = c.slice(13).split(",").map(Number).filter(Boolean);
    // the library may still be catching up with the import: wait for the tracks to arrive
    for (let i = 0; i < 50 && ids.some((id) => !trackFor(id)); i++) await new Promise((res) => setTimeout(res, 100));
    const ok = ids.filter((id) => trackFor(id));
    if (ok.length) await playList(ok, 0, null);
    return;
  }
  const s = getState();
  const inInput = (() => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
  })();
  switch (c) {
    case "new-playlist":
      return newPlaylist();
    case "new-playlist-from-selection":
      return newPlaylist(selectedTracks().map((t) => t.id));
    case "new-smart-playlist":
      return newSmartPlaylist();
    case "add-files":
      return addFiles();
    case "add-folder":
      return addFolder();
    case "import-playlist":
      return b().playlists.importM3U();
    case "export-playlist":
      return exportPlaylist();
    case "get-info":
      return getInfo();
    case "show-in-folder": {
      const t = selectedTracks()[0] ?? getPlayer().current;
      if (t) void b().library.showInFolder(t.id);
      return;
    }
    case "fetch-art-all": {
      const n = await b().library.fetchArt(null, false);
      showMessage(n ? `Found artwork for ${plural(n, "album")}.` : "No new album artwork was found.", "Album artwork is looked up on MusicBrainz and the Cover Art Archive.");
      return;
    }
    case "refresh-selection":
      return b().library.refresh(selectedTracks().filter((t) => t.id > 0).map((t) => t.id));
    case "preferences":
      return setState({ dialog: { type: "prefs" } });
    case "select-all":
      if (!inInput) selectAll();
      return;
    case "select-none":
      return setState({ selection: /* @__PURE__ */ new Set() });
    case "find": {
      const el = document.getElementById("search-field");
      el?.focus();
      el?.select();
      return;
    }
    case "view-list":
      return setView("list");
    case "view-coverflow":
      return setView("coverflow");
    case "toggle-column-browser":
      return updateUi({ columnBrowser: !s.settings.ui.columnBrowser });
    case "view-options":
      return setState({ dialog: { type: "viewOptions" } });
    case "go-current":
      return goToCurrent();
    case "play-pause":
      return togglePlay();
    case "next":
      return next();
    case "prev":
      return prev();
    case "vol-up":
      return setVolume(getPlayer().volume + 0.1);
    case "vol-down":
      return setVolume(getPlayer().volume - 0.1);
    case "shuffle":
      return toggleShuffle();
    case "repeat":
      return cycleRepeat();
  }
}
const svg = (d, vb = "0 0 24 24") => function Icon({ size = 16, className, style }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { width: size, height: size, viewBox: vb, className, style, fill: "currentColor", "aria-hidden": true, children: d });
};
const IconPlay = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M7 4.5v15l13-7.5z" }));
const IconPause = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6 4h4.5v16H6zM13.5 4H18v16h-4.5z" }));
const IconPrev = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M4 5h2.5v14H4zM20 5v14l-6.5-7zM13 5v14l-6.5-7z" }));
const IconNext = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M17.5 5H20v14h-2.5zM4 5v14l6.5-7zM11 5v14l6.5-7z" }));
const IconVolLow = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 9h4l5-4v14l-5-4H3z" }));
const IconVolHigh = svg(
  /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 9h4l5-4v14l-5-4H3z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M15 8.5a5 5 0 0 1 0 7M17.5 6a8.5 8.5 0 0 1 0 12", stroke: "currentColor", strokeWidth: "1.8", fill: "none", strokeLinecap: "round" })
  ] })
);
const IconList = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 5h18v2H3zM3 11h18v2H3zM3 17h18v2H3z" }));
const IconCoverFlow = svg(
  /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 5h6v12H9z" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 7l4 -1v10l-4-1zM21 7l-4-1v10l4-1z", opacity: ".7" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 19h18v1.5H3z", opacity: ".5" })
  ] })
);
const IconSearch = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" }));
const IconNote = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h7V3z" }));
const IconFilm = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 4h18v16H3zm2 2v2h2V6zm12 0v2h2V6zM5 10v4h2v-4zm12 0v4h2v-4zM5 16v2h2v-2zm12 0v2h2v-2zM9 6v12h6V6z" }));
const IconTv = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M2 5h20v13H2zm2 2v9h16V7zm4 13h8v1.5H8z" }));
const IconMusicVideo = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 4h18v16H3zm2 2v12h14V6zm5 2.5 6 3.5-6 3.5z" }));
const IconCamera = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 7h12v10H3zm13 3.5L21 7v10l-5-3.5z" }));
const IconPlaylist = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 5h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm14-6v8.3a2.5 2.5 0 1 0 2 2.45V9h3V7z" }));
const IconGear = svg(
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM10.6 2h2.8l.5 2.6 1.9.8 2.2-1.5 2 2-1.5 2.2.8 1.9 2.6.5v2.8l-2.6.5-.8 1.9 1.5 2.2-2 2-2.2-1.5-1.9.8-.5 2.6h-2.8l-.5-2.6-1.9-.8-2.2 1.5-2-2 1.5-2.2-.8-1.9L2 13.4v-2.8l2.6-.5.8-1.9-1.5-2.2 2-2 2.2 1.5 1.9-.8z", fillRule: "evenodd" })
);
const IconUsb = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M7 2h10v7h1.5v11a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9H7zm2 2v5h6V4zm1 1h1.5v2H10zm2.5 0H14v2h-1.5z" }));
const IconPhone = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M7 1.5h10a2 2 0 0 1 2 2v17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-17a2 2 0 0 1 2-2zM7 4v14h10V4zm4 15.5v1.5h2v-1.5z" }));
const IconEject = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 4l8 9H4zM4 16h16v3H4z" }));
const IconShuffle = svg(
  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M17 3l4 3.5-4 3.5V7.5h-1.7c-1.3 0-2.2.6-3 1.8L8.6 15c-1.2 1.8-2.6 2.8-4.6 2.8H3v-2.2h1c1.2 0 1.9-.5 2.8-1.8l3.7-5.7C11.6 6.4 13 5.3 15.3 5.3H17zm0 11v2.4h-1.7c-1 0-1.7-.4-2.3-1.2l-1.2-1.8-1.3 2 .7 1c1 1.4 2.3 2.2 4.1 2.2H17V21l4-3.5zM3 6.4h1c2 0 3.4 1 4.6 2.7l.6.9-1.3 2-.9-1.5C6 9.2 5.2 8.6 4 8.6H3z" })
);
const IconRepeat = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M7 7h10V4l4 4-4 4V9H7v3.5H5V9a2 2 0 0 1 2-2zm10 10H7v3l-4-4 4-4v3h10v-3.5h2V15a2 2 0 0 1-2 2z" }));
const IconPlus = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" }));
const IconStar = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 2.8l2.8 6 6.5.6-4.9 4.4 1.4 6.4L12 17l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.6z" }));
const IconClose = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z" }));
const IconFullscreen = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 3h7v2H5v5H3zm11 0h7v7h-2V5h-5zM3 14h2v5h5v2H3zm16 0h2v7h-7v-2h5z" }));
const IconSubtitles = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M2 5h20v14H2zm2 2v10h16V7zm2 5h5v2H6zm7 0h5v2h-5zM6 9h12v1.5H6z" }));
const IconSpeaker = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 9h4l5-4v14l-5-4H3zM15 8.5a5 5 0 0 1 0 7", stroke: "currentColor", strokeWidth: "0" }));
const IconSync = svg(/* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 4a8 8 0 0 1 7.4 5H22l-3.5 4-3.5-4h2.2A6 6 0 0 0 6.6 9L5 7.8A8 8 0 0 1 12 4zM4.6 15H2l3.5-4 3.5 4H6.8a6 6 0 0 0 10.6 0l1.6 1.2A8 8 0 0 1 4.6 15z" }));
function MediaKindIcon({ kind, size = 16 }) {
  switch (kind) {
    case "movie":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(IconFilm, { size });
    case "tvshow":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(IconTv, { size });
    case "musicvideo":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(IconMusicVideo, { size });
    case "homevideo":
      return /* @__PURE__ */ jsxRuntimeExports.jsx(IconCamera, { size });
    default:
      return /* @__PURE__ */ jsxRuntimeExports.jsx(IconNote, { size });
  }
}
const logo = "" + new URL("icon-Ba9zvrRQ.png", import.meta.url).href;
function Lcd() {
  const activity = useStore((s) => s.activity);
  const devices = useStore((s) => s.devices);
  const cur = usePlayer((s) => s.current);
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  const loading = usePlayer((s) => s.loading);
  const [remaining, setRemaining] = reactExports.useState(true);
  const [drag, setDrag] = reactExports.useState(null);
  const bar = reactExports.useRef(null);
  const imp = activity.importing;
  const sync = activity.sync;
  if (imp.active) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-line1", children: [
        imp.label,
        " “",
        imp.current || "…",
        "”"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-line2", children: [
        imp.done.toLocaleString(),
        " of ",
        imp.total.toLocaleString()
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-progress", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: `${imp.total ? imp.done / imp.total * 100 : 0}%` } }) })
    ] });
  }
  if (sync?.active) {
    const dev = devices.find((d) => d.id === sync.deviceId);
    const verb = { planning: "Preparing", copying: "Copying", converting: "Converting", removing: "Removing", playlists: "Updating playlists", done: "Done", error: "Error", cancelled: "Cancelled" }[sync.phase];
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "lcd-cancel", title: "Cancel sync", onClick: () => void window.discette.devices.cancelSync(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, { size: 10 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-line1", children: [
        "Syncing “",
        dev?.name ?? "device",
        "”…"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-line2", children: [
        verb,
        sync.current ? ` “${sync.current}”` : "",
        sync.total ? ` (${sync.done + 1} of ${sync.total})` : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-progress", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: `${sync.total ? sync.done / sync.total * 100 : 0}%` } }) })
    ] });
  }
  if (!cur) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd idle", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logo, className: "lcd-logo", alt: "Discette" }),
      activity.artFetch.active && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-mini", children: [
        "Getting album artwork… ",
        activity.artFetch.done,
        " of ",
        activity.artFetch.total
      ] })
    ] });
  }
  const shown = drag ?? time;
  const pct = duration ? Math.min(100, shown / duration * 100) : 0;
  const posFromEvent = (clientX) => {
    const r = bar.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * duration;
  };
  const startSeek = (e) => {
    if (!duration) return;
    setDrag(posFromEvent(e.clientX));
    let last = posFromEvent(e.clientX);
    const move = (ev) => {
      last = posFromEvent(ev.clientX);
      setDrag(last);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      void seek(last);
      setDrag(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const isVideo = cur.mediaKind !== "music";
  const showCurrent = () => isVideo ? setVideoVisible(true) : goToCurrent();
  const line2 = cur.mediaKind === "tvshow" ? `${cur.show}${cur.season ? ` · Season ${cur.season}` : ""}${cur.episode ? `, Episode ${cur.episode}` : ""}` : [cur.artist, cur.album].filter(Boolean).join(" — ");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd playing", children: [
    cur.artKey ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { className: "lcd-art", src: artUrl(cur.artKey), alt: "", onClick: showCurrent, title: isVideo ? "Show video" : "Go to current song" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-art blank", onClick: showCurrent }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-text", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-line1", onDoubleClick: goToCurrent, title: cur.title, children: cur.title }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-line2", title: line2, children: line2 || " " }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-scrub", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "lcd-time", children: formatTime(shown) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lcd-bar", ref: bar, onMouseDown: startSeek, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-bar-fill", style: { width: `${pct}%` } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lcd-bar-knob", style: { left: `${pct}%` } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "lcd-time right", onClick: () => setRemaining(!remaining), children: loading ? "…" : remaining ? "-" + formatTime(Math.max(0, duration - shown)) : formatTime(duration) })
      ] })
    ] })
  ] });
}
function TopBar() {
  const playing = usePlayer((s) => s.playing);
  const volume = usePlayer((s) => s.volume);
  const search = useStore((s) => s.search);
  useStore((s) => s.source);
  const mode = useStore((s) => s.settings.ui.viewMode[s.source] ?? "list");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "topbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transport", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tb-btn round small", title: "Previous", onClick: () => void prev(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconPrev, { size: 15 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tb-btn round big", title: "Play/Pause (Space)", onClick: () => togglePlay(), children: playing ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconPause, { size: 20 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconPlay, { size: 20 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "tb-btn round small", title: "Next", onClick: () => void next(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconNext, { size: 15 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "volume", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconVolLow, { size: 12 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "range",
            min: 0,
            max: 1,
            step: 0.01,
            value: volume,
            onChange: (e) => setVolume(Number(e.target.value)),
            style: { ["--pct"]: `${volume * 100}%` }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconVolHigh, { size: 14 })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Lcd, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tb-right", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "segmented", title: "View", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: mode === "list" ? "on" : "", onClick: () => setView("list"), title: "List (Ctrl+1)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconList, { size: 14 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: mode === "coverflow" ? "on" : "", onClick: () => setView("coverflow"), title: "Carousel (Ctrl+2)", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconCoverFlow, { size: 16 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "search", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconSearch, { size: 12 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            id: "search-field",
            type: "search",
            placeholder: "Search",
            value: search,
            onChange: (e) => setState({ search: e.target.value, selection: /* @__PURE__ */ new Set() }),
            onKeyDown: (e) => {
              if (e.key === "Escape") setState({ search: "" });
              if (e.key === "Enter" || e.key === "ArrowDown") document.querySelector(".tracklist")?.focus();
            }
          }
        ),
        search && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "search-clear", onClick: () => setState({ search: "" }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, { size: 9 }) })
      ] })
    ] })
  ] });
}
const ROW_H = 20;
const DRAG_MIME = "application/x-discette-tracks";
function Stars({ value, ids }) {
  const [hover, setHover] = reactExports.useState(null);
  const shown = hover ?? value;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "stars", onMouseLeave: () => setHover(null), onClick: (e) => e.stopPropagation(), onDoubleClick: (e) => e.stopPropagation(), children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "span",
    {
      className: n * 20 <= shown ? "star on" : "star",
      onMouseEnter: () => setHover(n * 20),
      onMouseDown: (e) => {
        e.stopPropagation();
        const v = value === n * 20 ? 0 : n * 20;
        if (ids[0] > 0) void window.discette.library.rate(ids, v);
      },
      children: n * 20 <= shown ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconStar, { size: 11 }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dot", children: "·" })
    },
    n
  )) });
}
const RowView = reactExports.memo(function RowView2(props) {
  const { row, index, cols, selected, playing } = props;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `tl-row${index % 2 ? " odd" : ""}${selected ? " sel" : ""}${playing ? " playing" : ""}`,
      style: { top: index * ROW_H },
      onMouseDown: (e) => props.onMouseDown(e, row),
      onClick: (e) => props.onClick(e, row),
      onDoubleClick: () => props.onDouble(row),
      onContextMenu: (e) => props.onContext(e, row),
      draggable: true,
      onDragStart: (e) => props.onDragStart(e, row),
      children: cols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `tl-cell${c.align ? " " + c.align : ""} c-${c.key}`, style: { width: c.width }, children: c.special === "playing" ? playing ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconSpeaker, { size: 12, className: props.paused ? "paused" : "" }) : null : c.special === "rating" ? row.t.id > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(Stars, { value: row.t.rating, ids: selected ? props.selectedIds() : [row.t.id] }) : null : c.value(row) }, c.key))
    }
  );
});
function TrackList(p) {
  const scroller = reactExports.useRef(null);
  const [range, setRange] = reactExports.useState({ top: 0, height: 600 });
  const selection = useStore((s) => s.selection);
  const anchor = useStore((s) => s.anchor);
  const scrollRequest = useStore((s) => s.scrollRequest);
  const current = usePlayer((s) => s.current);
  const playingState = usePlayer((s) => s.playing);
  const [dropIndex, setDropIndex] = reactExports.useState(null);
  const typeBuf = reactExports.useRef({ text: "", at: 0 });
  const pendingClick = reactExports.useRef(null);
  const [cols, setCols] = reactExports.useState(p.columns);
  reactExports.useEffect(() => setCols(p.columns), [p.columns]);
  const visibleCols = cols.filter((c) => c.visible && COLUMN_BY_KEY.has(c.key)).map((c) => ({ ...COLUMN_BY_KEY.get(c.key), width: c.width }));
  const totalWidth = visibleCols.reduce((a, c) => a + c.width, 0) + 8;
  reactExports.useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setRange({ top: el.scrollTop, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!scrollRequest) return;
    const i = p.rows.findIndex((r) => r.key === scrollRequest.key);
    const el = scroller.current;
    if (i < 0 || !el) return;
    const y = i * ROW_H;
    const header = ROW_H + 2;
    if (y < el.scrollTop || y + ROW_H > el.scrollTop + el.clientHeight - header) el.scrollTop = Math.max(0, y - el.clientHeight / 3);
  }, [scrollRequest, p.rows]);
  const first = Math.max(0, Math.floor(range.top / ROW_H) - 10);
  const last = Math.min(p.rows.length, Math.ceil((range.top + range.height) / ROW_H) + 10);
  const keyIndex = (key) => key == null ? -1 : p.rows.findIndex((r) => r.key === key);
  function selectRange(toKey) {
    const a = keyIndex(anchor);
    const b2 = keyIndex(toKey);
    if (a < 0 || b2 < 0) return setState({ selection: /* @__PURE__ */ new Set([toKey]), anchor: toKey });
    const [lo, hi] = a < b2 ? [a, b2] : [b2, a];
    setState({ selection: new Set(p.rows.slice(lo, hi + 1).map((r) => r.key)) });
  }
  const onMouseDown = (e, row) => {
    if (e.button === 2) {
      if (!selection.has(row.key)) setState({ selection: /* @__PURE__ */ new Set([row.key]), anchor: row.key });
      return;
    }
    if (e.shiftKey) return selectRange(row.key);
    if (e.ctrlKey || e.metaKey) {
      const s = new Set(selection);
      if (s.has(row.key)) s.delete(row.key);
      else s.add(row.key);
      return setState({ selection: s, anchor: row.key });
    }
    if (selection.has(row.key)) {
      pendingClick.current = row.key;
      return;
    }
    setState({ selection: /* @__PURE__ */ new Set([row.key]), anchor: row.key });
  };
  const onClick = (_e, row) => {
    if (pendingClick.current === row.key) setState({ selection: /* @__PURE__ */ new Set([row.key]), anchor: row.key });
    pendingClick.current = null;
  };
  const onDouble = (row) => playRows(p.rows, row.key);
  const onContext = (e) => {
    e.preventDefault();
    setTimeout(() => void rowContextMenu(), 0);
  };
  const selectedIds = () => p.rows.filter((r) => getState().selection.has(r.key)).map((r) => r.t.id);
  const onDragStart = (e, row) => {
    pendingClick.current = null;
    const sel = getState().selection.has(row.key) ? getState().selection : /* @__PURE__ */ new Set([row.key]);
    if (!getState().selection.has(row.key)) setState({ selection: sel, anchor: row.key });
    const rows = p.rows.filter((r) => sel.has(r.key));
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ ids: rows.map((r) => r.t.id), keys: rows.map((r) => r.key), source: getState().source }));
    e.dataTransfer.effectAllowed = "copyMove";
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.textContent = rows.length === 1 ? rows[0].t.title : `${rows.length} items`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 10, 10);
    setTimeout(() => ghost.remove(), 0);
  };
  const canDrop = p.playlistId != null && p.sort.key === "pos";
  const indexFromEvent = (e) => {
    const el = scroller.current;
    const y = e.clientY - el.getBoundingClientRect().top + el.scrollTop - (ROW_H + 2);
    return Math.max(0, Math.min(p.rows.length, Math.round(y / ROW_H)));
  };
  const onDragOver = (e) => {
    if (!canDrop || !e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    setDropIndex(indexFromEvent(e));
  };
  const onDrop = (e) => {
    setDropIndex(null);
    if (!canDrop || !e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    const data = JSON.parse(e.dataTransfer.getData(DRAG_MIME));
    const at = indexFromEvent(e);
    const pos = p.rows[at]?.key ?? (p.rows.length ? p.rows[p.rows.length - 1].key + 1 : 0);
    if (data.source === getState().source) void reorderPlaylist(data.keys, pos);
    else void addToPlaylist(p.playlistId, data.ids, pos);
  };
  const onKeyDown = (e) => {
    const rows = p.rows;
    if (!rows.length) return;
    const cur = keyIndex(anchor);
    const page = Math.max(1, Math.floor((scroller.current?.clientHeight ?? 400) / ROW_H) - 2);
    let to = -1;
    if (e.key === "ArrowDown") to = Math.min(rows.length - 1, cur + 1);
    else if (e.key === "ArrowUp") to = Math.max(0, cur < 0 ? 0 : cur - 1);
    else if (e.key === "PageDown") to = Math.min(rows.length - 1, cur + page);
    else if (e.key === "PageUp") to = Math.max(0, cur - page);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = rows.length - 1;
    else if (e.key === "Enter") {
      const first2 = rows.find((r) => selection.has(r.key));
      if (first2) playRows(rows, first2.key);
      e.preventDefault();
      return;
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== " ") {
      const now = Date.now();
      typeBuf.current.text = now - typeBuf.current.at > 900 ? e.key.toLowerCase() : typeBuf.current.text + e.key.toLowerCase();
      typeBuf.current.at = now;
      const col = COLUMN_BY_KEY.get(p.sort.key) ?? COLUMN_BY_KEY.get("title");
      const q = typeBuf.current.text;
      const hit = rows.find((r) => String(col.value(r)).toLowerCase().replace(/^the /, "").startsWith(q));
      if (hit) setState({ selection: /* @__PURE__ */ new Set([hit.key]), anchor: hit.key, scrollRequest: { key: hit.key, n: now } });
      return;
    }
    if (to < 0) return;
    e.preventDefault();
    const key = rows[to].key;
    if (e.shiftKey && anchor != null) {
      const a = cur;
      const [lo, hi] = a < to ? [a, to] : [to, a];
      setState({ selection: new Set(rows.slice(lo, hi + 1).map((r) => r.key)), scrollRequest: { key, n: Date.now() } });
    } else setState({ selection: /* @__PURE__ */ new Set([key]), anchor: key, scrollRequest: { key, n: Date.now() } });
  };
  const onSort = (key) => {
    const col = COLUMN_BY_KEY.get(key);
    if (!col?.compare) return;
    const dir = p.sort.key === key ? p.sort.dir === 1 ? -1 : 1 : 1;
    updateUi({ sort: { ...getState().settings.ui.sort, [p.sortStoreKey]: { key, dir } } });
  };
  const saveCols = (next2) => updateUi({ columns: { ...getState().settings.ui.columns, [p.columnSetKey]: next2 } });
  const startResize = (e, key) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = cols.find((c) => c.key === key).width;
    let latest = cols;
    const move = (ev) => {
      const w = Math.max(24, startW + ev.clientX - startX);
      latest = cols.map((c) => c.key === key ? { ...c, width: w } : c);
      setCols(latest);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      saveCols(latest);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const onHeaderContext = async (e) => {
    e.preventDefault();
    const choice = await window.discette.contextMenu([
      ...cols.filter((c) => c.key !== "playing").map((c) => ({ id: c.key, label: COLUMN_BY_KEY.get(c.key)?.label || c.key, type: "checkbox", checked: c.visible }))
    ]);
    if (choice) saveCols(cols.map((c) => c.key === choice ? { ...c, visible: !c.visible } : c));
  };
  const dragCol = reactExports.useRef(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "tracklist",
      ref: scroller,
      tabIndex: 0,
      onScroll: (e) => setRange({ top: e.currentTarget.scrollTop, height: e.currentTarget.clientHeight }),
      onKeyDown,
      onDragOver,
      onDragLeave: () => setDropIndex(null),
      onDrop,
      onMouseDown: (e) => {
        if (e.target === e.currentTarget || e.target.classList.contains("tl-body")) setState({ selection: /* @__PURE__ */ new Set() });
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tl-header", style: { width: Math.max(totalWidth, 100) }, onContextMenu: onHeaderContext, children: [
          visibleCols.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: `tl-hcell${c.align ? " " + c.align : ""}${p.sort.key === c.key ? " sorted" : ""}`,
              style: { width: c.width },
              onClick: () => onSort(c.key),
              draggable: c.key !== "playing",
              onDragStart: (e) => {
                dragCol.current = c.key;
                e.dataTransfer.setData("text/x-col", c.key);
              },
              onDragOver: (e) => dragCol.current && e.preventDefault(),
              onDrop: (e) => {
                const from = dragCol.current;
                dragCol.current = null;
                if (!from || from === c.key) return;
                e.preventDefault();
                e.stopPropagation();
                const next2 = cols.filter((x) => x.key !== from);
                const idx = next2.findIndex((x) => x.key === c.key);
                next2.splice(idx, 0, cols.find((x) => x.key === from));
                setCols(next2);
                saveCols(next2);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tl-hlabel", children: c.label }),
                p.sort.key === c.key && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sort-arrow", children: p.sort.dir === 1 ? "▲" : "▼" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tl-resize", onMouseDown: (e) => startResize(e, c.key), onClick: (e) => e.stopPropagation() })
              ]
            },
            c.key
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tl-hcell filler" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tl-body", style: { height: Math.max(p.rows.length * ROW_H, 0), width: Math.max(totalWidth, 100) }, children: [
          p.rows.slice(first, last).map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            RowView,
            {
              row,
              index: first + i,
              cols: visibleCols,
              selected: selection.has(row.key),
              playing: !!current && current.id === row.t.id,
              paused: !playingState,
              onMouseDown,
              onClick,
              onDouble,
              onContext,
              onDragStart,
              selectedIds
            },
            row.key
          )),
          dropIndex != null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tl-drop-line", style: { top: dropIndex * ROW_H - 1 } })
        ] }),
        !p.rows.length && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tl-empty", children: p.emptyText })
      ]
    }
  );
}
function parseDrag(e) {
  try {
    return JSON.parse(e.dataTransfer.getData(DRAG_MIME));
  } catch {
    return null;
  }
}
function SidebarItem(props) {
  const source = useStore((s) => s.source);
  const [over, setOver] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `sb-item${source === props.id ? " sel" : ""}${over ? " drop" : ""}`,
      onClick: () => {
        selectSource(props.id);
        setVideoVisible(false);
      },
      onDoubleClick: props.onDoubleClick,
      onContextMenu: props.onContext,
      onDragOver: (e) => {
        if (props.acceptDrop && e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setOver(true);
        }
      },
      onDragLeave: () => setOver(false),
      onDrop: (e) => {
        setOver(false);
        if (props.onDrop) {
          e.preventDefault();
          e.stopPropagation();
          props.onDrop(e);
        }
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sb-icon", children: props.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sb-label", children: props.label }),
        props.accessory
      ]
    }
  );
}
function PlaylistItem({ p }) {
  const renaming = useStore((s) => s.renamingPlaylist === p.id);
  const [name, setName] = reactExports.useState(p.name);
  const input = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (renaming) {
      setName(p.name);
      setTimeout(() => {
        input.current?.focus();
        input.current?.select();
      }, 10);
    }
  }, [renaming, p.name]);
  const context = async (e) => {
    e.preventDefault();
    selectSource(`pl:${p.id}`);
    const c = await window.discette.contextMenu([
      { id: "play", label: "Play" },
      { type: "separator" },
      { id: "rename", label: "Rename" },
      ...p.kind === "smart" ? [{ id: "edit", label: "Edit Smart Playlist…" }] : [],
      { id: "dup", label: "Duplicate" },
      { id: "export", label: "Export…" },
      { type: "separator" },
      { id: "delete", label: "Delete" }
    ]);
    if (c === "play") playRows(visibleRows(), null);
    else if (c === "rename") setState({ renamingPlaylist: p.id });
    else if (c === "edit") setState({ dialog: { type: "smart", playlistId: p.id } });
    else if (c === "dup") void duplicatePlaylist(p.id);
    else if (c === "export") void window.discette.playlists.exportM3U(p.id);
    else if (c === "delete") void deletePlaylist(p.id);
  };
  const label = renaming ? /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      ref: input,
      className: "sb-rename",
      value: name,
      onChange: (e) => setName(e.target.value),
      onBlur: () => void renamePlaylist(p.id, name),
      onKeyDown: (e) => {
        if (e.key === "Enter") void renamePlaylist(p.id, name);
        if (e.key === "Escape") setState({ renamingPlaylist: null });
        e.stopPropagation();
      },
      onClick: (e) => e.stopPropagation()
    }
  ) : p.name;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SidebarItem,
    {
      id: `pl:${p.id}`,
      label,
      icon: p.kind === "smart" ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconGear, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconPlaylist, { size: 14 }),
      acceptDrop: p.kind === "normal",
      onDrop: (e) => {
        const d = parseDrag(e);
        if (d) void addToPlaylist(p.id, d.ids);
      },
      onContext: context,
      onDoubleClick: () => p.kind === "smart" ? setState({ dialog: { type: "smart", playlistId: p.id } }) : setState({ renamingPlaylist: p.id })
    }
  );
}
function DeviceItem({ d }) {
  const sync = useStore((s) => s.activity.sync);
  const syncing = sync?.active && sync.deviceId === d.id;
  const context = async (e) => {
    e.preventDefault();
    const c = await window.discette.contextMenu(
      d.mountPath ? [
        { id: "sync", label: "Sync" },
        { id: "settings", label: "Sync Settings…" },
        { id: "rescan", label: "Rescan Device" },
        { type: "separator" },
        { id: "eject", label: "Eject" }
      ] : [{ id: "mount", label: "Mount" }]
    );
    if (c === "sync") void syncNow(d.id);
    else if (c === "settings") setState({ dialog: { type: "sync", deviceId: d.id } });
    else if (c === "rescan") void window.discette.devices.rescan(d.id);
    else if (c === "eject") void ejectDevice(d.id);
    else if (c === "mount") void window.discette.devices.mount(d.id);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    SidebarItem,
    {
      id: `dev:${d.id}`,
      label: d.name,
      icon: d.kind === "mtp" ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconPhone, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconUsb, { size: 14 }),
      acceptDrop: !!d.mountPath,
      onDrop: async (e) => {
        const x = parseDrag(e);
        if (!x) return;
        const err = await window.discette.devices.copyTo(d.id, x.ids.filter((i) => i > 0));
        if (err) setState({ message: { title: "Some items could not be copied.", detail: err } });
      },
      onContext: context,
      accessory: syncing || d.scanning ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `sb-spin${syncing ? " sync" : ""}`, title: syncing ? "Syncing" : "Reading device", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconSync, { size: 12 }) }) : d.mountPath ? /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "sb-eject",
          title: "Eject",
          onClick: (e) => {
            e.stopPropagation();
            void ejectDevice(d.id);
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconEject, { size: 11 })
        }
      ) : null
    }
  );
}
function Sidebar() {
  const playlists = useStore((s) => s.playlists);
  const devices = useStore((s) => s.devices);
  const allTracks = useStore((s) => s.allTracks);
  const width = useStore((s) => s.settings.ui.sidebarWidth);
  const [newOver, setNewOver] = reactExports.useState(false);
  const kinds = new Set(allTracks.map((t) => t.mediaKind));
  const smart = playlists.filter((p) => p.kind === "smart");
  const normal = playlists.filter((p) => p.kind === "normal");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sidebar", style: { width }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sb-scroll", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sb-heading", children: "LIBRARY" }),
      LIBRARY_SOURCES.filter((l) => ["music", "movies", "tvshows"].includes(l.id) || kinds.has(l.kind)).map((l) => /* @__PURE__ */ jsxRuntimeExports.jsx(SidebarItem, { id: l.id, label: l.label, icon: /* @__PURE__ */ jsxRuntimeExports.jsx(MediaKindIcon, { kind: l.kind, size: 14 }) }, l.id)),
      devices.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sb-heading", children: "DEVICES" }),
      devices.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(DeviceItem, { d }, d.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sb-heading", children: "PLAYLISTS" }),
      smart.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(PlaylistItem, { p }, p.id)),
      normal.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(PlaylistItem, { p }, p.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: `sb-dropzone${newOver ? " drop" : ""}`,
          onDragOver: (e) => {
            if (e.dataTransfer.types.includes(DRAG_MIME)) {
              e.preventDefault();
              setNewOver(true);
            }
          },
          onDragLeave: () => setNewOver(false),
          onDrop: (e) => {
            setNewOver(false);
            const d = parseDrag(e);
            if (d) {
              e.preventDefault();
              void newPlaylist(d.ids);
            }
          },
          onDoubleClick: () => void newPlaylist(),
          children: newOver ? "Drop to create a new playlist" : ""
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "sb-resizer",
        onMouseDown: (e) => {
          const startX = e.clientX;
          const startW = getState().settings.ui.sidebarWidth;
          const move = (ev) => {
            const w = Math.max(150, Math.min(400, startW + ev.clientX - startX));
            setState((s) => ({ settings: { ...s.settings, ui: { ...s.settings.ui, sidebarWidth: w } } }));
          };
          const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
            void window.discette.settings.set({ ui: getState().settings.ui });
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", up);
        }
      }
    )
  ] });
}
function buildGroups(rows, set2) {
  const map = /* @__PURE__ */ new Map();
  const out = [];
  for (const r of rows) {
    const k = coverGroupKey(set2, r.t);
    let g = map.get(k);
    if (!g) {
      const t = r.t;
      const title = t.mediaKind === "tvshow" ? `${t.show || "Unknown Show"}${t.season ? `, Season ${t.season}` : ""}` : t.mediaKind !== "music" ? t.title : t.album || (set2 === "device" ? t.artist || "Unknown Artist" : "Unknown Album");
      const subtitle = t.mediaKind === "tvshow" ? "" : t.mediaKind === "movie" ? t.year ? String(t.year) : t.genre : t.compilation ? "Various Artists" : t.albumArtist || t.artist || "Unknown Artist";
      g = { key: k, title, subtitle, artKey: t.artKey, rowKeys: [], kind: t.mediaKind };
      map.set(k, g);
      out.push(g);
    }
    if (!g.artKey && r.t.artKey) g.artKey = r.t.artKey;
    g.rowKeys.push(r.key);
  }
  return out;
}
function CoverFlow({ rows, set: set2, height }) {
  const groups = reactExports.useMemo(() => buildGroups(rows, set2), [rows, set2]);
  const anchor = useStore((s) => s.anchor);
  const [index, setIndex] = reactExports.useState(0);
  const [width, setWidth] = reactExports.useState(800);
  const box = reactExports.useRef(null);
  const wheelAcc = reactExports.useRef(0);
  const userMove = reactExports.useRef(false);
  reactExports.useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (userMove.current) {
      userMove.current = false;
      return;
    }
    if (anchor == null) return;
    const gi = groups.findIndex((g2) => g2.rowKeys.includes(anchor));
    if (gi >= 0) setIndex(gi);
  }, [anchor, groups]);
  reactExports.useEffect(() => {
    if (index >= groups.length) setIndex(Math.max(0, groups.length - 1));
  }, [groups.length, index]);
  const moveTo = (i, select = true) => {
    i = Math.max(0, Math.min(groups.length - 1, i));
    setIndex(i);
    const g2 = groups[i];
    if (select && g2) {
      userMove.current = true;
      setState({ selection: new Set(g2.rowKeys), anchor: g2.rowKeys[0], scrollRequest: { key: g2.rowKeys[0], n: Date.now() } });
    }
  };
  const moveTimer = reactExports.useRef(null);
  const scheduleSelect = (i) => {
    setIndex(i);
    if (moveTimer.current) clearTimeout(moveTimer.current);
    moveTimer.current = window.setTimeout(() => moveTo(i), 180);
  };
  const onWheel = (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    wheelAcc.current += d;
    const step = 60;
    if (Math.abs(wheelAcc.current) >= step) {
      const n = Math.trunc(wheelAcc.current / step);
      wheelAcc.current -= n * step;
      scheduleSelect(Math.max(0, Math.min(groups.length - 1, index + n)));
    }
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") scheduleSelect(Math.max(0, index - 1));
    else if (e.key === "ArrowRight") scheduleSelect(Math.min(groups.length - 1, index + 1));
    else if (e.key === "Home") moveTo(0);
    else if (e.key === "End") moveTo(groups.length - 1);
    else if (e.key === "Enter") playGroup(index);
    else return;
    e.preventDefault();
  };
  const playGroup = (i) => {
    const g2 = groups[i];
    if (g2) playRows(rows, g2.rowKeys[0]);
  };
  const stageH = height - 56;
  const size = Math.max(80, Math.min(stageH * 0.7, width * 0.3, 340));
  const top = Math.max(10, (stageH - size * 1.32) / 2);
  const spread = size * 0.24;
  const gap = size * 0.62;
  const WINDOW = Math.ceil(width / 2 / spread) + 2;
  const lo = Math.max(0, index - WINDOW);
  const hi = Math.min(groups.length, index + WINDOW + 1);
  const g = groups[index];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "coverflow", ref: box, style: { height }, onWheel, onKeyDown: onKey, tabIndex: 0, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cf-stage", style: { height: stageH }, children: [
      groups.slice(lo, hi).map((grp, k) => {
        const i = lo + k;
        const d = i - index;
        const x = d === 0 ? 0 : Math.sign(d) * (gap + (Math.abs(d) - 1) * spread);
        const transform = d === 0 ? `translateX(-50%) translateZ(0px) rotateY(0deg)` : `translateX(calc(-50% + ${x}px)) translateZ(${-size * 0.55}px) rotateY(${d < 0 ? 68 : -68}deg)`;
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `cf-cover${d === 0 ? " center" : ""}`,
            style: { width: size, height: size, transform, zIndex: 1e3 - Math.abs(d), top },
            onClick: () => d === 0 ? moveTo(i) : moveTo(i),
            onDoubleClick: () => playGroup(i),
            children: grp.artKey ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: artUrl(grp.artKey), draggable: false, alt: "" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cf-placeholder", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(MediaKindIcon, { kind: grp.kind, size: size * 0.28 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: grp.title })
            ] })
          },
          grp.key
        );
      }),
      !groups.length && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cf-empty", children: "No items" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cf-caption", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cf-title", children: g?.title ?? "" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cf-subtitle", children: g?.subtitle ?? "" })
    ] }),
    groups.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        className: "cf-scroll",
        type: "range",
        min: 0,
        max: groups.length - 1,
        value: index,
        onChange: (e) => scheduleSelect(Number(e.target.value)),
        style: { ["--pct"]: `${index / Math.max(1, groups.length - 1) * 100}%` }
      }
    )
  ] });
}
function Pane({ title, items, selected, onSelect, noun }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cb-pane", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cb-head", children: title }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cb-list", tabIndex: 0, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `cb-item${selected == null ? " sel" : ""}`, onClick: () => onSelect(null), children: [
        "All (",
        items.length.toLocaleString(),
        " ",
        items.length === 1 ? noun : noun + "s",
        ")"
      ] }),
      items.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `cb-item${selected === x ? " sel" : ""}`, onClick: () => onSelect(x), children: x }, x))
    ] })
  ] });
}
function ColumnBrowser({ baseRows, height, set: colSet }) {
  const dims = browserDims(colSet);
  const sel = useStore((s) => s.browser);
  const search = useStore((s) => s.search);
  const lists = reactExports.useMemo(() => browserLists(searchRows(baseRows, search), sel, colSet), [baseRows, search, sel, colSet]);
  const set2 = (patch) => setState((s) => ({ browser: { ...s.browser, ...patch }, selection: /* @__PURE__ */ new Set() }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "column-browser", style: { height }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Pane, { title: dims[0].label, noun: dims[0].noun, items: lists.genres, selected: sel.genre, onSelect: (genre) => set2({ genre, artist: null, album: null }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Pane, { title: dims[1].label, noun: dims[1].noun, items: lists.artists, selected: sel.artist, onSelect: (artist) => set2({ artist, album: null }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Pane, { title: dims[2].label, noun: dims[2].noun, items: lists.albums, selected: sel.album, onSelect: (album) => set2({ album }) })
  ] });
}
function StatusBar({ rows, noun }) {
  const selection = useStore((s) => s.selection);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const sel = selection.size > 1 ? rows.filter((r) => selection.has(r.key)) : rows;
  const dur = sel.reduce((a, r) => a + (r.t.duration || 0), 0);
  const size = sel.reduce((a, r) => a + (r.t.size || 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "statusbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sbar-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "sbar-btn", title: "New Playlist", onClick: () => void newPlaylist(), onContextMenu: async (e) => {
        e.preventDefault();
        const c = await window.discette.contextMenu([{ id: "n", label: "New Playlist" }, { id: "s", label: "New Smart Playlist…" }]);
        if (c === "n") void newPlaylist();
        if (c === "s") newSmartPlaylist();
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconPlus, { size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `sbar-btn${shuffle ? " on" : ""}`, title: "Shuffle", onClick: toggleShuffle, children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconShuffle, { size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: `sbar-btn${repeat !== "off" ? " on" : ""}`, title: `Repeat: ${repeat}`, onClick: cycleRepeat, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(IconRepeat, { size: 14 }),
        repeat === "one" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "repeat-one", children: "1" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sbar-center", children: rows.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      selection.size > 1 && `${sel.length.toLocaleString()} of ${plural(rows.length, noun[0], noun[1])} selected, `,
      selection.size <= 1 && `${plural(rows.length, noun[0], noun[1])}, `,
      formatTotalDuration(dur),
      ", ",
      formatSize(size)
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sbar-right" })
  ] });
}
function DeviceHeader({ device }) {
  const tracks = useStore((s) => s.deviceTracks.get(device.id)) ?? [];
  const sync = useStore((s) => s.activity.sync);
  const [lastSync, setLastSync] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!device.mountPath || !device.hasProfile) return setLastSync(0);
    void window.discette.devices.getProfile(device.id).then((p) => setLastSync(p.lastSync)).catch(() => void 0);
  }, [device.id, device.mountPath, device.hasProfile, sync?.phase]);
  const audio = tracks.filter((t) => t.mediaKind === "music").reduce((a, t) => a + t.size, 0);
  const video = tracks.filter((t) => t.mediaKind !== "music").reduce((a, t) => a + t.size, 0);
  const used = Math.max(0, device.size - device.free);
  const other = Math.max(0, used - audio - video);
  const pct = (n) => device.size ? `${n / device.size * 100}%` : "0%";
  const syncing = sync?.active && sync.deviceId === device.id;
  if (!device.mountPath) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "device-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-icon", children: device.kind === "mtp" ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconPhone, { size: 40 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconUsb, { size: 40 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dh-info", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-name", children: device.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-sub", children: "This device is connected but not mounted." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void window.discette.devices.mount(device.id), children: "Mount" }) })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "device-header", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-icon", children: device.kind === "mtp" ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconPhone, { size: 40 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconUsb, { size: 40 }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dh-info", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "dh-name", children: device.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dh-sub", children: [
        device.scanning ? `Reading device… ${plural(device.scanned, "item")}` : plural(tracks.length, "item"),
        " · ",
        formatSize(device.free),
        " free of ",
        formatSize(device.size),
        lastSync ? ` · Last synced ${new Date(lastSync).toLocaleString()}` : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "capacity", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cap-seg audio", style: { width: pct(audio) } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cap-seg video", style: { width: pct(video) } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cap-seg other", style: { width: pct(other) } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cap-legend", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "audio" }),
          "Audio ",
          formatSize(audio)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "video" }),
          "Video ",
          formatSize(video)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "other" }),
          "Other ",
          formatSize(other)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "free" }),
          "Free ",
          formatSize(device.free)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dh-actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => setState({ dialog: { type: "sync", deviceId: device.id } }), children: "Sync Settings…" }),
      syncing ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void window.discette.devices.cancelSync(), children: "Cancel Sync" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", disabled: !!sync?.active, onClick: () => void syncNow(device.id), children: "Sync" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void ejectDevice(device.id), children: "Eject" })
    ] })
  ] });
}
function VideoView() {
  const host = reactExports.useRef(null);
  const wrap = reactExports.useRef(null);
  const cur = usePlayer((s) => s.current);
  const playing = usePlayer((s) => s.playing);
  const time = usePlayer((s) => s.time);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const loading = usePlayer((s) => s.loading);
  const info = usePlayer((s) => s.info);
  const subtitle = usePlayer((s) => s.subtitle);
  const [idle, setIdle] = reactExports.useState(false);
  const idleTimer = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.appendChild(media);
    return () => {
      if (media.parentElement === el) document.getElementById("media-park")?.appendChild(media);
    };
  }, []);
  const poke = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2500);
  };
  reactExports.useEffect(() => {
    poke();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrap.current?.requestFullscreen();
  };
  const pct = duration ? time / duration * 100 : 0;
  const title = cur ? cur.mediaKind === "tvshow" ? `${cur.show} — ${cur.title}` : cur.title : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `video-view${idle && playing ? " idle" : ""}`,
      ref: wrap,
      onMouseMove: poke,
      onDoubleClick: toggleFs,
      onKeyDown: (e) => {
        if (e.key === "Escape" && !document.fullscreenElement) setVideoVisible(false);
      },
      tabIndex: 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "video-host", ref: host, onClick: () => togglePlay() }),
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "video-spinner" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "video-top", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "video-title", children: title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "vbtn", title: "Back to library", onClick: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            setVideoVisible(false);
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconClose, { size: 14 }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "video-controls", onDoubleClick: (e) => e.stopPropagation(), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "vbtn", onClick: () => void prev(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconPrev, { size: 16 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "vbtn big", onClick: () => togglePlay(), children: playing ? /* @__PURE__ */ jsxRuntimeExports.jsx(IconPause, { size: 22 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(IconPlay, { size: 22 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "vbtn", onClick: () => void next(), children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconNext, { size: 16 }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "vtime", children: formatTime(time) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "vscrub",
              type: "range",
              min: 0,
              max: Math.max(1, duration),
              step: 0.5,
              value: Math.min(time, duration || 0),
              onChange: (e) => void seek(Number(e.target.value)),
              style: { ["--pct"]: `${pct}%` }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "vtime", children: [
            "-",
            formatTime(Math.max(0, duration - time))
          ] }),
          info && info.subtitles.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `vbtn${subtitle >= 0 ? " on" : ""}`,
              title: "Subtitles",
              onClick: async () => {
                const c = await window.discette.contextMenu([
                  { id: "-1", label: "Off", type: "checkbox", checked: subtitle < 0 },
                  ...info.subtitles.map((s, i) => ({ id: String(i), label: s.label, type: "checkbox", checked: subtitle === i }))
                ]);
                if (c != null) setSubtitle(Number(c));
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconSubtitles, { size: 16 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(IconVolHigh, { size: 14 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "vvol",
              type: "range",
              min: 0,
              max: 1,
              step: 0.01,
              value: volume,
              onChange: (e) => setVolume(Number(e.target.value)),
              style: { ["--pct"]: `${volume * 100}%` }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "vbtn", title: "Full Screen", onClick: toggleFs, children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconFullscreen, { size: 15 }) })
        ] })
      ]
    }
  );
}
function Modal(props) {
  reactExports.useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        props.onClose();
      }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [props]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", onMouseDown: (e) => e.target === e.currentTarget && props.onClose(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `modal ${props.className ?? ""}`, style: { width: props.width ?? 520 }, role: "dialog", "aria-label": props.title, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: props.title }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-body", children: props.children }),
    props.footer && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-footer", children: props.footer })
  ] }) });
}
function Tabs({ tabs, value, onChange }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", children: tabs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: t === value ? "on" : "", onClick: () => onChange(t), children: t }, t)) });
}
const TEXT_FIELDS = [
  { key: "title", label: "Name", wide: true },
  { key: "artist", label: "Artist", wide: true },
  { key: "albumArtist", label: "Album Artist", wide: true },
  { key: "album", label: "Album", wide: true },
  { key: "composer", label: "Composer", wide: true },
  { key: "genre", label: "Genre" },
  { key: "year", label: "Year", num: true },
  { key: "trackNo", label: "Track", num: true },
  { key: "trackCount", label: "of", num: true },
  { key: "discNo", label: "Disc", num: true },
  { key: "discCount", label: "of", num: true },
  { key: "bpm", label: "BPM", num: true },
  { key: "comment", label: "Comments", wide: true }
];
const VIDEO_FIELDS = [
  { key: "show", label: "Show", wide: true },
  { key: "season", label: "Season", num: true },
  { key: "episode", label: "Episode", num: true },
  { key: "description", label: "Description", wide: true }
];
const ALL_KEYS = [...TEXT_FIELDS, ...VIDEO_FIELDS].map((f) => f.key).concat(["rating", "compilation", "mediaKind"]);
function common(tracks, key) {
  const v = tracks[0][key];
  return tracks.every((t) => t[key] === v) ? v : null;
}
function GetInfo({ ids, list, initialTab }) {
  const libVersion = useStore((s) => s.libVersion);
  const [currentIds, setCurrentIds] = reactExports.useState(ids);
  const tracks = reactExports.useMemo(() => currentIds.map((id) => trackFor(id)).filter(Boolean), [currentIds, libVersion]);
  const multi = tracks.length > 1;
  const readOnly = tracks.some((t) => t.id < 0);
  const isVideo = tracks.every((t) => t.mediaKind !== "music");
  const tabs = multi ? ["Info", "Video", "Options", "Artwork"] : ["Summary", "Info", "Video", "Options", "Artwork"];
  const [tab, setTab] = reactExports.useState(initialTab ?? (multi ? "Info" : "Summary"));
  const [values, setValues] = reactExports.useState({});
  const [dirty, setDirty] = reactExports.useState(/* @__PURE__ */ new Set());
  const [art, setArt] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (!tracks.length) return;
    const v = {};
    for (const k of ALL_KEYS) v[k] = common(tracks, k);
    setValues(v);
    setDirty(/* @__PURE__ */ new Set());
    setArt(null);
  }, [currentIds.join(",")]);
  if (!tracks.length) return null;
  const t0 = tracks[0];
  const close = () => setState({ dialog: null });
  const set2 = (k, v) => {
    setValues((x) => ({ ...x, [k]: v }));
    setDirty((d) => new Set(d).add(k));
  };
  const save = async () => {
    if (readOnly) return true;
    const patch = {};
    for (const k of dirty) {
      const v = values[k];
      const numeric = ["year", "trackNo", "trackCount", "discNo", "discCount", "bpm", "season", "episode", "rating"].includes(k);
      patch[k] = numeric ? parseInt(String(v ?? "0"), 10) || 0 : k === "compilation" ? !!v : v ?? "";
    }
    if (!Object.keys(patch).length && !art) return true;
    setBusy(true);
    const errors = await window.discette.library.updateInfo({ ids: tracks.map((t) => t.id), patch, artwork: art ?? void 0 });
    setBusy(false);
    if (errors.length) showMessage("Some changes could not be written to the files.", errors.join("\n"));
    return true;
  };
  const go = async (delta) => {
    if (!list || multi) return;
    await save();
    const i = list.indexOf(currentIds[0]) + delta;
    if (i >= 0 && i < list.length) setCurrentIds([list[i]]);
  };
  const readImage = (file) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      setArt({ action: "set", data: s.slice(s.indexOf(",") + 1) });
    };
    r.readAsDataURL(file);
  };
  const field = (f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: `gi-field${f.wide ? " wide" : ""}${f.num ? " num" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: f.label }),
    f.key === "description" || f.key === "comment" ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        value: values[f.key] == null ? "" : String(values[f.key]),
        placeholder: multi && values[f.key] == null ? "Mixed" : "",
        disabled: readOnly,
        onChange: (e) => set2(f.key, e.target.value),
        rows: f.key === "description" ? 4 : 2
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        value: values[f.key] == null || f.num && values[f.key] === 0 ? "" : String(values[f.key]),
        placeholder: multi && values[f.key] == null ? "Mixed" : "",
        disabled: readOnly,
        inputMode: f.num ? "numeric" : void 0,
        onChange: (e) => set2(f.key, f.num ? e.target.value.replace(/[^0-9]/g, "") : e.target.value),
        list: f.key === "genre" ? "genre-list" : void 0
      }
    )
  ] }, f.key + f.label);
  const shownArt = art?.action === "set" ? `data:image/jpeg;base64,${art.data}` : art?.action === "remove" ? "" : common(tracks, "artKey") ? artUrl(t0.artKey, "full") : "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Modal,
    {
      title: multi ? `${tracks.length} items` : t0.title,
      onClose: close,
      width: 560,
      className: "getinfo",
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        !multi && list && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "footer-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void go(-1), disabled: list.indexOf(currentIds[0]) <= 0, children: "Previous" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void go(1), disabled: list.indexOf(currentIds[0]) >= list.length - 1, children: "Next" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", disabled: busy, onClick: async () => {
          if (await save()) close();
        }, children: "OK" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { tabs, value: tab, onChange: setTab }),
        readOnly && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-note", children: "This item is on a device. Import it to your library to edit its information." }),
        tab === "Summary" && !multi && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-summary", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-art", children: t0.artKey ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: artUrl(t0.artKey), alt: "" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-art-blank" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-sum-text", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-sum-title", children: t0.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: t0.mediaKind === "tvshow" ? t0.show : t0.artist }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: t0.album }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-sum-time", children: formatTime(t0.duration) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("table", { className: "gi-table", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Kind" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                MEDIA_KIND_LABELS[t0.mediaKind],
                " · ",
                t0.container.toUpperCase(),
                " ",
                t0.codec ? `(${t0.codec})` : ""
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Size" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatSize(t0.size) })
            ] }),
            t0.bitrate > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Bit Rate" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                t0.bitrate,
                " kbps"
              ] })
            ] }),
            t0.sampleRate > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Sample Rate" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                (t0.sampleRate / 1e3).toFixed(1),
                " kHz"
              ] })
            ] }),
            t0.width > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Video" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                t0.width,
                "×",
                t0.height,
                " ",
                t0.videoCodec
              ] })
            ] }),
            t0.transcode > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Playback" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t0.transcode === 1 ? "Converted to FLAC for playback" : t0.transcode === 2 ? "Audio converted while playing" : "Converted while playing" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Date Added" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatDate(t0.dateAdded) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Plays" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                t0.playCount,
                t0.lastPlayed ? ` (last ${formatDate(t0.lastPlayed)})` : ""
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Where" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "gi-path", children: t0.path })
            ] })
          ] }) })
        ] }),
        tab === "Info" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-grid", children: [
          TEXT_FIELDS.map(field),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "gi-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", disabled: readOnly, checked: !!values.compilation, onChange: (e) => set2("compilation", e.target.checked) }),
            "Album is a compilation of songs by various artists"
          ] })
        ] }),
        tab === "Video" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-grid", children: [
          !isVideo && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-note", children: "These fields are used for TV shows and movies." }),
          VIDEO_FIELDS.map(field)
        ] }),
        tab === "Options" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-grid", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "gi-field wide", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Media Kind" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { disabled: readOnly, value: values.mediaKind == null ? "" : String(values.mediaKind), onChange: (e) => set2("mediaKind", e.target.value), children: [
              values.mediaKind == null && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Mixed" }),
              Object.keys(MEDIA_KIND_LABELS).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: MEDIA_KIND_LABELS[k] }, k))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-field wide", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Rating" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "gi-stars", children: [1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: Number(values.rating ?? 0) >= n * 20 ? "star on" : "star",
                onClick: () => !readOnly && set2("rating", Number(values.rating) === n * 20 ? 0 : n * 20),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconStar, { size: 16 })
              },
              n
            )) })
          ] })
        ] }),
        tab === "Artwork" && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "gi-artwork",
            onDragOver: (e) => e.preventDefault(),
            onDrop: (e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f && /image\/(jpeg|png)/.test(f.type) && !readOnly) readImage(f);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "gi-artwork-well", children: shownArt ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: shownArt, alt: "" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Drag artwork here" }) }),
              !readOnly && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "gi-artwork-buttons", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: async () => {
                  const data = await window.discette.dialogs.chooseImage();
                  if (data) setArt({ action: "set", data });
                }, children: "Add…" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => setArt({ action: "remove" }), children: "Remove" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: async () => {
                  setBusy(true);
                  const n = await window.discette.library.fetchArt(tracks.map((t) => t.id), true);
                  setBusy(false);
                  if (!n) showMessage("No artwork was found online for this album.");
                }, children: "Find Online" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "genre-list", children: ["Alternative", "Blues", "Classical", "Country", "Dance", "Electronic", "Folk", "Hip-Hop/Rap", "Jazz", "Latin", "Metal", "Pop", "R&B/Soul", "Reggae", "Rock", "Singer/Songwriter", "Soundtrack", "World"].map((g) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: g }, g)) })
      ]
    }
  );
}
const SELECT_LABELS = {
  random: "random",
  title: "name",
  album: "album",
  artist: "artist",
  genre: "genre",
  highestRating: "highest rating",
  lowestRating: "lowest rating",
  mostPlayed: "most often played",
  leastPlayed: "least often played",
  mostRecentlyAdded: "most recently added",
  leastRecentlyAdded: "least recently added",
  mostRecentlyPlayed: "most recently played",
  leastRecentlyPlayed: "least recently played"
};
function RuleRow({ rule, onChange, onRemove, onAdd, canRemove }) {
  const playlists = useStore((s) => s.playlists);
  const type = fieldType(rule.field);
  const ops = OPS_BY_TYPE[type];
  const changeField = (field) => {
    const t = fieldType(field);
    const op = OPS_BY_TYPE[t][0].op;
    const value = t === "kind" ? "music" : t === "playlist" ? playlists[0]?.pid ?? "" : t === "number" || t === "date" ? field === "rating" ? 60 : 1 : "";
    onChange({ field, op, value, unit: t === "date" ? "weeks" : void 0 });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rule-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: rule.field, onChange: (e) => changeField(e.target.value), children: ALL_FIELDS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: f.key, children: f.label }, f.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: rule.op, onChange: (e) => onChange({ ...rule, op: e.target.value }), children: ops.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.op, children: o.label }, o.op)) }),
    type === "string" && /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: String(rule.value), onChange: (e) => onChange({ ...rule, value: e.target.value }) }),
    type === "number" && rule.field === "rating" && /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: String(rule.value), onChange: (e) => onChange({ ...rule, value: Number(e.target.value) }), children: [0, 1, 2, 3, 4, 5].map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: n * 20, children: n ? "★".repeat(n) : "none" }, n)) }),
    type === "number" && rule.field !== "rating" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "short", type: "number", value: Number(rule.value), onChange: (e) => onChange({ ...rule, value: Number(e.target.value) }) }),
      rule.op === "inRange" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "to" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "short", type: "number", value: Number(rule.value2 ?? rule.value), onChange: (e) => onChange({ ...rule, value2: Number(e.target.value) }) })
      ] })
    ] }),
    type === "date" && (rule.op === "inLast" || rule.op === "notInLast") && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "short", type: "number", min: 1, value: Number(rule.value), onChange: (e) => onChange({ ...rule, value: Number(e.target.value) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: rule.unit ?? "days", onChange: (e) => onChange({ ...rule, unit: e.target.value }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "days", children: "days" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "weeks", children: "weeks" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "months", children: "months" })
      ] })
    ] }),
    type === "date" && (rule.op === "before" || rule.op === "after") && /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: String(rule.value).slice(0, 10), onChange: (e) => onChange({ ...rule, value: e.target.value }) }),
    type === "kind" && /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: String(rule.value), onChange: (e) => onChange({ ...rule, value: e.target.value }), children: Object.entries(MEDIA_KIND_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k)) }),
    type === "playlist" && /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: String(rule.value), onChange: (e) => onChange({ ...rule, value: e.target.value }), children: playlists.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.pid, children: p.name }, p.pid)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rule-spacer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn icon", disabled: !canRemove, onClick: onRemove, title: "Remove rule", children: "−" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn icon", onClick: onAdd, title: "Add rule", children: /* @__PURE__ */ jsxRuntimeExports.jsx(IconPlus, { size: 11 }) })
  ] });
}
function SmartEditor({ playlistId }) {
  const existing = useStore((s2) => s2.playlists.find((p) => p.id === playlistId));
  const [name, setName] = reactExports.useState(existing?.name ?? "");
  const [rules, setRules] = reactExports.useState(existing?.rules ?? defaultSmartRules());
  const close = () => setState({ dialog: null });
  const s = getState();
  const preview = evaluateSmart({ ...rules, liveUpdating: true }, s.allTracks, { playlists: s.playlists.filter((p) => p.id !== playlistId), seed: existing?.pid });
  const updateRule = (i, r) => setRules({ ...rules, rules: rules.rules.map((x, k) => k === i ? r : x) });
  const ok = async () => {
    const final = { ...rules, snapshot: rules.liveUpdating ? void 0 : preview.map((t) => t.id) };
    if (existing) await window.discette.playlists.update(existing.id, { rules: final, name: name.trim() || existing.name });
    else await createSmartPlaylist(name.trim() || suggestName(rules), final);
    close();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Modal,
    {
      title: "Smart Playlist",
      onClose: close,
      width: 700,
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "footer-left muted", children: [
          preview.length.toLocaleString(),
          " matching items"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", onClick: () => void ok(), children: "OK" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "smart", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "smart-name", children: [
          "Name ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: name, placeholder: suggestName(rules), onChange: (e) => setName(e.target.value), autoFocus: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "smart-match", children: [
          "Match",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: rules.match, onChange: (e) => setRules({ ...rules, match: e.target.value }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "all" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "any", children: "any" })
          ] }),
          "of the following rules:"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rules", children: rules.rules.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          RuleRow,
          {
            rule: r,
            canRemove: rules.rules.length > 1,
            onChange: (nr) => updateRule(i, nr),
            onRemove: () => setRules({ ...rules, rules: rules.rules.filter((_, k) => k !== i) }),
            onAdd: () => setRules({ ...rules, rules: [...rules.rules.slice(0, i + 1), defaultRule(), ...rules.rules.slice(i + 1)] })
          },
          i
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "smart-limit", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: rules.limit.enabled, onChange: (e) => setRules({ ...rules, limit: { ...rules.limit, enabled: e.target.checked } }) }),
            "Limit to"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "short", type: "number", min: 1, value: rules.limit.count, onChange: (e) => setRules({ ...rules, limit: { ...rules.limit, count: Number(e.target.value) } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: rules.limit.unit, onChange: (e) => setRules({ ...rules, limit: { ...rules.limit, unit: e.target.value } }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "items", children: "items" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "minutes", children: "minutes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "hours", children: "hours" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "MB", children: "MB" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "GB", children: "GB" })
          ] }),
          "selected by",
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: rules.limit.selectBy, onChange: (e) => setRules({ ...rules, limit: { ...rules.limit, selectBy: e.target.value } }), children: Object.entries(SELECT_LABELS).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v }, k)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "smart-live", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: rules.liveUpdating, onChange: (e) => setRules({ ...rules, liveUpdating: e.target.checked }) }),
          "Live updating"
        ] })
      ] })
    }
  );
}
function suggestName(r) {
  const first = r.rules[0];
  if (first && fieldType(first.field) === "string" && first.value) return String(first.value);
  return "untitled playlist";
}
function Preferences() {
  const settings = useStore((s) => s.settings);
  const [tab, setTab] = reactExports.useState("General");
  const [draft, setDraft] = reactExports.useState(settings);
  const close = () => setState({ dialog: null });
  const save = async () => {
    const { ui: _ui, ...rest } = draft;
    await window.discette.settings.set(rest);
    close();
  };
  const pick = async (key) => {
    const [p] = await window.discette.dialogs.openFolder("Choose Folder");
    if (p) setDraft({ ...draft, [key]: p });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Modal,
    {
      title: "Preferences",
      onClose: close,
      width: 580,
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", onClick: () => void save(), children: "OK" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { tabs: ["General", "Playback", "Devices"], value: tab, onChange: setTab }),
        tab === "General" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prefs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-label", children: "Discette Media folder location" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-path", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("code", { children: [
                draft.libraryPath,
                "/Discette Media"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void pick("libraryPath"), children: "Change…" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Changing the location affects newly imported items. Existing files stay where they are." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: draft.keepOrganized, onChange: (e) => setDraft({ ...draft, keepOrganized: e.target.checked }) }),
            "Keep Discette Media folder organized",
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Places files into artist and album folders, and names files by disc number, track number and title." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: draft.copyOnImport, onChange: (e) => setDraft({ ...draft, copyOnImport: e.target.checked }) }),
            "Copy files to Discette Media folder when adding to library"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: draft.fetchArtOnline, onChange: (e) => setDraft({ ...draft, fetchArtOnline: e.target.checked }) }),
            "Automatically download missing album artwork",
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Artwork is looked up on MusicBrainz and the Cover Art Archive." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: draft.watchAutoAdd, onChange: (e) => setDraft({ ...draft, watchAutoAdd: e.target.checked }) }),
              "Watch the “Automatically Add to Discette” folder"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-path", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: draft.autoAddFolder }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void pick("autoAddFolder"), children: "Change…" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Media files put in this folder are moved into your library." })
          ] })
        ] }),
        tab === "Playback" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "prefs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-label", children: "Format conversion cache" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-row", children: [
            "Keep up to",
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "short", type: "number", min: 100, step: 100, value: draft.transcodeCacheMB, onChange: (e) => setDraft({ ...draft, transcodeCacheMB: Number(e.target.value) }) }),
            "MB of converted audio"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Apple Lossless, WMA, AIFF and APE files are converted once with FFmpeg so they can be played and seeked instantly. Videos Chromium can't play natively (AVI, WMV, HEVC, AC-3 audio…) are converted while they play." })
        ] }) }),
        tab === "Devices" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "prefs", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-label", children: "Default conversion for new devices" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-row", children: [
            "Convert higher bit rate songs to",
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: draft.sync.bitrate, onChange: (e) => setDraft({ ...draft, sync: { ...draft.sync, bitrate: Number(e.target.value) } }), children: [128, 192, 256, 320].map((b2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: b2, children: [
              b2,
              " kbps"
            ] }, b2)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: draft.sync.format, onChange: (e) => setDraft({ ...draft, sync: { ...draft.sync, format: e.target.value } }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aac", children: "AAC" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mp3", children: "MP3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "opus", children: "Opus" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "USB drives and phones are detected automatically. Android phones must be unlocked and set to “File transfer” mode." })
        ] }) })
      ]
    }
  );
}
function ViewOptions({ columnSetKey, columns, onSave }) {
  const [vis, setVis] = reactExports.useState(new Set(columns.filter((c) => c.visible).map((c) => c.key)));
  const close = () => setState({ dialog: null });
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Modal,
    {
      title: `View Options — ${columnSetKey}`,
      onClose: close,
      width: 460,
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", onClick: () => {
          onSave(vis);
          close();
        }, children: "OK" })
      ] }),
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "view-options", children: columns.filter((c) => c.key !== "playing").map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check inline", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: vis.has(c.key),
            onChange: (e) => {
              const n = new Set(vis);
              if (e.target.checked) n.add(c.key);
              else n.delete(c.key);
              setVis(n);
            }
          }
        ),
        c.label
      ] }, c.key)) })
    }
  );
}
function MessageBox() {
  const msg = useStore((s) => s.message);
  if (!msg) return null;
  const close = () => setState({ message: null });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Modal, { title: "Discette", onClose: close, width: 440, footer: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", autoFocus: true, onClick: close, children: "OK" }), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "msg-title", children: msg.title }),
    msg.detail && /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "msg-detail", children: msg.detail })
  ] });
}
function CheckList({ items, checked, onToggle, filter }) {
  const set2 = new Set(checked);
  const f = filter.toLowerCase();
  const shown = f ? items.filter((i) => i.label.toLowerCase().includes(f) || i.sub?.toLowerCase().includes(f)) : items;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "checklist", children: [
    shown.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "check-item", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: set2.has(i.id), onChange: (e) => onToggle(i.id, e.target.checked) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: i.label }),
      i.sub && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
        " — ",
        i.sub
      ] })
    ] }, i.id)),
    !shown.length && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted pad", children: "Nothing to show" })
  ] });
}
function SyncSettings({ deviceId }) {
  const device = useStore((s) => s.devices.find((d) => d.id === deviceId));
  const tracks = useStore((s) => s.allTracks);
  const playlists = useStore((s) => s.playlists);
  const [p, setP] = reactExports.useState(null);
  const [tab, setTab] = reactExports.useState("Summary");
  const [filter, setFilter] = reactExports.useState("");
  const close = () => setState({ dialog: null });
  reactExports.useEffect(() => {
    void window.discette.devices.getProfile(deviceId).then(setP).catch((e) => {
      showMessage("Sync settings are not available.", String(e));
      close();
    });
  }, [deviceId]);
  const lists = reactExports.useMemo(() => {
    const music = tracks.filter((t) => t.mediaKind === "music");
    const artists = [...new Set(music.map((t) => t.albumArtist || t.artist).filter(Boolean))].sort((a, b2) => sortName(a).localeCompare(sortName(b2)));
    const genres = [...new Set(music.map((t) => t.genre).filter(Boolean))].sort();
    const albumsMap = /* @__PURE__ */ new Map();
    for (const t of music) {
      const k = albumKey(t);
      if (!albumsMap.has(k)) albumsMap.set(k, { id: k, label: t.album || "Unknown Album", sub: k.split("\0")[0] });
    }
    const albums = [...albumsMap.values()].sort((a, b2) => sortName(a.label).localeCompare(sortName(b2.label)));
    const movies = tracks.filter((t) => t.mediaKind === "movie").sort((a, b2) => sortName(a.title).localeCompare(sortName(b2.title)));
    const shows = [...new Set(tracks.filter((t) => t.mediaKind === "tvshow").map((t) => t.show || "Unknown Show"))].sort();
    return { artists, genres, albums, movies, shows };
  }, [tracks]);
  if (!p || !device) return null;
  const toggle = (arr, id, on) => on ? [.../* @__PURE__ */ new Set([...arr, id])] : arr.filter((x) => x !== id);
  const apply = async (andSync) => {
    await window.discette.devices.setProfile(deviceId, p);
    close();
    if (andSync) {
      const err = await window.discette.devices.sync(deviceId);
      if (err) showMessage("Sync problem", err);
    }
  };
  const syncedCount = Object.keys(p.synced).filter((k) => !k.startsWith("playlist:")).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Modal,
    {
      title: `Sync Settings — ${device.name}`,
      onClose: close,
      width: 640,
      className: "sync-settings",
      footer: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void apply(false), children: "Apply" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", onClick: () => void apply(true), children: "Sync" })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Tabs, { tabs: ["Summary", "Music", "Movies", "TV Shows"], value: tab, onChange: (t) => {
          setTab(t);
          setFilter("");
        } }),
        tab === "Summary" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prefs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Capacity:" }),
            " ",
            formatSize(device.size),
            " · ",
            formatSize(device.free),
            " free"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Synced items:" }),
            " ",
            syncedCount.toLocaleString(),
            p.lastSync ? ` · last sync ${new Date(p.lastSync).toLocaleString()}` : ""
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.autoSync, onChange: (e) => setP({ ...p, autoSync: e.target.checked }) }),
            "Automatically sync when this device is connected"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.convert.enabled, onChange: (e) => setP({ ...p, convert: { ...p.convert, enabled: e.target.checked } }) }),
            "Convert higher bit rate songs to",
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: p.convert.bitrate, onChange: (e) => setP({ ...p, convert: { ...p.convert, bitrate: Number(e.target.value) } }), children: [128, 192, 256, 320].map((b2) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: b2, children: [
              b2,
              " kbps"
            ] }, b2)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: p.convert.format, onChange: (e) => setP({ ...p, convert: { ...p.convert, format: e.target.value } }), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aac", children: "AAC" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mp3", children: "MP3" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "opus", children: "Opus" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Lossless files (FLAC, ALAC, WAV, AIFF) and songs above this bit rate are converted on the way to the device. Your library files are untouched." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.writePlaylists, onChange: (e) => setP({ ...p, writePlaylists: e.target.checked }) }),
            "Copy playlists to the device as .m3u8 files"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pref-row folders", children: [
            "Music folder ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: p.musicFolder, onChange: (e) => setP({ ...p, musicFolder: e.target.value.replace(/[\\:*?"<>|]/g, "") || "Music" }) }),
            "Video folder ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: p.videoFolder, onChange: (e) => setP({ ...p, videoFolder: e.target.value.replace(/[\\:*?"<>|]/g, "") || "Videos" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pref-hint", children: "Discette only removes files it put on the device itself. Other files are never touched." })
        ] }),
        tab === "Music" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prefs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.music.enabled, onChange: (e) => setP({ ...p, music: { ...p.music, enabled: e.target.checked } }) }),
            "Sync Music"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `radio-group${p.music.enabled ? "" : " disabled"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.music.mode === "all", onChange: () => setP({ ...p, music: { ...p.music, mode: "all" } }) }),
              " Entire music library"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.music.mode === "selected", onChange: () => setP({ ...p, music: { ...p.music, mode: "selected" } }) }),
              " Selected playlists, artists, albums and genres"
            ] })
          ] }),
          p.music.enabled && p.music.mode === "selected" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "filter", placeholder: "Filter", value: filter, onChange: (e) => setFilter(e.target.value) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sync-grid", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sync-head", children: "Playlists" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: playlists.map((x) => ({ id: x.pid, label: x.name })), checked: p.music.playlists, onToggle: (id, on) => setP({ ...p, music: { ...p.music, playlists: toggle(p.music.playlists, id, on) } }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sync-head", children: "Artists" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: lists.artists.map((x) => ({ id: x, label: x })), checked: p.music.artists, onToggle: (id, on) => setP({ ...p, music: { ...p.music, artists: toggle(p.music.artists, id, on) } }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sync-head", children: "Genres" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: lists.genres.map((x) => ({ id: x, label: x })), checked: p.music.genres, onToggle: (id, on) => setP({ ...p, music: { ...p.music, genres: toggle(p.music.genres, id, on) } }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sync-head", children: "Albums" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: lists.albums, checked: p.music.albums, onToggle: (id, on) => setP({ ...p, music: { ...p.music, albums: toggle(p.music.albums, id, on) } }) })
              ] })
            ] })
          ] })
        ] }),
        tab === "Movies" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prefs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.movies.enabled, onChange: (e) => setP({ ...p, movies: { ...p.movies, enabled: e.target.checked } }) }),
            "Sync Movies"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `radio-group${p.movies.enabled ? "" : " disabled"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.movies.mode === "all", onChange: () => setP({ ...p, movies: { ...p.movies, mode: "all" } }) }),
              " All movies"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.movies.mode === "selected", onChange: () => setP({ ...p, movies: { ...p.movies, mode: "selected" } }) }),
              " Selected movies"
            ] })
          ] }),
          p.movies.enabled && p.movies.mode === "selected" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "filter", placeholder: "Filter", value: filter, onChange: (e) => setFilter(e.target.value) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: lists.movies.map((m) => ({ id: m.pid, label: m.title, sub: `${m.year || ""} ${formatSize(m.size)}`.trim() })), checked: p.movies.pids, onToggle: (id, on) => setP({ ...p, movies: { ...p.movies, pids: toggle(p.movies.pids, id, on) } }) })
          ] })
        ] }),
        tab === "TV Shows" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "prefs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "pref-check", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: p.tvShows.enabled, onChange: (e) => setP({ ...p, tvShows: { ...p.tvShows, enabled: e.target.checked } }) }),
            "Sync TV Shows"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `radio-group${p.tvShows.enabled ? "" : " disabled"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.tvShows.mode === "all", onChange: () => setP({ ...p, tvShows: { ...p.tvShows, mode: "all" } }) }),
              " All shows"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", checked: p.tvShows.mode === "selected", onChange: () => setP({ ...p, tvShows: { ...p.tvShows, mode: "selected" } }) }),
              " Selected shows"
            ] })
          ] }),
          p.tvShows.enabled && p.tvShows.mode === "selected" && /* @__PURE__ */ jsxRuntimeExports.jsx(CheckList, { filter, items: lists.shows.map((s) => ({ id: s, label: s })), checked: p.tvShows.shows, onToggle: (id, on) => setP({ ...p, tvShows: { ...p.tvShows, shows: toggle(p.tvShows.shows, id, on) } }) })
        ] })
      ]
    }
  );
}
const NOUNS = {
  music: ["song", "songs"],
  movie: ["movie", "movies"],
  tvshow: ["episode", "episodes"],
  video: ["video", "videos"],
  playlist: ["item", "items"],
  device: ["item", "items"]
};
function useMainRows() {
  const s = useStore((x) => x);
  const set2 = columnSetFor(s);
  const base = reactExports.useMemo(() => sourceRows(s), [s.source, s.libVersion, s.devVersion, s.playlists]);
  const sort = s.settings.ui.sort[s.source] ?? s.settings.ui.sort[set2] ?? DEFAULT_SORT[set2];
  const rows = reactExports.useMemo(() => {
    let r = searchRows(base, s.search);
    if (s.settings.ui.columnBrowser) r = applyBrowser(r, s.browser, set2);
    return sortRows(r, sort.key, sort.dir);
  }, [base, s.search, s.browser, s.settings.ui.columnBrowser, sort.key, sort.dir, set2]);
  return { base, rows, set: set2, sort };
}
function Welcome() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "welcome", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logo, alt: "" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Welcome to Discette" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Add your music, movies and TV shows to get started. Files are copied into your Discette Media folder and organized automatically." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "welcome-buttons", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn default", onClick: () => void addFolder(), children: "Add Folder…" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void addFiles(), children: "Add Files…" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "You can also drag files and folders onto this window." })
  ] });
}
function MainView() {
  const { base, rows, set: set2, sort } = useMainRows();
  const source = useStore((s) => s.source);
  const mode = useStore((s) => s.settings.ui.viewMode[s.source] ?? "list");
  const columnBrowser = useStore((s) => s.settings.ui.columnBrowser);
  const cfHeight = useStore((s) => s.settings.ui.coverflowHeight);
  const savedCols = useStore((s) => s.settings.ui.columns);
  const device = useStore((s) => s.source.startsWith("dev:") ? s.devices.find((d) => d.id === s.source.slice(4)) : void 0);
  const pl = useStore((s) => playlistOf(s));
  const libEmpty = useStore((s) => s.allTracks.length === 0);
  const dialog = useStore((s) => s.dialog);
  const columns = reactExports.useMemo(() => columnsFor(set2, savedCols), [set2, savedCols]);
  const [cbHeight, setCbHeight] = reactExports.useState(150);
  const contentRef = reactExports.useRef(null);
  const startSplit = (e, kind) => {
    e.preventDefault();
    const startY = e.clientY;
    const start = kind === "cf" ? cfHeight : cbHeight;
    const max = (contentRef.current?.clientHeight ?? 600) - 120;
    const move = (ev) => {
      const h = Math.max(kind === "cf" ? 160 : 80, Math.min(max, start + ev.clientY - startY));
      if (kind === "cf") setState((s) => ({ settings: { ...s.settings, ui: { ...s.settings.ui, coverflowHeight: h } } }));
      else setCbHeight(h);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (kind === "cf") updateUi({ coverflowHeight: getState().settings.ui.coverflowHeight });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const showWelcome = libEmpty && (source === "music" || source === "movies" || source === "tvshows");
  const emptyText = source.startsWith("pl:") ? pl?.kind === "smart" ? "No items match the rules of this smart playlist." : "Drag songs or videos here to add them to this playlist." : source.startsWith("dev:") ? device?.scanning ? "Reading device…" : "No music or videos found on this device." : "No items.";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "main-view", ref: contentRef, children: [
    device && /* @__PURE__ */ jsxRuntimeExports.jsx(DeviceHeader, { device }),
    showWelcome ? /* @__PURE__ */ jsxRuntimeExports.jsx(Welcome, {}) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      mode === "coverflow" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(CoverFlow, { rows, set: set2, height: cfHeight }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "splitter dark", onMouseDown: (e) => startSplit(e, "cf") })
      ] }),
      columnBrowser && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ColumnBrowser, { baseRows: base, height: cbHeight, set: set2 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "splitter", onMouseDown: (e) => startSplit(e, "cb") })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        TrackList,
        {
          rows,
          columnSetKey: set2,
          columns,
          sort,
          sortStoreKey: source.startsWith("pl:") || source.startsWith("dev:") ? source : set2,
          playlistId: pl && pl.kind === "normal" ? pl.id : null,
          emptyText
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBar, { rows, noun: NOUNS[set2] }),
    dialog?.type === "viewOptions" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ViewOptions,
      {
        columnSetKey: sourceLabel(getState()),
        columns: columns.map((c) => ({ key: c.key, label: COLUMN_BY_KEY.get(c.key)?.label || c.key, visible: c.visible })),
        onSave: (vis) => updateUi({ columns: { ...getState().settings.ui.columns, [set2]: columns.map((c) => ({ ...c, visible: c.key === "playing" || vis.has(c.key) })) } })
      }
    )
  ] });
}
function App() {
  const ready = useStore((s) => s.ready);
  const dialog = useStore((s) => s.dialog);
  const source = useStore((s) => s.source);
  const libVersion = useStore((s) => s.libVersion);
  const videoVisible = usePlayer((s) => s.videoVisible);
  const [fileDrag, setFileDrag] = reactExports.useState(false);
  reactExports.useEffect(() => refreshCurrent(), [libVersion]);
  reactExports.useEffect(() => setVideoVisible(false), [source]);
  reactExports.useEffect(() => {
    const off = window.discette.onMenu((c) => void handleMenuCommand(c));
    const playSel = () => playSelectionOrAll();
    window.addEventListener("discette:play-selection", playSel);
    const onKey = (e) => {
      const el = e.target;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable;
      if (typing || getState().dialog) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !e.ctrlKey) {
        e.preventDefault();
        void deleteSelection();
      } else if (e.key === "MediaPlayPause") togglePlay();
      else if (e.key === "MediaTrackNext") void next();
      else if (e.key === "MediaTrackPrevious") void prev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      off();
      window.removeEventListener("discette:play-selection", playSel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  if (!ready) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "loading" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "app",
      onDragOver: (e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setFileDrag(true);
        }
      },
      onDragLeave: (e) => {
        if (e.currentTarget === e.target || !e.relatedTarget) setFileDrag(false);
      },
      onDrop: (e) => {
        setFileDrag(false);
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        const paths = [...e.dataTransfer.files].map((f) => window.discette.pathForFile(f)).filter(Boolean);
        if (paths.length) void window.discette.library.import(paths);
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(TopBar, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "middle", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Sidebar, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "content", children: videoVisible ? /* @__PURE__ */ jsxRuntimeExports.jsx(VideoView, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(MainView, {}) })
        ] }),
        fileDrag && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "file-drop", children: "Drop to add to your Discette library" }),
        dialog?.type === "info" && /* @__PURE__ */ jsxRuntimeExports.jsx(GetInfo, { ids: dialog.ids, list: dialog.list, initialTab: dialog.tab }),
        dialog?.type === "smart" && /* @__PURE__ */ jsxRuntimeExports.jsx(SmartEditor, { playlistId: dialog.playlistId }),
        dialog?.type === "prefs" && /* @__PURE__ */ jsxRuntimeExports.jsx(Preferences, {}),
        dialog?.type === "sync" && /* @__PURE__ */ jsxRuntimeExports.jsx(SyncSettings, { deviceId: dialog.deviceId }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MessageBox, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { id: "media-park", hidden: true })
      ]
    }
  );
}
async function boot() {
  await initStore();
  const ui = getState().settings.ui;
  initPlayer(ui.volume, ui.shuffle, ui.repeat);
  clientExports.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsxRuntimeExports.jsx(App, {}));
  const park = () => {
    const p = document.getElementById("media-park");
    if (p) p.appendChild(media);
    else requestAnimationFrame(park);
  };
  park();
}
void boot();
