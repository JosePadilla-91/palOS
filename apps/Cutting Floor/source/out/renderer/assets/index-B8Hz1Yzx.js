import { u as uid, q as transitionDef, w as clipEnd, o as isAnim, g as getSeq, x as sequenceDuration, y as sourceDuration, i as evalNum, z as nextClip, A as prevClip, B as createTransition, D as effectDef, E as generatorDef, F as isEffectType, G as createEffect, H as createGeneratorParams, I as containsSequence, J as snapFps, K as sourceTime, M as trackOf$1, N as writeNum, O as writePath, P as EASE_OUT, Q as EASE_IN, R as evalPath, T as toggleAnimated, U as keyIndexAt, V as removeKeyAt, W as setKey, X as isLinearTime, Y as mediaTime, Z as sourceSpan, n as fitSize, _ as toUV, $ as resolveGeom, a0 as fromUV, a1 as makeKey, a2 as GENERATORS, a3 as EFFECTS, a4 as VIDEO_CATEGORIES, a5 as AUDIO_CATEGORIES, a6 as TRANSITION_CATEGORIES, a7 as TRANSITIONS, a8 as fpsLabel, a9 as trackLabel, aa as clipLabel, ab as headWindow, ac as tailWindow, ad as parseCurve, ae as curveTable, af as serializeCurve, ag as FPS_CHOICES, p as presetInfo, f as Compositor, k as mediaUses, e as evaluateAudio, v as voiceChain, t as trackChain, d as dbToGain, m as masterChain, j as evaluateVideo, ah as activeRange, s as sourceRange, r as readVarispeed, ai as expandPairs, aj as pickUV, ak as rgbToHex, al as editPoints, am as evaluate, an as fx } from "./chains-CiuWKdKz.js";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production = {};
var hasRequiredReactJsxRuntime_production;
function requireReactJsxRuntime_production() {
  if (hasRequiredReactJsxRuntime_production) return reactJsxRuntime_production;
  hasRequiredReactJsxRuntime_production = 1;
  var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
  function jsxProd(type, config, maybeKey) {
    var key = null;
    void 0 !== maybeKey && (key = "" + maybeKey);
    void 0 !== config.key && (key = "" + config.key);
    if ("key" in config) {
      maybeKey = {};
      for (var propName in config)
        "key" !== propName && (maybeKey[propName] = config[propName]);
    } else maybeKey = config;
    config = maybeKey.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== config ? config : null,
      props: maybeKey
    };
  }
  reactJsxRuntime_production.Fragment = REACT_FRAGMENT_TYPE;
  reactJsxRuntime_production.jsx = jsxProd;
  reactJsxRuntime_production.jsxs = jsxProd;
  return reactJsxRuntime_production;
}
var hasRequiredJsxRuntime;
function requireJsxRuntime() {
  if (hasRequiredJsxRuntime) return jsxRuntime.exports;
  hasRequiredJsxRuntime = 1;
  {
    jsxRuntime.exports = requireReactJsxRuntime_production();
  }
  return jsxRuntime.exports;
}
var jsxRuntimeExports = requireJsxRuntime();
var react = { exports: {} };
var react_production = {};
var hasRequiredReact_production;
function requireReact_production() {
  if (hasRequiredReact_production) return react_production;
  hasRequiredReact_production = 1;
  var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var ReactNoopUpdateQueue = {
    isMounted: function() {
      return false;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, assign = Object.assign, emptyObject = {};
  function Component(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  Component.prototype.isReactComponent = {};
  Component.prototype.setState = function(partialState, callback) {
    if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, partialState, callback, "setState");
  };
  Component.prototype.forceUpdate = function(callback) {
    this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
  };
  function ComponentDummy() {
  }
  ComponentDummy.prototype = Component.prototype;
  function PureComponent(props, context, updater) {
    this.props = props;
    this.context = context;
    this.refs = emptyObject;
    this.updater = updater || ReactNoopUpdateQueue;
  }
  var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
  pureComponentPrototype.constructor = PureComponent;
  assign(pureComponentPrototype, Component.prototype);
  pureComponentPrototype.isPureReactComponent = true;
  var isArrayImpl = Array.isArray;
  function noop() {
  }
  var ReactSharedInternals = { H: null, A: null, T: null, S: null }, hasOwnProperty = Object.prototype.hasOwnProperty;
  function ReactElement(type, key, props) {
    var refProp = props.ref;
    return {
      $$typeof: REACT_ELEMENT_TYPE,
      type,
      key,
      ref: void 0 !== refProp ? refProp : null,
      props
    };
  }
  function cloneAndReplaceKey(oldElement, newKey) {
    return ReactElement(oldElement.type, newKey, oldElement.props);
  }
  function isValidElement(object) {
    return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
  }
  function escape(key) {
    var escaperLookup = { "=": "=0", ":": "=2" };
    return "$" + key.replace(/[=:]/g, function(match) {
      return escaperLookup[match];
    });
  }
  var userProvidedKeyEscapeRegex = /\/+/g;
  function getElementKey(element, index) {
    return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
  }
  function resolveThenable(thenable) {
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        throw thenable.reason;
      default:
        switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
          function(fulfilledValue) {
            "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          },
          function(error) {
            "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
          }
        )), thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
        }
    }
    throw thenable;
  }
  function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
    var type = typeof children;
    if ("undefined" === type || "boolean" === type) children = null;
    var invokeCallback = false;
    if (null === children) invokeCallback = true;
    else
      switch (type) {
        case "bigint":
        case "string":
        case "number":
          invokeCallback = true;
          break;
        case "object":
          switch (children.$$typeof) {
            case REACT_ELEMENT_TYPE:
            case REACT_PORTAL_TYPE:
              invokeCallback = true;
              break;
            case REACT_LAZY_TYPE:
              return invokeCallback = children._init, mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
          }
      }
    if (invokeCallback)
      return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
        return c;
      })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
        callback,
        escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
          userProvidedKeyEscapeRegex,
          "$&/"
        ) + "/") + invokeCallback
      )), array.push(callback)), 1;
    invokeCallback = 0;
    var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
    if (isArrayImpl(children))
      for (var i = 0; i < children.length; i++)
        nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if (i = getIteratorFn(children), "function" === typeof i)
      for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
        nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        );
    else if ("object" === type) {
      if ("function" === typeof children.then)
        return mapIntoArray(
          resolveThenable(children),
          array,
          escapedPrefix,
          nameSoFar,
          callback
        );
      array = String(children);
      throw Error(
        "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return invokeCallback;
  }
  function mapChildren(children, func, context) {
    if (null == children) return children;
    var result = [], count = 0;
    mapIntoArray(children, result, "", "", function(child) {
      return func.call(context, child, count++);
    });
    return result;
  }
  function lazyInitializer(payload) {
    if (-1 === payload._status) {
      var ctor = payload._result, thenable = ctor();
      thenable.then(
        function(moduleObject) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
        },
        function(error) {
          if (0 === payload._status || -1 === payload._status)
            payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
        }
      );
      -1 === payload._status && (payload._status = 0, payload._result = thenable);
    }
    if (1 === payload._status) return payload._result.default;
    throw payload._result;
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  };
  function startTransition(scope) {
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    currentTransition.types = null !== prevTransition ? prevTransition.types : null;
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
    } catch (error) {
      reportGlobalError(error);
    } finally {
      null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  }
  function addTransitionType(type) {
    var transition = ReactSharedInternals.T;
    if (null !== transition) {
      var transitionTypes = transition.types;
      null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
    } else startTransition(addTransitionType.bind(null, type));
  }
  var Children = {
    map: mapChildren,
    forEach: function(children, forEachFunc, forEachContext) {
      mapChildren(
        children,
        function() {
          forEachFunc.apply(this, arguments);
        },
        forEachContext
      );
    },
    count: function(children) {
      var n = 0;
      mapChildren(children, function() {
        n++;
      });
      return n;
    },
    toArray: function(children) {
      return mapChildren(children, function(child) {
        return child;
      }) || [];
    },
    only: function(children) {
      if (!isValidElement(children))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return children;
    }
  };
  react_production.Activity = REACT_ACTIVITY_TYPE;
  react_production.Children = Children;
  react_production.Component = Component;
  react_production.Fragment = REACT_FRAGMENT_TYPE;
  react_production.Profiler = REACT_PROFILER_TYPE;
  react_production.PureComponent = PureComponent;
  react_production.StrictMode = REACT_STRICT_MODE_TYPE;
  react_production.Suspense = REACT_SUSPENSE_TYPE;
  react_production.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
  react_production.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
  react_production.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(size) {
      return ReactSharedInternals.H.useMemoCache(size);
    }
  };
  react_production.addTransitionType = addTransitionType;
  react_production.cache = function(fn) {
    return function() {
      return fn.apply(null, arguments);
    };
  };
  react_production.cacheSignal = function() {
    return null;
  };
  react_production.cloneElement = function(element, config, children) {
    if (null === element || void 0 === element)
      throw Error(
        "The argument must be a React element, but you passed " + element + "."
      );
    var props = assign({}, element.props), key = element.key;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
    var propName = arguments.length - 2;
    if (1 === propName) props.children = children;
    else if (1 < propName) {
      for (var childArray = Array(propName), i = 0; i < propName; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    return ReactElement(element.type, key, props);
  };
  react_production.createContext = function(defaultValue) {
    defaultValue = {
      $$typeof: REACT_CONTEXT_TYPE,
      _currentValue: defaultValue,
      _currentValue2: defaultValue,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    };
    defaultValue.Provider = defaultValue;
    defaultValue.Consumer = {
      $$typeof: REACT_CONSUMER_TYPE,
      _context: defaultValue
    };
    return defaultValue;
  };
  react_production.createElement = function(type, config, children) {
    var propName, props = {}, key = null;
    if (null != config)
      for (propName in void 0 !== config.key && (key = "" + config.key), config)
        hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
    var childrenLength = arguments.length - 2;
    if (1 === childrenLength) props.children = children;
    else if (1 < childrenLength) {
      for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
        childArray[i] = arguments[i + 2];
      props.children = childArray;
    }
    if (type && type.defaultProps)
      for (propName in childrenLength = type.defaultProps, childrenLength)
        void 0 === props[propName] && (props[propName] = childrenLength[propName]);
    return ReactElement(type, key, props);
  };
  react_production.createRef = function() {
    return { current: null };
  };
  react_production.forwardRef = function(render) {
    return { $$typeof: REACT_FORWARD_REF_TYPE, render };
  };
  react_production.isValidElement = isValidElement;
  react_production.lazy = function(ctor) {
    return {
      $$typeof: REACT_LAZY_TYPE,
      _payload: { _status: -1, _result: ctor },
      _init: lazyInitializer
    };
  };
  react_production.memo = function(type, compare) {
    return {
      $$typeof: REACT_MEMO_TYPE,
      type,
      compare: void 0 === compare ? null : compare
    };
  };
  react_production.startTransition = startTransition;
  react_production.unstable_useCacheRefresh = function() {
    return ReactSharedInternals.H.useCacheRefresh();
  };
  react_production.use = function(usable) {
    return ReactSharedInternals.H.use(usable);
  };
  react_production.useActionState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useActionState(action, initialState, permalink);
  };
  react_production.useCallback = function(callback, deps) {
    return ReactSharedInternals.H.useCallback(callback, deps);
  };
  react_production.useContext = function(Context) {
    return ReactSharedInternals.H.useContext(Context);
  };
  react_production.useDebugValue = function() {
  };
  react_production.useDeferredValue = function(value, initialValue) {
    return ReactSharedInternals.H.useDeferredValue(value, initialValue);
  };
  react_production.useEffect = function(create2, deps) {
    return ReactSharedInternals.H.useEffect(create2, deps);
  };
  react_production.useEffectEvent = function(callback) {
    return ReactSharedInternals.H.useEffectEvent(callback);
  };
  react_production.useId = function() {
    return ReactSharedInternals.H.useId();
  };
  react_production.useImperativeHandle = function(ref, create2, deps) {
    return ReactSharedInternals.H.useImperativeHandle(ref, create2, deps);
  };
  react_production.useInsertionEffect = function(create2, deps) {
    return ReactSharedInternals.H.useInsertionEffect(create2, deps);
  };
  react_production.useLayoutEffect = function(create2, deps) {
    return ReactSharedInternals.H.useLayoutEffect(create2, deps);
  };
  react_production.useMemo = function(create2, deps) {
    return ReactSharedInternals.H.useMemo(create2, deps);
  };
  react_production.useOptimistic = function(passthrough, reducer) {
    return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
  };
  react_production.useReducer = function(reducer, initialArg, init) {
    return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
  };
  react_production.useRef = function(initialValue) {
    return ReactSharedInternals.H.useRef(initialValue);
  };
  react_production.useState = function(initialState) {
    return ReactSharedInternals.H.useState(initialState);
  };
  react_production.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
    return ReactSharedInternals.H.useSyncExternalStore(
      subscribe,
      getSnapshot,
      getServerSnapshot
    );
  };
  react_production.useTransition = function() {
    return ReactSharedInternals.H.useTransition();
  };
  react_production.version = "19.3.0";
  return react_production;
}
var hasRequiredReact;
function requireReact() {
  if (hasRequiredReact) return react.exports;
  hasRequiredReact = 1;
  {
    react.exports = requireReact_production();
  }
  return react.exports;
}
var reactExports = requireReact();
const React = /* @__PURE__ */ getDefaultExportFromCjs(reactExports);
var client = { exports: {} };
var reactDomClient_production = {};
var scheduler = { exports: {} };
var scheduler_production = {};
var hasRequiredScheduler_production;
function requireScheduler_production() {
  if (hasRequiredScheduler_production) return scheduler_production;
  hasRequiredScheduler_production = 1;
  (function(exports) {
    function push(heap, node) {
      var index = heap.length;
      heap.push(node);
      a: for (; 0 < index; ) {
        var parentIndex = index - 1 >>> 1, parent = heap[parentIndex];
        if (0 < compare(parent, node))
          heap[parentIndex] = node, heap[index] = parent, index = parentIndex;
        else break a;
      }
    }
    function peek(heap) {
      return 0 === heap.length ? null : heap[0];
    }
    function pop(heap) {
      if (0 === heap.length) return null;
      var first = heap[0], last = heap.pop();
      if (last !== first) {
        heap[0] = last;
        a: for (var index = 0, length = heap.length, halfLength = length >>> 1; index < halfLength; ) {
          var leftIndex = 2 * (index + 1) - 1, left = heap[leftIndex], rightIndex = leftIndex + 1, right = heap[rightIndex];
          if (0 > compare(left, last))
            rightIndex < length && 0 > compare(right, left) ? (heap[index] = right, heap[rightIndex] = last, index = rightIndex) : (heap[index] = left, heap[leftIndex] = last, index = leftIndex);
          else if (rightIndex < length && 0 > compare(right, last))
            heap[index] = right, heap[rightIndex] = last, index = rightIndex;
          else break a;
        }
      }
      return first;
    }
    function compare(a, b) {
      var diff = a.sortIndex - b.sortIndex;
      return 0 !== diff ? diff : a.id - b.id;
    }
    exports.unstable_now = void 0;
    if ("object" === typeof performance && "function" === typeof performance.now) {
      var localPerformance = performance;
      exports.unstable_now = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date, initialTime = localDate.now();
      exports.unstable_now = function() {
        return localDate.now() - initialTime;
      };
    }
    var taskQueue = [], timerQueue = [], taskIdCounter = 1, currentTask = null, currentPriorityLevel = 3, isPerformingWork = false, isHostCallbackScheduled = false, isHostTimeoutScheduled = false, needsPaint = false, localSetTimeout = "function" === typeof setTimeout ? setTimeout : null, localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null, localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
    function advanceTimers(currentTime) {
      for (var timer = peek(timerQueue); null !== timer; ) {
        if (null === timer.callback) pop(timerQueue);
        else if (timer.startTime <= currentTime)
          pop(timerQueue), timer.sortIndex = timer.expirationTime, push(taskQueue, timer);
        else break;
        timer = peek(timerQueue);
      }
    }
    function handleTimeout(currentTime) {
      isHostTimeoutScheduled = false;
      advanceTimers(currentTime);
      if (!isHostCallbackScheduled)
        if (null !== peek(taskQueue))
          isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline());
        else {
          var firstTimer = peek(timerQueue);
          null !== firstTimer && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
    }
    var isMessageLoopRunning = false, taskTimeoutID = -1, frameInterval = 5, startTime = -1;
    function shouldYieldToHost() {
      return needsPaint ? true : exports.unstable_now() - startTime < frameInterval ? false : true;
    }
    function performWorkUntilDeadline() {
      needsPaint = false;
      if (isMessageLoopRunning) {
        var currentTime = exports.unstable_now();
        startTime = currentTime;
        var hasMoreWork = true;
        try {
          a: {
            isHostCallbackScheduled = false;
            isHostTimeoutScheduled && (isHostTimeoutScheduled = false, localClearTimeout(taskTimeoutID), taskTimeoutID = -1);
            isPerformingWork = true;
            var previousPriorityLevel = currentPriorityLevel;
            try {
              b: {
                advanceTimers(currentTime);
                for (currentTask = peek(taskQueue); null !== currentTask && !(currentTask.expirationTime > currentTime && shouldYieldToHost()); ) {
                  var callback = currentTask.callback;
                  if ("function" === typeof callback) {
                    currentTask.callback = null;
                    currentPriorityLevel = currentTask.priorityLevel;
                    var continuationCallback = callback(
                      currentTask.expirationTime <= currentTime
                    );
                    currentTime = exports.unstable_now();
                    if ("function" === typeof continuationCallback) {
                      currentTask.callback = continuationCallback;
                      advanceTimers(currentTime);
                      hasMoreWork = true;
                      break b;
                    }
                    currentTask === peek(taskQueue) && pop(taskQueue);
                    advanceTimers(currentTime);
                  } else pop(taskQueue);
                  currentTask = peek(taskQueue);
                }
                if (null !== currentTask) hasMoreWork = true;
                else {
                  var firstTimer = peek(timerQueue);
                  null !== firstTimer && requestHostTimeout(
                    handleTimeout,
                    firstTimer.startTime - currentTime
                  );
                  hasMoreWork = false;
                }
              }
              break a;
            } finally {
              currentTask = null, currentPriorityLevel = previousPriorityLevel, isPerformingWork = false;
            }
            hasMoreWork = void 0;
          }
        } finally {
          hasMoreWork ? schedulePerformWorkUntilDeadline() : isMessageLoopRunning = false;
        }
      }
    }
    var schedulePerformWorkUntilDeadline;
    if ("function" === typeof localSetImmediate)
      schedulePerformWorkUntilDeadline = function() {
        localSetImmediate(performWorkUntilDeadline);
      };
    else if ("undefined" !== typeof MessageChannel) {
      var channel = new MessageChannel(), port = channel.port2;
      channel.port1.onmessage = performWorkUntilDeadline;
      schedulePerformWorkUntilDeadline = function() {
        port.postMessage(null);
      };
    } else
      schedulePerformWorkUntilDeadline = function() {
        localSetTimeout(performWorkUntilDeadline, 0);
      };
    function requestHostTimeout(callback, ms) {
      taskTimeoutID = localSetTimeout(function() {
        callback(exports.unstable_now());
      }, ms);
    }
    exports.unstable_IdlePriority = 5;
    exports.unstable_ImmediatePriority = 1;
    exports.unstable_LowPriority = 4;
    exports.unstable_NormalPriority = 3;
    exports.unstable_Profiling = null;
    exports.unstable_UserBlockingPriority = 2;
    exports.unstable_cancelCallback = function(task) {
      task.callback = null;
    };
    exports.unstable_forceFrameRate = function(fps) {
      0 > fps || 125 < fps ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5;
    };
    exports.unstable_getCurrentPriorityLevel = function() {
      return currentPriorityLevel;
    };
    exports.unstable_next = function(eventHandler) {
      switch (currentPriorityLevel) {
        case 1:
        case 2:
        case 3:
          var priorityLevel = 3;
          break;
        default:
          priorityLevel = currentPriorityLevel;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports.unstable_requestPaint = function() {
      needsPaint = true;
    };
    exports.unstable_runWithPriority = function(priorityLevel, eventHandler) {
      switch (priorityLevel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          priorityLevel = 3;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports.unstable_scheduleCallback = function(priorityLevel, callback, options) {
      var currentTime = exports.unstable_now();
      "object" === typeof options && null !== options ? (options = options.delay, options = "number" === typeof options && 0 < options ? currentTime + options : currentTime) : options = currentTime;
      switch (priorityLevel) {
        case 1:
          var timeout = -1;
          break;
        case 2:
          timeout = 250;
          break;
        case 5:
          timeout = 1073741823;
          break;
        case 4:
          timeout = 1e4;
          break;
        default:
          timeout = 5e3;
      }
      timeout = options + timeout;
      priorityLevel = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: options,
        expirationTime: timeout,
        sortIndex: -1
      };
      options > currentTime ? (priorityLevel.sortIndex = options, push(timerQueue, priorityLevel), null === peek(taskQueue) && priorityLevel === peek(timerQueue) && (isHostTimeoutScheduled ? (localClearTimeout(taskTimeoutID), taskTimeoutID = -1) : isHostTimeoutScheduled = true, requestHostTimeout(handleTimeout, options - currentTime))) : (priorityLevel.sortIndex = timeout, push(taskQueue, priorityLevel), isHostCallbackScheduled || isPerformingWork || (isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline())));
      return priorityLevel;
    };
    exports.unstable_shouldYield = shouldYieldToHost;
    exports.unstable_wrapCallback = function(callback) {
      var parentPriorityLevel = currentPriorityLevel;
      return function() {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;
        try {
          return callback.apply(this, arguments);
        } finally {
          currentPriorityLevel = previousPriorityLevel;
        }
      };
    };
  })(scheduler_production);
  return scheduler_production;
}
var hasRequiredScheduler;
function requireScheduler() {
  if (hasRequiredScheduler) return scheduler.exports;
  hasRequiredScheduler = 1;
  {
    scheduler.exports = requireScheduler_production();
  }
  return scheduler.exports;
}
var reactDom = { exports: {} };
var reactDom_production = {};
var hasRequiredReactDom_production;
function requireReactDom_production() {
  if (hasRequiredReactDom_production) return reactDom_production;
  hasRequiredReactDom_production = 1;
  var React2 = requireReact();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function noop() {
  }
  var Internals = {
    d: {
      f: noop,
      r: function() {
        throw Error(formatProdErrorMessage(522));
      },
      D: noop,
      C: noop,
      L: noop,
      m: noop,
      X: noop,
      S: noop,
      M: noop
    },
    p: 0,
    findDOMNode: null
  }, REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_RECOVERABLE_TYPE = /* @__PURE__ */ Symbol.for("react.recoverable"), REACT_OPTIMISTIC_KEY = /* @__PURE__ */ Symbol.for("react.optimistic_key");
  function createPortal$1(children, containerInfo, implementation) {
    var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
    return {
      $$typeof: REACT_PORTAL_TYPE,
      key: null == key ? null : key === REACT_OPTIMISTIC_KEY ? REACT_OPTIMISTIC_KEY : "" + key,
      children,
      containerInfo,
      implementation
    };
  }
  var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function getCrossOriginStringAs(as, input) {
    if ("font" === as) return "";
    if ("string" === typeof input)
      return "use-credentials" === input ? input : "";
  }
  reactDom_production.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
  reactDom_production.browser = function(reason) {
    return { $$typeof: REACT_RECOVERABLE_TYPE, _reason: reason };
  };
  reactDom_production.createPortal = function(children, container) {
    var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
    if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
      throw Error(formatProdErrorMessage(299));
    return createPortal$1(children, container, null, key);
  };
  reactDom_production.flushSync = function(fn) {
    var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
    try {
      if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
    } finally {
      ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
    }
  };
  reactDom_production.preconnect = function(href, options) {
    "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
  };
  reactDom_production.prefetchDNS = function(href) {
    "string" === typeof href && Internals.d.D(href);
  };
  reactDom_production.preinit = function(href, options) {
    if ("string" === typeof href && options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
      "style" === as ? Internals.d.S(
        href,
        "string" === typeof options.precedence ? options.precedence : void 0,
        {
          crossOrigin,
          integrity,
          fetchPriority
        }
      ) : "script" === as && Internals.d.X(href, {
        crossOrigin,
        integrity,
        fetchPriority,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0
      });
    }
  };
  reactDom_production.preinitModule = function(href, options) {
    if ("string" === typeof href)
      if ("object" === typeof options && null !== options) {
        if (null == options.as || "script" === options.as) {
          var crossOrigin = getCrossOriginStringAs(
            options.as,
            options.crossOrigin
          );
          Internals.d.M(href, {
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0,
            nonce: "string" === typeof options.nonce ? options.nonce : void 0,
            fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
          });
        }
      } else null == options && Internals.d.M(href);
  };
  reactDom_production.preload = function(href, options) {
    if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
      var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
      Internals.d.L(href, as, {
        crossOrigin,
        integrity: "string" === typeof options.integrity ? options.integrity : void 0,
        nonce: "string" === typeof options.nonce ? options.nonce : void 0,
        type: "string" === typeof options.type ? options.type : void 0,
        fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
        referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
        imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
        imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
        media: "string" === typeof options.media ? options.media : void 0
      });
    }
  };
  reactDom_production.preloadModule = function(href, options) {
    if ("string" === typeof href)
      if (options) {
        var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
        Internals.d.m(href, {
          as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
          crossOrigin,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0,
          fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
        });
      } else Internals.d.m(href);
  };
  reactDom_production.requestFormReset = function(form) {
    Internals.d.r(form);
  };
  reactDom_production.unstable_batchedUpdates = function(fn, a) {
    return fn(a);
  };
  reactDom_production.useFormState = function(action, initialState, permalink) {
    return ReactSharedInternals.H.useFormState(action, initialState, permalink);
  };
  reactDom_production.useFormStatus = function() {
    return ReactSharedInternals.H.useHostTransitionStatus();
  };
  reactDom_production.version = "19.3.0";
  return reactDom_production;
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
    reactDom.exports = requireReactDom_production();
  }
  return reactDom.exports;
}
var hasRequiredReactDomClient_production;
function requireReactDomClient_production() {
  if (hasRequiredReactDomClient_production) return reactDomClient_production;
  hasRequiredReactDomClient_production = 1;
  var Scheduler = requireScheduler(), React2 = requireReact(), ReactDOM = requireReactDom();
  function formatProdErrorMessage(code) {
    var url = "https://react.dev/errors/" + code;
    if (1 < arguments.length) {
      url += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var i = 2; i < arguments.length; i++)
        url += "&args[]=" + encodeURIComponent(arguments[i]);
    }
    return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function isValidContainer(node) {
    return !(!node || 1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType);
  }
  function getNearestMountedFiber(fiber) {
    for (var node = fiber, nextNode = node; nextNode && !nextNode.alternate; )
      node = nextNode, 0 !== (node.flags & 4098) && (fiber = node.return), nextNode = node.return;
    for (; node.return; ) node = node.return;
    return 3 === node.tag ? fiber : null;
  }
  function getSuspenseInstanceFromFiber(fiber) {
    if (13 === fiber.tag) {
      var suspenseState = fiber.memoizedState;
      null === suspenseState && (fiber = fiber.alternate, null !== fiber && (suspenseState = fiber.memoizedState));
      if (null !== suspenseState) return suspenseState.dehydrated;
    }
    return null;
  }
  function getActivityInstanceFromFiber(fiber) {
    if (31 === fiber.tag) {
      var activityState = fiber.memoizedState;
      null === activityState && (fiber = fiber.alternate, null !== fiber && (activityState = fiber.memoizedState));
      if (null !== activityState) return activityState.dehydrated;
    }
    return null;
  }
  function assertIsMounted(fiber) {
    if (getNearestMountedFiber(fiber) !== fiber)
      throw Error(formatProdErrorMessage(188));
  }
  function findCurrentFiberUsingSlowPath(fiber) {
    var alternate = fiber.alternate;
    if (!alternate) {
      alternate = getNearestMountedFiber(fiber);
      if (null === alternate) throw Error(formatProdErrorMessage(188));
      return alternate !== fiber ? null : fiber;
    }
    for (var a = fiber, b = alternate; ; ) {
      var parentA = a.return;
      if (null === parentA) break;
      var parentB = parentA.alternate;
      if (null === parentB) {
        b = parentA.return;
        if (null !== b) {
          a = b;
          continue;
        }
        break;
      }
      if (parentA.child === parentB.child) {
        for (parentB = parentA.child; parentB; ) {
          if (parentB === a) return assertIsMounted(parentA), fiber;
          if (parentB === b) return assertIsMounted(parentA), alternate;
          parentB = parentB.sibling;
        }
        throw Error(formatProdErrorMessage(188));
      }
      if (a.return !== b.return) a = parentA, b = parentB;
      else {
        for (var didFindChild = false, child$0 = parentA.child; child$0; ) {
          if (child$0 === a) {
            didFindChild = true;
            a = parentA;
            b = parentB;
            break;
          }
          if (child$0 === b) {
            didFindChild = true;
            b = parentA;
            a = parentB;
            break;
          }
          child$0 = child$0.sibling;
        }
        if (!didFindChild) {
          for (child$0 = parentB.child; child$0; ) {
            if (child$0 === a) {
              didFindChild = true;
              a = parentB;
              b = parentA;
              break;
            }
            if (child$0 === b) {
              didFindChild = true;
              b = parentB;
              a = parentA;
              break;
            }
            child$0 = child$0.sibling;
          }
          if (!didFindChild) throw Error(formatProdErrorMessage(189));
        }
      }
      if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
    }
    if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
    return a.stateNode.current === a ? fiber : alternate;
  }
  function findCurrentHostFiberImpl(node) {
    var tag = node.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
    for (node = node.child; null !== node; ) {
      tag = findCurrentHostFiberImpl(node);
      if (null !== tag) return tag;
      node = node.sibling;
    }
    return null;
  }
  function traverseVisibleInstancesAndTextInstances(child, searchWithinHosts, fn, a, b, c) {
    for (; null !== child; ) {
      if ((5 === child.tag || 27 === child.tag || 6 === child.tag) && fn(child, a, b, c) || (22 !== child.tag || null === child.memoizedState) && (searchWithinHosts || 5 !== child.tag && 27 !== child.tag) && traverseVisibleInstancesAndTextInstances(
        child.child,
        searchWithinHosts,
        fn,
        a,
        b,
        c
      ))
        return true;
      child = child.sibling;
    }
    return false;
  }
  function getFragmentParentInstanceOrContainerFiber(fiber) {
    for (fiber = fiber.return; null !== fiber; ) {
      if (3 === fiber.tag || 5 === fiber.tag || 27 === fiber.tag) return fiber;
      fiber = fiber.return;
    }
    return null;
  }
  function fiberIsPortaledIntoHost(fiber) {
    var foundPortalParent = false;
    for (fiber = fiber.return; null !== fiber; ) {
      4 === fiber.tag && (foundPortalParent = true);
      if (3 === fiber.tag || 5 === fiber.tag || 27 === fiber.tag) break;
      fiber = fiber.return;
    }
    return foundPortalParent;
  }
  function getFragmentInstanceOrTextInstanceSiblings(fiber) {
    var result = [null, null], parentHostFiber = getFragmentParentInstanceOrContainerFiber(fiber);
    if (null === parentHostFiber) return result;
    findFragmentInstanceOrTextInstanceSiblings(
      result,
      fiber,
      parentHostFiber.child,
      { foundSelf: false }
    );
    return result;
  }
  function findFragmentInstanceOrTextInstanceSiblings(result, self, child, state) {
    for (; null !== child; ) {
      if (child === self) state.foundSelf = true;
      else if (5 === child.tag || 27 === child.tag || 6 === child.tag) {
        if (state.foundSelf) return result[1] = child, true;
        result[0] = child;
      } else if ((22 !== child.tag || null === child.memoizedState) && findFragmentInstanceOrTextInstanceSiblings(
        result,
        self,
        child.child,
        state
      ))
        return true;
      child = child.sibling;
    }
    return false;
  }
  function getInstanceFromHostFiber(fiber) {
    switch (fiber.tag) {
      case 5:
      case 27:
      case 6:
        return fiber.stateNode;
      case 3:
        return fiber.stateNode.containerInfo;
      default:
        throw Error(formatProdErrorMessage(559));
    }
  }
  var searchTarget = null, searchBoundary = null;
  function isFiberPrecedingCheck(child, target, boundary) {
    return child === boundary ? true : child === target ? (searchTarget = child, true) : false;
  }
  function isFiberFollowingCheck(child, target, boundary) {
    return child === boundary ? (searchBoundary = child, false) : child === target ? (null !== searchBoundary && (searchTarget = child), true) : false;
  }
  function getParentForFragmentAncestors(inst) {
    if (null === inst) return null;
    do
      inst = null === inst ? null : inst.return;
    while (inst && 5 !== inst.tag && 27 !== inst.tag && 3 !== inst.tag);
    return inst ? inst : null;
  }
  function getLowestCommonAncestor(instA, instB, getParent2) {
    for (var depthA = 0, tempA = instA; tempA; tempA = getParent2(tempA)) depthA++;
    tempA = 0;
    for (var tempB = instB; tempB; tempB = getParent2(tempB)) tempA++;
    for (; 0 < depthA - tempA; ) instA = getParent2(instA), depthA--;
    for (; 0 < tempA - depthA; ) instB = getParent2(instB), tempA--;
    for (; depthA--; ) {
      if (instA === instB || null !== instB && instA === instB.alternate)
        return instA;
      instA = getParent2(instA);
      instB = getParent2(instB);
    }
    return null;
  }
  var assign = Object.assign, REACT_LEGACY_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.element"), REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
  var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"), REACT_LEGACY_HIDDEN_TYPE = /* @__PURE__ */ Symbol.for("react.legacy_hidden");
  var REACT_MEMO_CACHE_SENTINEL = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel"), REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition"), REACT_RECOVERABLE_TYPE = /* @__PURE__ */ Symbol.for("react.recoverable"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
  function getIteratorFn(maybeIterable) {
    if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
    maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
    return "function" === typeof maybeIterable ? maybeIterable : null;
  }
  var REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference");
  function getComponentNameFromType(type) {
    if (null == type) return null;
    if ("function" === typeof type)
      return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
    if ("string" === typeof type) return type;
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return "Fragment";
      case REACT_PROFILER_TYPE:
        return "Profiler";
      case REACT_STRICT_MODE_TYPE:
        return "StrictMode";
      case REACT_SUSPENSE_TYPE:
        return "Suspense";
      case REACT_SUSPENSE_LIST_TYPE:
        return "SuspenseList";
      case REACT_ACTIVITY_TYPE:
        return "Activity";
      case REACT_VIEW_TRANSITION_TYPE:
        return "ViewTransition";
    }
    if ("object" === typeof type)
      switch (type.$$typeof) {
        case REACT_PORTAL_TYPE:
          return "Portal";
        case REACT_CONTEXT_TYPE:
          return type.displayName || "Context";
        case REACT_CONSUMER_TYPE:
          return (type._context.displayName || "Context") + ".Consumer";
        case REACT_FORWARD_REF_TYPE:
          var innerType = type.render;
          type = type.displayName;
          type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
          return type;
        case REACT_MEMO_TYPE:
          return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
        case REACT_LAZY_TYPE:
          innerType = type._payload;
          type = type._init;
          try {
            return getComponentNameFromType(type(innerType));
          } catch (x) {
          }
      }
    return null;
  }
  var isArrayImpl = Array.isArray, ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, sharedNotPendingObject = {
    pending: false,
    data: null,
    method: null,
    action: null
  }, valueStack = [], index = -1;
  function createCursor(defaultValue) {
    return { current: defaultValue };
  }
  function pop(cursor) {
    0 > index || (cursor.current = valueStack[index], valueStack[index] = null, index--);
  }
  function push(cursor, value) {
    index++;
    valueStack[index] = cursor.current;
    cursor.current = value;
  }
  var contextStackCursor = createCursor(null), contextFiberStackCursor = createCursor(null), rootInstanceStackCursor = createCursor(null), hostTransitionProviderCursor = createCursor(null);
  function pushHostContainer(fiber, nextRootInstance) {
    push(rootInstanceStackCursor, nextRootInstance);
    push(contextFiberStackCursor, fiber);
    push(contextStackCursor, null);
    switch (nextRootInstance.nodeType) {
      case 9:
      case 11:
        fiber = (fiber = nextRootInstance.documentElement) ? (fiber = fiber.namespaceURI) ? getOwnHostContext(fiber) : 0 : 0;
        break;
      default:
        if (fiber = nextRootInstance.tagName, nextRootInstance = nextRootInstance.namespaceURI)
          nextRootInstance = getOwnHostContext(nextRootInstance), fiber = getChildHostContextProd(nextRootInstance, fiber);
        else
          switch (fiber) {
            case "svg":
              fiber = 1;
              break;
            case "math":
              fiber = 2;
              break;
            default:
              fiber = 0;
          }
    }
    pop(contextStackCursor);
    push(contextStackCursor, fiber);
  }
  function popHostContainer() {
    pop(contextStackCursor);
    pop(contextFiberStackCursor);
    pop(rootInstanceStackCursor);
  }
  function pushHostContext(fiber) {
    var stateHook = fiber.memoizedState;
    null !== stateHook && (HostTransitionContext._currentValue = stateHook.memoizedState, push(hostTransitionProviderCursor, fiber));
    stateHook = contextStackCursor.current;
    var JSCompiler_inline_result = getChildHostContextProd(stateHook, fiber.type);
    stateHook !== JSCompiler_inline_result && (push(contextFiberStackCursor, fiber), push(contextStackCursor, JSCompiler_inline_result));
  }
  function popHostContext(fiber) {
    contextFiberStackCursor.current === fiber && (pop(contextStackCursor), pop(contextFiberStackCursor));
    hostTransitionProviderCursor.current === fiber && (pop(hostTransitionProviderCursor), HostTransitionContext._currentValue = sharedNotPendingObject);
  }
  var prefix, suffix;
  function describeBuiltInComponentFrame(name) {
    if (void 0 === prefix)
      try {
        throw Error();
      } catch (x) {
        var match = x.stack.trim().match(/\n( *(at )?)/);
        prefix = match && match[1] || "";
        suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return "\n" + prefix + name + suffix;
  }
  var reentry = false;
  function describeNativeComponentFrame(fn, construct) {
    if (!fn || reentry) return "";
    reentry = true;
    var previousPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var RunInRootFrame = {
        DetermineComponentFrameRoot: function() {
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if ("object" === typeof Reflect && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  var control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x$1) {
                  control = x$1;
                }
                Fake = false;
                try {
                  var prevProps = Object.getOwnPropertyDescriptor(
                    fn.prototype,
                    "props"
                  );
                  Object.defineProperty(fn.prototype, "props", {
                    configurable: true,
                    set: function() {
                      throw Error();
                    }
                  });
                  Fake = true;
                  new fn();
                } finally {
                  Fake && (void 0 !== prevProps ? Object.defineProperty(fn.prototype, "props", prevProps) : delete fn.prototype.props);
                }
              }
            } else {
              try {
                throw Error();
              } catch (x$2) {
                control = x$2;
              }
              (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
              });
            }
          } catch (sample) {
            if (sample && control && "string" === typeof sample.stack)
              return [sample.stack, control.stack];
          }
          return [null, null];
        }
      };
      RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var namePropDescriptor = Object.getOwnPropertyDescriptor(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name"
      );
      namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
      if (sampleStack && controlStack) {
        var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
        for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot"); )
          RunInRootFrame++;
        for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes(
          "DetermineComponentFrameRoot"
        ); )
          namePropDescriptor++;
        if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
          for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]; )
            namePropDescriptor--;
        for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
          if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
            if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
              do
                if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
                  var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                  fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
                  return frame;
                }
              while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
            }
            break;
          }
      }
    } finally {
      reentry = false, Error.prepareStackTrace = previousPrepareStackTrace;
    }
    return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
  }
  function describeFiber(fiber, childFiber) {
    switch (fiber.tag) {
      case 26:
      case 27:
      case 5:
        return describeBuiltInComponentFrame(fiber.type);
      case 16:
        return describeBuiltInComponentFrame("Lazy");
      case 13:
        return fiber.child !== childFiber && null !== childFiber ? describeBuiltInComponentFrame("Suspense Fallback") : describeBuiltInComponentFrame("Suspense");
      case 19:
        return describeBuiltInComponentFrame("SuspenseList");
      case 0:
      case 15:
        return describeNativeComponentFrame(fiber.type, false);
      case 11:
        return describeNativeComponentFrame(fiber.type.render, false);
      case 1:
        return describeNativeComponentFrame(fiber.type, true);
      case 31:
        return describeBuiltInComponentFrame("Activity");
      case 30:
        return describeBuiltInComponentFrame("ViewTransition");
      default:
        return "";
    }
  }
  function getStackByFiberInDevAndProd(workInProgress2) {
    try {
      var info = "", previous = null;
      do
        info += describeFiber(workInProgress2, previous), previous = workInProgress2, workInProgress2 = workInProgress2.return;
      while (workInProgress2);
      return info;
    } catch (x) {
      return "\nError generating stack: " + x.message + "\n" + x.stack;
    }
  }
  var hasOwnProperty = Object.prototype.hasOwnProperty, scheduleCallback$3 = Scheduler.unstable_scheduleCallback, cancelCallback$1 = Scheduler.unstable_cancelCallback, shouldYield = Scheduler.unstable_shouldYield, requestPaint = Scheduler.unstable_requestPaint, now = Scheduler.unstable_now, getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel, ImmediatePriority = Scheduler.unstable_ImmediatePriority, UserBlockingPriority = Scheduler.unstable_UserBlockingPriority, NormalPriority$1 = Scheduler.unstable_NormalPriority, LowPriority = Scheduler.unstable_LowPriority, IdlePriority = Scheduler.unstable_IdlePriority, log$1 = Scheduler.log, unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue, rendererID = null, injectedHook = null;
  function setIsStrictModeForDevtools(newIsStrictMode) {
    "function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
    if (injectedHook && "function" === typeof injectedHook.setStrictMode)
      try {
        injectedHook.setStrictMode(rendererID, newIsStrictMode);
      } catch (err) {
      }
  }
  var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback, log = Math.log, LN2 = Math.LN2;
  function clz32Fallback(x) {
    x >>>= 0;
    return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
  }
  var nextTransitionUpdateLane = 256, nextTransitionDeferredLane = 262144, nextRetryLane = 4194304;
  function getHighestPriorityLanes(lanes) {
    var pendingSyncLanes = lanes & 42;
    if (0 !== pendingSyncLanes) return pendingSyncLanes;
    switch (lanes & -lanes) {
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
        return 64;
      case 128:
        return 128;
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
        return lanes & -lanes;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return lanes & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return lanes & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return lanes;
    }
  }
  function getNextLanes(root2, wipLanes, rootHasPendingCommit) {
    var pendingLanes = root2.pendingLanes;
    if (0 === pendingLanes) return 0;
    var nextLanes = 0, suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes;
    root2 = root2.warmLanes;
    var nonIdlePendingLanes = pendingLanes & 134217727;
    0 !== nonIdlePendingLanes ? (pendingLanes = nonIdlePendingLanes & ~suspendedLanes, 0 !== pendingLanes ? nextLanes = getHighestPriorityLanes(pendingLanes) : (pingedLanes &= nonIdlePendingLanes, 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = nonIdlePendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))))) : (nonIdlePendingLanes = pendingLanes & ~suspendedLanes, 0 !== nonIdlePendingLanes ? nextLanes = getHighestPriorityLanes(nonIdlePendingLanes) : 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = pendingLanes & ~root2, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
    return 0 === nextLanes ? 0 : 0 !== wipLanes && wipLanes !== nextLanes && 0 === (wipLanes & suspendedLanes) && (suspendedLanes = nextLanes & -nextLanes, rootHasPendingCommit = wipLanes & -wipLanes, suspendedLanes >= rootHasPendingCommit || 32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)) ? wipLanes : nextLanes;
  }
  function checkIfRootIsPrerendering(root2, renderLanes2) {
    return 0 === (root2.pendingLanes & ~(root2.suspendedLanes & ~root2.pingedLanes) & renderLanes2);
  }
  function getEntangledLanes(root2, renderLanes2) {
    0 !== (renderLanes2 & 8) && (renderLanes2 |= renderLanes2 & 32);
    var allEntangledLanes = root2.entangledLanes;
    if (0 !== allEntangledLanes)
      for (root2 = root2.entanglements, allEntangledLanes &= renderLanes2; 0 < allEntangledLanes; ) {
        var index$4 = 31 - clz32(allEntangledLanes), lane = 1 << index$4;
        renderLanes2 |= root2[index$4];
        allEntangledLanes &= ~lane;
      }
    return renderLanes2;
  }
  function computeExpirationTime(lane, currentTime) {
    switch (lane) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return currentTime + 250;
      case 16:
      case 32:
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
        return currentTime + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function claimNextRetryLane() {
    var lane = nextRetryLane;
    nextRetryLane <<= 1;
    0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
    return lane;
  }
  function createLaneMap(initial) {
    for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
    return laneMap;
  }
  function markRootUpdated$1(root2, updateLane) {
    root2.pendingLanes |= updateLane;
    268435456 !== updateLane && (root2.suspendedLanes = 0, root2.pingedLanes = 0, root2.warmLanes = 0);
  }
  function markRootFinished(root2, finishedLanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes) {
    var previouslyPendingLanes = root2.pendingLanes;
    root2.pendingLanes = remainingLanes;
    root2.suspendedLanes = 0;
    root2.pingedLanes = 0;
    root2.warmLanes = 0;
    root2.expiredLanes &= remainingLanes;
    root2.entangledLanes &= remainingLanes;
    root2.errorRecoveryDisabledLanes &= remainingLanes;
    root2.shellSuspendCounter = 0;
    var entanglements = root2.entanglements, expirationTimes = root2.expirationTimes, hiddenUpdates = root2.hiddenUpdates;
    for (remainingLanes = previouslyPendingLanes & ~remainingLanes; 0 < remainingLanes; ) {
      var index$7 = 31 - clz32(remainingLanes), lane = 1 << index$7;
      entanglements[index$7] = 0;
      expirationTimes[index$7] = -1;
      var hiddenUpdatesForLane = hiddenUpdates[index$7];
      if (null !== hiddenUpdatesForLane)
        for (hiddenUpdates[index$7] = null, index$7 = 0; index$7 < hiddenUpdatesForLane.length; index$7++) {
          var update = hiddenUpdatesForLane[index$7];
          null !== update && (update.lane &= -536870913);
        }
      remainingLanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, 0);
    0 !== suspendedRetryLanes && 0 === updatedLanes && 0 !== root2.tag && (root2.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
  }
  function markSpawnedDeferredLane(root2, spawnedLane, entangledLanes) {
    root2.pendingLanes |= spawnedLane;
    root2.suspendedLanes &= ~spawnedLane;
    var spawnedLaneIndex = 31 - clz32(spawnedLane);
    root2.entangledLanes |= spawnedLane;
    root2.entanglements[spawnedLaneIndex] = root2.entanglements[spawnedLaneIndex] | 1073741824 | entangledLanes & 261930;
  }
  function markRootEntangled(root2, entangledLanes) {
    var rootEntangledLanes = root2.entangledLanes |= entangledLanes;
    for (root2 = root2.entanglements; rootEntangledLanes; ) {
      var index$8 = 31 - clz32(rootEntangledLanes), lane = 1 << index$8;
      lane & entangledLanes | root2[index$8] & entangledLanes && (root2[index$8] |= entangledLanes);
      rootEntangledLanes &= ~lane;
    }
  }
  function getBumpedLaneForHydration(root2, renderLanes2) {
    var renderLane = renderLanes2 & -renderLanes2;
    renderLane = 0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
    return 0 !== (renderLane & (root2.suspendedLanes | renderLanes2)) ? 0 : renderLane;
  }
  function getBumpedLaneForHydrationByLane(lane) {
    switch (lane) {
      case 2:
        lane = 1;
        break;
      case 8:
        lane = 4;
        break;
      case 32:
        lane = 16;
        break;
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
        lane = 128;
        break;
      case 268435456:
        lane = 134217728;
        break;
      default:
        lane = 0;
    }
    return lane;
  }
  function lanesToEventPriority(lanes) {
    lanes &= -lanes;
    return 2 < lanes ? 8 < lanes ? 0 !== (lanes & 134217727) ? 32 : 268435456 : 8 : 2;
  }
  function resolveUpdatePriority() {
    var updatePriority = ReactDOMSharedInternals.p;
    if (0 !== updatePriority) return updatePriority;
    updatePriority = window.event;
    return void 0 === updatePriority ? 32 : getEventPriority(updatePriority.type);
  }
  function runWithPriority(priority, fn) {
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      return ReactDOMSharedInternals.p = priority, fn();
    } finally {
      ReactDOMSharedInternals.p = previousPriority;
    }
  }
  var randomKey = Math.random().toString(36).slice(2), internalInstanceKey = "__reactFiber$" + randomKey, internalPropsKey = "__reactProps$" + randomKey, internalContainerInstanceKey = "__reactContainer$" + randomKey, internalEventHandlersKey = "__reactEvents$" + randomKey, internalEventHandlerListenersKey = "__reactListeners$" + randomKey, internalEventHandlesSetKey = "__reactHandles$" + randomKey, internalRootNodeResourcesKey = "__reactResources$" + randomKey, internalHoistableMarker = "__reactMarker$" + randomKey, internalLoadPendingKey = "__reactLoad$" + randomKey;
  function detachDeletedInstance(node) {
    delete node[internalInstanceKey];
    delete node[internalPropsKey];
    delete node[internalEventHandlerListenersKey];
    delete node[internalEventHandlesSetKey];
  }
  function getClosestInstanceFromNode(targetNode) {
    var targetInst;
    if (targetInst = targetNode[internalInstanceKey]) return targetInst;
    for (var parentNode = targetNode.parentNode; parentNode; ) {
      if (targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey]) {
        parentNode = targetInst.alternate;
        if (null !== targetInst.child || null !== parentNode && null !== parentNode.child)
          for (targetNode = getParentHydrationBoundary(targetNode); null !== targetNode; ) {
            if (parentNode = targetNode[internalInstanceKey]) return parentNode;
            targetNode = getParentHydrationBoundary(targetNode);
          }
        return targetInst;
      }
      targetNode = parentNode;
      parentNode = targetNode.parentNode;
    }
    return null;
  }
  function getInstanceFromNode(node) {
    if (node = node[internalInstanceKey] || node[internalContainerInstanceKey]) {
      var tag = node.tag;
      if (5 === tag || 6 === tag || 13 === tag || 31 === tag || 26 === tag || 27 === tag || 3 === tag)
        return node;
    }
    return null;
  }
  function getNodeFromInstance(inst) {
    var tag = inst.tag;
    if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return inst.stateNode;
    throw Error(formatProdErrorMessage(33));
  }
  function getResourcesFromRoot(root2) {
    var resources = root2[internalRootNodeResourcesKey];
    resources || (resources = root2[internalRootNodeResourcesKey] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() });
    return resources;
  }
  function markNodeAsHoistable(node) {
    node[internalHoistableMarker] = true;
  }
  function clearPendingLoadOnNode(node) {
    node[internalLoadPendingKey] = void 0;
  }
  var allNativeEvents = /* @__PURE__ */ new Set(), registrationNameDependencies = {};
  function registerTwoPhaseEvent(registrationName, dependencies) {
    registerDirectEvent(registrationName, dependencies);
    registerDirectEvent(registrationName + "Capture", dependencies);
  }
  function registerDirectEvent(registrationName, dependencies) {
    registrationNameDependencies[registrationName] = dependencies;
    for (registrationName = 0; registrationName < dependencies.length; registrationName++)
      allNativeEvents.add(dependencies[registrationName]);
  }
  var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), illegalAttributeNameCache = {}, validatedAttributeNameCache = {};
  function isAttributeNameSafe(attributeName) {
    if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
      return true;
    if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return false;
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
      return validatedAttributeNameCache[attributeName] = true;
    illegalAttributeNameCache[attributeName] = true;
    return false;
  }
  var viewTransitionMutationContext = false;
  function pushMutationContext() {
    var prev = viewTransitionMutationContext;
    viewTransitionMutationContext = false;
    return prev;
  }
  function setValueForAttribute(node, name, value) {
    if (isAttributeNameSafe(name))
      if (null === value) node.removeAttribute(name);
      else {
        switch (typeof value) {
          case "undefined":
          case "function":
          case "symbol":
            node.removeAttribute(name);
            return;
          case "boolean":
            var prefix$10 = name.toLowerCase().slice(0, 5);
            if ("data-" !== prefix$10 && "aria-" !== prefix$10) {
              node.removeAttribute(name);
              return;
            }
        }
        node.setAttribute(name, value);
      }
  }
  function setValueForKnownAttribute(node, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttribute(name, value);
    }
  }
  function setValueForNamespacedAttribute(node, namespace, name, value) {
    if (null === value) node.removeAttribute(name);
    else {
      switch (typeof value) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          node.removeAttribute(name);
          return;
      }
      node.setAttributeNS(namespace, name, value);
    }
  }
  function getToStringValue(value) {
    switch (typeof value) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return value;
      case "object":
        return value;
      default:
        return "";
    }
  }
  function isCheckable(elem) {
    var type = elem.type;
    return (elem = elem.nodeName) && "input" === elem.toLowerCase() && ("checkbox" === type || "radio" === type);
  }
  function trackValueOnNode(node, valueField, currentValue) {
    var descriptor = Object.getOwnPropertyDescriptor(
      node.constructor.prototype,
      valueField
    );
    if (!node.hasOwnProperty(valueField) && "undefined" !== typeof descriptor && "function" === typeof descriptor.get && "function" === typeof descriptor.set) {
      var get2 = descriptor.get, set2 = descriptor.set;
      Object.defineProperty(node, valueField, {
        configurable: true,
        get: function() {
          return get2.call(this);
        },
        set: function(value) {
          currentValue = "" + value;
          set2.call(this, value);
        }
      });
      Object.defineProperty(node, valueField, {
        enumerable: descriptor.enumerable
      });
      return {
        getValue: function() {
          return currentValue;
        },
        setValue: function(value) {
          currentValue = "" + value;
        },
        stopTracking: function() {
          node._valueTracker = null;
          delete node[valueField];
        }
      };
    }
  }
  function track(node) {
    if (!node._valueTracker) {
      var valueField = isCheckable(node) ? "checked" : "value";
      node._valueTracker = trackValueOnNode(
        node,
        valueField,
        "" + node[valueField]
      );
    }
  }
  function updateValueIfChanged(node) {
    if (!node) return false;
    var tracker = node._valueTracker;
    if (!tracker) return true;
    var lastValue = tracker.getValue();
    var value = "";
    node && (value = isCheckable(node) ? node.checked ? "true" : "false" : node.value);
    node = value;
    return node !== lastValue ? (tracker.setValue(node), true) : false;
  }
  var escapeSelectorAttributeValueInsideDoubleQuotesRegex = /[\n"\\]/g;
  function escapeSelectorAttributeValueInsideDoubleQuotes(value) {
    return value.replace(
      escapeSelectorAttributeValueInsideDoubleQuotesRegex,
      function(ch) {
        return "\\" + ch.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function updateInput(element, value, defaultValue, lastDefaultValue, checked, defaultChecked, type, name) {
    element.name = "";
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type ? element.type = type : element.removeAttribute("type");
    if (null != value)
      if ("number" === type) {
        if (0 === value && "" === element.value || element.value != value)
          element.value = "" + getToStringValue(value);
      } else
        element.value !== "" + getToStringValue(value) && (element.value = "" + getToStringValue(value));
    else
      "submit" !== type && "reset" !== type || element.removeAttribute("value");
    null != value ? "number" === type && element.value == value ? setDefaultValue(element, getToStringValue(element.value)) : setDefaultValue(element, getToStringValue(value)) : null != defaultValue ? setDefaultValue(element, getToStringValue(defaultValue)) : null != lastDefaultValue && element.removeAttribute("value");
    null == checked && null != defaultChecked && (element.defaultChecked = !!defaultChecked);
    null != checked && (element.checked = checked && "function" !== typeof checked && "symbol" !== typeof checked);
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name ? element.name = "" + getToStringValue(name) : element.removeAttribute("name");
  }
  function initInput(element, value, defaultValue, checked, defaultChecked, type, name, isHydrating2) {
    null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type && (element.type = type);
    if (null != value || null != defaultValue) {
      if (!("submit" !== type && "reset" !== type || void 0 !== value && null !== value)) {
        track(element);
        return;
      }
      defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
      value = null != value ? "" + getToStringValue(value) : defaultValue;
      isHydrating2 || value === element.value || (element.value = value);
      element.defaultValue = value;
    }
    checked = null != checked ? checked : defaultChecked;
    checked = "function" !== typeof checked && "symbol" !== typeof checked && !!checked;
    element.checked = isHydrating2 ? element.checked : !!checked;
    element.defaultChecked = !!checked;
    null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name && (element.name = name);
    track(element);
  }
  function setDefaultValue(node, value) {
    node.defaultValue !== "" + value && (node.defaultValue = "" + value);
  }
  function updateOptions(node, multiple, propValue, setDefaultSelected) {
    node = node.options;
    if (multiple) {
      multiple = {};
      for (var i = 0; i < propValue.length; i++)
        multiple["$" + propValue[i]] = true;
      for (propValue = 0; propValue < node.length; propValue++)
        i = multiple.hasOwnProperty("$" + node[propValue].value), node[propValue].selected !== i && (node[propValue].selected = i), i && setDefaultSelected && (node[propValue].defaultSelected = true);
    } else {
      propValue = "" + getToStringValue(propValue);
      multiple = null;
      for (i = 0; i < node.length; i++) {
        if (node[i].value === propValue) {
          node[i].selected = true;
          setDefaultSelected && (node[i].defaultSelected = true);
          return;
        }
        null !== multiple || node[i].disabled || (multiple = node[i]);
      }
      null !== multiple && (multiple.selected = true);
    }
  }
  function updateTextarea(element, value, defaultValue) {
    if (null != value && (value = "" + getToStringValue(value), value !== element.value && (element.value = value), null == defaultValue)) {
      element.defaultValue !== value && (element.defaultValue = value);
      return;
    }
    element.defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
  }
  function initTextarea(element, value, defaultValue, children) {
    if (null == value) {
      if (null != children) {
        if (null != defaultValue) throw Error(formatProdErrorMessage(92));
        if (isArrayImpl(children)) {
          if (1 < children.length) throw Error(formatProdErrorMessage(93));
          children = children[0];
        }
        defaultValue = children;
      }
      null == defaultValue && (defaultValue = "");
      value = defaultValue;
    }
    defaultValue = getToStringValue(value);
    element.defaultValue = defaultValue;
    children = element.textContent;
    children === defaultValue && "" !== children && null !== children && (element.value = children);
    track(element);
  }
  function setTextContent(node, text) {
    if (text) {
      var firstChild = node.firstChild;
      if (firstChild && firstChild === node.lastChild && 3 === firstChild.nodeType) {
        firstChild.nodeValue = text;
        return;
      }
    }
    node.textContent = text;
  }
  var unitlessNumbers = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function setValueForStyle(style2, styleName, value) {
    var isCustomProperty = 0 === styleName.indexOf("--");
    null == value || "boolean" === typeof value || "" === value ? isCustomProperty ? style2.setProperty(styleName, "") : "float" === styleName ? style2.cssFloat = "" : style2[styleName] = "" : isCustomProperty ? style2.setProperty(styleName, value) : "number" !== typeof value || 0 === value || unitlessNumbers.has(styleName) ? "float" === styleName ? style2.cssFloat = value : style2[styleName] = ("" + value).trim() : style2[styleName] = value + "px";
  }
  function setValueForStyles(node, styles, prevStyles) {
    if (null != styles && "object" !== typeof styles)
      throw Error(formatProdErrorMessage(62));
    node = node.style;
    if (null != prevStyles) {
      for (var styleName in prevStyles)
        !prevStyles.hasOwnProperty(styleName) || null != styles && styles.hasOwnProperty(styleName) || (0 === styleName.indexOf("--") ? node.setProperty(styleName, "") : "float" === styleName ? node.cssFloat = "" : node[styleName] = "", viewTransitionMutationContext = true);
      for (var styleName$16 in styles)
        styleName = styles[styleName$16], styles.hasOwnProperty(styleName$16) && prevStyles[styleName$16] !== styleName && (setValueForStyle(node, styleName$16, styleName), viewTransitionMutationContext = true);
    } else
      for (var styleName$17 in styles)
        styles.hasOwnProperty(styleName$17) && setValueForStyle(node, styleName$17, styles[styleName$17]);
  }
  function isCustomElement(tagName) {
    if (-1 === tagName.indexOf("-")) return false;
    switch (tagName) {
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
  var aliases = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["maskType", "mask-type"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function sanitizeURL(url) {
    return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
  }
  function noop$1() {
  }
  var currentReplayingEvent = null;
  function getEventTarget(nativeEvent) {
    nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
    nativeEvent.correspondingUseElement && (nativeEvent = nativeEvent.correspondingUseElement);
    return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
  }
  var restoreTarget = null, restoreQueue = null;
  function restoreStateOfTarget(target) {
    var internalInstance = getInstanceFromNode(target);
    if (internalInstance && (target = internalInstance.stateNode)) {
      var props = target[internalPropsKey] || null;
      a: switch (target = internalInstance.stateNode, internalInstance.type) {
        case "input":
          updateInput(
            target,
            props.value,
            props.defaultValue,
            props.defaultValue,
            props.checked,
            props.defaultChecked,
            props.type,
            props.name
          );
          internalInstance = props.name;
          if ("radio" === props.type && null != internalInstance) {
            for (props = target; props.parentNode; ) props = props.parentNode;
            props = props.querySelectorAll(
              'input[name="' + escapeSelectorAttributeValueInsideDoubleQuotes(
                "" + internalInstance
              ) + '"][type="radio"]'
            );
            for (internalInstance = 0; internalInstance < props.length; internalInstance++) {
              var otherNode = props[internalInstance];
              if (otherNode !== target && otherNode.form === target.form) {
                var otherProps = otherNode[internalPropsKey] || null;
                if (!otherProps) throw Error(formatProdErrorMessage(90));
                updateInput(
                  otherNode,
                  otherProps.value,
                  otherProps.defaultValue,
                  otherProps.defaultValue,
                  otherProps.checked,
                  otherProps.defaultChecked,
                  otherProps.type,
                  otherProps.name
                );
              }
            }
            for (internalInstance = 0; internalInstance < props.length; internalInstance++)
              otherNode = props[internalInstance], otherNode.form === target.form && updateValueIfChanged(otherNode);
          }
          break a;
        case "textarea":
          updateTextarea(target, props.value, props.defaultValue);
          break a;
        case "select":
          internalInstance = props.value, null != internalInstance && updateOptions(target, !!props.multiple, internalInstance, false);
      }
    }
  }
  var isInsideEventHandler = false;
  function batchedUpdates$1(fn, a, b) {
    if (isInsideEventHandler) return fn(a, b);
    isInsideEventHandler = true;
    try {
      var JSCompiler_inline_result = fn(a);
      return JSCompiler_inline_result;
    } finally {
      if (isInsideEventHandler = false, null !== restoreTarget || null !== restoreQueue) {
        if (flushSyncWork$1(), restoreTarget && (a = restoreTarget, fn = restoreQueue, restoreQueue = restoreTarget = null, restoreStateOfTarget(a), fn))
          for (a = 0; a < fn.length; a++) restoreStateOfTarget(fn[a]);
      }
    }
  }
  function getListener(inst, registrationName) {
    var stateNode = inst.stateNode;
    if (null === stateNode) return null;
    var props = stateNode[internalPropsKey] || null;
    if (null === props) return null;
    stateNode = props[registrationName];
    a: switch (registrationName) {
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
        (props = !props.disabled) || (inst = inst.type, props = !("button" === inst || "input" === inst || "select" === inst || "textarea" === inst));
        inst = !props;
        break a;
      default:
        inst = false;
    }
    if (inst) return null;
    if (stateNode && "function" !== typeof stateNode)
      throw Error(
        formatProdErrorMessage(231, registrationName, typeof stateNode)
      );
    return stateNode;
  }
  var canUseDOM = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), passiveBrowserEventsSupported = false;
  if (canUseDOM)
    try {
      var options = {};
      Object.defineProperty(options, "passive", {
        get: function() {
          passiveBrowserEventsSupported = true;
        }
      });
      window.addEventListener("test", options, options);
      window.removeEventListener("test", options, options);
    } catch (e) {
      passiveBrowserEventsSupported = false;
    }
  var root = null, startText = null, fallbackText = null;
  function getData() {
    if (fallbackText) return fallbackText;
    var start, startValue = startText, startLength = startValue.length, end, endValue = "value" in root ? root.value : root.textContent, endLength = endValue.length;
    for (start = 0; start < startLength && startValue[start] === endValue[start]; start++) ;
    var minEnd = startLength - start;
    for (end = 1; end <= minEnd && startValue[startLength - end] === endValue[endLength - end]; end++) ;
    return fallbackText = endValue.slice(start, 1 < end ? 1 - end : void 0);
  }
  function getEventCharCode(nativeEvent) {
    var keyCode = nativeEvent.keyCode;
    "charCode" in nativeEvent ? (nativeEvent = nativeEvent.charCode, 0 === nativeEvent && 13 === keyCode && (nativeEvent = 13)) : nativeEvent = keyCode;
    10 === nativeEvent && (nativeEvent = 13);
    return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
  }
  function functionThatReturnsTrue() {
    return true;
  }
  function functionThatReturnsFalse() {
    return false;
  }
  function createSyntheticEvent(Interface) {
    function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
      this._reactName = reactName;
      this._targetInst = targetInst;
      this.type = reactEventType;
      this.nativeEvent = nativeEvent;
      this.target = nativeEventTarget;
      this.currentTarget = null;
      for (var propName in Interface)
        Interface.hasOwnProperty(propName) && (reactName = Interface[propName], this[propName] = reactName ? reactName(nativeEvent) : nativeEvent[propName]);
      this.isDefaultPrevented = (null != nativeEvent.defaultPrevented ? nativeEvent.defaultPrevented : false === nativeEvent.returnValue) ? functionThatReturnsTrue : functionThatReturnsFalse;
      this.isPropagationStopped = functionThatReturnsFalse;
      return this;
    }
    assign(SyntheticBaseEvent.prototype, {
      preventDefault: function() {
        this.defaultPrevented = true;
        var event = this.nativeEvent;
        event && (event.preventDefault ? event.preventDefault() : "unknown" !== typeof event.returnValue && (event.returnValue = false), this.isDefaultPrevented = functionThatReturnsTrue);
      },
      stopPropagation: function() {
        var event = this.nativeEvent;
        event && (event.stopPropagation ? event.stopPropagation() : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = true), this.isPropagationStopped = functionThatReturnsTrue);
      },
      persist: function() {
      },
      isPersistent: functionThatReturnsTrue
    });
    return SyntheticBaseEvent;
  }
  var EventInterface = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, SyntheticEvent = createSyntheticEvent(EventInterface), UIEventInterface = assign({}, EventInterface, { view: 0, detail: 0 }), SyntheticUIEvent = createSyntheticEvent(UIEventInterface), lastMovementX, lastMovementY, lastMouseEvent, MouseEventInterface = assign({}, UIEventInterface, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: getEventModifierState,
    button: 0,
    buttons: 0,
    relatedTarget: function(event) {
      return void 0 === event.relatedTarget ? event.fromElement === event.srcElement ? event.toElement : event.fromElement : event.relatedTarget;
    },
    movementX: function(event) {
      if ("movementX" in event) return event.movementX;
      event !== lastMouseEvent && (lastMouseEvent && "mousemove" === event.type ? (lastMovementX = event.screenX - lastMouseEvent.screenX, lastMovementY = event.screenY - lastMouseEvent.screenY) : lastMovementY = lastMovementX = 0, lastMouseEvent = event);
      return lastMovementX;
    },
    movementY: function(event) {
      return "movementY" in event ? event.movementY : lastMovementY;
    }
  }), SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface), DragEventInterface = assign({}, MouseEventInterface, { dataTransfer: 0 }), SyntheticDragEvent = createSyntheticEvent(DragEventInterface), FocusEventInterface = assign({}, UIEventInterface, { relatedTarget: 0 }), SyntheticFocusEvent = createSyntheticEvent(FocusEventInterface), AnimationEventInterface = assign({}, EventInterface, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticAnimationEvent = createSyntheticEvent(AnimationEventInterface), ClipboardEventInterface = assign({}, EventInterface, {
    clipboardData: function(event) {
      return "clipboardData" in event ? event.clipboardData : window.clipboardData;
    }
  }), SyntheticClipboardEvent = createSyntheticEvent(ClipboardEventInterface), CompositionEventInterface = assign({}, EventInterface, { data: 0 }), SyntheticCompositionEvent = createSyntheticEvent(CompositionEventInterface), normalizeKey = {
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
  }, translateToKey = {
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
  }, modifierKeyToProp = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function modifierStateGetter(keyArg) {
    var nativeEvent = this.nativeEvent;
    return nativeEvent.getModifierState ? nativeEvent.getModifierState(keyArg) : (keyArg = modifierKeyToProp[keyArg]) ? !!nativeEvent[keyArg] : false;
  }
  function getEventModifierState() {
    return modifierStateGetter;
  }
  var KeyboardEventInterface = assign({}, UIEventInterface, {
    key: function(nativeEvent) {
      if (nativeEvent.key) {
        var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
        if ("Unidentified" !== key) return key;
      }
      return "keypress" === nativeEvent.type ? (nativeEvent = getEventCharCode(nativeEvent), 13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent)) : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type ? translateToKey[nativeEvent.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: getEventModifierState,
    charCode: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : 0;
    },
    keyCode: function(event) {
      return "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    },
    which: function(event) {
      return "keypress" === event.type ? getEventCharCode(event) : "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
    }
  }), SyntheticKeyboardEvent = createSyntheticEvent(KeyboardEventInterface), PointerEventInterface = assign({}, MouseEventInterface, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), SyntheticPointerEvent = createSyntheticEvent(PointerEventInterface), SubmitEventInterface = assign({}, EventInterface, { submitter: 0 }), SyntheticSubmitEvent = createSyntheticEvent(SubmitEventInterface), TouchEventInterface = assign({}, UIEventInterface, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: getEventModifierState
  }), SyntheticTouchEvent = createSyntheticEvent(TouchEventInterface), TransitionEventInterface = assign({}, EventInterface, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), SyntheticTransitionEvent = createSyntheticEvent(TransitionEventInterface), WheelEventInterface = assign({}, MouseEventInterface, {
    deltaX: function(event) {
      return "deltaX" in event ? event.deltaX : "wheelDeltaX" in event ? -event.wheelDeltaX : 0;
    },
    deltaY: function(event) {
      return "deltaY" in event ? event.deltaY : "wheelDeltaY" in event ? -event.wheelDeltaY : "wheelDelta" in event ? -event.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), SyntheticWheelEvent = createSyntheticEvent(WheelEventInterface), ToggleEventInterface = assign({}, EventInterface, {
    newState: 0,
    oldState: 0,
    source: 0
  }), SyntheticToggleEvent = createSyntheticEvent(ToggleEventInterface), END_KEYCODES = [9, 13, 27, 32], canUseCompositionEvent = canUseDOM && "CompositionEvent" in window, documentMode = null;
  canUseDOM && "documentMode" in document && (documentMode = document.documentMode);
  var canUseTextInputEvent = canUseDOM && "TextEvent" in window && !documentMode, useFallbackCompositionData = canUseDOM && (!canUseCompositionEvent || documentMode && 8 < documentMode && 11 >= documentMode), SPACEBAR_CHAR = String.fromCharCode(32), hasSpaceKeypress = false;
  function isFallbackCompositionEnd(domEventName, nativeEvent) {
    switch (domEventName) {
      case "keyup":
        return -1 !== END_KEYCODES.indexOf(nativeEvent.keyCode);
      case "keydown":
        return 229 !== nativeEvent.keyCode;
      case "keypress":
      case "mousedown":
      case "focusout":
        return true;
      default:
        return false;
    }
  }
  function getDataFromCustomEvent(nativeEvent) {
    nativeEvent = nativeEvent.detail;
    return "object" === typeof nativeEvent && "data" in nativeEvent ? nativeEvent.data : null;
  }
  var isComposing = false;
  function getNativeBeforeInputChars(domEventName, nativeEvent) {
    switch (domEventName) {
      case "compositionend":
        return getDataFromCustomEvent(nativeEvent);
      case "keypress":
        if (32 !== nativeEvent.which) return null;
        hasSpaceKeypress = true;
        return SPACEBAR_CHAR;
      case "textInput":
        return domEventName = nativeEvent.data, domEventName === SPACEBAR_CHAR && hasSpaceKeypress ? null : domEventName;
      default:
        return null;
    }
  }
  function getFallbackBeforeInputChars(domEventName, nativeEvent) {
    if (isComposing)
      return "compositionend" === domEventName || !canUseCompositionEvent && isFallbackCompositionEnd(domEventName, nativeEvent) ? (domEventName = getData(), fallbackText = startText = root = null, isComposing = false, domEventName) : null;
    switch (domEventName) {
      case "paste":
        return null;
      case "keypress":
        if (!(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) || nativeEvent.ctrlKey && nativeEvent.altKey) {
          if (nativeEvent.char && 1 < nativeEvent.char.length)
            return nativeEvent.char;
          if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
        }
        return null;
      case "compositionend":
        return useFallbackCompositionData && "ko" !== nativeEvent.locale ? null : nativeEvent.data;
      default:
        return null;
    }
  }
  var supportedInputTypes = {
    color: true,
    date: true,
    datetime: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    password: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true
  };
  function isTextInputElement(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return "input" === nodeName ? !!supportedInputTypes[elem.type] : "textarea" === nodeName ? true : false;
  }
  function createAndAccumulateChangeEvent(dispatchQueue, inst, nativeEvent, target) {
    restoreTarget ? restoreQueue ? restoreQueue.push(target) : restoreQueue = [target] : restoreTarget = target;
    inst = accumulateTwoPhaseListeners(inst, "onChange");
    0 < inst.length && (nativeEvent = new SyntheticEvent(
      "onChange",
      "change",
      null,
      nativeEvent,
      target
    ), dispatchQueue.push({ event: nativeEvent, listeners: inst }));
  }
  var activeElement$1 = null, activeElementInst$1 = null;
  function runEventInBatch(dispatchQueue) {
    processDispatchQueue(dispatchQueue, 0);
  }
  function getInstIfValueChanged(targetInst) {
    var targetNode = getNodeFromInstance(targetInst);
    if (updateValueIfChanged(targetNode)) return targetInst;
  }
  function getTargetInstForChangeEvent(domEventName, targetInst) {
    if ("change" === domEventName) return targetInst;
  }
  var isInputEventSupported = false;
  if (canUseDOM) {
    var JSCompiler_inline_result$jscomp$318;
    if (canUseDOM) {
      var isSupported$jscomp$inline_474 = "oninput" in document;
      if (!isSupported$jscomp$inline_474) {
        var element$jscomp$inline_475 = document.createElement("div");
        element$jscomp$inline_475.setAttribute("oninput", "return;");
        isSupported$jscomp$inline_474 = "function" === typeof element$jscomp$inline_475.oninput;
      }
      JSCompiler_inline_result$jscomp$318 = isSupported$jscomp$inline_474;
    } else JSCompiler_inline_result$jscomp$318 = false;
    isInputEventSupported = JSCompiler_inline_result$jscomp$318 && (!document.documentMode || 9 < document.documentMode);
  }
  function stopWatchingForValueChange() {
    activeElement$1 && (activeElement$1.detachEvent("onpropertychange", handlePropertyChange), activeElementInst$1 = activeElement$1 = null);
  }
  function handlePropertyChange(nativeEvent) {
    if ("value" === nativeEvent.propertyName && getInstIfValueChanged(activeElementInst$1)) {
      var dispatchQueue = [];
      createAndAccumulateChangeEvent(
        dispatchQueue,
        activeElementInst$1,
        nativeEvent,
        getEventTarget(nativeEvent)
      );
      batchedUpdates$1(runEventInBatch, dispatchQueue);
    }
  }
  function handleEventsForInputEventPolyfill(domEventName, target, targetInst) {
    "focusin" === domEventName ? (stopWatchingForValueChange(), activeElement$1 = target, activeElementInst$1 = targetInst, activeElement$1.attachEvent("onpropertychange", handlePropertyChange)) : "focusout" === domEventName && stopWatchingForValueChange();
  }
  function getTargetInstForInputEventPolyfill(domEventName) {
    if ("selectionchange" === domEventName || "keyup" === domEventName || "keydown" === domEventName)
      return getInstIfValueChanged(activeElementInst$1);
  }
  function getTargetInstForClickEvent(domEventName, targetInst) {
    if ("click" === domEventName) return getInstIfValueChanged(targetInst);
  }
  function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
    if ("input" === domEventName || "change" === domEventName)
      return getInstIfValueChanged(targetInst);
  }
  function is(x, y) {
    return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
  }
  var objectIs = "function" === typeof Object.is ? Object.is : is;
  function shallowEqual(objA, objB) {
    if (objectIs(objA, objB)) return true;
    if ("object" !== typeof objA || null === objA || "object" !== typeof objB || null === objB)
      return false;
    var keysA = Object.keys(objA), keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (keysB = 0; keysB < keysA.length; keysB++) {
      var currentKey = keysA[keysB];
      if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey]))
        return false;
    }
    return true;
  }
  function getActiveElement(doc) {
    doc = doc || ("undefined" !== typeof document ? document : void 0);
    if ("undefined" === typeof doc) return null;
    try {
      return doc.activeElement || doc.body;
    } catch (e$20) {
      return doc.body;
    }
  }
  function getLeafNode(node) {
    for (; node && node.firstChild; ) node = node.firstChild;
    return node;
  }
  function getNodeForCharacterOffset(root2, offset) {
    var node = getLeafNode(root2);
    root2 = 0;
    for (var nodeEnd; node; ) {
      if (3 === node.nodeType) {
        nodeEnd = root2 + node.textContent.length;
        if (root2 <= offset && nodeEnd >= offset)
          return { node, offset: offset - root2 };
        root2 = nodeEnd;
      }
      a: {
        for (; node; ) {
          if (node.nextSibling) {
            node = node.nextSibling;
            break a;
          }
          node = node.parentNode;
        }
        node = void 0;
      }
      node = getLeafNode(node);
    }
  }
  function containsNode(outerNode, innerNode) {
    return outerNode && innerNode ? outerNode === innerNode ? true : outerNode && 3 === outerNode.nodeType ? false : innerNode && 3 === innerNode.nodeType ? containsNode(outerNode, innerNode.parentNode) : "contains" in outerNode ? outerNode.contains(innerNode) : outerNode.compareDocumentPosition ? !!(outerNode.compareDocumentPosition(innerNode) & 16) : false : false;
  }
  function getActiveElementDeep(containerInfo) {
    containerInfo = null != containerInfo && null != containerInfo.ownerDocument && null != containerInfo.ownerDocument.defaultView ? containerInfo.ownerDocument.defaultView : window;
    for (var element = getActiveElement(containerInfo.document); element instanceof containerInfo.HTMLIFrameElement; ) {
      try {
        var JSCompiler_inline_result = "string" === typeof element.contentWindow.location.href;
      } catch (err) {
        JSCompiler_inline_result = false;
      }
      if (JSCompiler_inline_result) containerInfo = element.contentWindow;
      else break;
      element = getActiveElement(containerInfo.document);
    }
    return element;
  }
  function hasSelectionCapabilities(elem) {
    var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
    return nodeName && ("input" === nodeName && ("text" === elem.type || "search" === elem.type || "tel" === elem.type || "url" === elem.type || "password" === elem.type) || "textarea" === nodeName || "true" === elem.contentEditable);
  }
  var skipSelectionChangeEvent = canUseDOM && "documentMode" in document && 11 >= document.documentMode, activeElement = null, activeElementInst = null, lastSelection = null, mouseDown = false;
  function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
    var doc = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget.document : 9 === nativeEventTarget.nodeType ? nativeEventTarget : nativeEventTarget.ownerDocument;
    mouseDown || null == activeElement || activeElement !== getActiveElement(doc) || (doc = activeElement, "selectionStart" in doc && hasSelectionCapabilities(doc) ? doc = { start: doc.selectionStart, end: doc.selectionEnd } : (doc = (doc.ownerDocument && doc.ownerDocument.defaultView || window).getSelection(), doc = {
      anchorNode: doc.anchorNode,
      anchorOffset: doc.anchorOffset,
      focusNode: doc.focusNode,
      focusOffset: doc.focusOffset
    }), lastSelection && shallowEqual(lastSelection, doc) || (lastSelection = doc, doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect"), 0 < doc.length && (nativeEvent = new SyntheticEvent(
      "onSelect",
      "select",
      null,
      nativeEvent,
      nativeEventTarget
    ), dispatchQueue.push({ event: nativeEvent, listeners: doc }), nativeEvent.target = activeElement)));
  }
  function makePrefixMap(styleProp, eventName) {
    var prefixes = {};
    prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
    prefixes["Webkit" + styleProp] = "webkit" + eventName;
    prefixes["Moz" + styleProp] = "moz" + eventName;
    return prefixes;
  }
  var vendorPrefixes = {
    animationend: makePrefixMap("Animation", "AnimationEnd"),
    animationiteration: makePrefixMap("Animation", "AnimationIteration"),
    animationstart: makePrefixMap("Animation", "AnimationStart"),
    transitionrun: makePrefixMap("Transition", "TransitionRun"),
    transitionstart: makePrefixMap("Transition", "TransitionStart"),
    transitioncancel: makePrefixMap("Transition", "TransitionCancel"),
    transitionend: makePrefixMap("Transition", "TransitionEnd")
  }, prefixedEventNames = {}, style = {};
  canUseDOM && (style = document.createElement("div").style, "AnimationEvent" in window || (delete vendorPrefixes.animationend.animation, delete vendorPrefixes.animationiteration.animation, delete vendorPrefixes.animationstart.animation), "TransitionEvent" in window || delete vendorPrefixes.transitionend.transition);
  function getVendorPrefixedEventName(eventName) {
    if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
    if (!vendorPrefixes[eventName]) return eventName;
    var prefixMap = vendorPrefixes[eventName], styleProp;
    for (styleProp in prefixMap)
      if (prefixMap.hasOwnProperty(styleProp) && styleProp in style)
        return prefixedEventNames[eventName] = prefixMap[styleProp];
    return eventName;
  }
  var ANIMATION_END = getVendorPrefixedEventName("animationend"), ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration"), ANIMATION_START = getVendorPrefixedEventName("animationstart"), TRANSITION_RUN = getVendorPrefixedEventName("transitionrun"), TRANSITION_START = getVendorPrefixedEventName("transitionstart"), TRANSITION_CANCEL = getVendorPrefixedEventName("transitioncancel"), TRANSITION_END = getVendorPrefixedEventName("transitionend"), topLevelEventsToReactNames = /* @__PURE__ */ new Map(), simpleEventPluginEvents = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  simpleEventPluginEvents.push("scrollEnd");
  function registerSimpleEvent(domEventName, reactName) {
    topLevelEventsToReactNames.set(domEventName, reactName);
    registerTwoPhaseEvent(reactName, [domEventName]);
  }
  var globalClientIdCounter$1 = 0;
  function getViewTransitionName(props, instance) {
    if (null != props.name && "auto" !== props.name) return props.name;
    if (null !== instance.autoName) return instance.autoName;
    props = pendingEffectsRoot.identifierPrefix;
    var globalClientId = globalClientIdCounter$1++;
    props = "_" + props + "t_" + globalClientId.toString(32) + "_";
    return instance.autoName = props;
  }
  function getClassNameByType(classByType) {
    if (null == classByType || "string" === typeof classByType)
      return classByType;
    var className = null, activeTypes = pendingTransitionTypes;
    if (null !== activeTypes)
      for (var i = 0; i < activeTypes.length; i++) {
        var match = classByType[activeTypes[i]];
        if (null != match) {
          if ("none" === match) return "none";
          className = null == className ? match : className + (" " + match);
        }
      }
    return null == className ? classByType.default : className;
  }
  function getViewTransitionClassName(defaultClass, eventClass) {
    defaultClass = getClassNameByType(defaultClass);
    eventClass = getClassNameByType(eventClass);
    return null == eventClass ? "auto" === defaultClass ? null : defaultClass : "auto" === eventClass ? null : eventClass;
  }
  var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
    if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
      var event = new window.ErrorEvent("error", {
        bubbles: true,
        cancelable: true,
        message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
        error
      });
      if (!window.dispatchEvent(event)) return;
    } else if ("object" === typeof process && "function" === typeof process.emit) {
      process.emit("uncaughtException", error);
      return;
    }
    console.error(error);
  }, concurrentQueues = [], concurrentQueuesIndex = 0, concurrentlyUpdatedLanes = 0;
  function finishQueueingConcurrentUpdates() {
    for (var endIndex = concurrentQueuesIndex, i = concurrentlyUpdatedLanes = concurrentQueuesIndex = 0; i < endIndex; ) {
      var fiber = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var queue = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var update = concurrentQueues[i];
      concurrentQueues[i++] = null;
      var lane = concurrentQueues[i];
      concurrentQueues[i++] = null;
      if (null !== queue && null !== update) {
        var pending = queue.pending;
        null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
        queue.pending = update;
      }
      0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
    }
  }
  function enqueueUpdate$1(fiber, queue, update, lane) {
    concurrentQueues[concurrentQueuesIndex++] = fiber;
    concurrentQueues[concurrentQueuesIndex++] = queue;
    concurrentQueues[concurrentQueuesIndex++] = update;
    concurrentQueues[concurrentQueuesIndex++] = lane;
    concurrentlyUpdatedLanes |= lane;
    fiber.lanes |= lane;
    fiber = fiber.alternate;
    null !== fiber && (fiber.lanes |= lane);
  }
  function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
    enqueueUpdate$1(fiber, queue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function enqueueConcurrentRenderForLane(fiber, lane) {
    enqueueUpdate$1(fiber, null, null, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
    sourceFiber.lanes |= lane;
    var alternate = sourceFiber.alternate;
    null !== alternate && (alternate.lanes |= lane);
    for (var isHidden = false, parent = sourceFiber.return; null !== parent; )
      parent.childLanes |= lane, alternate = parent.alternate, null !== alternate && (alternate.childLanes |= lane), 22 === parent.tag && (sourceFiber = parent.stateNode, null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = true)), sourceFiber = parent, parent = parent.return;
    return 3 === sourceFiber.tag ? (parent = sourceFiber.stateNode, isHidden && null !== update && (isHidden = 31 - clz32(lane), sourceFiber = parent.hiddenUpdates, alternate = sourceFiber[isHidden], null === alternate ? sourceFiber[isHidden] = [update] : alternate.push(update), update.lane = lane | 536870912), parent) : null;
  }
  function getRootForUpdatedFiber(sourceFiber) {
    if (50 < nestedUpdateCount)
      throw nestedUpdateCount = 0, rootWithNestedUpdates = null, Error(formatProdErrorMessage(185));
    for (var parent = sourceFiber.return; null !== parent; )
      sourceFiber = parent, parent = sourceFiber.return;
    return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
  }
  var emptyContextObject = {};
  function FiberNode(tag, pendingProps, key, mode) {
    this.tag = tag;
    this.key = key;
    this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
    this.index = 0;
    this.refCleanup = this.ref = null;
    this.pendingProps = pendingProps;
    this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
    this.mode = mode;
    this.subtreeFlags = this.flags = 0;
    this.deletions = null;
    this.childLanes = this.lanes = 0;
    this.alternate = null;
  }
  function createFiberImplClass(tag, pendingProps, key, mode) {
    return new FiberNode(tag, pendingProps, key, mode);
  }
  function shouldConstruct(Component) {
    Component = Component.prototype;
    return !(!Component || !Component.isReactComponent);
  }
  function createWorkInProgress(current, pendingProps) {
    var workInProgress2 = current.alternate;
    null === workInProgress2 ? (workInProgress2 = createFiberImplClass(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    ), workInProgress2.elementType = current.elementType, workInProgress2.type = current.type, workInProgress2.stateNode = current.stateNode, workInProgress2.alternate = current, current.alternate = workInProgress2) : (workInProgress2.pendingProps = pendingProps, workInProgress2.type = current.type, workInProgress2.flags = 0, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null);
    workInProgress2.flags = current.flags & 1206910976;
    workInProgress2.childLanes = current.childLanes;
    workInProgress2.lanes = current.lanes;
    workInProgress2.child = current.child;
    workInProgress2.memoizedProps = current.memoizedProps;
    workInProgress2.memoizedState = current.memoizedState;
    workInProgress2.updateQueue = current.updateQueue;
    pendingProps = current.dependencies;
    workInProgress2.dependencies = null === pendingProps ? null : { lanes: pendingProps.lanes, firstContext: pendingProps.firstContext };
    workInProgress2.sibling = current.sibling;
    workInProgress2.index = current.index;
    workInProgress2.ref = current.ref;
    workInProgress2.refCleanup = current.refCleanup;
    return workInProgress2;
  }
  function resetWorkInProgress(workInProgress2, renderLanes2) {
    workInProgress2.flags &= 1206910978;
    var current = workInProgress2.alternate;
    null === current ? (workInProgress2.childLanes = 0, workInProgress2.lanes = renderLanes2, workInProgress2.child = null, workInProgress2.subtreeFlags = 0, workInProgress2.memoizedProps = null, workInProgress2.memoizedState = null, workInProgress2.updateQueue = null, workInProgress2.dependencies = null, workInProgress2.stateNode = null) : (workInProgress2.childLanes = current.childLanes, workInProgress2.lanes = current.lanes, workInProgress2.child = current.child, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null, workInProgress2.memoizedProps = current.memoizedProps, workInProgress2.memoizedState = current.memoizedState, workInProgress2.updateQueue = current.updateQueue, workInProgress2.type = current.type, renderLanes2 = current.dependencies, workInProgress2.dependencies = null === renderLanes2 ? null : {
      lanes: renderLanes2.lanes,
      firstContext: renderLanes2.firstContext
    });
    return workInProgress2;
  }
  function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
    var fiberTag = 0;
    owner = type;
    if ("function" === typeof owner) shouldConstruct(owner) && (fiberTag = 1);
    else if ("string" === typeof owner)
      fiberTag = isHostHoistableType(
        type,
        pendingProps,
        contextStackCursor.current
      ) ? 26 : "html" === type || "head" === type || "body" === type ? 27 : 5;
    else
      a: switch (owner) {
        case REACT_ACTIVITY_TYPE:
          return type = createFiberImplClass(31, pendingProps, key, mode), type.elementType = REACT_ACTIVITY_TYPE, type.lanes = lanes, type;
        case REACT_FRAGMENT_TYPE:
          return createFiberFromFragment(pendingProps.children, mode, lanes, key);
        case REACT_STRICT_MODE_TYPE:
          fiberTag = 8;
          mode |= 24;
          break;
        case REACT_PROFILER_TYPE:
          return type = createFiberImplClass(12, pendingProps, key, mode | 2), type.elementType = REACT_PROFILER_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_TYPE:
          return type = createFiberImplClass(13, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_TYPE, type.lanes = lanes, type;
        case REACT_SUSPENSE_LIST_TYPE:
          return type = createFiberImplClass(19, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_LIST_TYPE, type.lanes = lanes, type;
        case REACT_LEGACY_HIDDEN_TYPE:
        case REACT_VIEW_TRANSITION_TYPE:
          return type = mode | 32, type = createFiberImplClass(30, pendingProps, key, type), type.elementType = REACT_VIEW_TRANSITION_TYPE, type.lanes = lanes, type.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }, type;
        default:
          if ("object" === typeof owner && null !== owner)
            switch (owner.$$typeof) {
              case REACT_CONTEXT_TYPE:
                fiberTag = 10;
                break a;
              case REACT_CONSUMER_TYPE:
                fiberTag = 9;
                break a;
              case REACT_FORWARD_REF_TYPE:
                fiberTag = 11;
                break a;
              case REACT_MEMO_TYPE:
                fiberTag = 14;
                break a;
              case REACT_LAZY_TYPE:
                fiberTag = 16;
                owner = null;
                break a;
            }
          fiberTag = 29;
          pendingProps = Error(
            formatProdErrorMessage(130, null === type ? "null" : typeof type, "")
          );
          owner = null;
      }
    key = createFiberImplClass(fiberTag, pendingProps, key, mode);
    key.elementType = type;
    key.type = owner;
    key.lanes = lanes;
    return key;
  }
  function createFiberFromFragment(elements, mode, lanes, key) {
    elements = createFiberImplClass(7, elements, key, mode);
    elements.lanes = lanes;
    return elements;
  }
  function createFiberFromText(content, mode, lanes) {
    content = createFiberImplClass(6, content, null, mode);
    content.lanes = lanes;
    return content;
  }
  function createFiberFromDehydratedFragment(dehydratedNode) {
    var fiber = createFiberImplClass(18, null, null, 0);
    fiber.stateNode = dehydratedNode;
    return fiber;
  }
  function createFiberFromPortal(portal, mode, lanes) {
    mode = createFiberImplClass(
      4,
      null !== portal.children ? portal.children : [],
      portal.key,
      mode
    );
    mode.lanes = lanes;
    mode.stateNode = {
      containerInfo: portal.containerInfo,
      pendingChildren: null,
      implementation: portal.implementation
    };
    return mode;
  }
  var CapturedStacks = /* @__PURE__ */ new WeakMap();
  function createCapturedValueAtFiber(value, source) {
    if ("object" === typeof value && null !== value) {
      var existing = CapturedStacks.get(value);
      if (void 0 !== existing) return existing;
      source = {
        value,
        source,
        stack: getStackByFiberInDevAndProd(source)
      };
      CapturedStacks.set(value, source);
      return source;
    }
    return {
      value,
      source,
      stack: getStackByFiberInDevAndProd(source)
    };
  }
  var forkStack = [], forkStackIndex = 0, treeForkProvider = null, treeForkCount = 0, idStack = [], idStackIndex = 0, treeContextProvider = null, treeContextId = 1, treeContextOverflow = "";
  function pushTreeFork(workInProgress2, totalChildren) {
    forkStack[forkStackIndex++] = treeForkCount;
    forkStack[forkStackIndex++] = treeForkProvider;
    treeForkProvider = workInProgress2;
    treeForkCount = totalChildren;
  }
  function pushTreeId(workInProgress2, totalChildren, index2) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextProvider = workInProgress2;
    var baseIdWithLeadingBit = treeContextId;
    workInProgress2 = treeContextOverflow;
    var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
    baseIdWithLeadingBit &= ~(1 << baseLength);
    index2 += 1;
    var length = 32 - clz32(totalChildren) + baseLength;
    if (30 < length) {
      var numberOfOverflowBits = baseLength - baseLength % 5;
      length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
      baseIdWithLeadingBit >>= numberOfOverflowBits;
      baseLength -= numberOfOverflowBits;
      treeContextId = 1 << 32 - clz32(totalChildren) + baseLength | index2 << baseLength | baseIdWithLeadingBit;
      treeContextOverflow = length + workInProgress2;
    } else
      treeContextId = 1 << length | index2 << baseLength | baseIdWithLeadingBit, treeContextOverflow = workInProgress2;
  }
  function pushMaterializedTreeId(workInProgress2) {
    null !== workInProgress2.return && (pushTreeFork(workInProgress2, 1), pushTreeId(workInProgress2, 1, 0));
  }
  function popTreeContext(workInProgress2) {
    for (; workInProgress2 === treeForkProvider; )
      treeForkProvider = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null, treeForkCount = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null;
    for (; workInProgress2 === treeContextProvider; )
      treeContextProvider = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextOverflow = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextId = idStack[--idStackIndex], idStack[idStackIndex] = null;
  }
  function restoreSuspendedTreeContext(workInProgress2, suspendedContext) {
    idStack[idStackIndex++] = treeContextId;
    idStack[idStackIndex++] = treeContextOverflow;
    idStack[idStackIndex++] = treeContextProvider;
    treeContextId = suspendedContext.id;
    treeContextOverflow = suspendedContext.overflow;
    treeContextProvider = workInProgress2;
  }
  var hydrationParentFiber = null, nextHydratableInstance = null, isHydrating = false, hydrationErrors = null, rootOrSingletonContext = false, HydrationMismatchException = Error(formatProdErrorMessage(519));
  function throwOnHydrationMismatch(fiber) {
    var error = Error(
      formatProdErrorMessage(
        418,
        1 < arguments.length && void 0 !== arguments[1] && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    queueHydrationError(createCapturedValueAtFiber(error, fiber));
    throw HydrationMismatchException;
  }
  function prepareToHydrateHostInstance(fiber) {
    var instance = fiber.stateNode, type = fiber.type, props = fiber.memoizedProps;
    instance[internalInstanceKey] = fiber;
    instance[internalPropsKey] = props;
    switch (type) {
      case "dialog":
        listenToNonDelegatedEvent("cancel", instance);
        listenToNonDelegatedEvent("close", instance);
        break;
      case "iframe":
      case "object":
      case "embed":
        listenToNonDelegatedEvent("load", instance);
        break;
      case "video":
      case "audio":
        for (type = 0; type < mediaEventTypes.length; type++)
          listenToNonDelegatedEvent(mediaEventTypes[type], instance);
        break;
      case "source":
        listenToNonDelegatedEvent("error", instance);
        break;
      case "img":
      case "image":
      case "link":
        listenToNonDelegatedEvent("error", instance);
        listenToNonDelegatedEvent("load", instance);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", instance);
        break;
      case "input":
        listenToNonDelegatedEvent("invalid", instance);
        initInput(
          instance,
          props.value,
          props.defaultValue,
          props.checked,
          props.defaultChecked,
          props.type,
          props.name,
          true
        );
        break;
      case "select":
        listenToNonDelegatedEvent("invalid", instance);
        break;
      case "textarea":
        listenToNonDelegatedEvent("invalid", instance), initTextarea(instance, props.value, props.defaultValue, props.children);
    }
    type = props.children;
    "string" !== typeof type && "number" !== typeof type && "bigint" !== typeof type || instance.textContent === "" + type || true === props.suppressHydrationWarning || checkForUnmatchedText(instance.textContent, type) ? (null != props.popover && (listenToNonDelegatedEvent("beforetoggle", instance), listenToNonDelegatedEvent("toggle", instance)), null != props.onScroll && listenToNonDelegatedEvent("scroll", instance), null != props.onScrollEnd && listenToNonDelegatedEvent("scrollend", instance), null != props.onClick && (instance.onclick = noop$1), instance = true) : instance = false;
    instance || throwOnHydrationMismatch(fiber, true);
  }
  function popToNextHostParent(fiber) {
    for (hydrationParentFiber = fiber.return; hydrationParentFiber; )
      switch (hydrationParentFiber.tag) {
        case 5:
        case 31:
        case 13:
          rootOrSingletonContext = false;
          return;
        case 27:
        case 3:
          rootOrSingletonContext = true;
          return;
        default:
          hydrationParentFiber = hydrationParentFiber.return;
      }
  }
  function popHydrationState(fiber) {
    if (fiber !== hydrationParentFiber) return false;
    if (!isHydrating) return popToNextHostParent(fiber), isHydrating = true, false;
    var tag = fiber.tag, JSCompiler_temp;
    if (JSCompiler_temp = 3 !== tag && 27 !== tag) {
      if (JSCompiler_temp = 5 === tag)
        JSCompiler_temp = fiber.type, JSCompiler_temp = !("form" !== JSCompiler_temp && "button" !== JSCompiler_temp) || shouldSetTextContent(fiber.type, fiber.memoizedProps);
      JSCompiler_temp = !JSCompiler_temp;
    }
    JSCompiler_temp && nextHydratableInstance && throwOnHydrationMismatch(fiber);
    popToNextHostParent(fiber);
    if (13 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else if (31 === tag) {
      fiber = fiber.memoizedState;
      fiber = null !== fiber ? fiber.dehydrated : null;
      if (!fiber) throw Error(formatProdErrorMessage(317));
      nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
    } else
      27 === tag ? (tag = nextHydratableInstance, isSingletonScope(fiber.type) ? (fiber = previousHydratableOnEnteringScopedSingleton, previousHydratableOnEnteringScopedSingleton = null, nextHydratableInstance = fiber) : nextHydratableInstance = tag) : nextHydratableInstance = hydrationParentFiber ? getNextHydratable(fiber.stateNode.nextSibling) : null;
    return true;
  }
  function resetHydrationState() {
    nextHydratableInstance = hydrationParentFiber = null;
    isHydrating = false;
  }
  function upgradeHydrationErrorsToRecoverable() {
    var queuedErrors = hydrationErrors;
    null !== queuedErrors && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = queuedErrors : workInProgressRootRecoverableErrors.push.apply(
      workInProgressRootRecoverableErrors,
      queuedErrors
    ), hydrationErrors = null);
    return queuedErrors;
  }
  function queueHydrationError(error) {
    null === hydrationErrors ? hydrationErrors = [error] : hydrationErrors.push(error);
  }
  var valueCursor = createCursor(null), currentlyRenderingFiber$1 = null, lastContextDependency = null;
  function pushProvider(providerFiber, context, nextValue) {
    push(valueCursor, context._currentValue);
    context._currentValue = nextValue;
  }
  function popProvider(context) {
    context._currentValue = valueCursor.current;
    pop(valueCursor);
  }
  function scheduleContextWorkOnParentPath(parent, renderLanes2, propagationRoot) {
    for (; null !== parent; ) {
      var alternate = parent.alternate;
      (parent.childLanes & renderLanes2) !== renderLanes2 ? (parent.childLanes |= renderLanes2, null !== alternate && (alternate.childLanes |= renderLanes2)) : null !== alternate && (alternate.childLanes & renderLanes2) !== renderLanes2 && (alternate.childLanes |= renderLanes2);
      if (parent === propagationRoot) break;
      parent = parent.return;
    }
  }
  function propagateContextChanges(workInProgress2, contexts, renderLanes2, forcePropagateEntireTree) {
    var fiber = workInProgress2.child;
    null !== fiber && (fiber.return = workInProgress2);
    for (; null !== fiber; ) {
      var list = fiber.dependencies;
      if (null !== list) {
        var nextFiber = fiber.child;
        list = list.firstContext;
        a: for (; null !== list; ) {
          var dependency = list;
          list = fiber;
          for (var i = 0; i < contexts.length; i++)
            if (dependency.context === contexts[i]) {
              list.lanes |= renderLanes2;
              dependency = list.alternate;
              null !== dependency && (dependency.lanes |= renderLanes2);
              scheduleContextWorkOnParentPath(
                list.return,
                renderLanes2,
                workInProgress2
              );
              forcePropagateEntireTree || (nextFiber = null);
              break a;
            }
          list = dependency.next;
        }
      } else if (18 === fiber.tag) {
        nextFiber = fiber.return;
        if (null === nextFiber) throw Error(formatProdErrorMessage(341));
        nextFiber.lanes |= renderLanes2;
        list = nextFiber.alternate;
        null !== list && (list.lanes |= renderLanes2);
        scheduleContextWorkOnParentPath(nextFiber, renderLanes2, workInProgress2);
        nextFiber = null;
      } else
        13 === fiber.tag && null !== fiber.memoizedState && null === fiber.memoizedState.dehydrated ? (fiber.lanes |= renderLanes2, nextFiber = fiber.alternate, null !== nextFiber && (nextFiber.lanes |= renderLanes2), scheduleContextWorkOnParentPath(
          fiber.return,
          renderLanes2,
          workInProgress2
        ), nextFiber = fiber.child, nextFiber = null !== nextFiber ? nextFiber.sibling : null) : nextFiber = fiber.child;
      if (null !== nextFiber) nextFiber.return = fiber;
      else
        for (nextFiber = fiber; null !== nextFiber; ) {
          if (nextFiber === workInProgress2) {
            nextFiber = null;
            break;
          }
          fiber = nextFiber.sibling;
          if (null !== fiber) {
            fiber.return = nextFiber.return;
            nextFiber = fiber;
            break;
          }
          nextFiber = nextFiber.return;
        }
      fiber = nextFiber;
    }
  }
  function propagateParentContextChanges(current, workInProgress2, renderLanes2, forcePropagateEntireTree) {
    current = null;
    for (var parent = workInProgress2, isInsidePropagationBailout = false; null !== parent; ) {
      if (!isInsidePropagationBailout) {
        if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = true;
        else if (0 !== (parent.flags & 262144)) break;
      }
      if (10 === parent.tag) {
        var currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent = currentParent.memoizedProps;
        if (null !== currentParent) {
          var context = parent.type;
          objectIs(parent.pendingProps.value, currentParent.value) || (null !== current ? current.push(context) : current = [context]);
        }
      } else if (parent === hostTransitionProviderCursor.current) {
        currentParent = parent.alternate;
        if (null === currentParent) throw Error(formatProdErrorMessage(387));
        currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState && (null !== current ? current.push(HostTransitionContext) : current = [HostTransitionContext]);
      }
      parent = parent.return;
    }
    null !== current && propagateContextChanges(
      workInProgress2,
      current,
      renderLanes2,
      forcePropagateEntireTree
    );
    workInProgress2.flags |= 262144;
    return null !== current;
  }
  function checkIfContextChanged(currentDependencies) {
    for (currentDependencies = currentDependencies.firstContext; null !== currentDependencies; ) {
      if (!objectIs(
        currentDependencies.context._currentValue,
        currentDependencies.memoizedValue
      ))
        return true;
      currentDependencies = currentDependencies.next;
    }
    return false;
  }
  function prepareToReadContext(workInProgress2) {
    currentlyRenderingFiber$1 = workInProgress2;
    lastContextDependency = null;
    workInProgress2 = workInProgress2.dependencies;
    null !== workInProgress2 && (workInProgress2.firstContext = null);
  }
  function readContext(context) {
    return readContextForConsumer(currentlyRenderingFiber$1, context);
  }
  function readContextDuringReconciliation(consumer, context) {
    null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
    return readContextForConsumer(consumer, context);
  }
  function readContextForConsumer(consumer, context) {
    var value = context._currentValue;
    context = { context, memoizedValue: value, next: null };
    if (null === lastContextDependency) {
      if (null === consumer) throw Error(formatProdErrorMessage(308));
      lastContextDependency = context;
      consumer.dependencies = { lanes: 0, firstContext: context };
      consumer.flags |= 524288;
    } else lastContextDependency = lastContextDependency.next = context;
    return value;
  }
  var AbortControllerLocal = "undefined" !== typeof AbortController ? AbortController : function() {
    var listeners = [], signal = this.signal = {
      aborted: false,
      addEventListener: function(type, listener) {
        listeners.push(listener);
      }
    };
    this.abort = function() {
      signal.aborted = true;
      listeners.forEach(function(listener) {
        return listener();
      });
    };
  }, scheduleCallback$2 = Scheduler.unstable_scheduleCallback, NormalPriority = Scheduler.unstable_NormalPriority, CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function createCache() {
    return {
      controller: new AbortControllerLocal(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function releaseCache(cache) {
    cache.refCount--;
    0 === cache.refCount && scheduleCallback$2(NormalPriority, function() {
      cache.controller.abort();
    });
  }
  function queueTransitionTypes(root2, transitionTypes) {
    if (0 !== (root2.pendingLanes & 4194048)) {
      var queued = root2.transitionTypes;
      null === queued && (queued = root2.transitionTypes = []);
      for (root2 = 0; root2 < transitionTypes.length; root2++) {
        var transitionType = transitionTypes[root2];
        -1 === queued.indexOf(transitionType) && queued.push(transitionType);
      }
    }
  }
  var entangledTransitionTypes = null;
  function claimQueuedTransitionTypes(root2) {
    var claimed = root2.transitionTypes;
    root2.transitionTypes = null;
    return claimed;
  }
  var currentEntangledListeners = null, currentEntangledPendingCount = 0, currentEntangledLane = 0, currentEntangledActionThenable = null;
  function entangleAsyncAction(transition, thenable) {
    if (null === currentEntangledListeners) {
      var entangledListeners = currentEntangledListeners = [];
      currentEntangledPendingCount = 0;
      currentEntangledLane = requestTransitionLane();
      currentEntangledActionThenable = {
        status: "pending",
        value: void 0,
        then: function(resolve) {
          entangledListeners.push(resolve);
        }
      };
    }
    currentEntangledPendingCount++;
    thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
    return thenable;
  }
  function pingEngtangledActionScope() {
    if (0 === --currentEntangledPendingCount && (entangledTransitionTypes = null, null !== currentEntangledListeners)) {
      null !== currentEntangledActionThenable && (currentEntangledActionThenable.status = "fulfilled");
      var listeners = currentEntangledListeners;
      currentEntangledListeners = null;
      currentEntangledLane = 0;
      currentEntangledActionThenable = null;
      for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
    }
  }
  function chainThenableValue(thenable, result) {
    var listeners = [], thenableWithOverride = {
      status: "pending",
      value: null,
      reason: null,
      then: function(resolve) {
        listeners.push(resolve);
      }
    };
    thenable.then(
      function() {
        thenableWithOverride.status = "fulfilled";
        thenableWithOverride.value = result;
        for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
      },
      function(error) {
        thenableWithOverride.status = "rejected";
        thenableWithOverride.reason = error;
        for (error = 0; error < listeners.length; error++)
          (0, listeners[error])(void 0);
      }
    );
    return thenableWithOverride;
  }
  var prevOnStartTransitionFinish = ReactSharedInternals.S;
  ReactSharedInternals.S = function(transition, returnValue) {
    globalMostRecentTransitionTime = now();
    "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && entangleAsyncAction(transition, returnValue);
    if (null !== entangledTransitionTypes)
      for (var root$28 = firstScheduledRoot; null !== root$28; )
        queueTransitionTypes(root$28, entangledTransitionTypes), root$28 = root$28.next;
    root$28 = transition.types;
    if (null !== root$28) {
      for (var root$29 = firstScheduledRoot; null !== root$29; )
        queueTransitionTypes(root$29, root$28), root$29 = root$29.next;
      if (0 !== currentEntangledLane) {
        root$29 = entangledTransitionTypes;
        null === root$29 && (root$29 = entangledTransitionTypes = []);
        for (var i = 0; i < root$28.length; i++) {
          var transitionType = root$28[i];
          -1 === root$29.indexOf(transitionType) && root$29.push(transitionType);
        }
      }
    }
    null !== prevOnStartTransitionFinish && prevOnStartTransitionFinish(transition, returnValue);
  };
  var resumedCache = createCursor(null);
  function peekCacheFromPool() {
    var cacheResumedFromPreviousRender = resumedCache.current;
    return null !== cacheResumedFromPreviousRender ? cacheResumedFromPreviousRender : workInProgressRoot.pooledCache;
  }
  function pushTransition(offscreenWorkInProgress, prevCachePool) {
    null === prevCachePool ? push(resumedCache, resumedCache.current) : push(resumedCache, prevCachePool.pool);
  }
  function getSuspendedCache() {
    var cacheFromPool = peekCacheFromPool();
    return null === cacheFromPool ? null : { parent: CacheContext._currentValue, pool: cacheFromPool };
  }
  var SuspenseException = Error(formatProdErrorMessage(460)), SuspenseyCommitException = Error(formatProdErrorMessage(474)), SuspenseActionException = Error(formatProdErrorMessage(542)), noopSuspenseyCommitThenable = { then: function() {
  } };
  function isThenableResolved(thenable) {
    thenable = thenable.status;
    return "fulfilled" === thenable || "rejected" === thenable;
  }
  function trackUsedThenable(thenableState2, thenable, index2) {
    index2 = thenableState2[index2];
    void 0 === index2 ? thenableState2.push(thenable) : index2 !== thenable && (thenable.then(noop$1, noop$1), thenable = index2);
    switch (thenable.status) {
      case "fulfilled":
        return thenable.value;
      case "rejected":
        thenableState2 = thenable.reason;
        checkIfUseWrappedInAsyncCatch(thenableState2);
        if (void 0 === thenableState2 && !("reason" in thenable))
          throw Error(formatProdErrorMessage(600));
        throw thenableState2;
      default:
        if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
        else {
          thenableState2 = workInProgressRoot;
          if (null !== thenableState2 && 100 < thenableState2.shellSuspendCounter)
            throw Error(formatProdErrorMessage(482));
          thenableState2 = thenable;
          thenableState2.status = "pending";
          thenableState2.then(
            function(fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function(error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          );
        }
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
        }
        suspendedThenable = thenable;
        throw SuspenseException;
    }
  }
  function resolveLazy(lazyType) {
    try {
      var init = lazyType._init;
      return init(lazyType._payload);
    } catch (x) {
      if (null !== x && "object" === typeof x && "function" === typeof x.then)
        throw suspendedThenable = x, SuspenseException;
      throw x;
    }
  }
  var suspendedThenable = null;
  function getSuspendedThenable() {
    if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
    var thenable = suspendedThenable;
    suspendedThenable = null;
    return thenable;
  }
  function checkIfUseWrappedInAsyncCatch(rejectedReason) {
    if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException)
      throw Error(formatProdErrorMessage(483));
  }
  var thenableState$1 = null, thenableIndexCounter$1 = 0;
  function unwrapThenable(thenable) {
    var index2 = thenableIndexCounter$1;
    thenableIndexCounter$1 += 1;
    null === thenableState$1 && (thenableState$1 = []);
    return trackUsedThenable(thenableState$1, thenable, index2);
  }
  function coerceRef(workInProgress2, element) {
    element = element.props.ref;
    workInProgress2.ref = void 0 !== element ? element : null;
  }
  function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
    if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
      throw Error(formatProdErrorMessage(525));
    returnFiber = Object.prototype.toString.call(newChild);
    throw Error(
      formatProdErrorMessage(
        31,
        "[object Object]" === returnFiber ? "object with keys {" + Object.keys(newChild).join(", ") + "}" : returnFiber
      )
    );
  }
  function createChildReconciler(shouldTrackSideEffects) {
    function deleteChild(returnFiber, childToDelete) {
      if (shouldTrackSideEffects) {
        var deletions = returnFiber.deletions;
        null === deletions ? (returnFiber.deletions = [childToDelete], returnFiber.flags |= 16) : deletions.push(childToDelete);
      }
    }
    function deleteRemainingChildren(returnFiber, currentFirstChild) {
      if (!shouldTrackSideEffects) return null;
      for (; null !== currentFirstChild; )
        deleteChild(returnFiber, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return null;
    }
    function mapRemainingChildren(currentFirstChild) {
      for (var existingChildren = /* @__PURE__ */ new Map(); null !== currentFirstChild; )
        null === currentFirstChild.key ? existingChildren.set(currentFirstChild.index, currentFirstChild) : existingChildren.set(currentFirstChild.key, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
      return existingChildren;
    }
    function useFiber(fiber, pendingProps) {
      fiber = createWorkInProgress(fiber, pendingProps);
      fiber.index = 0;
      fiber.sibling = null;
      return fiber;
    }
    function placeChild(newFiber, lastPlacedIndex, newIndex) {
      newFiber.index = newIndex;
      if (!shouldTrackSideEffects)
        return newFiber.flags |= 1048576, lastPlacedIndex;
      newIndex = newFiber.alternate;
      if (null !== newIndex)
        return newIndex = newIndex.index, newIndex < lastPlacedIndex ? (newFiber.flags |= 2, lastPlacedIndex) : newIndex;
      newFiber.flags |= 134217730;
      return lastPlacedIndex;
    }
    function placeSingleChild(newFiber) {
      shouldTrackSideEffects && null === newFiber.alternate && (newFiber.flags |= 134217730);
      return newFiber;
    }
    function updateTextNode(returnFiber, current, textContent, lanes) {
      if (null === current || 6 !== current.tag)
        return current = createFiberFromText(textContent, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, textContent);
      current.return = returnFiber;
      return current;
    }
    function updateElement(returnFiber, current, element, lanes) {
      var elementType = element.type;
      if (elementType === REACT_FRAGMENT_TYPE)
        return returnFiber = updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        ), coerceRef(returnFiber, element), returnFiber;
      if (null !== current && (current.elementType === elementType || "object" === typeof elementType && null !== elementType && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === current.type))
        return current = useFiber(current, element.props), coerceRef(current, element), current.return = returnFiber, current;
      current = createFiberFromTypeAndProps(
        element.type,
        element.key,
        element.props,
        null,
        returnFiber.mode,
        lanes
      );
      coerceRef(current, element);
      current.return = returnFiber;
      return current;
    }
    function updatePortal(returnFiber, current, portal, lanes) {
      if (null === current || 4 !== current.tag || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation)
        return current = createFiberFromPortal(portal, returnFiber.mode, lanes), current.return = returnFiber, current;
      current = useFiber(current, portal.children || []);
      current.return = returnFiber;
      return current;
    }
    function updateFragment(returnFiber, current, fragment, lanes, key) {
      if (null === current || 7 !== current.tag)
        return current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        ), current.return = returnFiber, current;
      current = useFiber(current, fragment);
      current.return = returnFiber;
      return current;
    }
    function createChild(returnFiber, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          lanes
        ), newChild.return = returnFiber, newChild;
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return lanes = createFiberFromTypeAndProps(
              newChild.type,
              newChild.key,
              newChild.props,
              null,
              returnFiber.mode,
              lanes
            ), coerceRef(lanes, newChild), lanes.return = returnFiber, lanes;
          case REACT_PORTAL_TYPE:
            return newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              lanes
            ), newChild.return = returnFiber, newChild;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), createChild(returnFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            lanes,
            null
          ), newChild.return = returnFiber, newChild;
        if ("function" === typeof newChild.then)
          return createChild(returnFiber, unwrapThenable(newChild), lanes);
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return createChild(
            returnFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateSlot(returnFiber, oldFiber, newChild, lanes) {
      var key = null !== oldFiber ? oldFiber.key : null;
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return null !== key ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return newChild.key === key ? updateElement(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_PORTAL_TYPE:
            return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateSlot(returnFiber, oldFiber, newChild, lanes);
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return null !== key ? null : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateSlot(
            returnFiber,
            oldFiber,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateSlot(
            returnFiber,
            oldFiber,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
      if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild)
        return existingChildren = existingChildren.get(newIdx) || null, updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updateElement(returnFiber, existingChildren, newChild, lanes);
          case REACT_PORTAL_TYPE:
            return existingChildren = existingChildren.get(
              null === newChild.key ? newIdx : newChild.key
            ) || null, updatePortal(returnFiber, existingChildren, newChild, lanes);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), updateFromMap(
              existingChildren,
              returnFiber,
              newIdx,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild) || getIteratorFn(newChild))
          return existingChildren = existingChildren.get(newIdx) || null, updateFragment(returnFiber, existingChildren, newChild, lanes, null);
        if ("function" === typeof newChild.then)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return null;
    }
    function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null; null !== oldFiber && newIdx < newChildren.length; newIdx++) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(
          returnFiber,
          oldFiber,
          newChildren[newIdx],
          lanes
        );
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (newIdx === newChildren.length)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; newIdx < newChildren.length; newIdx++)
          oldFiber = createChild(returnFiber, newChildren[newIdx], lanes), null !== oldFiber && (currentFirstChild = placeChild(
            oldFiber,
            currentFirstChild,
            newIdx
          ), null === previousNewFiber ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); newIdx < newChildren.length; newIdx++)
        nextOldFiber = updateFromMap(
          oldFiber,
          returnFiber,
          newIdx,
          newChildren[newIdx],
          lanes
        ), null !== nextOldFiber && (shouldTrackSideEffects && (newFiber = nextOldFiber.alternate, null !== newFiber && oldFiber.delete(null === newFiber.key ? newIdx : newFiber.key)), currentFirstChild = placeChild(
          nextOldFiber,
          currentFirstChild,
          newIdx
        ), null === previousNewFiber ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
      if (null == newChildren) throw Error(formatProdErrorMessage(151));
      for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null, step = newChildren.next(); null !== oldFiber && !step.done; newIdx++, step = newChildren.next()) {
        oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
        var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
        if (null === newFiber) {
          null === oldFiber && (oldFiber = nextOldFiber);
          break;
        }
        shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
        currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
        null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
        previousNewFiber = newFiber;
        oldFiber = nextOldFiber;
      }
      if (step.done)
        return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
      if (null === oldFiber) {
        for (; !step.done; newIdx++, step = newChildren.next())
          step = createChild(returnFiber, step.value, lanes), null !== step && (currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      for (oldFiber = mapRemainingChildren(oldFiber); !step.done; newIdx++, step = newChildren.next())
        step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes), null !== step && (shouldTrackSideEffects && (nextOldFiber = step.alternate, null !== nextOldFiber && oldFiber.delete(
          null === nextOldFiber.key ? newIdx : nextOldFiber.key
        )), currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
      shouldTrackSideEffects && oldFiber.forEach(function(child) {
        return deleteChild(returnFiber, child);
      });
      isHydrating && pushTreeFork(returnFiber, newIdx);
      return resultingFirstChild;
    }
    function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
      "object" === typeof newChild && null !== newChild && newChild.type === REACT_FRAGMENT_TYPE && null === newChild.key && void 0 === newChild.props.ref && (newChild = newChild.props.children);
      if ("object" === typeof newChild && null !== newChild) {
        switch (newChild.$$typeof) {
          case REACT_ELEMENT_TYPE:
            a: {
              for (var key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key) {
                  key = newChild.type;
                  if (key === REACT_FRAGMENT_TYPE) {
                    if (7 === currentFirstChild.tag) {
                      deleteRemainingChildren(
                        returnFiber,
                        currentFirstChild.sibling
                      );
                      lanes = useFiber(
                        currentFirstChild,
                        newChild.props.children
                      );
                      coerceRef(lanes, newChild);
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break a;
                    }
                  } else if (currentFirstChild.elementType === key || "object" === typeof key && null !== key && key.$$typeof === REACT_LAZY_TYPE && resolveLazy(key) === currentFirstChild.type) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.props);
                    coerceRef(lanes, newChild);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                } else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              newChild.type === REACT_FRAGMENT_TYPE ? (lanes = createFiberFromFragment(
                newChild.props.children,
                returnFiber.mode,
                lanes,
                newChild.key
              ), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes) : (lanes = createFiberFromTypeAndProps(
                newChild.type,
                newChild.key,
                newChild.props,
                null,
                returnFiber.mode,
                lanes
              ), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes);
            }
            return placeSingleChild(returnFiber);
          case REACT_PORTAL_TYPE:
            a: {
              for (key = newChild.key; null !== currentFirstChild; ) {
                if (currentFirstChild.key === key)
                  if (4 === currentFirstChild.tag && currentFirstChild.stateNode.containerInfo === newChild.containerInfo && currentFirstChild.stateNode.implementation === newChild.implementation) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(currentFirstChild, newChild.children || []);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  } else {
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  }
                else deleteChild(returnFiber, currentFirstChild);
                currentFirstChild = currentFirstChild.sibling;
              }
              lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
              lanes.return = returnFiber;
              returnFiber = lanes;
            }
            return placeSingleChild(returnFiber);
          case REACT_LAZY_TYPE:
            return newChild = resolveLazy(newChild), reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            );
        }
        if (isArrayImpl(newChild))
          return reconcileChildrenArray(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        if (getIteratorFn(newChild)) {
          key = getIteratorFn(newChild);
          if ("function" !== typeof key) throw Error(formatProdErrorMessage(150));
          newChild = key.call(newChild);
          return reconcileChildrenIterator(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          );
        }
        if ("function" === typeof newChild.then)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            unwrapThenable(newChild),
            lanes
          );
        if (newChild.$$typeof === REACT_CONTEXT_TYPE)
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            readContextDuringReconciliation(returnFiber, newChild),
            lanes
          );
        throwOnInvalidObjectTypeImpl(returnFiber, newChild);
      }
      return "string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild ? (newChild = "" + newChild, null !== currentFirstChild && 6 === currentFirstChild.tag ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling), lanes = useFiber(currentFirstChild, newChild), lanes.return = returnFiber, returnFiber = lanes) : (deleteRemainingChildren(returnFiber, currentFirstChild), lanes = createFiberFromText(newChild, returnFiber.mode, lanes), lanes.return = returnFiber, returnFiber = lanes), placeSingleChild(returnFiber)) : deleteRemainingChildren(returnFiber, currentFirstChild);
    }
    return function(returnFiber, currentFirstChild, newChild, lanes) {
      try {
        thenableIndexCounter$1 = 0;
        var firstChildFiber = reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes
        );
        thenableState$1 = null;
        return firstChildFiber;
      } catch (x) {
        if (x === SuspenseException || x === SuspenseActionException) throw x;
        var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
        fiber.lanes = lanes;
        fiber.return = returnFiber;
        return fiber;
      } finally {
      }
    };
  }
  var reconcileChildFibers = createChildReconciler(true), mountChildFibers = createChildReconciler(false), hasForceUpdate = false;
  function initializeUpdateQueue(fiber) {
    fiber.updateQueue = {
      baseState: fiber.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function cloneUpdateQueue(current, workInProgress2) {
    current = current.updateQueue;
    workInProgress2.updateQueue === current && (workInProgress2.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    });
  }
  function createUpdate(lane) {
    return { lane, tag: 0, payload: null, callback: null, next: null };
  }
  function enqueueUpdate(fiber, update, lane) {
    var updateQueue = fiber.updateQueue;
    if (null === updateQueue) return null;
    updateQueue = updateQueue.shared;
    if (0 !== (executionContext & 2)) {
      var pending = updateQueue.pending;
      null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
      updateQueue.pending = update;
      update = getRootForUpdatedFiber(fiber);
      markUpdateLaneFromFiberToRoot(fiber, null, lane);
      return update;
    }
    enqueueUpdate$1(fiber, updateQueue, update, lane);
    return getRootForUpdatedFiber(fiber);
  }
  function entangleTransitions(root2, fiber, lane) {
    fiber = fiber.updateQueue;
    if (null !== fiber && (fiber = fiber.shared, 0 !== (lane & 4194048))) {
      var queueLanes = fiber.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      fiber.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  function enqueueCapturedUpdate(workInProgress2, capturedUpdate) {
    var queue = workInProgress2.updateQueue, current = workInProgress2.alternate;
    if (null !== current && (current = current.updateQueue, queue === current)) {
      var newFirst = null, newLast = null;
      queue = queue.firstBaseUpdate;
      if (null !== queue) {
        do {
          var clone = {
            lane: queue.lane,
            tag: queue.tag,
            payload: queue.payload,
            callback: null,
            next: null
          };
          null === newLast ? newFirst = newLast = clone : newLast = newLast.next = clone;
          queue = queue.next;
        } while (null !== queue);
        null === newLast ? newFirst = newLast = capturedUpdate : newLast = newLast.next = capturedUpdate;
      } else newFirst = newLast = capturedUpdate;
      queue = {
        baseState: current.baseState,
        firstBaseUpdate: newFirst,
        lastBaseUpdate: newLast,
        shared: current.shared,
        callbacks: current.callbacks
      };
      workInProgress2.updateQueue = queue;
      return;
    }
    workInProgress2 = queue.lastBaseUpdate;
    null === workInProgress2 ? queue.firstBaseUpdate = capturedUpdate : workInProgress2.next = capturedUpdate;
    queue.lastBaseUpdate = capturedUpdate;
  }
  var didReadFromEntangledAsyncAction = false;
  function suspendIfUpdateReadFromEntangledAsyncAction() {
    if (didReadFromEntangledAsyncAction) {
      var entangledActionThenable = currentEntangledActionThenable;
      if (null !== entangledActionThenable) throw entangledActionThenable;
    }
  }
  function processUpdateQueue(workInProgress$jscomp$0, props, instance$jscomp$0, renderLanes2) {
    didReadFromEntangledAsyncAction = false;
    var queue = workInProgress$jscomp$0.updateQueue;
    hasForceUpdate = false;
    var firstBaseUpdate = queue.firstBaseUpdate, lastBaseUpdate = queue.lastBaseUpdate, pendingQueue = queue.shared.pending;
    if (null !== pendingQueue) {
      queue.shared.pending = null;
      var lastPendingUpdate = pendingQueue, firstPendingUpdate = lastPendingUpdate.next;
      lastPendingUpdate.next = null;
      null === lastBaseUpdate ? firstBaseUpdate = firstPendingUpdate : lastBaseUpdate.next = firstPendingUpdate;
      lastBaseUpdate = lastPendingUpdate;
      var current = workInProgress$jscomp$0.alternate;
      null !== current && (current = current.updateQueue, pendingQueue = current.lastBaseUpdate, pendingQueue !== lastBaseUpdate && (null === pendingQueue ? current.firstBaseUpdate = firstPendingUpdate : pendingQueue.next = firstPendingUpdate, current.lastBaseUpdate = lastPendingUpdate));
    }
    if (null !== firstBaseUpdate) {
      var newState = queue.baseState;
      lastBaseUpdate = 0;
      current = firstPendingUpdate = lastPendingUpdate = null;
      pendingQueue = firstBaseUpdate;
      do {
        var updateLane = pendingQueue.lane & -536870913, isHiddenUpdate = updateLane !== pendingQueue.lane;
        if (isHiddenUpdate ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes2 & updateLane) === updateLane) {
          0 !== updateLane && updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction = true);
          null !== current && (current = current.next = {
            lane: 0,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: null,
            next: null
          });
          a: {
            var workInProgress2 = workInProgress$jscomp$0, update = pendingQueue;
            updateLane = props;
            var instance = instance$jscomp$0;
            switch (update.tag) {
              case 1:
                workInProgress2 = update.payload;
                if ("function" === typeof workInProgress2) {
                  newState = workInProgress2.call(instance, newState, updateLane);
                  break a;
                }
                newState = workInProgress2;
                break a;
              case 3:
                workInProgress2.flags = workInProgress2.flags & -65537 | 128;
              case 0:
                workInProgress2 = update.payload;
                updateLane = "function" === typeof workInProgress2 ? workInProgress2.call(instance, newState, updateLane) : workInProgress2;
                if (null === updateLane || void 0 === updateLane) break a;
                newState = assign({}, newState, updateLane);
                break a;
              case 2:
                hasForceUpdate = true;
            }
          }
          updateLane = pendingQueue.callback;
          null !== updateLane && (workInProgress$jscomp$0.flags |= 64, isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192), isHiddenUpdate = queue.callbacks, null === isHiddenUpdate ? queue.callbacks = [updateLane] : isHiddenUpdate.push(updateLane));
        } else
          isHiddenUpdate = {
            lane: updateLane,
            tag: pendingQueue.tag,
            payload: pendingQueue.payload,
            callback: pendingQueue.callback,
            next: null
          }, null === current ? (firstPendingUpdate = current = isHiddenUpdate, lastPendingUpdate = newState) : current = current.next = isHiddenUpdate, lastBaseUpdate |= updateLane;
        pendingQueue = pendingQueue.next;
        if (null === pendingQueue)
          if (pendingQueue = queue.shared.pending, null === pendingQueue)
            break;
          else
            isHiddenUpdate = pendingQueue, pendingQueue = isHiddenUpdate.next, isHiddenUpdate.next = null, queue.lastBaseUpdate = isHiddenUpdate, queue.shared.pending = null;
      } while (1);
      null === current && (lastPendingUpdate = newState);
      queue.baseState = lastPendingUpdate;
      queue.firstBaseUpdate = firstPendingUpdate;
      queue.lastBaseUpdate = current;
      null === firstBaseUpdate && (queue.shared.lanes = 0);
      workInProgressRootSkippedLanes |= lastBaseUpdate;
      workInProgress$jscomp$0.lanes = lastBaseUpdate;
      workInProgress$jscomp$0.memoizedState = newState;
    }
  }
  function callCallback(callback, context) {
    if ("function" !== typeof callback)
      throw Error(formatProdErrorMessage(191, callback));
    callback.call(context);
  }
  function commitCallbacks(updateQueue, context) {
    var callbacks = updateQueue.callbacks;
    if (null !== callbacks)
      for (updateQueue.callbacks = null, updateQueue = 0; updateQueue < callbacks.length; updateQueue++)
        callCallback(callbacks[updateQueue], context);
  }
  var currentTreeHiddenStackCursor = createCursor(null), prevEntangledRenderLanesCursor = createCursor(0);
  function pushHiddenContext(fiber, context) {
    fiber = entangledRenderLanes;
    push(prevEntangledRenderLanesCursor, fiber);
    push(currentTreeHiddenStackCursor, context);
    entangledRenderLanes = fiber | context.baseLanes;
  }
  function reuseHiddenContextOnStack() {
    push(prevEntangledRenderLanesCursor, entangledRenderLanes);
    push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
  }
  function popHiddenContext() {
    entangledRenderLanes = prevEntangledRenderLanesCursor.current;
    pop(currentTreeHiddenStackCursor);
    pop(prevEntangledRenderLanesCursor);
  }
  var suspenseHandlerStackCursor = createCursor(null), shellBoundary = null;
  function pushPrimaryTreeSuspenseHandler(handler) {
    var current = handler.alternate;
    push(suspenseStackCursor, suspenseStackCursor.current & 1);
    push(suspenseHandlerStackCursor, handler);
    null === shellBoundary && (null === current || null !== currentTreeHiddenStackCursor.current ? shellBoundary = handler : null !== current.memoizedState && (shellBoundary = handler));
  }
  function pushDehydratedActivitySuspenseHandler(fiber) {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, fiber);
    null === shellBoundary && (shellBoundary = fiber);
  }
  function pushOffscreenSuspenseHandler(fiber) {
    22 === fiber.tag ? (push(suspenseStackCursor, suspenseStackCursor.current), push(suspenseHandlerStackCursor, fiber), null === shellBoundary && (shellBoundary = fiber)) : reuseSuspenseHandlerOnStack();
  }
  function reuseSuspenseHandlerOnStack() {
    push(suspenseStackCursor, suspenseStackCursor.current);
    push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  }
  function popSuspenseHandler(fiber) {
    pop(suspenseHandlerStackCursor);
    shellBoundary === fiber && (shellBoundary = null);
    pop(suspenseStackCursor);
  }
  var suspenseStackCursor = createCursor(0);
  function pushSuspenseListContext(fiber, newContext) {
    push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
    push(suspenseStackCursor, newContext);
  }
  function popSuspenseListContext(fiber) {
    pop(suspenseStackCursor);
    pop(suspenseHandlerStackCursor);
    shellBoundary === fiber && (shellBoundary = null);
  }
  function findFirstSuspended(row) {
    for (var node = row; null !== node; ) {
      if (13 === node.tag) {
        var state = node.memoizedState;
        if (null !== state && (state = state.dehydrated, null === state || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state)))
          return node;
      } else if (19 === node.tag && "independent" !== node.memoizedProps.revealOrder) {
        if (0 !== (node.flags & 128)) return node;
      } else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
      if (node === row) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === row) return null;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
    return null;
  }
  var renderLanes = 0, currentlyRenderingFiber = null, currentHook = null, workInProgressHook = null, didScheduleRenderPhaseUpdate = false, didScheduleRenderPhaseUpdateDuringThisPass = false, shouldDoubleInvokeUserFnsInHooksDEV = false, localIdCounter = 0, thenableIndexCounter = 0, thenableState = null, globalClientIdCounter = 0;
  function throwInvalidHookError() {
    throw Error(formatProdErrorMessage(321));
  }
  function areHookInputsEqual(nextDeps, prevDeps) {
    if (null === prevDeps) return false;
    for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
      if (!objectIs(nextDeps[i], prevDeps[i])) return false;
    return true;
  }
  function renderWithHooks(current, workInProgress2, Component, props, secondArg, nextRenderLanes) {
    renderLanes = nextRenderLanes;
    currentlyRenderingFiber = workInProgress2;
    workInProgress2.memoizedState = null;
    workInProgress2.updateQueue = null;
    workInProgress2.lanes = 0;
    ReactSharedInternals.H = null === current || null === current.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    nextRenderLanes = Component(props, secondArg);
    shouldDoubleInvokeUserFnsInHooksDEV = false;
    didScheduleRenderPhaseUpdateDuringThisPass && (nextRenderLanes = renderWithHooksAgain(
      workInProgress2,
      Component,
      props,
      secondArg
    ));
    finishRenderingHooks(current);
    return nextRenderLanes;
  }
  function finishRenderingHooks(current) {
    ReactSharedInternals.H = ContextOnlyDispatcher;
    var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdate = false;
    thenableIndexCounter = 0;
    thenableState = null;
    if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
    null === current || didReceiveUpdate || (current = current.dependencies, null !== current && checkIfContextChanged(current) && (didReceiveUpdate = true));
  }
  function renderWithHooksAgain(workInProgress2, Component, props, secondArg) {
    currentlyRenderingFiber = workInProgress2;
    var numberOfReRenders = 0;
    do {
      didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
      thenableIndexCounter = 0;
      didScheduleRenderPhaseUpdateDuringThisPass = false;
      if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
      numberOfReRenders += 1;
      workInProgressHook = currentHook = null;
      if (null != workInProgress2.updateQueue) {
        var children = workInProgress2.updateQueue;
        children.lastEffect = null;
        children.events = null;
        children.stores = null;
        null != children.memoCache && (children.memoCache.index = 0);
      }
      ReactSharedInternals.H = HooksDispatcherOnRerender;
      children = Component(props, secondArg);
    } while (didScheduleRenderPhaseUpdateDuringThisPass);
    return children;
  }
  function TransitionAwareHostComponent() {
    var dispatcher = ReactSharedInternals.H, maybeThenable = dispatcher.useState()[0];
    maybeThenable = "function" === typeof maybeThenable.then ? useThenable(maybeThenable) : maybeThenable;
    dispatcher = dispatcher.useState()[0];
    (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher && (currentlyRenderingFiber.flags |= 1024);
    return maybeThenable;
  }
  function checkDidRenderIdHook() {
    var didRenderIdHook = 0 !== localIdCounter;
    localIdCounter = 0;
    return didRenderIdHook;
  }
  function bailoutHooks(current, workInProgress2, lanes) {
    workInProgress2.updateQueue = current.updateQueue;
    workInProgress2.flags &= -2053;
    current.lanes &= ~lanes;
  }
  function resetHooksOnUnwind(workInProgress2) {
    if (didScheduleRenderPhaseUpdate) {
      for (workInProgress2 = workInProgress2.memoizedState; null !== workInProgress2; ) {
        var queue = workInProgress2.queue;
        null !== queue && (queue.pending = null);
        workInProgress2 = workInProgress2.next;
      }
      didScheduleRenderPhaseUpdate = false;
    }
    renderLanes = 0;
    workInProgressHook = currentHook = currentlyRenderingFiber = null;
    didScheduleRenderPhaseUpdateDuringThisPass = false;
    thenableIndexCounter = localIdCounter = 0;
    thenableState = null;
  }
  function mountWorkInProgressHook() {
    var hook = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = hook : workInProgressHook = workInProgressHook.next = hook;
    return workInProgressHook;
  }
  function updateWorkInProgressHook() {
    if (null === currentHook) {
      var nextCurrentHook = currentlyRenderingFiber.alternate;
      nextCurrentHook = null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
    } else nextCurrentHook = currentHook.next;
    var nextWorkInProgressHook = null === workInProgressHook ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
    if (null !== nextWorkInProgressHook)
      workInProgressHook = nextWorkInProgressHook, currentHook = nextCurrentHook;
    else {
      if (null === nextCurrentHook) {
        if (null === currentlyRenderingFiber.alternate)
          throw Error(formatProdErrorMessage(467));
        throw Error(formatProdErrorMessage(310));
      }
      currentHook = nextCurrentHook;
      nextCurrentHook = {
        memoizedState: currentHook.memoizedState,
        baseState: currentHook.baseState,
        baseQueue: currentHook.baseQueue,
        queue: currentHook.queue,
        next: null
      };
      null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook : workInProgressHook = workInProgressHook.next = nextCurrentHook;
    }
    return workInProgressHook;
  }
  function createFunctionComponentUpdateQueue() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function useThenable(thenable) {
    var index2 = thenableIndexCounter;
    thenableIndexCounter += 1;
    null === thenableState && (thenableState = []);
    thenable = trackUsedThenable(thenableState, thenable, index2);
    index2 = currentlyRenderingFiber;
    null === (null === workInProgressHook ? index2.memoizedState : workInProgressHook.next) && (index2 = index2.alternate, ReactSharedInternals.H = null === index2 || null === index2.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate);
    return thenable;
  }
  function use(usable) {
    if (null !== usable && "object" === typeof usable) {
      if ("function" === typeof usable.then) return useThenable(usable);
      if (usable.$$typeof === REACT_RECOVERABLE_TYPE) return;
      if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
    }
    throw Error(formatProdErrorMessage(438, String(usable)));
  }
  function useMemoCache(size) {
    var memoCache = null, updateQueue = currentlyRenderingFiber.updateQueue;
    null !== updateQueue && (memoCache = updateQueue.memoCache);
    if (null == memoCache) {
      var current = currentlyRenderingFiber.alternate;
      null !== current && (current = current.updateQueue, null !== current && (current = current.memoCache, null != current && (memoCache = {
        data: current.data.map(function(array) {
          return array.slice();
        }),
        index: 0
      })));
    }
    null == memoCache && (memoCache = { data: [], index: 0 });
    null === updateQueue && (updateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = updateQueue);
    updateQueue.memoCache = memoCache;
    updateQueue = memoCache.data[memoCache.index];
    if (void 0 === updateQueue)
      for (updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0; current < size; current++)
        updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
    memoCache.index++;
    return updateQueue;
  }
  function basicStateReducer(state, action) {
    return "function" === typeof action ? action(state) : action;
  }
  function updateReducer(reducer) {
    var hook = updateWorkInProgressHook();
    return updateReducerImpl(hook, currentHook, reducer);
  }
  function updateReducerImpl(hook, current, reducer) {
    var queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var baseQueue = hook.baseQueue, pendingQueue = queue.pending;
    if (null !== pendingQueue) {
      if (null !== baseQueue) {
        var baseFirst = baseQueue.next;
        baseQueue.next = pendingQueue.next;
        pendingQueue.next = baseFirst;
      }
      current.baseQueue = baseQueue = pendingQueue;
      queue.pending = null;
    }
    pendingQueue = hook.baseState;
    if (null === baseQueue) hook.memoizedState = pendingQueue;
    else {
      current = baseQueue.next;
      var newBaseQueueFirst = baseFirst = null, newBaseQueueLast = null, update = current, didReadFromEntangledAsyncAction$64 = false;
      do {
        var updateLane = update.lane & -536870913;
        if (updateLane !== update.lane ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
          var revertLane = update.revertLane;
          if (0 === revertLane)
            null !== newBaseQueueLast && (newBaseQueueLast = newBaseQueueLast.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }), updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction$64 = true);
          else if ((renderLanes & revertLane) === revertLane) {
            update = update.next;
            revertLane === currentEntangledLane && (didReadFromEntangledAsyncAction$64 = true);
            continue;
          } else
            updateLane = {
              lane: 0,
              revertLane: update.revertLane,
              gesture: null,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = updateLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = updateLane, currentlyRenderingFiber.lanes |= revertLane, workInProgressRootSkippedLanes |= revertLane;
          updateLane = update.action;
          shouldDoubleInvokeUserFnsInHooksDEV && reducer(pendingQueue, updateLane);
          pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
        } else
          revertLane = {
            lane: updateLane,
            revertLane: update.revertLane,
            gesture: update.gesture,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          }, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = revertLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = revertLane, currentlyRenderingFiber.lanes |= updateLane, workInProgressRootSkippedLanes |= updateLane;
        update = update.next;
      } while (null !== update && update !== current);
      null === newBaseQueueLast ? baseFirst = pendingQueue : newBaseQueueLast.next = newBaseQueueFirst;
      if (!objectIs(pendingQueue, hook.memoizedState) && (didReceiveUpdate = true, didReadFromEntangledAsyncAction$64 && (reducer = currentEntangledActionThenable, null !== reducer)))
        throw reducer;
      hook.memoizedState = pendingQueue;
      hook.baseState = baseFirst;
      hook.baseQueue = newBaseQueueLast;
      queue.lastRenderedState = pendingQueue;
    }
    null === baseQueue && (queue.lanes = 0);
    return [hook.memoizedState, queue.dispatch];
  }
  function rerenderReducer(reducer) {
    var hook = updateWorkInProgressHook(), queue = hook.queue;
    if (null === queue) throw Error(formatProdErrorMessage(311));
    queue.lastRenderedReducer = reducer;
    var dispatch = queue.dispatch, lastRenderPhaseUpdate = queue.pending, newState = hook.memoizedState;
    if (null !== lastRenderPhaseUpdate) {
      queue.pending = null;
      var update = lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
      do
        newState = reducer(newState, update.action), update = update.next;
      while (update !== lastRenderPhaseUpdate);
      objectIs(newState, hook.memoizedState) || (didReceiveUpdate = true);
      hook.memoizedState = newState;
      null === hook.baseQueue && (hook.baseState = newState);
      queue.lastRenderedState = newState;
    }
    return [newState, dispatch];
  }
  function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    var fiber = currentlyRenderingFiber, hook = updateWorkInProgressHook(), isHydrating$jscomp$0 = isHydrating;
    if (isHydrating$jscomp$0) {
      if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
      getServerSnapshot = getServerSnapshot();
    } else getServerSnapshot = getSnapshot();
    var snapshotChanged = !objectIs(
      (currentHook || hook).memoizedState,
      getServerSnapshot
    );
    snapshotChanged && (hook.memoizedState = getServerSnapshot, didReceiveUpdate = true);
    hook = hook.queue;
    updateEffect2(subscribeToStore.bind(null, fiber, hook, subscribe), [
      subscribe
    ]);
    subscribe = hook.getSnapshot !== getSnapshot || snapshotChanged || null !== workInProgressHook && 0 !== (workInProgressHook.memoizedState.tag & 1);
    pushSimpleEffect(
      subscribe ? 9 : 8,
      { destroy: void 0 },
      updateStoreInstance.bind(null, fiber, hook, getServerSnapshot, getSnapshot),
      null
    );
    if (subscribe) {
      fiber.flags |= 2048;
      if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
      isHydrating$jscomp$0 || 0 !== (renderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
    }
    return getServerSnapshot;
  }
  function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
    fiber.flags |= 16384;
    fiber = { getSnapshot, value: renderedSnapshot };
    getSnapshot = currentlyRenderingFiber.updateQueue;
    null === getSnapshot ? (getSnapshot = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = getSnapshot, getSnapshot.stores = [fiber]) : (renderedSnapshot = getSnapshot.stores, null === renderedSnapshot ? getSnapshot.stores = [fiber] : renderedSnapshot.push(fiber));
  }
  function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
    inst.value = nextSnapshot;
    inst.getSnapshot = getSnapshot;
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  }
  function subscribeToStore(fiber, inst, subscribe) {
    return subscribe(function() {
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    });
  }
  function checkIfSnapshotChanged(inst) {
    var latestGetSnapshot = inst.getSnapshot;
    inst = inst.value;
    try {
      var nextValue = latestGetSnapshot();
      return !objectIs(inst, nextValue);
    } catch (error) {
      return true;
    }
  }
  function forceStoreRerender(fiber) {
    var root2 = enqueueConcurrentRenderForLane(fiber, 2);
    null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2);
  }
  function mountStateImpl(initialState) {
    var hook = mountWorkInProgressHook();
    if ("function" === typeof initialState) {
      var initialStateInitializer = initialState;
      initialState = initialStateInitializer();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          initialStateInitializer();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
    }
    hook.memoizedState = hook.baseState = initialState;
    hook.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: basicStateReducer,
      lastRenderedState: initialState
    };
    return hook;
  }
  function updateOptimisticImpl(hook, current, passthrough, reducer) {
    hook.baseState = passthrough;
    return updateReducerImpl(
      hook,
      currentHook,
      "function" === typeof reducer ? reducer : basicStateReducer
    );
  }
  function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
    if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
    fiber = actionQueue.action;
    if (null !== fiber) {
      var actionNode = {
        payload,
        action: fiber,
        next: null,
        isTransition: true,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(listener) {
          actionNode.listeners.push(listener);
        }
      };
      null !== ReactSharedInternals.T ? setPendingState(true) : actionNode.isTransition = false;
      setState(actionNode);
      setPendingState = actionQueue.pending;
      null === setPendingState ? (actionNode.next = actionQueue.pending = actionNode, runActionStateAction(actionQueue, actionNode)) : (actionNode.next = setPendingState.next, actionQueue.pending = setPendingState.next = actionNode);
    }
  }
  function runActionStateAction(actionQueue, node) {
    var action = node.action, payload = node.payload, prevState = actionQueue.state;
    if (node.isTransition) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      currentTransition.types = null !== prevTransition ? prevTransition.types : null;
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = action(prevState, payload), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        handleActionReturnValue(actionQueue, node, returnValue);
      } catch (error) {
        onActionError(actionQueue, node, error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    } else
      try {
        prevTransition = action(prevState, payload), handleActionReturnValue(actionQueue, node, prevTransition);
      } catch (error$70) {
        onActionError(actionQueue, node, error$70);
      }
  }
  function handleActionReturnValue(actionQueue, node, returnValue) {
    null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then ? returnValue.then(
      function(nextState) {
        onActionSuccess(actionQueue, node, nextState);
      },
      function(error) {
        return onActionError(actionQueue, node, error);
      }
    ) : onActionSuccess(actionQueue, node, returnValue);
  }
  function onActionSuccess(actionQueue, actionNode, nextState) {
    actionNode.status = "fulfilled";
    actionNode.value = nextState;
    notifyActionListeners(actionNode);
    actionQueue.state = nextState;
    actionNode = actionQueue.pending;
    null !== actionNode && (nextState = actionNode.next, nextState === actionNode ? actionQueue.pending = null : (nextState = nextState.next, actionNode.next = nextState, runActionStateAction(actionQueue, nextState)));
  }
  function onActionError(actionQueue, actionNode, error) {
    var last = actionQueue.pending;
    actionQueue.pending = null;
    if (null !== last) {
      last = last.next;
      do
        actionNode.status = "rejected", actionNode.reason = error, notifyActionListeners(actionNode), actionNode = actionNode.next;
      while (actionNode !== last);
    }
    actionQueue.action = null;
  }
  function notifyActionListeners(actionNode) {
    actionNode = actionNode.listeners;
    for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
  }
  function actionStateReducer(oldState, newState) {
    return newState;
  }
  function mountActionState(action, initialStateProp) {
    if (isHydrating) {
      var ssrFormState = workInProgressRoot.formState;
      if (null !== ssrFormState) {
        a: {
          var JSCompiler_inline_result = currentlyRenderingFiber;
          if (isHydrating) {
            if (nextHydratableInstance) {
              b: {
                var JSCompiler_inline_result$jscomp$0 = nextHydratableInstance;
                for (var inRootOrSingleton = rootOrSingletonContext; 8 !== JSCompiler_inline_result$jscomp$0.nodeType; ) {
                  if (!inRootOrSingleton) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                  JSCompiler_inline_result$jscomp$0 = getNextHydratable(
                    JSCompiler_inline_result$jscomp$0.nextSibling
                  );
                  if (null === JSCompiler_inline_result$jscomp$0) {
                    JSCompiler_inline_result$jscomp$0 = null;
                    break b;
                  }
                }
                inRootOrSingleton = JSCompiler_inline_result$jscomp$0.data;
                JSCompiler_inline_result$jscomp$0 = "F!" === inRootOrSingleton || "F" === inRootOrSingleton ? JSCompiler_inline_result$jscomp$0 : null;
              }
              if (JSCompiler_inline_result$jscomp$0) {
                nextHydratableInstance = getNextHydratable(
                  JSCompiler_inline_result$jscomp$0.nextSibling
                );
                JSCompiler_inline_result = "F!" === JSCompiler_inline_result$jscomp$0.data;
                break a;
              }
            }
            throwOnHydrationMismatch(JSCompiler_inline_result);
          }
          JSCompiler_inline_result = false;
        }
        JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
      }
    }
    ssrFormState = mountWorkInProgressHook();
    ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
    JSCompiler_inline_result = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: actionStateReducer,
      lastRenderedState: initialStateProp
    };
    ssrFormState.queue = JSCompiler_inline_result;
    ssrFormState = dispatchSetState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result
    );
    JSCompiler_inline_result.dispatch = ssrFormState;
    JSCompiler_inline_result = mountStateImpl(false);
    inRootOrSingleton = dispatchOptimisticSetState.bind(
      null,
      currentlyRenderingFiber,
      false,
      JSCompiler_inline_result.queue
    );
    JSCompiler_inline_result = mountWorkInProgressHook();
    JSCompiler_inline_result$jscomp$0 = {
      state: initialStateProp,
      dispatch: null,
      action,
      pending: null
    };
    JSCompiler_inline_result.queue = JSCompiler_inline_result$jscomp$0;
    ssrFormState = dispatchActionState.bind(
      null,
      currentlyRenderingFiber,
      JSCompiler_inline_result$jscomp$0,
      inRootOrSingleton,
      ssrFormState
    );
    JSCompiler_inline_result$jscomp$0.dispatch = ssrFormState;
    JSCompiler_inline_result.memoizedState = action;
    return [initialStateProp, ssrFormState, false];
  }
  function updateActionState(action) {
    var stateHook = updateWorkInProgressHook();
    return updateActionStateImpl(stateHook, currentHook, action);
  }
  function updateActionStateImpl(stateHook, currentStateHook, action) {
    currentStateHook = updateReducerImpl(
      stateHook,
      currentStateHook,
      actionStateReducer
    )[0];
    stateHook = updateReducer(basicStateReducer)[0];
    if ("object" === typeof currentStateHook && null !== currentStateHook && "function" === typeof currentStateHook.then)
      try {
        var state = useThenable(currentStateHook);
      } catch (x) {
        if (x === SuspenseException) throw SuspenseActionException;
        throw x;
      }
    else state = currentStateHook;
    currentStateHook = updateWorkInProgressHook();
    var actionQueue = currentStateHook.queue, dispatch = actionQueue.dispatch;
    action !== currentStateHook.memoizedState && (currentlyRenderingFiber.flags |= 2048, pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
    return [state, dispatch, stateHook];
  }
  function actionStateActionEffect(actionQueue, action) {
    actionQueue.action = action;
  }
  function rerenderActionState(action) {
    var stateHook = updateWorkInProgressHook(), currentStateHook = currentHook;
    if (null !== currentStateHook)
      return updateActionStateImpl(stateHook, currentStateHook, action);
    updateWorkInProgressHook();
    stateHook = stateHook.memoizedState;
    currentStateHook = updateWorkInProgressHook();
    var dispatch = currentStateHook.queue.dispatch;
    currentStateHook.memoizedState = action;
    return [stateHook, dispatch, false];
  }
  function pushSimpleEffect(tag, inst, create2, deps) {
    tag = { tag, create: create2, deps, inst, next: null };
    inst = currentlyRenderingFiber.updateQueue;
    null === inst && (inst = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = inst);
    create2 = inst.lastEffect;
    null === create2 ? inst.lastEffect = tag.next = tag : (deps = create2.next, create2.next = tag, tag.next = deps, inst.lastEffect = tag);
    return tag;
  }
  function updateRef() {
    return updateWorkInProgressHook().memoizedState;
  }
  function mountEffectImpl(fiberFlags, hookFlags, create2, deps) {
    var hook = mountWorkInProgressHook();
    currentlyRenderingFiber.flags |= fiberFlags;
    hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      { destroy: void 0 },
      create2,
      void 0 === deps ? null : deps
    );
  }
  function updateEffectImpl(fiberFlags, hookFlags, create2, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var inst = hook.memoizedState.inst;
    null !== currentHook && null !== deps && areHookInputsEqual(deps, currentHook.memoizedState.deps) ? hook.memoizedState = pushSimpleEffect(hookFlags, inst, create2, deps) : (currentlyRenderingFiber.flags |= fiberFlags, hook.memoizedState = pushSimpleEffect(
      1 | hookFlags,
      inst,
      create2,
      deps
    ));
  }
  function mountEffect(create2, deps) {
    mountEffectImpl(8390656, 8, create2, deps);
  }
  function updateEffect2(create2, deps) {
    updateEffectImpl(2048, 8, create2, deps);
  }
  function useEffectEventImpl(payload) {
    currentlyRenderingFiber.flags |= 4;
    var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
    if (null === componentUpdateQueue)
      componentUpdateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = componentUpdateQueue, componentUpdateQueue.events = [payload];
    else {
      var events = componentUpdateQueue.events;
      null === events ? componentUpdateQueue.events = [payload] : events.push(payload);
    }
  }
  function updateEvent(callback) {
    var ref = updateWorkInProgressHook().memoizedState;
    useEffectEventImpl({ ref, nextImpl: callback });
    return function() {
      if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
      return ref.impl.apply(void 0, arguments);
    };
  }
  function updateInsertionEffect(create2, deps) {
    return updateEffectImpl(4, 2, create2, deps);
  }
  function updateLayoutEffect(create2, deps) {
    return updateEffectImpl(4, 4, create2, deps);
  }
  function imperativeHandleEffect(create2, ref) {
    if ("function" === typeof ref) {
      create2 = create2();
      var refCleanup = ref(create2);
      return function() {
        "function" === typeof refCleanup ? refCleanup() : ref(null);
      };
    }
    if (null !== ref && void 0 !== ref)
      return create2 = create2(), ref.current = create2, function() {
        ref.current = null;
      };
  }
  function updateImperativeHandle(ref, create2, deps) {
    deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
    updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create2, ref), deps);
  }
  function mountDebugValue() {
  }
  function updateCallback(callback, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    hook.memoizedState = [callback, deps];
    return callback;
  }
  function updateMemo(nextCreate, deps) {
    var hook = updateWorkInProgressHook();
    deps = void 0 === deps ? null : deps;
    var prevState = hook.memoizedState;
    if (null !== deps && areHookInputsEqual(deps, prevState[1]))
      return prevState[0];
    prevState = nextCreate();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(true);
      try {
        nextCreate();
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
    hook.memoizedState = [prevState, deps];
    return prevState;
  }
  function mountDeferredValueImpl(hook, value, initialValue) {
    if (void 0 === initialValue || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return hook.memoizedState = value;
    hook.memoizedState = initialValue;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return initialValue;
  }
  function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
    if (objectIs(value, prevValue)) return value;
    if (null !== currentTreeHiddenStackCursor.current)
      return hook = mountDeferredValueImpl(hook, value, initialValue), objectIs(hook, prevValue) || (didReceiveUpdate = true), hook;
    if (0 === (renderLanes & 106) || 0 !== (renderLanes & 1073741824) && 0 === (workInProgressRootRenderLanes & 261930))
      return didReceiveUpdate = true, hook.memoizedState = value;
    hook = requestDeferredLane();
    currentlyRenderingFiber.lanes |= hook;
    workInProgressRootSkippedLanes |= hook;
    return prevValue;
  }
  function startTransition(fiber, queue, pendingState, finishedState, callback) {
    var previousPriority = ReactDOMSharedInternals.p;
    ReactDOMSharedInternals.p = 0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
    var prevTransition = ReactSharedInternals.T, currentTransition = {};
    currentTransition.types = null !== prevTransition ? prevTransition.types : null;
    ReactSharedInternals.T = currentTransition;
    dispatchOptimisticSetState(fiber, false, queue, pendingState);
    try {
      var returnValue = callback(), onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
      if (null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then) {
        var thenableForFinishedState = chainThenableValue(
          returnValue,
          finishedState
        );
        dispatchSetStateInternal(
          fiber,
          queue,
          thenableForFinishedState,
          requestUpdateLane(fiber)
        );
      } else
        dispatchSetStateInternal(
          fiber,
          queue,
          finishedState,
          requestUpdateLane(fiber)
        );
    } catch (error) {
      dispatchSetStateInternal(
        fiber,
        queue,
        { then: function() {
        }, status: "rejected", reason: error },
        requestUpdateLane()
      );
    } finally {
      ReactDOMSharedInternals.p = previousPriority, null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
    }
  }
  function noop() {
  }
  function startHostTransition(formFiber, pendingState, action, formData) {
    if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
    var queue = ensureFormComponentIsStateful(formFiber).queue;
    startTransition(
      formFiber,
      queue,
      pendingState,
      sharedNotPendingObject,
      null === action ? noop : function() {
        requestFormReset$1(formFiber);
        return action(formData);
      }
    );
  }
  function ensureFormComponentIsStateful(formFiber) {
    var existingStateHook = formFiber.memoizedState;
    if (null !== existingStateHook) return existingStateHook;
    existingStateHook = {
      memoizedState: sharedNotPendingObject,
      baseState: sharedNotPendingObject,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: sharedNotPendingObject
      },
      next: null
    };
    var initialResetState = {};
    existingStateHook.next = {
      memoizedState: initialResetState,
      baseState: initialResetState,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialResetState
      },
      next: null
    };
    formFiber.memoizedState = existingStateHook;
    formFiber = formFiber.alternate;
    null !== formFiber && (formFiber.memoizedState = existingStateHook);
    return existingStateHook;
  }
  function requestFormReset$1(formFiber) {
    var stateHook = ensureFormComponentIsStateful(formFiber);
    null === stateHook.next && (stateHook = formFiber.alternate.memoizedState);
    dispatchSetStateInternal(
      formFiber,
      stateHook.next.queue,
      {},
      requestUpdateLane()
    );
  }
  function useHostTransitionStatus() {
    return readContext(HostTransitionContext);
  }
  function updateId() {
    return updateWorkInProgressHook().memoizedState;
  }
  function updateRefresh() {
    return updateWorkInProgressHook().memoizedState;
  }
  function refreshCache(fiber) {
    for (var provider = fiber.return; null !== provider; ) {
      switch (provider.tag) {
        case 24:
        case 3:
          var lane = requestUpdateLane();
          fiber = createUpdate(lane);
          var root$73 = enqueueUpdate(provider, fiber, lane);
          null !== root$73 && (scheduleUpdateOnFiber(root$73, provider, lane), entangleTransitions(root$73, provider, lane));
          provider = { cache: createCache() };
          fiber.payload = provider;
          return;
      }
      provider = provider.return;
    }
  }
  function dispatchReducerAction(fiber, queue, action) {
    var lane = requestUpdateLane();
    action = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    isRenderPhaseUpdate(fiber) ? enqueueRenderPhaseUpdate(queue, action) : (action = enqueueConcurrentHookUpdate(fiber, queue, action, lane), null !== action && (scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane)));
  }
  function dispatchSetState(fiber, queue, action) {
    var lane = requestUpdateLane();
    dispatchSetStateInternal(fiber, queue, action, lane);
  }
  function dispatchSetStateInternal(fiber, queue, action, lane) {
    var update = {
      lane,
      revertLane: 0,
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
    else {
      var alternate = fiber.alternate;
      if (0 === fiber.lanes && (null === alternate || 0 === alternate.lanes) && (alternate = queue.lastRenderedReducer, null !== alternate))
        try {
          var currentState = queue.lastRenderedState, eagerState = alternate(currentState, action);
          update.hasEagerState = true;
          update.eagerState = eagerState;
          if (objectIs(eagerState, currentState))
            return enqueueUpdate$1(fiber, queue, update, 0), null === workInProgressRoot && finishQueueingConcurrentUpdates(), false;
        } catch (error) {
        } finally {
        }
      action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
      if (null !== action)
        return scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane), true;
    }
    return false;
  }
  function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
    action = {
      lane: 2,
      revertLane: requestTransitionLane(),
      gesture: null,
      action,
      hasEagerState: false,
      eagerState: null,
      next: null
    };
    if (isRenderPhaseUpdate(fiber)) {
      if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
    } else
      throwIfDuringRender = enqueueConcurrentHookUpdate(
        fiber,
        queue,
        action,
        2
      ), null !== throwIfDuringRender && scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
  }
  function isRenderPhaseUpdate(fiber) {
    var alternate = fiber.alternate;
    return fiber === currentlyRenderingFiber || null !== alternate && alternate === currentlyRenderingFiber;
  }
  function enqueueRenderPhaseUpdate(queue, update) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
    var pending = queue.pending;
    null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
    queue.pending = update;
  }
  function entangleTransitionUpdate(root2, queue, lane) {
    if (0 !== (lane & 4194048)) {
      var queueLanes = queue.lanes;
      queueLanes &= root2.pendingLanes;
      lane |= queueLanes;
      queue.lanes = lane;
      markRootEntangled(root2, lane);
    }
  }
  var ContextOnlyDispatcher = {
    readContext,
    use,
    useCallback: throwInvalidHookError,
    useContext: throwInvalidHookError,
    useEffect: throwInvalidHookError,
    useImperativeHandle: throwInvalidHookError,
    useLayoutEffect: throwInvalidHookError,
    useInsertionEffect: throwInvalidHookError,
    useMemo: throwInvalidHookError,
    useReducer: throwInvalidHookError,
    useRef: throwInvalidHookError,
    useState: throwInvalidHookError,
    useDebugValue: throwInvalidHookError,
    useDeferredValue: throwInvalidHookError,
    useTransition: throwInvalidHookError,
    useSyncExternalStore: throwInvalidHookError,
    useId: throwInvalidHookError,
    useHostTransitionStatus: throwInvalidHookError,
    useFormState: throwInvalidHookError,
    useActionState: throwInvalidHookError,
    useOptimistic: throwInvalidHookError,
    useMemoCache: throwInvalidHookError,
    useCacheRefresh: throwInvalidHookError,
    useEffectEvent: throwInvalidHookError
  }, HooksDispatcherOnMount = {
    readContext,
    use,
    useCallback: function(callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function(ref, create2, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create2, ref),
        deps
      );
    },
    useLayoutEffect: function(create2, deps) {
      return mountEffectImpl(4194308, 4, create2, deps);
    },
    useInsertionEffect: function(create2, deps) {
      mountEffectImpl(4, 2, create2, deps);
    },
    useMemo: function(nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function(reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function(initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return hook.memoizedState = initialValue;
    },
    useState: function(initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue, dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function() {
      var stateHook = mountStateImpl(false);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        true,
        false
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [false, stateHook];
    },
    useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber, hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (void 0 === getServerSnapshot)
          throw Error(formatProdErrorMessage(407));
        getServerSnapshot = getServerSnapshot();
      } else {
        getServerSnapshot = getSnapshot();
        if (null === workInProgressRoot)
          throw Error(formatProdErrorMessage(349));
        0 !== (workInProgressRootRenderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      hook.memoizedState = getServerSnapshot;
      var inst = { value: getServerSnapshot, getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(
          null,
          fiber,
          inst,
          getServerSnapshot,
          getSnapshot
        ),
        null
      );
      return getServerSnapshot;
    },
    useId: function() {
      var hook = mountWorkInProgressHook(), identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var JSCompiler_inline_result = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        JSCompiler_inline_result = (idWithLeadingBit & ~(1 << 32 - clz32(idWithLeadingBit) - 1)).toString(32) + JSCompiler_inline_result;
        identifierPrefix = "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
        JSCompiler_inline_result = localIdCounter++;
        0 < JSCompiler_inline_result && (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
        identifierPrefix += "_";
      } else
        JSCompiler_inline_result = globalClientIdCounter++, identifierPrefix = "_" + identifierPrefix + "r_" + JSCompiler_inline_result.toString(32) + "_";
      return hook.memoizedState = identifierPrefix;
    },
    useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function(passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        true,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache,
    useCacheRefresh: function() {
      return mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      );
    },
    useEffectEvent: function(callback) {
      var hook = mountWorkInProgressHook(), ref = { impl: callback };
      hook.memoizedState = ref;
      return function() {
        if (0 !== (executionContext & 2))
          throw Error(formatProdErrorMessage(440));
        return ref.impl.apply(void 0, arguments);
      };
    }
  }, HooksDispatcherOnUpdate = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect2,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function() {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = updateReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  }, HooksDispatcherOnRerender = {
    readContext,
    use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect2,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function() {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook ? mountDeferredValueImpl(hook, value, initialValue) : updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function() {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus,
    useFormState: rerenderActionState,
    useActionState: rerenderActionState,
    useOptimistic: function(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (null !== currentHook)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    },
    useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  };
  function applyDerivedStateFromProps(workInProgress2, ctor, getDerivedStateFromProps, nextProps) {
    ctor = workInProgress2.memoizedState;
    getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
    getDerivedStateFromProps = null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps ? ctor : assign({}, ctor, getDerivedStateFromProps);
    workInProgress2.memoizedState = getDerivedStateFromProps;
    0 === workInProgress2.lanes && (workInProgress2.updateQueue.baseState = getDerivedStateFromProps);
  }
  var classComponentUpdater = {
    enqueueSetState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueReplaceState: function(inst, payload, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 1;
      update.payload = payload;
      void 0 !== callback && null !== callback && (update.callback = callback);
      payload = enqueueUpdate(inst, update, lane);
      null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
    },
    enqueueForceUpdate: function(inst, callback) {
      inst = inst._reactInternals;
      var lane = requestUpdateLane(), update = createUpdate(lane);
      update.tag = 2;
      void 0 !== callback && null !== callback && (update.callback = callback);
      callback = enqueueUpdate(inst, update, lane);
      null !== callback && (scheduleUpdateOnFiber(callback, inst, lane), entangleTransitions(callback, inst, lane));
    }
  };
  function checkShouldComponentUpdate(workInProgress2, ctor, oldProps, newProps, oldState, newState, nextContext) {
    workInProgress2 = workInProgress2.stateNode;
    return "function" === typeof workInProgress2.shouldComponentUpdate ? workInProgress2.shouldComponentUpdate(newProps, newState, nextContext) : ctor.prototype && ctor.prototype.isPureReactComponent ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState) : true;
  }
  function callComponentWillReceiveProps(workInProgress2, instance, newProps, nextContext) {
    workInProgress2 = instance.state;
    "function" === typeof instance.componentWillReceiveProps && instance.componentWillReceiveProps(newProps, nextContext);
    "function" === typeof instance.UNSAFE_componentWillReceiveProps && instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
    instance.state !== workInProgress2 && classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
  }
  function resolveClassComponentProps(Component, baseProps) {
    var newProps = baseProps;
    if ("ref" in baseProps) {
      newProps = {};
      for (var propName in baseProps)
        "ref" !== propName && (newProps[propName] = baseProps[propName]);
    }
    if (Component = Component.defaultProps) {
      newProps === baseProps && (newProps = assign({}, newProps));
      for (var propName$77 in Component)
        void 0 === newProps[propName$77] && (newProps[propName$77] = Component[propName$77]);
    }
    return newProps;
  }
  function defaultOnUncaughtError(error) {
    reportGlobalError(error);
  }
  function defaultOnCaughtError(error) {
    console.error(error);
  }
  function defaultOnRecoverableError(error) {
    reportGlobalError(error);
  }
  function logUncaughtError(root2, errorInfo) {
    try {
      var onUncaughtError = root2.onUncaughtError;
      onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
    } catch (e$78) {
      setTimeout(function() {
        throw e$78;
      });
    }
  }
  function logCaughtError(root2, boundary, errorInfo) {
    try {
      var onCaughtError = root2.onCaughtError;
      onCaughtError(errorInfo.value, {
        componentStack: errorInfo.stack,
        errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
      });
    } catch (e$79) {
      setTimeout(function() {
        throw e$79;
      });
    }
  }
  function createRootErrorUpdate(root2, errorInfo, lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    lane.payload = { element: null };
    lane.callback = function() {
      logUncaughtError(root2, errorInfo);
    };
    return lane;
  }
  function createClassErrorUpdate(lane) {
    lane = createUpdate(lane);
    lane.tag = 3;
    return lane;
  }
  function initializeClassErrorUpdate(update, root2, fiber, errorInfo) {
    var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
    if ("function" === typeof getDerivedStateFromError) {
      var error = errorInfo.value;
      update.payload = function() {
        return getDerivedStateFromError(error);
      };
      update.callback = function() {
        logCaughtError(root2, fiber, errorInfo);
      };
    }
    var inst = fiber.stateNode;
    null !== inst && "function" === typeof inst.componentDidCatch && (update.callback = function() {
      logCaughtError(root2, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError && (null === legacyErrorBoundariesThatAlreadyFailed ? legacyErrorBoundariesThatAlreadyFailed = /* @__PURE__ */ new Set([this]) : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
  }
  function throwException(root2, returnFiber, sourceFiber, value, rootRenderLanes) {
    sourceFiber.flags |= 32768;
    if (null !== value && "object" === typeof value && "function" === typeof value.then) {
      returnFiber = sourceFiber.alternate;
      null !== returnFiber && propagateParentContextChanges(
        returnFiber,
        sourceFiber,
        rootRenderLanes,
        true
      );
      sourceFiber = suspenseHandlerStackCursor.current;
      if (null !== sourceFiber) {
        switch (sourceFiber.tag) {
          case 31:
          case 13:
          case 19:
            return null === shellBoundary ? renderDidSuspendDelayIfPossible() : null === sourceFiber.alternate && 0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 3), sourceFiber.flags &= -257, sourceFiber.flags |= 65536, sourceFiber.lanes = rootRenderLanes, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? sourceFiber.updateQueue = /* @__PURE__ */ new Set([value]) : returnFiber.add(value), attachPingListener(root2, value, rootRenderLanes)), false;
          case 22:
            return sourceFiber.flags |= 65536, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? (returnFiber = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([value])
            }, sourceFiber.updateQueue = returnFiber) : (sourceFiber = returnFiber.retryQueue, null === sourceFiber ? returnFiber.retryQueue = /* @__PURE__ */ new Set([value]) : sourceFiber.add(value)), attachPingListener(root2, value, rootRenderLanes)), false;
        }
        throw Error(formatProdErrorMessage(435, sourceFiber.tag));
      }
      attachPingListener(root2, value, rootRenderLanes);
      renderDidSuspendDelayIfPossible();
      return false;
    }
    if (isHydrating)
      return returnFiber = suspenseHandlerStackCursor.current, null !== returnFiber ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256), returnFiber.flags |= 65536, returnFiber.lanes = rootRenderLanes, value !== HydrationMismatchException && (root2 = Error(formatProdErrorMessage(422), { cause: value }), queueHydrationError(createCapturedValueAtFiber(root2, sourceFiber)))) : (value !== HydrationMismatchException && (returnFiber = Error(formatProdErrorMessage(423), {
        cause: value
      }), queueHydrationError(
        createCapturedValueAtFiber(returnFiber, sourceFiber)
      )), root2 = root2.current.alternate, root2.flags |= 65536, rootRenderLanes &= -rootRenderLanes, root2.lanes |= rootRenderLanes, value = createCapturedValueAtFiber(value, sourceFiber), rootRenderLanes = createRootErrorUpdate(
        root2.stateNode,
        value,
        rootRenderLanes
      ), enqueueCapturedUpdate(root2, rootRenderLanes), 4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2)), false;
    var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
    wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
    null === workInProgressRootConcurrentErrors ? workInProgressRootConcurrentErrors = [wrapperError] : workInProgressRootConcurrentErrors.push(wrapperError);
    4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
    if (null === returnFiber) return true;
    value = createCapturedValueAtFiber(value, sourceFiber);
    sourceFiber = returnFiber;
    do {
      switch (sourceFiber.tag) {
        case 3:
          return sourceFiber.flags |= 65536, root2 = rootRenderLanes & -rootRenderLanes, sourceFiber.lanes |= root2, root2 = createRootErrorUpdate(sourceFiber.stateNode, value, root2), enqueueCapturedUpdate(sourceFiber, root2), false;
        case 1:
          returnFiber = sourceFiber.type;
          wrapperError = sourceFiber.stateNode;
          if (0 === (sourceFiber.flags & 128) && ("function" === typeof returnFiber.getDerivedStateFromError || null !== wrapperError && "function" === typeof wrapperError.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError))))
            return sourceFiber.flags |= 65536, rootRenderLanes &= -rootRenderLanes, sourceFiber.lanes |= rootRenderLanes, rootRenderLanes = createClassErrorUpdate(rootRenderLanes), initializeClassErrorUpdate(
              rootRenderLanes,
              root2,
              sourceFiber,
              value
            ), enqueueCapturedUpdate(sourceFiber, rootRenderLanes), false;
          break;
        case 22:
          if (null !== sourceFiber.memoizedState)
            return sourceFiber.flags |= 65536, false;
      }
      sourceFiber = sourceFiber.return;
    } while (null !== sourceFiber);
    return false;
  }
  var SelectiveHydrationException = Error(formatProdErrorMessage(461)), didReceiveUpdate = false;
  function reconcileChildren(current, workInProgress2, nextChildren, renderLanes2) {
    workInProgress2.child = null === current ? mountChildFibers(workInProgress2, null, nextChildren, renderLanes2) : reconcileChildFibers(
      workInProgress2,
      current.child,
      nextChildren,
      renderLanes2
    );
  }
  function updateForwardRef(current, workInProgress2, Component, nextProps, renderLanes2) {
    Component = Component.render;
    var ref = workInProgress2.ref;
    if ("ref" in nextProps) {
      var propsWithoutRef = {};
      for (var key in nextProps)
        "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
    } else propsWithoutRef = nextProps;
    prepareToReadContext(workInProgress2);
    nextProps = renderWithHooks(
      current,
      workInProgress2,
      Component,
      propsWithoutRef,
      ref,
      renderLanes2
    );
    key = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && key && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null === current) {
      var type = Component.type;
      if ("function" === typeof type && !shouldConstruct(type) && void 0 === type.defaultProps && null === Component.compare)
        return workInProgress2.tag = 15, workInProgress2.type = type, updateSimpleMemoComponent(
          current,
          workInProgress2,
          type,
          nextProps,
          renderLanes2
        );
      current = createFiberFromTypeAndProps(
        Component.type,
        null,
        nextProps,
        workInProgress2,
        workInProgress2.mode,
        renderLanes2
      );
      current.ref = workInProgress2.ref;
      current.return = workInProgress2;
      return workInProgress2.child = current;
    }
    type = current.child;
    if (!checkScheduledUpdateOrContext(current, renderLanes2)) {
      var prevProps = type.memoizedProps;
      Component = Component.compare;
      Component = null !== Component ? Component : shallowEqual;
      if (Component(prevProps, nextProps) && current.ref === workInProgress2.ref)
        return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    workInProgress2.flags |= 1;
    current = createWorkInProgress(type, nextProps);
    current.ref = workInProgress2.ref;
    current.return = workInProgress2;
    return workInProgress2.child = current;
  }
  function updateSimpleMemoComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    if (null !== current) {
      var prevProps = current.memoizedProps;
      if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress2.ref)
        if (didReceiveUpdate = false, workInProgress2.pendingProps = nextProps = prevProps, checkScheduledUpdateOrContext(current, renderLanes2))
          0 !== (current.flags & 131072) && (didReceiveUpdate = true);
        else
          return workInProgress2.lanes = current.lanes, bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    }
    return updateFunctionComponent(
      current,
      workInProgress2,
      Component,
      nextProps,
      renderLanes2
    );
  }
  function updateOffscreenComponent(current, workInProgress2, renderLanes2, nextProps) {
    var nextChildren = nextProps.children, prevState = null !== current ? current.memoizedState : null;
    null === current && null === workInProgress2.stateNode && (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    if ("hidden" === nextProps.mode) {
      if (0 !== (workInProgress2.flags & 128)) {
        prevState = null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2;
        if (null !== current) {
          nextProps = workInProgress2.child = current.child;
          for (nextChildren = 0; null !== nextProps; )
            nextChildren = nextChildren | nextProps.lanes | nextProps.childLanes, nextProps = nextProps.sibling;
          nextProps = nextChildren & ~prevState;
        } else nextProps = 0, workInProgress2.child = null;
        return deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          prevState,
          renderLanes2,
          nextProps
        );
      }
      if (0 !== (renderLanes2 & 536870912))
        workInProgress2.memoizedState = { baseLanes: 0, cachePool: null }, null !== current && pushTransition(
          workInProgress2,
          null !== prevState ? prevState.cachePool : null
        ), null !== prevState ? pushHiddenContext(workInProgress2, prevState) : reuseHiddenContextOnStack(), pushOffscreenSuspenseHandler(workInProgress2);
      else
        return nextProps = workInProgress2.lanes = 536870912, deferHiddenOffscreenComponent(
          current,
          workInProgress2,
          null !== prevState ? prevState.baseLanes | renderLanes2 : renderLanes2,
          renderLanes2,
          nextProps
        );
    } else
      null !== prevState ? (pushTransition(workInProgress2, prevState.cachePool), pushHiddenContext(workInProgress2, prevState), reuseSuspenseHandlerOnStack(), workInProgress2.memoizedState = null) : (null !== current && pushTransition(workInProgress2, null), reuseHiddenContextOnStack(), reuseSuspenseHandlerOnStack());
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  function bailoutOffscreenComponent(current, workInProgress2) {
    null !== current && 22 === current.tag || null !== workInProgress2.stateNode || (workInProgress2.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    });
    return workInProgress2.sibling;
  }
  function deferHiddenOffscreenComponent(current, workInProgress2, nextBaseLanes, renderLanes2, remainingChildLanes) {
    var JSCompiler_inline_result = peekCacheFromPool();
    JSCompiler_inline_result = null === JSCompiler_inline_result ? null : { parent: CacheContext._currentValue, pool: JSCompiler_inline_result };
    workInProgress2.memoizedState = {
      baseLanes: nextBaseLanes,
      cachePool: JSCompiler_inline_result
    };
    null !== current && pushTransition(workInProgress2, null);
    reuseHiddenContextOnStack();
    pushOffscreenSuspenseHandler(workInProgress2);
    null !== current && propagateParentContextChanges(current, workInProgress2, renderLanes2, true);
    workInProgress2.childLanes = remainingChildLanes;
    return null;
  }
  function mountActivityChildren(workInProgress2, nextProps) {
    nextProps = mountWorkInProgressOffscreenFiber(
      { mode: nextProps.mode, children: nextProps.children },
      workInProgress2.mode
    );
    nextProps.ref = workInProgress2.ref;
    workInProgress2.child = nextProps;
    nextProps.return = workInProgress2;
    return nextProps;
  }
  function retryActivityComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountActivityChildren(workInProgress2, workInProgress2.pendingProps);
    current.flags |= 2;
    popSuspenseHandler(workInProgress2);
    workInProgress2.memoizedState = null;
    return current;
  }
  function updateActivityComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, didSuspend = 0 !== (workInProgress2.flags & 128);
    workInProgress2.flags &= -129;
    if (null === current) {
      if (isHydrating) {
        if ("hidden" === nextProps.mode)
          return current = mountActivityChildren(workInProgress2, nextProps), workInProgress2.lanes = 536870912, current.memoizedState = { baseLanes: 0, cachePool: null }, bailoutOffscreenComponent(null, current);
        pushDehydratedActivitySuspenseHandler(workInProgress2);
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" === current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        workInProgress2.lanes = 536870912;
        return null;
      }
      return mountActivityChildren(workInProgress2, nextProps);
    }
    var prevState = current.memoizedState;
    if (null !== prevState) {
      var dehydrated = prevState.dehydrated;
      pushDehydratedActivitySuspenseHandler(workInProgress2);
      if (didSuspend)
        if (workInProgress2.flags & 256)
          workInProgress2.flags &= -257, workInProgress2 = retryActivityComponentWithoutHydrating(
            current,
            workInProgress2,
            renderLanes2
          );
        else if (null !== workInProgress2.memoizedState)
          workInProgress2.child = current.child, workInProgress2.flags |= 128, workInProgress2 = null;
        else throw Error(formatProdErrorMessage(558));
      else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false), didSuspend = 0 !== (renderLanes2 & current.childLanes), didReceiveUpdate || didSuspend) {
        if (null === currentTreeHiddenStackCursor.current) {
          nextProps = workInProgressRoot;
          if (null !== nextProps && (dehydrated = getBumpedLaneForHydration(nextProps, renderLanes2), 0 !== dehydrated && dehydrated !== prevState.retryLane))
            throw prevState.retryLane = dehydrated, enqueueConcurrentRenderForLane(current, dehydrated), scheduleUpdateOnFiber(nextProps, current, dehydrated), SelectiveHydrationException;
          renderDidSuspendDelayIfPossible();
        }
        workInProgress2 = retryActivityComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      } else
        current = prevState.treeContext, nextHydratableInstance = getNextHydratable(dehydrated.nextSibling), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, rootOrSingletonContext = false, null !== current && restoreSuspendedTreeContext(workInProgress2, current), workInProgress2 = mountActivityChildren(workInProgress2, nextProps), workInProgress2.flags |= 134221824;
      return workInProgress2;
    }
    current = createWorkInProgress(current.child, {
      mode: nextProps.mode,
      children: nextProps.children
    });
    current.ref = workInProgress2.ref;
    workInProgress2.child = current;
    current.return = workInProgress2;
    return current;
  }
  function markRef(current, workInProgress2) {
    var ref = workInProgress2.ref;
    if (null === ref)
      null !== current && null !== current.ref && (workInProgress2.flags |= 4194816);
    else {
      if ("function" !== typeof ref && "object" !== typeof ref)
        throw Error(formatProdErrorMessage(284));
      if (null === current || current.ref !== ref)
        workInProgress2.flags |= 4194816;
    }
  }
  function updateFunctionComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    Component = renderWithHooks(
      current,
      workInProgress2,
      Component,
      nextProps,
      void 0,
      renderLanes2
    );
    nextProps = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && nextProps && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, Component, renderLanes2);
    return workInProgress2.child;
  }
  function replayFunctionComponent(current, workInProgress2, nextProps, Component, secondArg, renderLanes2) {
    prepareToReadContext(workInProgress2);
    workInProgress2.updateQueue = null;
    nextProps = renderWithHooksAgain(
      workInProgress2,
      Component,
      nextProps,
      secondArg
    );
    finishRenderingHooks(current);
    Component = checkDidRenderIdHook();
    if (null !== current && !didReceiveUpdate)
      return bailoutHooks(current, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
    isHydrating && Component && pushMaterializedTreeId(workInProgress2);
    workInProgress2.flags |= 1;
    reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    return workInProgress2.child;
  }
  function updateClassComponent(current, workInProgress2, Component, nextProps, renderLanes2) {
    prepareToReadContext(workInProgress2);
    if (null === workInProgress2.stateNode) {
      var context = emptyContextObject, contextType = Component.contextType;
      "object" === typeof contextType && null !== contextType && (context = readContext(contextType));
      context = new Component(nextProps, context);
      workInProgress2.memoizedState = null !== context.state && void 0 !== context.state ? context.state : null;
      context.updater = classComponentUpdater;
      workInProgress2.stateNode = context;
      context._reactInternals = workInProgress2;
      context = workInProgress2.stateNode;
      context.props = nextProps;
      context.state = workInProgress2.memoizedState;
      context.refs = {};
      initializeUpdateQueue(workInProgress2);
      contextType = Component.contextType;
      context.context = "object" === typeof contextType && null !== contextType ? readContext(contextType) : emptyContextObject;
      context.state = workInProgress2.memoizedState;
      contextType = Component.getDerivedStateFromProps;
      "function" === typeof contextType && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        contextType,
        nextProps
      ), context.state = workInProgress2.memoizedState);
      "function" === typeof Component.getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || (contextType = context.state, "function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount(), contextType !== context.state && classComponentUpdater.enqueueReplaceState(context, context.state, null), processUpdateQueue(workInProgress2, nextProps, context, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction(), context.state = workInProgress2.memoizedState);
      "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308);
      nextProps = true;
    } else if (null === current) {
      context = workInProgress2.stateNode;
      var unresolvedOldProps = workInProgress2.memoizedProps, oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
      context.props = oldProps;
      var oldContext = context.context, contextType$jscomp$0 = Component.contextType;
      contextType = emptyContextObject;
      "object" === typeof contextType$jscomp$0 && null !== contextType$jscomp$0 && (contextType = readContext(contextType$jscomp$0));
      var getDerivedStateFromProps = Component.getDerivedStateFromProps;
      contextType$jscomp$0 = "function" === typeof getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate;
      unresolvedOldProps = workInProgress2.pendingProps !== unresolvedOldProps;
      contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (unresolvedOldProps || oldContext !== contextType) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        contextType
      );
      hasForceUpdate = false;
      var oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      oldContext = workInProgress2.memoizedState;
      unresolvedOldProps || oldState !== oldContext || hasForceUpdate ? ("function" === typeof getDerivedStateFromProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        getDerivedStateFromProps,
        nextProps
      ), oldContext = workInProgress2.memoizedState), (oldProps = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        oldProps,
        nextProps,
        oldState,
        oldContext,
        contextType
      )) ? (contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || ("function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount()), "function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308)) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = oldContext), context.props = nextProps, context.state = oldContext, context.context = contextType, nextProps = oldProps) : ("function" === typeof context.componentDidMount && (workInProgress2.flags |= 4194308), nextProps = false);
    } else {
      context = workInProgress2.stateNode;
      cloneUpdateQueue(current, workInProgress2);
      contextType = workInProgress2.memoizedProps;
      contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
      context.props = contextType$jscomp$0;
      getDerivedStateFromProps = workInProgress2.pendingProps;
      oldState = context.context;
      oldContext = Component.contextType;
      oldProps = emptyContextObject;
      "object" === typeof oldContext && null !== oldContext && (oldProps = readContext(oldContext));
      unresolvedOldProps = Component.getDerivedStateFromProps;
      (oldContext = "function" === typeof unresolvedOldProps || "function" === typeof context.getSnapshotBeforeUpdate) || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (contextType !== getDerivedStateFromProps || oldState !== oldProps) && callComponentWillReceiveProps(
        workInProgress2,
        context,
        nextProps,
        oldProps
      );
      hasForceUpdate = false;
      oldState = workInProgress2.memoizedState;
      context.state = oldState;
      processUpdateQueue(workInProgress2, nextProps, context, renderLanes2);
      suspendIfUpdateReadFromEntangledAsyncAction();
      var newState = workInProgress2.memoizedState;
      contextType !== getDerivedStateFromProps || oldState !== newState || hasForceUpdate || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies) ? ("function" === typeof unresolvedOldProps && (applyDerivedStateFromProps(
        workInProgress2,
        Component,
        unresolvedOldProps,
        nextProps
      ), newState = workInProgress2.memoizedState), (contextType$jscomp$0 = hasForceUpdate || checkShouldComponentUpdate(
        workInProgress2,
        Component,
        contextType$jscomp$0,
        nextProps,
        oldState,
        newState,
        oldProps
      ) || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies)) ? (oldContext || "function" !== typeof context.UNSAFE_componentWillUpdate && "function" !== typeof context.componentWillUpdate || ("function" === typeof context.componentWillUpdate && context.componentWillUpdate(nextProps, newState, oldProps), "function" === typeof context.UNSAFE_componentWillUpdate && context.UNSAFE_componentWillUpdate(
        nextProps,
        newState,
        oldProps
      )), "function" === typeof context.componentDidUpdate && (workInProgress2.flags |= 4), "function" === typeof context.getSnapshotBeforeUpdate && (workInProgress2.flags |= 1024)) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = newState), context.props = nextProps, context.state = newState, context.context = oldProps, nextProps = contextType$jscomp$0) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress2.flags |= 1024), nextProps = false);
    }
    context = nextProps;
    markRef(current, workInProgress2);
    nextProps = 0 !== (workInProgress2.flags & 128);
    context || nextProps ? (context = workInProgress2.stateNode, Component = nextProps && "function" !== typeof Component.getDerivedStateFromError ? null : context.render(), workInProgress2.flags |= 1, null !== current && nextProps ? (workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      current.child,
      null,
      renderLanes2
    ), workInProgress2.child = reconcileChildFibers(
      workInProgress2,
      null,
      Component,
      renderLanes2
    )) : reconcileChildren(current, workInProgress2, Component, renderLanes2), workInProgress2.memoizedState = context.state, current = workInProgress2.child) : current = bailoutOnAlreadyFinishedWork(
      current,
      workInProgress2,
      renderLanes2
    );
    return current;
  }
  function mountHostRootWithoutHydrating(current, workInProgress2, nextChildren, renderLanes2) {
    resetHydrationState();
    workInProgress2.flags |= 256;
    reconcileChildren(current, workInProgress2, nextChildren, renderLanes2);
    return workInProgress2.child;
  }
  var SUSPENDED_MARKER = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function mountSuspenseOffscreenState(renderLanes2) {
    return { baseLanes: renderLanes2, cachePool: getSuspendedCache() };
  }
  function getRemainingWorkInPrimaryTree(current, primaryTreeDidDefer, renderLanes2) {
    current = null !== current ? current.childLanes & ~renderLanes2 : 0;
    primaryTreeDidDefer && (current |= workInProgressDeferredLane);
    return current;
  }
  function updateSuspenseComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, showFallback = false, didSuspend = 0 !== (workInProgress2.flags & 128), JSCompiler_temp;
    (JSCompiler_temp = didSuspend) || (JSCompiler_temp = null !== current && null === current.memoizedState ? false : 0 !== (suspenseStackCursor.current & 2));
    JSCompiler_temp && (showFallback = true, workInProgress2.flags &= -129);
    JSCompiler_temp = 0 !== (workInProgress2.flags & 32);
    workInProgress2.flags &= -33;
    if (null === current) {
      if (isHydrating) {
        showFallback ? pushPrimaryTreeSuspenseHandler(workInProgress2) : reuseSuspenseHandlerOnStack();
        (current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(
          current,
          rootOrSingletonContext
        ), current = null !== current && "&" !== current.data ? current : null, null !== current && (workInProgress2.memoizedState = {
          dehydrated: current,
          treeContext: null !== treeContextProvider ? { id: treeContextId, overflow: treeContextOverflow } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, renderLanes2 = createFiberFromDehydratedFragment(current), renderLanes2.return = workInProgress2, workInProgress2.child = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null)) : current = null;
        if (null === current) throw throwOnHydrationMismatch(workInProgress2);
        isSuspenseInstanceFallback(current) ? workInProgress2.lanes = 32 : workInProgress2.lanes = 536870912;
        return null;
      }
      didSuspend = nextProps.children;
      nextProps = nextProps.fallback;
      if (showFallback)
        return reuseSuspenseHandlerOnStack(), showFallback = workInProgress2.mode, didSuspend = mountWorkInProgressOffscreenFiber(
          { mode: "hidden", children: didSuspend },
          showFallback
        ), nextProps = createFiberFromFragment(
          nextProps,
          showFallback,
          renderLanes2,
          null
        ), didSuspend.return = workInProgress2, nextProps.return = workInProgress2, didSuspend.sibling = nextProps, workInProgress2.child = didSuspend, nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(
          current,
          JSCompiler_temp,
          renderLanes2
        ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(null, nextProps);
      pushPrimaryTreeSuspenseHandler(workInProgress2);
      return mountSuspensePrimaryChildren(workInProgress2, didSuspend);
    }
    var prevState = current.memoizedState;
    if (null !== prevState) {
      var dehydrated$96 = prevState.dehydrated;
      if (null !== dehydrated$96)
        return updateDehydratedSuspenseComponent(
          current,
          workInProgress2,
          didSuspend,
          JSCompiler_temp,
          nextProps,
          dehydrated$96,
          prevState,
          renderLanes2
        );
    }
    if (showFallback)
      return reuseSuspenseHandlerOnStack(), showFallback = nextProps.fallback, didSuspend = workInProgress2.mode, prevState = current.child, dehydrated$96 = prevState.sibling, nextProps = createWorkInProgress(prevState, {
        mode: "hidden",
        children: nextProps.children
      }), nextProps.subtreeFlags = prevState.subtreeFlags & 1206910976, null !== dehydrated$96 ? showFallback = createWorkInProgress(dehydrated$96, showFallback) : (showFallback = createFiberFromFragment(
        showFallback,
        didSuspend,
        renderLanes2,
        null
      ), showFallback.flags |= 2), showFallback.return = workInProgress2, nextProps.return = workInProgress2, nextProps.sibling = showFallback, workInProgress2.child = nextProps, bailoutOffscreenComponent(null, nextProps), nextProps = workInProgress2.child, showFallback = current.child.memoizedState, null === showFallback ? showFallback = mountSuspenseOffscreenState(renderLanes2) : (didSuspend = showFallback.cachePool, null !== didSuspend ? (prevState = CacheContext._currentValue, didSuspend = didSuspend.parent !== prevState ? { parent: prevState, pool: prevState } : didSuspend) : didSuspend = getSuspendedCache(), showFallback = {
        baseLanes: showFallback.baseLanes | renderLanes2,
        cachePool: didSuspend
      }), nextProps.memoizedState = showFallback, nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        JSCompiler_temp,
        renderLanes2
      ), workInProgress2.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(current.child, nextProps);
    pushPrimaryTreeSuspenseHandler(workInProgress2);
    renderLanes2 = current.child;
    current = renderLanes2.sibling;
    renderLanes2 = createWorkInProgress(renderLanes2, {
      mode: "visible",
      children: nextProps.children
    });
    renderLanes2.return = workInProgress2;
    renderLanes2.sibling = null;
    null !== current && (JSCompiler_temp = workInProgress2.deletions, null === JSCompiler_temp ? (workInProgress2.deletions = [current], workInProgress2.flags |= 16) : JSCompiler_temp.push(current));
    workInProgress2.child = renderLanes2;
    workInProgress2.memoizedState = null;
    return renderLanes2;
  }
  function mountSuspensePrimaryChildren(workInProgress2, primaryChildren) {
    primaryChildren = mountWorkInProgressOffscreenFiber(
      { mode: "visible", children: primaryChildren },
      workInProgress2.mode
    );
    primaryChildren.return = workInProgress2;
    return workInProgress2.child = primaryChildren;
  }
  function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
    offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
    offscreenProps.lanes = 0;
    return offscreenProps;
  }
  function retrySuspenseComponentWithoutHydrating(current, workInProgress2, renderLanes2) {
    reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
    current = mountSuspensePrimaryChildren(
      workInProgress2,
      workInProgress2.pendingProps.children
    );
    current.flags |= 2;
    workInProgress2.memoizedState = null;
    return current;
  }
  function updateDehydratedSuspenseComponent(current, workInProgress2, didSuspend, didPrimaryChildrenDefer, nextProps, suspenseInstance, suspenseState, renderLanes2) {
    if (didSuspend) {
      if (workInProgress2.flags & 256)
        return pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags &= -257, retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      if (null !== workInProgress2.memoizedState)
        return reuseSuspenseHandlerOnStack(), workInProgress2.child = current.child, workInProgress2.flags |= 128, null;
      reuseSuspenseHandlerOnStack();
      suspenseInstance = nextProps.fallback;
      suspenseState = workInProgress2.mode;
      nextProps = mountWorkInProgressOffscreenFiber(
        { mode: "visible", children: nextProps.children },
        suspenseState
      );
      suspenseInstance = createFiberFromFragment(
        suspenseInstance,
        suspenseState,
        renderLanes2,
        null
      );
      suspenseInstance.flags |= 2;
      nextProps.return = workInProgress2;
      suspenseInstance.return = workInProgress2;
      nextProps.sibling = suspenseInstance;
      workInProgress2.child = nextProps;
      reconcileChildFibers(workInProgress2, current.child, null, renderLanes2);
      nextProps = workInProgress2.child;
      nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2);
      nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        didPrimaryChildrenDefer,
        renderLanes2
      );
      workInProgress2.memoizedState = SUSPENDED_MARKER;
      return bailoutOffscreenComponent(null, nextProps);
    }
    pushPrimaryTreeSuspenseHandler(workInProgress2);
    if (isSuspenseInstanceFallback(suspenseInstance)) {
      didPrimaryChildrenDefer = suspenseInstance.nextSibling && suspenseInstance.nextSibling.dataset;
      if (didPrimaryChildrenDefer) var digest = didPrimaryChildrenDefer.dgst;
      didPrimaryChildrenDefer = digest;
      "" !== didPrimaryChildrenDefer && (nextProps = Error(formatProdErrorMessage(419)), nextProps.stack = "", nextProps.digest = didPrimaryChildrenDefer, queueHydrationError({ value: nextProps, source: null, stack: null }));
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress2,
        renderLanes2
      );
    }
    didReceiveUpdate || propagateParentContextChanges(current, workInProgress2, renderLanes2, false);
    didPrimaryChildrenDefer = 0 !== (renderLanes2 & current.childLanes);
    if (didReceiveUpdate || didPrimaryChildrenDefer) {
      if (null !== currentTreeHiddenStackCursor.current)
        return retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress2,
          renderLanes2
        );
      didPrimaryChildrenDefer = workInProgressRoot;
      if (null !== didPrimaryChildrenDefer && (nextProps = getBumpedLaneForHydration(
        didPrimaryChildrenDefer,
        renderLanes2
      ), 0 !== nextProps && nextProps !== suspenseState.retryLane))
        throw suspenseState.retryLane = nextProps, enqueueConcurrentRenderForLane(current, nextProps), scheduleUpdateOnFiber(didPrimaryChildrenDefer, current, nextProps), SelectiveHydrationException;
      isSuspenseInstancePending(suspenseInstance) || renderDidSuspendDelayIfPossible();
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress2,
        renderLanes2
      );
    }
    if (isSuspenseInstancePending(suspenseInstance))
      return workInProgress2.flags |= 192, workInProgress2.child = current.child, null;
    current = suspenseState.treeContext;
    nextHydratableInstance = getNextHydratable(suspenseInstance.nextSibling);
    hydrationParentFiber = workInProgress2;
    isHydrating = true;
    hydrationErrors = null;
    rootOrSingletonContext = false;
    null !== current && restoreSuspendedTreeContext(workInProgress2, current);
    workInProgress2 = mountSuspensePrimaryChildren(
      workInProgress2,
      nextProps.children
    );
    workInProgress2.flags |= 134221824;
    return workInProgress2;
  }
  function scheduleSuspenseWorkOnFiber(fiber, renderLanes2, propagationRoot) {
    fiber.lanes |= renderLanes2;
    var alternate = fiber.alternate;
    null !== alternate && (alternate.lanes |= renderLanes2);
    scheduleContextWorkOnParentPath(fiber.return, renderLanes2, propagationRoot);
  }
  function findLastContentRow(firstChild) {
    for (var lastContentRow = null; null !== firstChild; ) {
      var currentRow = firstChild.alternate;
      null !== currentRow && null === findFirstSuspended(currentRow) && (lastContentRow = firstChild);
      firstChild = firstChild.sibling;
    }
    return lastContentRow;
  }
  function initSuspenseListRenderState(workInProgress2, isBackwards, tail, lastContentRow, tailMode, treeForkCount2) {
    var renderState = workInProgress2.memoizedState;
    null === renderState ? workInProgress2.memoizedState = {
      isBackwards,
      rendering: null,
      renderingStartTime: 0,
      last: lastContentRow,
      tail,
      tailMode,
      treeForkCount: treeForkCount2
    } : (renderState.isBackwards = isBackwards, renderState.rendering = null, renderState.renderingStartTime = 0, renderState.last = lastContentRow, renderState.tail = tail, renderState.tailMode = tailMode, renderState.treeForkCount = treeForkCount2);
  }
  function reverseChildren(fiber) {
    var row = fiber.child;
    for (fiber.child = null; null !== row; ) {
      var nextRow = row.sibling;
      row.sibling = fiber.child;
      fiber.child = row;
      row = nextRow;
    }
  }
  function updateSuspenseListComponent(current, workInProgress2, renderLanes2) {
    var nextProps = workInProgress2.pendingProps, revealOrder = nextProps.revealOrder, tailMode = nextProps.tail;
    nextProps = nextProps.children;
    var suspenseContext = suspenseStackCursor.current;
    if (workInProgress2.flags & 128)
      return pushSuspenseListContext(workInProgress2, suspenseContext), null;
    var shouldForceFallback = 0 !== (suspenseContext & 2);
    shouldForceFallback ? (suspenseContext = suspenseContext & 1 | 2, workInProgress2.flags |= 128) : suspenseContext &= 1;
    pushSuspenseListContext(workInProgress2, suspenseContext);
    "backwards" === revealOrder && null !== current ? (reverseChildren(current), reconcileChildren(current, workInProgress2, nextProps, renderLanes2), reverseChildren(current)) : reconcileChildren(current, workInProgress2, nextProps, renderLanes2);
    nextProps = isHydrating ? treeForkCount : 0;
    if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
      a: for (current = workInProgress2.child; null !== current; ) {
        if (13 === current.tag)
          null !== current.memoizedState && scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (19 === current.tag)
          scheduleSuspenseWorkOnFiber(current, renderLanes2, workInProgress2);
        else if (null !== current.child) {
          current.child.return = current;
          current = current.child;
          continue;
        }
        if (current === workInProgress2) break a;
        for (; null === current.sibling; ) {
          if (null === current.return || current.return === workInProgress2)
            break a;
          current = current.return;
        }
        current.sibling.return = current.return;
        current = current.sibling;
      }
    switch (revealOrder) {
      case "backwards":
        renderLanes2 = findLastContentRow(workInProgress2.child);
        null === renderLanes2 ? (revealOrder = workInProgress2.child, workInProgress2.child = null) : (revealOrder = renderLanes2.sibling, renderLanes2.sibling = null, reverseChildren(workInProgress2));
        initSuspenseListRenderState(
          workInProgress2,
          true,
          revealOrder,
          null,
          tailMode,
          nextProps
        );
        break;
      case "unstable_legacy-backwards":
        renderLanes2 = null;
        revealOrder = workInProgress2.child;
        for (workInProgress2.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress2.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes2;
          renderLanes2 = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress2,
          true,
          renderLanes2,
          null,
          tailMode,
          nextProps
        );
        break;
      case "together":
        initSuspenseListRenderState(
          workInProgress2,
          false,
          null,
          null,
          void 0,
          nextProps
        );
        break;
      case "independent":
        workInProgress2.memoizedState = null;
        break;
      default:
        renderLanes2 = findLastContentRow(workInProgress2.child), null === renderLanes2 ? (revealOrder = workInProgress2.child, workInProgress2.child = null) : (revealOrder = renderLanes2.sibling, renderLanes2.sibling = null), initSuspenseListRenderState(
          workInProgress2,
          false,
          revealOrder,
          renderLanes2,
          tailMode,
          nextProps
        );
    }
    return workInProgress2.child;
  }
  function updateContextProvider(current, workInProgress2, renderLanes2) {
    var newProps = workInProgress2.pendingProps;
    pushProvider(workInProgress2, workInProgress2.type, newProps.value);
    reconcileChildren(current, workInProgress2, newProps.children, renderLanes2);
    return workInProgress2.child;
  }
  function bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2) {
    null !== current && (workInProgress2.dependencies = current.dependencies);
    workInProgressRootSkippedLanes |= workInProgress2.lanes;
    if (0 === (renderLanes2 & workInProgress2.childLanes))
      if (null !== current) {
        if (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), 0 === (renderLanes2 & workInProgress2.childLanes))
          return null;
      } else return null;
    if (null !== current && workInProgress2.child !== current.child)
      throw Error(formatProdErrorMessage(153));
    if (null !== workInProgress2.child) {
      current = workInProgress2.child;
      renderLanes2 = createWorkInProgress(current, current.pendingProps);
      workInProgress2.child = renderLanes2;
      for (renderLanes2.return = workInProgress2; null !== current.sibling; )
        current = current.sibling, renderLanes2 = renderLanes2.sibling = createWorkInProgress(current, current.pendingProps), renderLanes2.return = workInProgress2;
      renderLanes2.sibling = null;
    }
    return workInProgress2.child;
  }
  function checkScheduledUpdateOrContext(current, renderLanes2) {
    if (0 !== (current.lanes & renderLanes2)) return true;
    current = current.dependencies;
    return null !== current && checkIfContextChanged(current) ? true : false;
  }
  function attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress2, renderLanes2) {
    switch (workInProgress2.tag) {
      case 3:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
        resetHydrationState();
        break;
      case 27:
      case 5:
        pushHostContext(workInProgress2);
        break;
      case 4:
        pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
        break;
      case 10:
        pushProvider(
          workInProgress2,
          workInProgress2.type,
          workInProgress2.memoizedProps.value
        );
        break;
      case 31:
        if (null !== workInProgress2.memoizedState)
          return workInProgress2.flags |= 128, pushDehydratedActivitySuspenseHandler(workInProgress2), null;
        break;
      case 13:
        var state$108 = workInProgress2.memoizedState;
        if (null !== state$108) {
          if (null !== state$108.dehydrated)
            return pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags |= 128, null;
          state$108 = propagateParentContextChanges(
            current,
            workInProgress2,
            renderLanes2,
            false
          );
          var primaryChildLanes = workInProgress2.child.childLanes;
          if (state$108 || 0 !== (renderLanes2 & primaryChildLanes))
            return updateSuspenseComponent(current, workInProgress2, renderLanes2);
          pushPrimaryTreeSuspenseHandler(workInProgress2);
          current = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress2,
            renderLanes2
          );
          return null !== current ? current.sibling : null;
        }
        pushPrimaryTreeSuspenseHandler(workInProgress2);
        break;
      case 19:
        if (workInProgress2.flags & 128)
          return updateSuspenseListComponent(
            current,
            workInProgress2,
            renderLanes2
          );
        primaryChildLanes = 0 !== (current.flags & 128);
        state$108 = 0 !== (renderLanes2 & workInProgress2.childLanes);
        state$108 || (propagateParentContextChanges(
          current,
          workInProgress2,
          renderLanes2,
          false
        ), state$108 = 0 !== (renderLanes2 & workInProgress2.childLanes));
        if (primaryChildLanes) {
          if (state$108)
            return updateSuspenseListComponent(
              current,
              workInProgress2,
              renderLanes2
            );
          workInProgress2.flags |= 128;
        }
        primaryChildLanes = workInProgress2.memoizedState;
        null !== primaryChildLanes && (primaryChildLanes.rendering = null, primaryChildLanes.tail = null, primaryChildLanes.lastEffect = null);
        pushSuspenseListContext(workInProgress2, suspenseStackCursor.current);
        if (state$108) break;
        else return null;
      case 22:
        return workInProgress2.lanes = 0, updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        pushProvider(workInProgress2, CacheContext, current.memoizedState.cache);
    }
    return bailoutOnAlreadyFinishedWork(current, workInProgress2, renderLanes2);
  }
  function beginWork(current, workInProgress2, renderLanes2) {
    if (null !== current)
      if (current.memoizedProps !== workInProgress2.pendingProps)
        didReceiveUpdate = true;
      else {
        if (!checkScheduledUpdateOrContext(current, renderLanes2) && 0 === (workInProgress2.flags & 128))
          return didReceiveUpdate = false, attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress2,
            renderLanes2
          );
        didReceiveUpdate = 0 !== (current.flags & 131072) ? true : false;
      }
    else
      didReceiveUpdate = false, isHydrating && 0 !== (workInProgress2.flags & 1048576) && pushTreeId(workInProgress2, treeForkCount, workInProgress2.index);
    workInProgress2.lanes = 0;
    switch (workInProgress2.tag) {
      case 16:
        a: {
          var props = workInProgress2.pendingProps;
          current = resolveLazy(workInProgress2.elementType);
          workInProgress2.type = current;
          if ("function" === typeof current)
            shouldConstruct(current) ? (props = resolveClassComponentProps(current, props), workInProgress2.tag = 1, workInProgress2 = updateClassComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            )) : (workInProgress2.tag = 0, workInProgress2 = updateFunctionComponent(
              null,
              workInProgress2,
              current,
              props,
              renderLanes2
            ));
          else {
            if (void 0 !== current && null !== current) {
              var $$typeof = current.$$typeof;
              if ($$typeof === REACT_FORWARD_REF_TYPE) {
                workInProgress2.tag = 11;
                workInProgress2 = updateForwardRef(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              } else if ($$typeof === REACT_MEMO_TYPE) {
                workInProgress2.tag = 14;
                workInProgress2 = updateMemoComponent(
                  null,
                  workInProgress2,
                  current,
                  props,
                  renderLanes2
                );
                break a;
              } else if ($$typeof === REACT_CONTEXT_TYPE) {
                workInProgress2.tag = 10;
                workInProgress2.type = current;
                workInProgress2 = updateContextProvider(
                  null,
                  workInProgress2,
                  renderLanes2
                );
                break a;
              }
            }
            workInProgress2 = getComponentNameFromType(current) || current;
            throw Error(formatProdErrorMessage(306, workInProgress2, ""));
          }
        }
        return workInProgress2;
      case 0:
        return updateFunctionComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 1:
        return props = workInProgress2.type, $$typeof = resolveClassComponentProps(
          props,
          workInProgress2.pendingProps
        ), updateClassComponent(
          current,
          workInProgress2,
          props,
          $$typeof,
          renderLanes2
        );
      case 3:
        a: {
          pushHostContainer(
            workInProgress2,
            workInProgress2.stateNode.containerInfo
          );
          if (null === current) throw Error(formatProdErrorMessage(387));
          props = workInProgress2.pendingProps;
          var prevState = workInProgress2.memoizedState;
          $$typeof = prevState.element;
          cloneUpdateQueue(current, workInProgress2);
          processUpdateQueue(workInProgress2, props, null, renderLanes2);
          var nextState = workInProgress2.memoizedState;
          props = nextState.cache;
          pushProvider(workInProgress2, CacheContext, props);
          props !== prevState.cache && propagateContextChanges(
            workInProgress2,
            [CacheContext],
            renderLanes2,
            true
          );
          suspendIfUpdateReadFromEntangledAsyncAction();
          props = nextState.element;
          if (prevState.isDehydrated)
            if (prevState = {
              element: props,
              isDehydrated: false,
              cache: nextState.cache
            }, workInProgress2.updateQueue.baseState = prevState, workInProgress2.memoizedState = prevState, workInProgress2.flags & 256) {
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else if (props !== $$typeof) {
              $$typeof = createCapturedValueAtFiber(
                Error(formatProdErrorMessage(424)),
                workInProgress2
              );
              queueHydrationError($$typeof);
              workInProgress2 = mountHostRootWithoutHydrating(
                current,
                workInProgress2,
                props,
                renderLanes2
              );
              break a;
            } else {
              current = workInProgress2.stateNode.containerInfo;
              switch (current.nodeType) {
                case 9:
                  current = current.body;
                  break;
                default:
                  current = "HTML" === current.nodeName ? current.ownerDocument.body : current;
              }
              nextHydratableInstance = getNextHydratable(current.firstChild);
              hydrationParentFiber = workInProgress2;
              isHydrating = true;
              hydrationErrors = null;
              rootOrSingletonContext = true;
              renderLanes2 = mountChildFibers(
                workInProgress2,
                null,
                props,
                renderLanes2
              );
              for (workInProgress2.child = renderLanes2; renderLanes2; )
                renderLanes2.flags = renderLanes2.flags & -3 | 134221824, renderLanes2 = renderLanes2.sibling;
            }
          else {
            resetHydrationState();
            if (props === $$typeof) {
              workInProgress2 = bailoutOnAlreadyFinishedWork(
                current,
                workInProgress2,
                renderLanes2
              );
              break a;
            }
            reconcileChildren(current, workInProgress2, props, renderLanes2);
          }
          workInProgress2 = workInProgress2.child;
        }
        return workInProgress2;
      case 26:
        return markRef(current, workInProgress2), null === current ? (renderLanes2 = getResource(
          workInProgress2.type,
          null,
          workInProgress2.pendingProps,
          null
        )) ? workInProgress2.memoizedState = renderLanes2 : isHydrating || (workInProgress2.stateNode = createHoistableInstance(
          workInProgress2.type,
          workInProgress2.pendingProps,
          rootInstanceStackCursor.current,
          workInProgress2
        )) : workInProgress2.memoizedState = getResource(
          workInProgress2.type,
          current.memoizedProps,
          workInProgress2.pendingProps,
          current.memoizedState
        ), null;
      case 27:
        return pushHostContext(workInProgress2), null === current && isHydrating && (props = workInProgress2.stateNode = resolveSingletonInstance(
          workInProgress2.type,
          workInProgress2.pendingProps,
          rootInstanceStackCursor.current
        ), hydrationParentFiber = workInProgress2, rootOrSingletonContext = true, $$typeof = nextHydratableInstance, isSingletonScope(workInProgress2.type) ? (previousHydratableOnEnteringScopedSingleton = $$typeof, nextHydratableInstance = getNextHydratable(props.firstChild)) : nextHydratableInstance = $$typeof), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), markRef(current, workInProgress2), null === current && (workInProgress2.flags |= 4194304), workInProgress2.child;
      case 5:
        if (null === current && isHydrating) {
          if ($$typeof = props = nextHydratableInstance)
            props = canHydrateInstance(
              props,
              workInProgress2.type,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== props ? (workInProgress2.stateNode = props, hydrationParentFiber = workInProgress2, nextHydratableInstance = getNextHydratable(props.firstChild), rootOrSingletonContext = false, $$typeof = true) : $$typeof = false;
          $$typeof || throwOnHydrationMismatch(workInProgress2);
        }
        pushHostContext(workInProgress2);
        $$typeof = workInProgress2.type;
        prevState = workInProgress2.pendingProps;
        nextState = null !== current ? current.memoizedProps : null;
        props = prevState.children;
        shouldSetTextContent($$typeof, prevState) ? props = null : null !== nextState && shouldSetTextContent($$typeof, nextState) && (workInProgress2.flags |= 32);
        null !== workInProgress2.memoizedState && ($$typeof = renderWithHooks(
          current,
          workInProgress2,
          TransitionAwareHostComponent,
          null,
          null,
          renderLanes2
        ), HostTransitionContext._currentValue = $$typeof);
        markRef(current, workInProgress2);
        reconcileChildren(current, workInProgress2, props, renderLanes2);
        return workInProgress2.child;
      case 6:
        if (null === current && isHydrating) {
          if (current = renderLanes2 = nextHydratableInstance)
            renderLanes2 = canHydrateTextInstance(
              renderLanes2,
              workInProgress2.pendingProps,
              rootOrSingletonContext
            ), null !== renderLanes2 ? (workInProgress2.stateNode = renderLanes2, hydrationParentFiber = workInProgress2, nextHydratableInstance = null, current = true) : current = false;
          current || throwOnHydrationMismatch(workInProgress2);
        }
        return null;
      case 13:
        return updateSuspenseComponent(current, workInProgress2, renderLanes2);
      case 4:
        return pushHostContainer(
          workInProgress2,
          workInProgress2.stateNode.containerInfo
        ), props = workInProgress2.pendingProps, null === current ? workInProgress2.child = reconcileChildFibers(
          workInProgress2,
          null,
          props,
          renderLanes2
        ) : reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 11:
        return updateForwardRef(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 7:
        return props = workInProgress2.pendingProps, markRef(current, workInProgress2), reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 8:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 12:
        return reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 10:
        return updateContextProvider(current, workInProgress2, renderLanes2);
      case 9:
        return $$typeof = workInProgress2.type._context, props = workInProgress2.pendingProps.children, prepareToReadContext(workInProgress2), $$typeof = readContext($$typeof), props = props($$typeof), workInProgress2.flags |= 1, reconcileChildren(current, workInProgress2, props, renderLanes2), workInProgress2.child;
      case 14:
        return updateMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 15:
        return updateSimpleMemoComponent(
          current,
          workInProgress2,
          workInProgress2.type,
          workInProgress2.pendingProps,
          renderLanes2
        );
      case 19:
        return updateSuspenseListComponent(current, workInProgress2, renderLanes2);
      case 31:
        return updateActivityComponent(current, workInProgress2, renderLanes2);
      case 22:
        return updateOffscreenComponent(
          current,
          workInProgress2,
          renderLanes2,
          workInProgress2.pendingProps
        );
      case 24:
        return prepareToReadContext(workInProgress2), props = readContext(CacheContext), null === current ? ($$typeof = peekCacheFromPool(), null === $$typeof && ($$typeof = workInProgressRoot, prevState = createCache(), $$typeof.pooledCache = prevState, prevState.refCount++, null !== prevState && ($$typeof.pooledCacheLanes |= renderLanes2), $$typeof = prevState), workInProgress2.memoizedState = { parent: props, cache: $$typeof }, initializeUpdateQueue(workInProgress2), pushProvider(workInProgress2, CacheContext, $$typeof)) : (0 !== (current.lanes & renderLanes2) && (cloneUpdateQueue(current, workInProgress2), processUpdateQueue(workInProgress2, null, null, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction()), $$typeof = current.memoizedState, prevState = workInProgress2.memoizedState, $$typeof.parent !== props ? ($$typeof = { parent: props, cache: props }, workInProgress2.memoizedState = $$typeof, 0 === workInProgress2.lanes && (workInProgress2.memoizedState = workInProgress2.updateQueue.baseState = $$typeof), pushProvider(workInProgress2, CacheContext, props)) : (props = prevState.cache, pushProvider(workInProgress2, CacheContext, props), props !== $$typeof.cache && propagateContextChanges(
          workInProgress2,
          [CacheContext],
          renderLanes2,
          true
        ))), reconcileChildren(
          current,
          workInProgress2,
          workInProgress2.pendingProps.children,
          renderLanes2
        ), workInProgress2.child;
      case 30:
        return null === workInProgress2.stateNode && (workInProgress2.stateNode = {
          autoName: null,
          paired: null,
          clones: null,
          ref: null
        }), props = workInProgress2.pendingProps, null != props.name && "auto" !== props.name ? workInProgress2.flags |= null === current ? 18882560 : 18874368 : isHydrating && pushMaterializedTreeId(workInProgress2), null !== current && current.memoizedProps.name !== props.name ? workInProgress2.flags |= 4194816 : markRef(current, workInProgress2), reconcileChildren(current, workInProgress2, props.children, renderLanes2), workInProgress2.child;
      case 29:
        throw workInProgress2.pendingProps;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function markUpdate(workInProgress2) {
    workInProgress2.flags |= 4;
  }
  function preloadInstanceAndSuspendIfNeeded(workInProgress2, type, oldProps, newProps, renderLanes2) {
    var JSCompiler_temp;
    if (JSCompiler_temp = 0 !== (workInProgress2.mode & 32))
      JSCompiler_temp = null === oldProps ? maySuspendCommit(type, newProps) : maySuspendCommit(type, newProps) && (newProps.src !== oldProps.src || newProps.srcSet !== oldProps.srcSet);
    if (JSCompiler_temp) {
      if (workInProgress2.flags |= 16777216, (renderLanes2 & 335544128) === renderLanes2)
        if (workInProgress2.stateNode.complete) workInProgress2.flags |= 8192;
        else if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
        else
          throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
    } else workInProgress2.flags &= -16777217;
  }
  function preloadResourceAndSuspendIfNeeded(workInProgress2, resource) {
    if ("stylesheet" !== resource.type || 0 !== (resource.state.loading & 4))
      workInProgress2.flags &= -16777217;
    else if (workInProgress2.flags |= 16777216, !preloadResource(resource))
      if (shouldRemainOnPreviousScreen()) workInProgress2.flags |= 8192;
      else
        throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
  }
  function scheduleRetryEffect(workInProgress2, retryQueue) {
    null !== retryQueue && (workInProgress2.flags |= 4);
    workInProgress2.flags & 16384 && (retryQueue = 22 !== workInProgress2.tag ? claimNextRetryLane() : 536870912, workInProgress2.lanes |= retryQueue, workInProgressSuspendedRetryLanes |= retryQueue);
  }
  function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
    if (!isHydrating)
      switch (renderState.tailMode) {
        case "visible":
          break;
        case "collapsed":
          for (var tailNode = renderState.tail, lastTailNode = null; null !== tailNode; )
            null !== tailNode.alternate && (lastTailNode = tailNode), tailNode = tailNode.sibling;
          null === lastTailNode ? hasRenderedATailFallback || null === renderState.tail ? renderState.tail = null : renderState.tail.sibling = null : lastTailNode.sibling = null;
          break;
        default:
          hasRenderedATailFallback = renderState.tail;
          for (tailNode = null; null !== hasRenderedATailFallback; )
            null !== hasRenderedATailFallback.alternate && (tailNode = hasRenderedATailFallback), hasRenderedATailFallback = hasRenderedATailFallback.sibling;
          null === tailNode ? renderState.tail = null : tailNode.sibling = null;
      }
  }
  function bubbleProperties(completedWork) {
    var didBailout = null !== completedWork.alternate && completedWork.alternate.child === completedWork.child, newChildLanes = 0, subtreeFlags = 0;
    if (didBailout)
      for (var child$113 = completedWork.child; null !== child$113; )
        newChildLanes |= child$113.lanes | child$113.childLanes, subtreeFlags |= child$113.subtreeFlags & 1206910976, subtreeFlags |= child$113.flags & 1206910976, child$113.return = completedWork, child$113 = child$113.sibling;
    else
      for (child$113 = completedWork.child; null !== child$113; )
        newChildLanes |= child$113.lanes | child$113.childLanes, subtreeFlags |= child$113.subtreeFlags, subtreeFlags |= child$113.flags, child$113.return = completedWork, child$113 = child$113.sibling;
    completedWork.subtreeFlags |= subtreeFlags;
    completedWork.childLanes = newChildLanes;
    return didBailout;
  }
  function completeWork(current, workInProgress2, renderLanes2) {
    var newProps = workInProgress2.pendingProps;
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return bubbleProperties(workInProgress2), null;
      case 1:
        return bubbleProperties(workInProgress2), null;
      case 3:
        renderLanes2 = workInProgress2.stateNode;
        newProps = null;
        null !== current && (newProps = current.memoizedState.cache);
        workInProgress2.memoizedState.cache !== newProps && (workInProgress2.flags |= 2048);
        popProvider(CacheContext);
        popHostContainer();
        renderLanes2.pendingContext && (renderLanes2.context = renderLanes2.pendingContext, renderLanes2.pendingContext = null);
        if (null === current || null === current.child)
          popHydrationState(workInProgress2) ? markUpdate(workInProgress2) : null === current || current.memoizedState.isDehydrated && 0 === (workInProgress2.flags & 256) || (workInProgress2.flags |= 1024, upgradeHydrationErrorsToRecoverable());
        bubbleProperties(workInProgress2);
        return null;
      case 26:
        var type = workInProgress2.type, nextResource = workInProgress2.memoizedState;
        null === current ? (markUpdate(workInProgress2), null !== nextResource ? (bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          null,
          newProps,
          renderLanes2
        ))) : nextResource ? nextResource !== current.memoizedState ? (markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), workInProgress2.flags &= -16777217) : (current = current.memoizedProps, current !== newProps && markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          type,
          current,
          newProps,
          renderLanes2
        ));
        return null;
      case 27:
        popHostContext(workInProgress2);
        renderLanes2 = rootInstanceStackCursor.current;
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            workInProgress2.subtreeFlags &= -33554433;
            return null;
          }
          current = contextStackCursor.current;
          popHydrationState(workInProgress2) ? prepareToHydrateHostInstance(workInProgress2) : (current = resolveSingletonInstance(type, newProps, renderLanes2), workInProgress2.stateNode = current, markUpdate(workInProgress2));
        }
        bubbleProperties(workInProgress2);
        workInProgress2.subtreeFlags &= -33554433;
        return null;
      case 5:
        popHostContext(workInProgress2);
        type = workInProgress2.type;
        if (null !== current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if (!newProps) {
            if (null === workInProgress2.stateNode)
              throw Error(formatProdErrorMessage(166));
            bubbleProperties(workInProgress2);
            workInProgress2.subtreeFlags &= -33554433;
            return null;
          }
          nextResource = contextStackCursor.current;
          if (popHydrationState(workInProgress2))
            prepareToHydrateHostInstance(workInProgress2);
          else {
            var ownerDocument = getOwnerDocumentFromRootContainer(
              rootInstanceStackCursor.current
            );
            switch (nextResource) {
              case 1:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/2000/svg",
                  type
                );
                break;
              case 2:
                nextResource = ownerDocument.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  type
                );
                break;
              default:
                switch (type) {
                  case "svg":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/2000/svg",
                      type
                    );
                    break;
                  case "math":
                    nextResource = ownerDocument.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      type
                    );
                    break;
                  case "script":
                    nextResource = ownerDocument.createElement("div");
                    nextResource.innerHTML = "<script><\/script>";
                    nextResource = nextResource.removeChild(
                      nextResource.firstChild
                    );
                    break;
                  case "select":
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement("select", {
                      is: newProps.is
                    }) : ownerDocument.createElement("select");
                    newProps.multiple ? nextResource.multiple = true : newProps.size && (nextResource.size = newProps.size);
                    break;
                  default:
                    nextResource = "string" === typeof newProps.is ? ownerDocument.createElement(type, { is: newProps.is }) : ownerDocument.createElement(type);
                }
            }
            nextResource[internalInstanceKey] = workInProgress2;
            nextResource[internalPropsKey] = newProps;
            a: for (ownerDocument = workInProgress2.child; null !== ownerDocument; ) {
              if (5 === ownerDocument.tag || 6 === ownerDocument.tag)
                nextResource.appendChild(ownerDocument.stateNode);
              else if (4 !== ownerDocument.tag && 27 !== ownerDocument.tag && null !== ownerDocument.child) {
                ownerDocument.child.return = ownerDocument;
                ownerDocument = ownerDocument.child;
                continue;
              }
              if (ownerDocument === workInProgress2) break a;
              for (; null === ownerDocument.sibling; ) {
                if (null === ownerDocument.return || ownerDocument.return === workInProgress2)
                  break a;
                ownerDocument = ownerDocument.return;
              }
              ownerDocument.sibling.return = ownerDocument.return;
              ownerDocument = ownerDocument.sibling;
            }
            workInProgress2.stateNode = nextResource;
            a: switch (setInitialProperties(nextResource, type, newProps), type) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                newProps = !!newProps.autoFocus;
                break a;
              case "img":
                newProps = true;
                break a;
              default:
                newProps = false;
            }
            newProps && markUpdate(workInProgress2);
          }
        }
        bubbleProperties(workInProgress2);
        workInProgress2.subtreeFlags &= -33554433;
        preloadInstanceAndSuspendIfNeeded(
          workInProgress2,
          workInProgress2.type,
          null === current ? null : current.memoizedProps,
          workInProgress2.pendingProps,
          renderLanes2
        );
        return null;
      case 6:
        if (current && null != workInProgress2.stateNode)
          current.memoizedProps !== newProps && markUpdate(workInProgress2);
        else {
          if ("string" !== typeof newProps && null === workInProgress2.stateNode)
            throw Error(formatProdErrorMessage(166));
          current = rootInstanceStackCursor.current;
          if (popHydrationState(workInProgress2)) {
            current = workInProgress2.stateNode;
            renderLanes2 = workInProgress2.memoizedProps;
            newProps = null;
            type = hydrationParentFiber;
            if (null !== type)
              switch (type.tag) {
                case 27:
                case 5:
                  newProps = type.memoizedProps;
              }
            current[internalInstanceKey] = workInProgress2;
            current = current.nodeValue === renderLanes2 || null !== newProps && true === newProps.suppressHydrationWarning || checkForUnmatchedText(current.nodeValue, renderLanes2) ? true : false;
            current || throwOnHydrationMismatch(workInProgress2, true);
          } else
            current = getOwnerDocumentFromRootContainer(current).createTextNode(
              newProps
            ), current[internalInstanceKey] = workInProgress2, workInProgress2.stateNode = current;
        }
        bubbleProperties(workInProgress2);
        return null;
      case 31:
        renderLanes2 = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState) {
          newProps = popHydrationState(workInProgress2);
          if (null !== renderLanes2) {
            if (null === current) {
              if (!newProps) throw Error(formatProdErrorMessage(318));
              current = workInProgress2.memoizedState;
              current = null !== current ? current.dehydrated : null;
              if (!current) throw Error(formatProdErrorMessage(557));
              current[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            current = false;
          } else
            renderLanes2 = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = renderLanes2), current = true;
          if (!current) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
          if (0 !== (workInProgress2.flags & 128))
            throw Error(formatProdErrorMessage(558));
        }
        bubbleProperties(workInProgress2);
        return null;
      case 13:
        newProps = workInProgress2.memoizedState;
        if (null === current || null !== current.memoizedState && null !== current.memoizedState.dehydrated) {
          type = popHydrationState(workInProgress2);
          if (null !== newProps && null !== newProps.dehydrated) {
            if (null === current) {
              if (!type) throw Error(formatProdErrorMessage(318));
              type = workInProgress2.memoizedState;
              type = null !== type ? type.dehydrated : null;
              if (!type) throw Error(formatProdErrorMessage(317));
              type[internalInstanceKey] = workInProgress2;
            } else
              resetHydrationState(), 0 === (workInProgress2.flags & 128) && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4;
            bubbleProperties(workInProgress2);
            type = false;
          } else
            type = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = type), type = true;
          if (!type) {
            if (workInProgress2.flags & 256)
              return popSuspenseHandler(workInProgress2), workInProgress2;
            popSuspenseHandler(workInProgress2);
            return null;
          }
        }
        popSuspenseHandler(workInProgress2);
        if (0 !== (workInProgress2.flags & 128))
          return workInProgress2.lanes = renderLanes2, workInProgress2;
        renderLanes2 = null !== newProps;
        current = null !== current && null !== current.memoizedState;
        renderLanes2 && (newProps = workInProgress2.child, type = null, null !== newProps.alternate && null !== newProps.alternate.memoizedState && null !== newProps.alternate.memoizedState.cachePool && (type = newProps.alternate.memoizedState.cachePool.pool), nextResource = null, null !== newProps.memoizedState && null !== newProps.memoizedState.cachePool && (nextResource = newProps.memoizedState.cachePool.pool), nextResource !== type && (newProps.flags |= 2048));
        renderLanes2 !== current && renderLanes2 && (workInProgress2.child.flags |= 8192);
        scheduleRetryEffect(workInProgress2, workInProgress2.updateQueue);
        bubbleProperties(workInProgress2);
        return null;
      case 4:
        return popHostContainer(), null === current && listenToAllSupportedEvents(workInProgress2.stateNode.containerInfo), workInProgress2.flags |= 67108864, bubbleProperties(workInProgress2), null;
      case 10:
        return popProvider(workInProgress2.type), bubbleProperties(workInProgress2), null;
      case 19:
        popSuspenseListContext(workInProgress2);
        newProps = workInProgress2.memoizedState;
        if (null === newProps) return bubbleProperties(workInProgress2), null;
        type = 0 !== (workInProgress2.flags & 128);
        nextResource = newProps.rendering;
        if (null === nextResource)
          if (type) cutOffTailIfNeeded(newProps, false);
          else {
            if (0 !== workInProgressRootExitStatus || null !== current && 0 !== (current.flags & 128))
              for (current = workInProgress2.child; null !== current; ) {
                nextResource = findFirstSuspended(current);
                if (null !== nextResource) {
                  workInProgress2.flags |= 128;
                  cutOffTailIfNeeded(newProps, false);
                  current = nextResource.updateQueue;
                  workInProgress2.updateQueue = current;
                  scheduleRetryEffect(workInProgress2, current);
                  workInProgress2.subtreeFlags = 0;
                  current = renderLanes2;
                  for (renderLanes2 = workInProgress2.child; null !== renderLanes2; )
                    resetWorkInProgress(renderLanes2, current), renderLanes2 = renderLanes2.sibling;
                  pushSuspenseListContext(
                    workInProgress2,
                    suspenseStackCursor.current & 1 | 2
                  );
                  isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount);
                  return workInProgress2.child;
                }
                current = current.sibling;
              }
            null !== newProps.tail && now() > workInProgressRootRenderTargetTime && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          }
        else {
          if (!type)
            if (current = findFirstSuspended(nextResource), null !== current) {
              if (workInProgress2.flags |= 128, type = true, current = current.updateQueue, workInProgress2.updateQueue = current, scheduleRetryEffect(workInProgress2, current), cutOffTailIfNeeded(newProps, true), null === newProps.tail && "collapsed" !== newProps.tailMode && "visible" !== newProps.tailMode && !nextResource.alternate && !isHydrating)
                return bubbleProperties(workInProgress2), null;
            } else
              2 * now() - newProps.renderingStartTime > workInProgressRootRenderTargetTime && 536870912 !== renderLanes2 && (workInProgress2.flags |= 128, type = true, cutOffTailIfNeeded(newProps, false), workInProgress2.lanes = 4194304);
          newProps.isBackwards ? (nextResource.sibling = workInProgress2.child, workInProgress2.child = nextResource) : (current = newProps.last, null !== current ? current.sibling = nextResource : workInProgress2.child = nextResource, newProps.last = nextResource);
        }
        if (null !== newProps.tail) {
          current = newProps.tail;
          a: {
            for (renderLanes2 = current; null !== renderLanes2; ) {
              if (null !== renderLanes2.alternate) {
                renderLanes2 = false;
                break a;
              }
              renderLanes2 = renderLanes2.sibling;
            }
            renderLanes2 = true;
          }
          newProps.rendering = current;
          newProps.tail = current.sibling;
          newProps.renderingStartTime = now();
          current.sibling = null;
          nextResource = suspenseStackCursor.current;
          nextResource = type ? nextResource & 1 | 2 : nextResource & 1;
          "visible" === newProps.tailMode || "collapsed" === newProps.tailMode || !renderLanes2 || isHydrating ? pushSuspenseListContext(workInProgress2, nextResource) : (renderLanes2 = nextResource, push(suspenseHandlerStackCursor, workInProgress2), push(suspenseStackCursor, renderLanes2), null === shellBoundary && (shellBoundary = workInProgress2));
          isHydrating && pushTreeFork(workInProgress2, newProps.treeForkCount);
          return current;
        }
        bubbleProperties(workInProgress2);
        return null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), newProps = null !== workInProgress2.memoizedState, null !== current ? null !== current.memoizedState !== newProps && (workInProgress2.flags |= 8192) : newProps && (workInProgress2.flags |= 8192), newProps ? 0 !== (renderLanes2 & 536870912) && 0 === (workInProgress2.flags & 128) && (bubbleProperties(workInProgress2), workInProgress2.subtreeFlags & 6 && (workInProgress2.flags |= 8192)) : bubbleProperties(workInProgress2), renderLanes2 = workInProgress2.updateQueue, null !== renderLanes2 && scheduleRetryEffect(workInProgress2, renderLanes2.retryQueue), renderLanes2 = null, null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (renderLanes2 = current.memoizedState.cachePool.pool), newProps = null, null !== workInProgress2.memoizedState && null !== workInProgress2.memoizedState.cachePool && (newProps = workInProgress2.memoizedState.cachePool.pool), newProps !== renderLanes2 && (workInProgress2.flags |= 2048), null !== current && pop(resumedCache), null;
      case 24:
        return renderLanes2 = null, null !== current && (renderLanes2 = current.memoizedState.cache), workInProgress2.memoizedState.cache !== renderLanes2 && (workInProgress2.flags |= 2048), popProvider(CacheContext), bubbleProperties(workInProgress2), null;
      case 25:
        return null;
      case 30:
        return workInProgress2.flags |= 33554432, bubbleProperties(workInProgress2), null;
    }
    throw Error(formatProdErrorMessage(156, workInProgress2.tag));
  }
  function unwindWork(current, workInProgress2) {
    popTreeContext(workInProgress2);
    switch (workInProgress2.tag) {
      case 1:
        return current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 3:
        return popProvider(CacheContext), popHostContainer(), current = workInProgress2.flags, 0 !== (current & 65536) && 0 === (current & 128) ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 26:
      case 27:
      case 5:
        return popHostContext(workInProgress2), null;
      case 31:
        if (null !== workInProgress2.memoizedState) {
          popSuspenseHandler(workInProgress2);
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 13:
        popSuspenseHandler(workInProgress2);
        current = workInProgress2.memoizedState;
        if (null !== current && null !== current.dehydrated) {
          if (null === workInProgress2.alternate)
            throw Error(formatProdErrorMessage(340));
          resetHydrationState();
        }
        current = workInProgress2.flags;
        return current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 19:
        return popSuspenseListContext(workInProgress2), current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, current = workInProgress2.memoizedState, null !== current && (current.rendering = null, current.tail = null), workInProgress2.flags |= 4, workInProgress2) : null;
      case 4:
        return popHostContainer(), null;
      case 10:
        return popProvider(workInProgress2.type), null;
      case 22:
      case 23:
        return popSuspenseHandler(workInProgress2), popHiddenContext(), null !== current && pop(resumedCache), current = workInProgress2.flags, current & 65536 ? (workInProgress2.flags = current & -65537 | 128, workInProgress2) : null;
      case 24:
        return popProvider(CacheContext), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function unwindInterruptedWork(current, interruptedWork) {
    popTreeContext(interruptedWork);
    switch (interruptedWork.tag) {
      case 3:
        popProvider(CacheContext);
        popHostContainer();
        break;
      case 26:
      case 27:
      case 5:
        popHostContext(interruptedWork);
        break;
      case 4:
        popHostContainer();
        break;
      case 31:
        null !== interruptedWork.memoizedState && popSuspenseHandler(interruptedWork);
        break;
      case 13:
        popSuspenseHandler(interruptedWork);
        break;
      case 19:
        popSuspenseListContext(interruptedWork);
        break;
      case 10:
        popProvider(interruptedWork.type);
        break;
      case 22:
      case 23:
        popSuspenseHandler(interruptedWork);
        popHiddenContext();
        null !== current && pop(resumedCache);
        break;
      case 24:
        popProvider(CacheContext);
    }
  }
  function commitHookEffectListMount(flags, finishedWork) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            lastEffect = void 0;
            var create2 = updateQueue.create, inst = updateQueue.inst;
            lastEffect = create2();
            inst.destroy = lastEffect;
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor$jscomp$0) {
    try {
      var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
      if (null !== lastEffect) {
        var firstEffect = lastEffect.next;
        updateQueue = firstEffect;
        do {
          if ((updateQueue.tag & flags) === flags) {
            var inst = updateQueue.inst, destroy = inst.destroy;
            if (void 0 !== destroy) {
              inst.destroy = void 0;
              lastEffect = finishedWork;
              var nearestMountedAncestor = nearestMountedAncestor$jscomp$0, destroy_ = destroy;
              try {
                destroy_();
              } catch (error) {
                captureCommitPhaseError(
                  lastEffect,
                  nearestMountedAncestor,
                  error
                );
              }
            }
          }
          updateQueue = updateQueue.next;
        } while (updateQueue !== firstEffect);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitClassCallbacks(finishedWork) {
    var updateQueue = finishedWork.updateQueue;
    if (null !== updateQueue) {
      var instance = finishedWork.stateNode;
      try {
        commitCallbacks(updateQueue, instance);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
    instance.props = resolveClassComponentProps(
      current.type,
      current.memoizedProps
    );
    instance.state = current.memoizedState;
    try {
      instance.componentWillUnmount();
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyAttachRef(current, nearestMountedAncestor) {
    try {
      var ref = current.ref;
      if (null !== ref) {
        switch (current.tag) {
          case 26:
          case 27:
          case 5:
            var instanceToUse = current.stateNode;
            break;
          case 30:
            var instance = current.stateNode, name = getViewTransitionName(current.memoizedProps, instance);
            if (null === instance.ref || instance.ref.name !== name)
              instance.ref = createViewTransitionInstance(name);
            instanceToUse = instance.ref;
            break;
          case 7:
            if (null === current.stateNode) {
              var fragmentInstance = new FragmentInstance(current);
              traverseVisibleInstancesAndTextInstances(
                current.child,
                false,
                addFragmentHandleToFiber,
                fragmentInstance,
                void 0,
                void 0
              );
              current.stateNode = fragmentInstance;
            }
            instanceToUse = current.stateNode;
            break;
          default:
            instanceToUse = current.stateNode;
        }
        "function" === typeof ref ? current.refCleanup = ref(instanceToUse) : ref.current = instanceToUse;
      }
    } catch (error) {
      captureCommitPhaseError(current, nearestMountedAncestor, error);
    }
  }
  function safelyDetachRef(current, nearestMountedAncestor) {
    var ref = current.ref, refCleanup = current.refCleanup;
    if (null !== ref)
      if ("function" === typeof refCleanup)
        try {
          refCleanup();
        } catch (error) {
          captureCommitPhaseError(current, nearestMountedAncestor, error);
        } finally {
          current.refCleanup = null, current = current.alternate, null != current && (current.refCleanup = null);
        }
      else if ("function" === typeof ref)
        try {
          ref(null);
        } catch (error$148) {
          captureCommitPhaseError(current, nearestMountedAncestor, error$148);
        }
      else ref.current = null;
  }
  function commitNewChildToFragmentInstances(fiber, parentFragmentInstances) {
    if ((5 === fiber.tag || 27 === fiber.tag || 6 === fiber.tag) && null === fiber.alternate && null !== parentFragmentInstances)
      for (var i = 0; i < parentFragmentInstances.length; i++)
        commitNewChildToFragmentInstance(
          fiber.stateNode,
          parentFragmentInstances[i]
        );
  }
  function commitFragmentInstanceInsertionEffects(fiber) {
    for (var parent = fiber.return; null !== parent; ) {
      isFragmentInstanceParent(parent) && commitNewChildToFragmentInstance(fiber.stateNode, parent.stateNode);
      if (isFragmentInstanceHostBoundary(parent)) break;
      parent = parent.return;
    }
  }
  function commitFragmentInstanceDeletionEffects(fiber) {
    for (var parent = fiber.return; null !== parent; ) {
      isFragmentInstanceParent(parent) && deleteChildFromFragmentInstance(fiber.stateNode, parent.stateNode);
      if (isFragmentInstanceHostBoundary(parent)) break;
      parent = parent.return;
    }
  }
  function isFragmentInstanceHostBoundary(fiber) {
    return 5 === fiber.tag || 3 === fiber.tag || 27 === fiber.tag;
  }
  function isFragmentInstanceParent(fiber) {
    return fiber && 7 === fiber.tag && null !== fiber.stateNode;
  }
  function commitHostMount(finishedWork) {
    var type = finishedWork.type, props = finishedWork.memoizedProps, instance = finishedWork.stateNode;
    try {
      a: switch (type) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          props.autoFocus && instance.focus();
          break a;
        case "img":
          props.src ? instance.src = props.src : props.srcSet && (instance.srcset = props.srcSet);
      }
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function commitHostUpdate(finishedWork, newProps, oldProps) {
    try {
      var domElement = finishedWork.stateNode;
      updateProperties(domElement, finishedWork.type, oldProps, newProps);
      domElement[internalPropsKey] = newProps;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  function isHostParent(fiber) {
    return 5 === fiber.tag || 3 === fiber.tag || 26 === fiber.tag || 27 === fiber.tag && isSingletonScope(fiber.type) || 4 === fiber.tag;
  }
  function getHostSibling(fiber) {
    a: for (; ; ) {
      for (; null === fiber.sibling; ) {
        if (null === fiber.return || isHostParent(fiber.return)) return null;
        fiber = fiber.return;
      }
      fiber.sibling.return = fiber.return;
      for (fiber = fiber.sibling; 5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag; ) {
        if (27 === fiber.tag && isSingletonScope(fiber.type)) continue a;
        if (fiber.flags & 2) continue a;
        if (null === fiber.child || 4 === fiber.tag) continue a;
        else fiber.child.return = fiber, fiber = fiber.child;
      }
      if (!(fiber.flags & 2)) return fiber.stateNode;
    }
  }
  function insertOrAppendPlacementNodeIntoContainer(node, before, parent, parentFragmentInstances) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      tag = node.stateNode, before ? (9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent).insertBefore(tag, before) : (before = 9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent, before.appendChild(tag), parent = parent._reactRootContainer, null !== parent && void 0 !== parent || null !== before.onclick || (before.onclick = noop$1)), commitNewChildToFragmentInstances(node, parentFragmentInstances), viewTransitionMutationContext = true;
    else if (4 !== tag && (27 === tag && (commitNewChildToFragmentInstances(node, parentFragmentInstances), parentFragmentInstances = null, isSingletonScope(node.type) && (parent = node.stateNode, before = null)), node = node.child, null !== node))
      for (insertOrAppendPlacementNodeIntoContainer(
        node,
        before,
        parent,
        parentFragmentInstances
      ), node = node.sibling; null !== node; )
        insertOrAppendPlacementNodeIntoContainer(
          node,
          before,
          parent,
          parentFragmentInstances
        ), node = node.sibling;
  }
  function insertOrAppendPlacementNode(node, before, parent, parentFragmentInstances) {
    var tag = node.tag;
    if (5 === tag || 6 === tag)
      tag = node.stateNode, before ? parent.insertBefore(tag, before) : parent.appendChild(tag), commitNewChildToFragmentInstances(node, parentFragmentInstances), viewTransitionMutationContext = true;
    else if (4 !== tag && (27 === tag && (commitNewChildToFragmentInstances(node, parentFragmentInstances), parentFragmentInstances = null, isSingletonScope(node.type) && (parent = node.stateNode)), node = node.child, null !== node))
      for (insertOrAppendPlacementNode(
        node,
        before,
        parent,
        parentFragmentInstances
      ), node = node.sibling; null !== node; )
        insertOrAppendPlacementNode(
          node,
          before,
          parent,
          parentFragmentInstances
        ), node = node.sibling;
  }
  function commitHostSingletonAcquisition(finishedWork) {
    var singleton = finishedWork.stateNode, props = finishedWork.memoizedProps;
    try {
      for (var type = finishedWork.type, attributes = singleton.attributes; attributes.length; )
        singleton.removeAttributeNode(attributes[0]);
      setInitialProperties(singleton, type, props);
      singleton[internalInstanceKey] = finishedWork;
      singleton[internalPropsKey] = props;
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
  var shouldStartViewTransition = false, appearingViewTransitions = null;
  function trackEnterViewTransitions(placement) {
    if (30 === placement.tag || 0 !== (placement.subtreeFlags & 33554432))
      shouldStartViewTransition = true;
  }
  var viewTransitionCancelableChildren = null;
  function pushViewTransitionCancelableScope() {
    var prevChildren = viewTransitionCancelableChildren;
    viewTransitionCancelableChildren = null;
    return prevChildren;
  }
  var viewTransitionHostInstanceIdx = 0;
  function applyViewTransitionToHostInstances(fiber, name, className, collectMeasurements, stopAtNestedViewTransitions) {
    viewTransitionHostInstanceIdx = 0;
    return applyViewTransitionToHostInstancesRecursive(
      fiber.child,
      name,
      className,
      collectMeasurements,
      stopAtNestedViewTransitions
    );
  }
  function applyViewTransitionToHostInstancesRecursive(child, name, className, collectMeasurements, stopAtNestedViewTransitions) {
    for (var inViewport = false; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        if (null !== collectMeasurements) {
          var measurement = measureInstance(instance);
          collectMeasurements.push(measurement);
          measurement.view && (inViewport = true);
        } else
          inViewport || measureInstance(instance).view && (inViewport = true);
        shouldStartViewTransition = true;
        applyViewTransitionName(
          instance,
          0 === viewTransitionHostInstanceIdx ? name : name + "_" + viewTransitionHostInstanceIdx,
          className
        );
        viewTransitionHostInstanceIdx++;
      } else if (22 !== child.tag || null === child.memoizedState)
        30 === child.tag && stopAtNestedViewTransitions || applyViewTransitionToHostInstancesRecursive(
          child.child,
          name,
          className,
          collectMeasurements,
          stopAtNestedViewTransitions
        ) && (inViewport = true);
      child = child.sibling;
    }
    return inViewport;
  }
  function restoreViewTransitionOnHostInstances(child, stopAtNestedViewTransitions) {
    for (; null !== child; ) {
      if (5 === child.tag)
        restoreViewTransitionName(child.stateNode, child.memoizedProps);
      else if (22 !== child.tag || null === child.memoizedState)
        30 === child.tag && stopAtNestedViewTransitions || restoreViewTransitionOnHostInstances(
          child.child,
          stopAtNestedViewTransitions
        );
      child = child.sibling;
    }
  }
  function commitAppearingPairViewTransitions(placement) {
    if (0 !== (placement.subtreeFlags & 18874368))
      for (placement = placement.child; null !== placement; ) {
        if (22 !== placement.tag || null === placement.memoizedState) {
          if (commitAppearingPairViewTransitions(placement), 30 === placement.tag && 0 !== (placement.flags & 18874368) && placement.stateNode.paired) {
            var props = placement.memoizedProps;
            if (null == props.name || "auto" === props.name)
              throw Error(formatProdErrorMessage(544));
            var name = props.name;
            props = getViewTransitionClassName(props.default, props.share);
            "none" !== props && (applyViewTransitionToHostInstances(
              placement,
              name,
              props,
              null,
              false
            ) || restoreViewTransitionOnHostInstances(placement.child, false));
          }
        }
        placement = placement.sibling;
      }
  }
  function commitEnterViewTransitions(placement, gesture) {
    if (30 === placement.tag) {
      var state = placement.stateNode, props = placement.memoizedProps, name = getViewTransitionName(props, state), className = getViewTransitionClassName(
        props.default,
        state.paired ? props.share : props.enter
      );
      "none" !== className ? applyViewTransitionToHostInstances(placement, name, className, null, false) ? (commitAppearingPairViewTransitions(placement), state.paired || gesture || scheduleViewTransitionEvent(placement, props.onEnter)) : restoreViewTransitionOnHostInstances(placement.child, false) : commitAppearingPairViewTransitions(placement);
    } else if (0 !== (placement.subtreeFlags & 33554432))
      for (placement = placement.child; null !== placement; )
        commitEnterViewTransitions(placement, gesture), placement = placement.sibling;
    else commitAppearingPairViewTransitions(placement);
  }
  function commitDeletedPairViewTransitions(deletion) {
    if (null !== appearingViewTransitions && 0 !== appearingViewTransitions.size) {
      var pairs = appearingViewTransitions;
      if (0 !== (deletion.subtreeFlags & 18874368))
        for (deletion = deletion.child; null !== deletion; ) {
          if (22 !== deletion.tag || null === deletion.memoizedState) {
            if (30 === deletion.tag && 0 !== (deletion.flags & 18874368)) {
              var props = deletion.memoizedProps, name = props.name;
              if (null != name && "auto" !== name) {
                var pair = pairs.get(name);
                if (void 0 !== pair) {
                  var className = getViewTransitionClassName(
                    props.default,
                    props.share
                  );
                  "none" !== className && (applyViewTransitionToHostInstances(
                    deletion,
                    name,
                    className,
                    null,
                    false
                  ) ? (className = deletion.stateNode, pair.paired = className, className.paired = pair, scheduleViewTransitionEvent(deletion, props.onShare)) : restoreViewTransitionOnHostInstances(deletion.child, false));
                  pairs.delete(name);
                  if (0 === pairs.size) break;
                }
              }
            }
            commitDeletedPairViewTransitions(deletion);
          }
          deletion = deletion.sibling;
        }
    }
  }
  function commitExitViewTransitions(deletion) {
    if (30 === deletion.tag) {
      var props = deletion.memoizedProps, name = getViewTransitionName(props, deletion.stateNode), pair = null !== appearingViewTransitions ? appearingViewTransitions.get(name) : void 0, className = getViewTransitionClassName(
        props.default,
        void 0 !== pair ? props.share : props.exit
      );
      "none" !== className && (applyViewTransitionToHostInstances(deletion, name, className, null, false) ? void 0 !== pair ? (className = deletion.stateNode, pair.paired = className, className.paired = pair, appearingViewTransitions.delete(name), scheduleViewTransitionEvent(deletion, props.onShare)) : scheduleViewTransitionEvent(deletion, props.onExit) : restoreViewTransitionOnHostInstances(deletion.child, false));
      null !== appearingViewTransitions && commitDeletedPairViewTransitions(deletion);
    } else if (0 !== (deletion.subtreeFlags & 33554432))
      for (deletion = deletion.child; null !== deletion; )
        commitExitViewTransitions(deletion), deletion = deletion.sibling;
    else
      null !== appearingViewTransitions && commitDeletedPairViewTransitions(deletion);
  }
  function commitNestedViewTransitions(changedParent) {
    for (changedParent = changedParent.child; null !== changedParent; ) {
      if (30 === changedParent.tag) {
        var props = changedParent.memoizedProps, name = getViewTransitionName(props, changedParent.stateNode);
        props = getViewTransitionClassName(props.default, props.update);
        changedParent.flags &= -5;
        "none" !== props && applyViewTransitionToHostInstances(
          changedParent,
          name,
          props,
          changedParent.memoizedState = [],
          false
        );
      } else
        0 !== (changedParent.subtreeFlags & 33554432) && commitNestedViewTransitions(changedParent);
      changedParent = changedParent.sibling;
    }
  }
  function restorePairedViewTransitions(parent) {
    if (0 !== (parent.subtreeFlags & 18874368))
      for (parent = parent.child; null !== parent; ) {
        if (22 !== parent.tag || null === parent.memoizedState) {
          if (30 === parent.tag && 0 !== (parent.flags & 18874368)) {
            var instance = parent.stateNode;
            null !== instance.paired && (instance.paired = null, restoreViewTransitionOnHostInstances(parent.child, false));
          }
          restorePairedViewTransitions(parent);
        }
        parent = parent.sibling;
      }
  }
  function restoreEnterOrExitViewTransitions(fiber) {
    if (30 === fiber.tag)
      fiber.stateNode.paired = null, restoreViewTransitionOnHostInstances(fiber.child, false), restorePairedViewTransitions(fiber);
    else if (0 !== (fiber.subtreeFlags & 33554432))
      for (fiber = fiber.child; null !== fiber; )
        restoreEnterOrExitViewTransitions(fiber), fiber = fiber.sibling;
    else restorePairedViewTransitions(fiber);
  }
  function restoreNestedViewTransitions(changedParent) {
    for (changedParent = changedParent.child; null !== changedParent; )
      30 === changedParent.tag ? restoreViewTransitionOnHostInstances(changedParent.child, false) : 0 !== (changedParent.subtreeFlags & 33554432) && restoreNestedViewTransitions(changedParent), changedParent = changedParent.sibling;
  }
  function measureViewTransitionHostInstancesRecursive(parentViewTransition, child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions) {
    for (var inViewport = false; null !== child; ) {
      if (5 === child.tag) {
        var instance = child.stateNode;
        if (null !== previousMeasurements && viewTransitionHostInstanceIdx < previousMeasurements.length) {
          var previousMeasurement = previousMeasurements[viewTransitionHostInstanceIdx], nextMeasurement = measureInstance(instance);
          if (previousMeasurement.view || nextMeasurement.view) inViewport = true;
          var JSCompiler_temp;
          if (JSCompiler_temp = 0 === (parentViewTransition.flags & 4))
            if (nextMeasurement.clip) JSCompiler_temp = true;
            else {
              JSCompiler_temp = previousMeasurement.rect;
              var newRect = nextMeasurement.rect;
              JSCompiler_temp = JSCompiler_temp.y !== newRect.y || JSCompiler_temp.x !== newRect.x || JSCompiler_temp.height !== newRect.height || JSCompiler_temp.width !== newRect.width;
            }
          JSCompiler_temp && (parentViewTransition.flags |= 4);
          nextMeasurement.abs ? nextMeasurement = !previousMeasurement.abs : (previousMeasurement = previousMeasurement.rect, nextMeasurement = nextMeasurement.rect, nextMeasurement = previousMeasurement.height !== nextMeasurement.height || previousMeasurement.width !== nextMeasurement.width);
          nextMeasurement && (parentViewTransition.flags |= 32);
        } else parentViewTransition.flags |= 32;
        0 !== (parentViewTransition.flags & 4) && applyViewTransitionName(
          instance,
          0 === viewTransitionHostInstanceIdx ? newName : newName + "_" + viewTransitionHostInstanceIdx,
          className
        );
        inViewport && 0 !== (parentViewTransition.flags & 4) || (null === viewTransitionCancelableChildren && (viewTransitionCancelableChildren = []), viewTransitionCancelableChildren.push(
          instance,
          0 === viewTransitionHostInstanceIdx ? oldName : oldName + "_" + viewTransitionHostInstanceIdx,
          child.memoizedProps
        ));
        viewTransitionHostInstanceIdx++;
      } else if (22 !== child.tag || null === child.memoizedState)
        30 === child.tag && stopAtNestedViewTransitions ? parentViewTransition.flags |= child.flags & 32 : measureViewTransitionHostInstancesRecursive(
          parentViewTransition,
          child.child,
          newName,
          oldName,
          className,
          previousMeasurements,
          stopAtNestedViewTransitions
        ) && (inViewport = true);
      child = child.sibling;
    }
    return inViewport;
  }
  function measureNestedViewTransitions(changedParent, gesture) {
    for (changedParent = changedParent.child; null !== changedParent; ) {
      if (30 === changedParent.tag) {
        var props = changedParent.memoizedProps, state = changedParent.stateNode, name = getViewTransitionName(props, state), className = getViewTransitionClassName(props.default, props.update);
        var previousMeasurements;
        previousMeasurements = changedParent.memoizedState, changedParent.memoizedState = null;
        state = changedParent;
        var child = changedParent.child;
        viewTransitionHostInstanceIdx = 0;
        name = measureViewTransitionHostInstancesRecursive(
          state,
          child,
          name,
          name,
          className,
          previousMeasurements,
          false
        );
        0 !== (changedParent.flags & 4) && name && scheduleViewTransitionEvent(changedParent, props.onUpdate);
      } else
        0 !== (changedParent.subtreeFlags & 33554432) && measureNestedViewTransitions(changedParent);
      changedParent = changedParent.sibling;
    }
  }
  var offscreenSubtreeIsHidden = false, offscreenSubtreeWasHidden = false, offscreenDirectParentIsHidden = false, needsFormReset = false, PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set, nextEffect = null, viewTransitionContextChanged = false, inUpdateViewTransition = false, rootViewTransitionAffected = false, rootViewTransitionNameCanceled = false;
  function commitBeforeMutationEffects(root2, firstChild, committedLanes) {
    root2 = root2.containerInfo;
    eventsEnabled = _enabled;
    root2 = getActiveElementDeep(root2);
    if (hasSelectionCapabilities(root2)) {
      if ("selectionStart" in root2)
        var JSCompiler_temp = {
          start: root2.selectionStart,
          end: root2.selectionEnd
        };
      else
        a: {
          JSCompiler_temp = (JSCompiler_temp = root2.ownerDocument) && JSCompiler_temp.defaultView || window;
          var selection = JSCompiler_temp.getSelection && JSCompiler_temp.getSelection();
          if (selection && 0 !== selection.rangeCount) {
            JSCompiler_temp = selection.anchorNode;
            var anchorOffset = selection.anchorOffset, focusNode = selection.focusNode;
            selection = selection.focusOffset;
            try {
              JSCompiler_temp.nodeType, focusNode.nodeType;
            } catch (e$21) {
              JSCompiler_temp = null;
              break a;
            }
            var length = 0, start = -1, end = -1, indexWithinAnchor = 0, indexWithinFocus = 0, node = root2, parentNode = null;
            b: for (; ; ) {
              for (var next; ; ) {
                node !== JSCompiler_temp || 0 !== anchorOffset && 3 !== node.nodeType || (start = length + anchorOffset);
                node !== focusNode || 0 !== selection && 3 !== node.nodeType || (end = length + selection);
                3 === node.nodeType && (length += node.nodeValue.length);
                if (null === (next = node.firstChild)) break;
                parentNode = node;
                node = next;
              }
              for (; ; ) {
                if (node === root2) break b;
                parentNode === JSCompiler_temp && ++indexWithinAnchor === anchorOffset && (start = length);
                parentNode === focusNode && ++indexWithinFocus === selection && (end = length);
                if (null !== (next = node.nextSibling)) break;
                node = parentNode;
                parentNode = node.parentNode;
              }
              node = next;
            }
            JSCompiler_temp = -1 === start || -1 === end ? null : { start, end };
          } else JSCompiler_temp = null;
        }
      JSCompiler_temp = JSCompiler_temp || { start: 0, end: 0 };
    } else JSCompiler_temp = null;
    selectionInformation = { focusedElem: root2, selectionRange: JSCompiler_temp };
    _enabled = false;
    committedLanes = (committedLanes & 335544064) === committedLanes;
    nextEffect = firstChild;
    for (firstChild = committedLanes ? 9270 : 1024; null !== nextEffect; ) {
      root2 = nextEffect;
      if (committedLanes && (JSCompiler_temp = root2.deletions, null !== JSCompiler_temp))
        for (anchorOffset = 0; anchorOffset < JSCompiler_temp.length; anchorOffset++)
          committedLanes && commitExitViewTransitions(JSCompiler_temp[anchorOffset]);
      if (null === root2.alternate && 0 !== (root2.flags & 2))
        committedLanes && trackEnterViewTransitions(root2), commitBeforeMutationEffects_complete(committedLanes);
      else {
        if (22 === root2.tag) {
          if (JSCompiler_temp = root2.alternate, null !== root2.memoizedState) {
            null !== JSCompiler_temp && null === JSCompiler_temp.memoizedState && committedLanes && commitExitViewTransitions(JSCompiler_temp);
            commitBeforeMutationEffects_complete(committedLanes);
            continue;
          } else if (null !== JSCompiler_temp && null !== JSCompiler_temp.memoizedState) {
            committedLanes && trackEnterViewTransitions(root2);
            commitBeforeMutationEffects_complete(committedLanes);
            continue;
          }
        }
        JSCompiler_temp = root2.child;
        0 !== (root2.subtreeFlags & firstChild) && null !== JSCompiler_temp ? (JSCompiler_temp.return = root2, nextEffect = JSCompiler_temp) : (committedLanes && commitNestedViewTransitions(root2), commitBeforeMutationEffects_complete(committedLanes));
      }
    }
    appearingViewTransitions = null;
  }
  function commitBeforeMutationEffects_complete(isViewTransitionEligible$jscomp$0) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect, isViewTransitionEligible = isViewTransitionEligible$jscomp$0, current = fiber.alternate, flags = fiber.flags;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (0 !== (flags & 1024) && null !== current) {
            isViewTransitionEligible = void 0;
            flags = current.memoizedProps;
            current = current.memoizedState;
            var instance = fiber.stateNode;
            try {
              var resolvedPrevProps = resolveClassComponentProps(
                fiber.type,
                flags
              );
              isViewTransitionEligible = instance.getSnapshotBeforeUpdate(
                resolvedPrevProps,
                current
              );
              instance.__reactInternalSnapshotBeforeUpdate = isViewTransitionEligible;
            } catch (error) {
              captureCommitPhaseError(fiber, fiber.return, error);
            }
          }
          break;
        case 3:
          if (0 !== (flags & 1024)) {
            if (current = fiber.stateNode.containerInfo, isViewTransitionEligible = current.nodeType, 9 === isViewTransitionEligible)
              clearContainerSparingly(current);
            else if (1 === isViewTransitionEligible)
              switch (current.nodeName) {
                case "HEAD":
                case "HTML":
                case "BODY":
                  clearContainerSparingly(current);
                  break;
                default:
                  current.textContent = "";
              }
          }
          break;
        case 5:
        case 26:
        case 27:
        case 6:
        case 4:
        case 17:
          break;
        case 30:
          isViewTransitionEligible && null !== current && (isViewTransitionEligible = getViewTransitionName(
            current.memoizedProps,
            current.stateNode
          ), flags = fiber.memoizedProps, flags = getViewTransitionClassName(flags.default, flags.update), "none" !== flags && applyViewTransitionToHostInstances(
            current,
            isViewTransitionEligible,
            flags,
            current.memoizedState = [],
            true
          ));
          break;
        default:
          if (0 !== (flags & 1024)) throw Error(formatProdErrorMessage(163));
      }
      current = fiber.sibling;
      if (null !== current) {
        current.return = fiber.return;
        nextEffect = current;
        break;
      }
      nextEffect = fiber.return;
    }
  }
  function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitHookEffectListMount(5, finishedWork);
        break;
      case 1:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 4)
          if (finishedRoot = finishedWork.stateNode, null === current)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          else {
            var prevProps = resolveClassComponentProps(
              finishedWork.type,
              current.memoizedProps
            );
            current = current.memoizedState;
            try {
              finishedRoot.componentDidUpdate(
                prevProps,
                current,
                finishedRoot.__reactInternalSnapshotBeforeUpdate
              );
            } catch (error$146) {
              captureCommitPhaseError(
                finishedWork,
                finishedWork.return,
                error$146
              );
            }
          }
        flags & 64 && commitClassCallbacks(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        if (flags & 64 && (finishedRoot = finishedWork.updateQueue, null !== finishedRoot)) {
          current = null;
          if (null !== finishedWork.child)
            switch (finishedWork.child.tag) {
              case 27:
              case 5:
                current = finishedWork.child.stateNode;
                break;
              case 1:
                current = finishedWork.child.stateNode;
            }
          try {
            commitCallbacks(finishedRoot, current);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 27:
        null === current && flags & 4 && commitHostSingletonAcquisition(finishedWork);
      case 26:
      case 5:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        null === current && flags & 4 && commitHostMount(finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        break;
      case 31:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
        break;
      case 13:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
        flags & 64 && (finishedRoot = finishedWork.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot && (finishedWork = retryDehydratedSuspenseBoundary.bind(
          null,
          finishedWork
        ), registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
        break;
      case 22:
        flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
        if (!flags) {
          var newOffscreenSubtreeWasHidden = null !== current && null !== current.memoizedState || offscreenSubtreeWasHidden;
          current = offscreenSubtreeIsHidden;
          prevProps = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = flags;
          (offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden) && !prevProps ? (flags = 2, 0 !== (finishedWork.subtreeFlags & 8772) && (flags |= 1), recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            flags
          )) : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = current;
          offscreenSubtreeWasHidden = prevProps;
        }
        break;
      case 30:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 7:
        flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
    }
  }
  function hideOrUnhideAllChildren(parentFiber, isHidden) {
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      hideOrUnhideAllChildrenOnFiber(parentFiber, isHidden), parentFiber = parentFiber.sibling;
  }
  function hideOrUnhideAllChildrenOnFiber(fiber, isHidden) {
    switch (fiber.tag) {
      case 5:
      case 26:
        try {
          var instance = fiber.stateNode;
          if (isHidden) {
            var style2 = instance.style;
            "function" === typeof style2.setProperty ? style2.setProperty("display", "none", "important") : style2.display = "none";
          } else {
            var instance$jscomp$0 = fiber.stateNode, styleProp = fiber.memoizedProps.style, display = void 0 !== styleProp && null !== styleProp && styleProp.hasOwnProperty("display") ? styleProp.display : null;
            instance$jscomp$0.style.display = null == display || "boolean" === typeof display ? "" : ("" + display).trim();
          }
        } catch (error) {
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        hideOrUnhideNearestPortals(fiber, isHidden);
        break;
      case 6:
        try {
          fiber.stateNode.nodeValue = isHidden ? "" : fiber.memoizedProps, viewTransitionMutationContext = true;
        } catch (error) {
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      case 18:
        try {
          var instance$jscomp$1 = fiber.stateNode;
          isHidden ? hideOrUnhideDehydratedBoundary(instance$jscomp$1, true) : hideOrUnhideDehydratedBoundary(fiber.stateNode, false);
        } catch (error) {
          captureCommitPhaseError(fiber, fiber.return, error);
        }
        break;
      case 22:
      case 23:
        null === fiber.memoizedState && hideOrUnhideAllChildren(fiber, isHidden);
        break;
      default:
        hideOrUnhideAllChildren(fiber, isHidden);
    }
  }
  function hideOrUnhideNearestPortals(parentFiber, isHidden$jscomp$0) {
    if (parentFiber.subtreeFlags & 67108864)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        a: {
          var fiber = parentFiber, isHidden = isHidden$jscomp$0;
          switch (fiber.tag) {
            case 4:
              hideOrUnhideAllChildrenOnFiber(fiber, isHidden);
              break a;
            case 22:
              null === fiber.memoizedState && hideOrUnhideNearestPortals(fiber, isHidden);
              break a;
            default:
              hideOrUnhideNearestPortals(fiber, isHidden);
          }
        }
        parentFiber = parentFiber.sibling;
      }
  }
  function detachFiberAfterEffects(fiber) {
    var alternate = fiber.alternate;
    null !== alternate && (fiber.alternate = null, detachFiberAfterEffects(alternate));
    fiber.child = null;
    fiber.deletions = null;
    fiber.sibling = null;
    5 === fiber.tag && (alternate = fiber.stateNode, null !== alternate && detachDeletedInstance(alternate));
    fiber.stateNode = null;
    fiber.return = null;
    fiber.dependencies = null;
    fiber.memoizedProps = null;
    fiber.memoizedState = null;
    fiber.pendingProps = null;
    fiber.stateNode = null;
    fiber.updateQueue = null;
  }
  var hostParent = null, hostParentIsContainer = false;
  function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
    for (parent = parent.child; null !== parent; )
      commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent), parent = parent.sibling;
  }
  function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
      try {
        injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
      } catch (err) {
      }
    switch (deletedFiber.tag) {
      case 26:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        deletedFiber.memoizedState ? deletedFiber.memoizedState.count-- : deletedFiber.stateNode && !offscreenSubtreeWasHidden && (deletedFiber = deletedFiber.stateNode, deletedFiber.parentNode.removeChild(deletedFiber));
        break;
      case 27:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        commitFragmentInstanceDeletionEffects(deletedFiber);
        var prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer;
        isSingletonScope(deletedFiber.type) && (hostParent = deletedFiber.stateNode, hostParentIsContainer = false);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        releaseSingletonInstance(
          deletedFiber.stateNode,
          deletedFiber.type,
          deletedFiber.memoizedProps
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 5:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor), commitFragmentInstanceDeletionEffects(deletedFiber);
      case 6:
        6 === deletedFiber.tag && commitFragmentInstanceDeletionEffects(deletedFiber);
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = null;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        if (null !== hostParent)
          if (hostParentIsContainer)
            try {
              (9 === hostParent.nodeType ? hostParent.body : "HTML" === hostParent.nodeName ? hostParent.ownerDocument.body : hostParent).removeChild(deletedFiber.stateNode), viewTransitionMutationContext = true;
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
          else
            try {
              hostParent.removeChild(deletedFiber.stateNode), viewTransitionMutationContext = true;
            } catch (error) {
              captureCommitPhaseError(
                deletedFiber,
                nearestMountedAncestor,
                error
              );
            }
        break;
      case 18:
        null !== hostParent && (hostParentIsContainer ? (finishedRoot = hostParent, clearHydrationBoundary(
          9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot,
          deletedFiber.stateNode
        ), retryIfBlockedOn(finishedRoot)) : clearHydrationBoundary(hostParent, deletedFiber.stateNode));
        break;
      case 4:
        prevHostParent = hostParent;
        prevHostParentIsContainer = hostParentIsContainer;
        hostParent = deletedFiber.stateNode.containerInfo;
        hostParentIsContainer = true;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        hostParent = prevHostParent;
        hostParentIsContainer = prevHostParentIsContainer;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
        offscreenSubtreeWasHidden || commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 1:
        offscreenSubtreeWasHidden || (safelyDetachRef(deletedFiber, nearestMountedAncestor), prevHostParent = deletedFiber.stateNode, "function" === typeof prevHostParent.componentWillUnmount && safelyCallComponentWillUnmount(
          deletedFiber,
          nearestMountedAncestor,
          prevHostParent
        ));
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 21:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 22:
        offscreenSubtreeWasHidden = (prevHostParent = offscreenSubtreeWasHidden) || null !== deletedFiber.memoizedState;
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        offscreenSubtreeWasHidden = prevHostParent;
        break;
      case 30:
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      case 7:
        offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
        break;
      default:
        recursivelyTraverseDeletionEffects(
          finishedRoot,
          nearestMountedAncestor,
          deletedFiber
        );
    }
  }
  function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot))) {
      finishedRoot = finishedRoot.dehydrated;
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
  }
  function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
    if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot))))
      try {
        retryIfBlockedOn(finishedRoot);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
  }
  function getRetryCache(finishedWork) {
    switch (finishedWork.tag) {
      case 31:
      case 13:
      case 19:
        var retryCache = finishedWork.stateNode;
        null === retryCache && (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
        return retryCache;
      case 22:
        return finishedWork = finishedWork.stateNode, retryCache = finishedWork._retryCache, null === retryCache && (retryCache = finishedWork._retryCache = new PossiblyWeakSet()), retryCache;
      default:
        throw Error(formatProdErrorMessage(435, finishedWork.tag));
    }
  }
  function attachSuspenseRetryListeners(finishedWork, wakeables) {
    var retryCache = getRetryCache(finishedWork);
    wakeables.forEach(function(wakeable) {
      if (!retryCache.has(wakeable)) {
        retryCache.add(wakeable);
        var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
        wakeable.then(retry, retry);
      }
    });
  }
  function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber, lanes) {
    var deletions = parentFiber.deletions;
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete = deletions[i], root2 = root$jscomp$0, returnFiber = parentFiber, parent = returnFiber;
        a: for (; null !== parent; ) {
          switch (parent.tag) {
            case 27:
              if (isSingletonScope(parent.type)) {
                hostParent = parent.stateNode;
                hostParentIsContainer = false;
                break a;
              }
              break;
            case 5:
              hostParent = parent.stateNode;
              hostParentIsContainer = false;
              break a;
            case 3:
            case 4:
              hostParent = parent.stateNode.containerInfo;
              hostParentIsContainer = true;
              break a;
          }
          parent = parent.return;
        }
        if (null === hostParent) throw Error(formatProdErrorMessage(160));
        commitDeletionEffectsOnFiber(root2, returnFiber, childToDelete);
        hostParent = null;
        hostParentIsContainer = false;
        root2 = childToDelete.alternate;
        null !== root2 && (root2.return = null);
        childToDelete.return = null;
      }
    if (parentFiber.subtreeFlags & 13886)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitMutationEffectsOnFiber(parentFiber, root$jscomp$0, lanes), parentFiber = parentFiber.sibling;
  }
  var currentHoistableRoot = null;
  function commitMutationEffectsOnFiber(finishedWork, root2, lanes) {
    var current = finishedWork.alternate, flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (flags & 4 && (current = finishedWork.updateQueue, current = null !== current ? current.events : null, null !== current))
          for (var ii = 0; ii < current.length; ii++) {
            var _eventPayloads$ii2 = current[ii];
            _eventPayloads$ii2.ref.impl = _eventPayloads$ii2.nextImpl;
          }
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (commitHookEffectListUnmount(3, finishedWork, finishedWork.return), commitHookEffectListMount(3, finishedWork), commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
        break;
      case 1:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        flags & 64 && offscreenSubtreeIsHidden && (finishedWork = finishedWork.updateQueue, null !== finishedWork && (root2 = finishedWork.callbacks, null !== root2 && (lanes = finishedWork.shared.hiddenCallbacks, finishedWork.shared.hiddenCallbacks = null === lanes ? root2 : lanes.concat(root2))));
        break;
      case 26:
        ii = currentHoistableRoot;
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (flags & 4)
          if (flags = null !== current ? current.memoizedState : null, lanes = finishedWork.memoizedState, null === current)
            if (null === lanes)
              if (null === finishedWork.stateNode)
                if (offscreenSubtreeIsHidden)
                  finishedWork.stateNode = createHoistableInstance(
                    finishedWork.type,
                    finishedWork.memoizedProps,
                    root2.containerInfo,
                    finishedWork
                  );
                else {
                  a: {
                    root2 = finishedWork.type;
                    lanes = finishedWork.memoizedProps;
                    flags = ii.ownerDocument || ii;
                    b: switch (root2) {
                      case "title":
                        current = flags.getElementsByTagName("title")[0];
                        if (!current || current[internalHoistableMarker] || current[internalInstanceKey] || "http://www.w3.org/2000/svg" === current.namespaceURI || current.hasAttribute("itemprop"))
                          current = flags.createElement(root2), flags.head.insertBefore(
                            current,
                            flags.querySelector("head > title")
                          );
                        setInitialProperties(current, root2, lanes);
                        current[internalInstanceKey] = finishedWork;
                        markNodeAsHoistable(current);
                        root2 = current;
                        break a;
                      case "link":
                        if (ii = getHydratableHoistableCache(
                          "link",
                          "href",
                          flags
                        ).get(root2 + (lanes.href || ""))) {
                          for (_eventPayloads$ii2 = 0; _eventPayloads$ii2 < ii.length; _eventPayloads$ii2++)
                            if (current = ii[_eventPayloads$ii2], current.getAttribute("href") === (null == lanes.href || "" === lanes.href ? null : lanes.href) && current.getAttribute("rel") === (null == lanes.rel ? null : lanes.rel) && current.getAttribute("title") === (null == lanes.title ? null : lanes.title) && current.getAttribute("crossorigin") === (null == lanes.crossOrigin ? null : lanes.crossOrigin)) {
                              ii.splice(_eventPayloads$ii2, 1);
                              break b;
                            }
                        }
                        current = flags.createElement(root2);
                        setInitialProperties(current, root2, lanes);
                        flags.head.appendChild(current);
                        break;
                      case "meta":
                        if (ii = getHydratableHoistableCache(
                          "meta",
                          "content",
                          flags
                        ).get(root2 + (lanes.content || ""))) {
                          for (_eventPayloads$ii2 = 0; _eventPayloads$ii2 < ii.length; _eventPayloads$ii2++)
                            if (current = ii[_eventPayloads$ii2], current.getAttribute("content") === (null == lanes.content ? null : "" + lanes.content) && current.getAttribute("name") === (null == lanes.name ? null : lanes.name) && current.getAttribute("property") === (null == lanes.property ? null : lanes.property) && current.getAttribute("http-equiv") === (null == lanes.httpEquiv ? null : lanes.httpEquiv) && current.getAttribute("charset") === (null == lanes.charSet ? null : lanes.charSet)) {
                              ii.splice(_eventPayloads$ii2, 1);
                              break b;
                            }
                        }
                        current = flags.createElement(root2);
                        setInitialProperties(current, root2, lanes);
                        flags.head.appendChild(current);
                        break;
                      default:
                        throw Error(formatProdErrorMessage(468, root2));
                    }
                    current[internalInstanceKey] = finishedWork;
                    markNodeAsHoistable(current);
                    root2 = current;
                  }
                  finishedWork.stateNode = root2;
                }
              else
                offscreenSubtreeIsHidden || mountHoistable(ii, finishedWork.type, finishedWork.stateNode);
            else
              finishedWork.stateNode = acquireResource(
                ii,
                lanes,
                finishedWork.memoizedProps
              );
          else
            flags !== lanes ? (null === flags ? (root2 = current.stateNode, null === root2 || offscreenSubtreeWasHidden || root2.parentNode.removeChild(root2)) : flags.count--, null === lanes ? offscreenSubtreeIsHidden || mountHoistable(ii, finishedWork.type, finishedWork.stateNode) : acquireResource(ii, lanes, finishedWork.memoizedProps)) : null === lanes && null !== finishedWork.stateNode && commitHostUpdate(
              finishedWork,
              finishedWork.memoizedProps,
              current.memoizedProps
            );
        break;
      case 27:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        null !== current && flags & 4 && commitHostUpdate(
          finishedWork,
          finishedWork.memoizedProps,
          current.memoizedProps
        );
        break;
      case 5:
        ii = offscreenDirectParentIsHidden;
        offscreenDirectParentIsHidden = false;
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        offscreenDirectParentIsHidden = ii;
        commitReconciliationEffects(finishedWork);
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        if (finishedWork.flags & 32) {
          root2 = finishedWork.stateNode;
          try {
            setTextContent(root2, ""), viewTransitionMutationContext = true;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        flags & 4 && null != finishedWork.stateNode && (root2 = finishedWork.memoizedProps, commitHostUpdate(
          finishedWork,
          root2,
          null !== current ? current.memoizedProps : root2
        ));
        flags & 1024 && (needsFormReset = true);
        break;
      case 6:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        if (flags & 4) {
          if (null === finishedWork.stateNode)
            throw Error(formatProdErrorMessage(162));
          root2 = finishedWork.memoizedProps;
          lanes = finishedWork.stateNode;
          try {
            lanes.nodeValue = root2, viewTransitionMutationContext = true;
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
        break;
      case 3:
        viewTransitionMutationContext = false;
        tagCaches = null;
        ii = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(root2.containerInfo);
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        currentHoistableRoot = ii;
        commitReconciliationEffects(finishedWork);
        if (flags & 4 && null !== current && current.memoizedState.isDehydrated)
          try {
            retryIfBlockedOn(root2.containerInfo);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        needsFormReset && (needsFormReset = false, recursivelyResetForms(finishedWork));
        viewTransitionMutationContext = false;
        break;
      case 4:
        flags = offscreenDirectParentIsHidden;
        offscreenDirectParentIsHidden = offscreenSubtreeIsHidden;
        current = pushMutationContext();
        ii = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(
          finishedWork.stateNode.containerInfo
        );
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        currentHoistableRoot = ii;
        viewTransitionMutationContext && inUpdateViewTransition && (rootViewTransitionAffected = true);
        viewTransitionMutationContext = current;
        offscreenDirectParentIsHidden = flags;
        break;
      case 12:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        break;
      case 31:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (root2 = finishedWork.updateQueue, null !== root2 && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root2)));
        break;
      case 13:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        finishedWork.child.flags & 8192 && null !== finishedWork.memoizedState !== (null !== current && null !== current.memoizedState) && (globalMostRecentFallbackTime = now());
        flags & 4 && (root2 = finishedWork.updateQueue, null !== root2 && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root2)));
        break;
      case 22:
        ii = null !== finishedWork.memoizedState;
        _eventPayloads$ii2 = null !== current && null !== current.memoizedState;
        var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden, prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden, prevOffscreenDirectParentIsHidden$166 = offscreenDirectParentIsHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
        offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$166 || ii;
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$166;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
        commitReconciliationEffects(finishedWork);
        flags & 8192 && (root2 = finishedWork.stateNode, root2._visibility = ii ? root2._visibility & -2 : root2._visibility | 1, !ii || null === current || _eventPayloads$ii2 || offscreenSubtreeIsHidden || offscreenSubtreeWasHidden || (root2 = _eventPayloads$ii2 || offscreenSubtreeWasHidden, lanes = offscreenSubtreeIsHidden, current = offscreenSubtreeWasHidden, offscreenSubtreeIsHidden = ii || offscreenSubtreeIsHidden, offscreenSubtreeWasHidden = root2, recursivelyTraverseDisappearLayoutEffects(finishedWork, 2), offscreenSubtreeIsHidden = lanes, offscreenSubtreeWasHidden = current), !ii && offscreenDirectParentIsHidden || hideOrUnhideAllChildren(finishedWork, ii));
        flags & 4 && (root2 = finishedWork.updateQueue, null !== root2 && (lanes = root2.retryQueue, null !== lanes && (root2.retryQueue = null, attachSuspenseRetryListeners(finishedWork, lanes))));
        break;
      case 19:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        flags & 4 && (root2 = finishedWork.updateQueue, null !== root2 && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root2)));
        break;
      case 30:
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
        flags = pushMutationContext();
        ii = inUpdateViewTransition;
        _eventPayloads$ii2 = (lanes & 335544064) === lanes;
        prevOffscreenSubtreeIsHidden = finishedWork.memoizedProps;
        inUpdateViewTransition = _eventPayloads$ii2 && "none" !== getViewTransitionClassName(
          prevOffscreenSubtreeIsHidden.default,
          prevOffscreenSubtreeIsHidden.update
        );
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes);
        commitReconciliationEffects(finishedWork);
        _eventPayloads$ii2 && null !== current && viewTransitionMutationContext && (finishedWork.flags |= 4);
        inUpdateViewTransition = ii;
        viewTransitionMutationContext = flags;
        break;
      case 21:
        break;
      case 7:
        flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return)), current && null !== current.stateNode && (current.stateNode._fragmentFiber = finishedWork);
      default:
        recursivelyTraverseMutationEffects(root2, finishedWork, lanes), commitReconciliationEffects(finishedWork);
    }
  }
  function commitReconciliationEffects(finishedWork) {
    var flags = finishedWork.flags;
    if (flags & 2) {
      try {
        for (var hostParentFiber, parentFiber = finishedWork.return; null !== parentFiber; ) {
          if (isHostParent(parentFiber)) {
            hostParentFiber = parentFiber;
            break;
          }
          parentFiber = parentFiber.return;
        }
        parentFiber = null;
        for (var parent = finishedWork.return; null !== parent; ) {
          if (isFragmentInstanceParent(parent)) {
            var fragmentInstance = parent.stateNode;
            null === parentFiber ? parentFiber = [fragmentInstance] : parentFiber.push(fragmentInstance);
          }
          if (isFragmentInstanceHostBoundary(parent)) break;
          parent = parent.return;
        }
        var JSCompiler_inline_result = parentFiber;
        if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
        switch (hostParentFiber.tag) {
          case 27:
            var parent$jscomp$0 = hostParentFiber.stateNode, before = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(
              finishedWork,
              before,
              parent$jscomp$0,
              JSCompiler_inline_result
            );
            break;
          case 5:
            var parent$149 = hostParentFiber.stateNode;
            hostParentFiber.flags & 32 && (setTextContent(parent$149, ""), hostParentFiber.flags &= -33);
            var before$150 = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(
              finishedWork,
              before$150,
              parent$149,
              JSCompiler_inline_result
            );
            break;
          case 3:
          case 4:
            var parent$151 = hostParentFiber.stateNode.containerInfo, before$152 = getHostSibling(finishedWork);
            insertOrAppendPlacementNodeIntoContainer(
              finishedWork,
              before$152,
              parent$151,
              JSCompiler_inline_result
            );
            break;
          default:
            throw Error(formatProdErrorMessage(161));
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
      finishedWork.flags &= -3;
    }
    flags & 4096 && (finishedWork.flags &= -4097);
  }
  function recursivelyResetForms(parentFiber) {
    if (parentFiber.subtreeFlags & 1024)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var fiber = parentFiber;
        recursivelyResetForms(fiber);
        5 === fiber.tag && fiber.flags & 1024 && (fiber = fiber.stateNode, _enabled = true, fiber.reset(), _enabled = false);
        parentFiber = parentFiber.sibling;
      }
  }
  function recursivelyTraverseAfterMutationEffects(root2, parentFiber) {
    if (parentFiber.subtreeFlags & 9270)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitAfterMutationEffectsOnFiber(parentFiber, root2), parentFiber = parentFiber.sibling;
    else measureNestedViewTransitions(parentFiber);
  }
  function commitAfterMutationEffectsOnFiber(finishedWork, root2) {
    var current = finishedWork.alternate;
    if (null === current) commitEnterViewTransitions(finishedWork, false);
    else
      switch (finishedWork.tag) {
        case 3:
          rootViewTransitionNameCanceled = viewTransitionContextChanged = false;
          pushViewTransitionCancelableScope();
          recursivelyTraverseAfterMutationEffects(root2, finishedWork);
          if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
            finishedWork = viewTransitionCancelableChildren;
            if (null !== finishedWork)
              for (var i = 0; i < finishedWork.length; i += 3) {
                current = finishedWork[i];
                var oldName = finishedWork[i + 1];
                restoreViewTransitionName(current, finishedWork[i + 2]);
                current = current.ownerDocument.documentElement;
                null !== current && current.animate(
                  { opacity: [0, 0], pointerEvents: ["none", "none"] },
                  {
                    duration: 0,
                    fill: "forwards",
                    pseudoElement: "::view-transition-group(" + oldName + ")"
                  }
                );
              }
            finishedWork = root2.containerInfo;
            finishedWork = 9 === finishedWork.nodeType ? finishedWork.documentElement : finishedWork.ownerDocument.documentElement;
            null !== finishedWork && "" === finishedWork.style.viewTransitionName && (finishedWork.style.viewTransitionName = "none", finishedWork.animate(
              { opacity: [0, 0], pointerEvents: ["none", "none"] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition-group(root)"
              }
            ), finishedWork.animate(
              { width: [0, 0], height: [0, 0] },
              {
                duration: 0,
                fill: "forwards",
                pseudoElement: "::view-transition"
              }
            ));
            rootViewTransitionNameCanceled = true;
          }
          viewTransitionCancelableChildren = null;
          break;
        case 5:
          recursivelyTraverseAfterMutationEffects(root2, finishedWork);
          break;
        case 4:
          i = viewTransitionContextChanged;
          viewTransitionContextChanged = false;
          recursivelyTraverseAfterMutationEffects(root2, finishedWork);
          viewTransitionContextChanged && (rootViewTransitionAffected = true);
          viewTransitionContextChanged = i;
          break;
        case 22:
          null === finishedWork.memoizedState && (null !== current.memoizedState ? commitEnterViewTransitions(finishedWork, false) : recursivelyTraverseAfterMutationEffects(root2, finishedWork));
          break;
        case 30:
          i = viewTransitionContextChanged;
          oldName = pushViewTransitionCancelableScope();
          viewTransitionContextChanged = false;
          recursivelyTraverseAfterMutationEffects(root2, finishedWork);
          viewTransitionContextChanged && (finishedWork.flags |= 4);
          var props = finishedWork.memoizedProps, state = finishedWork.stateNode;
          root2 = getViewTransitionName(props, state);
          state = getViewTransitionName(current.memoizedProps, state);
          var className = getViewTransitionClassName(props.default, props.update);
          "none" === className ? root2 = false : (props = current.memoizedState, current.memoizedState = null, current = finishedWork.child, viewTransitionHostInstanceIdx = 0, root2 = measureViewTransitionHostInstancesRecursive(
            finishedWork,
            current,
            root2,
            state,
            className,
            props,
            true
          ), viewTransitionHostInstanceIdx !== (null === props ? 0 : props.length) && (finishedWork.flags |= 32));
          0 !== (finishedWork.flags & 4) && root2 ? (scheduleViewTransitionEvent(
            finishedWork,
            finishedWork.memoizedProps.onUpdate
          ), viewTransitionCancelableChildren = oldName) : null !== oldName && (oldName.push.apply(oldName, viewTransitionCancelableChildren), viewTransitionCancelableChildren = oldName);
          viewTransitionContextChanged = 0 !== (finishedWork.flags & 32) ? true : i;
          break;
        default:
          recursivelyTraverseAfterMutationEffects(root2, finishedWork);
      }
  }
  function recursivelyTraverseLayoutEffects(root2, parentFiber) {
    if (parentFiber.subtreeFlags & 8772)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitLayoutEffectOnFiber(root2, parentFiber.alternate, parentFiber), parentFiber = parentFiber.sibling;
  }
  function recursivelyTraverseDisappearLayoutEffects(parentFiber, layoutEffectTraversalFlags$jscomp$0) {
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedWork = parentFiber, layoutEffectTraversalFlags = layoutEffectTraversalFlags$jscomp$0;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 1:
          safelyDetachRef(finishedWork, finishedWork.return);
          var instance = finishedWork.stateNode;
          "function" === typeof instance.componentWillUnmount && safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 27:
          0 !== (layoutEffectTraversalFlags & 2) && releaseSingletonInstance(
            finishedWork.stateNode,
            finishedWork.type,
            finishedWork.memoizedProps
          );
        case 5:
          safelyDetachRef(finishedWork, finishedWork.return);
          5 !== finishedWork.tag && 27 !== finishedWork.tag || commitFragmentInstanceDeletionEffects(finishedWork);
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 6:
          commitFragmentInstanceDeletionEffects(finishedWork);
          break;
        case 26:
          safelyDetachRef(finishedWork, finishedWork.return);
          instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState || null === instance || offscreenSubtreeWasHidden || instance.parentNode.removeChild(instance);
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 30:
          safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 7:
          safelyDetachRef(finishedWork, finishedWork.return);
        default:
          recursivelyTraverseDisappearLayoutEffects(
            finishedWork,
            layoutEffectTraversalFlags
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseReappearLayoutEffects(finishedRoot$jscomp$0, parentFiber, layoutEffectTraversalFlags) {
    layoutEffectTraversalFlags = 0 !== (parentFiber.subtreeFlags & 8772) ? layoutEffectTraversalFlags : layoutEffectTraversalFlags & -2;
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var current = parentFiber.alternate, finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags, includeWorkInProgressEffects = 0 !== (layoutEffectTraversalFlags & 1);
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          commitHookEffectListMount(4, finishedWork);
          break;
        case 1:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          current = finishedWork;
          finishedRoot = current.stateNode;
          if ("function" === typeof finishedRoot.componentDidMount)
            try {
              finishedRoot.componentDidMount();
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          current = finishedWork;
          finishedRoot = current.updateQueue;
          if (null !== finishedRoot) {
            var instance = current.stateNode;
            try {
              var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
              if (null !== hiddenCallbacks)
                for (finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0; finishedRoot < hiddenCallbacks.length; finishedRoot++)
                  callCallback(hiddenCallbacks[finishedRoot], instance);
            } catch (error) {
              captureCommitPhaseError(current, current.return, error);
            }
          }
          includeWorkInProgressEffects && flags & 64 && commitClassCallbacks(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 27:
          0 !== (layoutEffectTraversalFlags & 2) && commitHostSingletonAcquisition(finishedWork);
        case 5:
          5 !== finishedWork.tag && 27 !== finishedWork.tag || commitFragmentInstanceInsertionEffects(finishedWork);
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 6:
          commitFragmentInstanceInsertionEffects(finishedWork);
          break;
        case 26:
          instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState || null === instance || offscreenSubtreeIsHidden || mountHoistable(
            getHoistableRoot(instance.ownerDocument),
            finishedWork.type,
            instance
          );
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          break;
        case 31:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          includeWorkInProgressEffects && flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          includeWorkInProgressEffects && flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 22:
          null === finishedWork.memoizedState && recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 30:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 7:
          safelyAttachRef(finishedWork, finishedWork.return);
        default:
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitOffscreenPassiveMountEffects(current, finishedWork) {
    var previousCache = null;
    null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (previousCache = current.memoizedState.cachePool.pool);
    current = null;
    null !== finishedWork.memoizedState && null !== finishedWork.memoizedState.cachePool && (current = finishedWork.memoizedState.cachePool.pool);
    current !== previousCache && (null != current && current.refCount++, null != previousCache && releaseCache(previousCache));
  }
  function commitCachePassiveMountEffect(current, finishedWork) {
    current = null;
    null !== finishedWork.alternate && (current = finishedWork.alternate.memoizedState.cache);
    finishedWork = finishedWork.memoizedState.cache;
    finishedWork !== current && (finishedWork.refCount++, null != current && releaseCache(current));
  }
  function recursivelyTraversePassiveMountEffects(root2, parentFiber, committedLanes, committedTransitions) {
    var isViewTransitionEligible = (committedLanes & 335544064) === committedLanes;
    if (parentFiber.subtreeFlags & (isViewTransitionEligible ? 10262 : 10256))
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveMountOnFiber(
          root2,
          parentFiber,
          committedLanes,
          committedTransitions
        ), parentFiber = parentFiber.sibling;
    else isViewTransitionEligible && restoreNestedViewTransitions(parentFiber);
  }
  function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
    var isViewTransitionEligible = (committedLanes & 335544064) === committedLanes;
    isViewTransitionEligible && null === finishedWork.alternate && null !== finishedWork.return && null !== finishedWork.return.alternate && restoreEnterOrExitViewTransitions(finishedWork);
    var flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitHookEffectListMount(9, finishedWork);
        break;
      case 1:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 3:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        isViewTransitionEligible && rootViewTransitionNameCanceled && (finishedRoot = finishedRoot.containerInfo, finishedRoot = 9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot, "root" === finishedRoot.style.viewTransitionName && (finishedRoot.style.viewTransitionName = ""), finishedRoot = finishedRoot.ownerDocument.documentElement, null !== finishedRoot && "none" === finishedRoot.style.viewTransitionName && (finishedRoot.style.viewTransitionName = ""));
        flags & 2048 && (flags = null, null !== finishedWork.alternate && (flags = finishedWork.alternate.memoizedState.cache), finishedWork = finishedWork.memoizedState.cache, finishedWork !== flags && (finishedWork.refCount++, null != flags && releaseCache(flags)));
        break;
      case 12:
        if (flags & 2048) {
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
          flags = finishedWork.stateNode;
          try {
            var _finishedWork$memoize2 = finishedWork.memoizedProps, id = _finishedWork$memoize2.id, onPostCommit = _finishedWork$memoize2.onPostCommit;
            "function" === typeof onPostCommit && onPostCommit(
              id,
              null === finishedWork.alternate ? "mount" : "update",
              flags.passiveEffectDuration,
              -0
            );
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        } else
          recursivelyTraversePassiveMountEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions
          );
        break;
      case 31:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 13:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      case 23:
        break;
      case 22:
        _finishedWork$memoize2 = finishedWork.stateNode;
        id = finishedWork.alternate;
        null !== finishedWork.memoizedState ? (isViewTransitionEligible && null !== id && null === id.memoizedState && restoreEnterOrExitViewTransitions(id), _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : recursivelyTraverseAtomicPassiveEffects(
          finishedRoot,
          finishedWork
        )) : (isViewTransitionEligible && null !== id && null !== id.memoizedState && restoreEnterOrExitViewTransitions(finishedWork), _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        ) : (_finishedWork$memoize2._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          0 !== (finishedWork.subtreeFlags & 10256) || false
        )));
        flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
        break;
      case 24:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      case 30:
        isViewTransitionEligible && (flags = finishedWork.alternate, null !== flags && (restoreViewTransitionOnHostInstances(flags.child, true), restoreViewTransitionOnHostInstances(finishedWork.child, true)));
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        break;
      default:
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
    }
  }
  function recursivelyTraverseReconnectPassiveEffects(finishedRoot$jscomp$0, parentFiber, committedLanes$jscomp$0, committedTransitions$jscomp$0, includeWorkInProgressEffects) {
    includeWorkInProgressEffects = includeWorkInProgressEffects && (0 !== (parentFiber.subtreeFlags & 10256) || false);
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, committedLanes = committedLanes$jscomp$0, committedTransitions = committedTransitions$jscomp$0, flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          commitHookEffectListMount(8, finishedWork);
          break;
        case 23:
          break;
        case 22:
          var instance = finishedWork.stateNode;
          null !== finishedWork.memoizedState ? instance._visibility & 2 ? recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ) : recursivelyTraverseAtomicPassiveEffects(
            finishedRoot,
            finishedWork
          ) : (instance._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          ));
          includeWorkInProgressEffects && flags & 2048 && commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
          break;
        case 24:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
          includeWorkInProgressEffects && flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseReconnectPassiveEffects(
            finishedRoot,
            finishedWork,
            committedLanes,
            committedTransitions,
            includeWorkInProgressEffects
          );
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function recursivelyTraverseAtomicPassiveEffects(finishedRoot$jscomp$0, parentFiber) {
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; ) {
        var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
        switch (finishedWork.tag) {
          case 22:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
            break;
          case 24:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
            flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
            break;
          default:
            recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
        }
        parentFiber = parentFiber.sibling;
      }
  }
  var suspenseyCommitFlag = 8192;
  function recursivelyAccumulateSuspenseyCommit(parentFiber, committedLanes, suspendedState) {
    if (parentFiber.subtreeFlags & suspenseyCommitFlag)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        accumulateSuspenseyCommitOnFiber(
          parentFiber,
          committedLanes,
          suspendedState
        ), parentFiber = parentFiber.sibling;
  }
  function accumulateSuspenseyCommitOnFiber(fiber, committedLanes, suspendedState) {
    switch (fiber.tag) {
      case 26:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        fiber.flags & suspenseyCommitFlag && (null !== fiber.memoizedState ? suspendResource(
          suspendedState,
          currentHoistableRoot,
          fiber.memoizedState,
          fiber.memoizedProps
        ) : (fiber = fiber.stateNode, (committedLanes & 335544128) === committedLanes && suspendInstance(suspendedState, fiber)));
        break;
      case 5:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        fiber.flags & suspenseyCommitFlag && (fiber = fiber.stateNode, (committedLanes & 335544128) === committedLanes && suspendInstance(suspendedState, fiber));
        break;
      case 3:
      case 4:
        var previousHoistableRoot = currentHoistableRoot;
        currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        currentHoistableRoot = previousHoistableRoot;
        break;
      case 22:
        null === fiber.memoizedState && (previousHoistableRoot = fiber.alternate, null !== previousHoistableRoot && null !== previousHoistableRoot.memoizedState ? (previousHoistableRoot = suspenseyCommitFlag, suspenseyCommitFlag = 16777216, recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ), suspenseyCommitFlag = previousHoistableRoot) : recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        ));
        break;
      case 30:
        if (0 !== (fiber.flags & suspenseyCommitFlag) && (previousHoistableRoot = fiber.memoizedProps.name, null != previousHoistableRoot && "auto" !== previousHoistableRoot)) {
          var state = fiber.stateNode;
          state.paired = null;
          null === appearingViewTransitions && (appearingViewTransitions = /* @__PURE__ */ new Map());
          appearingViewTransitions.set(previousHoistableRoot, state);
        }
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
        break;
      default:
        recursivelyAccumulateSuspenseyCommit(
          fiber,
          committedLanes,
          suspendedState
        );
    }
  }
  function detachAlternateSiblings(parentFiber) {
    var previousFiber = parentFiber.alternate;
    if (null !== previousFiber && (parentFiber = previousFiber.child, null !== parentFiber)) {
      previousFiber.child = null;
      do
        previousFiber = parentFiber.sibling, parentFiber.sibling = null, parentFiber = previousFiber;
      while (null !== parentFiber);
    }
  }
  function recursivelyTraversePassiveUnmountEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    if (parentFiber.subtreeFlags & 10256)
      for (parentFiber = parentFiber.child; null !== parentFiber; )
        commitPassiveUnmountOnFiber(parentFiber), parentFiber = parentFiber.sibling;
  }
  function commitPassiveUnmountOnFiber(finishedWork) {
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        finishedWork.flags & 2048 && commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
        break;
      case 3:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 12:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      case 22:
        var instance = finishedWork.stateNode;
        null !== finishedWork.memoizedState && instance._visibility & 2 && (null === finishedWork.return || 13 !== finishedWork.return.tag) ? (instance._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork)) : recursivelyTraversePassiveUnmountEffects(finishedWork);
        break;
      default:
        recursivelyTraversePassiveUnmountEffects(finishedWork);
    }
  }
  function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
    var deletions = parentFiber.deletions;
    if (0 !== (parentFiber.flags & 16)) {
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++) {
          var childToDelete = deletions[i];
          nextEffect = childToDelete;
          commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
            childToDelete,
            parentFiber
          );
        }
      detachAlternateSiblings(parentFiber);
    }
    for (parentFiber = parentFiber.child; null !== parentFiber; ) {
      deletions = parentFiber;
      switch (deletions.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, deletions, deletions.return);
          recursivelyTraverseDisconnectPassiveEffects(deletions);
          break;
        case 22:
          i = deletions.stateNode;
          i._visibility & 2 && (i._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(deletions));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(deletions);
      }
      parentFiber = parentFiber.sibling;
    }
  }
  function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
    for (; null !== nextEffect; ) {
      var fiber = nextEffect;
      switch (fiber.tag) {
        case 0:
        case 11:
        case 15:
          commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
          break;
        case 23:
        case 22:
          if (null !== fiber.memoizedState && null !== fiber.memoizedState.cachePool) {
            var cache = fiber.memoizedState.cachePool.pool;
            null != cache && cache.refCount++;
          }
          break;
        case 24:
          releaseCache(fiber.memoizedState.cache);
      }
      cache = fiber.child;
      if (null !== cache) cache.return = fiber, nextEffect = cache;
      else
        a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
          cache = nextEffect;
          var sibling = cache.sibling, returnFiber = cache.return;
          detachFiberAfterEffects(cache);
          if (cache === fiber) {
            nextEffect = null;
            break a;
          }
          if (null !== sibling) {
            sibling.return = returnFiber;
            nextEffect = sibling;
            break a;
          }
          nextEffect = returnFiber;
        }
    }
  }
  var DefaultAsyncDispatcher = {
    getCacheForType: function(resourceType) {
      var cache = readContext(CacheContext), cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType && (cacheForType = resourceType(), cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function() {
      return readContext(CacheContext).controller.signal;
    }
  }, PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map, executionContext = 0, workInProgressRoot = null, workInProgress = null, workInProgressRootRenderLanes = 0, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, workInProgressRootDidSkipSuspendedSiblings = false, workInProgressRootIsPrerendering = false, workInProgressRootDidAttachPingListener = false, entangledRenderLanes = 0, workInProgressRootExitStatus = 0, workInProgressRootSkippedLanes = 0, workInProgressRootInterleavedUpdatedLanes = 0, workInProgressRootPingedLanes = 0, workInProgressDeferredLane = 0, workInProgressSuspendedRetryLanes = 0, workInProgressRootConcurrentErrors = null, workInProgressRootRecoverableErrors = null, workInProgressRootDidIncludeRecursiveRenderUpdate = false, globalMostRecentFallbackTime = 0, globalMostRecentTransitionTime = 0, workInProgressRootRenderTargetTime = Infinity, workInProgressTransitions = null, legacyErrorBoundariesThatAlreadyFailed = null, pendingEffectsStatus = 0, pendingEffectsRoot = null, pendingFinishedWork = null, pendingEffectsLanes = 0, pendingEffectsRemainingLanes = 0, pendingPassiveTransitions = null, pendingRecoverableErrors = null, pendingViewTransition = null, pendingViewTransitionEvents = null, pendingTransitionTypes = null, nestedUpdateCount = 0, rootWithNestedUpdates = null;
  function requestUpdateLane() {
    return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes : null !== ReactSharedInternals.T ? requestTransitionLane() : resolveUpdatePriority();
  }
  function requestDeferredLane() {
    if (0 === workInProgressDeferredLane)
      if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
        var lane = nextTransitionDeferredLane;
        nextTransitionDeferredLane <<= 1;
        0 === (nextTransitionDeferredLane & 3932160) && (nextTransitionDeferredLane = 262144);
        workInProgressDeferredLane = lane;
      } else workInProgressDeferredLane = 536870912;
    lane = suspenseHandlerStackCursor.current;
    null !== lane && (lane.flags |= 32);
    return workInProgressDeferredLane;
  }
  function scheduleViewTransitionEvent(fiber, callback) {
    if (null != callback) {
      var state = fiber.stateNode, instance = state.ref;
      null === instance && (instance = state.ref = createViewTransitionInstance(
        getViewTransitionName(fiber.memoizedProps, state)
      ));
      null === pendingViewTransitionEvents && (pendingViewTransitionEvents = []);
      pendingViewTransitionEvents.push(callback.bind(null, instance));
    }
  }
  function scheduleUpdateOnFiber(root2, fiber, lane) {
    if (root2 === workInProgressRoot && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      prepareFreshStack(root2, 0), markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      );
    markRootUpdated$1(root2, lane);
    if (0 === (executionContext & 2) || root2 !== workInProgressRoot)
      root2 === workInProgressRoot && (0 === (executionContext & 2) && (workInProgressRootInterleavedUpdatedLanes |= lane), 4 === workInProgressRootExitStatus && markRootSuspended(
        root2,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        false
      )), ensureRootIsScheduled(root2);
  }
  function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    var shouldTimeSlice = !forceSync && 0 === (lanes & 127) && 0 === (lanes & root$jscomp$0.expiredLanes) || checkIfRootIsPrerendering(root$jscomp$0, lanes), exitStatus = shouldTimeSlice ? renderRootConcurrent(root$jscomp$0, lanes) : renderRootSync(root$jscomp$0, lanes, true), renderWasConcurrent = shouldTimeSlice;
    do {
      if (0 === exitStatus) {
        workInProgressRootIsPrerendering && !shouldTimeSlice && markRootSuspended(root$jscomp$0, lanes, 0, false);
        break;
      } else {
        forceSync = root$jscomp$0.current.alternate;
        if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
          exitStatus = renderRootSync(root$jscomp$0, lanes, false);
          renderWasConcurrent = false;
          continue;
        }
        if (2 === exitStatus) {
          renderWasConcurrent = lanes;
          if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
            var JSCompiler_inline_result = 0;
          else
            JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913, JSCompiler_inline_result = 0 !== JSCompiler_inline_result ? JSCompiler_inline_result : JSCompiler_inline_result & 536870912 ? 536870912 : 0;
          if (0 !== JSCompiler_inline_result) {
            lanes = JSCompiler_inline_result;
            a: {
              var root2 = root$jscomp$0;
              exitStatus = workInProgressRootConcurrentErrors;
              var wasRootDehydrated = root2.current.memoizedState.isDehydrated;
              wasRootDehydrated && (prepareFreshStack(root2, JSCompiler_inline_result).flags |= 256);
              JSCompiler_inline_result = renderRootSync(
                root2,
                JSCompiler_inline_result,
                false
              );
              if (2 !== JSCompiler_inline_result && 6 !== JSCompiler_inline_result) {
                if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
                  root2.errorRecoveryDisabledLanes |= renderWasConcurrent;
                  workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
                  exitStatus = 4;
                  break a;
                }
                renderWasConcurrent = workInProgressRootRecoverableErrors;
                workInProgressRootRecoverableErrors = exitStatus;
                null !== renderWasConcurrent && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = renderWasConcurrent : workInProgressRootRecoverableErrors.push.apply(
                  workInProgressRootRecoverableErrors,
                  renderWasConcurrent
                ));
              }
              exitStatus = JSCompiler_inline_result;
            }
            renderWasConcurrent = false;
            if (2 !== exitStatus) continue;
          }
        }
        if (1 === exitStatus) {
          prepareFreshStack(root$jscomp$0, 0);
          markRootSuspended(root$jscomp$0, lanes, 0, true);
          break;
        }
        a: {
          shouldTimeSlice = root$jscomp$0;
          renderWasConcurrent = exitStatus;
          switch (renderWasConcurrent) {
            case 0:
            case 1:
              throw Error(formatProdErrorMessage(345));
            case 4:
              if ((lanes & 4194048) !== lanes && (lanes & 62914560) !== lanes)
                break;
            case 6:
              markRootSuspended(
                shouldTimeSlice,
                lanes,
                workInProgressDeferredLane,
                !workInProgressRootDidSkipSuspendedSiblings
              );
              break a;
            case 2:
              workInProgressRootRecoverableErrors = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(formatProdErrorMessage(329));
          }
          if ((lanes & 62914560) === lanes && (exitStatus = globalMostRecentFallbackTime + 300 - now(), 10 < exitStatus)) {
            markRootSuspended(
              shouldTimeSlice,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            if (0 !== getNextLanes(shouldTimeSlice, 0, true)) break a;
            pendingEffectsLanes = lanes;
            shouldTimeSlice.timeoutHandle = scheduleTimeout(
              completeRootWhenReady.bind(
                null,
                shouldTimeSlice,
                forceSync,
                workInProgressRootRecoverableErrors,
                workInProgressTransitions,
                workInProgressRootDidIncludeRecursiveRenderUpdate,
                lanes,
                workInProgressDeferredLane,
                workInProgressRootInterleavedUpdatedLanes,
                workInProgressSuspendedRetryLanes,
                workInProgressRootDidSkipSuspendedSiblings,
                renderWasConcurrent,
                "Throttled",
                -0,
                0
              ),
              exitStatus
            );
            break a;
          }
          completeRootWhenReady(
            shouldTimeSlice,
            forceSync,
            workInProgressRootRecoverableErrors,
            workInProgressTransitions,
            workInProgressRootDidIncludeRecursiveRenderUpdate,
            lanes,
            workInProgressDeferredLane,
            workInProgressRootInterleavedUpdatedLanes,
            workInProgressSuspendedRetryLanes,
            workInProgressRootDidSkipSuspendedSiblings,
            renderWasConcurrent,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (1);
    ensureRootIsScheduled(root$jscomp$0);
  }
  function completeRootWhenReady(root2, finishedWork, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, completedRenderStartTime, completedRenderEndTime) {
    root2.timeoutHandle = -1;
    var subtreeFlags = finishedWork.subtreeFlags, isViewTransitionEligible = (lanes & 335544064) === lanes;
    suspendedCommitReason = null;
    if (isViewTransitionEligible || subtreeFlags & 8192 || 16785408 === (subtreeFlags & 16785408)) {
      if (suspendedCommitReason = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: true,
        waitingForViewTransition: false,
        unsuspend: noop$1
      }, appearingViewTransitions = null, accumulateSuspenseyCommitOnFiber(
        finishedWork,
        lanes,
        suspendedCommitReason
      ), isViewTransitionEligible && (subtreeFlags = suspendedCommitReason, isViewTransitionEligible = root2.containerInfo, isViewTransitionEligible = (9 === isViewTransitionEligible.nodeType ? isViewTransitionEligible : isViewTransitionEligible.ownerDocument).__reactViewTransition, null != isViewTransitionEligible && (subtreeFlags.count++, subtreeFlags.waitingForViewTransition = true, subtreeFlags = onUnsuspend.bind(subtreeFlags), isViewTransitionEligible.finished.then(subtreeFlags, subtreeFlags))), subtreeFlags = (lanes & 62914560) === lanes ? globalMostRecentFallbackTime - now() : (lanes & 4194048) === lanes ? globalMostRecentTransitionTime - now() : 0, subtreeFlags = waitForCommitToBeReady(
        suspendedCommitReason,
        subtreeFlags
      ), null !== subtreeFlags) {
        pendingEffectsLanes = lanes;
        root2.cancelPendingCommit = subtreeFlags(
          completeRoot.bind(
            null,
            root2,
            finishedWork,
            lanes,
            recoverableErrors,
            transitions,
            didIncludeRenderPhaseUpdate,
            spawnedLane,
            updatedLanes,
            suspendedRetryLanes,
            didSkipSuspendedSiblings,
            exitStatus,
            suspendedCommitReason,
            null,
            completedRenderStartTime,
            completedRenderEndTime
          )
        );
        markRootSuspended(root2, lanes, spawnedLane, !didSkipSuspendedSiblings);
        return;
      }
    }
    completeRoot(
      root2,
      finishedWork,
      lanes,
      recoverableErrors,
      transitions,
      didIncludeRenderPhaseUpdate,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didSkipSuspendedSiblings,
      exitStatus,
      suspendedCommitReason
    );
  }
  function isRenderConsistentWithExternalStores(finishedWork) {
    for (var node = finishedWork; ; ) {
      var tag = node.tag;
      if ((0 === tag || 11 === tag || 15 === tag) && node.flags & 16384 && (tag = node.updateQueue, null !== tag && (tag = tag.stores, null !== tag)))
        for (var i = 0; i < tag.length; i++) {
          var check = tag[i], getSnapshot = check.getSnapshot;
          check = check.value;
          try {
            if (!objectIs(getSnapshot(), check)) return false;
          } catch (error) {
            return false;
          }
        }
      tag = node.child;
      if (node.subtreeFlags & 16384 && null !== tag)
        tag.return = node, node = tag;
      else {
        if (node === finishedWork) break;
        for (; null === node.sibling; ) {
          if (null === node.return || node.return === finishedWork) return true;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
    }
    return true;
  }
  function markRootSuspended(root2, suspendedLanes, spawnedLane, didAttemptEntireTree) {
    suspendedLanes = getEntangledLanes(root2, suspendedLanes);
    suspendedLanes &= ~workInProgressRootPingedLanes;
    suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
    root2.suspendedLanes |= suspendedLanes;
    root2.pingedLanes &= ~suspendedLanes;
    didAttemptEntireTree && (root2.warmLanes |= suspendedLanes);
    didAttemptEntireTree = root2.expirationTimes;
    for (var lanes = suspendedLanes; 0 < lanes; ) {
      var index$6 = 31 - clz32(lanes), lane = 1 << index$6;
      didAttemptEntireTree[index$6] = -1;
      lanes &= ~lane;
    }
    0 !== spawnedLane && markSpawnedDeferredLane(root2, spawnedLane, suspendedLanes);
  }
  function flushSyncWork$1() {
    return 0 === (executionContext & 6) ? (flushSyncWorkAcrossRoots_impl(0), false) : true;
  }
  function resetWorkInProgressStack() {
    if (null !== workInProgress) {
      if (0 === workInProgressSuspendedReason)
        var interruptedWork = workInProgress.return;
      else
        interruptedWork = workInProgress, lastContextDependency = currentlyRenderingFiber$1 = null, resetHooksOnUnwind(interruptedWork), thenableState$1 = null, thenableIndexCounter$1 = 0, interruptedWork = workInProgress;
      for (; null !== interruptedWork; )
        unwindInterruptedWork(interruptedWork.alternate, interruptedWork), interruptedWork = interruptedWork.return;
      workInProgress = null;
    }
  }
  function prepareFreshStack(root2, lanes) {
    var timeoutHandle = root2.timeoutHandle;
    -1 !== timeoutHandle && (root2.timeoutHandle = -1, cancelTimeout(timeoutHandle));
    timeoutHandle = root2.cancelPendingCommit;
    null !== timeoutHandle && (root2.cancelPendingCommit = null, timeoutHandle());
    pendingEffectsLanes = 0;
    resetWorkInProgressStack();
    workInProgressRoot = root2;
    workInProgress = timeoutHandle = createWorkInProgress(root2.current, null);
    workInProgressRootRenderLanes = lanes;
    workInProgressSuspendedReason = 0;
    workInProgressThrownValue = null;
    workInProgressRootDidSkipSuspendedSiblings = false;
    workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root2, lanes);
    workInProgressRootDidAttachPingListener = false;
    workInProgressSuspendedRetryLanes = workInProgressDeferredLane = workInProgressRootPingedLanes = workInProgressRootInterleavedUpdatedLanes = workInProgressRootSkippedLanes = workInProgressRootExitStatus = 0;
    workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
    workInProgressRootDidIncludeRecursiveRenderUpdate = false;
    entangledRenderLanes = getEntangledLanes(root2, lanes);
    finishQueueingConcurrentUpdates();
    return timeoutHandle;
  }
  function handleThrow(root2, thrownValue) {
    currentlyRenderingFiber = null;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    thrownValue === SuspenseException || thrownValue === SuspenseActionException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 3) : thrownValue === SuspenseyCommitException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 4) : workInProgressSuspendedReason = thrownValue === SelectiveHydrationException ? 8 : null !== thrownValue && "object" === typeof thrownValue && "function" === typeof thrownValue.then ? 6 : 1;
    workInProgressThrownValue = thrownValue;
    null === workInProgress && (workInProgressRootExitStatus = 1, logUncaughtError(
      root2,
      createCapturedValueAtFiber(thrownValue, root2.current)
    ));
  }
  function shouldRemainOnPreviousScreen() {
    var handler = suspenseHandlerStackCursor.current;
    return null === handler ? true : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes ? null === shellBoundary ? true : false : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes || 0 !== (workInProgressRootRenderLanes & 536870912) ? handler === shellBoundary : false;
  }
  function pushDispatcher() {
    var prevDispatcher = ReactSharedInternals.H;
    ReactSharedInternals.H = ContextOnlyDispatcher;
    return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
  }
  function pushAsyncDispatcher() {
    var prevAsyncDispatcher = ReactSharedInternals.A;
    ReactSharedInternals.A = DefaultAsyncDispatcher;
    return prevAsyncDispatcher;
  }
  function renderDidSuspendDelayIfPossible() {
    workInProgressRootExitStatus = 4;
    workInProgressRootDidSkipSuspendedSiblings || (workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes && null !== suspenseHandlerStackCursor.current || (workInProgressRootIsPrerendering = true);
    0 === (workInProgressRootSkippedLanes & 134217727) && 0 === (workInProgressRootInterleavedUpdatedLanes & 134217727) || null === workInProgressRoot || markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      false
    );
  }
  function renderRootSync(root2, lanes, shouldYieldForPrerendering) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    if (workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes)
      workInProgressTransitions = null, prepareFreshStack(root2, lanes);
    lanes = false;
    var exitStatus = workInProgressRootExitStatus;
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          var unitOfWork = workInProgress, thrownValue = workInProgressThrownValue;
          switch (workInProgressSuspendedReason) {
            case 8:
              resetWorkInProgressStack();
              exitStatus = 6;
              break a;
            case 3:
            case 2:
            case 9:
            case 6:
              null === suspenseHandlerStackCursor.current && (lanes = true);
              var reason = workInProgressSuspendedReason;
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
              if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
                exitStatus = 0;
                break a;
              }
              break;
            default:
              reason = workInProgressSuspendedReason, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, reason);
          }
        }
        workLoopSync();
        exitStatus = workInProgressRootExitStatus;
        break;
      } catch (thrownValue$184) {
        handleThrow(root2, thrownValue$184);
      }
    while (1);
    lanes && root2.shellSuspendCounter++;
    lastContextDependency = currentlyRenderingFiber$1 = null;
    executionContext = prevExecutionContext;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    null === workInProgress && (workInProgressRoot = null, workInProgressRootRenderLanes = 0, finishQueueingConcurrentUpdates());
    return exitStatus;
  }
  function workLoopSync() {
    for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
  }
  function renderRootConcurrent(root2, lanes) {
    var prevExecutionContext = executionContext;
    executionContext |= 2;
    var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
    workInProgressRoot !== root2 || workInProgressRootRenderLanes !== lanes ? (workInProgressTransitions = null, workInProgressRootRenderTargetTime = now() + 500, prepareFreshStack(root2, lanes)) : workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
      root2,
      lanes
    );
    a: do
      try {
        if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
          lanes = workInProgress;
          var thrownValue = workInProgressThrownValue;
          b: switch (workInProgressSuspendedReason) {
            case 1:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 1);
              break;
            case 2:
            case 9:
              if (isThenableResolved(thrownValue)) {
                workInProgressSuspendedReason = 0;
                workInProgressThrownValue = null;
                replaySuspendedUnitOfWork(lanes);
                break;
              }
              lanes = function() {
                2 !== workInProgressSuspendedReason && 9 !== workInProgressSuspendedReason || workInProgressRoot !== root2 || (workInProgressSuspendedReason = 7);
                ensureRootIsScheduled(root2);
              };
              thrownValue.then(lanes, lanes);
              break a;
            case 3:
              workInProgressSuspendedReason = 7;
              break a;
            case 4:
              workInProgressSuspendedReason = 5;
              break a;
            case 7:
              isThenableResolved(thrownValue) ? (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, replaySuspendedUnitOfWork(lanes)) : (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root2, lanes, thrownValue, 7));
              break;
            case 5:
              var resource = null;
              switch (workInProgress.tag) {
                case 26:
                  resource = workInProgress.memoizedState;
                case 5:
                case 27:
                  var hostFiber = workInProgress;
                  if (resource ? preloadResource(resource) : hostFiber.stateNode.complete) {
                    workInProgressSuspendedReason = 0;
                    workInProgressThrownValue = null;
                    var sibling = hostFiber.sibling;
                    if (null !== sibling) workInProgress = sibling;
                    else {
                      var returnFiber = hostFiber.return;
                      null !== returnFiber ? (workInProgress = returnFiber, completeUnitOfWork(returnFiber)) : workInProgress = null;
                    }
                    break b;
                  }
              }
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 5);
              break;
            case 6:
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              throwAndUnwindWorkLoop(root2, lanes, thrownValue, 6);
              break;
            case 8:
              resetWorkInProgressStack();
              workInProgressRootExitStatus = 6;
              break a;
            default:
              throw Error(formatProdErrorMessage(462));
          }
        }
        workLoopConcurrentByScheduler();
        break;
      } catch (thrownValue$186) {
        handleThrow(root2, thrownValue$186);
      }
    while (1);
    lastContextDependency = currentlyRenderingFiber$1 = null;
    ReactSharedInternals.H = prevDispatcher;
    ReactSharedInternals.A = prevAsyncDispatcher;
    executionContext = prevExecutionContext;
    if (null !== workInProgress) return 0;
    workInProgressRoot = null;
    workInProgressRootRenderLanes = 0;
    finishQueueingConcurrentUpdates();
    return workInProgressRootExitStatus;
  }
  function workLoopConcurrentByScheduler() {
    for (; null !== workInProgress && !shouldYield(); )
      performUnitOfWork(workInProgress);
  }
  function performUnitOfWork(unitOfWork) {
    var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function replaySuspendedUnitOfWork(unitOfWork) {
    var next = unitOfWork;
    var current = next.alternate;
    switch (next.tag) {
      case 15:
      case 0:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type,
          void 0,
          workInProgressRootRenderLanes
        );
        break;
      case 11:
        next = replayFunctionComponent(
          current,
          next,
          next.pendingProps,
          next.type.render,
          next.ref,
          workInProgressRootRenderLanes
        );
        break;
      case 5:
        resetHooksOnUnwind(next);
        var fiber = next;
        fiber === hydrationParentFiber && (isHydrating ? (popToNextHostParent(fiber), 5 === fiber.tag && null != fiber.stateNode && (nextHydratableInstance = fiber.stateNode)) : (popToNextHostParent(fiber), isHydrating = true));
      default:
        unwindInterruptedWork(current, next), next = workInProgress = resetWorkInProgress(next, entangledRenderLanes), next = beginWork(current, next, entangledRenderLanes);
    }
    unitOfWork.memoizedProps = unitOfWork.pendingProps;
    null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
  }
  function throwAndUnwindWorkLoop(root2, unitOfWork, thrownValue, suspendedReason) {
    lastContextDependency = currentlyRenderingFiber$1 = null;
    resetHooksOnUnwind(unitOfWork);
    thenableState$1 = null;
    thenableIndexCounter$1 = 0;
    var returnFiber = unitOfWork.return;
    try {
      if (throwException(
        root2,
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )) {
        workInProgressRootExitStatus = 1;
        logUncaughtError(
          root2,
          createCapturedValueAtFiber(thrownValue, root2.current)
        );
        workInProgress = null;
        return;
      }
    } catch (error) {
      if (null !== returnFiber) throw workInProgress = returnFiber, error;
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        root2,
        createCapturedValueAtFiber(thrownValue, root2.current)
      );
      workInProgress = null;
      return;
    }
    if (unitOfWork.flags & 32768) {
      if (isHydrating || 1 === suspendedReason) root2 = true;
      else if (workInProgressRootIsPrerendering || 0 !== (workInProgressRootRenderLanes & 536870912))
        root2 = false;
      else if (workInProgressRootDidSkipSuspendedSiblings = root2 = true, 2 === suspendedReason || 9 === suspendedReason || 3 === suspendedReason || 6 === suspendedReason)
        suspendedReason = suspenseHandlerStackCursor.current, null !== suspendedReason && 13 === suspendedReason.tag && (suspendedReason.flags |= 16384);
      unwindUnitOfWork(unitOfWork, root2);
    } else completeUnitOfWork(unitOfWork);
  }
  function completeUnitOfWork(unitOfWork) {
    var completedWork = unitOfWork;
    do {
      if (0 !== (completedWork.flags & 32768)) {
        unwindUnitOfWork(
          completedWork,
          workInProgressRootDidSkipSuspendedSiblings
        );
        return;
      }
      unitOfWork = completedWork.return;
      var next = completeWork(
        completedWork.alternate,
        completedWork,
        entangledRenderLanes
      );
      if (null !== next) {
        workInProgress = next;
        return;
      }
      completedWork = completedWork.sibling;
      if (null !== completedWork) {
        workInProgress = completedWork;
        return;
      }
      workInProgress = completedWork = unitOfWork;
    } while (null !== completedWork);
    0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
  }
  function unwindUnitOfWork(unitOfWork, skipSiblings) {
    do {
      var next = unwindWork(unitOfWork.alternate, unitOfWork);
      if (null !== next) {
        next.flags &= 32767;
        workInProgress = next;
        return;
      }
      next = unitOfWork.return;
      null !== next && (next.flags |= 32768, next.subtreeFlags = 0, next.deletions = null);
      if (!skipSiblings && (unitOfWork = unitOfWork.sibling, null !== unitOfWork)) {
        workInProgress = unitOfWork;
        return;
      }
      workInProgress = unitOfWork = next;
    } while (null !== unitOfWork);
    workInProgressRootExitStatus = 6;
    workInProgress = null;
  }
  function completeRoot(root2, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedState) {
    root2.cancelPendingCommit = null;
    do
      flushPendingEffects();
    while (0 !== pendingEffectsStatus);
    if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
    if (null !== finishedWork) {
      if (finishedWork === root2.current) throw Error(formatProdErrorMessage(177));
      root2 === workInProgressRoot && (workInProgress = workInProgressRoot = null, workInProgressRootRenderLanes = 0);
      pendingFinishedWork = finishedWork;
      pendingEffectsRoot = root2;
      pendingEffectsLanes = lanes;
      pendingPassiveTransitions = transitions;
      pendingRecoverableErrors = recoverableErrors;
      commitRoot(
        root2,
        finishedWork,
        lanes,
        spawnedLane,
        updatedLanes,
        suspendedRetryLanes,
        suspendedState
      );
    }
  }
  function commitRoot(root2, finishedWork, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, suspendedState) {
    var remainingLanes = finishedWork.lanes | finishedWork.childLanes;
    pendingEffectsRemainingLanes = remainingLanes;
    remainingLanes |= concurrentlyUpdatedLanes;
    markRootFinished(
      root2,
      lanes,
      remainingLanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes
    );
    pendingViewTransitionEvents = null;
    (lanes & 335544064) === lanes ? (pendingTransitionTypes = claimQueuedTransitionTypes(root2), spawnedLane = 10262) : (pendingTransitionTypes = null, spawnedLane = 10256);
    0 !== (finishedWork.subtreeFlags & spawnedLane) || 0 !== (finishedWork.flags & spawnedLane) ? (root2.callbackNode = null, root2.callbackPriority = 0, scheduleCallback$1(NormalPriority$1, function() {
      flushPassiveEffects();
      return null;
    })) : (root2.callbackNode = null, root2.callbackPriority = 0);
    shouldStartViewTransition = false;
    spawnedLane = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || spawnedLane) {
      spawnedLane = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      updatedLanes = ReactDOMSharedInternals.p;
      ReactDOMSharedInternals.p = 2;
      suspendedRetryLanes = executionContext;
      executionContext |= 4;
      try {
        commitBeforeMutationEffects(root2, finishedWork, lanes);
      } finally {
        executionContext = suspendedRetryLanes, ReactDOMSharedInternals.p = updatedLanes, ReactSharedInternals.T = spawnedLane;
      }
    }
    pendingEffectsStatus = 1;
    shouldStartViewTransition ? pendingViewTransition = startViewTransition(
      suspendedState,
      root2.containerInfo,
      pendingTransitionTypes,
      flushMutationEffects,
      flushLayoutEffects,
      flushAfterMutationEffects,
      flushSpawnedWork,
      flushPassiveEffects,
      reportViewTransitionError
    ) : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
  }
  function reportViewTransitionError(error) {
    if (0 !== pendingEffectsStatus) {
      var onRecoverableError = pendingEffectsRoot.onRecoverableError;
      onRecoverableError(error, { componentStack: null });
    }
  }
  function flushAfterMutationEffects() {
    3 === pendingEffectsStatus && (pendingEffectsStatus = 0, commitAfterMutationEffectsOnFiber(pendingFinishedWork, pendingEffectsRoot), pendingEffectsStatus = 4);
  }
  function flushMutationEffects() {
    if (1 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
      if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
        rootMutationHasEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          inUpdateViewTransition = rootViewTransitionAffected = false;
          commitMutationEffectsOnFiber(finishedWork, root2, lanes);
          lanes = selectionInformation;
          var curFocusedElem = getActiveElementDeep(root2.containerInfo), priorFocusedElem = lanes.focusedElem, priorSelectionRange = lanes.selectionRange;
          if (curFocusedElem !== priorFocusedElem && priorFocusedElem && priorFocusedElem.ownerDocument && containsNode(
            priorFocusedElem.ownerDocument.documentElement,
            priorFocusedElem
          )) {
            if (null !== priorSelectionRange && hasSelectionCapabilities(priorFocusedElem)) {
              var start = priorSelectionRange.start, end = priorSelectionRange.end;
              void 0 === end && (end = start);
              if ("selectionStart" in priorFocusedElem)
                priorFocusedElem.selectionStart = start, priorFocusedElem.selectionEnd = Math.min(
                  end,
                  priorFocusedElem.value.length
                );
              else {
                var doc = priorFocusedElem.ownerDocument || document, win = doc && doc.defaultView || window;
                if (win.getSelection) {
                  var selection = win.getSelection(), length = priorFocusedElem.textContent.length, start$jscomp$0 = Math.min(priorSelectionRange.start, length), end$jscomp$0 = void 0 === priorSelectionRange.end ? start$jscomp$0 : Math.min(priorSelectionRange.end, length);
                  !selection.extend && start$jscomp$0 > end$jscomp$0 && (curFocusedElem = end$jscomp$0, end$jscomp$0 = start$jscomp$0, start$jscomp$0 = curFocusedElem);
                  var startMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    start$jscomp$0
                  ), endMarker = getNodeForCharacterOffset(
                    priorFocusedElem,
                    end$jscomp$0
                  );
                  if (startMarker && endMarker && (1 !== selection.rangeCount || selection.anchorNode !== startMarker.node || selection.anchorOffset !== startMarker.offset || selection.focusNode !== endMarker.node || selection.focusOffset !== endMarker.offset)) {
                    var range = doc.createRange();
                    range.setStart(startMarker.node, startMarker.offset);
                    selection.removeAllRanges();
                    start$jscomp$0 > end$jscomp$0 ? (selection.addRange(range), selection.extend(endMarker.node, endMarker.offset)) : (range.setEnd(endMarker.node, endMarker.offset), selection.addRange(range));
                  }
                }
              }
            }
            doc = [];
            for (selection = priorFocusedElem; selection = selection.parentNode; )
              1 === selection.nodeType && doc.push({
                element: selection,
                left: selection.scrollLeft,
                top: selection.scrollTop
              });
            "function" === typeof priorFocusedElem.focus && priorFocusedElem.focus();
            for (priorFocusedElem = 0; priorFocusedElem < doc.length; priorFocusedElem++) {
              var info = doc[priorFocusedElem];
              info.element.scrollLeft = info.left;
              info.element.scrollTop = info.top;
            }
          }
          _enabled = !!eventsEnabled;
          selectionInformation = eventsEnabled = null;
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootMutationHasEffect;
        }
      }
      root2.current = finishedWork;
      pendingEffectsStatus = 2;
    }
  }
  function flushLayoutEffects() {
    if (2 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootHasLayoutEffect = 0 !== (finishedWork.flags & 8772);
      if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
        rootHasLayoutEffect = ReactSharedInternals.T;
        ReactSharedInternals.T = null;
        var previousPriority = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        var prevExecutionContext = executionContext;
        executionContext |= 4;
        try {
          commitLayoutEffectOnFiber(root2, finishedWork.alternate, finishedWork);
        } finally {
          executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootHasLayoutEffect;
        }
      }
      pendingEffectsStatus = 3;
    }
  }
  function flushSpawnedWork() {
    if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
      pendingEffectsStatus = 0;
      var committedViewTransition = pendingViewTransition;
      pendingViewTransition = null;
      requestPaint();
      var root2 = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, recoverableErrors = pendingRecoverableErrors, passiveSubtreeMask = (lanes & 335544064) === lanes ? 10262 : 10256;
      0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) || 0 !== (finishedWork.flags & passiveSubtreeMask) ? pendingEffectsStatus = 5 : (pendingEffectsStatus = 0, pendingFinishedWork = pendingEffectsRoot = null, releaseRootPooledCache(root2, root2.pendingLanes));
      passiveSubtreeMask = root2.pendingLanes;
      0 === passiveSubtreeMask && (legacyErrorBoundariesThatAlreadyFailed = null);
      lanesToEventPriority(lanes);
      finishedWork = finishedWork.stateNode;
      if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
        try {
          injectedHook.onCommitFiberRoot(
            rendererID,
            finishedWork,
            void 0,
            128 === (finishedWork.current.flags & 128)
          );
        } catch (err) {
        }
      if (null !== recoverableErrors) {
        finishedWork = ReactSharedInternals.T;
        passiveSubtreeMask = ReactDOMSharedInternals.p;
        ReactDOMSharedInternals.p = 2;
        ReactSharedInternals.T = null;
        try {
          for (var onRecoverableError = root2.onRecoverableError, i = 0; i < recoverableErrors.length; i++) {
            var recoverableError = recoverableErrors[i];
            onRecoverableError(recoverableError.value, {
              componentStack: recoverableError.stack
            });
          }
        } finally {
          ReactSharedInternals.T = finishedWork, ReactDOMSharedInternals.p = passiveSubtreeMask;
        }
      }
      recoverableErrors = pendingViewTransitionEvents;
      onRecoverableError = pendingTransitionTypes;
      pendingTransitionTypes = null;
      if (null !== recoverableErrors && (pendingViewTransitionEvents = null, null === onRecoverableError && (onRecoverableError = []), null !== committedViewTransition))
        for (recoverableError = 0; recoverableError < recoverableErrors.length; recoverableError++)
          finishedWork = (0, recoverableErrors[recoverableError])(
            onRecoverableError
          ), void 0 !== finishedWork && committedViewTransition.finished.finally(finishedWork);
      0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
      ensureRootIsScheduled(root2);
      passiveSubtreeMask = root2.pendingLanes;
      0 !== (lanes & 261930) && 0 !== (passiveSubtreeMask & 42) ? root2 === rootWithNestedUpdates ? nestedUpdateCount++ : (nestedUpdateCount = 0, rootWithNestedUpdates = root2) : (nestedUpdateCount = 0, rootWithNestedUpdates = null);
      flushSyncWorkAcrossRoots_impl(0);
    }
  }
  function releaseRootPooledCache(root2, remainingLanes) {
    0 === (root2.pooledCacheLanes &= remainingLanes) && (remainingLanes = root2.pooledCache, null != remainingLanes && (root2.pooledCache = null, releaseCache(remainingLanes)));
  }
  function flushPendingEffects() {
    null !== pendingViewTransition && (pendingViewTransition.skipTransition(), pendingViewTransition = null);
    flushMutationEffects();
    flushLayoutEffects();
    flushSpawnedWork();
    return flushPassiveEffects();
  }
  function flushPassiveEffects() {
    if (5 !== pendingEffectsStatus) return false;
    var root2 = pendingEffectsRoot, remainingLanes = pendingEffectsRemainingLanes;
    pendingEffectsRemainingLanes = 0;
    var renderPriority = lanesToEventPriority(pendingEffectsLanes), prevTransition = ReactSharedInternals.T, previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 32 > renderPriority ? 32 : renderPriority;
      ReactSharedInternals.T = null;
      renderPriority = pendingPassiveTransitions;
      pendingPassiveTransitions = null;
      var root$jscomp$0 = pendingEffectsRoot, lanes = pendingEffectsLanes;
      pendingEffectsStatus = 0;
      pendingFinishedWork = pendingEffectsRoot = null;
      pendingEffectsLanes = 0;
      if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
      var prevExecutionContext = executionContext;
      executionContext |= 4;
      commitPassiveUnmountOnFiber(root$jscomp$0.current);
      commitPassiveMountOnFiber(
        root$jscomp$0,
        root$jscomp$0.current,
        lanes,
        renderPriority
      );
      executionContext = prevExecutionContext;
      flushSyncWorkAcrossRoots_impl(0, false);
      if (injectedHook && "function" === typeof injectedHook.onPostCommitFiberRoot)
        try {
          injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
        } catch (err) {
        }
      return true;
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition, releaseRootPooledCache(root2, remainingLanes);
    }
  }
  function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
    sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
    sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
    rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
    null !== rootFiber && (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
  }
  function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
    if (3 === sourceFiber.tag)
      captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
    else
      for (; null !== nearestMountedAncestor; ) {
        if (3 === nearestMountedAncestor.tag) {
          captureCommitPhaseErrorOnRoot(
            nearestMountedAncestor,
            sourceFiber,
            error
          );
          break;
        } else if (1 === nearestMountedAncestor.tag) {
          var instance = nearestMountedAncestor.stateNode;
          if ("function" === typeof nearestMountedAncestor.type.getDerivedStateFromError || "function" === typeof instance.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(instance))) {
            sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
            error = createClassErrorUpdate(2);
            instance = enqueueUpdate(nearestMountedAncestor, error, 2);
            null !== instance && (initializeClassErrorUpdate(
              error,
              instance,
              nearestMountedAncestor,
              sourceFiber
            ), markRootUpdated$1(instance, 2), ensureRootIsScheduled(instance));
            break;
          }
        }
        nearestMountedAncestor = nearestMountedAncestor.return;
      }
  }
  function attachPingListener(root2, wakeable, lanes) {
    var pingCache = root2.pingCache;
    if (null === pingCache) {
      pingCache = root2.pingCache = new PossiblyWeakMap();
      var threadIDs = /* @__PURE__ */ new Set();
      pingCache.set(wakeable, threadIDs);
    } else
      threadIDs = pingCache.get(wakeable), void 0 === threadIDs && (threadIDs = /* @__PURE__ */ new Set(), pingCache.set(wakeable, threadIDs));
    threadIDs.has(lanes) || (workInProgressRootDidAttachPingListener = true, threadIDs.add(lanes), root2 = pingSuspendedRoot.bind(null, root2, wakeable, lanes), wakeable.then(root2, root2));
  }
  function pingSuspendedRoot(root2, wakeable, pingedLanes) {
    var pingCache = root2.pingCache;
    null !== pingCache && pingCache.delete(wakeable);
    root2.pingedLanes |= root2.suspendedLanes & pingedLanes;
    root2.warmLanes &= ~pingedLanes;
    workInProgressRoot === root2 && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes && (4 === workInProgressRootExitStatus || 3 === workInProgressRootExitStatus && (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes && 300 > now() - globalMostRecentFallbackTime ? 0 === (executionContext & 2) ? prepareFreshStack(root2, 0) : workInProgressRootPingedLanes |= pingedLanes : workInProgressRootPingedLanes |= pingedLanes, workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes && (workInProgressSuspendedRetryLanes = 0));
    ensureRootIsScheduled(root2);
  }
  function retryTimedOutBoundary(boundaryFiber, retryLane) {
    0 === retryLane && (retryLane = claimNextRetryLane());
    boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
    null !== boundaryFiber && (markRootUpdated$1(boundaryFiber, retryLane), ensureRootIsScheduled(boundaryFiber));
  }
  function retryDehydratedSuspenseBoundary(boundaryFiber) {
    var suspenseState = boundaryFiber.memoizedState, retryLane = 0;
    null !== suspenseState && (retryLane = suspenseState.retryLane);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function resolveRetryWakeable(boundaryFiber, wakeable) {
    var retryLane = 0;
    switch (boundaryFiber.tag) {
      case 31:
      case 13:
        var retryCache = boundaryFiber.stateNode;
        var suspenseState = boundaryFiber.memoizedState;
        null !== suspenseState && (retryLane = suspenseState.retryLane);
        break;
      case 19:
        retryCache = boundaryFiber.stateNode;
        break;
      case 22:
        retryCache = boundaryFiber.stateNode._retryCache;
        break;
      default:
        throw Error(formatProdErrorMessage(314));
    }
    null !== retryCache && retryCache.delete(wakeable);
    retryTimedOutBoundary(boundaryFiber, retryLane);
  }
  function scheduleCallback$1(priorityLevel, callback) {
    return scheduleCallback$3(priorityLevel, callback);
  }
  var firstScheduledRoot = null, lastScheduledRoot = null, didScheduleMicrotask = false, mightHavePendingSyncWork = false, isFlushingWork = false, currentEventTransitionLane = 0;
  function ensureRootIsScheduled(root2) {
    root2 !== lastScheduledRoot && null === root2.next && (null === lastScheduledRoot ? firstScheduledRoot = lastScheduledRoot = root2 : lastScheduledRoot = lastScheduledRoot.next = root2);
    mightHavePendingSyncWork = true;
    didScheduleMicrotask || (didScheduleMicrotask = true, scheduleImmediateRootScheduleTask());
  }
  function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
    if (!isFlushingWork && mightHavePendingSyncWork) {
      isFlushingWork = true;
      do {
        var didPerformSomeWork = false;
        for (var root$190 = firstScheduledRoot; null !== root$190; ) {
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root$190.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result = 0;
            else {
              var suspendedLanes = root$190.suspendedLanes, pingedLanes = root$190.pingedLanes;
              JSCompiler_inline_result = (1 << 31 - clz32(42 | syncTransitionLanes) + 1) - 1;
              JSCompiler_inline_result &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result = JSCompiler_inline_result & 201326741 ? JSCompiler_inline_result & 201326741 | 1 : JSCompiler_inline_result ? JSCompiler_inline_result | 2 : 0;
            }
            0 !== JSCompiler_inline_result && (didPerformSomeWork = true, performSyncWorkOnRoot(root$190, JSCompiler_inline_result));
          } else
            JSCompiler_inline_result = workInProgressRootRenderLanes, JSCompiler_inline_result = getNextLanes(
              root$190,
              root$190 === workInProgressRoot ? JSCompiler_inline_result : 0,
              null !== root$190.cancelPendingCommit || -1 !== root$190.timeoutHandle
            ), 0 === (JSCompiler_inline_result & 3) || checkIfRootIsPrerendering(root$190, JSCompiler_inline_result) || (didPerformSomeWork = true, performSyncWorkOnRoot(root$190, JSCompiler_inline_result));
          root$190 = root$190.next;
        }
      } while (didPerformSomeWork);
      isFlushingWork = false;
    }
  }
  function processRootScheduleInImmediateTask() {
    processRootScheduleInMicrotask();
  }
  function processRootScheduleInMicrotask() {
    mightHavePendingSyncWork = didScheduleMicrotask = false;
    var syncTransitionLanes = 0;
    0 !== currentEventTransitionLane && shouldAttemptEagerTransition() && (syncTransitionLanes = currentEventTransitionLane);
    for (var currentTime = now(), prev = null, root2 = firstScheduledRoot; null !== root2; ) {
      var next = root2.next, nextLanes = scheduleTaskForRootDuringMicrotask(root2, currentTime);
      if (0 === nextLanes)
        root2.next = null, null === prev ? firstScheduledRoot = next : prev.next = next, null === next && (lastScheduledRoot = prev);
      else if (prev = root2, 0 !== syncTransitionLanes || 0 !== (nextLanes & 3))
        mightHavePendingSyncWork = true;
      root2 = next;
    }
    0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus || flushSyncWorkAcrossRoots_impl(syncTransitionLanes);
    0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
  }
  function scheduleTaskForRootDuringMicrotask(root2, currentTime) {
    for (var suspendedLanes = root2.suspendedLanes, pingedLanes = root2.pingedLanes, expirationTimes = root2.expirationTimes, lanes = root2.pendingLanes & -62914561; 0 < lanes; ) {
      var index$5 = 31 - clz32(lanes), lane = 1 << index$5, expirationTime = expirationTimes[index$5];
      if (-1 === expirationTime) {
        if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
          expirationTimes[index$5] = computeExpirationTime(lane, currentTime);
      } else expirationTime <= currentTime && (root2.expiredLanes |= lane);
      lanes &= ~lane;
    }
    currentTime = workInProgressRoot;
    suspendedLanes = workInProgressRootRenderLanes;
    suspendedLanes = getNextLanes(
      root2,
      root2 === currentTime ? suspendedLanes : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    pingedLanes = root2.callbackNode;
    if (0 === suspendedLanes || root2 === currentTime && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root2.cancelPendingCommit)
      return null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes), root2.callbackNode = null, root2.callbackPriority = 0;
    if (0 === (suspendedLanes & 3) || checkIfRootIsPrerendering(root2, suspendedLanes)) {
      currentTime = suspendedLanes & -suspendedLanes;
      if (currentTime === root2.callbackPriority) return currentTime;
      null !== pingedLanes && cancelCallback$1(pingedLanes);
      switch (lanesToEventPriority(suspendedLanes)) {
        case 2:
        case 8:
          suspendedLanes = UserBlockingPriority;
          break;
        case 32:
          suspendedLanes = NormalPriority$1;
          break;
        case 268435456:
          suspendedLanes = IdlePriority;
          break;
        default:
          suspendedLanes = NormalPriority$1;
      }
      pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root2);
      suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
      root2.callbackPriority = currentTime;
      root2.callbackNode = suspendedLanes;
      return currentTime;
    }
    null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
    root2.callbackPriority = 2;
    root2.callbackNode = null;
    return 2;
  }
  function performWorkOnRootViaSchedulerTask(root2, didTimeout) {
    if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
      return root2.callbackNode = null, root2.callbackPriority = 0, null;
    var originalCallbackNode = root2.callbackNode;
    if (flushPendingEffects() && root2.callbackNode !== originalCallbackNode)
      return null;
    var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
    workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
      root2,
      root2 === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
      null !== root2.cancelPendingCommit || -1 !== root2.timeoutHandle
    );
    if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
    performWorkOnRoot(root2, workInProgressRootRenderLanes$jscomp$0, didTimeout);
    scheduleTaskForRootDuringMicrotask(root2, now());
    return null != root2.callbackNode && root2.callbackNode === originalCallbackNode ? performWorkOnRootViaSchedulerTask.bind(null, root2) : null;
  }
  function performSyncWorkOnRoot(root2, lanes) {
    if (flushPendingEffects()) return null;
    performWorkOnRoot(root2, lanes, true);
  }
  function scheduleImmediateRootScheduleTask() {
    scheduleMicrotask(function() {
      0 !== (executionContext & 6) ? scheduleCallback$3(
        ImmediatePriority,
        processRootScheduleInImmediateTask
      ) : processRootScheduleInMicrotask();
    });
  }
  function requestTransitionLane() {
    if (0 === currentEventTransitionLane) {
      var actionScopeLane = currentEntangledLane;
      0 === actionScopeLane && (actionScopeLane = nextTransitionUpdateLane, nextTransitionUpdateLane <<= 1, 0 === (nextTransitionUpdateLane & 261888) && (nextTransitionUpdateLane = 256));
      currentEventTransitionLane = actionScopeLane;
    }
    return currentEventTransitionLane;
  }
  function coerceFormActionProp(actionProp) {
    return null == actionProp || "symbol" === typeof actionProp || "boolean" === typeof actionProp ? null : "function" === typeof actionProp ? actionProp : sanitizeURL(actionProp);
  }
  function extractEvents$1(dispatchQueue, domEventName, maybeTargetInst, nativeEvent, nativeEventTarget) {
    if ("submit" === domEventName && maybeTargetInst && maybeTargetInst.stateNode === nativeEventTarget) {
      var action = coerceFormActionProp(
        (nativeEventTarget[internalPropsKey] || null).action
      ), submitter = nativeEvent.submitter;
      submitter && (domEventName = (domEventName = submitter[internalPropsKey] || null) ? coerceFormActionProp(domEventName.formAction) : submitter.getAttribute("formAction"), null !== domEventName && (action = domEventName, submitter = null));
      var event = new SyntheticEvent(
        "action",
        "action",
        null,
        nativeEvent,
        nativeEventTarget
      );
      dispatchQueue.push({
        event,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (nativeEvent.defaultPrevented) {
                if (0 !== currentEventTransitionLane) {
                  var formData = new FormData(nativeEventTarget, submitter);
                  startHostTransition(
                    maybeTargetInst,
                    {
                      pending: true,
                      data: formData,
                      method: nativeEventTarget.method,
                      action
                    },
                    null,
                    formData
                  );
                }
              } else
                "function" === typeof action && (event.preventDefault(), formData = new FormData(nativeEventTarget, submitter), startHostTransition(
                  maybeTargetInst,
                  {
                    pending: true,
                    data: formData,
                    method: nativeEventTarget.method,
                    action
                  },
                  action,
                  formData
                ));
            },
            currentTarget: nativeEventTarget
          }
        ]
      });
    }
  }
  for (var i$jscomp$inline_1667 = 0; i$jscomp$inline_1667 < simpleEventPluginEvents.length; i$jscomp$inline_1667++) {
    var eventName$jscomp$inline_1668 = simpleEventPluginEvents[i$jscomp$inline_1667], domEventName$jscomp$inline_1669 = eventName$jscomp$inline_1668.toLowerCase(), capitalizedEvent$jscomp$inline_1670 = eventName$jscomp$inline_1668[0].toUpperCase() + eventName$jscomp$inline_1668.slice(1);
    registerSimpleEvent(
      domEventName$jscomp$inline_1669,
      "on" + capitalizedEvent$jscomp$inline_1670
    );
  }
  registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
  registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
  registerSimpleEvent(ANIMATION_START, "onAnimationStart");
  registerSimpleEvent("dblclick", "onDoubleClick");
  registerSimpleEvent("focusin", "onFocus");
  registerSimpleEvent("focusout", "onBlur");
  registerSimpleEvent(TRANSITION_RUN, "onTransitionRun");
  registerSimpleEvent(TRANSITION_START, "onTransitionStart");
  registerSimpleEvent(TRANSITION_CANCEL, "onTransitionCancel");
  registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
  registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
  registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
  registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
  registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
  registerTwoPhaseEvent(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  );
  registerTwoPhaseEvent(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  );
  registerTwoPhaseEvent("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]);
  registerTwoPhaseEvent(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  );
  registerTwoPhaseEvent(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var mediaEventTypes = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), nonDelegatedEvents = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(mediaEventTypes)
  );
  function processDispatchQueue(dispatchQueue, eventSystemFlags) {
    eventSystemFlags = 0 !== (eventSystemFlags & 4);
    for (var i = 0; i < dispatchQueue.length; i++) {
      var _dispatchQueue$i = dispatchQueue[i], event = _dispatchQueue$i.event;
      _dispatchQueue$i = _dispatchQueue$i.listeners;
      a: {
        var previousInstance = void 0;
        if (eventSystemFlags)
          for (var i$jscomp$0 = _dispatchQueue$i.length - 1; 0 <= i$jscomp$0; i$jscomp$0--) {
            var _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0], instance = _dispatchListeners$i.instance, currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
        else
          for (i$jscomp$0 = 0; i$jscomp$0 < _dispatchQueue$i.length; i$jscomp$0++) {
            _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0];
            instance = _dispatchListeners$i.instance;
            currentTarget = _dispatchListeners$i.currentTarget;
            _dispatchListeners$i = _dispatchListeners$i.listener;
            if (instance !== previousInstance && event.isPropagationStopped())
              break a;
            previousInstance = _dispatchListeners$i;
            event.currentTarget = currentTarget;
            try {
              previousInstance(event);
            } catch (error) {
              reportGlobalError(error);
            }
            event.currentTarget = null;
            previousInstance = instance;
          }
      }
    }
  }
  function listenToNonDelegatedEvent(domEventName, targetElement) {
    var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
    void 0 === JSCompiler_inline_result && (JSCompiler_inline_result = targetElement[internalEventHandlersKey] = /* @__PURE__ */ new Set());
    var listenerSetKey = domEventName + "__bubble";
    JSCompiler_inline_result.has(listenerSetKey) || (addTrappedEventListener(targetElement, domEventName, 2, false), JSCompiler_inline_result.add(listenerSetKey));
  }
  function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
    var eventSystemFlags = 0;
    isCapturePhaseListener && (eventSystemFlags |= 4);
    addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener
    );
  }
  var listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
  function listenToAllSupportedEvents(rootContainerElement) {
    if (!rootContainerElement[listeningMarker]) {
      rootContainerElement[listeningMarker] = true;
      allNativeEvents.forEach(function(domEventName) {
        "selectionchange" !== domEventName && (nonDelegatedEvents.has(domEventName) || listenToNativeEvent(domEventName, false, rootContainerElement), listenToNativeEvent(domEventName, true, rootContainerElement));
      });
      var ownerDocument = 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
      null === ownerDocument || ownerDocument[listeningMarker] || (ownerDocument[listeningMarker] = true, listenToNativeEvent("selectionchange", false, ownerDocument));
    }
  }
  function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) {
    switch (getEventPriority(domEventName)) {
      case 2:
        var listenerWrapper = dispatchDiscreteEvent;
        break;
      case 8:
        listenerWrapper = dispatchContinuousEvent;
        break;
      default:
        listenerWrapper = dispatchEvent;
    }
    eventSystemFlags = listenerWrapper.bind(
      null,
      domEventName,
      eventSystemFlags,
      targetContainer
    );
    listenerWrapper = void 0;
    !passiveBrowserEventsSupported || "touchstart" !== domEventName && "touchmove" !== domEventName && "wheel" !== domEventName || (listenerWrapper = true);
    isCapturePhaseListener ? void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      capture: true,
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, true) : void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
      passive: listenerWrapper
    }) : targetContainer.addEventListener(domEventName, eventSystemFlags, false);
  }
  function dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst$jscomp$0, targetContainer) {
    var ancestorInst = targetInst$jscomp$0;
    if (0 === (eventSystemFlags & 1) && 0 === (eventSystemFlags & 2) && null !== targetInst$jscomp$0)
      a: for (; ; ) {
        if (null === targetInst$jscomp$0) return;
        var nodeTag = targetInst$jscomp$0.tag;
        if (3 === nodeTag || 4 === nodeTag) {
          var container = targetInst$jscomp$0.stateNode.containerInfo;
          if (container === targetContainer) break;
          if (4 === nodeTag)
            for (nodeTag = targetInst$jscomp$0.return; null !== nodeTag; ) {
              var grandTag = nodeTag.tag;
              if ((3 === grandTag || 4 === grandTag) && nodeTag.stateNode.containerInfo === targetContainer)
                return;
              nodeTag = nodeTag.return;
            }
          for (; null !== container; ) {
            nodeTag = getClosestInstanceFromNode(container);
            if (null === nodeTag) return;
            grandTag = nodeTag.tag;
            if (5 === grandTag || 6 === grandTag || 26 === grandTag || 27 === grandTag) {
              targetInst$jscomp$0 = ancestorInst = nodeTag;
              continue a;
            }
            container = container.parentNode;
          }
        }
        targetInst$jscomp$0 = targetInst$jscomp$0.return;
      }
    batchedUpdates$1(function() {
      var targetInst = ancestorInst, nativeEventTarget = getEventTarget(nativeEvent), dispatchQueue = [];
      a: {
        var reactName = topLevelEventsToReactNames.get(domEventName);
        if (void 0 !== reactName) {
          var SyntheticEventCtor = SyntheticEvent, reactEventType = domEventName;
          switch (domEventName) {
            case "keypress":
              if (0 === getEventCharCode(nativeEvent)) break a;
            case "keydown":
            case "keyup":
              SyntheticEventCtor = SyntheticKeyboardEvent;
              break;
            case "focusin":
              reactEventType = "focus";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "focusout":
              reactEventType = "blur";
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "beforeblur":
            case "afterblur":
              SyntheticEventCtor = SyntheticFocusEvent;
              break;
            case "click":
              if (2 === nativeEvent.button) break a;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              SyntheticEventCtor = SyntheticMouseEvent;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              SyntheticEventCtor = SyntheticDragEvent;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              SyntheticEventCtor = SyntheticTouchEvent;
              break;
            case ANIMATION_END:
            case ANIMATION_ITERATION:
            case ANIMATION_START:
              SyntheticEventCtor = SyntheticAnimationEvent;
              break;
            case TRANSITION_END:
              SyntheticEventCtor = SyntheticTransitionEvent;
              break;
            case "scroll":
            case "scrollend":
              SyntheticEventCtor = SyntheticUIEvent;
              break;
            case "wheel":
              SyntheticEventCtor = SyntheticWheelEvent;
              break;
            case "copy":
            case "cut":
            case "paste":
              SyntheticEventCtor = SyntheticClipboardEvent;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              SyntheticEventCtor = SyntheticPointerEvent;
              break;
            case "submit":
              SyntheticEventCtor = SyntheticSubmitEvent;
              break;
            case "toggle":
            case "beforetoggle":
              SyntheticEventCtor = SyntheticToggleEvent;
          }
          var inCapturePhase = 0 !== (eventSystemFlags & 4), accumulateTargetOnly = !inCapturePhase && ("scroll" === domEventName || "scrollend" === domEventName), reactEventName = inCapturePhase ? null !== reactName ? reactName + "Capture" : null : reactName;
          inCapturePhase = [];
          for (var instance = targetInst, lastHostComponent; null !== instance; ) {
            var _instance = instance;
            lastHostComponent = _instance.stateNode;
            _instance = _instance.tag;
            5 !== _instance && 26 !== _instance && 27 !== _instance || null === lastHostComponent || null === reactEventName || (_instance = getListener(instance, reactEventName), null != _instance && inCapturePhase.push(
              createDispatchListener(instance, _instance, lastHostComponent)
            ));
            if (accumulateTargetOnly) break;
            instance = instance.return;
          }
          0 < inCapturePhase.length && (reactName = new SyntheticEventCtor(
            reactName,
            reactEventType,
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({ event: reactName, listeners: inCapturePhase }));
        }
      }
      if (0 === (eventSystemFlags & 7)) {
        a: {
          SyntheticEventCtor = "mouseover" === domEventName || "pointerover" === domEventName;
          reactName = "mouseout" === domEventName || "pointerout" === domEventName;
          if (SyntheticEventCtor && nativeEvent !== currentReplayingEvent && (reactEventType = nativeEvent.relatedTarget || nativeEvent.fromElement) && (getClosestInstanceFromNode(reactEventType) || reactEventType[internalContainerInstanceKey]))
            break a;
          if (reactName || SyntheticEventCtor) {
            reactEventType = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget : (SyntheticEventCtor = nativeEventTarget.ownerDocument) ? SyntheticEventCtor.defaultView || SyntheticEventCtor.parentWindow : window;
            if (reactName) {
              if (SyntheticEventCtor = nativeEvent.relatedTarget || nativeEvent.toElement, reactName = targetInst, SyntheticEventCtor = SyntheticEventCtor ? getClosestInstanceFromNode(SyntheticEventCtor) : null, null !== SyntheticEventCtor && (accumulateTargetOnly = getNearestMountedFiber(SyntheticEventCtor), inCapturePhase = SyntheticEventCtor.tag, SyntheticEventCtor !== accumulateTargetOnly || 5 !== inCapturePhase && 27 !== inCapturePhase && 6 !== inCapturePhase))
                SyntheticEventCtor = null;
            } else reactName = null, SyntheticEventCtor = targetInst;
            if (reactName !== SyntheticEventCtor) {
              inCapturePhase = SyntheticMouseEvent;
              _instance = "onMouseLeave";
              reactEventName = "onMouseEnter";
              instance = "mouse";
              if ("pointerout" === domEventName || "pointerover" === domEventName)
                inCapturePhase = SyntheticPointerEvent, _instance = "onPointerLeave", reactEventName = "onPointerEnter", instance = "pointer";
              accumulateTargetOnly = null == reactName ? reactEventType : getNodeFromInstance(reactName);
              lastHostComponent = null == SyntheticEventCtor ? reactEventType : getNodeFromInstance(SyntheticEventCtor);
              reactEventType = new inCapturePhase(
                _instance,
                instance + "leave",
                reactName,
                nativeEvent,
                nativeEventTarget
              );
              reactEventType.target = accumulateTargetOnly;
              reactEventType.relatedTarget = lastHostComponent;
              _instance = null;
              getClosestInstanceFromNode(nativeEventTarget) === targetInst && (inCapturePhase = new inCapturePhase(
                reactEventName,
                instance + "enter",
                SyntheticEventCtor,
                nativeEvent,
                nativeEventTarget
              ), inCapturePhase.target = lastHostComponent, inCapturePhase.relatedTarget = accumulateTargetOnly, _instance = inCapturePhase);
              accumulateTargetOnly = _instance;
              inCapturePhase = reactName && SyntheticEventCtor ? getLowestCommonAncestor(
                reactName,
                SyntheticEventCtor,
                getParent
              ) : null;
              null !== reactName && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                reactEventType,
                reactName,
                inCapturePhase,
                false
              );
              null !== SyntheticEventCtor && null !== accumulateTargetOnly && accumulateEnterLeaveListenersForEvent(
                dispatchQueue,
                accumulateTargetOnly,
                SyntheticEventCtor,
                inCapturePhase,
                true
              );
            }
          }
        }
        a: {
          reactName = targetInst ? getNodeFromInstance(targetInst) : window;
          SyntheticEventCtor = reactName.nodeName && reactName.nodeName.toLowerCase();
          if ("select" === SyntheticEventCtor || "input" === SyntheticEventCtor && "file" === reactName.type)
            var getTargetInstFunc = getTargetInstForChangeEvent;
          else if (isTextInputElement(reactName))
            if (isInputEventSupported)
              getTargetInstFunc = getTargetInstForInputOrChangeEvent;
            else {
              getTargetInstFunc = getTargetInstForInputEventPolyfill;
              var handleEventFunc = handleEventsForInputEventPolyfill;
            }
          else
            SyntheticEventCtor = reactName.nodeName, !SyntheticEventCtor || "input" !== SyntheticEventCtor.toLowerCase() || "checkbox" !== reactName.type && "radio" !== reactName.type ? targetInst && isCustomElement(targetInst.elementType) && (getTargetInstFunc = getTargetInstForChangeEvent) : getTargetInstFunc = getTargetInstForClickEvent;
          if (getTargetInstFunc && (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))) {
            createAndAccumulateChangeEvent(
              dispatchQueue,
              getTargetInstFunc,
              nativeEvent,
              nativeEventTarget
            );
            break a;
          }
          handleEventFunc && handleEventFunc(domEventName, reactName, targetInst);
        }
        handleEventFunc = targetInst ? getNodeFromInstance(targetInst) : window;
        switch (domEventName) {
          case "focusin":
            if (isTextInputElement(handleEventFunc) || "true" === handleEventFunc.contentEditable)
              activeElement = handleEventFunc, activeElementInst = targetInst, lastSelection = null;
            break;
          case "focusout":
            lastSelection = activeElementInst = activeElement = null;
            break;
          case "mousedown":
            mouseDown = true;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            mouseDown = false;
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
            break;
          case "selectionchange":
            if (skipSelectionChangeEvent) break;
          case "keydown":
          case "keyup":
            constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
        }
        var fallbackData;
        if (canUseCompositionEvent)
          b: {
            switch (domEventName) {
              case "compositionstart":
                var eventType = "onCompositionStart";
                break b;
              case "compositionend":
                eventType = "onCompositionEnd";
                break b;
              case "compositionupdate":
                eventType = "onCompositionUpdate";
                break b;
            }
            eventType = void 0;
          }
        else
          isComposing ? isFallbackCompositionEnd(domEventName, nativeEvent) && (eventType = "onCompositionEnd") : "keydown" === domEventName && 229 === nativeEvent.keyCode && (eventType = "onCompositionStart");
        eventType && (useFallbackCompositionData && "ko" !== nativeEvent.locale && (isComposing || "onCompositionStart" !== eventType ? "onCompositionEnd" === eventType && isComposing && (fallbackData = getData()) : (root = nativeEventTarget, startText = "value" in root ? root.value : root.textContent, isComposing = true)), handleEventFunc = accumulateTwoPhaseListeners(targetInst, eventType), 0 < handleEventFunc.length && (eventType = new SyntheticCompositionEvent(
          eventType,
          domEventName,
          null,
          nativeEvent,
          nativeEventTarget
        ), dispatchQueue.push({ event: eventType, listeners: handleEventFunc }), fallbackData ? eventType.data = fallbackData : (fallbackData = getDataFromCustomEvent(nativeEvent), null !== fallbackData && (eventType.data = fallbackData))));
        if (fallbackData = canUseTextInputEvent ? getNativeBeforeInputChars(domEventName, nativeEvent) : getFallbackBeforeInputChars(domEventName, nativeEvent))
          eventType = accumulateTwoPhaseListeners(targetInst, "onBeforeInput"), 0 < eventType.length && (handleEventFunc = new SyntheticCompositionEvent(
            "onBeforeInput",
            "beforeinput",
            null,
            nativeEvent,
            nativeEventTarget
          ), dispatchQueue.push({
            event: handleEventFunc,
            listeners: eventType
          }), handleEventFunc.data = fallbackData);
        extractEvents$1(
          dispatchQueue,
          domEventName,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
      }
      processDispatchQueue(dispatchQueue, eventSystemFlags);
    });
  }
  function createDispatchListener(instance, listener, currentTarget) {
    return {
      instance,
      listener,
      currentTarget
    };
  }
  function accumulateTwoPhaseListeners(targetFiber, reactName) {
    for (var captureName = reactName + "Capture", listeners = []; null !== targetFiber; ) {
      var _instance2 = targetFiber, stateNode = _instance2.stateNode;
      _instance2 = _instance2.tag;
      5 !== _instance2 && 26 !== _instance2 && 27 !== _instance2 || null === stateNode || (_instance2 = getListener(targetFiber, captureName), null != _instance2 && listeners.unshift(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ), _instance2 = getListener(targetFiber, reactName), null != _instance2 && listeners.push(
        createDispatchListener(targetFiber, _instance2, stateNode)
      ));
      if (3 === targetFiber.tag) return listeners;
      targetFiber = targetFiber.return;
    }
    return [];
  }
  function getParent(inst) {
    if (null === inst) return null;
    do
      inst = inst.return;
    while (inst && 5 !== inst.tag && 27 !== inst.tag);
    return inst ? inst : null;
  }
  function accumulateEnterLeaveListenersForEvent(dispatchQueue, event, target, common, inCapturePhase) {
    for (var registrationName = event._reactName, listeners = []; null !== target && target !== common; ) {
      var _instance3 = target, alternate = _instance3.alternate, stateNode = _instance3.stateNode;
      _instance3 = _instance3.tag;
      if (null !== alternate && alternate === common) break;
      5 !== _instance3 && 26 !== _instance3 && 27 !== _instance3 || null === stateNode || (alternate = stateNode, inCapturePhase ? (stateNode = getListener(target, registrationName), null != stateNode && listeners.unshift(
        createDispatchListener(target, stateNode, alternate)
      )) : inCapturePhase || (stateNode = getListener(target, registrationName), null != stateNode && listeners.push(
        createDispatchListener(target, stateNode, alternate)
      )));
      target = target.return;
    }
    0 !== listeners.length && dispatchQueue.push({ event, listeners });
  }
  var NORMALIZE_NEWLINES_REGEX = /\r\n?/g, NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
  function normalizeMarkupForTextOrAttribute(markup) {
    return ("string" === typeof markup ? markup : "" + markup).replace(NORMALIZE_NEWLINES_REGEX, "\n").replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
  }
  function checkForUnmatchedText(serverText, clientText) {
    clientText = normalizeMarkupForTextOrAttribute(clientText);
    return normalizeMarkupForTextOrAttribute(serverText) === clientText ? true : false;
  }
  function setProp(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "children":
        if ("string" === typeof value)
          "body" === tag || "textarea" === tag && "" === value || setTextContent(domElement, value);
        else if ("number" === typeof value || "bigint" === typeof value)
          "body" !== tag && setTextContent(domElement, "" + value);
        else return;
        break;
      case "className":
        setValueForKnownAttribute(domElement, "class", value);
        break;
      case "tabIndex":
        setValueForKnownAttribute(domElement, "tabindex", value);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        setValueForKnownAttribute(domElement, key, value);
        break;
      case "style":
        setValueForStyles(domElement, value, prevValue);
        return;
      case "data":
        if ("object" !== tag) {
          setValueForKnownAttribute(domElement, "data", value);
          break;
        }
      case "src":
      case "href":
        if ("" === value && ("a" !== tag || "href" !== key)) {
          domElement.removeAttribute(key);
          break;
        }
        if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL(value);
        domElement.setAttribute(key, value);
        break;
      case "action":
      case "formAction":
        if ("function" === typeof value) {
          domElement.setAttribute(
            key,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          "function" === typeof prevValue && ("formAction" === key ? ("input" !== tag && setProp(domElement, tag, "name", props.name, props, null), setProp(
            domElement,
            tag,
            "formEncType",
            props.formEncType,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formMethod",
            props.formMethod,
            props,
            null
          ), setProp(
            domElement,
            tag,
            "formTarget",
            props.formTarget,
            props,
            null
          )) : (setProp(domElement, tag, "encType", props.encType, props, null), setProp(domElement, tag, "method", props.method, props, null), setProp(domElement, tag, "target", props.target, props, null)));
        if (null == value || "symbol" === typeof value || "boolean" === typeof value) {
          domElement.removeAttribute(key);
          break;
        }
        value = sanitizeURL(value);
        domElement.setAttribute(key, value);
        break;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        return;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        return;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        return;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            (null != prevValue ? prevValue.__html : void 0) !== key && (domElement.innerHTML = key);
          }
        }
        break;
      case "multiple":
        domElement.multiple = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "muted":
        domElement.muted = value && "function" !== typeof value && "symbol" !== typeof value;
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (null == value || "function" === typeof value || "boolean" === typeof value || "symbol" === typeof value) {
          domElement.removeAttribute("xlink:href");
          break;
        }
        key = sanitizeURL(value);
        domElement.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          key
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "credentialless":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "") : domElement.removeAttribute(key);
        break;
      case "capture":
      case "download":
        true === value ? domElement.setAttribute(key, "") : false !== value && null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        null != value && "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
        break;
      case "rowSpan":
      case "start":
        null == value || "function" === typeof value || "symbol" === typeof value || isNaN(value) ? domElement.removeAttribute(key) : domElement.setAttribute(key, value);
        break;
      case "popover":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        setValueForAttribute(domElement, "popover", value);
        break;
      case "xlinkActuate":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          value
        );
        break;
      case "xlinkArcrole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          value
        );
        break;
      case "xlinkRole":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          value
        );
        break;
      case "xlinkShow":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          value
        );
        break;
      case "xlinkTitle":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          value
        );
        break;
      case "xlinkType":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          value
        );
        break;
      case "xmlBase":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          value
        );
        break;
      case "xmlLang":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          value
        );
        break;
      case "xmlSpace":
        setValueForNamespacedAttribute(
          domElement,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          value
        );
        break;
      case "is":
        setValueForAttribute(domElement, "is", value);
        break;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!(2 < key.length) || "o" !== key[0] && "O" !== key[0] || "n" !== key[1] && "N" !== key[1])
          key = aliases.get(key) || key, setValueForAttribute(domElement, key, value);
        else return;
    }
    viewTransitionMutationContext = true;
  }
  function setPropOnCustomElement(domElement, tag, key, value, props, prevValue) {
    switch (key) {
      case "style":
        setValueForStyles(domElement, value, prevValue);
        return;
      case "dangerouslySetInnerHTML":
        if (null != value) {
          if ("object" !== typeof value || !("__html" in value))
            throw Error(formatProdErrorMessage(61));
          key = value.__html;
          if (null != key) {
            if (null != props.children) throw Error(formatProdErrorMessage(60));
            (null != prevValue ? prevValue.__html : void 0) !== key && (domElement.innerHTML = key);
          }
        }
        break;
      case "children":
        if ("string" === typeof value) setTextContent(domElement, value);
        else if ("number" === typeof value || "bigint" === typeof value)
          setTextContent(domElement, "" + value);
        else return;
        break;
      case "onScroll":
        null != value && listenToNonDelegatedEvent("scroll", domElement);
        return;
      case "onScrollEnd":
        null != value && listenToNonDelegatedEvent("scrollend", domElement);
        return;
      case "onClick":
        null != value && (domElement.onclick = noop$1);
        return;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        return;
      case "innerText":
      case "textContent":
        return;
      default:
        if (!registrationNameDependencies.hasOwnProperty(key))
          a: {
            if ("o" === key[0] && "n" === key[1] && (props = key.endsWith("Capture"), prevValue = key.slice(2, props ? key.length - 7 : void 0), tag = domElement[internalPropsKey] || null, tag = null != tag ? tag[key] : null, "function" === typeof tag && domElement.removeEventListener(prevValue, tag, props), "function" === typeof value)) {
              "function" !== typeof tag && null !== tag && (key in domElement ? domElement[key] = null : domElement.hasAttribute(key) && domElement.removeAttribute(key));
              domElement.addEventListener(prevValue, value, props);
              break a;
            }
            viewTransitionMutationContext = true;
            key in domElement ? domElement[key] = value : true === value ? domElement.setAttribute(key, "") : setValueForAttribute(domElement, key, value);
          }
        return;
    }
    viewTransitionMutationContext = true;
  }
  function setInitialProperties(domElement, tag, props) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        var hasSrc = false, hasSrcSet = false, propKey;
        for (propKey in props)
          if (props.hasOwnProperty(propKey)) {
            var propValue = props[propKey];
            if (null != propValue)
              switch (propKey) {
                case "src":
                  hasSrc = true;
                  break;
                case "srcSet":
                  hasSrcSet = true;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(formatProdErrorMessage(137, tag));
                default:
                  setProp(domElement, tag, propKey, propValue, props, null);
              }
          }
        hasSrcSet && setProp(domElement, tag, "srcSet", props.srcSet, props, null);
        hasSrc && setProp(domElement, tag, "src", props.src, props, null);
        return;
      case "input":
        listenToNonDelegatedEvent("invalid", domElement);
        var defaultValue = propKey = propValue = hasSrcSet = null, checked = null, defaultChecked = null;
        for (hasSrc in props)
          if (props.hasOwnProperty(hasSrc)) {
            var propValue$204 = props[hasSrc];
            if (null != propValue$204)
              switch (hasSrc) {
                case "name":
                  hasSrcSet = propValue$204;
                  break;
                case "type":
                  propValue = propValue$204;
                  break;
                case "checked":
                  checked = propValue$204;
                  break;
                case "defaultChecked":
                  defaultChecked = propValue$204;
                  break;
                case "value":
                  propKey = propValue$204;
                  break;
                case "defaultValue":
                  defaultValue = propValue$204;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (null != propValue$204)
                    throw Error(formatProdErrorMessage(137, tag));
                  break;
                default:
                  setProp(domElement, tag, hasSrc, propValue$204, props, null);
              }
          }
        initInput(
          domElement,
          propKey,
          defaultValue,
          checked,
          defaultChecked,
          propValue,
          hasSrcSet,
          false
        );
        return;
      case "select":
        listenToNonDelegatedEvent("invalid", domElement);
        hasSrc = propValue = propKey = null;
        for (hasSrcSet in props)
          if (props.hasOwnProperty(hasSrcSet) && (defaultValue = props[hasSrcSet], null != defaultValue))
            switch (hasSrcSet) {
              case "value":
                propKey = defaultValue;
                break;
              case "defaultValue":
                propValue = defaultValue;
                break;
              case "multiple":
                hasSrc = defaultValue;
              default:
                setProp(domElement, tag, hasSrcSet, defaultValue, props, null);
            }
        tag = propKey;
        props = propValue;
        domElement.multiple = !!hasSrc;
        null != tag ? updateOptions(domElement, !!hasSrc, tag, false) : null != props && updateOptions(domElement, !!hasSrc, props, true);
        return;
      case "textarea":
        listenToNonDelegatedEvent("invalid", domElement);
        propKey = hasSrcSet = hasSrc = null;
        for (propValue in props)
          if (props.hasOwnProperty(propValue) && (defaultValue = props[propValue], null != defaultValue))
            switch (propValue) {
              case "value":
                hasSrc = defaultValue;
                break;
              case "defaultValue":
                hasSrcSet = defaultValue;
                break;
              case "children":
                propKey = defaultValue;
                break;
              case "dangerouslySetInnerHTML":
                if (null != defaultValue) throw Error(formatProdErrorMessage(91));
                break;
              default:
                setProp(domElement, tag, propValue, defaultValue, props, null);
            }
        initTextarea(domElement, hasSrc, hasSrcSet, propKey);
        return;
      case "option":
        for (checked in props)
          if (props.hasOwnProperty(checked) && (hasSrc = props[checked], null != hasSrc))
            switch (checked) {
              case "selected":
                domElement.selected = hasSrc && "function" !== typeof hasSrc && "symbol" !== typeof hasSrc;
                break;
              default:
                setProp(domElement, tag, checked, hasSrc, props, null);
            }
        return;
      case "dialog":
        listenToNonDelegatedEvent("beforetoggle", domElement);
        listenToNonDelegatedEvent("toggle", domElement);
        listenToNonDelegatedEvent("cancel", domElement);
        listenToNonDelegatedEvent("close", domElement);
        break;
      case "iframe":
      case "object":
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "video":
      case "audio":
        for (hasSrc = 0; hasSrc < mediaEventTypes.length; hasSrc++)
          listenToNonDelegatedEvent(mediaEventTypes[hasSrc], domElement);
        break;
      case "image":
        listenToNonDelegatedEvent("error", domElement);
        listenToNonDelegatedEvent("load", domElement);
        break;
      case "details":
        listenToNonDelegatedEvent("toggle", domElement);
        break;
      case "embed":
      case "source":
      case "link":
        listenToNonDelegatedEvent("error", domElement), listenToNonDelegatedEvent("load", domElement);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (defaultChecked in props)
          if (props.hasOwnProperty(defaultChecked) && (hasSrc = props[defaultChecked], null != hasSrc))
            switch (defaultChecked) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(formatProdErrorMessage(137, tag));
              default:
                setProp(domElement, tag, defaultChecked, hasSrc, props, null);
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (propValue$204 in props)
            props.hasOwnProperty(propValue$204) && (hasSrc = props[propValue$204], void 0 !== hasSrc && setPropOnCustomElement(
              domElement,
              tag,
              propValue$204,
              hasSrc,
              props,
              void 0
            ));
          return;
        }
    }
    for (defaultValue in props)
      props.hasOwnProperty(defaultValue) && (hasSrc = props[defaultValue], null != hasSrc && setProp(domElement, tag, defaultValue, hasSrc, props, null));
  }
  var emptyProps = {};
  function updateProperties(domElement, tag, lastProps, nextProps) {
    switch (tag) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var name = null, type = null, value = null, defaultValue = null, lastDefaultValue = null, checked = null, defaultChecked = null;
        for (propKey in lastProps) {
          var lastProp = lastProps[propKey];
          if (lastProps.hasOwnProperty(propKey) && null != lastProp)
            switch (propKey) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                lastDefaultValue = lastProp;
              default:
                nextProps.hasOwnProperty(propKey) || setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
        }
        for (var propKey$221 in nextProps) {
          var propKey = nextProps[propKey$221];
          lastProp = lastProps[propKey$221];
          if (nextProps.hasOwnProperty(propKey$221) && (null != propKey || null != lastProp))
            switch (propKey$221) {
              case "type":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                type = propKey;
                break;
              case "name":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                name = propKey;
                break;
              case "checked":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                checked = propKey;
                break;
              case "defaultChecked":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                defaultChecked = propKey;
                break;
              case "value":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                value = propKey;
                break;
              case "defaultValue":
                propKey !== lastProp && (viewTransitionMutationContext = true);
                defaultValue = propKey;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                propKey !== lastProp && setProp(
                  domElement,
                  tag,
                  propKey$221,
                  propKey,
                  nextProps,
                  lastProp
                );
            }
        }
        updateInput(
          domElement,
          value,
          defaultValue,
          lastDefaultValue,
          checked,
          defaultChecked,
          type,
          name
        );
        return;
      case "select":
        propKey = value = defaultValue = propKey$221 = null;
        for (type in lastProps)
          if (lastDefaultValue = lastProps[type], lastProps.hasOwnProperty(type) && null != lastDefaultValue)
            switch (type) {
              case "value":
                break;
              case "multiple":
                propKey = lastDefaultValue;
              default:
                nextProps.hasOwnProperty(type) || setProp(
                  domElement,
                  tag,
                  type,
                  null,
                  nextProps,
                  lastDefaultValue
                );
            }
        for (name in nextProps)
          if (type = nextProps[name], lastDefaultValue = lastProps[name], nextProps.hasOwnProperty(name) && (null != type || null != lastDefaultValue))
            switch (name) {
              case "value":
                type !== lastDefaultValue && (viewTransitionMutationContext = true);
                propKey$221 = type;
                break;
              case "defaultValue":
                type !== lastDefaultValue && (viewTransitionMutationContext = true);
                defaultValue = type;
                break;
              case "multiple":
                type !== lastDefaultValue && (viewTransitionMutationContext = true), value = type;
              default:
                type !== lastDefaultValue && setProp(
                  domElement,
                  tag,
                  name,
                  type,
                  nextProps,
                  lastDefaultValue
                );
            }
        tag = defaultValue;
        lastProps = value;
        nextProps = propKey;
        null != propKey$221 ? updateOptions(domElement, !!lastProps, propKey$221, false) : !!nextProps !== !!lastProps && (null != tag ? updateOptions(domElement, !!lastProps, tag, true) : updateOptions(domElement, !!lastProps, lastProps ? [] : "", false));
        return;
      case "textarea":
        propKey = propKey$221 = null;
        for (defaultValue in lastProps)
          if (name = lastProps[defaultValue], lastProps.hasOwnProperty(defaultValue) && null != name && !nextProps.hasOwnProperty(defaultValue))
            switch (defaultValue) {
              case "value":
                break;
              case "children":
                break;
              default:
                setProp(domElement, tag, defaultValue, null, nextProps, name);
            }
        for (value in nextProps)
          if (name = nextProps[value], type = lastProps[value], nextProps.hasOwnProperty(value) && (null != name || null != type))
            switch (value) {
              case "value":
                name !== type && (viewTransitionMutationContext = true);
                propKey$221 = name;
                break;
              case "defaultValue":
                name !== type && (viewTransitionMutationContext = true);
                propKey = name;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (null != name) throw Error(formatProdErrorMessage(91));
                break;
              default:
                name !== type && setProp(domElement, tag, value, name, nextProps, type);
            }
        updateTextarea(domElement, propKey$221, propKey);
        return;
      case "option":
        for (var propKey$237 in lastProps)
          if (propKey$221 = lastProps[propKey$237], lastProps.hasOwnProperty(propKey$237) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$237))
            switch (propKey$237) {
              case "selected":
                domElement.selected = false;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  propKey$237,
                  null,
                  nextProps,
                  propKey$221
                );
            }
        for (lastDefaultValue in nextProps)
          if (propKey$221 = nextProps[lastDefaultValue], propKey = lastProps[lastDefaultValue], nextProps.hasOwnProperty(lastDefaultValue) && propKey$221 !== propKey && (null != propKey$221 || null != propKey))
            switch (lastDefaultValue) {
              case "selected":
                propKey$221 !== propKey && (viewTransitionMutationContext = true);
                domElement.selected = propKey$221 && "function" !== typeof propKey$221 && "symbol" !== typeof propKey$221;
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  lastDefaultValue,
                  propKey$221,
                  nextProps,
                  propKey
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var propKey$242 in lastProps)
          propKey$221 = lastProps[propKey$242], lastProps.hasOwnProperty(propKey$242) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$242) && setProp(domElement, tag, propKey$242, null, nextProps, propKey$221);
        for (checked in nextProps)
          if (propKey$221 = nextProps[checked], propKey = lastProps[checked], nextProps.hasOwnProperty(checked) && propKey$221 !== propKey && (null != propKey$221 || null != propKey))
            switch (checked) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (null != propKey$221)
                  throw Error(formatProdErrorMessage(137, tag));
                break;
              default:
                setProp(
                  domElement,
                  tag,
                  checked,
                  propKey$221,
                  nextProps,
                  propKey
                );
            }
        return;
      default:
        if (isCustomElement(tag)) {
          for (var propKey$247 in lastProps)
            propKey$221 = lastProps[propKey$247], lastProps.hasOwnProperty(propKey$247) && void 0 !== propKey$221 && !nextProps.hasOwnProperty(propKey$247) && setPropOnCustomElement(
              domElement,
              tag,
              propKey$247,
              void 0,
              nextProps,
              propKey$221
            );
          for (defaultChecked in nextProps)
            propKey$221 = nextProps[defaultChecked], propKey = lastProps[defaultChecked], !nextProps.hasOwnProperty(defaultChecked) || propKey$221 === propKey || void 0 === propKey$221 && void 0 === propKey || setPropOnCustomElement(
              domElement,
              tag,
              defaultChecked,
              propKey$221,
              nextProps,
              propKey
            );
          return;
        }
    }
    for (var propKey$252 in lastProps)
      propKey$221 = lastProps[propKey$252], lastProps.hasOwnProperty(propKey$252) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$252) && setProp(domElement, tag, propKey$252, null, nextProps, propKey$221);
    for (lastProp in nextProps)
      propKey$221 = nextProps[lastProp], propKey = lastProps[lastProp], !nextProps.hasOwnProperty(lastProp) || propKey$221 === propKey || null == propKey$221 && null == propKey || setProp(domElement, tag, lastProp, propKey$221, nextProps, propKey);
  }
  function isLikelyStaticResource(initiatorType) {
    switch (initiatorType) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return true;
      default:
        return false;
    }
  }
  function estimateBandwidth() {
    if ("function" === typeof performance.getEntriesByType) {
      for (var count = 0, bits = 0, resourceEntries = performance.getEntriesByType("resource"), i = 0; i < resourceEntries.length; i++) {
        var entry = resourceEntries[i], transferSize = entry.transferSize, initiatorType = entry.initiatorType, duration = entry.duration;
        if (transferSize && duration && isLikelyStaticResource(initiatorType)) {
          initiatorType = 0;
          duration = entry.responseEnd;
          for (i += 1; i < resourceEntries.length; i++) {
            var overlapEntry = resourceEntries[i], overlapStartTime = overlapEntry.startTime;
            if (overlapStartTime > duration) break;
            var overlapTransferSize = overlapEntry.transferSize, overlapInitiatorType = overlapEntry.initiatorType;
            overlapTransferSize && isLikelyStaticResource(overlapInitiatorType) && (overlapEntry = overlapEntry.responseEnd, initiatorType += overlapTransferSize * (overlapEntry < duration ? 1 : (duration - overlapStartTime) / (overlapEntry - overlapStartTime)));
          }
          --i;
          bits += 8 * (transferSize + initiatorType) / (entry.duration / 1e3);
          count++;
          if (10 < count) break;
        }
      }
      if (0 < count) return bits / count / 1e6;
    }
    return navigator.connection && (count = navigator.connection.downlink, "number" === typeof count) ? count : 5;
  }
  var eventsEnabled = null, selectionInformation = null;
  function getOwnerDocumentFromRootContainer(rootContainerElement) {
    return 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
  }
  function getOwnHostContext(namespaceURI) {
    switch (namespaceURI) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function getChildHostContextProd(parentNamespace, type) {
    if (0 === parentNamespace)
      switch (type) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return 1 === parentNamespace && "foreignObject" === type ? 0 : parentNamespace;
  }
  function createHoistableInstance(type, props, rootContainerInstance, internalInstanceHandle) {
    rootContainerInstance = getOwnerDocumentFromRootContainer(
      rootContainerInstance
    ).createElement(type);
    rootContainerInstance[internalInstanceKey] = internalInstanceHandle;
    rootContainerInstance[internalPropsKey] = props;
    setInitialProperties(rootContainerInstance, type, props);
    markNodeAsHoistable(rootContainerInstance);
    return rootContainerInstance;
  }
  function shouldSetTextContent(type, props) {
    return "textarea" === type || "noscript" === type || "string" === typeof props.children || "number" === typeof props.children || "bigint" === typeof props.children || "object" === typeof props.dangerouslySetInnerHTML && null !== props.dangerouslySetInnerHTML && null != props.dangerouslySetInnerHTML.__html;
  }
  var currentPopstateTransitionEvent = null;
  function shouldAttemptEagerTransition() {
    var event = window.event;
    if (event && "popstate" === event.type) {
      if (event === currentPopstateTransitionEvent) return false;
      currentPopstateTransitionEvent = event;
      return true;
    }
    currentPopstateTransitionEvent = null;
    return false;
  }
  var scheduleTimeout = "function" === typeof setTimeout ? setTimeout : void 0, cancelTimeout = "function" === typeof clearTimeout ? clearTimeout : void 0, localPromise = "function" === typeof Promise ? Promise : void 0, localRequestAnimationFrame = "function" === typeof requestAnimationFrame ? requestAnimationFrame : scheduleTimeout, scheduleMicrotask = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof localPromise ? function(callback) {
    return localPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
  } : scheduleTimeout;
  function handleErrorInNextTick(error) {
    setTimeout(function() {
      throw error;
    });
  }
  function isSingletonScope(type) {
    return "head" === type;
  }
  function clearHydrationBoundary(parentInstance, hydrationInstance) {
    var node = hydrationInstance, depth = 0;
    do {
      var nextNode = node.nextSibling;
      parentInstance.removeChild(node);
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node || "/&" === node) {
          if (0 === depth) {
            parentInstance.removeChild(nextNode);
            retryIfBlockedOn(hydrationInstance);
            return;
          }
          depth--;
        } else if ("$" === node || "$?" === node || "$~" === node || "$!" === node || "&" === node)
          depth++;
        else if ("html" === node)
          clearSingletonPreambleContribution(
            parentInstance.ownerDocument.documentElement
          );
        else if ("head" === node) {
          node = parentInstance.ownerDocument.head;
          clearSingletonPreambleContribution(node);
          for (var node$jscomp$0 = node.firstChild; node$jscomp$0; ) {
            var nextNode$jscomp$0 = node$jscomp$0.nextSibling, nodeName = node$jscomp$0.nodeName;
            node$jscomp$0[internalHoistableMarker] || "SCRIPT" === nodeName || "STYLE" === nodeName || "LINK" === nodeName && "stylesheet" === node$jscomp$0.rel.toLowerCase() || node.removeChild(node$jscomp$0);
            node$jscomp$0 = nextNode$jscomp$0;
          }
        } else
          "body" === node && clearSingletonPreambleContribution(parentInstance.ownerDocument.body);
      node = nextNode;
    } while (node);
    retryIfBlockedOn(hydrationInstance);
  }
  function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
    var node = suspenseInstance;
    suspenseInstance = 0;
    do {
      var nextNode = node.nextSibling;
      1 === node.nodeType ? isHidden ? (node._stashedDisplay = node.style.display, node.style.display = "none") : (node.style.display = node._stashedDisplay || "", "" === node.getAttribute("style") && node.removeAttribute("style")) : 3 === node.nodeType && (isHidden ? (node._stashedText = node.nodeValue, node.nodeValue = "") : node.nodeValue = node._stashedText || "");
      if (nextNode && 8 === nextNode.nodeType)
        if (node = nextNode.data, "/$" === node)
          if (0 === suspenseInstance) break;
          else suspenseInstance--;
        else
          "$" !== node && "$?" !== node && "$~" !== node && "$!" !== node || suspenseInstance++;
      node = nextNode;
    } while (node);
  }
  function applyViewTransitionName(instance, name, className) {
    name = CSS.escape(name) !== name ? "r-" + btoa(name).replace(/=/g, "") : name;
    instance.style.viewTransitionName = name;
    null != className && (instance.style.viewTransitionClass = className);
    className = getComputedStyle(instance);
    if ("inline" === className.display) {
      name = instance.getClientRects();
      if (1 === name.length) var JSCompiler_inline_result = 1;
      else
        for (var i = JSCompiler_inline_result = 0; i < name.length; i++) {
          var rect = name[i];
          0 < rect.width && 0 < rect.height && JSCompiler_inline_result++;
        }
      1 === JSCompiler_inline_result && (instance = instance.style, instance.display = 1 === name.length ? "inline-block" : "block", instance.marginTop = "-" + className.paddingTop, instance.marginBottom = "-" + className.paddingBottom);
    }
  }
  function restoreViewTransitionName(instance, props) {
    instance = instance.style;
    props = props.style;
    var viewTransitionName = null != props ? props.hasOwnProperty("viewTransitionName") ? props.viewTransitionName : props.hasOwnProperty("view-transition-name") ? props["view-transition-name"] : null : null;
    instance.viewTransitionName = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : ("" + viewTransitionName).trim();
    viewTransitionName = null != props ? props.hasOwnProperty("viewTransitionClass") ? props.viewTransitionClass : props.hasOwnProperty("view-transition-class") ? props["view-transition-class"] : null : null;
    instance.viewTransitionClass = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : ("" + viewTransitionName).trim();
    "inline-block" === instance.display && (null == props ? instance.display = instance.margin = "" : (viewTransitionName = props.display, instance.display = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : viewTransitionName, viewTransitionName = props.margin, null != viewTransitionName ? instance.margin = viewTransitionName : (viewTransitionName = props.hasOwnProperty("marginTop") ? props.marginTop : props["margin-top"], instance.marginTop = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : viewTransitionName, props = props.hasOwnProperty("marginBottom") ? props.marginBottom : props["margin-bottom"], instance.marginBottom = null == props || "boolean" === typeof props ? "" : props)));
  }
  function createMeasurement(rect, computedStyle, element) {
    element = element.ownerDocument.defaultView;
    return {
      rect,
      abs: "absolute" === computedStyle.position || "fixed" === computedStyle.position,
      clip: "none" !== computedStyle.clipPath || "visible" !== computedStyle.overflow || "none" !== computedStyle.filter || "none" !== computedStyle.mask || "none" !== computedStyle.mask || "0px" !== computedStyle.borderRadius,
      view: 0 <= rect.bottom && 0 <= rect.right && rect.top <= element.innerHeight && rect.left <= element.innerWidth
    };
  }
  function measureInstance(instance) {
    var rect = instance.getBoundingClientRect(), computedStyle = getComputedStyle(instance);
    return createMeasurement(rect, computedStyle, instance);
  }
  function forceLayout(ownerDocument) {
    return ownerDocument.documentElement.clientHeight;
  }
  function waitForImageToLoad(resolve) {
    this.addEventListener("load", resolve);
    this.addEventListener("error", resolve);
  }
  function startViewTransition(suspendedState, rootContainer, transitionTypes, mutationCallback, layoutCallback, afterMutationCallback, spawnedWorkCallback, passiveCallback, errorCallback) {
    var ownerDocument = 9 === rootContainer.nodeType ? rootContainer : rootContainer.ownerDocument;
    try {
      var transition = ownerDocument.startViewTransition({
        update: function() {
          var ownerWindow = ownerDocument.defaultView, pendingNavigation = ownerWindow.navigation && ownerWindow.navigation.transition, previousFontLoadingStatus = ownerDocument.fonts.status;
          mutationCallback();
          var blockingPromises = [];
          "loaded" === previousFontLoadingStatus && (forceLayout(ownerDocument), "loading" === ownerDocument.fonts.status && blockingPromises.push(ownerDocument.fonts.ready));
          previousFontLoadingStatus = blockingPromises.length;
          if (null !== suspendedState)
            for (var suspenseyImages = suspendedState.suspenseyImages, imgBytes = 0, i = 0; i < suspenseyImages.length; i++) {
              var suspenseyImage = suspenseyImages[i];
              if (!suspenseyImage.complete) {
                var rect = suspenseyImage.getBoundingClientRect();
                if (0 < rect.bottom && 0 < rect.right && rect.top < ownerWindow.innerHeight && rect.left < ownerWindow.innerWidth) {
                  imgBytes += estimateImageBytes(suspenseyImage);
                  if (imgBytes > estimatedBytesWithinLimit) {
                    blockingPromises.length = previousFontLoadingStatus;
                    break;
                  }
                  suspenseyImage = new Promise(
                    waitForImageToLoad.bind(suspenseyImage)
                  );
                  blockingPromises.push(suspenseyImage);
                }
              }
            }
          if (0 < blockingPromises.length)
            return ownerWindow = Promise.race([
              Promise.all(blockingPromises),
              new Promise(function(resolve) {
                return setTimeout(resolve, 500);
              })
            ]).then(layoutCallback, layoutCallback), (pendingNavigation ? Promise.allSettled([pendingNavigation.finished, ownerWindow]) : ownerWindow).then(afterMutationCallback, afterMutationCallback);
          layoutCallback();
          if (pendingNavigation)
            return pendingNavigation.finished.then(
              afterMutationCallback,
              afterMutationCallback
            );
          afterMutationCallback();
        },
        types: transitionTypes
      });
      ownerDocument.__reactViewTransition = transition;
      var viewTransitionAnimations = [];
      transition.ready.then(
        function() {
          for (var animations = ownerDocument.documentElement.getAnimations({
            subtree: true
          }), i = 0; i < animations.length; i++) {
            var animation = animations[i], effect = animation.effect, pseudoElement = effect.pseudoElement;
            if (null != pseudoElement && pseudoElement.startsWith("::view-transition")) {
              viewTransitionAnimations.push(animation);
              animation = effect.getKeyframes();
              for (var height = pseudoElement = void 0, unchangedDimensions = true, j = 0; j < animation.length; j++) {
                var keyframe = animation[j], w = keyframe.width;
                if (void 0 === pseudoElement) pseudoElement = w;
                else if (pseudoElement !== w) {
                  unchangedDimensions = false;
                  break;
                }
                w = keyframe.height;
                if (void 0 === height) height = w;
                else if (height !== w) {
                  unchangedDimensions = false;
                  break;
                }
                delete keyframe.width;
                delete keyframe.height;
                "none" === keyframe.transform && delete keyframe.transform;
              }
              unchangedDimensions && void 0 !== pseudoElement && void 0 !== height && (effect.setKeyframes(animation), unchangedDimensions = getComputedStyle(
                effect.target,
                effect.pseudoElement
              ), unchangedDimensions.width !== pseudoElement || unchangedDimensions.height !== height) && (unchangedDimensions = animation[0], unchangedDimensions.width = pseudoElement, unchangedDimensions.height = height, unchangedDimensions = animation[animation.length - 1], unchangedDimensions.width = pseudoElement, unchangedDimensions.height = height, effect.setKeyframes(animation));
            }
          }
          spawnedWorkCallback();
        },
        function(error) {
          ownerDocument.__reactViewTransition === transition && (ownerDocument.__reactViewTransition = null);
          try {
            if ("object" === typeof error && null !== error)
              switch (error.name) {
                case "InvalidStateError":
                  if ("View transition was skipped because document visibility state is hidden." === error.message || "Skipping view transition because document visibility state has become hidden." === error.message || "Skipping view transition because viewport size changed." === error.message || "Transition was aborted because of invalid state" === error.message)
                    error = null;
              }
            null !== error && errorCallback(error);
          } finally {
            mutationCallback(), layoutCallback(), spawnedWorkCallback();
          }
        }
      );
      transition.finished.finally(function() {
        for (var i = 0; i < viewTransitionAnimations.length; i++)
          viewTransitionAnimations[i].cancel();
        ownerDocument.__reactViewTransition === transition && (ownerDocument.__reactViewTransition = null);
        passiveCallback();
      });
      return transition;
    } catch (x) {
      return mutationCallback(), layoutCallback(), spawnedWorkCallback(), null;
    }
  }
  function ViewTransitionPseudoElement(pseudo, name) {
    this._scope = document.documentElement;
    this._selector = "::view-transition-" + pseudo + "(" + name + ")";
  }
  ViewTransitionPseudoElement.prototype.animate = function(keyframes, options2) {
    options2 = "number" === typeof options2 ? { duration: options2 } : assign({}, options2);
    options2.pseudoElement = this._selector;
    return this._scope.animate(keyframes, options2);
  };
  ViewTransitionPseudoElement.prototype.getAnimations = function() {
    for (var scope = this._scope, selector = this._selector, animations = scope.getAnimations({ subtree: true }), result = [], i = 0; i < animations.length; i++) {
      var effect = animations[i].effect;
      null !== effect && effect.target === scope && effect.pseudoElement === selector && result.push(animations[i]);
    }
    return result;
  };
  ViewTransitionPseudoElement.prototype.getComputedStyle = function() {
    return getComputedStyle(this._scope, this._selector);
  };
  function createViewTransitionInstance(name) {
    return {
      name,
      group: new ViewTransitionPseudoElement("group", name),
      imagePair: new ViewTransitionPseudoElement("image-pair", name),
      old: new ViewTransitionPseudoElement("old", name),
      new: new ViewTransitionPseudoElement("new", name)
    };
  }
  function FragmentInstance(fragmentFiber) {
    this._fragmentFiber = fragmentFiber;
    this._observers = this._eventListeners = null;
  }
  FragmentInstance.prototype.addEventListener = function(type, listener, optionsOrUseCapture) {
    var signal = null, cleanup = null;
    if (null != optionsOrUseCapture && "boolean" !== typeof optionsOrUseCapture && (signal = optionsOrUseCapture.signal || null, null !== signal && signal.aborted))
      return;
    null === this._eventListeners && (this._eventListeners = []);
    var listeners = this._eventListeners;
    if (-1 === indexOfEventListener(listeners, type, listener, optionsOrUseCapture)) {
      var fragmentInstance = this, attachedListener = listener;
      null != optionsOrUseCapture && "boolean" !== typeof optionsOrUseCapture && true === optionsOrUseCapture.once && (attachedListener = function(event) {
        fragmentInstance.removeEventListener(
          type,
          listener,
          optionsOrUseCapture
        );
        "function" === typeof listener ? listener.call(this, event) : listener.handleEvent(event);
      });
      null !== signal && (cleanup = fragmentInstance.removeEventListener.bind(
        fragmentInstance,
        type,
        listener,
        optionsOrUseCapture
      ), signal.addEventListener("abort", cleanup, { once: true }), cleanup = signal.removeEventListener.bind(signal, "abort", cleanup));
      signal = getAttachOptions(optionsOrUseCapture);
      listeners.push({
        type,
        listener,
        optionsOrUseCapture,
        attachedListener,
        cleanup
      });
      traverseVisibleInstancesAndTextInstances(
        this._fragmentFiber.child,
        false,
        addEventListenerToChild,
        type,
        attachedListener,
        signal
      );
    }
    this._eventListeners = listeners;
  };
  function addEventListenerToChild(child, type, listener, optionsOrUseCapture) {
    getInstanceFromHostFiber(child).addEventListener(
      type,
      listener,
      optionsOrUseCapture
    );
    return false;
  }
  FragmentInstance.prototype.removeEventListener = function(type, listener, optionsOrUseCapture) {
    var listeners = this._eventListeners;
    if (null !== listeners && (listener = indexOfEventListener(
      listeners,
      type,
      listener,
      optionsOrUseCapture
    ), -1 !== listener)) {
      var _listeners$index = listeners[listener];
      optionsOrUseCapture = _listeners$index.attachedListener;
      var cleanup = _listeners$index.cleanup;
      _listeners$index = getAttachOptions(_listeners$index.optionsOrUseCapture);
      traverseVisibleInstancesAndTextInstances(
        this._fragmentFiber.child,
        false,
        removeEventListenerFromChild,
        type,
        optionsOrUseCapture,
        _listeners$index
      );
      listeners.splice(listener, 1);
      null !== cleanup && cleanup();
    }
  };
  function removeEventListenerFromChild(child, type, listener, optionsOrUseCapture) {
    getInstanceFromHostFiber(child).removeEventListener(
      type,
      listener,
      optionsOrUseCapture
    );
    return false;
  }
  function getAttachOptions(opts) {
    return null != opts && "boolean" !== typeof opts && (true === opts.once || opts.signal instanceof AbortSignal) ? { capture: opts.capture, passive: opts.passive } : opts;
  }
  function normalizeListenerOptions(opts) {
    return null == opts ? "c=0" : "boolean" === typeof opts ? "c=" + (opts ? "1" : "0") : "c=" + (opts.capture ? "1" : "0");
  }
  function indexOfEventListener(eventListeners, type, listener, optionsOrUseCapture) {
    if (0 === eventListeners.length) return -1;
    optionsOrUseCapture = normalizeListenerOptions(optionsOrUseCapture);
    for (var i = 0; i < eventListeners.length; i++) {
      var item = eventListeners[i];
      if (item.type === type && item.listener === listener && normalizeListenerOptions(item.optionsOrUseCapture) === optionsOrUseCapture)
        return i;
    }
    return -1;
  }
  FragmentInstance.prototype.dispatchEvent = function(event) {
    var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
      this._fragmentFiber
    );
    if (null === parentHostFiber) return true;
    parentHostFiber = getInstanceFromHostFiber(parentHostFiber);
    var eventListeners = this._eventListeners;
    if (null !== eventListeners && 0 < eventListeners.length || !event.bubbles) {
      var temp = 9 === parentHostFiber.nodeType ? parentHostFiber.createComment("") : document.createTextNode("");
      if (eventListeners)
        for (var i = 0; i < eventListeners.length; i++) {
          var _eventListeners$i = eventListeners[i];
          temp.addEventListener(
            _eventListeners$i.type,
            _eventListeners$i.attachedListener,
            getAttachOptions(_eventListeners$i.optionsOrUseCapture)
          );
        }
      parentHostFiber.appendChild(temp);
      event = temp.dispatchEvent(event);
      if (eventListeners)
        for (i = 0; i < eventListeners.length; i++)
          _eventListeners$i = eventListeners[i], temp.removeEventListener(
            _eventListeners$i.type,
            _eventListeners$i.attachedListener,
            getAttachOptions(_eventListeners$i.optionsOrUseCapture)
          );
      parentHostFiber.removeChild(temp);
      return event;
    }
    return parentHostFiber.dispatchEvent(event);
  };
  FragmentInstance.prototype.focus = function(focusOptions) {
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      true,
      setFocusOnFiberIfFocusable,
      focusOptions,
      void 0,
      void 0
    );
  };
  function setFocusOnFiberIfFocusable(fiber, focusOptions) {
    if (6 === fiber.tag) return false;
    fiber = getInstanceFromHostFiber(fiber);
    return setFocusIfFocusable(fiber, focusOptions);
  }
  FragmentInstance.prototype.focusLast = function(focusOptions) {
    var children = [];
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      true,
      collectChildren,
      children,
      void 0,
      void 0
    );
    for (var i = children.length - 1; 0 <= i && !setFocusOnFiberIfFocusable(children[i], focusOptions); i--) ;
  };
  function collectChildren(child, collection) {
    collection.push(child);
    return false;
  }
  FragmentInstance.prototype.blur = function() {
    var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
      this._fragmentFiber
    );
    null !== parentHostFiber && (parentHostFiber = getInstanceFromHostFiber(parentHostFiber), parentHostFiber = getOwnerDocumentFromRootContainer(parentHostFiber).activeElement, null !== parentHostFiber && traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      false,
      blurActiveElementWithinFragment,
      parentHostFiber,
      void 0,
      void 0
    ));
  };
  function blurActiveElementWithinFragment(child, activeElement2) {
    if (6 === child.tag) return false;
    child = getInstanceFromHostFiber(child);
    return child === activeElement2 || child.contains(activeElement2) ? (activeElement2.blur(), true) : false;
  }
  FragmentInstance.prototype.observeUsing = function(observer) {
    null === this._observers && (this._observers = /* @__PURE__ */ new Set());
    this._observers.add(observer);
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      false,
      observeChild,
      observer,
      void 0,
      void 0
    );
  };
  function observeChild(child, observer) {
    if (6 === child.tag) return false;
    child = getInstanceFromHostFiber(child);
    observer.observe(child);
    return false;
  }
  FragmentInstance.prototype.unobserveUsing = function(observer) {
    var observers = this._observers;
    if (null !== observers && observers.has(observer)) {
      observers.delete(observer);
      traverseVisibleInstancesAndTextInstances(
        this._fragmentFiber.child,
        false,
        unobserveChild,
        observer,
        void 0,
        void 0
      );
      for (var i = observers = 0; i < pendingIntersectionUnobserves.length; i++) {
        var pending = pendingIntersectionUnobserves[i];
        pending.fragmentInstance === this && pending.observer === observer ? observer.unobserve(pending.instance) : pendingIntersectionUnobserves[observers++] = pending;
      }
      pendingIntersectionUnobserves.length = observers;
    }
  };
  function unobserveChild(child, observer) {
    if (6 === child.tag) return false;
    child = getInstanceFromHostFiber(child);
    observer.unobserve(child);
    return false;
  }
  var pendingIntersectionUnobserves = [], intersectionUnobserveScheduled = false;
  function schedulePendingIntersectionUnobserve(fragmentInstance, observer, instance) {
    pendingIntersectionUnobserves.push({
      fragmentInstance,
      observer,
      instance
    });
    intersectionUnobserveScheduled || (intersectionUnobserveScheduled = true, requestPostPaintCallback(function() {
      intersectionUnobserveScheduled = false;
      var pending = pendingIntersectionUnobserves;
      pendingIntersectionUnobserves = [];
      for (var i = 0; i < pending.length; i++) {
        var item = pending[i];
        item.observer.unobserve(item.instance);
      }
    }));
  }
  FragmentInstance.prototype.getClientRects = function() {
    var rects = [];
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      false,
      collectClientRects,
      rects,
      void 0,
      void 0
    );
    return rects;
  };
  function collectClientRects(child, rects) {
    if (6 === child.tag) {
      child = child.stateNode;
      var range = child.ownerDocument.createRange();
      range.selectNodeContents(child);
      rects.push.apply(rects, range.getClientRects());
    } else
      child = getInstanceFromHostFiber(child), rects.push.apply(rects, child.getClientRects());
    return false;
  }
  FragmentInstance.prototype.getRootNode = function(getRootNodeOptions) {
    var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
      this._fragmentFiber
    );
    return null === parentHostFiber ? this : getInstanceFromHostFiber(parentHostFiber).getRootNode(getRootNodeOptions);
  };
  FragmentInstance.prototype.compareDocumentPosition = function(otherNode) {
    var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
      this._fragmentFiber
    );
    if (null === parentHostFiber) return Node.DOCUMENT_POSITION_DISCONNECTED;
    var children = [];
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      false,
      collectChildren,
      children,
      void 0,
      void 0
    );
    var parentHostInstance = getInstanceFromHostFiber(parentHostFiber);
    if (0 === children.length) {
      children = parentHostInstance;
      if (fiberIsPortaledIntoHost(this._fragmentFiber)) {
        a: {
          for (parentHostFiber = this._fragmentFiber.return; null !== parentHostFiber; ) {
            if (4 === parentHostFiber.tag) {
              parentHostFiber = parentHostFiber.stateNode.containerInfo;
              break a;
            }
            if (3 === parentHostFiber.tag || 5 === parentHostFiber.tag || 27 === parentHostFiber.tag)
              break;
            parentHostFiber = parentHostFiber.return;
          }
          parentHostFiber = null;
        }
        null != parentHostFiber && (children = parentHostFiber);
      }
      parentHostFiber = this._fragmentFiber;
      var result = parentHostInstance = children.compareDocumentPosition(otherNode);
      children === otherNode ? result = Node.DOCUMENT_POSITION_CONTAINS : parentHostInstance & Node.DOCUMENT_POSITION_CONTAINED_BY && (children = getFragmentInstanceOrTextInstanceSiblings(parentHostFiber)[1], null === children ? result = Node.DOCUMENT_POSITION_PRECEDING : (otherNode = getInstanceFromHostFiber(children).compareDocumentPosition(
        otherNode
      ), result = 0 === otherNode || otherNode & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING));
      return result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
    }
    parentHostFiber = getInstanceFromHostFiber(children[0]);
    result = getInstanceFromHostFiber(children[children.length - 1]);
    var parentHostInstanceFromDOM = fiberIsPortaledIntoHost(this._fragmentFiber) ? parentHostFiber.parentElement : parentHostInstance;
    if (null == parentHostInstanceFromDOM)
      return Node.DOCUMENT_POSITION_DISCONNECTED;
    parentHostInstance = parentHostInstanceFromDOM.compareDocumentPosition(parentHostFiber) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    parentHostInstanceFromDOM = parentHostInstanceFromDOM.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    var firstResult = parentHostFiber.compareDocumentPosition(otherNode), lastResult = result.compareDocumentPosition(otherNode), otherNodeIsWithinFirstOrLastChild = firstResult & Node.DOCUMENT_POSITION_CONTAINED_BY || lastResult & Node.DOCUMENT_POSITION_CONTAINED_BY;
    lastResult = parentHostInstance && parentHostInstanceFromDOM && firstResult & Node.DOCUMENT_POSITION_FOLLOWING && lastResult & Node.DOCUMENT_POSITION_PRECEDING;
    parentHostFiber = parentHostInstance && parentHostFiber === otherNode || parentHostInstanceFromDOM && result === otherNode || otherNodeIsWithinFirstOrLastChild || lastResult ? Node.DOCUMENT_POSITION_CONTAINED_BY : !parentHostInstance && parentHostFiber === otherNode || !parentHostInstanceFromDOM && result === otherNode ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : firstResult;
    return parentHostFiber & Node.DOCUMENT_POSITION_DISCONNECTED || parentHostFiber & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || validateDocumentPositionWithFiberTree(
      parentHostFiber,
      this._fragmentFiber,
      children[0],
      children[children.length - 1],
      otherNode
    ) ? parentHostFiber : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
  };
  function validateDocumentPositionWithFiberTree(documentPosition, fragmentFiber, precedingBoundaryFiber, followingBoundaryFiber, otherNode) {
    var otherFiber = getClosestInstanceFromNode(otherNode);
    if (documentPosition & Node.DOCUMENT_POSITION_CONTAINED_BY) {
      if (precedingBoundaryFiber = !!otherFiber)
        a: {
          for (; null !== otherFiber; ) {
            if (7 === otherFiber.tag && (otherFiber === fragmentFiber || otherFiber.alternate === fragmentFiber)) {
              precedingBoundaryFiber = true;
              break a;
            }
            otherFiber = otherFiber.return;
          }
          precedingBoundaryFiber = false;
        }
      return precedingBoundaryFiber;
    }
    if (documentPosition & Node.DOCUMENT_POSITION_CONTAINS) {
      if (null === otherFiber)
        return otherFiber = otherNode.ownerDocument, otherNode === otherFiber || otherNode === otherFiber.documentElement || otherNode === otherFiber.body;
      a: {
        otherFiber = fragmentFiber;
        for (fragmentFiber = getFragmentParentInstanceOrContainerFiber(fragmentFiber); null !== otherFiber; ) {
          if (!(5 !== otherFiber.tag && 3 !== otherFiber.tag && 27 !== otherFiber.tag || otherFiber !== fragmentFiber && otherFiber.alternate !== fragmentFiber)) {
            otherFiber = true;
            break a;
          }
          otherFiber = otherFiber.return;
        }
        otherFiber = false;
      }
      return otherFiber;
    }
    return documentPosition & Node.DOCUMENT_POSITION_PRECEDING ? ((fragmentFiber = !!otherFiber) && !(fragmentFiber = otherFiber === precedingBoundaryFiber) && (fragmentFiber = getLowestCommonAncestor(
      precedingBoundaryFiber,
      otherFiber,
      getParentForFragmentAncestors
    ), null === fragmentFiber ? fragmentFiber = false : (traverseVisibleInstancesAndTextInstances(
      fragmentFiber,
      true,
      isFiberPrecedingCheck,
      otherFiber,
      precedingBoundaryFiber
    ), otherFiber = searchTarget, searchTarget = null, fragmentFiber = null !== otherFiber)), fragmentFiber) : documentPosition & Node.DOCUMENT_POSITION_FOLLOWING ? ((fragmentFiber = !!otherFiber) && !(fragmentFiber = otherFiber === followingBoundaryFiber) && (fragmentFiber = getLowestCommonAncestor(
      followingBoundaryFiber,
      otherFiber,
      getParentForFragmentAncestors
    ), null === fragmentFiber ? fragmentFiber = false : (traverseVisibleInstancesAndTextInstances(
      fragmentFiber,
      true,
      isFiberFollowingCheck,
      otherFiber,
      followingBoundaryFiber
    ), otherFiber = searchTarget, searchBoundary = searchTarget = null, fragmentFiber = null !== otherFiber)), fragmentFiber) : false;
  }
  function scrollTextNodeIntoView(textNode, resolvedAlignToTop) {
    var range = textNode.ownerDocument.createRange();
    range.selectNodeContents(textNode);
    textNode = range.getBoundingClientRect();
    window.scrollTo(
      window.scrollX + textNode.left,
      resolvedAlignToTop ? window.scrollY + textNode.top : window.scrollY + textNode.bottom - window.innerHeight
    );
  }
  FragmentInstance.prototype.scrollIntoView = function(alignToTop) {
    if ("object" === typeof alignToTop) throw Error(formatProdErrorMessage(566));
    var children = [];
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      false,
      collectChildren,
      children,
      void 0,
      void 0
    );
    var resolvedAlignToTop = false !== alignToTop;
    if (0 === children.length) {
      var hostSiblings = getFragmentInstanceOrTextInstanceSiblings(
        this._fragmentFiber
      );
      hostSiblings = resolvedAlignToTop ? hostSiblings[1] || hostSiblings[0] || getFragmentParentInstanceOrContainerFiber(this._fragmentFiber) : hostSiblings[0] || hostSiblings[1];
      if (null === hostSiblings) return;
      if (6 === hostSiblings.tag) {
        alignToTop = getInstanceFromHostFiber(hostSiblings);
        scrollTextNodeIntoView(alignToTop, resolvedAlignToTop);
        return;
      }
      hostSiblings = getInstanceFromHostFiber(hostSiblings);
      if (9 !== hostSiblings.nodeType) {
        if (11 === hostSiblings.nodeType) {
          resolvedAlignToTop = "host" in hostSiblings ? hostSiblings.host : null;
          null !== resolvedAlignToTop && resolvedAlignToTop.scrollIntoView(alignToTop);
          return;
        }
        hostSiblings.scrollIntoView(alignToTop);
      }
    }
    for (hostSiblings = resolvedAlignToTop ? children.length - 1 : 0; hostSiblings !== (resolvedAlignToTop ? -1 : children.length); ) {
      var child = children[hostSiblings];
      6 === child.tag ? (child = getInstanceFromHostFiber(child), scrollTextNodeIntoView(child, resolvedAlignToTop)) : getInstanceFromHostFiber(child).scrollIntoView(alignToTop);
      hostSiblings += resolvedAlignToTop ? -1 : 1;
    }
  };
  function addFragmentHandleToFiber(child, fragmentInstance) {
    child = getInstanceFromHostFiber(child);
    addFragmentHandleToInstance(child, fragmentInstance);
    return false;
  }
  function addFragmentHandleToInstance(instance, fragmentInstance) {
    null == instance.reactFragments && (instance.reactFragments = /* @__PURE__ */ new Set());
    instance.reactFragments.add(fragmentInstance);
  }
  function commitNewChildToFragmentInstance(childInstance, fragmentInstance) {
    var eventListeners = fragmentInstance._eventListeners;
    if (null !== eventListeners)
      for (var i$jscomp$0 = 0; i$jscomp$0 < eventListeners.length; i$jscomp$0++) {
        var _eventListeners$i3 = eventListeners[i$jscomp$0];
        childInstance.addEventListener(
          _eventListeners$i3.type,
          _eventListeners$i3.attachedListener,
          getAttachOptions(_eventListeners$i3.optionsOrUseCapture)
        );
      }
    3 !== childInstance.nodeType && (eventListeners = fragmentInstance._observers, null !== eventListeners && eventListeners.forEach(function(observer) {
      for (var writeIdx = 0, i = 0; i < pendingIntersectionUnobserves.length; i++) {
        var pending = pendingIntersectionUnobserves[i];
        if (pending.fragmentInstance !== fragmentInstance || pending.observer !== observer || pending.instance !== childInstance)
          pendingIntersectionUnobserves[writeIdx++] = pending;
      }
      pendingIntersectionUnobserves.length = writeIdx;
      observer.observe(childInstance);
    }), addFragmentHandleToInstance(childInstance, fragmentInstance));
  }
  function deleteChildFromFragmentInstance(childInstance, fragmentInstance) {
    var eventListeners = fragmentInstance._eventListeners;
    if (null !== eventListeners)
      for (var i = 0; i < eventListeners.length; i++) {
        var _eventListeners$i4 = eventListeners[i];
        childInstance.removeEventListener(
          _eventListeners$i4.type,
          _eventListeners$i4.attachedListener,
          getAttachOptions(_eventListeners$i4.optionsOrUseCapture)
        );
      }
    3 !== childInstance.nodeType && (eventListeners = fragmentInstance._observers, null !== eventListeners && eventListeners.forEach(function(observer) {
      "string" === typeof observer.rootMargin ? schedulePendingIntersectionUnobserve(
        fragmentInstance,
        observer,
        childInstance
      ) : observer.unobserve(childInstance);
    }), null != childInstance.reactFragments && childInstance.reactFragments.delete(fragmentInstance));
  }
  function clearContainerSparingly(container) {
    var nextNode = container.firstChild;
    nextNode && 10 === nextNode.nodeType && (nextNode = nextNode.nextSibling);
    for (; nextNode; ) {
      var node = nextNode;
      nextNode = nextNode.nextSibling;
      switch (node.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          clearContainerSparingly(node);
          detachDeletedInstance(node);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if ("stylesheet" === node.rel.toLowerCase()) continue;
      }
      container.removeChild(node);
    }
  }
  function canHydrateInstance(instance, type, props, inRootOrSingleton) {
    for (; 1 === instance.nodeType; ) {
      var anyProps = props;
      if (instance.nodeName.toLowerCase() !== type.toLowerCase()) {
        if (!inRootOrSingleton && ("INPUT" !== instance.nodeName || "hidden" !== instance.type))
          break;
      } else if (!inRootOrSingleton)
        if ("input" === type && "hidden" === instance.type) {
          var name = null == anyProps.name ? null : "" + anyProps.name;
          if ("hidden" === anyProps.type && instance.getAttribute("name") === name)
            return instance;
        } else return instance;
      else if (!instance[internalHoistableMarker])
        switch (type) {
          case "meta":
            if (!instance.hasAttribute("itemprop")) break;
            return instance;
          case "link":
            name = instance.getAttribute("rel");
            if ("stylesheet" === name && instance.hasAttribute("data-precedence"))
              break;
            else if (name !== anyProps.rel || instance.getAttribute("href") !== (null == anyProps.href || "" === anyProps.href ? null : anyProps.href) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin) || instance.getAttribute("title") !== (null == anyProps.title ? null : anyProps.title))
              break;
            return instance;
          case "style":
            if (instance.hasAttribute("data-precedence")) break;
            return instance;
          case "script":
            name = instance.getAttribute("src");
            if ((name !== (null == anyProps.src ? null : anyProps.src) || instance.getAttribute("type") !== (null == anyProps.type ? null : anyProps.type) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin)) && name && instance.hasAttribute("async") && !instance.hasAttribute("itemprop"))
              break;
            return instance;
          default:
            return instance;
        }
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) break;
    }
    return null;
  }
  function canHydrateTextInstance(instance, text, inRootOrSingleton) {
    if ("" === text) return null;
    for (; 3 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
    for (; 8 !== instance.nodeType; ) {
      if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton)
        return null;
      instance = getNextHydratable(instance.nextSibling);
      if (null === instance) return null;
    }
    return instance;
  }
  function isSuspenseInstancePending(instance) {
    return "$?" === instance.data || "$~" === instance.data;
  }
  function isSuspenseInstanceFallback(instance) {
    return "$!" === instance.data || "$?" === instance.data && "loading" !== instance.ownerDocument.readyState;
  }
  function registerSuspenseInstanceRetry(instance, callback) {
    var ownerDocument = instance.ownerDocument;
    if ("$~" === instance.data) instance._reactRetry = callback;
    else if ("$?" !== instance.data || "loading" !== ownerDocument.readyState)
      callback();
    else {
      var listener = function() {
        callback();
        ownerDocument.removeEventListener("DOMContentLoaded", listener);
      };
      ownerDocument.addEventListener("DOMContentLoaded", listener);
      instance._reactRetry = listener;
    }
  }
  function getNextHydratable(node) {
    for (; null != node; node = node.nextSibling) {
      var nodeType = node.nodeType;
      if (1 === nodeType || 3 === nodeType) break;
      if (8 === nodeType) {
        nodeType = node.data;
        if ("$" === nodeType || "$!" === nodeType || "$?" === nodeType || "$~" === nodeType || "&" === nodeType || "F!" === nodeType || "F" === nodeType)
          break;
        if ("/$" === nodeType || "/&" === nodeType) return null;
      }
    }
    return node;
  }
  var previousHydratableOnEnteringScopedSingleton = null;
  function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
    hydrationInstance = hydrationInstance.nextSibling;
    for (var depth = 0; hydrationInstance; ) {
      if (8 === hydrationInstance.nodeType) {
        var data = hydrationInstance.data;
        if ("/$" === data || "/&" === data) {
          if (0 === depth)
            return getNextHydratable(hydrationInstance.nextSibling);
          depth--;
        } else
          "$" !== data && "$!" !== data && "$?" !== data && "$~" !== data && "&" !== data || depth++;
      }
      hydrationInstance = hydrationInstance.nextSibling;
    }
    return null;
  }
  function getParentHydrationBoundary(targetInstance) {
    targetInstance = targetInstance.previousSibling;
    for (var depth = 0; targetInstance; ) {
      if (8 === targetInstance.nodeType) {
        var data = targetInstance.data;
        if ("$" === data || "$!" === data || "$?" === data || "$~" === data || "&" === data) {
          if (0 === depth) return targetInstance;
          depth--;
        } else "/$" !== data && "/&" !== data || depth++;
      }
      targetInstance = targetInstance.previousSibling;
    }
    return null;
  }
  function setFocusIfFocusable(node, focusOptions) {
    function handleFocus() {
      didFocus = true;
    }
    if (node.ownerDocument.activeElement === node) return true;
    var didFocus = false;
    try {
      node.ownerDocument.addEventListener("focus", handleFocus, true), (node.focus || HTMLElement.prototype.focus).call(node, focusOptions);
    } finally {
      node.ownerDocument.removeEventListener("focus", handleFocus, true);
    }
    return didFocus;
  }
  function requestPostPaintCallback(callback) {
    localRequestAnimationFrame(function() {
      localRequestAnimationFrame(function(time) {
        return callback(time);
      });
    });
  }
  function resolveSingletonInstance(type, props, rootContainerInstance) {
    props = getOwnerDocumentFromRootContainer(rootContainerInstance);
    switch (type) {
      case "html":
        type = props.documentElement;
        if (!type) throw Error(formatProdErrorMessage(452));
        return type;
      case "head":
        type = props.head;
        if (!type) throw Error(formatProdErrorMessage(453));
        return type;
      case "body":
        type = props.body;
        if (!type) throw Error(formatProdErrorMessage(454));
        return type;
      default:
        throw Error(formatProdErrorMessage(451));
    }
  }
  function releaseSingletonInstance(instance, type, props) {
    for (var propKey in props) {
      var propValue = props[propKey];
      props.hasOwnProperty(propKey) && null != propValue && setProp(instance, type, propKey, null, emptyProps, propValue);
    }
    null != props.dangerouslySetInnerHTML && (instance.textContent = "");
    instance.onclick === noop$1 && (instance.onclick = null);
    detachDeletedInstance(instance);
  }
  function clearSingletonPreambleContribution(instance) {
    for (var attributes = instance.attributes; attributes.length; )
      instance.removeAttributeNode(attributes[0]);
    detachDeletedInstance(instance);
  }
  var preloadPropsMap = /* @__PURE__ */ new Map(), preconnectsSet = /* @__PURE__ */ new Set();
  function getHoistableRoot(container) {
    if ("function" === typeof container.getRootNode) {
      var rootNode = container.getRootNode();
      if (9 === rootNode.nodeType || 11 === rootNode.nodeType) return rootNode;
    }
    return 9 === container.nodeType ? container : container.ownerDocument;
  }
  var previousDispatcher = ReactDOMSharedInternals.d;
  ReactDOMSharedInternals.d = {
    f: flushSyncWork,
    r: requestFormReset,
    D: prefetchDNS,
    C: preconnect,
    L: preload,
    m: preloadModule,
    X: preinitScript,
    S: preinitStyle,
    M: preinitModuleScript
  };
  function flushSyncWork() {
    var previousWasRendering = previousDispatcher.f(), wasRendering = flushSyncWork$1();
    return previousWasRendering || wasRendering;
  }
  function requestFormReset(form) {
    var formInst = getInstanceFromNode(form);
    null !== formInst && 5 === formInst.tag && "form" === formInst.type ? requestFormReset$1(formInst) : previousDispatcher.r(form);
  }
  var globalDocument = "undefined" === typeof document ? null : document;
  function preconnectAs(rel, href, crossOrigin) {
    var ownerDocument = globalDocument;
    if (ownerDocument && "string" === typeof href && href) {
      var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
      limitedEscapedHref = 'link[rel="' + rel + '"][href="' + limitedEscapedHref + '"]';
      "string" === typeof crossOrigin && (limitedEscapedHref += '[crossorigin="' + crossOrigin + '"]');
      preconnectsSet.has(limitedEscapedHref) || (preconnectsSet.add(limitedEscapedHref), rel = { rel, crossOrigin, href }, null === ownerDocument.querySelector(limitedEscapedHref) && (href = ownerDocument.createElement("link"), setInitialProperties(href, "link", rel), markNodeAsHoistable(href), ownerDocument.head.appendChild(href)));
    }
  }
  function prefetchDNS(href) {
    previousDispatcher.D(href);
    preconnectAs("dns-prefetch", href, null);
  }
  function preconnect(href, crossOrigin) {
    previousDispatcher.C(href, crossOrigin);
    preconnectAs("preconnect", href, crossOrigin);
  }
  function preload(href, as, options2) {
    previousDispatcher.L(href, as, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href && as) {
      var preloadSelector = 'link[rel="preload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"]';
      "image" === as ? options2 && options2.imageSrcSet ? (preloadSelector += '[imagesrcset="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSrcSet
      ) + '"]', "string" === typeof options2.imageSizes && (preloadSelector += '[imagesizes="' + escapeSelectorAttributeValueInsideDoubleQuotes(
        options2.imageSizes
      ) + '"]')) : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]' : preloadSelector += '[href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]';
      var key = preloadSelector;
      switch (as) {
        case "style":
          key = getStyleKey(href);
          break;
        case "script":
          key = getScriptKey(href);
      }
      if (!(preloadPropsMap.has(key) || (href = assign(
        {
          rel: "preload",
          href: "image" === as && options2 && options2.imageSrcSet ? void 0 : href,
          as
        },
        options2
      ), preloadPropsMap.set(key, href), null !== ownerDocument.querySelector(preloadSelector) || "style" === as && ownerDocument.querySelector(getStylesheetSelectorFromKey(key)) || "script" === as && ownerDocument.querySelector(getScriptSelectorFromKey(key))))) {
        var instance = ownerDocument.createElement("link");
        setInitialProperties(instance, "link", href);
        "style" === as && (instance[internalLoadPendingKey] = true, instance.onload = instance.onerror = function() {
          clearPendingLoadOnNode(instance);
        });
        markNodeAsHoistable(instance);
        ownerDocument.head.appendChild(instance);
      }
    }
  }
  function preloadModule(href, options2) {
    previousDispatcher.m(href, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var as = options2 && "string" === typeof options2.as ? options2.as : "script", preloadSelector = 'link[rel="modulepreload"][as="' + escapeSelectorAttributeValueInsideDoubleQuotes(as) + '"][href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"]', key = preloadSelector;
      switch (as) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          key = getScriptKey(href);
      }
      if (!preloadPropsMap.has(key) && (href = assign({ rel: "modulepreload", href }, options2), preloadPropsMap.set(key, href), null === ownerDocument.querySelector(preloadSelector))) {
        switch (as) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (ownerDocument.querySelector(getScriptSelectorFromKey(key)))
              return;
        }
        as = ownerDocument.createElement("link");
        setInitialProperties(as, "link", href);
        markNodeAsHoistable(as);
        ownerDocument.head.appendChild(as);
      }
    }
  }
  function preinitStyle(href, precedence, options2) {
    previousDispatcher.S(href, precedence, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && href) {
      var styles = getResourcesFromRoot(ownerDocument).hoistableStyles, key = getStyleKey(href);
      precedence = precedence || "default";
      var resource = styles.get(key);
      if (!resource) {
        var state = { loading: 0, preload: null };
        if (resource = ownerDocument.querySelector(
          getStylesheetSelectorFromKey(key)
        ))
          state.loading = 5;
        else {
          href = assign(
            { rel: "stylesheet", href, "data-precedence": precedence },
            options2
          );
          (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(href, options2);
          var link = resource = ownerDocument.createElement("link");
          markNodeAsHoistable(link);
          setInitialProperties(link, "link", href);
          link._p = new Promise(function(resolve, reject) {
            link.onload = resolve;
            link.onerror = reject;
          });
          link.addEventListener("load", function() {
            state.loading |= 1;
          });
          link.addEventListener("error", function() {
            state.loading |= 2;
          });
          state.loading |= 4;
          insertStylesheet(resource, precedence, ownerDocument);
        }
        resource = {
          type: "stylesheet",
          instance: resource,
          count: 1,
          state
        };
        styles.set(key, resource);
      }
    }
  }
  function preinitScript(src, options2) {
    previousDispatcher.X(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function preinitModuleScript(src, options2) {
    previousDispatcher.M(src, options2);
    var ownerDocument = globalDocument;
    if (ownerDocument && src) {
      var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
      resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({ src, async: true, type: "module" }, options2), (options2 = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options2), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
        type: "script",
        instance: resource,
        count: 1,
        state: null
      }, scripts.set(key, resource));
    }
  }
  function getResource(type, currentProps, pendingProps, currentResource) {
    var JSCompiler_inline_result = (JSCompiler_inline_result = rootInstanceStackCursor.current) ? getHoistableRoot(JSCompiler_inline_result) : null;
    if (!JSCompiler_inline_result) throw Error(formatProdErrorMessage(446));
    switch (type) {
      case "meta":
      case "title":
        return null;
      case "style":
        return "string" === typeof pendingProps.precedence && "string" === typeof pendingProps.href ? (pendingProps = getStyleKey(pendingProps.href), currentProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableStyles, currentResource = currentProps.get(pendingProps), currentResource || (currentResource = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, currentProps.set(pendingProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if ("stylesheet" === pendingProps.rel && "string" === typeof pendingProps.href && "string" === typeof pendingProps.precedence) {
          type = getStyleKey(pendingProps.href);
          var styles$268 = getResourcesFromRoot(
            JSCompiler_inline_result
          ).hoistableStyles, resource$269 = styles$268.get(type);
          resource$269 || (JSCompiler_inline_result = JSCompiler_inline_result.ownerDocument || JSCompiler_inline_result, resource$269 = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, styles$268.set(type, resource$269), (styles$268 = JSCompiler_inline_result.querySelector(
            getStylesheetSelectorFromKey(type)
          )) ? styles$268._p || (resource$269.instance = styles$268, resource$269.state.loading = 5) : (styles$268 = preloadPropsMap.get(type), styles$268 || (styles$268 = {
            rel: "preload",
            as: "style",
            href: pendingProps.href,
            crossOrigin: pendingProps.crossOrigin,
            integrity: pendingProps.integrity,
            media: pendingProps.media,
            hrefLang: pendingProps.hrefLang,
            referrerPolicy: pendingProps.referrerPolicy
          }, preloadPropsMap.set(type, styles$268)), preloadStylesheet(
            JSCompiler_inline_result,
            type,
            styles$268,
            resource$269.state
          )));
          if (currentProps && null === currentResource)
            throw Error(formatProdErrorMessage(528, ""));
          return resource$269;
        }
        if (currentProps && null !== currentResource)
          throw Error(formatProdErrorMessage(529, ""));
        return null;
      case "script":
        return currentProps = pendingProps.async, pendingProps = pendingProps.src, "string" === typeof pendingProps && currentProps && "function" !== typeof currentProps && "symbol" !== typeof currentProps ? (pendingProps = getScriptKey(pendingProps), currentProps = getResourcesFromRoot(
          JSCompiler_inline_result
        ).hoistableScripts, currentResource = currentProps.get(pendingProps), currentResource || (currentResource = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, currentProps.set(pendingProps, currentResource)), currentResource) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(formatProdErrorMessage(444, type));
    }
  }
  function getStyleKey(href) {
    return 'href="' + escapeSelectorAttributeValueInsideDoubleQuotes(href) + '"';
  }
  function getStylesheetSelectorFromKey(key) {
    return 'link[rel="stylesheet"][' + key + "]";
  }
  function stylesheetPropsFromRawProps(rawProps) {
    return assign({}, rawProps, {
      "data-precedence": rawProps.precedence,
      precedence: null
    });
  }
  function preloadStylesheet(ownerDocument, key, preloadProps, state) {
    if (key = ownerDocument.querySelector(
      'link[rel="preload"][as="style"][' + key + "]"
    )) {
      if (true !== key[internalLoadPendingKey]) {
        state.loading = 1;
        return;
      }
    } else
      key = ownerDocument.createElement("link"), key[internalLoadPendingKey] = true, key.onload = key.onerror = clearPendingLoadOnNode.bind(null, key), setInitialProperties(key, "link", preloadProps), markNodeAsHoistable(key), ownerDocument.head.appendChild(key);
    state.preload = key;
    key.addEventListener("load", function() {
      return state.loading |= 1;
    });
    key.addEventListener("error", function() {
      return state.loading |= 2;
    });
  }
  function getScriptKey(src) {
    return '[src="' + escapeSelectorAttributeValueInsideDoubleQuotes(src) + '"]';
  }
  function getScriptSelectorFromKey(key) {
    return "script[async]" + key;
  }
  function acquireResource(hoistableRoot, resource, props) {
    resource.count++;
    if (null === resource.instance)
      switch (resource.type) {
        case "style":
          var instance = hoistableRoot.querySelector(
            'style[data-href~="' + escapeSelectorAttributeValueInsideDoubleQuotes(props.href) + '"]'
          );
          if (instance)
            return resource.instance = instance, markNodeAsHoistable(instance), instance;
          var styleProps = assign({}, props, {
            "data-href": props.href,
            "data-precedence": props.precedence,
            href: null,
            precedence: null
          });
          instance = (hoistableRoot.ownerDocument || hoistableRoot).createElement(
            "style"
          );
          markNodeAsHoistable(instance);
          setInitialProperties(instance, "style", styleProps);
          insertStylesheet(instance, props.precedence, hoistableRoot);
          return resource.instance = instance;
        case "stylesheet":
          styleProps = getStyleKey(props.href);
          var instance$274 = hoistableRoot.querySelector(
            getStylesheetSelectorFromKey(styleProps)
          );
          if (instance$274)
            return resource.state.loading |= 4, resource.instance = instance$274, markNodeAsHoistable(instance$274), instance$274;
          instance = stylesheetPropsFromRawProps(props);
          (styleProps = preloadPropsMap.get(styleProps)) && adoptPreloadPropsForStylesheet(instance, styleProps);
          instance$274 = (hoistableRoot.ownerDocument || hoistableRoot).createElement("link");
          markNodeAsHoistable(instance$274);
          var linkInstance = instance$274;
          linkInstance._p = new Promise(function(resolve, reject) {
            linkInstance.onload = resolve;
            linkInstance.onerror = reject;
          });
          setInitialProperties(instance$274, "link", instance);
          resource.state.loading |= 4;
          insertStylesheet(instance$274, props.precedence, hoistableRoot);
          return resource.instance = instance$274;
        case "script":
          instance$274 = getScriptKey(props.src);
          if (styleProps = hoistableRoot.querySelector(
            getScriptSelectorFromKey(instance$274)
          ))
            return resource.instance = styleProps, markNodeAsHoistable(styleProps), styleProps;
          instance = props;
          if (styleProps = preloadPropsMap.get(instance$274))
            instance = assign({}, props), adoptPreloadPropsForScript(instance, styleProps);
          hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
          styleProps = hoistableRoot.createElement("script");
          markNodeAsHoistable(styleProps);
          setInitialProperties(styleProps, "link", instance);
          hoistableRoot.head.appendChild(styleProps);
          return resource.instance = styleProps;
        case "void":
          return null;
        default:
          throw Error(formatProdErrorMessage(443, resource.type));
      }
    else
      "stylesheet" === resource.type && 0 === (resource.state.loading & 4) && (instance = resource.instance, resource.state.loading |= 4, insertStylesheet(instance, props.precedence, hoistableRoot));
    return resource.instance;
  }
  function insertStylesheet(instance, precedence, root2) {
    for (var nodes = root2.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), last = nodes.length ? nodes[nodes.length - 1] : null, prior = last, i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.dataset.precedence === precedence) prior = node;
      else if (prior !== last) break;
    }
    prior ? prior.parentNode.insertBefore(instance, prior.nextSibling) : (precedence = 9 === root2.nodeType ? root2.head : root2, precedence.insertBefore(instance, precedence.firstChild));
  }
  function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
    null == stylesheetProps.crossOrigin && (stylesheetProps.crossOrigin = preloadProps.crossOrigin);
    null == stylesheetProps.referrerPolicy && (stylesheetProps.referrerPolicy = preloadProps.referrerPolicy);
    null == stylesheetProps.title && (stylesheetProps.title = preloadProps.title);
  }
  function adoptPreloadPropsForScript(scriptProps, preloadProps) {
    null == scriptProps.crossOrigin && (scriptProps.crossOrigin = preloadProps.crossOrigin);
    null == scriptProps.referrerPolicy && (scriptProps.referrerPolicy = preloadProps.referrerPolicy);
    null == scriptProps.integrity && (scriptProps.integrity = preloadProps.integrity);
  }
  var tagCaches = null;
  function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
    if (null === tagCaches) {
      var cache = /* @__PURE__ */ new Map();
      var caches = tagCaches = /* @__PURE__ */ new Map();
      caches.set(ownerDocument, cache);
    } else
      caches = tagCaches, cache = caches.get(ownerDocument), cache || (cache = /* @__PURE__ */ new Map(), caches.set(ownerDocument, cache));
    if (cache.has(type)) return cache;
    cache.set(type, null);
    ownerDocument = ownerDocument.getElementsByTagName(type);
    for (caches = 0; caches < ownerDocument.length; caches++) {
      var node = ownerDocument[caches];
      if (!(node[internalHoistableMarker] || node[internalInstanceKey] || "link" === type && "stylesheet" === node.getAttribute("rel")) && "http://www.w3.org/2000/svg" !== node.namespaceURI) {
        var nodeKey = node.getAttribute(keyAttribute) || "";
        nodeKey = type + nodeKey;
        var existing = cache.get(nodeKey);
        existing ? existing.push(node) : cache.set(nodeKey, [node]);
      }
    }
    return cache;
  }
  function mountHoistable(hoistableRoot, type, instance) {
    hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
    hoistableRoot.head.insertBefore(
      instance,
      "title" === type ? hoistableRoot.querySelector("head > title") : null
    );
  }
  function isHostHoistableType(type, props, hostContext) {
    if (1 === hostContext || null != props.itemProp) return false;
    switch (type) {
      case "meta":
      case "title":
        return true;
      case "style":
        if ("string" !== typeof props.precedence || "string" !== typeof props.href || "" === props.href)
          break;
        return true;
      case "link":
        if ("string" !== typeof props.rel || "string" !== typeof props.href || "" === props.href || props.onLoad || props.onError)
          break;
        switch (props.rel) {
          case "stylesheet":
            return type = props.disabled, "string" === typeof props.precedence && null == type;
          default:
            return true;
        }
      case "script":
        if (props.async && "function" !== typeof props.async && "symbol" !== typeof props.async && !props.onLoad && !props.onError && props.src && "string" === typeof props.src)
          return true;
    }
    return false;
  }
  function maySuspendCommit(type, props) {
    return "img" === type && null != props.src && "" !== props.src && null == props.onLoad && "lazy" !== props.loading;
  }
  function preloadResource(resource) {
    return "stylesheet" === resource.type && 0 === (resource.state.loading & 3) ? false : true;
  }
  function estimateImageBytes(instance) {
    return (instance.width || 100) * (instance.height || 100) * ("number" === typeof devicePixelRatio ? devicePixelRatio : 1) * 0.25;
  }
  function suspendInstance(state, instance) {
    "function" === typeof instance.decode && (state.imgCount++, instance.complete || (state.imgBytes += estimateImageBytes(instance), state.suspenseyImages.push(instance)), state = onUnsuspendImg.bind(state), instance.decode().then(state, state));
  }
  function suspendResource(state, hoistableRoot, resource, props) {
    if ("stylesheet" === resource.type && ("string" !== typeof props.media || false !== matchMedia(props.media).matches) && 0 === (resource.state.loading & 4)) {
      if (null === resource.instance) {
        var key = getStyleKey(props.href), instance = hoistableRoot.querySelector(
          getStylesheetSelectorFromKey(key)
        );
        if (instance) {
          hoistableRoot = instance._p;
          null !== hoistableRoot && "object" === typeof hoistableRoot && "function" === typeof hoistableRoot.then && (state.count++, state = onUnsuspend.bind(state), hoistableRoot.then(state, state));
          resource.state.loading |= 4;
          resource.instance = instance;
          markNodeAsHoistable(instance);
          return;
        }
        instance = hoistableRoot.ownerDocument || hoistableRoot;
        props = stylesheetPropsFromRawProps(props);
        (key = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(props, key);
        instance = instance.createElement("link");
        markNodeAsHoistable(instance);
        var linkInstance = instance;
        linkInstance._p = new Promise(function(resolve, reject) {
          linkInstance.onload = resolve;
          linkInstance.onerror = reject;
        });
        setInitialProperties(instance, "link", props);
        resource.instance = instance;
      }
      null === state.stylesheets && (state.stylesheets = /* @__PURE__ */ new Map());
      state.stylesheets.set(resource, hoistableRoot);
      (hoistableRoot = resource.state.preload) && 0 === (resource.state.loading & 3) && (state.count++, resource = onUnsuspend.bind(state), hoistableRoot.addEventListener("load", resource), hoistableRoot.addEventListener("error", resource));
    }
  }
  var estimatedBytesWithinLimit = 0;
  function waitForCommitToBeReady(state, timeoutOffset) {
    state.stylesheets && 0 === state.count && insertSuspendedStylesheets(state, state.stylesheets);
    return 0 < state.count || 0 < state.imgCount ? function(commit2) {
      var stylesheetTimer = setTimeout(function() {
        state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets);
        if (state.unsuspend) {
          var unsuspend = state.unsuspend;
          state.unsuspend = null;
          unsuspend();
        }
      }, 6e4 + timeoutOffset);
      0 < state.imgBytes && 0 === estimatedBytesWithinLimit && (estimatedBytesWithinLimit = 62500 * estimateBandwidth());
      var imgTimer = setTimeout(
        function() {
          state.waitingForImages = false;
          if (0 === state.count && (state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets), state.unsuspend)) {
            var unsuspend = state.unsuspend;
            state.unsuspend = null;
            unsuspend();
          }
        },
        (state.imgBytes > estimatedBytesWithinLimit ? 50 : 800) + timeoutOffset
      );
      state.unsuspend = commit2;
      return function() {
        state.unsuspend = null;
        clearTimeout(stylesheetTimer);
        clearTimeout(imgTimer);
      };
    } : null;
  }
  function checkIfFullyUnsuspended(state) {
    if (0 === state.count && (0 === state.imgCount || !state.waitingForImages)) {
      if (state.stylesheets) insertSuspendedStylesheets(state, state.stylesheets);
      else if (state.unsuspend) {
        var unsuspend = state.unsuspend;
        state.unsuspend = null;
        unsuspend();
      }
    }
  }
  function onUnsuspend() {
    this.count--;
    checkIfFullyUnsuspended(this);
  }
  function onUnsuspendImg() {
    this.imgCount--;
    checkIfFullyUnsuspended(this);
  }
  var precedencesByRoot = null;
  function insertSuspendedStylesheets(state, resources) {
    state.stylesheets = null;
    null !== state.unsuspend && (state.count++, precedencesByRoot = /* @__PURE__ */ new Map(), resources.forEach(insertStylesheetIntoRoot, state), precedencesByRoot = null, onUnsuspend.call(state));
  }
  function insertStylesheetIntoRoot(root2, resource) {
    if (!(resource.state.loading & 4)) {
      var precedences = precedencesByRoot.get(root2);
      if (precedences) var last = precedences.get(null);
      else {
        precedences = /* @__PURE__ */ new Map();
        precedencesByRoot.set(root2, precedences);
        for (var nodes = root2.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          if ("LINK" === node.nodeName || "not all" !== node.getAttribute("media"))
            precedences.set(node.dataset.precedence, node), last = node;
        }
        last && precedences.set(null, last);
      }
      nodes = resource.instance;
      node = nodes.getAttribute("data-precedence");
      i = precedences.get(node) || last;
      i === last && precedences.set(null, nodes);
      precedences.set(node, nodes);
      this.count++;
      last = onUnsuspend.bind(this);
      nodes.addEventListener("load", last);
      nodes.addEventListener("error", last);
      i ? i.parentNode.insertBefore(nodes, i.nextSibling) : (root2 = 9 === root2.nodeType ? root2.head : root2, root2.insertBefore(nodes, root2.firstChild));
      resource.state.loading |= 4;
    }
  }
  var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: sharedNotPendingObject,
    _currentValue2: sharedNotPendingObject,
    _threadCount: 0
  };
  function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, formState) {
    this.tag = 1;
    this.containerInfo = containerInfo;
    this.pingCache = this.current = this.pendingChildren = null;
    this.timeoutHandle = -1;
    this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
    this.callbackPriority = 0;
    this.expirationTimes = createLaneMap(-1);
    this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
    this.entanglements = createLaneMap(0);
    this.hiddenUpdates = createLaneMap(null);
    this.identifierPrefix = identifierPrefix;
    this.onUncaughtError = onUncaughtError;
    this.onCaughtError = onCaughtError;
    this.onRecoverableError = onRecoverableError;
    this.pooledCache = null;
    this.pooledCacheLanes = 0;
    this.formState = formState;
    this.transitionTypes = null;
    this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, formState, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator) {
    containerInfo = new FiberRootNode(
      containerInfo,
      tag,
      hydrate,
      identifierPrefix,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      onDefaultTransitionIndicator,
      formState
    );
    tag = 1;
    true === isStrictMode && (tag |= 24);
    isStrictMode = createFiberImplClass(3, null, null, tag);
    containerInfo.current = isStrictMode;
    isStrictMode.stateNode = containerInfo;
    tag = createCache();
    tag.refCount++;
    containerInfo.pooledCache = tag;
    tag.refCount++;
    isStrictMode.memoizedState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: tag
    };
    initializeUpdateQueue(isStrictMode);
    return containerInfo;
  }
  function getContextForSubtree(parentComponent) {
    if (!parentComponent) return emptyContextObject;
    parentComponent = emptyContextObject;
    return parentComponent;
  }
  function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
    parentComponent = getContextForSubtree(parentComponent);
    null === container.context ? container.context = parentComponent : container.pendingContext = parentComponent;
    container = createUpdate(lane);
    container.payload = { element };
    callback = void 0 === callback ? null : callback;
    null !== callback && (container.callback = callback);
    element = enqueueUpdate(rootFiber, container, lane);
    null !== element && (scheduleUpdateOnFiber(element, rootFiber, lane), entangleTransitions(element, rootFiber, lane));
  }
  function markRetryLaneImpl(fiber, retryLane) {
    fiber = fiber.memoizedState;
    if (null !== fiber && null !== fiber.dehydrated) {
      var a = fiber.retryLane;
      fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
    }
  }
  function markRetryLaneIfNotHydrated(fiber, retryLane) {
    markRetryLaneImpl(fiber, retryLane);
    (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
  }
  function attemptContinuousHydration(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var root2 = enqueueConcurrentRenderForLane(fiber, 67108864);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, 67108864);
      markRetryLaneIfNotHydrated(fiber, 67108864);
    }
  }
  function attemptHydrationAtCurrentPriority(fiber) {
    if (13 === fiber.tag || 31 === fiber.tag) {
      var lane = requestUpdateLane();
      lane = getBumpedLaneForHydrationByLane(lane);
      var root2 = enqueueConcurrentRenderForLane(fiber, lane);
      null !== root2 && scheduleUpdateOnFiber(root2, fiber, lane);
      markRetryLaneIfNotHydrated(fiber, lane);
    }
  }
  var _enabled = true;
  function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 2, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchContinuousEvent(domEventName, eventSystemFlags, container, nativeEvent) {
    var prevTransition = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    var previousPriority = ReactDOMSharedInternals.p;
    try {
      ReactDOMSharedInternals.p = 8, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
    } finally {
      ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
    }
  }
  function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (_enabled) {
      var blockedOn = findInstanceBlockingEvent(nativeEvent);
      if (null === blockedOn)
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          return_targetInst,
          targetContainer
        ), clearIfContinuousEvent(domEventName, nativeEvent);
      else if (queueIfContinuousEvent(
        blockedOn,
        domEventName,
        eventSystemFlags,
        targetContainer,
        nativeEvent
      ))
        nativeEvent.stopPropagation();
      else if (clearIfContinuousEvent(domEventName, nativeEvent), eventSystemFlags & 4 && -1 < discreteReplayableEvents.indexOf(domEventName)) {
        for (; null !== blockedOn; ) {
          var fiber = getInstanceFromNode(blockedOn);
          if (null !== fiber)
            switch (fiber.tag) {
              case 3:
                fiber = fiber.stateNode;
                if (fiber.current.memoizedState.isDehydrated) {
                  var lanes = getHighestPriorityLanes(fiber.pendingLanes);
                  if (0 !== lanes) {
                    var root2 = fiber;
                    root2.pendingLanes |= 2;
                    for (root2.entangledLanes |= 2; lanes; ) {
                      var lane = 1 << 31 - clz32(lanes);
                      root2.entanglements[1] |= lane;
                      lanes &= ~lane;
                    }
                    ensureRootIsScheduled(fiber);
                    0 === (executionContext & 6) && (workInProgressRootRenderTargetTime = now() + 500, flushSyncWorkAcrossRoots_impl(0));
                  }
                }
                break;
              case 31:
              case 13:
                root2 = enqueueConcurrentRenderForLane(fiber, 2), null !== root2 && scheduleUpdateOnFiber(root2, fiber, 2), flushSyncWork$1(), markRetryLaneIfNotHydrated(fiber, 2);
            }
          fiber = findInstanceBlockingEvent(nativeEvent);
          null === fiber && dispatchEventForPluginEventSystem(
            domEventName,
            eventSystemFlags,
            nativeEvent,
            return_targetInst,
            targetContainer
          );
          if (fiber === blockedOn) break;
          blockedOn = fiber;
        }
        null !== blockedOn && nativeEvent.stopPropagation();
      } else
        dispatchEventForPluginEventSystem(
          domEventName,
          eventSystemFlags,
          nativeEvent,
          null,
          targetContainer
        );
    }
  }
  function findInstanceBlockingEvent(nativeEvent) {
    nativeEvent = getEventTarget(nativeEvent);
    return findInstanceBlockingTarget(nativeEvent);
  }
  var return_targetInst = null;
  function findInstanceBlockingTarget(targetNode) {
    return_targetInst = null;
    targetNode = getClosestInstanceFromNode(targetNode);
    if (null !== targetNode) {
      var nearestMounted = getNearestMountedFiber(targetNode);
      if (null === nearestMounted) targetNode = null;
      else {
        var tag = nearestMounted.tag;
        if (13 === tag) {
          targetNode = getSuspenseInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (31 === tag) {
          targetNode = getActivityInstanceFromFiber(nearestMounted);
          if (null !== targetNode) return targetNode;
          targetNode = null;
        } else if (3 === tag) {
          if (nearestMounted.stateNode.current.memoizedState.isDehydrated)
            return 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          targetNode = null;
        } else nearestMounted !== targetNode && (targetNode = null);
      }
    }
    return_targetInst = targetNode;
    return null;
  }
  function getEventPriority(domEventName) {
    switch (domEventName) {
      case "beforetoggle":
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
      case "seeked":
      case "submit":
      case "toggle":
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
      case "fullscreenerror":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
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
      case "resize":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (getCurrentPriorityLevel()) {
          case ImmediatePriority:
            return 2;
          case UserBlockingPriority:
            return 8;
          case NormalPriority$1:
          case LowPriority:
            return 32;
          case IdlePriority:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var hasScheduledReplayAttempt = false, queuedFocus = null, queuedDrag = null, queuedMouse = null, queuedPointers = /* @__PURE__ */ new Map(), queuedPointerCaptures = /* @__PURE__ */ new Map(), queuedExplicitHydrationTargets = [], discreteReplayableEvents = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function clearIfContinuousEvent(domEventName, nativeEvent) {
    switch (domEventName) {
      case "focusin":
      case "focusout":
        queuedFocus = null;
        break;
      case "dragenter":
      case "dragleave":
        queuedDrag = null;
        break;
      case "mouseover":
      case "mouseout":
        queuedMouse = null;
        break;
      case "pointerover":
      case "pointerout":
        queuedPointers.delete(nativeEvent.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        queuedPointerCaptures.delete(nativeEvent.pointerId);
    }
  }
  function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    if (null === existingQueuedEvent || existingQueuedEvent.nativeEvent !== nativeEvent)
      return existingQueuedEvent = {
        blockedOn,
        domEventName,
        eventSystemFlags,
        nativeEvent,
        targetContainers: [targetContainer]
      }, null !== blockedOn && (blockedOn = getInstanceFromNode(blockedOn), null !== blockedOn && attemptContinuousHydration(blockedOn)), existingQueuedEvent;
    existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
    blockedOn = existingQueuedEvent.targetContainers;
    null !== targetContainer && -1 === blockedOn.indexOf(targetContainer) && blockedOn.push(targetContainer);
    return existingQueuedEvent;
  }
  function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
    switch (domEventName) {
      case "focusin":
        return queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedFocus,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "dragenter":
        return queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedDrag,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "mouseover":
        return queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(
          queuedMouse,
          blockedOn,
          domEventName,
          eventSystemFlags,
          targetContainer,
          nativeEvent
        ), true;
      case "pointerover":
        var pointerId = nativeEvent.pointerId;
        queuedPointers.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointers.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        );
        return true;
      case "gotpointercapture":
        return pointerId = nativeEvent.pointerId, queuedPointerCaptures.set(
          pointerId,
          accumulateOrCreateContinuousQueuedReplayableEvent(
            queuedPointerCaptures.get(pointerId) || null,
            blockedOn,
            domEventName,
            eventSystemFlags,
            targetContainer,
            nativeEvent
          )
        ), true;
    }
    return false;
  }
  function attemptExplicitHydrationTarget(queuedTarget) {
    var targetInst = getClosestInstanceFromNode(queuedTarget.target);
    if (null !== targetInst) {
      var nearestMounted = getNearestMountedFiber(targetInst);
      if (null !== nearestMounted) {
        if (targetInst = nearestMounted.tag, 13 === targetInst) {
          if (targetInst = getSuspenseInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (31 === targetInst) {
          if (targetInst = getActivityInstanceFromFiber(nearestMounted), null !== targetInst) {
            queuedTarget.blockedOn = targetInst;
            runWithPriority(queuedTarget.priority, function() {
              attemptHydrationAtCurrentPriority(nearestMounted);
            });
            return;
          }
        } else if (3 === targetInst && nearestMounted.stateNode.current.memoizedState.isDehydrated) {
          queuedTarget.blockedOn = 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
          return;
        }
      }
    }
    queuedTarget.blockedOn = null;
  }
  function attemptReplayContinuousQueuedEvent(queuedEvent) {
    if (null !== queuedEvent.blockedOn) return false;
    for (var targetContainers = queuedEvent.targetContainers; 0 < targetContainers.length; ) {
      var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
      if (null === nextBlockedOn) {
        nextBlockedOn = queuedEvent.nativeEvent;
        var nativeEventClone = new nextBlockedOn.constructor(
          nextBlockedOn.type,
          nextBlockedOn
        );
        currentReplayingEvent = nativeEventClone;
        nextBlockedOn.target.dispatchEvent(nativeEventClone);
        currentReplayingEvent = null;
      } else
        return targetContainers = getInstanceFromNode(nextBlockedOn), null !== targetContainers && attemptContinuousHydration(targetContainers), queuedEvent.blockedOn = nextBlockedOn, false;
      targetContainers.shift();
    }
    return true;
  }
  function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
    attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
  }
  function replayUnblockedEvents() {
    hasScheduledReplayAttempt = false;
    null !== queuedFocus && attemptReplayContinuousQueuedEvent(queuedFocus) && (queuedFocus = null);
    null !== queuedDrag && attemptReplayContinuousQueuedEvent(queuedDrag) && (queuedDrag = null);
    null !== queuedMouse && attemptReplayContinuousQueuedEvent(queuedMouse) && (queuedMouse = null);
    queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
    queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
  }
  function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
    queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null, hasScheduledReplayAttempt || (hasScheduledReplayAttempt = true, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      replayUnblockedEvents
    )));
  }
  var lastScheduledReplayQueue = null;
  function scheduleReplayQueueIfNeeded(formReplayingQueue) {
    lastScheduledReplayQueue !== formReplayingQueue && (lastScheduledReplayQueue = formReplayingQueue, Scheduler.unstable_scheduleCallback(
      Scheduler.unstable_NormalPriority,
      function() {
        lastScheduledReplayQueue === formReplayingQueue && (lastScheduledReplayQueue = null);
        for (var i = 0; i < formReplayingQueue.length; i += 3) {
          var form = formReplayingQueue[i], submitterOrAction = formReplayingQueue[i + 1], formData = formReplayingQueue[i + 2];
          if ("function" !== typeof submitterOrAction)
            if (null === findInstanceBlockingTarget(submitterOrAction || form))
              continue;
            else break;
          var formInst = getInstanceFromNode(form);
          null !== formInst && (formReplayingQueue.splice(i, 3), i -= 3, startHostTransition(
            formInst,
            {
              pending: true,
              data: formData,
              method: form.method,
              action: submitterOrAction
            },
            submitterOrAction,
            formData
          ));
        }
      }
    ));
  }
  function retryIfBlockedOn(unblocked) {
    function unblock(queuedEvent) {
      return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
    }
    null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
    null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
    null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
    queuedPointers.forEach(unblock);
    queuedPointerCaptures.forEach(unblock);
    for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
      var queuedTarget = queuedExplicitHydrationTargets[i];
      queuedTarget.blockedOn === unblocked && (queuedTarget.blockedOn = null);
    }
    for (; 0 < queuedExplicitHydrationTargets.length && (i = queuedExplicitHydrationTargets[0], null === i.blockedOn); )
      attemptExplicitHydrationTarget(i), null === i.blockedOn && queuedExplicitHydrationTargets.shift();
    i = (unblocked.ownerDocument || unblocked).$$reactFormReplay;
    if (null != i)
      for (queuedTarget = 0; queuedTarget < i.length; queuedTarget += 3) {
        var form = i[queuedTarget], submitterOrAction = i[queuedTarget + 1], formProps = form[internalPropsKey] || null;
        if ("function" === typeof submitterOrAction)
          formProps || scheduleReplayQueueIfNeeded(i);
        else if (formProps) {
          var action = null;
          if (submitterOrAction && submitterOrAction.hasAttribute("formAction"))
            if (form = submitterOrAction, formProps = submitterOrAction[internalPropsKey] || null)
              action = formProps.formAction;
            else {
              if (null !== findInstanceBlockingTarget(form)) continue;
            }
          else action = formProps.action;
          "function" === typeof action ? i[queuedTarget + 1] = action : (i.splice(queuedTarget, 3), queuedTarget -= 3);
          scheduleReplayQueueIfNeeded(i);
        }
      }
  }
  function defaultOnDefaultTransitionIndicator() {
    function handleNavigate(event) {
      event.canIntercept && "react-transition" === event.info && event.intercept({
        handler: function() {
          return new Promise(function(resolve) {
            return pendingResolve = resolve;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function handleNavigateComplete() {
      null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      isCancelled || setTimeout(startFakeNavigation, 20);
    }
    function startFakeNavigation() {
      if (!isCancelled && !navigation.transition) {
        var currentEntry = navigation.currentEntry;
        currentEntry && null != currentEntry.url && navigation.navigate(currentEntry.url, {
          state: currentEntry.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if ("object" === typeof navigation) {
      var isCancelled = false, pendingResolve = null;
      navigation.addEventListener("navigate", handleNavigate);
      navigation.addEventListener("navigatesuccess", handleNavigateComplete);
      navigation.addEventListener("navigateerror", handleNavigateComplete);
      setTimeout(startFakeNavigation, 100);
      return function() {
        isCancelled = true;
        navigation.removeEventListener("navigate", handleNavigate);
        navigation.removeEventListener("navigatesuccess", handleNavigateComplete);
        navigation.removeEventListener("navigateerror", handleNavigateComplete);
        null !== pendingResolve && (pendingResolve(), pendingResolve = null);
      };
    }
  }
  function ReactDOMRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function(children) {
    var root2 = this._internalRoot;
    if (null === root2) throw Error(formatProdErrorMessage(409));
    var current = root2.current, lane = requestUpdateLane();
    updateContainerImpl(current, lane, children, root2, null, null);
  };
  ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = function() {
    var root2 = this._internalRoot;
    if (null !== root2) {
      this._internalRoot = null;
      var container = root2.containerInfo;
      updateContainerImpl(root2.current, 2, null, root2, null, null);
      flushSyncWork$1();
      container[internalContainerInstanceKey] = null;
    }
  };
  function ReactDOMHydrationRoot(internalRoot) {
    this._internalRoot = internalRoot;
  }
  ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function(target) {
    if (target) {
      var updatePriority = resolveUpdatePriority();
      target = { blockedOn: null, target, priority: updatePriority };
      for (var i = 0; i < queuedExplicitHydrationTargets.length && 0 !== updatePriority && updatePriority < queuedExplicitHydrationTargets[i].priority; i++) ;
      queuedExplicitHydrationTargets.splice(i, 0, target);
      0 === i && attemptExplicitHydrationTarget(target);
    }
  };
  var isomorphicReactPackageVersion$jscomp$inline_2043 = React2.version;
  if ("19.3.0" !== isomorphicReactPackageVersion$jscomp$inline_2043)
    throw Error(
      formatProdErrorMessage(
        527,
        isomorphicReactPackageVersion$jscomp$inline_2043,
        "19.3.0"
      )
    );
  ReactDOMSharedInternals.findDOMNode = function(componentOrElement) {
    var fiber = componentOrElement._reactInternals;
    if (void 0 === fiber) {
      if ("function" === typeof componentOrElement.render)
        throw Error(formatProdErrorMessage(188));
      componentOrElement = Object.keys(componentOrElement).join(",");
      throw Error(formatProdErrorMessage(268, componentOrElement));
    }
    componentOrElement = findCurrentFiberUsingSlowPath(fiber);
    componentOrElement = null !== componentOrElement ? findCurrentHostFiberImpl(componentOrElement) : null;
    componentOrElement = null === componentOrElement ? null : componentOrElement.stateNode;
    return componentOrElement;
  };
  var internals$jscomp$inline_2586 = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: ReactSharedInternals,
    reconcilerVersion: "19.3.0"
  };
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
    var hook$jscomp$inline_2587 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook$jscomp$inline_2587.isDisabled && hook$jscomp$inline_2587.supportsFiber)
      try {
        rendererID = hook$jscomp$inline_2587.inject(
          internals$jscomp$inline_2586
        ), injectedHook = hook$jscomp$inline_2587;
      } catch (err) {
      }
  }
  reactDomClient_production.createRoot = function(container, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError));
    options2 = createFiberRoot(
      container,
      1,
      false,
      null,
      null,
      isStrictMode,
      identifierPrefix,
      null,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    container[internalContainerInstanceKey] = options2.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMRoot(options2);
  };
  reactDomClient_production.hydrateRoot = function(container, initialChildren, options2) {
    if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
    var isStrictMode = false, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError, formState = null;
    null !== options2 && void 0 !== options2 && (true === options2.unstable_strictMode && (isStrictMode = true), void 0 !== options2.identifierPrefix && (identifierPrefix = options2.identifierPrefix), void 0 !== options2.onUncaughtError && (onUncaughtError = options2.onUncaughtError), void 0 !== options2.onCaughtError && (onCaughtError = options2.onCaughtError), void 0 !== options2.onRecoverableError && (onRecoverableError = options2.onRecoverableError), void 0 !== options2.formState && (formState = options2.formState));
    initialChildren = createFiberRoot(
      container,
      1,
      true,
      initialChildren,
      null != options2 ? options2 : null,
      isStrictMode,
      identifierPrefix,
      formState,
      onUncaughtError,
      onCaughtError,
      onRecoverableError,
      defaultOnDefaultTransitionIndicator
    );
    initialChildren.context = getContextForSubtree(null);
    options2 = initialChildren.current;
    isStrictMode = requestUpdateLane();
    isStrictMode = getBumpedLaneForHydrationByLane(isStrictMode);
    identifierPrefix = createUpdate(isStrictMode);
    identifierPrefix.callback = null;
    enqueueUpdate(options2, identifierPrefix, isStrictMode);
    options2 = isStrictMode;
    initialChildren.current.lanes = options2;
    markRootUpdated$1(initialChildren, options2);
    ensureRootIsScheduled(initialChildren);
    container[internalContainerInstanceKey] = initialChildren.current;
    listenToAllSupportedEvents(container);
    return new ReactDOMHydrationRoot(initialChildren);
  };
  reactDomClient_production.version = "19.3.0";
  return reactDomClient_production;
}
var hasRequiredClient;
function requireClient() {
  if (hasRequiredClient) return client.exports;
  hasRequiredClient = 1;
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
    client.exports = requireReactDomClient_production();
  }
  return client.exports;
}
var clientExports = requireClient();
let engine = null;
function setEngine(e) {
  engine = e;
}
function getEngine() {
  return engine;
}
function simplify(samples, tol) {
  const n = samples.length;
  if (n <= 2) return samples.map((_, i) => i);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1;
    let wi = -1;
    for (let i = a + 1; i < b; i++) {
      const u = (samples[i][0] - samples[a][0]) / Math.max(1e-9, samples[b][0] - samples[a][0]);
      let e = 0;
      for (let k = 1; k < samples[i].length; k++) {
        const lin = samples[a][k] + (samples[b][k] - samples[a][k]) * u;
        e = Math.max(e, Math.abs(samples[i][k] - lin) / tol[k - 1]);
      }
      if (e > worst) {
        worst = e;
        wi = i;
      }
    }
    if (worst > 1) {
      keep[wi] = 1;
      stack.push([a, wi], [wi, b]);
    }
  }
  const out = [];
  keep.forEach((k, i) => k && out.push(i));
  return out;
}
const DEFAULT_TRANSFORM = { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100, anchorX: 0, anchorY: 0 };
function newTrack(kind) {
  return { id: uid("trk"), kind, hidden: false, muted: false, solo: false, locked: false, volume: 0, pan: 0 };
}
function newSequence(name, settings) {
  return {
    id: uid("seq"),
    name,
    settings: { width: 1920, height: 1080, fps: 30, linearBlend: false, background: "#000000", ...settings },
    tracks: [newTrack("video"), newTrack("video"), newTrack("video"), newTrack("audio"), newTrack("audio"), newTrack("audio")],
    clips: [],
    markers: [],
    masterVolume: 0
  };
}
function newDoc() {
  const main = newSequence("Main Sequence");
  return { sequences: [main], mainId: main.id };
}
function findClip$1(seq, id) {
  return seq.clips.find((c) => c.id === id);
}
function makeClip(source, trackId, start, duration, linkId) {
  return {
    id: uid("clip"),
    trackId,
    start,
    in: 0,
    duration,
    speed: 1,
    source,
    transform: { ...DEFAULT_TRANSFORM },
    effects: [],
    masks: [],
    blendMode: "normal",
    volume: 0,
    pan: 0,
    linkId
  };
}
function withLinked(seq, ids, linked = true) {
  if (!linked) return [...new Set(ids)];
  const out = new Set(ids);
  for (const id of ids) {
    const c = findClip$1(seq, id);
    if (c?.linkId) {
      for (const o of seq.clips) if (o.linkId === c.linkId) out.add(o.id);
    }
  }
  return [...out];
}
function clearRange(seq, trackId, start, end, exclude) {
  const eps = 1e-6;
  const toAdd = [];
  seq.clips = seq.clips.filter((c) => {
    if (c.trackId !== trackId || exclude.has(c.id)) return true;
    const cs = c.start;
    const ce = clipEnd(c);
    if (ce <= start + eps || cs >= end - eps) return true;
    if (cs >= start - eps && ce <= end + eps) return false;
    if (cs < start && ce > end) {
      const right = structuredClone(c);
      right.id = uid("clip");
      right.linkId = void 0;
      right.transitionIn = void 0;
      right.in = c.in + (end - cs) * c.speed;
      right.start = end;
      right.duration = ce - end;
      c.transitionOut = void 0;
      toAdd.push(right);
      c.duration = start - cs;
      return true;
    }
    if (cs < start) {
      c.duration = start - cs;
      c.transitionOut = void 0;
      return true;
    }
    const cut = end - cs;
    c.in += cut * c.speed;
    c.start = end;
    c.duration -= cut;
    c.transitionIn = void 0;
    return true;
  });
  seq.clips.push(...toAdd);
}
function ensureTrack(seq, kind, preferId) {
  const pref = preferId && seq.tracks.find((t2) => t2.id === preferId && t2.kind === kind && !t2.locked);
  if (pref) return pref;
  const found = seq.tracks.find((t2) => t2.kind === kind && !t2.locked);
  if (found) return found;
  const t = newTrack(kind);
  seq.tracks.push(t);
  return t;
}
function freeVideoTrack(seq, start, end) {
  const vt = seq.tracks.filter((t2) => t2.kind === "video" && !t2.locked);
  for (const t2 of vt.slice(1).concat(vt.slice(0, 1))) {
    if (!seq.clips.some((c) => c.trackId === t2.id && c.start < end - 1e-6 && clipEnd(c) > start + 1e-6)) return t2;
  }
  const t = newTrack("video");
  const lastVideo = seq.tracks.map((x) => x.kind).lastIndexOf("video");
  seq.tracks.splice(lastVideo + 1, 0, t);
  return t;
}
function topVideoTrack(seq, start, end) {
  const vt = seq.tracks.filter((t2) => t2.kind === "video");
  const top = vt[vt.length - 1];
  if (top && !top.locked && !seq.clips.some((c) => c.trackId === top.id && c.start < end - 1e-6 && clipEnd(c) > start + 1e-6)) return top;
  const t = newTrack("video");
  const lastVideo = seq.tracks.map((x) => x.kind).lastIndexOf("video");
  seq.tracks.splice(lastVideo + 1, 0, t);
  return t;
}
function placeSource(p, seq, source, trackId, start) {
  let hasVideo = true;
  let hasAudio = false;
  let duration = 5;
  if (source.kind === "media") {
    const m = p.media[source.mediaId];
    if (!m) return [];
    hasVideo = m.hasVideo;
    hasAudio = m.hasAudio && m.kind !== "image";
    duration = m.kind === "image" ? 5 : m.duration;
  } else if (source.kind === "sequence") {
    const child = getSeq(p.doc, source.sequenceId);
    if (!child) return [];
    duration = sequenceDuration(child);
    hasAudio = child.clips.some((c) => child.tracks.find((t) => t.id === c.trackId)?.kind === "audio");
    hasVideo = child.clips.some((c) => child.tracks.find((t) => t.id === c.trackId)?.kind === "video") || !hasAudio;
  }
  if (!(duration > 0)) return [];
  const target = trackId ? seq.tracks.find((t) => t.id === trackId) : void 0;
  const ids = [];
  const wantVideo = hasVideo && (!target || target.kind === "video" || !hasAudio);
  const wantAudio = hasAudio;
  const linkId = wantVideo && wantAudio ? uid("link") : void 0;
  if (wantVideo) {
    const vt = ensureTrack(seq, "video", target?.kind === "video" ? target.id : void 0);
    const c = makeClip(source, vt.id, start, duration, linkId);
    clearRange(seq, vt.id, start, start + duration, /* @__PURE__ */ new Set());
    seq.clips.push(c);
    ids.push(c.id);
  }
  if (wantAudio) {
    const at = ensureTrack(seq, "audio", target?.kind === "audio" ? target.id : void 0);
    const c = makeClip(structuredClone(source), at.id, start, duration, linkId);
    clearRange(seq, at.id, start, start + duration, /* @__PURE__ */ new Set());
    seq.clips.push(c);
    ids.push(c.id);
  }
  return ids;
}
const DEFAULT_TEXT = {
  text: "Your title",
  font: "IBM Plex Sans",
  weight: 600,
  italic: false,
  size: 96,
  color: "#ffffff",
  align: "center",
  lineHeight: 1.15,
  tracking: 0,
  strokeColor: "#000000",
  strokeWidth: 0,
  boxColor: "#000000",
  boxOpacity: 0,
  boxPadding: 24,
  boxRadius: 8
};
const DEFAULT_SHAPE = {
  shape: "rectangle",
  width: 600,
  height: 120,
  radius: 12,
  fill: "#7096bc",
  fillOpacity: 100,
  strokeColor: "#ffffff",
  strokeWidth: 0
};
function placeGenerator(seq, source, start, duration = 5) {
  const t = source.kind === "adjustment" ? topVideoTrack(seq, start, start + duration) : freeVideoTrack(seq, start, start + duration);
  const c = makeClip(source, t.id, start, duration);
  if (source.kind === "text") c.transform.y = seq.settings.height * 0.3;
  seq.clips.push(c);
  return c.id;
}
function splitClips(seq, ids, t, linked = true) {
  const eps = 1 / 1e3;
  const linkMap = /* @__PURE__ */ new Map();
  const created = [];
  for (const id of withLinked(seq, ids, linked)) {
    const c = findClip$1(seq, id);
    if (!c || t <= c.start + eps || t >= clipEnd(c) - eps) continue;
    const right = structuredClone(c);
    right.id = uid("clip");
    if (c.linkId) {
      const partnerSplit = withLinked(seq, ids, linked).some((o) => o !== id && findClip$1(seq, o)?.linkId === c.linkId);
      if (!linkMap.has(c.linkId)) linkMap.set(c.linkId, uid("link"));
      right.linkId = partnerSplit ? linkMap.get(c.linkId) : void 0;
    }
    right.effects = c.effects.map((e) => ({ ...structuredClone(e), id: uid("fx") }));
    right.masks = c.masks.map((m) => ({ ...structuredClone(m), id: uid("mask") }));
    right.in = c.in + (t - c.start) * c.speed;
    right.start = t;
    right.duration = clipEnd(c) - t;
    right.transitionIn = void 0;
    c.duration = t - c.start;
    c.transitionOut = void 0;
    seq.clips.push(right);
    created.push(right.id);
  }
  return created;
}
function deleteClips(seq, ids, ripple, linked = true) {
  const all = new Set(withLinked(seq, ids, linked));
  const removed = seq.clips.filter((c) => all.has(c.id));
  seq.clips = seq.clips.filter((c) => !all.has(c.id));
  if (!ripple) return;
  for (const r of [...removed].sort((a, b) => b.start - a.start)) {
    for (const c of seq.clips) {
      if (c.trackId === r.trackId && c.start >= clipEnd(r) - 1e-6) c.start -= r.duration;
    }
  }
}
function setClipSpeed(p, seq, id, speed, ripple) {
  const c = findClip$1(seq, id);
  if (!c || speed <= 0) return;
  const srcLen = c.duration * c.speed;
  const maxSrc = sourceDuration(p, c) - c.in;
  const newDur = Math.min(srcLen, maxSrc) / speed;
  const delta = newDur - c.duration;
  const oldEnd = clipEnd(c);
  c.speed = speed;
  c.duration = newDur;
  if (ripple && delta !== 0) {
    for (const o of seq.clips) if (o.id !== c.id && o.trackId === c.trackId && o.start >= oldEnd - 1e-6) o.start += delta;
  } else if (delta > 0) {
    clearRange(seq, c.trackId, oldEnd, clipEnd(c), /* @__PURE__ */ new Set([c.id]));
  }
}
function applyTransition(seq, clipId, edge, type, duration, opts = {}) {
  const c = findClip$1(seq, clipId);
  if (!c) return;
  const isAudioTrack = seq.tracks.find((t) => t.id === c.trackId)?.kind === "audio";
  const def = transitionDef(type);
  if (def.audio !== isAudioTrack) return;
  const apply = (clip, e, t) => {
    if (e === "out") {
      const nx = nextClip(seq, clip);
      if (nx) return apply(nx, "in", t);
    }
    const partner = e === "in" ? prevClip(seq, clip) : void 0;
    let d = Math.min(duration, clip.duration);
    if (partner) d = Math.min(duration, clip.duration, partner.duration);
    const tr = createTransition(t, Math.max(1 / 30, d), { align: opts.align, ease: opts.ease });
    if (e === "in") clip.transitionIn = tr;
    else clip.transitionOut = tr;
  };
  apply(c, edge, type);
  if (!isAudioTrack && c.linkId && opts.linked !== false) {
    for (const o of seq.clips) {
      if (o.linkId !== c.linkId || o.id === c.id) continue;
      if (seq.tracks.find((t) => t.id === o.trackId)?.kind === "audio") apply(o, edge, "crossfade");
    }
  }
}
function setLinked(seq, ids, link) {
  const clips = seq.clips.filter((c) => ids.includes(c.id));
  if (link) {
    const id = uid("link");
    for (const c of clips) c.linkId = id;
  } else {
    const groups = new Set(clips.map((c) => c.linkId).filter(Boolean));
    for (const c of seq.clips) if (c.linkId && groups.has(c.linkId)) c.linkId = void 0;
  }
}
function removeTransition(seq, clipId, edge) {
  const c = findClip$1(seq, clipId);
  if (!c) return;
  if (edge === "in") c.transitionIn = void 0;
  else c.transitionOut = void 0;
}
function nestClips(doc, seqId, ids, name) {
  const seq = getSeq(doc, seqId);
  if (!seq) return null;
  const all = withLinked(seq, ids);
  const clips = seq.clips.filter((c) => all.includes(c.id));
  if (!clips.length) return null;
  const start = Math.min(...clips.map((c) => c.start));
  const end = Math.max(...clips.map(clipEnd));
  const child = newSequence(name, { ...seq.settings });
  child.tracks = [];
  const trackMap = /* @__PURE__ */ new Map();
  for (const t of seq.tracks) {
    if (!clips.some((c) => c.trackId === t.id)) continue;
    const nt = { ...t, id: uid("trk"), locked: false, hidden: false, muted: false, solo: false };
    child.tracks.push(nt);
    trackMap.set(t.id, nt.id);
  }
  if (!child.tracks.some((t) => t.kind === "video")) child.tracks.unshift(newTrack("video"));
  if (!child.tracks.some((t) => t.kind === "audio")) child.tracks.push(newTrack("audio"));
  child.tracks.sort((a, b) => a.kind === b.kind ? 0 : a.kind === "video" ? -1 : 1);
  for (const c of clips) {
    const nc = structuredClone(c);
    nc.trackId = trackMap.get(c.trackId);
    nc.start -= start;
    child.clips.push(nc);
  }
  doc.sequences.push(child);
  seq.clips = seq.clips.filter((c) => !all.includes(c.id));
  const hasV = clips.some((c) => seq.tracks.find((t) => t.id === c.trackId)?.kind === "video");
  const hasA = clips.some((c) => seq.tracks.find((t) => t.id === c.trackId)?.kind === "audio");
  const linkId = hasV && hasA ? uid("link") : void 0;
  const vt = clips.map((c) => seq.tracks.find((t) => t.id === c.trackId)).filter((t) => t.kind === "video");
  const at = clips.map((c) => seq.tracks.find((t) => t.id === c.trackId)).filter((t) => t.kind === "audio");
  const lowest = (list) => list.sort((a, b) => seq.tracks.indexOf(a) - seq.tracks.indexOf(b))[0];
  if (hasV) seq.clips.push(makeClip({ kind: "sequence", sequenceId: child.id }, lowest(vt).id, start, end - start, linkId));
  if (hasA) seq.clips.push(makeClip({ kind: "sequence", sequenceId: child.id }, lowest(at).id, start, end - start, linkId));
  return child.id;
}
function rectMask(name, u0 = 0.25, v0 = 0.25, u1 = 0.75, v1 = 0.75) {
  const pt = (x, y) => [x, y, 0, 0, 0, 0];
  return { id: uid("mask"), name, enabled: true, mode: "add", inverted: false, closed: true, path: [...pt(u0, v0), ...pt(u1, v0), ...pt(u1, v1), ...pt(u0, v1)], feather: 0, expansion: 0, opacity: 100 };
}
function ellipseMask(name, cu = 0.5, cv = 0.5, ru = 0.25, rv = 0.25) {
  const k = 0.5523;
  const p = [cu, cv - rv, -ru * k, 0, ru * k, 0, cu + ru, cv, 0, -rv * k, 0, rv * k, cu, cv + rv, ru * k, 0, -ru * k, 0, cu - ru, cv, 0, rv * k, 0, -rv * k];
  return { id: uid("mask"), name, enabled: true, mode: "add", inverted: false, closed: true, path: p, feather: 0, expansion: 0, opacity: 100 };
}
function clipHasKeys(c) {
  const vals = [...Object.values(c.transform), c.volume, c.pan, ...c.effects.flatMap((e) => Object.values(e.params)), ...c.masks.flatMap((m) => [m.path, m.feather, m.expansion, m.opacity])];
  return vals.some((v) => isAnim(v));
}
function valueAt(v, t) {
  return evalNum(v, t);
}
function mediaOf(p, c) {
  return c.source.kind === "media" ? p.media[c.source.mediaId] : void 0;
}
const ops = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  DEFAULT_SHAPE,
  DEFAULT_TEXT,
  DEFAULT_TRANSFORM,
  applyTransition,
  clearRange,
  clipHasKeys,
  deleteClips,
  ellipseMask,
  ensureTrack,
  findClip: findClip$1,
  freeVideoTrack,
  makeClip,
  mediaOf,
  nestClips,
  newDoc,
  newSequence,
  newTrack,
  placeGenerator,
  placeSource,
  rectMask,
  removeTransition,
  setClipSpeed,
  setLinked,
  splitClips,
  topVideoTrack,
  valueAt,
  withLinked
}, Symbol.toStringTag, { value: "Module" }));
const createStoreImpl = (createState) => {
  let state;
  const listeners = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState = () => initialState;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const api = { setState, getState, getInitialState, subscribe };
  const initialState = state = createState(setState, getState, api);
  return api;
};
const createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
const identity = (arg) => arg;
function useStore$1(api, selector = identity) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  React.useDebugValue(slice);
  return slice;
}
const createImpl = (createState) => {
  const api = createStore(createState);
  const useBoundStore = (selector) => useStore$1(api, selector);
  Object.assign(useBoundStore, api);
  return useBoundStore;
};
const create = ((createState) => createState ? createImpl(createState) : createImpl);
function getParam(c, path) {
  const [head, a, b] = path.split(".");
  if (head === "transform") return c.transform[a];
  if (head === "effects") {
    const v = c.effects.find((e) => e.id === a)?.params[b];
    return typeof v === "number" || typeof v === "object" && v !== null ? v : void 0;
  }
  if (head === "masks") {
    const m = c.masks.find((x) => x.id === a);
    if (!m) return void 0;
    return m[b];
  }
  if (head === "volume") return c.volume;
  if (head === "pan") return c.pan;
  if (head === "remap") return c.remap;
  if (head === "shape" && c.source.kind === "shape") return c.source.props[a];
  if (head === "gen" && c.source.kind === "generator") {
    const v = c.source.params[a];
    return typeof v === "number" || typeof v === "object" && v !== null ? v : void 0;
  }
  return void 0;
}
function setParam(c, path, v) {
  const [head, a, b] = path.split(".");
  if (head === "transform") c.transform[a] = v;
  else if (head === "effects") {
    const e = c.effects.find((x) => x.id === a);
    if (e) e.params[b] = v;
  } else if (head === "masks") {
    const m = c.masks.find((x) => x.id === a);
    if (m) m[b] = v;
  } else if (head === "volume") c.volume = v;
  else if (head === "pan") c.pan = v;
  else if (head === "remap") c.remap = v;
  else if (head === "shape" && c.source.kind === "shape") c.source.props[a] = v;
  else if (head === "gen" && c.source.kind === "generator") c.source.params[a] = v;
}
const TRANSFORM_LABELS = {
  x: "Position X",
  y: "Position Y",
  scale: "Scale",
  scaleY: "Scale height",
  rotation: "Rotation",
  opacity: "Opacity",
  anchorX: "Anchor X",
  anchorY: "Anchor Y"
};
function paramLabel(c, path) {
  const [head, a, b] = path.split(".");
  if (head === "transform") return TRANSFORM_LABELS[a] ?? a;
  if (head === "effects") {
    const e = c.effects.find((x) => x.id === a);
    if (!e) return path;
    const d = effectDef(e.type);
    return `${d.name} · ${d.params.find((p) => p.key === b)?.label ?? b}`;
  }
  if (head === "masks") {
    const m = c.masks.find((x) => x.id === a);
    return `${m?.name ?? "Mask"} · ${b === "path" ? "Path" : b[0].toUpperCase() + b.slice(1)}`;
  }
  if (head === "volume") return "Volume";
  if (head === "pan") return "Pan";
  if (head === "remap") return "Time remap · Speed";
  if (head === "shape") return `Shape · ${a}`;
  if (head === "gen" && c.source.kind === "generator") {
    try {
      const d = generatorDef(c.source.gen);
      return `${d.name} · ${d.params.find((p) => p.key === a)?.label ?? a}`;
    } catch {
      return a;
    }
  }
  return path;
}
function numericParamPaths(c, isAudio) {
  const fx2 = c.effects.flatMap((e) => effectDef(e.type).params.filter((p) => p.kind === "number").map((p) => `effects.${e.id}.${p.key}`));
  const out = ["transform.x", "transform.y", "transform.scale", "transform.rotation", "transform.opacity", "transform.anchorX", "transform.anchorY"];
  if (c.remap !== void 0) out.push("remap");
  if (c.source.kind === "shape") out.push("shape.width", "shape.height", "shape.radius");
  if (c.source.kind === "generator") {
    try {
      for (const p of generatorDef(c.source.gen).params) if (p.kind === "number") out.push(`gen.${p.key}`);
    } catch {
    }
  }
  out.push(...fx2);
  for (const m of c.masks) out.push(`masks.${m.id}.path`, `masks.${m.id}.feather`, `masks.${m.id}.expansion`, `masks.${m.id}.opacity`);
  return out;
}
function paramRange(c, path) {
  const [head, a, b] = path.split(".");
  if (head === "effects") {
    const e = c.effects.find((x) => x.id === a);
    const p = e ? effectDef(e.type).params.find((x) => x.key === b) : void 0;
    return p && p.kind === "number" ? [p.min, p.max] : null;
  }
  if (head === "transform") {
    if (a === "opacity") return [0, 100];
    if (a === "scale" || a === "scaleY") return [0, 400];
    if (a === "rotation") return [-360, 360];
  }
  if (head === "volume") return [-60, 12];
  if (head === "pan") return [-100, 100];
  if (head === "remap") return [-400, 1e3];
  if (head === "gen" && c.source.kind === "generator") {
    try {
      const p = generatorDef(c.source.gen).params.find((x) => x.key === a);
      return p && p.kind === "number" ? [p.min, p.max] : null;
    } catch {
      return null;
    }
  }
  return null;
}
const initialDoc = newDoc();
const DEFAULTS_KEY = "cuttingfloor.transitionDefaults";
function loadTransitionDefaults() {
  const base = { duration: 1, align: "center", ease: "linear" };
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DEFAULTS_KEY) : null;
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch {
    return base;
  }
}
const useStore = create(() => ({
  caps: null,
  projectPath: null,
  projectName: "Untitled",
  dirty: false,
  media: {},
  mediaOrder: [],
  peaks: {},
  luts: {},
  fonts: [],
  doc: initialDoc,
  past: [],
  future: [],
  activeSeqId: initialDoc.mainId,
  openSeqIds: [initialDoc.mainId],
  seqTimes: {},
  selection: [],
  selectedTransition: null,
  activeParam: null,
  maskEdit: null,
  tool: "select",
  time: 0,
  playing: false,
  zoom: 60,
  previewScale: 0.5,
  safeGuides: false,
  showMatte: false,
  eyedropper: null,
  workspace: "edit",
  snapping: true,
  linkedSelection: true,
  transitionDefaults: loadTransitionDefaults(),
  binTab: "media",
  effectClipboard: null,
  clipClipboard: null,
  presets: [],
  trackerEdit: null,
  analysis: {},
  exportOpen: false,
  sequenceOpen: false,
  speedOpen: false,
  exportProgress: null,
  toasts: []
}));
const get$1 = useStore.getState;
const set$1 = useStore.setState;
function project(s = get$1()) {
  return { doc: s.doc, media: s.media };
}
function activeSeq(s = get$1()) {
  return getSeq(s.doc, s.activeSeqId) ?? s.doc.sequences[0];
}
function toast(text, tone = "info") {
  const t = { id: uid("t"), text, tone };
  set$1({ toasts: [...get$1().toasts.slice(-3), t] });
  setTimeout(() => set$1({ toasts: get$1().toasts.filter((x) => x.id !== t.id) }), tone === "error" ? 7e3 : 3500);
}
let txBase = null;
function markDirty(d) {
  if (get$1().dirty !== d) {
    set$1({ dirty: d });
    window.cuttingfloor?.setDirty(d);
  }
}
function beginTx() {
  if (!txBase) txBase = get$1().doc;
}
function liveUpdate(fn) {
  const d = structuredClone(get$1().doc);
  fn(d);
  set$1({ doc: d });
}
function endTx() {
  const base = txBase;
  txBase = null;
  if (!base || base === get$1().doc) return;
  set$1({ past: [...get$1().past.slice(-199), base], future: [] });
  markDirty(true);
}
function commit(fn) {
  beginTx();
  liveUpdate(fn);
  endTx();
}
function commitSeq(fn, live = false) {
  const id = get$1().activeSeqId;
  const apply = (d) => {
    const s = getSeq(d, id);
    if (s) fn(s, d);
  };
  if (live) liveUpdate(apply);
  else commit(apply);
}
function sanitizeSelection() {
  const s = get$1();
  const seq = activeSeq(s);
  set$1({ selection: s.selection.filter((id) => seq.clips.some((c) => c.id === id)) });
}
function undo() {
  const { past, doc, future } = get$1();
  const prev = past[past.length - 1];
  if (!prev) return;
  set$1({ doc: prev, past: past.slice(0, -1), future: [doc, ...future] });
  if (!getSeq(prev, get$1().activeSeqId)) set$1({ activeSeqId: prev.mainId, openSeqIds: [prev.mainId] });
  sanitizeSelection();
  markDirty(true);
}
function redo() {
  const { past, doc, future } = get$1();
  const next = future[0];
  if (!next) return;
  set$1({ doc: next, past: [...past, doc], future: future.slice(1) });
  sanitizeSelection();
  markDirty(true);
}
function findClip(seq, id) {
  return seq.clips.find((c) => c.id === id);
}
function trackOf(seq, clip) {
  return trackOf$1(seq, clip);
}
function mediaDuration(p, c) {
  const s = c.source;
  if (s.kind === "media") {
    const m = p.media[s.mediaId];
    return !m ? 0 : m.kind === "image" ? Infinity : m.duration;
  }
  if (s.kind === "sequence") {
    const child = getSeq(p.doc, s.sequenceId);
    return child ? sequenceDuration(child) : 0;
  }
  return Infinity;
}
function primarySelection(s) {
  const seq = activeSeq(s);
  const clips = s.selection.map((id) => findClip(seq, id)).filter(Boolean);
  return clips.find((c) => trackOf(seq, c)?.kind === "video") ?? clips[0];
}
function clipLocalTime(c, t = get$1().time) {
  const tt = Math.max(c.start, Math.min(clipEnd(c) - 1e-6, t));
  return sourceTime(c, tt);
}
function setTime(t) {
  const max = Math.max(0, sequenceDuration(activeSeq()));
  set$1({ time: Math.max(0, Math.min(t, max)) });
}
function stepFrames(n) {
  const fps = activeSeq().settings.fps;
  set$1({ playing: false });
  setTime(Math.round(get$1().time * fps + n) / fps);
}
function togglePlay() {
  const s = get$1();
  const seq = activeSeq(s);
  const end = seq.outPoint ?? sequenceDuration(seq);
  if (!s.playing && s.time >= end - 1e-3) set$1({ time: seq.inPoint ?? 0 });
  set$1({ playing: !s.playing });
}
function select(ids, additive = false) {
  const linked = withLinked(activeSeq(), ids, get$1().linkedSelection);
  if (additive) set$1({ selection: [.../* @__PURE__ */ new Set([...get$1().selection, ...linked])], selectedTransition: null });
  else set$1({ selection: linked, selectedTransition: null });
}
function openSequence(id) {
  const s = get$1();
  if (!getSeq(s.doc, id)) return;
  const seqTimes = { ...s.seqTimes, [s.activeSeqId]: s.time };
  set$1({
    activeSeqId: id,
    openSeqIds: s.openSeqIds.includes(id) ? s.openSeqIds : [...s.openSeqIds, id],
    seqTimes,
    time: seqTimes[id] ?? 0,
    selection: [],
    selectedTransition: null,
    playing: false,
    maskEdit: null
  });
}
function closeSequenceTab(id) {
  const s = get$1();
  if (s.openSeqIds.length <= 1) return;
  const open = s.openSeqIds.filter((x) => x !== id);
  set$1({ openSeqIds: open });
  if (s.activeSeqId === id) openSequence(open[open.length - 1]);
}
function newSequenceAction(name) {
  const base = activeSeq();
  const n = name ?? `Composition ${get$1().doc.sequences.length}`;
  const seq = newSequence(n, { ...base.settings });
  commit((d) => {
    d.sequences.push(seq);
  });
  openSequence(seq.id);
}
function renameSequence(id, name) {
  commit((d) => {
    const s = getSeq(d, id);
    if (s) s.name = name;
  });
}
function deleteSequence(id) {
  const s = get$1();
  if (id === s.doc.mainId) return toast("The main sequence cannot be deleted.", "error");
  const used = s.doc.sequences.some((q) => q.clips.some((c) => c.source.kind === "sequence" && c.source.sequenceId === id));
  if (used) return toast("That sequence is used in another sequence. Remove those clips first.", "error");
  closeSequenceTab(id);
  commit((d) => {
    d.sequences = d.sequences.filter((q) => q.id !== id);
  });
}
function setSequenceSettings(settings) {
  commitSeq((s) => {
    s.settings = { ...settings, fps: snapFps(settings.fps) };
  });
}
function splitAtPlayhead(allTracks = false) {
  const s = get$1();
  const seq = activeSeq(s);
  const t = s.time;
  let ids = allTracks ? [] : s.selection.filter((id) => {
    const c = findClip(seq, id);
    return c && t > c.start && t < clipEnd(c);
  });
  if (ids.length === 0) {
    const locked = new Set(seq.tracks.filter((tr) => tr.locked).map((tr) => tr.id));
    ids = seq.clips.filter((c) => !locked.has(c.trackId) && t > c.start && t < clipEnd(c)).map((c) => c.id);
  }
  const linked = get$1().linkedSelection;
  if (ids.length) commitSeq((q) => void splitClips(q, ids, t, linked));
}
function deleteSelection(ripple) {
  const s = get$1();
  if (s.selectedTransition) {
    const { clipId, edge } = s.selectedTransition;
    commitSeq((q) => removeTransition(q, clipId, edge));
    set$1({ selectedTransition: null });
    return;
  }
  if (!s.selection.length) return;
  const seq = activeSeq(s);
  const locked = new Set(seq.tracks.filter((t) => t.locked).map((t) => t.id));
  const ids = s.selection.filter((id) => {
    const c = findClip(seq, id);
    return c && !locked.has(c.trackId);
  });
  const linked = s.linkedSelection;
  commitSeq((q) => deleteClips(q, ids, ripple, linked));
  set$1({ selection: [] });
}
function updateClip(id, fn, live = false) {
  commitSeq((q) => {
    const c = findClip(q, id);
    if (c) fn(c);
  }, live);
}
function toggleClipEnabled() {
  const ids = get$1().selection;
  if (!ids.length) return;
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (c) c.disabled = !c.disabled;
    }
  });
}
function setSpeed(id, speed, ripple) {
  const p = project();
  commitSeq((q) => setClipSpeed({ doc: p.doc, media: p.media }, q, id, speed, ripple));
}
function nestSelection() {
  const s = get$1();
  if (!s.selection.length) return;
  const name = `Nested ${s.doc.sequences.length}`;
  let newId = null;
  commit((d) => {
    newId = nestClips(d, s.activeSeqId, s.selection, name);
  });
  if (newId) {
    set$1({ selection: [] });
    toast(`Nested into "${name}". Double-click it to open.`, "success");
  }
}
function addEffect(clipId, type, index) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c || !isEffectType(type)) return;
  const def = effectDef(type);
  const kind = trackOf(seq, c)?.kind;
  if (kind !== def.kind) {
    toast(def.kind === "video" ? "Video effects go on clips on video tracks." : "Audio effects go on clips on audio tracks (or on a track in the Audio workspace).", "error");
    return;
  }
  if ((type === "stabilizer" || type === "posterizeTime") && c.effects.some((e) => e.type === type)) {
    toast(`${def.name} is already on this clip.`);
    return;
  }
  const fx2 = createEffect(type);
  updateClip(clipId, (cl) => {
    const i = index === void 0 ? cl.effects.length : Math.max(0, Math.min(cl.effects.length, index));
    cl.effects.splice(i, 0, fx2);
  });
  select([clipId]);
}
function updateEffect(clipId, effectId, fn, live = false) {
  updateClip(
    clipId,
    (c) => {
      const e = c.effects.find((x) => x.id === effectId);
      if (e) fn(e);
    },
    live
  );
}
function removeEffect(clipId, effectId) {
  updateClip(clipId, (c) => {
    c.effects = c.effects.filter((e) => e.id !== effectId);
  });
  if (get$1().eyedropper?.effectId === effectId) set$1({ eyedropper: null });
}
function ensureLumetri(clipId) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return null;
  const existing = c.effects.find((e) => e.type === "lumetri");
  if (existing) return existing.id;
  addEffect(clipId, "lumetri");
  return findClip(activeSeq(), clipId)?.effects.find((e) => e.type === "lumetri")?.id ?? null;
}
function setParamValue(clipId, path, v, live = false) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c) return;
  const t = clipLocalTime(c);
  updateClip(
    clipId,
    (cl) => {
      const cur = getParam(cl, path);
      setParam(cl, path, writeNum(cur ?? 0, t, v));
    },
    live
  );
}
function setMaskPath(clipId, maskId, p, live = false) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return;
  const t = clipLocalTime(c);
  updateClip(
    clipId,
    (cl) => {
      const m = cl.masks.find((x) => x.id === maskId);
      if (m) m.path = writePath(m.path, t, p);
    },
    live
  );
}
function toggleStopwatch(clipId, path) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return;
  const t = clipLocalTime(c);
  updateClip(clipId, (cl) => {
    const cur = getParam(cl, path);
    if (cur === void 0) return;
    if (path.endsWith(".path") && path.startsWith("masks.")) {
      const pv = cur;
      setParam(cl, path, isAnim(pv) ? evalPath(pv, t) : { k: [{ t, v: pv, interp: "linear", in: [...EASE_IN], out: [...EASE_OUT] }] });
    } else setParam(cl, path, toggleAnimated(cur, t));
  });
}
function toggleKeyAtPlayhead(clipId, path) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return;
  const t = clipLocalTime(c);
  updateClip(clipId, (cl) => {
    const cur = getParam(cl, path);
    if (!isAnim(cur)) return;
    const a = cur;
    if (keyIndexAt(a, t) >= 0) setParam(cl, path, removeKeyAt(a, t));
    else if (path.endsWith(".path")) setParam(cl, path, setKey(a, t, evalPath(a, t)));
    else setParam(cl, path, setKey(a, t, evalNum(a, t)));
  });
}
function jumpKey(clipId, path, dir) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c) return;
  const t = clipLocalTime(c);
  const values = path ? [getParam(c, path)] : [...Object.values(c.transform), c.volume, c.pan, c.remap, ...c.source.kind === "generator" ? Object.values(c.source.params) : [], ...c.effects.flatMap((e) => Object.values(e.params)), ...c.masks.flatMap((m) => [m.path, m.feather, m.expansion, m.opacity])];
  const times = values.flatMap((v) => isAnim(v) ? v.k.map((k) => k.t) : []).sort((a, b) => a - b);
  const target = dir > 0 ? times.find((x) => x > t + 1e-4) : [...times].reverse().find((x) => x < t - 1e-4);
  if (target === void 0) return;
  set$1({ playing: false });
  setTime(c.start + (target - c.in) / c.speed);
}
function editKeys(clipId, path, fn, live = false) {
  updateClip(
    clipId,
    (cl) => {
      const cur = getParam(cl, path);
      if (!isAnim(cur)) return;
      const a = { k: cur.k.map((k) => ({ ...k, in: [...k.in], out: [...k.out] })) };
      fn(a.k);
      a.k.sort((x, y) => x.t - y.t);
      setParam(cl, path, a);
    },
    live
  );
}
function applyTransitionAction(clipId, edge, type, duration) {
  const s = get$1();
  const d = s.transitionDefaults;
  commitSeq((q) => applyTransition(q, clipId, edge, type, duration ?? d.duration, { linked: s.linkedSelection, align: d.align, ease: d.ease }));
  set$1({ selectedTransition: { clipId, edge }, selection: [] });
}
function setTransitionDefaults(patch) {
  const next = { ...get$1().transitionDefaults, ...patch };
  set$1({ transitionDefaults: next });
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(next));
  } catch {
  }
}
function toggleLinkedSelection() {
  const on = !get$1().linkedSelection;
  set$1({ linkedSelection: on });
  toast(on ? "Linked selection on: audio and video move together" : "Linked selection off: audio and video move independently");
}
function linkSelection(link) {
  const ids = get$1().selection;
  if (!ids.length) return;
  if (link) {
    const seq = activeSeq();
    const kinds = new Set(ids.map((id) => trackOf(seq, findClip(seq, id))?.kind));
    if (!(kinds.has("video") && kinds.has("audio"))) return toast("Select at least one video clip and one audio clip to link.", "error");
  }
  commitSeq((q) => setLinked(q, ids, link));
  toast(link ? "Clips linked" : "Clips unlinked");
}
function updateTransition(clipId, edge, fn, live = false) {
  updateClip(
    clipId,
    (c) => {
      const tr = edge === "in" ? c.transitionIn : c.transitionOut;
      if (tr) fn(tr);
    },
    live
  );
}
function addMask(clipId, shape) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return;
  const name = `Mask ${c.masks.length + 1}`;
  const m = shape === "rect" ? rectMask(name) : ellipseMask(name);
  updateClip(clipId, (cl) => cl.masks.push(m));
  set$1({ maskEdit: { clipId, maskId: m.id } });
}
function updateMask(clipId, maskId, fn, live = false) {
  updateClip(
    clipId,
    (c) => {
      const m = c.masks.find((x) => x.id === maskId);
      if (m) fn(m);
    },
    live
  );
}
function removeMask(clipId, maskId) {
  updateClip(clipId, (c) => {
    c.masks = c.masks.filter((m) => m.id !== maskId);
  });
  if (get$1().maskEdit?.maskId === maskId) set$1({ maskEdit: null });
}
function addGenerator(kind, gen = "linearGradient") {
  const t = get$1().time;
  const source = kind === "text" ? { kind: "text", props: { ...DEFAULT_TEXT } } : kind === "shape" ? { kind: "shape", props: { ...DEFAULT_SHAPE } } : kind === "adjustment" ? { kind: "adjustment" } : kind === "generator" ? { kind: "generator", gen, params: createGeneratorParams(gen) } : { kind: "solid", color: "#1f2937" };
  let id = "";
  commitSeq((q) => {
    id = placeGenerator(q, source, t);
  });
  if (id) select([id]);
}
function addTrack(kind) {
  commitSeq((q) => {
    const t = newTrack(kind);
    if (kind === "video") q.tracks.splice(q.tracks.map((x) => x.kind).lastIndexOf("video") + 1, 0, t);
    else q.tracks.push(t);
  });
}
function updateTrack(id, fn, live = false) {
  commitSeq((q) => {
    const t = q.tracks.find((x) => x.id === id);
    if (t) fn(t);
  }, live);
}
function deleteTrack(id) {
  const seq = activeSeq();
  const t = seq.tracks.find((x) => x.id === id);
  if (!t) return;
  if (seq.clips.some((c) => c.trackId === id)) return toast("Only empty tracks can be deleted.", "error");
  if (seq.tracks.filter((x) => x.kind === t.kind).length <= 1) return toast(`A sequence needs at least one ${t.kind} track.`, "error");
  commitSeq((q) => {
    q.tracks = q.tracks.filter((x) => x.id !== id);
  });
}
function addMarker() {
  const t = get$1().time;
  commitSeq((q) => {
    q.markers.push({ id: uid("mk"), t, name: `Marker ${q.markers.length + 1}`, color: "#5aa9ff" });
    q.markers.sort((a, b) => a.t - b.t);
  });
}
function removeMarker(id) {
  commitSeq((q) => {
    q.markers = q.markers.filter((m) => m.id !== id);
  });
}
function setInOut(which) {
  const t = get$1().time;
  commitSeq((q) => {
    if (which === "clear") {
      q.inPoint = void 0;
      q.outPoint = void 0;
    } else if (which === "in") {
      q.inPoint = t;
      if (q.outPoint !== void 0 && q.outPoint <= t) q.outPoint = void 0;
    } else {
      q.outPoint = t;
      if (q.inPoint !== void 0 && q.inPoint >= t) q.inPoint = void 0;
    }
  });
}
function applyProxyEvent(ev) {
  const media = { ...get$1().media };
  let changed = false;
  for (const id of Object.keys(media)) {
    if (media[id].path !== ev.path) continue;
    media[id] = { ...media[id], proxyStatus: ev.status, proxyProgress: ev.progress, proxyPath: ev.proxyPath ?? media[id].proxyPath, proxyError: ev.error };
    changed = true;
  }
  if (changed) set$1({ media });
  if (ev.status === "error") toast(`Proxy failed for ${ev.path.split("/").pop()}: ${ev.error ?? "unknown error"}`, "error");
}
function initMediaEvents() {
  return window.cuttingfloor.onProxyEvent(applyProxyEvent);
}
async function finishMediaSetup(item) {
  const api = window.cuttingfloor;
  const [thumb, proxy] = await Promise.all([api.thumbnail(item).catch(() => null), api.requestProxy(item).catch(() => null)]);
  const cur = get$1().media[item.id];
  if (!cur) return;
  const next = { ...cur, thumbUrl: thumb ? mediaUrl(thumb) : void 0 };
  if (proxy) {
    next.proxyStatus = proxy.status;
    next.proxyProgress = proxy.progress;
    next.proxyPath = proxy.proxyPath;
  }
  set$1({ media: { ...get$1().media, [item.id]: next } });
  if (item.hasAudio) {
    const p = await api.peaks(item.path).catch(() => null);
    if (p) set$1({ peaks: { ...get$1().peaks, [item.id]: p } });
  }
}
function registerMedia(info, id = uid("m"), offline = false) {
  const item = { ...info, id, proxyStatus: info.kind === "video" ? "queued" : "notNeeded", proxyProgress: 0, offline };
  set$1({ media: { ...get$1().media, [id]: item }, mediaOrder: [...get$1().mediaOrder, id] });
  if (!offline) void finishMediaSetup(item);
  return item;
}
async function importPaths(paths) {
  const out = [];
  for (const p of paths) {
    const existing = Object.values(get$1().media).find((m) => m.path === p);
    if (existing) {
      out.push(existing);
      continue;
    }
    try {
      const info = await window.cuttingfloor.probe(p);
      out.push(registerMedia(info));
    } catch (e) {
      toast(e.message, "error");
    }
  }
  if (out.length) markDirty(true);
  return out;
}
async function importDialog() {
  const paths = await window.cuttingfloor.importDialog();
  if (paths.length) await importPaths(paths);
}
function mediaUrl(path) {
  return `media://local/${encodeURIComponent(path)}`;
}
function addSourceToTimeline(source, trackId, start) {
  const s = get$1();
  const seq = activeSeq(s);
  if (source.kind === "sequence") {
    if (containsSequence(s.doc, source.sequenceId, seq.id)) {
      toast("A sequence can't contain itself.", "error");
      return;
    }
  }
  if (source.kind === "media") {
    const m = s.media[source.mediaId];
    if (!m) return;
    if (seq.clips.length === 0 && m.kind === "video" && m.width > 0) {
      const next = { ...seq.settings, width: m.width, height: m.height, fps: snapFps(m.fps) };
      const cur = seq.settings;
      if (next.width !== cur.width || next.height !== cur.height || Math.abs(next.fps - cur.fps) > 1e-3) {
        commitSeq((q) => q.settings = next);
        toast(`Sequence set to match ${m.name}: ${next.width}×${next.height}`, "info");
      }
    }
  }
  let ids = [];
  const p = project();
  commitSeq((q, d) => {
    ids = placeSource({ doc: d, media: p.media }, q, source, trackId, Math.max(0, start));
  });
  if (ids.length) set$1({ selection: ids, selectedTransition: null });
}
async function loadLut(path) {
  if (!path || get$1().luts[path]) return;
  try {
    const text = await window.cuttingfloor.readText(path);
    set$1({ luts: { ...get$1().luts, [path]: text } });
  } catch (e) {
    toast(`Could not read LUT: ${e.message}`, "error");
  }
}
async function loadFonts() {
  try {
    const fonts = await window.cuttingfloor.fonts();
    set$1({ fonts });
  } catch {
  }
}
function resetForDoc(doc, extra = {}) {
  set$1({
    media: {},
    mediaOrder: [],
    peaks: {},
    doc,
    past: [],
    future: [],
    activeSeqId: doc.mainId,
    openSeqIds: [doc.mainId],
    seqTimes: {},
    selection: [],
    selectedTransition: null,
    activeParam: null,
    maskEdit: null,
    time: 0,
    playing: false,
    ...extra
  });
}
function newProject() {
  if (get$1().dirty && !confirm("Discard unsaved changes?")) return;
  resetForDoc(newDoc(), { projectPath: null, projectName: "Untitled" });
  markDirty(false);
}
function serialize() {
  const s = get$1();
  const media = s.mediaOrder.map((id) => {
    const m = s.media[id];
    const { thumbUrl: _t, proxyPath: _p, proxyStatus: _s, proxyProgress: _pp, proxyError: _e, offline: _o, ...info } = m;
    return info;
  });
  const file = { app: "cuttingfloor", version: 3, doc: s.doc, media };
  return JSON.stringify(file);
}
async function saveProject(saveAs = false) {
  const s = get$1();
  let path = s.projectPath;
  if (!path || saveAs) {
    path = await window.cuttingfloor.saveProjectDialog(s.projectName);
    if (!path) return;
  }
  await window.cuttingfloor.writeProject(path, serialize());
  const name = path.split("/").pop().replace(/\.cuttingfloor$/, "");
  set$1({ projectPath: path, projectName: name });
  markDirty(false);
  toast(`Saved ${name}`, "success");
}
function migrate(raw) {
  const f = raw;
  if (f.app !== "cuttingfloor") throw new Error("Not a Cutting Floor project");
  if (f.version === 3) return f;
  if (f.version === 2) return { ...f, version: 3 };
  if (f.version !== 1) throw new Error(`Unsupported project version ${f.version} (made with a newer Cutting Floor?)`);
  const d = f.doc;
  const seq = newSequence("Main Sequence", { width: d.sequence.width, height: d.sequence.height, fps: d.sequence.fps });
  seq.tracks = d.tracks.map((t) => ({ ...t, solo: false, volume: 0, pan: 0 }));
  seq.clips = d.clips.map((c) => ({
    ...makeClip({ kind: "media", mediaId: c.mediaId }, c.trackId, c.start, c.duration, c.linkId),
    id: c.id,
    in: c.in,
    transform: { ...DEFAULT_TRANSFORM, ...c.transform },
    effects: c.effects.map((e) => e.type === "chromaKey" && "lumaWeight" in e.params ? { ...e, params: { ...e.params, balance: 50 } } : e),
    volume: c.volume
  }));
  return { app: "cuttingfloor", version: 3, doc: { sequences: [seq], mainId: seq.id }, media: f.media ?? [] };
}
async function openProject() {
  if (get$1().dirty && !confirm("Discard unsaved changes?")) return;
  const r = await window.cuttingfloor.openProjectDialog();
  if (!r) return;
  let file;
  try {
    file = migrate(JSON.parse(r.content));
  } catch (e) {
    toast(`Could not open project: ${e.message}`, "error");
    return;
  }
  resetForDoc(file.doc, { projectPath: r.path, projectName: r.path.split("/").pop().replace(/\.cuttingfloor$/, "") });
  for (const m of file.media) {
    const exists = await window.cuttingfloor.fileExists(m.path);
    const { id, ...info } = m;
    registerMedia(info, id, !exists);
    if (!exists) toast(`Media offline: ${m.path}`, "error");
  }
  for (const q of file.doc.sequences) for (const c of q.clips) for (const e of c.effects) if (e.type === "lut" && typeof e.params.path === "string") void loadLut(e.params.path);
  markDirty(false);
}
const store = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  activeSeq,
  addEffect,
  addGenerator,
  addMarker,
  addMask,
  addSourceToTimeline,
  addTrack,
  applyTransitionAction,
  beginTx,
  clipLocalTime,
  closeSequenceTab,
  commit,
  commitSeq,
  deleteSelection,
  deleteSequence,
  deleteTrack,
  editKeys,
  endTx,
  ensureLumetri,
  findClip,
  importDialog,
  importPaths,
  initMediaEvents,
  jumpKey,
  linkSelection,
  liveUpdate,
  loadFonts,
  loadLut,
  mediaDuration,
  mediaUrl,
  migrate,
  nestSelection,
  newProject,
  newSequenceAction,
  openProject,
  openSequence,
  ops,
  primarySelection,
  project,
  redo,
  removeEffect,
  removeMarker,
  removeMask,
  renameSequence,
  saveProject,
  select,
  setInOut,
  setMaskPath,
  setParamValue,
  setSequenceSettings,
  setSpeed,
  setTime,
  setTransitionDefaults,
  splitAtPlayhead,
  stepFrames,
  toast,
  toggleClipEnabled,
  toggleKeyAtPlayhead,
  toggleLinkedSelection,
  togglePlay,
  toggleStopwatch,
  trackOf,
  undo,
  updateClip,
  updateEffect,
  updateMask,
  updateTrack,
  updateTransition,
  useStore
}, Symbol.toStringTag, { value: "Module" }));
const get = useStore.getState;
const set = useStore.setState;
const cloneEffect = (e) => ({ ...structuredClone(e), id: uid("fx") });
function kindOf(seq, c) {
  return trackOf(seq, c)?.kind ?? "video";
}
function moveEffect(clipId, effectId, to) {
  updateClip(clipId, (c) => {
    const i = c.effects.findIndex((e2) => e2.id === effectId);
    if (i < 0) return;
    const [e] = c.effects.splice(i, 1);
    c.effects.splice(Math.max(0, Math.min(c.effects.length, to > i ? to - 1 : to)), 0, e);
  });
}
function duplicateEffect(clipId, effectId) {
  updateClip(clipId, (c) => {
    const i = c.effects.findIndex((e) => e.id === effectId);
    if (i >= 0) c.effects.splice(i + 1, 0, cloneEffect(c.effects[i]));
  });
}
function copyEffects(clipId, effectIds) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c) return;
  const effects = c.effects.filter((e) => !effectIds || effectIds.includes(e.id)).map((e) => structuredClone(e));
  set({ effectClipboard: { kind: kindOf(seq, c), effects, motion: effectIds ? void 0 : structuredClone(c.transform), masks: effectIds ? void 0 : structuredClone(c.masks) } });
  toast(effectIds ? `Copied ${effects.length === 1 ? effectDef(effects[0].type).name : `${effects.length} effects`}` : "Copied attributes");
}
function pasteAttributes(what = { effects: true, motion: true, masks: true }, ids = get().selection) {
  const cb = get().effectClipboard;
  if (!cb) return toast("Nothing copied yet: right-click a clip → Copy attributes.", "error");
  activeSeq();
  let n = 0;
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (!c) continue;
      const k = kindOf(q, c);
      if (what.effects) {
        const fx2 = cb.effects.filter((e) => isEffectType(e.type) && effectDef(e.type).kind === k);
        c.effects.push(...fx2.map(cloneEffect));
        n += fx2.length ? 1 : 0;
      }
      if (k === "video" && what.motion && cb.motion) {
        c.transform = structuredClone(cb.motion);
        n++;
      }
      if (k === "video" && what.masks && cb.masks?.length) {
        c.masks.push(...cb.masks.map((m) => ({ ...structuredClone(m), id: uid("mask") })));
        n++;
      }
    }
  });
  if (!n) toast(`Nothing to paste onto ${ids.length === 1 ? "that clip" : "those clips"} (${cb.kind} effects go on ${cb.kind} clips).`, "error");
}
function clearEffects(ids = get().selection) {
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (c) c.effects = [];
    }
  });
}
function copyClips() {
  const s = get();
  const seq = activeSeq(s);
  const clips = withLinked(seq, s.selection, s.linkedSelection).map((id) => findClip(seq, id)).filter((c) => !!c);
  if (!clips.length) return;
  set({ clipClipboard: structuredClone(clips) });
  toast(`Copied ${clips.length} clip${clips.length > 1 ? "s" : ""}`);
}
function pasteClips() {
  const cb = get().clipClipboard;
  if (!cb?.length) return;
  const t0 = Math.min(...cb.map((c) => c.start));
  const at = get().time;
  const ids = [];
  commitSeq((q) => {
    const links = /* @__PURE__ */ new Map();
    for (const src of cb) {
      if (!q.tracks.some((t) => t.id === src.trackId)) continue;
      const c = { ...structuredClone(src), id: uid("clip"), start: at + (src.start - t0) };
      c.effects = c.effects.map(cloneEffect);
      if (src.linkId) {
        if (!links.has(src.linkId)) links.set(src.linkId, uid("link"));
        c.linkId = links.get(src.linkId);
      }
      clearRange(q, c.trackId, c.start, clipEnd(c), /* @__PURE__ */ new Set());
      q.clips.push(c);
      ids.push(c.id);
    }
  });
  select(ids);
}
async function loadPresets() {
  try {
    set({ presets: await window.cuttingfloor.loadPresets() });
  } catch {
  }
}
async function persist(list) {
  set({ presets: list });
  try {
    await window.cuttingfloor.savePresets(list);
  } catch (e) {
    toast(`Could not save presets: ${e.message}`, "error");
  }
}
async function savePreset(clipId, name, effectIds) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c) return;
  const effects = c.effects.filter((e) => !effectIds || effectIds.includes(e.id)).map((e) => structuredClone(e));
  if (!effects.length) return toast("No effects to save.", "error");
  for (const e of effects)
    for (const [k, v] of Object.entries(e.params)) if (typeof v === "object" && v !== null && "k" in v) e.params[k] = evalNum(v, v.k[0]?.t ?? 0);
  for (const e of effects) delete e.data;
  await persist([...get().presets.filter((p) => p.name !== name), { id: uid("preset"), name, kind: kindOf(seq, c), effects }]);
  toast(`Saved preset “${name}”`, "success");
}
function applyPreset(presetId, ids = get().selection) {
  const p = get().presets.find((x) => x.id === presetId);
  if (!p) return;
  let n = 0;
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (!c || kindOf(q, c) !== p.kind) continue;
      c.effects.push(...p.effects.filter((e) => isEffectType(e.type)).map(cloneEffect));
      n++;
    }
  });
  if (!n) toast(`Select ${p.kind} clips to apply “${p.name}”.`, "error");
}
async function deletePreset(presetId) {
  await persist(get().presets.filter((p) => p.id !== presetId));
}
async function renamePreset(presetId, name) {
  await persist(get().presets.map((p) => p.id === presetId ? { ...p, name } : p));
}
function setReverse(ids, on) {
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (c && c.source.kind !== "text" && c.source.kind !== "shape" && c.source.kind !== "solid") c.reverse = on || void 0;
    }
  });
}
function setFreeze(ids, on) {
  const t = get().time;
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (!c) continue;
      if (!on) delete c.freeze;
      else {
        const tt = Math.max(c.start, Math.min(clipEnd(c) - 1e-6, t));
        c.freeze = Math.max(0, mediaTime({ ...c, freeze: void 0 }, tt));
      }
    }
  });
}
function setRemap(ids, on) {
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (!c) continue;
      if (on && c.remap === void 0) {
        c.remap = c.speed * 100;
        c.speed = 1;
      } else if (!on && c.remap !== void 0) {
        const avg = sourceSpan(c) / Math.max(1e-6, c.duration);
        delete c.remap;
        c.speed = Math.max(0.05, Math.abs(avg));
      }
    }
  });
}
function setTrackMatte(ids, mode) {
  commitSeq((q) => {
    for (const id of ids) {
      const c = findClip(q, id);
      if (c) c.trackMatte = mode === "none" ? void 0 : mode;
    }
  });
}
const MASTER = "__master__";
function insertsOf(q, busId) {
  if (busId === MASTER) return q.masterEffects ??= [];
  const t = q.tracks.find((x) => x.id === busId);
  return t ? t.effects ??= [] : [];
}
function addBusEffect(busId, type) {
  if (!isEffectType(type) || effectDef(type).kind !== "audio") return;
  commitSeq((q) => insertsOf(q, busId).push(createEffect(type)));
}
function updateBusEffect(busId, effectId, fn, live = false) {
  commitSeq((q) => {
    const e = insertsOf(q, busId).find((x) => x.id === effectId);
    if (e) fn(e);
  }, live);
}
function removeBusEffect(busId, effectId) {
  commitSeq((q) => {
    const list = insertsOf(q, busId);
    const i = list.findIndex((x) => x.id === effectId);
    if (i >= 0) list.splice(i, 1);
  });
}
function moveBusEffect(busId, effectId, dir) {
  commitSeq((q) => {
    const list = insertsOf(q, busId);
    const i = list.findIndex((x) => x.id === effectId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  });
}
function busEffects(seq, busId) {
  return busId === MASTER ? seq.masterEffects ?? [] : seq.tracks.find((t) => t.id === busId)?.effects ?? [];
}
function analysisSize(c) {
  if (c.source.kind !== "media") return null;
  const m = project().media[c.source.mediaId];
  if (!m || m.kind !== "video" || m.offline) return null;
  const w = Math.min(640, m.width - m.width % 2);
  const h = Math.max(2, Math.round(w * m.height / m.width / 2) * 2);
  return { w, h, fps: m.fps || 30, path: m.path };
}
function pointAt(p, mt) {
  const k = p.keys;
  const n = k.length / 4;
  if (!n) return null;
  if (mt <= k[0]) return { u: k[1], v: k[2], conf: k[3] };
  if (mt >= k[(n - 1) * 4]) return { u: k[(n - 1) * 4 + 1], v: k[(n - 1) * 4 + 2], conf: k[(n - 1) * 4 + 3] };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (k[mid * 4] <= mt) lo = mid;
    else hi = mid;
  }
  const t0 = k[lo * 4];
  const t1 = k[hi * 4];
  const f = t1 > t0 ? (mt - t0) / (t1 - t0) : 0;
  return { u: k[lo * 4 + 1] + (k[hi * 4 + 1] - k[lo * 4 + 1]) * f, v: k[lo * 4 + 2] + (k[hi * 4 + 2] - k[lo * 4 + 2]) * f, conf: Math.min(k[lo * 4 + 3], k[hi * 4 + 3]) };
}
function setKeysFrom(p, from, dir, add) {
  const keep = [];
  for (let i = 0; i < p.keys.length; i += 4) {
    const t = p.keys[i];
    if (dir > 0 ? t <= from + 1e-6 : t >= from - 1e-6) keep.push(p.keys[i], p.keys[i + 1], p.keys[i + 2], p.keys[i + 3]);
  }
  const all = [];
  for (let i = 0; i < keep.length; i += 4) all.push(keep.slice(i, i + 4));
  for (let i = 0; i < add.length; i += 4) all.push(add.slice(i, i + 4));
  all.sort((a, b) => a[0] - b[0]);
  p.keys = all.flat();
}
function addMotionTrack(clipId, points) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  if (!c) return;
  if (!analysisSize(c)) return toast("Tracking works on video clips.", "error");
  if (!isLinearTime(c)) return toast("Turn off reverse / freeze / time remapping to track this clip.", "error");
  const mt = mediaTime(c, Math.max(c.start, Math.min(clipEnd(c) - 1e-3, get().time)));
  const layout = points === 1 ? [[0.5, 0.5]] : points === 2 ? [
    [0.35, 0.5],
    [0.65, 0.5]
  ] : [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.7, 0.7],
    [0.3, 0.7]
  ];
  const track = {
    id: uid("mt"),
    name: points === 1 ? "Track (position)" : points === 2 ? "Track (position, rotation, scale)" : "Track (corner pin)",
    points: layout.map(([u, v]) => ({ id: uid("tp"), feature: 31, search: 91, keys: [mt, u, v, 1] }))
  };
  updateClip(clipId, (cl) => (cl.motionTracks ??= []).push(track));
  set({ trackerEdit: { clipId, trackId: track.id } });
}
function removeMotionTrack(clipId, trackId) {
  updateClip(clipId, (c) => c.motionTracks = (c.motionTracks ?? []).filter((t) => t.id !== trackId));
  if (get().trackerEdit?.trackId === trackId) set({ trackerEdit: null });
}
function setTrackPoint(clipId, trackId, pointId, u, v, live = false) {
  const c = findClip(activeSeq(), clipId);
  if (!c) return;
  const mt = mediaTime(c, Math.max(c.start, Math.min(clipEnd(c) - 1e-3, get().time)));
  updateClip(
    clipId,
    (cl) => {
      const p = cl.motionTracks?.find((t) => t.id === trackId)?.points.find((x) => x.id === pointId);
      if (!p) return;
      const fps = analysisSize(cl)?.fps ?? 30;
      const keep = [];
      for (let i = 0; i < p.keys.length; i += 4) if (Math.abs(p.keys[i] - mt) > 0.5 / fps) keep.push(p.keys.slice(i, i + 4));
      keep.push([mt, u, v, 1]);
      keep.sort((a, b) => a[0] - b[0]);
      p.keys = keep.flat();
    },
    live
  );
}
function setTrackBoxes(clipId, trackId, feature, search) {
  updateClip(clipId, (c) => {
    for (const p of c.motionTracks?.find((t) => t.id === trackId)?.points ?? []) {
      p.feature = feature;
      p.search = Math.max(search, feature + 8);
    }
  });
}
let offTrack = null;
let offStab = null;
function startTracking(clipId, trackId, dir) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  const mtk = c?.motionTracks?.find((t) => t.id === trackId);
  const size = c && analysisSize(c);
  if (!c || !mtk || !size) return;
  if (!isLinearTime(c)) return toast("Turn off reverse / freeze / time remapping to track this clip.", "error");
  if (Object.values(get().analysis).some((a) => a.clipId === clipId)) return toast("Already analysing this clip.", "error");
  const from = mediaTime(c, Math.max(c.start, Math.min(clipEnd(c) - 1e-3, get().time)));
  const to = dir > 0 ? c.in + sourceSpan(c) : c.in;
  if (Math.abs(to - from) < 1 / size.fps) return toast(dir > 0 ? "Already at the end of the clip." : "Already at the start of the clip.", "error");
  const pts = mtk.points.map((p) => {
    const at = pointAt(p, from);
    return { u: at.u, v: at.v, feature: p.feature, search: p.search };
  });
  const id = uid("job");
  set({ analysis: { ...get().analysis, [id]: { clipId, label: dir > 0 ? "Tracking forward" : "Tracking backward", progress: 0 } } });
  offTrack ??= window.cuttingfloor.onTrackProgress((p) => {
    const job = get().analysis[p.id];
    if (!job) return;
    const meta = jobsMeta.get(p.id);
    if (meta && p.keys.some((k) => k.length)) {
      updateClip(
        meta.clipId,
        (cl) => {
          const t = cl.motionTracks?.find((x) => x.id === meta.trackId);
          t?.points.forEach((pt, i) => {
            if (!p.keys[i]?.length) return;
            if (!meta.cleared) setKeysFrom(pt, meta.from, meta.dir, []);
            const merged = [];
            for (let k = 0; k < pt.keys.length; k += 4) merged.push(pt.keys.slice(k, k + 4));
            for (let k = 0; k < p.keys[i].length; k += 4) merged.push(p.keys[i].slice(k, k + 4));
            merged.sort((a, b) => a[0] - b[0]);
            pt.keys = merged.flat();
          });
          meta.cleared = true;
        },
        true
      );
      const last = p.keys[0];
      if (last?.length) {
        const cl = findClip(activeSeq(), meta.clipId);
        if (cl) useStore.setState({ time: cl.start + (last[last.length - 4] - cl.in) / cl.speed });
      }
    }
    if (p.done) {
      const { [p.id]: _done, ...rest } = get().analysis;
      set({ analysis: rest });
      jobsMeta.delete(p.id);
      endTx();
      if (p.error) toast(p.error, "error");
      else if (meta) {
        const cl = findClip(activeSeq(), meta.clipId);
        const lowConf = cl?.motionTracks?.find((x) => x.id === meta.trackId)?.points.some((pt) => {
          for (let k = 3; k < pt.keys.length; k += 4) if (pt.keys[k] < 0.5) return true;
          return false;
        });
        toast(lowConf ? "Tracking finished, but some frames were uncertain (low contrast or occluded)." : "Tracking finished.", lowConf ? "info" : "success");
      }
    } else set({ analysis: { ...get().analysis, [p.id]: { ...job, progress: p.progress } } });
  });
  jobsMeta.set(id, { clipId, trackId, from, dir, cleared: false });
  beginTx();
  window.cuttingfloor.startTrack({ id, path: size.path, from, to, width: size.w, height: size.h, fps: size.fps, points: pts });
}
const jobsMeta = /* @__PURE__ */ new Map();
function cancelAnalysis(jobId) {
  window.cuttingfloor.cancelAnalysis(jobId);
}
const timeOf = (c, mt) => c.start + (mt - c.in) / c.speed;
function applyMotionTrack(clipId, trackId, target) {
  const seq = activeSeq();
  const p = project();
  const src = findClip(seq, clipId);
  const tgt = findClip(seq, target.clipId);
  const mtk = src?.motionTracks?.find((t) => t.id === trackId);
  if (!src || !tgt || !mtk || src.source.kind !== "media") return;
  const media = p.media[src.source.mediaId];
  if (!media) return;
  const content = fitSize(media.width, media.height, seq.settings);
  const times = [...new Set(mtk.points[0].keys.filter((_, i) => i % 4 === 0))].sort((a, b) => a - b);
  if (times.length < 2) return toast("Track the points first (Track forward / backward).", "error");
  const seqPt = (pt, mt) => {
    const t = timeOf(src, mt);
    const g = resolveGeom(src.transform, sourceTime(src, t), content, seq.settings);
    const a = pointAt(pt, mt);
    return fromUV(a.u, a.v, g);
  };
  const now = get().time;
  const nowMt = mediaTime(src, Math.max(src.start, Math.min(clipEnd(src) - 1e-3, now)));
  const tgtContent = getEngine()?.comp.contentSize({ key: tgt.id, clip: tgt, seq, src: sourceTime(tgt, now), mt: 0, t: now, kind: tgt.source.kind === "media" ? "media" : tgt.source.kind, media: tgt.source.kind === "media" ? p.media[tgt.source.mediaId] : void 0, trans: { opacity: 1, gain: 1, dip: null, shape: null, wipe: null, offset: [0, 0], scaleMul: 1, visible: true, blend: null, blur: 0, crop: null, onTop: false } }) ?? { w: seq.settings.width, h: seq.settings.height };
  const tgtGeom = (t) => resolveGeom(tgt.transform, sourceTime(tgt, t), tgtContent, seq.settings);
  const anim = (samples, col, tol) => {
    const keep = simplify(
      samples.map((s) => [s[0], s[col]]),
      [tol]
    );
    return { k: keep.map((i) => makeKey(samples[i][0], samples[i][col], "linear")) };
  };
  const ktOf = (mt) => sourceTime(tgt, timeOf(src, mt));
  const pointTarget = target.mode === "point" ? target : null;
  let label = "";
  updateClip(tgt.id, (c) => {
    if (target.mode === "position" || target.mode === "transform") {
      const p1 = mtk.points[0];
      const p2 = mtk.points[1];
      const base = seqPt(p1, nowMt);
      const kt0 = sourceTime(tgt, Math.max(tgt.start, Math.min(clipEnd(tgt) - 1e-3, now)));
      const offX = evalNum(c.transform.x, kt0) + seq.settings.width / 2 - base.x;
      const offY = evalNum(c.transform.y, kt0) + seq.settings.height / 2 - base.y;
      const rot0 = evalNum(c.transform.rotation, kt0);
      const sc0 = evalNum(c.transform.scale, kt0);
      const v0 = p2 ? { a: seqPt(p1, nowMt), b: seqPt(p2, nowMt) } : null;
      const ang0 = v0 ? Math.atan2(v0.b.y - v0.a.y, v0.b.x - v0.a.x) : 0;
      const d0 = v0 ? Math.hypot(v0.b.x - v0.a.x, v0.b.y - v0.a.y) : 1;
      const rows = times.map((mt) => {
        const a = seqPt(p1, mt);
        const row = [ktOf(mt), a.x + offX - seq.settings.width / 2, a.y + offY - seq.settings.height / 2];
        if (target.mode === "transform" && p2) {
          const b = seqPt(p2, mt);
          row.push(rot0 + (Math.atan2(b.y - a.y, b.x - a.x) - ang0) * 180 / Math.PI, sc0 * Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1e-6, d0));
        }
        return row;
      });
      c.transform.x = anim(rows, 1, 0.25);
      c.transform.y = anim(rows, 2, 0.25);
      if (target.mode === "transform" && p2) {
        c.transform.rotation = anim(rows, 3, 0.05);
        c.transform.scale = anim(rows, 4, 0.05);
        delete c.transform.scaleY;
      }
      label = target.mode === "transform" && p2 ? "position, rotation and scale" : "position";
    } else if (target.mode === "cornerPin") {
      if (mtk.points.length < 4) return;
      let fx2 = c.effects.find((e) => e.type === "cornerPin");
      if (!fx2) {
        fx2 = createEffect("cornerPin");
        c.effects.push(fx2);
      }
      const corners = ["tl", "tr", "br", "bl"];
      const rows = times.map((mt) => {
        const g = tgtGeom(timeOf(src, mt));
        const row = [ktOf(mt)];
        mtk.points.slice(0, 4).forEach((pt) => {
          const q = seqPt(pt, mt);
          const uv = toUV(q.x, q.y, g);
          row.push(uv.u * 100, uv.v * 100);
        });
        return row;
      });
      corners.forEach((k, i) => {
        fx2.params[k + "X"] = anim(rows, 1 + i * 2, 0.02);
        fx2.params[k + "Y"] = anim(rows, 2 + i * 2, 0.02);
      });
      label = "Corner Pin";
    } else {
      if (!pointTarget) return;
      const fx2 = c.effects.find((e) => e.id === pointTarget.effectId);
      if (!fx2) return;
      const rows = times.map((mt) => {
        const q = seqPt(mtk.points[0], mt);
        const uv = toUV(q.x, q.y, tgtGeom(timeOf(src, mt)));
        return [ktOf(mt), uv.u * 100, uv.v * 100];
      });
      fx2.params[pointTarget.pointKey + "X"] = anim(rows, 1, 0.02);
      fx2.params[pointTarget.pointKey + "Y"] = anim(rows, 2, 0.02);
      label = `${effectDef(fx2.type).name} point`;
    }
  });
  if (label) toast(`Applied the track to ${label}.`, "success");
}
function analyseStabilizer(clipId, effectId) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  const size = c && analysisSize(c);
  if (!c || !size) return toast("The stabiliser works on video clips.", "error");
  if (Object.values(get().analysis).some((a) => a.clipId === clipId)) return toast("Already analysing this clip.", "error");
  const s0 = Math.max(0, Math.min(c.in, c.in + sourceSpan(c)) - 0.5);
  const s1 = Math.max(c.in, c.in + sourceSpan(c)) + 0.5;
  const w = Math.min(480, size.w);
  const h = Math.max(2, Math.round(w * size.h / size.w / 2) * 2);
  const id = uid("job");
  set({ analysis: { ...get().analysis, [id]: { clipId, label: "Analysing shake", progress: 0 } } });
  stabMeta.set(id, { clipId, effectId });
  offStab ??= window.cuttingfloor.onStabProgress((p) => {
    const job = get().analysis[p.id];
    const meta = stabMeta.get(p.id);
    if (!job || !meta) return;
    if (!p.done) {
      set({ analysis: { ...get().analysis, [p.id]: { ...job, progress: p.progress } } });
      return;
    }
    const { [p.id]: _done, ...rest } = get().analysis;
    set({ analysis: rest });
    stabMeta.delete(p.id);
    if (p.data) {
      updateClip(meta.clipId, (cl) => {
        const e = cl.effects.find((x) => x.id === meta.effectId);
        if (e) e.data = { ...e.data, stab: p.data };
      });
      toast(p.error ?? "Stabilised.", p.error ? "info" : "success");
    } else if (p.error) toast(p.error, "error");
  });
  window.cuttingfloor.startStab({ id, path: size.path, s0, s1, width: w, height: h, fps: size.fps });
}
const stabMeta = /* @__PURE__ */ new Map();
const subjectMeta = /* @__PURE__ */ new Map();
let offSubject = null;
let downloading = false;
async function ensureSubjectModel() {
  const st = await window.cuttingfloor.subjectModel();
  if (!st.runtime) {
    toast("Subject Key needs its AI runtime, which is missing from this installation of Cutting Floor.", "error");
    return false;
  }
  if (st.path) return true;
  if (downloading) {
    toast("The Subject Key model is still downloading.", "info");
    return false;
  }
  const mb = Math.round(st.size / 1e6);
  if (!confirm(`Subject Key finds people with a ${mb} MB AI model (U²-Net, the same one Titianus's Subject Snap uses). It runs entirely on this computer.

Download it once now? It goes to ${st.downloadDir}, where Titianus finds it too.`)) return false;
  downloading = true;
  const id = uid("job");
  set({ analysis: { ...get().analysis, [id]: { clipId: "", label: "Downloading Subject Key model", progress: 0 } } });
  const off = window.cuttingfloor.onSubjectDownload((done, total) => {
    const job = get().analysis[id];
    if (job) set({ analysis: { ...get().analysis, [id]: { ...job, progress: done / Math.max(1, total) } } });
  });
  try {
    const r = await window.cuttingfloor.downloadSubjectModel();
    if (r.error || !r.path) {
      toast(`Couldn't download the Subject Key model: ${r.error ?? "unknown error"}`, "error");
      return false;
    }
    toast("Subject Key model installed.", "success");
    return true;
  } finally {
    off();
    downloading = false;
    const { [id]: _d, ...rest } = get().analysis;
    set({ analysis: rest });
  }
}
async function analyseSubject(clipId, effectId) {
  const seq = activeSeq();
  const c = findClip(seq, clipId);
  const m = c && c.source.kind === "media" ? project().media[c.source.mediaId] : null;
  if (!c || !m || m.kind !== "video" || m.offline) return toast("Subject Key works on video clips.", "error");
  if (Object.values(get().analysis).some((a) => a.clipId === clipId)) return toast("Already analysing this clip.", "error");
  if (!await ensureSubjectModel()) return;
  const fx2 = c.effects.find((e) => e.id === effectId);
  if (!fx2) return;
  const step = Math.max(1, Number(fx2.params.detail) || 4);
  const fps = m.fps || 30;
  const s0 = Math.max(0, Math.min(c.in, c.in + sourceSpan(c)) - 0.25);
  const s1 = Math.min(m.duration || Infinity, Math.max(c.in, c.in + sourceSpan(c)) + 0.25);
  const long = 384;
  const scale = Math.min(1, long / Math.max(m.width, m.height));
  const w = Math.max(2, Math.round(m.width * scale / 2) * 2);
  const h = Math.max(2, Math.round(m.height * scale / 2) * 2);
  const id = uid("job");
  set({ analysis: { ...get().analysis, [id]: { clipId, label: "Finding people", progress: 0 } } });
  subjectMeta.set(id, { clipId, effectId });
  offSubject ??= window.cuttingfloor.onSubjectProgress((p) => {
    const job = get().analysis[p.id];
    const meta = subjectMeta.get(p.id);
    if (!job || !meta) return;
    if (!p.done) {
      const left = p.eta !== void 0 ? ` · ${p.eta >= 90 ? Math.round(p.eta / 60) + " min" : Math.max(1, Math.round(p.eta)) + " s"} left` : "";
      set({ analysis: { ...get().analysis, [p.id]: { ...job, progress: p.progress, label: "Finding people" + left } } });
      return;
    }
    const { [p.id]: _done, ...rest } = get().analysis;
    set({ analysis: rest });
    subjectMeta.delete(p.id);
    if (p.data) {
      updateClip(meta.clipId, (cl) => {
        const e = cl.effects.find((x) => x.id === meta.effectId);
        if (e) {
          const old = e.data?.subject?.file;
          e.data = { ...e.data, subject: p.data };
          if (old && old !== p.data.file) {
            const used = get().doc.sequences.some((q) => q.clips.some((x) => x.effects.some((fx22) => fx22.id !== meta.effectId && fx22.data?.subject?.file === old)));
            if (!used) window.cuttingfloor.forgetMatte(old);
          }
        }
      });
      toast("Subject Key is ready.", "success");
    } else if (p.error) toast(p.error, "error");
  });
  window.cuttingfloor.startSubject({ id, path: m.path, s0, s1, fps, step, width: w, height: h });
}
const power = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MASTER,
  addBusEffect,
  addMotionTrack,
  analyseStabilizer,
  analyseSubject,
  applyMotionTrack,
  applyPreset,
  busEffects,
  cancelAnalysis,
  clearEffects,
  copyClips,
  copyEffects,
  deletePreset,
  duplicateEffect,
  isEffectType,
  loadPresets,
  moveBusEffect,
  moveEffect,
  pasteAttributes,
  pasteClips,
  pointAt,
  removeBusEffect,
  removeMotionTrack,
  renamePreset,
  savePreset,
  setFreeze,
  setRemap,
  setReverse,
  setTrackBoxes,
  setTrackMatte,
  setTrackPoint,
  startTracking,
  updateBusEffect
}, Symbol.toStringTag, { value: "Module" }));
const PATHS = {
  more: "M4 12a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0M10.4 12a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0M16.8 12a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0",
  target: "M12 3v4M12 17v4M3 12h4M17 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  adjust: "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M11 16v4",
  gradient: "M3 3h18v18H3zM7 3v18M11 3v18M15 3v18",
  fx: "M4 20L14 4M9 4h6M6 12h8M14 20l4-6 3 6",
  meter: "M4 20V10M9 20V4M14 20v-8M19 20v-5",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  logo: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M8 5v4M13 5v4M18 5v4",
  export: "M12 3v12M7 10l5 5 5-5M5 21h14",
  import: "M12 15V3M7 8l5-5 5 5M5 21h14",
  play: "M7 5l12 7-12 7z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  prevEdit: "M6 5v14M18 5l-9 7 9 7z",
  nextEdit: "M18 5v14M6 5l9 7-9 7z",
  stepBack: "M15 6l-6 6 6 6",
  stepFwd: "M9 6l6 6-6 6",
  select: "M5 3l14 8-6 2-2 6z",
  razor: "M6 6l12 12M6 18L18 6M4 4h4v4H4zM16 16h4v4h-4z",
  slip: "M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1",
  speaker: "M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7",
  mute: "M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6",
  lock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3",
  unlock: "M5 11h14v10H5zM8 11V8a4 4 0 0 1 7.5-2",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  chevron: "M6 9l6 6 6-6",
  chevronR: "M9 6l6 6-6 6",
  dropper: "M2 22l2-1 9-9M14.5 3.5l6 6M11 7l6 6M17.5 2.5a2.1 2.1 0 0 1 3 3L15 11l-3-3z",
  matte: "M3 3h18v18H3zM3 3l18 18",
  reset: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  sparkle: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  film: "M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4",
  wave: "M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2",
  image: "M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01",
  magnet: "M6 3v8a6 6 0 0 0 12 0V3M6 7h4M14 7h4",
  zoomIn: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3M11 8v6M8 11h6",
  zoomOut: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3M8 11h6",
  guides: "M4 4h16v16H4zM8 8h8v8H8z",
  x: "M6 6l12 12M18 6L6 18",
  stopwatch: "M12 9v4l2.5 1.5M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
  chevronL: "M15 6l-6 6 6 6",
  pen: "M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18M2 2l7.6 7.6M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  text: "M5 6V4h14v2M12 4v16M9 20h6",
  shape: "M3 3h11v11H3zM15 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10z",
  stack: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  marker: "M6 3h12v13l-6 5-6-5z",
  speed: "M12 14l4-5M3.5 15a9 9 0 1 1 17 0",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  folderOpen: "M3 7V5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2M3 7h18l-2 12H5z",
  solo: "M12 3v18M3 12h18",
  transition: "M4 4l8 8-8 8M12 4l8 8-8 8",
  in: "M8 4v16M8 12h10M14 8l4 4-4 4",
  out: "M16 4v16M16 12H6M10 8l-4 4 4 4"
};
function Icon({ name, size = 16, stroke = 2, fill }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: fill ? "currentColor" : "none",
      stroke: fill ? "none" : "currentColor",
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: PATHS[name] })
    }
  );
}
function NumberField({ value, min = -Infinity, max = Infinity, step = 1, decimals, unit, label, onChange, onBegin }) {
  const [editing, setEditing] = reactExports.useState(false);
  const [text, setText] = reactExports.useState("");
  const drag = reactExports.useRef(null);
  const ref = reactExports.useRef(null);
  const dec = decimals ?? (step >= 1 ? 0 : step >= 0.1 ? 1 : 2);
  const clamp = (v) => Math.min(max, Math.max(min, v));
  const shown = `${value.toFixed(dec)}${unit ?? ""}`;
  reactExports.useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      ref,
      className: "num",
      "aria-label": label,
      value: editing ? text : shown,
      readOnly: !editing,
      onChange: (e) => setText(e.target.value),
      onPointerDown: (e) => {
        if (editing) return;
        e.preventDefault();
        e.target.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, v: value, moved: false };
      },
      onPointerMove: (e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) < 3) return;
        if (!d.moved) onBegin?.();
        d.moved = true;
        const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        const v = clamp(Math.round((d.v + dx * step * mult) / step) * step);
        onChange(v, true);
      },
      onPointerUp: () => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        if (d.moved) onChange(value, false);
        else {
          setText(value.toFixed(dec));
          setEditing(true);
        }
      },
      onBlur: () => {
        if (!editing) return;
        setEditing(false);
        const v = Number(text);
        if (!Number.isNaN(v)) {
          onBegin?.();
          onChange(clamp(v), false);
        }
      },
      onKeyDown: (e) => {
        if (!editing) return;
        if (e.key === "Enter") e.target.blur();
        if (e.key === "Escape") {
          setText(value.toFixed(dec));
          setEditing(false);
        }
        e.stopPropagation();
      }
    }
  );
}
function KeyControls({ clip, path }) {
  const time = useStore((s) => s.time);
  const v = getParam(clip, path);
  const animated = isAnim(v);
  const t = clipLocalTime(clip, time);
  const onKey = animated && keyIndexAt(v, t) >= 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "keyctl", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: `kbtn${animated ? " on" : ""}`,
        title: animated ? "Stop animating (keeps the current value)" : "Animate this parameter",
        "aria-label": "Toggle animation",
        "aria-pressed": animated,
        onClick: () => toggleStopwatch(clip.id, path),
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stopwatch", size: 13 })
      }
    ),
    animated && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kbtn", title: "Previous keyframe", "aria-label": "Previous keyframe", onClick: () => jumpKey(clip.id, path, -1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "chevronL", size: 11, stroke: 2.6 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `kbtn diamond${onKey ? " on" : ""}`, title: onKey ? "Remove keyframe" : "Add keyframe", "aria-label": onKey ? "Remove keyframe" : "Add keyframe", onClick: () => toggleKeyAtPlayhead(clip.id, path), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "kbtn", title: "Next keyframe", "aria-label": "Next keyframe", onClick: () => jumpKey(clip.id, path, 1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "chevronR", size: 11, stroke: 2.6 }) })
    ] })
  ] });
}
function ParamRow({ clip, path, label, min, max, step, unit, noSlider }) {
  const id = reactExports.useId();
  const time = useStore((s) => s.time);
  const v = getParam(clip, path);
  const value = evalNum(v, clipLocalTime(clip, time));
  const apply = (x) => setParamValue(clip.id, path, x, true);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: id, title: label, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(KeyControls, { clip, path }),
    noSlider ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id,
        className: "slider",
        type: "range",
        min,
        max,
        step,
        value: Math.min(max, Math.max(min, value)),
        onPointerDown: beginTx,
        onPointerUp: endTx,
        onKeyDown: beginTx,
        onKeyUp: endTx,
        onChange: (e) => apply(Number(e.target.value))
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NumberField,
      {
        label,
        value,
        min: noSlider ? -Infinity : min,
        max: noSlider ? Infinity : max,
        step,
        unit,
        onBegin: beginTx,
        onChange: (x, isLive) => {
          apply(x);
          if (!isLive) endTx();
        }
      }
    )
  ] });
}
function PlainRow({ label, value, min, max, step, unit, onChange }) {
  const id = reactExports.useId();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: id, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { id, className: "slider", type: "range", min, max, step, value: Math.min(max, Math.max(min, value)), onPointerDown: beginTx, onPointerUp: endTx, onChange: (e) => onChange(Number(e.target.value), true) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NumberField,
      {
        label,
        value,
        min,
        max,
        step,
        unit,
        onBegin: beginTx,
        onChange: (x, isLive) => {
          onChange(x, true);
          if (!isLive) endTx();
        }
      }
    )
  ] });
}
function timecode(seconds, fps) {
  const nominal = Math.round(fps);
  const totalFrames = Math.max(0, Math.round(seconds * fps));
  const ff = totalFrames % nominal;
  const totalSec = Math.floor(totalFrames / nominal);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60) % 60;
  const hh = Math.floor(totalSec / 3600);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(hh)}:${p(mm)}:${p(ss)}:${p(ff)}`;
}
function parseTimecode(text, fps) {
  const t = text.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const parts = t.split(/[:;.]/).map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  const nominal = Math.round(fps);
  while (parts.length < 4) parts.unshift(0);
  const [hh, mm, ss, ff] = parts;
  const frames = ((hh * 60 + mm) * 60 + ss) * nominal + ff;
  return frames / fps;
}
function shortTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
const useMenu = create(() => ({ x: 0, y: 0, items: null }));
function openContextMenu(e, items) {
  e.preventDefault();
  useMenu.setState({ x: e.clientX, y: e.clientY, items });
}
function ContextMenuHost() {
  const { x, y, items } = useMenu();
  const ref = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!items) return;
    const close = (e) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      useMenu.setState({ items: null });
    };
    const key = (e) => {
      if (e.key === "Escape") useMenu.setState({ items: null });
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", close);
    };
  }, [items]);
  if (!items) return null;
  const h = items.reduce((a, it) => a + (it.sep ? 9 : 31), 12);
  const left = Math.min(x, window.innerWidth - 260);
  const top = Math.max(4, Math.min(y, window.innerHeight - h - 8));
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MenuList, { items, left, top }) });
}
function MenuList({ items, left, top }) {
  const [sub, setSub] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu-pop ctx", role: "menu", style: { left, top, position: "fixed" }, children: items.map(
      (it, i) => it.sep ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu-sep" }, i) : it.children ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          role: "menuitem",
          "aria-haspopup": "menu",
          "aria-expanded": sub?.i === i,
          className: `menu-item${sub?.i === i ? " open" : ""}`,
          disabled: it.disabled,
          onMouseEnter: (e) => setSub({ i, top: e.currentTarget.getBoundingClientRect().top - 5 }),
          onClick: (e) => setSub({ i, top: e.currentTarget.getBoundingClientRect().top - 5 }),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: "▸" })
          ]
        },
        i
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          role: "menuitem",
          className: "menu-item",
          disabled: it.disabled,
          onMouseEnter: () => setSub(null),
          onClick: () => {
            useMenu.setState({ items: null });
            it.run?.();
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.label }),
            it.keys && /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: it.keys })
          ]
        },
        i
      )
    ) }),
    sub && items[sub.i]?.children && /* @__PURE__ */ jsxRuntimeExports.jsx(
      MenuList,
      {
        items: items[sub.i].children,
        left: left + 250 > window.innerWidth - 250 ? left - 248 : left + 250,
        top: Math.max(4, Math.min(sub.top, window.innerHeight - items[sub.i].children.length * 31 - 16))
      }
    )
  ] });
}
const DND_MEDIA = "application/x-cuttingfloor-media";
const DND_SEQ = "application/x-cuttingfloor-seq";
const DND_EFFECT = "application/x-cuttingfloor-effect";
const DND_TRANSITION = "application/x-cuttingfloor-transition";
function codecLabel(m) {
  if (m.kind === "image") return "Image";
  if (m.kind === "audio") return (m.audioCodec || "audio").toUpperCase();
  const map = { h264: "H.264", hevc: "H.265", prores: "ProRes", dnxhd: "DNxHR", av1: "AV1", vp9: "VP9", mpeg2video: "MPEG-2" };
  const ten = /10|12/.test(m.pixFmt) ? " 10-bit" : "";
  return (map[m.videoCodec] ?? m.videoCodec.toUpperCase()) + ten;
}
function ProxyStatus({ m }) {
  if (m.offline) return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-err", children: "Offline" });
  switch (m.proxyStatus) {
    case "ready":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-ok", children: "Proxy ready" });
    case "building":
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "status-wait", children: [
        "Building proxy · ",
        Math.round(m.proxyProgress * 100),
        "%"
      ] });
    case "queued":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-wait", children: "Proxy queued" });
    case "error":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "status-err", title: m.proxyError, children: "Proxy failed" });
    default:
      return null;
  }
}
function MediaRow({ m }) {
  const sub = m.kind === "audio" ? `${shortTime(m.duration)} · ${(m.sampleRate / 1e3).toFixed(1)} kHz` : m.kind === "image" ? `${m.width}×${m.height}` : `${shortTime(m.duration)} · ${m.width}×${m.height} · ${fpsLabel(m.fps)}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "media-row",
      draggable: true,
      title: m.path,
      onDragStart: (e) => {
        e.dataTransfer.setData(DND_MEDIA, m.id);
        e.dataTransfer.effectAllowed = "copy";
      },
      onDoubleClick: () => addSourceToTimeline({ kind: "media", mediaId: m.id }, null, useStore.getState().time),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "thumb", style: m.thumbUrl ? { backgroundImage: `url("${m.thumbUrl}")` } : void 0, children: [
          !m.thumbUrl && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: m.kind === "audio" ? "wave" : m.kind === "image" ? "image" : "film", size: 18 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge", children: codecLabel(m) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "media-meta", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "name", children: m.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: sub }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ProxyStatus, { m })
        ] })
      ]
    }
  );
}
function SeqRow({ s, isMain, active }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `media-row${active ? " active" : ""}`,
      draggable: !isMain,
      title: isMain ? "Main sequence" : "Drag into another sequence to nest it",
      onDragStart: (e) => {
        e.dataTransfer.setData(DND_SEQ, s.id);
        e.dataTransfer.effectAllowed = "copy";
      },
      onDoubleClick: () => openSequence(s.id),
      onContextMenu: (e) => openContextMenu(e, [
        { label: "Open", run: () => openSequence(s.id) },
        {
          label: "Rename…",
          run: () => {
            const n = prompt("Sequence name", s.name);
            if (n) renameSequence(s.id, n);
          }
        },
        { label: "Delete", disabled: isMain, run: () => deleteSequence(s.id) }
      ]),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "thumb seq", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stack", size: 18 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge", children: isMain ? "Main" : "Seq" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "media-meta", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "name", children: s.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
            shortTime(sequenceDuration(s)),
            " · ",
            s.settings.width,
            "×",
            s.settings.height,
            " · ",
            fpsLabel(s.settings.fps)
          ] })
        ] })
      ]
    }
  );
}
function Bin() {
  const tab = useStore((s) => s.binTab);
  const media = useStore((s) => s.media);
  const order = useStore((s) => s.mediaOrder);
  const sequences = useStore((s) => s.doc.sequences);
  const mainId = useStore((s) => s.doc.mainId);
  const activeId = useStore((s) => s.activeSeqId);
  const primary = useStore(primarySelection);
  const [q, setQ] = reactExports.useState("");
  const [over, setOver] = reactExports.useState(false);
  const query = q.trim().toLowerCase();
  const items = order.map((id) => media[id]).filter((m) => m && (!query || m.name.toLowerCase().includes(query)));
  const seqs = sequences.filter((s) => !query || s.name.toLowerCase().includes(query));
  const presets = useStore((s) => s.presets);
  const [fxKind, setFxKind] = reactExports.useState("video");
  const groups = fxKind === "video" ? VIDEO_CATEGORIES : AUDIO_CATEGORIES;
  const match = (name, desc = "") => !query || name.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Project bin", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", role: "tablist", children: ["media", "effects", "transitions"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": tab === t, onClick: () => useStore.setState({ binTab: t }), children: t[0].toUpperCase() + t.slice(1) }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bin-tools", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "search", placeholder: "Search", value: q, onChange: (e) => setQ(e.target.value), "aria-label": "Search", onKeyDown: (e) => e.stopPropagation() }),
      tab === "media" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn", onClick: () => void importDialog(), title: "Import media (Ctrl+I)", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "import", size: 14 }),
          " Import"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn",
            "aria-label": "New item",
            title: "New sequence, title, shape or colour matte",
            onClick: (e) => openContextMenu({ clientX: e.clientX, clientY: e.clientY + 12, preventDefault: () => {
            } }, [
              { label: "New sequence", run: () => newSequenceAction() },
              { label: "", sep: true },
              { label: "Title", keys: "Ctrl+T", run: () => addGenerator("text") },
              { label: "Shape", run: () => addGenerator("shape") },
              { label: "Color matte", run: () => addGenerator("solid") },
              { label: "Adjustment layer", run: () => addGenerator("adjustment") },
              { label: "", sep: true },
              ...GENERATORS.map((g) => ({ label: g.name, run: () => addGenerator("generator", g.type) }))
            ]),
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 14 })
          }
        )
      ] })
    ] }),
    tab === "media" && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: `bin-drop${over ? " over" : ""}`,
        onDragOver: (e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        },
        onDragLeave: () => setOver(false),
        onDrop: (e) => {
          e.preventDefault();
          setOver(false);
          const paths = [...e.dataTransfer.files].map((f) => window.cuttingfloor.pathForFile(f)).filter(Boolean);
          if (paths.length) void importPaths(paths);
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
          seqs.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "bin-h", children: "Sequences" }),
          seqs.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(SeqRow, { s, isMain: s.id === mainId, active: s.id === activeId }, s.id)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "bin-h", children: "Media" }),
          items.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty", children: order.length === 0 ? "Drop video, audio or image files here, or use Import. Proxies build in the background." : "No matches" }) : items.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(MediaRow, { m }, m.id))
        ] })
      }
    ),
    tab === "effects" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seg", role: "tablist", "aria-label": "Effect kind", children: ["video", "audio"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": fxKind === k, onClick: () => setFxKind(k), children: k === "video" ? "Video effects" : "Audio effects" }, k)) }),
      presets.filter((p) => p.kind === fxKind && match(p.name)).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fx-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: "Presets" }),
        presets.filter((p) => p.kind === fxKind && match(p.name)).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "fx-item",
            title: primary ? "Click to apply to the selected clips" : "Select clips, then click to apply",
            onClick: () => applyPreset(p.id),
            onContextMenu: (e) => openContextMenu(e, [
              { label: "Apply to selection", run: () => applyPreset(p.id) },
              {
                label: "Rename…",
                run: () => {
                  const n = prompt("Preset name", p.name);
                  if (n) void renamePreset(p.id, n);
                }
              },
              { label: "Delete", run: () => void deletePreset(p.id) }
            ]),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: p.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: p.effects.map((e) => EFFECTS.find((d) => d.type === e.type)?.name ?? e.type).join(" → ") })
            ]
          },
          p.id
        ))
      ] }),
      groups.map((g) => {
        const list = EFFECTS.filter((e) => e.category === g && match(e.name, e.description));
        if (!list.length) return null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fx-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: g }),
          list.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: "fx-item",
              draggable: true,
              title: primary ? "Click to add to the selected clip, or drag onto a clip" : "Drag onto a clip",
              onDragStart: (ev) => {
                ev.dataTransfer.setData(DND_EFFECT, e.type);
                ev.dataTransfer.effectAllowed = "copy";
              },
              onClick: () => primary && addEffect(primary.id, e.type),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: e.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: e.description })
              ]
            },
            e.type
          ))
        ] }, g);
      }),
      fxKind === "video" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fx-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: "Generators & layers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "fx-item", onClick: () => addGenerator("adjustment"), title: "Adds an adjustment layer at the playhead, above everything", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Adjustment Layer" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Applies its effects to every track below it." })
        ] }),
        GENERATORS.filter((g) => match(g.name, g.description)).map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "fx-item", onClick: () => addGenerator("generator", g.type), title: "Adds it at the playhead", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: g.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: g.description })
        ] }, g.type))
      ] })
    ] }),
    tab === "transitions" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
      TRANSITION_CATEGORIES.map((g) => {
        const list = TRANSITIONS.filter((t) => t.category === g && match(t.name, t.description));
        if (!list.length) return null;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fx-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { children: g === "Audio" ? "Audio crossfades" : g }),
          list.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: "fx-item",
              draggable: true,
              title: "Drag onto a cut, or onto the start or end of a clip",
              onDragStart: (ev) => {
                ev.dataTransfer.setData(DND_TRANSITION, t.type);
                ev.dataTransfer.effectAllowed = "copy";
              },
              onDoubleClick: () => {
                const c = primarySelection(useStore.getState());
                if (c) applyTransitionAction(c.id, "in", t.type);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: t.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t.description })
              ]
            },
            t.type
          ))
        ] }, g);
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 14px" }, children: "Tip: Ctrl+D adds the default transition at the selected clip's nearest edge; double-click a transition here to put it at the selected clip's start. Duration, alignment and easing defaults are set in Effect Controls." })
    ] })
  ] });
}
const HDR = 190;
const TRACK_H = { video: 58, audio: 52 };
const SNAP_PX = 8;
const TOOLS = [
  { id: "select", label: "Selection (V)", icon: "select" },
  { id: "razor", label: "Razor (C)", icon: "razor" },
  { id: "slip", label: "Slip (Y)", icon: "slip" },
  { id: "pen", label: "Mask pen (P)", icon: "pen" }
];
function snapPoints(seq, exclude, time) {
  const pts = [0, time];
  for (const c of seq.clips) {
    if (exclude.has(c.id)) continue;
    pts.push(c.start, clipEnd(c));
  }
  for (const m of seq.markers) pts.push(m.t);
  if (seq.inPoint !== void 0) pts.push(seq.inPoint);
  if (seq.outPoint !== void 0) pts.push(seq.outPoint);
  return pts;
}
function snapDelta(edges, points, threshold) {
  let best = null;
  for (const e of edges)
    for (const p of points) {
      const d = p - e;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: p };
    }
  return best;
}
const quant = (t, fps) => Math.round(t * fps) / fps;
function Waveform({ peaks, from, dur, speed, width }) {
  const d = reactExports.useMemo(() => {
    const n = Math.max(2, Math.min(1200, Math.floor(width / 2)));
    const top = [];
    const bot = [];
    for (let i = 0; i < n; i++) {
      const t0 = from + dur * speed * i / n;
      const t1 = from + dur * speed * (i + 1) / n;
      let m = 0;
      for (let k = Math.floor(t0 * 100); k < Math.ceil(t1 * 100) && k < peaks.length; k++) if (k >= 0) m = Math.max(m, peaks[k]);
      const x = (i + 0.5) / n * 100;
      const h = Math.min(1, m) * 48;
      top.push(`${x.toFixed(2)},${(50 - h).toFixed(2)}`);
      bot.unshift(`${x.toFixed(2)},${(50 + h).toFixed(2)}`);
    }
    return `M0,50 L${top.join(" L")} L100,50 L${bot.join(" L")} Z`;
  }, [peaks, from, dur, speed, width]);
  if (width < 4) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "wave", viewBox: "0 0 100 100", preserveAspectRatio: "none", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d, fill: "#3ccf8e", opacity: "0.75" }) });
}
function clipKeyTimes(c) {
  const vals = [...Object.values(c.transform), c.volume, c.pan, ...c.effects.flatMap((e) => Object.values(e.params)), ...c.masks.flatMap((m) => [m.path, m.feather, m.expansion, m.opacity])];
  if (c.source.kind === "shape") vals.push(c.source.props.width, c.source.props.height, c.source.props.radius);
  if (c.source.kind === "generator") vals.push(...Object.values(c.source.params));
  vals.push(c.remap);
  const s = /* @__PURE__ */ new Set();
  for (const v of vals) if (isAnim(v)) for (const k of v.k) s.add(Math.round((c.start + (k.t - c.in) / c.speed) * 1e3) / 1e3);
  return [...s].filter((t) => t >= c.start - 1e-6 && t <= clipEnd(c) + 1e-6);
}
function ClipView({ clip, media, label, track, zoom, selected, peaks, onPointerDown }) {
  const left = clip.start * zoom;
  const width = Math.max(2, clip.duration * zoom);
  const [over, setOver] = reactExports.useState(false);
  const s = clip.source;
  const kind = track.kind === "audio" ? "a" : s.kind === "sequence" ? "seq" : s.kind === "adjustment" ? "adj" : s.kind === "text" || s.kind === "shape" || s.kind === "solid" || s.kind === "generator" ? "gfx" : media?.kind === "image" ? "img" : "v";
  const keys = reactExports.useMemo(() => clipKeyTimes(clip), [clip]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: `clip ${kind}${selected ? " selected" : ""}${media?.offline ? " offline" : ""}${clip.disabled ? " disabled" : ""}`,
      style: { left, width, outline: over ? "2px dashed #f2a33a" : void 0 },
      title: label,
      onPointerDown: (e) => onPointerDown(e, clip, "body"),
      onDoubleClick: () => {
        if (clip.source.kind === "sequence") openSequence(clip.source.sequenceId);
      },
      onContextMenu: (e) => {
        if (!useStore.getState().selection.includes(clip.id)) select([clip.id]);
        const ids = useStore.getState().selection.includes(clip.id) ? useStore.getState().selection : [clip.id];
        const timeable = s.kind === "media" || s.kind === "sequence";
        const cb = useStore.getState().effectClipboard;
        openContextMenu(e, [
          { label: "Copy", keys: "Ctrl+C", run: copyClips },
          { label: "Paste at playhead", keys: "Ctrl+V", disabled: !useStore.getState().clipClipboard, run: pasteClips },
          {
            label: "Attributes & effects",
            children: [
              { label: "Copy attributes", keys: "Ctrl+Alt+C", run: () => copyEffects(clip.id) },
              { label: "Paste attributes (all)", keys: "Ctrl+Alt+V", disabled: !cb, run: () => pasteAttributes() },
              { label: "Paste effects only", disabled: !cb?.effects.length, run: () => pasteAttributes({ effects: true }) },
              { label: "Paste motion only", disabled: !cb?.motion || track.kind !== "video", run: () => pasteAttributes({ motion: true }) },
              {
                label: "Save effects as preset…",
                disabled: !clip.effects.length,
                run: () => {
                  const n = prompt("Preset name", label + " look");
                  if (n) void savePreset(clip.id, n);
                }
              },
              { label: "Remove all effects", disabled: !clip.effects.length, run: () => clearEffects(ids) }
            ]
          },
          { label: "", sep: true },
          { label: "Speed / Duration…", keys: "Ctrl+R", run: () => useStore.setState({ speedOpen: true }) },
          {
            label: "Time",
            disabled: !timeable,
            children: [
              { label: `${clip.reverse ? "✓ " : "   "}Reverse`, run: () => setReverse(ids, !clip.reverse) },
              { label: clip.freeze !== void 0 ? "✓ Frame hold (release)" : "   Frame hold at playhead", run: () => setFreeze(ids, clip.freeze === void 0) },
              { label: `${clip.remap !== void 0 ? "✓ " : "   "}Time remapping`, run: () => setRemap(ids, clip.remap === void 0) }
            ]
          },
          ...track.kind === "video" ? [
            {
              label: "Track matte",
              children: ["none", "alpha", "alphaInverted", "luma", "lumaInverted"].map((m) => ({
                label: `${(clip.trackMatte ?? "none") === m ? "✓ " : "   "}${{ none: "None", alpha: "Alpha matte", alphaInverted: "Alpha inverted matte", luma: "Luma matte", lumaInverted: "Luma inverted matte" }[m]}`,
                run: () => setTrackMatte(ids, m)
              }))
            }
          ] : [],
          { label: "", sep: true },
          { label: clip.disabled ? "Enable" : "Disable", keys: "Shift+E", run: toggleClipEnabled },
          { label: "Nest…", run: nestSelection },
          { label: "", sep: true },
          { label: track.kind === "video" ? "Add Cross Dissolve at start" : "Add Constant Power at start", run: () => applyTransitionAction(clip.id, "in", track.kind === "video" ? "crossDissolve" : "crossfade") },
          { label: track.kind === "video" ? "Add Cross Dissolve at end" : "Add Constant Power at end", run: () => applyTransitionAction(clip.id, "out", track.kind === "video" ? "crossDissolve" : "crossfade") },
          { label: "", sep: true },
          ...clip.source.kind === "sequence" ? [{ label: "Open nested sequence", run: () => openSequence(clip.source.sequenceId) }] : [],
          { label: "Link audio and video", keys: "Ctrl+Alt+L", run: () => linkSelection(true) },
          { label: "Unlink", keys: "Ctrl+Shift+L", disabled: !clip.linkId, run: () => linkSelection(false) },
          { label: "Delete", keys: "Del", run: () => deleteSelection(false) },
          { label: "Ripple delete", keys: "Shift+Del", run: () => deleteSelection(true) }
        ]);
      },
      onDragOver: (e) => {
        if (e.dataTransfer.types.includes(DND_EFFECT)) {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }
      },
      onDragLeave: () => setOver(false),
      onDrop: (e) => {
        const type = e.dataTransfer.getData(DND_EFFECT);
        if (!type) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        addEffect(clip.id, type);
      },
      children: [
        kind !== "a" && media?.thumbUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "thumbstrip", style: { backgroundImage: `url("${media.thumbUrl}")` } }),
        kind === "a" && peaks && /* @__PURE__ */ jsxRuntimeExports.jsx(Waveform, { peaks, from: clip.in, dur: clip.duration, speed: clip.speed, width }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "clip-label", children: [
          clip.linkId && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { title: "Linked audio/video", style: { opacity: 0.7, display: "flex" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "link", size: 11 }) }),
          kind === "seq" && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stack", size: 11 }),
          kind === "gfx" && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: s.kind === "text" ? "text" : s.kind === "generator" ? "gradient" : "shape", size: 11 }),
          kind === "adj" && /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "adjust", size: 11 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "nm", children: label }),
          clip.speed !== 1 && clip.remap === void 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "fxb", children: [
            Math.round(clip.speed * 100),
            "%"
          ] }),
          clip.reverse && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb tb", children: "◀ Rev" }),
          clip.freeze !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb tb", children: "Hold" }),
          clip.remap !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb tb", children: "Remap" }),
          clip.trackMatte && clip.trackMatte !== "none" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb tb", children: "Matte" }),
          (clip.motionTracks?.length ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb", children: "Track" }),
          clip.masks.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb", children: "Mask" }),
          clip.effects.slice(0, 6).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "fxb", style: { opacity: e.enabled ? 1 : 0.45 }, children: effectDef(e.type).name.split(" ")[0] }, e.id)),
          clip.effects.length > 6 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "fxb", children: [
            "+",
            clip.effects.length - 6
          ] })
        ] }),
        keys.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "kf", style: { left: (t - clip.start) * zoom }, "aria-hidden": "true" }, t)),
        !track.locked && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "trim l", onPointerDown: (e) => onPointerDown(e, clip, "l") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "trim r", onPointerDown: (e) => onPointerDown(e, clip, "r") })
        ] })
      ]
    }
  );
}
const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
function Ruler({ seq, zoom, scrollLeft, viewW, onScrub }) {
  const fps = seq.settings.fps;
  const frameStep = 1 / fps;
  let major = STEPS.find((s) => s * zoom >= 90) ?? 600;
  if (zoom * frameStep * 10 >= 90 && 10 * frameStep < 1) major = 10 * frameStep;
  const minor = major / 5;
  const t0 = Math.max(0, Math.floor(Math.max(0, scrollLeft - HDR) / zoom / major) * major);
  const t1 = (scrollLeft + viewW) / zoom + major;
  const ticks = [];
  for (let t = t0; t <= t1; t += minor) {
    const isMajor = Math.abs(t / major - Math.round(t / major)) < 1e-6;
    ticks.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `tick${isMajor ? "" : " minor"}`, style: { left: t * zoom }, children: isMajor && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: timecode(t, fps) }) }, t.toFixed(4))
    );
  }
  const inP = seq.inPoint;
  const outP = seq.outPoint;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ruler", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ruler-corner" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ruler-lane", onPointerDown: onScrub, onPointerMove: (e) => e.buttons === 1 && onScrub(e), children: [
      (inP !== void 0 || outP !== void 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "inout", style: { left: (inP ?? 0) * zoom, width: Math.max(1, ((outP ?? sequenceDuration(seq)) - (inP ?? 0)) * zoom) } }),
      ticks,
      seq.markers.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "marker",
          style: { left: m.t * zoom, ["--c"]: m.color },
          title: `${m.name} · ${timecode(m.t, fps)}`,
          "aria-label": m.name,
          onPointerDown: (e) => {
            e.stopPropagation();
            useStore.setState({ playing: false });
            setTime(m.t);
          },
          onContextMenu: (e) => {
            e.stopPropagation();
            openContextMenu(e, [
              {
                label: "Rename…",
                run: () => {
                  const n = prompt("Marker name", m.name);
                  if (n) commitSeq((q) => q.markers.forEach((x) => x.id === m.id && (x.name = n)));
                }
              },
              { label: "Delete marker", run: () => removeMarker(m.id) }
            ]);
          }
        },
        m.id
      ))
    ] })
  ] });
}
function Meter({ trackId, height }) {
  const refs = [reactExports.useRef(null), reactExports.useRef(null)];
  const box = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let raf = 0;
    const hold = [0, 0];
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = getEngine();
      const lv = (trackId ? e?.trackLevels(trackId) : e?.levels()) ?? [0, 0];
      const H = box.current?.clientHeight ?? 200;
      lv.forEach((v, i) => {
        const db = v > 0 ? 20 * Math.log10(v) : -90;
        const pct = Math.max(0, Math.min(1, (db + 60) / 60));
        hold[i] = Math.max(pct, hold[i] - 0.015);
        const el = refs[i].current;
        if (el) {
          el.style.height = `${hold[i] * 100}%`;
          el.style.setProperty("--h", `${H}px`);
        }
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trackId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "meter-pair", ref: box, style: height ? { height } : void 0, "aria-label": "Audio meter", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "meter", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { ref: refs[0] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "meter", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { ref: refs[1] }) })
  ] });
}
function SeqTabs() {
  const open = useStore((s) => s.openSeqIds);
  const active = useStore((s) => s.activeSeqId);
  const seqs = useStore((s) => s.doc.sequences);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "seq-tabs", role: "tablist", "aria-label": "Open sequences", children: open.map((id) => {
    const s = seqs.find((x) => x.id === id);
    if (!s) return null;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `seq-tab${id === active ? " on" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { role: "tab", "aria-selected": id === active, onClick: () => openSequence(id), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stack", size: 12 }),
        " ",
        s.name
      ] }),
      open.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "x", "aria-label": `Close ${s.name}`, onClick: () => closeSequenceTab(id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "x", size: 11 }) })
    ] }, id);
  }) });
}
function Timeline({ onResize }) {
  const seq = useStore((s) => activeSeq(s));
  const media = useStore((s) => s.media);
  const doc = useStore((s) => s.doc);
  const peaks = useStore((s) => s.peaks);
  const selection = useStore((s) => s.selection);
  const selTr = useStore((s) => s.selectedTransition);
  const zoom = useStore((s) => s.zoom);
  const tool = useStore((s) => s.tool);
  const time = useStore((s) => s.time);
  const playing = useStore((s) => s.playing);
  const snapping = useStore((s) => s.snapping);
  const linkedSel = useStore((s) => s.linkedSelection);
  const scrollRef = reactExports.useRef(null);
  const innerRef = reactExports.useRef(null);
  const drag = reactExports.useRef(null);
  const [snapAt, setSnapAt] = reactExports.useState(null);
  const [dropTrack, setDropTrack] = reactExports.useState(null);
  const [trDrop, setTrDrop] = reactExports.useState(null);
  const [view, setView] = reactExports.useState({ left: 0, width: 1e3 });
  const fps = seq.settings.fps;
  const dur = sequenceDuration(seq);
  const contentW = Math.max(dur + 30, view.width / zoom) * zoom;
  const selSet = reactExports.useMemo(() => new Set(selection), [selection]);
  const videoTracks = seq.tracks.filter((t) => t.kind === "video").reverse();
  const audioTracks = seq.tracks.filter((t) => t.kind === "audio");
  const p = { doc, media };
  reactExports.useEffect(() => {
    const el = scrollRef.current;
    const update = () => setView({ left: el.scrollLeft, width: el.clientWidth });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  reactExports.useEffect(() => {
    if (!playing) return;
    const el = scrollRef.current;
    const x = HDR + time * zoom;
    if (x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = x - HDR - 40;
  }, [time, playing, zoom]);
  const timeAt = (clientX) => {
    const r = innerRef.current.getBoundingClientRect();
    return Math.max(0, (clientX - r.left - HDR) / zoom);
  };
  const trackAt = (clientX, clientY) => {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const id = el.closest?.("[data-track-id]")?.getAttribute("data-track-id");
      if (id) return id;
    }
    return null;
  };
  const scrub = (e) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    useStore.setState({ playing: false });
    let t = timeAt(e.clientX);
    if (snapping && !e.shiftKey) {
      const s = snapDelta([t], snapPoints(seq, /* @__PURE__ */ new Set(), -1), SNAP_PX / zoom);
      if (s) t += s.delta;
    }
    setTime(quant(t, fps));
  };
  const onClipDown = (e, clip, part) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const track = seq.tracks.find((t) => t.id === clip.trackId);
    if (tool === "razor") {
      const t = quant(timeAt(e.clientX), fps);
      const ids2 = e.shiftKey ? seq.clips.filter((c) => t > c.start && t < clipEnd(c)).map((c) => c.id) : [clip.id];
      commitSeq((q) => void splitClips(q, ids2, t, linkedSel));
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      const linked = withLinked(seq, [clip.id], linkedSel);
      const isSel = selSet.has(clip.id);
      useStore.setState({ selection: isSel ? selection.filter((id) => !linked.includes(id)) : [.../* @__PURE__ */ new Set([...selection, ...linked])], selectedTransition: null });
      return;
    }
    if (!selSet.has(clip.id)) select([clip.id], e.shiftKey);
    else useStore.setState({ selectedTransition: null });
    if (track?.locked) return;
    const sel = selSet.has(clip.id) ? selection : e.shiftKey ? [...selection, clip.id] : [clip.id];
    let ids = e.altKey ? [clip.id] : withLinked(seq, part === "body" && tool === "select" ? sel : [clip.id], linkedSel);
    const lockedTracks = new Set(seq.tracks.filter((t) => t.locked).map((t) => t.id));
    ids = ids.filter((id) => {
      const c = seq.clips.find((x) => x.id === id);
      return c && !lockedTracks.has(c.trackId);
    });
    const orig = new Map(ids.map((id) => [id, structuredClone(seq.clips.find((c) => c.id === id))]));
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      mode: tool === "slip" && part === "body" ? "slip" : part === "body" ? "move" : part,
      x: e.clientX,
      anchorId: clip.id,
      anchorTrack: clip.trackId,
      ids,
      orig,
      moved: false
    };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 3 && (d.mode !== "move" || trackAt(e.clientX, e.clientY) === d.anchorTrack)) return;
    if (!d.moved) beginTx();
    d.moved = true;
    let dt = dx / zoom;
    const exclude = new Set(d.ids);
    const points = snapPoints(seq, exclude, useStore.getState().time);
    const threshold = snapping && !e.shiftKey ? SNAP_PX / zoom : 0;
    const origs = [...d.orig.values()];
    const pj = project();
    let snapped = null;
    if (d.mode === "move") {
      const edges = origs.flatMap((c) => [c.start + dt, clipEnd(c) + dt]);
      const s = threshold ? snapDelta(edges, points, threshold) : null;
      if (s) {
        dt += s.delta;
        snapped = s.at;
      }
      const minStart = Math.min(...origs.map((c) => c.start));
      if (minStart + dt < 0) dt = -minStart;
      const anchorKind = seq.tracks.find((t) => t.id === d.anchorTrack)?.kind;
      const sameKind = seq.tracks.filter((t) => t.kind === anchorKind);
      const hovered = trackAt(e.clientX, e.clientY);
      const hi = sameKind.findIndex((t) => t.id === hovered);
      const ai = sameKind.findIndex((t) => t.id === d.anchorTrack);
      let shift = hi >= 0 && ai >= 0 ? hi - ai : 0;
      if (shift !== 0) {
        for (const c of origs) {
          const idx = sameKind.findIndex((t) => t.id === c.trackId);
          if (idx < 0) continue;
          const ni = idx + shift;
          if (ni < 0 || ni >= sameKind.length || sameKind[ni].locked) shift = 0;
        }
      }
      commitSeq((q) => {
        for (const c of q.clips) {
          const o = d.orig.get(c.id);
          if (!o) continue;
          c.start = quant(o.start + dt, fps);
          const idx = sameKind.findIndex((t) => t.id === o.trackId);
          c.trackId = idx >= 0 ? sameKind[idx + shift].id : o.trackId;
        }
      }, true);
    } else if (d.mode === "l" || d.mode === "r") {
      const anchor = d.orig.get(d.anchorId);
      const edge = d.mode === "l" ? anchor.start + dt : clipEnd(anchor) + dt;
      const s = threshold ? snapDelta([edge], points, threshold) : null;
      if (s) {
        dt += s.delta;
        snapped = s.at;
      }
      const minLen = 1 / fps;
      for (const o of origs) {
        const md = mediaDuration(pj, o);
        if (d.mode === "l") {
          dt = Math.max(dt, -o.in / o.speed, -o.start);
          dt = Math.min(dt, o.duration - minLen);
        } else {
          dt = Math.max(dt, minLen - o.duration);
          dt = Math.min(dt, (md - o.in) / o.speed - o.duration);
        }
      }
      commitSeq((q) => {
        for (const c of q.clips) {
          const o = d.orig.get(c.id);
          if (!o) continue;
          if (d.mode === "l") {
            const qd = quant(o.start + dt, fps) - o.start;
            c.start = o.start + qd;
            c.in = o.in + qd * o.speed;
            c.duration = o.duration - qd;
          } else {
            c.duration = quant(clipEnd(o) + dt, fps) - o.start;
          }
        }
      }, true);
    } else if (d.mode === "slip") {
      for (const o of origs) {
        const md = mediaDuration(pj, o);
        dt = Math.min(dt, o.in / o.speed);
        dt = Math.max(dt, (o.in + o.duration * o.speed - md) / o.speed);
      }
      commitSeq((q) => {
        for (const c of q.clips) {
          const o = d.orig.get(c.id);
          if (o) c.in = Math.max(0, o.in - dt * o.speed);
        }
      }, true);
    }
    setSnapAt(snapped);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setSnapAt(null);
    if (!d || !d.moved) return;
    if (d.mode !== "slip") {
      commitSeq((q) => {
        for (const id of d.ids) {
          const c = q.clips.find((x) => x.id === id);
          if (c) clearRange(q, c.trackId, c.start, clipEnd(c), new Set(d.ids));
        }
      }, true);
    }
    endTx();
  };
  const transitionTarget = (e, track) => {
    const t = timeAt(e.clientX);
    const clips = seq.clips.filter((c) => c.trackId === track.id);
    let best = null;
    for (const c of clips) {
      for (const [edge, et] of [
        ["in", c.start],
        ["out", clipEnd(c)]
      ]) {
        const dd = Math.abs(et - t);
        const inside = t >= c.start - 0.5 && t <= clipEnd(c) + 0.5;
        if (inside && (!best || dd < best.d)) best = { clipId: c.id, edge, d: dd };
      }
    }
    return best && best.d * zoom < Math.max(60, 0.4 * zoom) ? { clipId: best.clipId, edge: best.edge } : null;
  };
  const onLaneDragOver = (e, track) => {
    const types = e.dataTransfer.types;
    if (track.locked) return;
    if (types.includes(DND_TRANSITION)) {
      e.preventDefault();
      const tt = transitionTarget(e, track);
      if (JSON.stringify(tt) !== JSON.stringify(trDrop)) setTrDrop(tt);
      return;
    }
    if (types.includes(DND_MEDIA) || types.includes(DND_SEQ) || types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (dropTrack !== track.id) setDropTrack(track.id);
    }
  };
  const onLaneDrop = async (e, track) => {
    e.preventDefault();
    setDropTrack(null);
    const trType = e.dataTransfer.getData(DND_TRANSITION);
    if (trType) {
      const tt = transitionTarget(e, track);
      setTrDrop(null);
      if (!tt) return;
      if (transitionDef(trType).audio !== (track.kind === "audio")) {
        toast(track.kind === "audio" ? "Use an audio transition on audio tracks." : "Use a video transition on video tracks.", "error");
        return;
      }
      applyTransitionAction(tt.clipId, tt.edge, trType);
      return;
    }
    let t = quant(timeAt(e.clientX), fps);
    if (snapping) {
      const s = snapDelta([t], snapPoints(seq, /* @__PURE__ */ new Set(), useStore.getState().time), SNAP_PX / zoom);
      if (s) t += s.delta;
    }
    const mediaId = e.dataTransfer.getData(DND_MEDIA);
    if (mediaId) return addSourceToTimeline({ kind: "media", mediaId }, track.id, t);
    const seqId = e.dataTransfer.getData(DND_SEQ);
    if (seqId) return addSourceToTimeline({ kind: "sequence", sequenceId: seqId }, track.id, t);
    const paths = [...e.dataTransfer.files].map((f) => window.cuttingfloor.pathForFile(f)).filter(Boolean);
    if (!paths.length) return;
    const items = await importPaths(paths);
    let at = t;
    for (const m of items) {
      addSourceToTimeline({ kind: "media", mediaId: m.id }, track.id, at);
      at += m.kind === "image" ? 5 : m.duration;
    }
  };
  const renderTransitions = (track) => {
    const out = [];
    for (const c of seq.clips) {
      if (c.trackId !== track.id) continue;
      for (const edge of ["in", "out"]) {
        const tr = edge === "in" ? c.transitionIn : c.transitionOut;
        if (!tr) continue;
        const w = edge === "in" ? headWindow(seq, c) : tailWindow(seq, c);
        if (!w || edge === "out" && w.b) continue;
        const on = selTr?.clipId === c.id && selTr.edge === edge;
        out.push(
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `trans${on ? " on" : ""}`,
              style: { left: w.start * zoom, width: Math.max(6, (w.end - w.start) * zoom) },
              title: `${transitionDef(tr.type).name} · ${tr.duration.toFixed(2)} s`,
              "aria-label": transitionDef(tr.type).name,
              onPointerDown: (e) => {
                e.stopPropagation();
                useStore.setState({ selectedTransition: { clipId: c.id, edge }, selection: [] });
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: transitionDef(tr.type).name })
            },
            c.id + edge
          )
        );
      }
    }
    if (trDrop) {
      const c = seq.clips.find((x) => x.id === trDrop.clipId && x.trackId === track.id);
      if (c) {
        const x = trDrop.edge === "in" ? c.start : clipEnd(c);
        out.push(/* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "trans-drop", style: { left: x * zoom - 20 } }, "trdrop"));
      }
    }
    return out;
  };
  const renderTrack = (track) => {
    const isV = track.kind === "video";
    const label = trackLabel(seq, track);
    const clips = seq.clips.filter((c) => c.trackId === track.id);
    const off = isV ? track.hidden : track.muted;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "track", style: { height: TRACK_H[track.kind] }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "track-hdr",
          onContextMenu: (e) => openContextMenu(e, [
            {
              label: "Rename track…",
              run: () => {
                const n = prompt("Track name", track.name ?? "");
                if (n !== null) updateTrack(track.id, (t) => t.name = n || void 0);
              }
            },
            { label: `Add ${isV ? "video" : "audio"} track`, run: () => addTrack(track.kind) },
            { label: "Delete track", run: () => deleteTrack(track.id) }
          ]),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `track-badge ${isV ? "v" : "a"}`, children: label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim tname", children: track.name ?? (isV ? "Video" : "Audio") }),
            !isV && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn tb${track.solo ? " solo" : ""}`, "aria-label": "Solo track", title: "Solo", "aria-pressed": track.solo, onClick: () => updateTrack(track.id, (t) => t.solo = !t.solo), children: "S" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: `icon-btn${off ? " off" : ""}`,
                "aria-label": isV ? "Toggle track output" : "Mute track",
                title: isV ? "Toggle track output" : "Mute track",
                onClick: () => updateTrack(track.id, (t) => isV ? t.hidden = !t.hidden : t.muted = !t.muted),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: isV ? off ? "eyeOff" : "eye" : off ? "mute" : "speaker", size: 14 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${track.locked ? " on" : ""}`, "aria-label": "Lock track", title: "Lock track", onClick: () => updateTrack(track.id, (t) => t.locked = !t.locked), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: track.locked ? "lock" : "unlock", size: 14 }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: `lane${dropTrack === track.id ? " drop" : ""}${track.locked ? " locked" : ""}`,
          "data-track-id": track.id,
          onPointerDown: (e) => {
            if (e.target === e.currentTarget) {
              select([]);
              useStore.setState({ selectedTransition: null });
            }
          },
          onDragOver: (e) => onLaneDragOver(e, track),
          onDragLeave: () => {
            setDropTrack(null);
            setTrDrop(null);
          },
          onDrop: (e) => void onLaneDrop(e, track),
          children: [
            clips.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              ClipView,
              {
                clip: c,
                media: c.source.kind === "media" ? media[c.source.mediaId] : void 0,
                label: clipLabel(p, c),
                track,
                zoom,
                selected: selSet.has(c.id),
                peaks: c.source.kind === "media" ? peaks[c.source.mediaId] : void 0,
                onPointerDown: onClipDown
              },
              c.id
            )),
            renderTransitions(track)
          ]
        }
      )
    ] }, track.id);
  };
  const setZoom = (z, anchorClientX) => {
    const el = scrollRef.current;
    const r = el.getBoundingClientRect();
    const nz = Math.max(2, Math.min(2e3, z));
    const ax = anchorClientX ?? r.left + HDR + time * zoom - el.scrollLeft;
    const tAt = (ax - r.left + el.scrollLeft - HDR) / zoom;
    useStore.setState({ zoom: nz });
    requestAnimationFrame(() => {
      el.scrollLeft = Math.max(0, tAt * nz + HDR - (ax - r.left));
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: `timeline ${tool}-cursor`, "aria-label": "Timeline", style: { ["--hdr-w"]: `${HDR}px` }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "tl-resize",
        onPointerDown: (e) => {
          e.target.setPointerCapture(e.pointerId);
          e.target.dataset.y = String(e.clientY);
        },
        onPointerMove: (e) => {
          const el = e.target;
          if (!el.dataset.y || e.buttons !== 1) return;
          onResize(Number(el.dataset.y) - e.clientY);
          el.dataset.y = String(e.clientY);
        },
        onPointerUp: (e) => delete e.target.dataset.y
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "toolstrip", children: TOOLS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${tool === t.id ? " on" : ""}`, title: t.label, "aria-label": t.label, "aria-pressed": tool === t.id, onClick: () => useStore.setState({ tool: t.id }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: t.icon, size: 18 }) }, t.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tl-main", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tl-bar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SeqTabs, {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `icon-btn${linkedSel ? " on" : ""}`,
            title: linkedSel ? "Linked selection on: audio and video move together (Ctrl+L)" : "Linked selection off: audio and video move independently (Ctrl+L)",
            "aria-label": "Linked selection",
            "aria-pressed": linkedSel,
            onClick: toggleLinkedSelection,
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "link", size: 16 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${snapping ? " on" : ""}`, title: "Snapping (S)", "aria-label": "Snapping", "aria-pressed": snapping, onClick: () => useStore.setState({ snapping: !snapping }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "magnet", size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Zoom out (-)", "aria-label": "Zoom out", onClick: () => setZoom(zoom / 1.5), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "zoomOut", size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "slider", style: { width: 110 }, type: "range", "aria-label": "Timeline zoom", min: 0, max: 1, step: 1e-3, value: Math.log(zoom / 2) / Math.log(1e3), onChange: (e) => setZoom(2 * Math.pow(1e3, Number(e.target.value))) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Zoom in (=)", "aria-label": "Zoom in", onClick: () => setZoom(zoom * 1.5), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "zoomIn", size: 16 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Zoom to fit (\\)", "aria-label": "Zoom to fit", onClick: () => dur > 0 && setZoom((view.width - HDR - 40) / dur), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "guides", size: 16 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "tl-scroll",
          ref: scrollRef,
          onScroll: (e) => setView({ left: e.currentTarget.scrollLeft, width: e.currentTarget.clientWidth }),
          onWheel: (e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX);
            } else if (e.shiftKey && scrollRef.current) {
              scrollRef.current.scrollLeft += e.deltaY;
            }
          },
          onPointerMove,
          onPointerUp,
          onPointerCancel: onPointerUp,
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tl-inner", ref: innerRef, style: { width: HDR + contentW }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Ruler, { seq, zoom, scrollLeft: view.left, viewW: view.width, onScrub: scrub }),
            videoTracks.map(renderTrack),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "track-sep" }),
            audioTracks.map(renderTrack),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "add-track", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn sm", onClick: () => addTrack("video"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 13 }),
                " Video"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn sm", onClick: () => addTrack("audio"), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 13 }),
                " Audio"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "playhead", style: { left: HDR + time * zoom } }),
            snapAt !== null && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "snapline", style: { left: HDR + snapAt * zoom } })
          ] })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "meters", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Meter, {}) })
  ] });
}
function zoomTimeline(factor) {
  const z = useStore.getState().zoom;
  useStore.setState({ zoom: Math.max(2, Math.min(2e3, z * factor)) });
}
function Inserts({ busId, effects, sel, onSel }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inserts", "aria-label": "Insert effects", children: [
    effects.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `insert${sel?.effectId === e.id ? " on" : ""}${e.enabled ? "" : " off"}`, title: `${effectDef(e.type).name}: click to edit`, onClick: () => onSel(sel?.effectId === e.id ? null : { busId, effectId: e.id }), children: effectDef(e.type).name }, e.id)),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "select",
      {
        className: "insert add",
        "aria-label": "Add insert effect",
        value: "",
        onChange: (ev) => {
          if (ev.target.value) addBusEffect(busId, ev.target.value);
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "+ insert" }),
          AUDIO_CATEGORIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: c, children: EFFECTS.filter((x) => x.category === c).map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: x.type, children: x.name }, x.type)) }, c))
        ]
      }
    )
  ] });
}
function InsertEditor({ sel, onClose }) {
  const seq = useStore((s) => activeSeq(s));
  const fx2 = busEffects(seq, sel.busId).find((e) => e.id === sel.effectId);
  if (!fx2) return null;
  const def = effectDef(fx2.type);
  const bus = sel.busId === MASTER ? "Master" : trackLabel(seq, seq.tracks.find((t) => t.id === sel.busId));
  const upd = (fn, live = false) => updateBusEffect(sel.busId, fx2.id, fn, live);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "insert-editor", role: "region", "aria-label": `${def.name} on ${bus}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: def.name }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tag", children: bus }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${fx2.enabled ? "" : " off"}`, title: fx2.enabled ? "Bypass" : "Enable", "aria-label": "Toggle bypass", onClick: () => upd((e) => e.enabled = !e.enabled), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: fx2.enabled ? "eye" : "eyeOff", size: 15 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Move earlier in the chain", "aria-label": "Move up", onClick: () => moveBusEffect(sel.busId, fx2.id, -1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "chevronL", size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Move later in the chain", "aria-label": "Move down", onClick: () => moveBusEffect(sel.busId, fx2.id, 1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "chevronR", size: 14 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Reset", "aria-label": "Reset", onClick: () => upd((e) => def.params.forEach((p) => e.params[p.key] = p.default)), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "reset", size: 15 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "icon-btn",
          title: "Remove",
          "aria-label": "Remove",
          onClick: () => {
            removeBusEffect(sel.busId, fx2.id);
            onClose();
          },
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "trash", size: 15 })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Close", "aria-label": "Close", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "x", size: 15 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "insert-params", children: def.params.map(
      (p) => p.kind === "number" ? /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: p.label, value: Number(fx2.params[p.key] ?? p.default), min: p.min, max: p.max, step: p.step, unit: p.unit, onChange: (v, live) => upd((e) => e.params[p.key] = v, live) }, p.key) : p.kind === "bool" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": p.label, checked: Boolean(fx2.params[p.key] ?? p.default), onChange: (ev) => upd((e) => e.params[p.key] = ev.target.checked) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }, p.key) : p.kind === "enum" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": p.label, value: String(fx2.params[p.key] ?? p.default), onChange: (ev) => upd((e) => e.params[p.key] = ev.target.value), children: p.options.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }, p.key) : null
    ) })
  ] });
}
const fmt = (v, d = 1) => v === void 0 || !Number.isFinite(v) ? "–" : v.toFixed(d);
function Loudness() {
  const [r, setR] = reactExports.useState(null);
  const [target, setTarget] = reactExports.useState(-14);
  reactExports.useEffect(() => {
    const id = window.setInterval(() => setR(getEngine()?.loudness() ?? null), 100);
    return () => window.clearInterval(id);
  }, []);
  const st = r?.shortTerm ?? -Infinity;
  const pct = (v) => Math.max(0, Math.min(100, (v + 40) / 40 * 100));
  const tpHot = (r?.truePeak ?? -Infinity) > -1;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "loudness", "aria-label": "Loudness meter", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Loudness" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tag", children: "LUFS" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "mini-select", "aria-label": "Loudness target", value: target, onChange: (e) => setTarget(Number(e.target.value)), title: "Reference line", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -14, children: "−14 · streaming" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -16, children: "−16 · podcast" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -23, children: "−23 · EBU R128" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -24, children: "−24 · ATSC A/85" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", title: "Restart the integrated measurement", onClick: () => getEngine()?.resetLoudness(), children: "Reset" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lu-bar", title: "Short-term loudness against the target", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lu-fill", style: { width: `${pct(st)}%`, background: Math.abs(st - target) <= 1 ? "var(--ok, #3ccf8e)" : st > target ? "#7096bc" : "#5aa9ff" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lu-target", style: { left: `${pct(target)}%` } })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lu-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Momentary" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "mono", children: fmt(r?.momentary) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Short-term" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "mono", children: fmt(r?.shortTerm) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Integrated" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { className: "mono", children: fmt(r?.integrated) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Range (LRA)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { className: "mono", children: [
        fmt(r?.range),
        " LU"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "True peak" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("b", { className: `mono${tpHot ? " hot" : ""}`, children: [
        fmt(r?.truePeak),
        " dBTP"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", children: "Play the sequence to measure. Export can normalise to a target automatically (Export → Loudness)." })
  ] });
}
function Strip({ track, label, sel, onSel }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "strip-name", title: track.name ?? label, children: [
      label,
      track.name ? ` · ${track.name}` : ""
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Inserts, { busId: track.id, effects: track.effects ?? [], sel, onSel }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip-pan", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "slider",
          type: "range",
          min: -100,
          max: 100,
          step: 1,
          "aria-label": `${label} pan`,
          value: track.pan,
          onPointerDown: beginTx,
          onPointerUp: endTx,
          onDoubleClick: () => updateTrack(track.id, (t) => t.pan = 0),
          onChange: (e) => updateTrack(track.id, (t) => t.pan = Number(e.target.value), true)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mono dim", children: track.pan === 0 ? "C" : track.pan < 0 ? `L${-track.pan}` : `R${track.pan}` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip-body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Meter, { trackId: track.id }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "fader",
          type: "range",
          min: -60,
          max: 12,
          step: 0.1,
          "aria-label": `${label} volume`,
          value: track.volume,
          onPointerDown: beginTx,
          onPointerUp: endTx,
          onDoubleClick: () => updateTrack(track.id, (t) => t.volume = 0),
          onChange: (e) => updateTrack(track.id, (t) => t.volume = Number(e.target.value), true)
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      NumberField,
      {
        label: `${label} volume`,
        value: track.volume,
        min: -60,
        max: 12,
        step: 0.1,
        unit: " dB",
        onBegin: beginTx,
        onChange: (v, live) => {
          updateTrack(track.id, (t) => t.volume = v, true);
          if (!live) endTx();
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip-btns", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `ms${track.muted ? " m" : ""}`, "aria-pressed": track.muted, onClick: () => updateTrack(track.id, (t) => t.muted = !t.muted), children: "M" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `ms${track.solo ? " s" : ""}`, "aria-pressed": track.solo, onClick: () => updateTrack(track.id, (t) => t.solo = !t.solo), children: "S" })
    ] })
  ] });
}
function AudioMixer() {
  const seq = useStore((s) => activeSeq(s));
  const tracks = seq.tracks.filter((t) => t.kind === "audio");
  const [sel, setSel] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Audio mixer", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Audio Track Mixer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: seq.name })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mixer", children: [
      tracks.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(Strip, { track: t, label: trackLabel(seq, t), sel, onSel: setSel }, t.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip master", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "strip-name", children: "Master" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Inserts, { busId: MASTER, effects: seq.masterEffects ?? [], sel, onSel: setSel }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "strip-pan" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "strip-body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Meter, {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "fader",
              type: "range",
              min: -60,
              max: 12,
              step: 0.1,
              "aria-label": "Master volume",
              value: seq.masterVolume,
              onPointerDown: beginTx,
              onPointerUp: endTx,
              onDoubleClick: () => commitSeq((q) => q.masterVolume = 0),
              onChange: (e) => commitSeq((q) => q.masterVolume = Number(e.target.value), true)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          NumberField,
          {
            label: "Master volume",
            value: seq.masterVolume,
            min: -60,
            max: 12,
            step: 0.1,
            unit: " dB",
            onBegin: beginTx,
            onChange: (v, live) => {
              commitSeq((q) => q.masterVolume = v, true);
              if (!live) endTx();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "strip-btns" })
      ] })
    ] }),
    sel && /* @__PURE__ */ jsxRuntimeExports.jsx(InsertEditor, { sel, onClose: () => setSel(null) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Loudness, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px 10px" }, children: "Signal flow: clip effects → clip volume/pan → track inserts → fader → master inserts → master. Clip effects are in Effect Controls (left). Double-click a fader to reset." })
  ] });
}
function CurveEditor({ value, onChange, tint = "#e6e8ec", size = 220, label }) {
  const S = size;
  const pts = parseCurve(value || "0,0;1,1");
  const drag = reactExports.useRef(null);
  const table = curveTable(pts, 64);
  const path = Array.from(table, (y, i) => `${(i / 63 * S).toFixed(1)},${((1 - Math.max(0, Math.min(1, y))) * S).toFixed(1)}`).join(" ");
  const write = (next, live) => onChange(serializeCurve(next), live);
  const toPt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))];
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "curve-wrap", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        className: "curve",
        role: "img",
        "aria-label": label ?? "Curve",
        viewBox: `0 0 ${S} ${S}`,
        style: { maxWidth: S },
        onPointerDown: (e) => {
          const [x, y] = toPt(e);
          const hit = pts.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.05);
          e.currentTarget.setPointerCapture(e.pointerId);
          beginTx();
          if (hit >= 0) drag.current = hit;
          else {
            const next = [...pts, [x, y]].sort((a, b) => a[0] - b[0]);
            drag.current = next.findIndex((p) => p[0] === x && p[1] === y);
            write(next, true);
          }
        },
        onPointerMove: (e) => {
          const i = drag.current;
          if (i === null) return;
          const [x, y] = toPt(e);
          const next = pts.map((p) => [...p]);
          if (i >= next.length) return;
          const isEnd = i === 0 || i === next.length - 1;
          next[i] = [isEnd ? next[i][0] : Math.max(next[i - 1][0] + 0.01, Math.min(next[i + 1][0] - 0.01, x)), y];
          write(next, true);
        },
        onPointerUp: () => {
          if (drag.current !== null) {
            drag.current = null;
            endTx();
          }
        },
        onDoubleClick: (e) => {
          const [x, y] = toPt(e);
          const hit = pts.findIndex(([px, py], i) => i > 0 && i < pts.length - 1 && Math.hypot(px - x, py - y) < 0.05);
          if (hit > 0) write(pts.filter((_, i) => i !== hit), false);
        },
        children: [
          [0.25, 0.5, 0.75].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: f * S, x2: f * S, y1: 0, y2: S, className: "gline" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { y1: f * S, y2: f * S, x1: 0, x2: S, className: "gline" })
          ] }, f)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: 0, y1: S, x2: S, y2: 0, className: "gline diag" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: path, className: "gcurve", style: { stroke: tint } }),
          pts.map(([x, y], i) => /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: x * S, cy: (1 - y) * S, r: 5, className: "gkey" }, i))
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "curve-help", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: "Click to add a point, drag to shape, double-click to remove." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => write([[0, 0], [1, 1]], false), children: "Reset" })
    ] })
  ] });
}
function Wheel({ clip, fx: fx2, prefix, label }) {
  const time = useStore((s) => s.time);
  const lt = clipLocalTime(clip, time);
  const hue = evalNum(fx2.params[prefix + "Hue"], lt);
  const sat = evalNum(fx2.params[prefix + "Sat"], lt);
  const R = 56;
  const a = hue * Math.PI / 180;
  const px = R + Math.cos(a) * (sat / 100) * R;
  const py = R - Math.sin(a) * (sat / 100) * R;
  const set2 = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - R;
    const dy = R - (e.clientY - r.top);
    const s = Math.min(100, Math.hypot(dx, dy) / R * 100);
    let h = Math.atan2(dy, dx) * 180 / Math.PI;
    if (h < 0) h += 360;
    setParamValue(clip.id, `effects.${fx2.id}.${prefix}Hue`, Math.round(h), true);
    setParamValue(clip.id, `effects.${fx2.id}.${prefix}Sat`, Math.round(s * 10) / 10, true);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "wheel-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "svg",
      {
        className: "wheel",
        width: R * 2,
        height: R * 2,
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          beginTx();
          set2(e);
        },
        onPointerMove: (e) => e.buttons === 1 && set2(e),
        onPointerUp: endTx,
        onDoubleClick: () => {
          beginTx();
          setParamValue(clip.id, `effects.${fx2.id}.${prefix}Sat`, 0, true);
          endTx();
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("defs", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("radialGradient", { id: `wg-${prefix}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "0%", stopColor: "#9aa0aa", stopOpacity: "0.9" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("stop", { offset: "100%", stopColor: "#9aa0aa", stopOpacity: "0" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: R, cy: R, r: R - 1, fill: `url(#wg-${prefix})` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: px, cy: py, r: 6, className: "puck" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `effects.${fx2.id}.${prefix}Lum`, label: "Level", min: -100, max: 100, step: 1 })
  ] });
}
function ColorPanel() {
  const clip = useStore(primarySelection);
  const seq = useStore((s) => activeSeq(s));
  const [tab, setTab] = reactExports.useState("basic");
  if (!clip || trackOf(seq, clip)?.kind !== "video") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Color", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-head", children: /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Lumetri Color" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty", children: "Select a video clip to grade it." })
    ] });
  }
  const fx2 = clip.effects.find((e) => e.type === "lumetri");
  const lut = clip.effects.find((e) => e.type === "lut");
  if (!fx2) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Color", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-head", children: /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Lumetri Color" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "This clip has no grade yet." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-primary", onClick: () => ensureLumetri(clip.id), children: "Add Lumetri Color" })
      ] })
    ] });
  }
  const def = effectDef("lumetri");
  const rows = (group) => def.params.filter((p) => p.group === group && p.kind === "number").map((p) => p.kind === "number" && /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `effects.${fx2.id}.${p.key}`, label: p.label, min: p.min, max: p.max, step: p.step, unit: p.unit }, p.key)).filter(Boolean);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Color", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Lumetri Color" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${fx2.enabled ? "" : " off"}`, title: fx2.enabled ? "Bypass grade" : "Enable grade", "aria-label": "Toggle grade", onClick: () => updateEffect(clip.id, fx2.id, (e) => e.enabled = !e.enabled), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: fx2.enabled ? "eye" : "eyeOff", size: 15 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", role: "tablist", children: ["basic", "creative", "curves", "wheels"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": tab === t, onClick: () => setTab(t), children: t[0].toUpperCase() + t.slice(1) }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
      tab === "basic" && rows("Basic"),
      tab === "creative" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        rows("Creative"),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-group", children: "Look (LUT)" }),
        lut ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "LUT" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { overflow: "hidden", textOverflow: "ellipsis" }, children: String(lut.params.path || "None").split("/").pop() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "add-fx", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn", onClick: () => addEffect(clip.id, "lut"), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 14 }),
          " Add LUT"
        ] }) }),
        lut && /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `effects.${lut.id}.intensity`, label: "Intensity", min: 0, max: 100, step: 1, unit: "%" }),
        lut && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px" }, children: "Choose the .cube file in Effect Controls (Edit workspace)." })
      ] }),
      tab === "curves" && /* @__PURE__ */ jsxRuntimeExports.jsx(CurveEditor, { label: "RGB curve", value: String(fx2.params.curve ?? "0,0;1,1"), onChange: (v, live) => updateEffect(clip.id, fx2.id, (e) => e.params.curve = v, live) }),
      tab === "wheels" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "wheels", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Wheel, { clip, fx: fx2, prefix: "lift", label: "Shadows" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Wheel, { clip, fx: fx2, prefix: "gamma", label: "Midtones" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Wheel, { clip, fx: fx2, prefix: "gain", label: "Highlights" })
      ] })
    ] })
  ] });
}
function Scopes() {
  const [mode, setMode] = reactExports.useState("waveform");
  const canvas = reactExports.useRef(null);
  reactExports.useEffect(() => {
    let last = 0;
    let attached = false;
    const W = 256;
    const H = 144;
    const draw = () => {
      const now = performance.now();
      if (now - last < 80) return;
      last = now;
      const e = getEngine();
      const cv = canvas.current;
      if (!e || !cv) return;
      const px = e.scopes(W, H);
      if (!px) return;
      const g = cv.getContext("2d");
      const cw = cv.width;
      const ch = cv.height;
      const img = g.createImageData(cw, ch);
      const acc = new Float32Array(cw * ch * 3);
      const plot = (x, y, r, gg, b) => {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        if (xi < 0 || yi < 0 || xi >= cw || yi >= ch) return;
        const k = (yi * cw + xi) * 3;
        acc[k] += r;
        acc[k + 1] += gg;
        acc[k + 2] += b;
      };
      if (mode === "histogram") {
        const bins = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
        for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) bins[c][px[i + c]]++;
        const max = Math.max(...bins.flatMap((b) => Array.from(b.slice(1, 255))));
        for (let c = 0; c < 3; c++)
          for (let x = 0; x < 256; x++) {
            const h = Math.min(1, bins[c][x] / max) * ch;
            for (let y = 0; y < h; y++) plot(x / 255 * (cw - 1), ch - 1 - y, c === 0 ? 0.5 : 0, c === 1 ? 0.5 : 0, c === 2 ? 0.5 : 0);
          }
      } else {
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const r = px[i] / 255;
            const gg = px[i + 1] / 255;
            const b = px[i + 2] / 255;
            if (mode === "waveform") {
              const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
              plot(x / W * cw, (1 - l) * (ch - 1), 0.12, 0.2, 0.12);
            } else if (mode === "parade") {
              const third = cw / 3;
              plot(x / W * third, (1 - r) * (ch - 1), 0.25, 0.05, 0.05);
              plot(third + x / W * third, (1 - gg) * (ch - 1), 0.05, 0.25, 0.05);
              plot(2 * third + x / W * third, (1 - b) * (ch - 1), 0.05, 0.08, 0.3);
            } else {
              const yv = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
              const cb = (b - yv) / 1.8556;
              const cr = (r - yv) / 1.5748;
              const s = Math.min(cw, ch) * 0.9;
              plot(cw / 2 + cb * s, ch / 2 - cr * s, 0.15, 0.2, 0.15);
            }
          }
      }
      for (let i = 0, j = 0; i < acc.length; i += 3, j += 4) {
        img.data[j] = Math.min(255, acc[i] * 255);
        img.data[j + 1] = Math.min(255, acc[i + 1] * 255);
        img.data[j + 2] = Math.min(255, acc[i + 2] * 255);
        img.data[j + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      g.strokeStyle = "#ffffff22";
      g.lineWidth = 1;
      if (mode === "vectorscope") {
        g.beginPath();
        g.arc(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.moveTo(cw / 2, ch / 2);
        g.lineTo(cw / 2 + Math.cos(-123 * Math.PI / 180) * ch * 0.45, ch / 2 + Math.sin(-123 * Math.PI / 180) * ch * 0.45);
        g.stroke();
      } else if (mode !== "histogram") {
        for (const f of [0, 0.25, 0.5, 0.75, 1]) {
          g.beginPath();
          g.moveTo(0, f * (ch - 1) + 0.5);
          g.lineTo(cw, f * (ch - 1) + 0.5);
          g.stroke();
        }
      }
    };
    const iv = setInterval(() => {
      const e = getEngine();
      if (e && !attached) {
        e.onFrame = draw;
        e.invalidate();
        attached = true;
      }
    }, 200);
    return () => {
      clearInterval(iv);
      const e = getEngine();
      if (e && e.onFrame === draw) e.onFrame = null;
    };
  }, [mode]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Scopes", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tabs", role: "tablist", children: ["waveform", "parade", "vectorscope", "histogram"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": mode === m, onClick: () => setMode(m), children: m === "parade" ? "RGB Parade" : m[0].toUpperCase() + m.slice(1) }, m)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scope-wrap", children: /* @__PURE__ */ jsxRuntimeExports.jsx("canvas", { ref: canvas, width: 400, height: 260, className: "scope" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px 10px" }, children: "Scopes read the program output, so they include every effect and grade." })
  ] });
}
const ROW = 24;
const keyId = (k) => `${k.clipId}|${k.path}|${k.t.toFixed(5)}`;
function seqTime(c, src) {
  return c.start + (src - c.in) / c.speed;
}
function srcTime(c, t) {
  return c.in + (t - c.start) * c.speed;
}
function animKeys(c, path) {
  const v = getParam(c, path);
  return isAnim(v) ? v.k : [];
}
function CompositePanel() {
  const seq = useStore((s) => activeSeq(s));
  const doc = useStore((s) => s.doc);
  const media = useStore((s) => s.media);
  const time = useStore((s) => s.time);
  const selection = useStore((s) => s.selection);
  const activeParam = useStore((s) => s.activeParam);
  const [expanded, setExpanded] = reactExports.useState(/* @__PURE__ */ new Set());
  const [allProps, setAllProps] = reactExports.useState(false);
  const [selKeys, setSelKeys] = reactExports.useState(/* @__PURE__ */ new Set());
  const [view, setView] = reactExports.useState(null);
  const areaRef = reactExports.useRef(null);
  const [areaW, setAreaW] = reactExports.useState(800);
  const drag = reactExports.useRef(null);
  const dur = Math.max(5, sequenceDuration(seq));
  reactExports.useEffect(() => {
    const el = areaRef.current;
    const ro = new ResizeObserver(() => setAreaW(el.clientWidth));
    ro.observe(el);
    setAreaW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const v = view ?? { t0: 0, pps: Math.max(4, (areaW - 20) / dur) };
  const X = (t) => (t - v.t0) * v.pps;
  const T = (x) => x / v.pps + v.t0;
  const vt = seq.tracks.filter((t) => t.kind === "video");
  const layers = seq.clips.filter((c) => vt.some((t) => t.id === c.trackId)).sort((a, b) => vt.findIndex((t) => t.id === b.trackId) - vt.findIndex((t) => t.id === a.trackId) || a.start - b.start);
  const p = { doc, media };
  const propsOf = (c) => {
    const all = numericParamPaths(c);
    if (allProps) return all;
    return all.filter((path) => path.startsWith("transform.") && ["transform.x", "transform.y", "transform.scale", "transform.rotation", "transform.opacity"].includes(path) || isAnim(getParam(c, path)));
  };
  const startKeyDrag = (e, c, path, t) => {
    e.stopPropagation();
    const id = keyId({ clipId: c.id, path, t });
    let sel = selKeys;
    if (e.shiftKey) {
      sel = new Set(selKeys);
      if (sel.has(id)) sel.delete(id);
      else sel.add(id);
    } else if (!selKeys.has(id)) sel = /* @__PURE__ */ new Set([id]);
    setSelKeys(sel);
    useStore.setState({ activeParam: { clipId: c.id, path } });
    const groups = /* @__PURE__ */ new Map();
    for (const k of sel) {
      const [clipId, pth, tt] = k.split("|");
      const clip = seq.clips.find((x) => x.id === clipId);
      if (!clip) continue;
      const g = groups.get(clipId + "|" + pth) ?? { clipId, path: pth, speed: clip.speed, orig: structuredClone(animKeys(clip, pth)), move: [] };
      g.move.push(Number(tt));
      groups.set(clipId + "|" + pth, g);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, groups: [...groups.values()], moved: false, dt: 0, first: { clip: c, t } };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 3) return;
    if (!d.moved) beginTx();
    d.moved = true;
    const fps = seq.settings.fps;
    d.dt = Math.round(dx / v.pps * fps) / fps;
    for (const g of d.groups) {
      editKeys(
        g.clipId,
        g.path,
        (keys) => {
          keys.length = 0;
          for (const k of g.orig) {
            const moved = g.move.some((m) => Math.abs(m - k.t) < 1e-4);
            keys.push({ ...structuredClone(k), t: moved ? k.t + d.dt * g.speed : k.t });
          }
        },
        true
      );
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      endTx();
      const next = /* @__PURE__ */ new Set();
      for (const g of d.groups) for (const m of g.move) next.add(keyId({ clipId: g.clipId, path: g.path, t: m + d.dt * g.speed }));
      setSelKeys(next);
    } else {
      useStore.setState({ playing: false });
      setTime(seqTime(d.first.clip, d.first.t));
    }
  };
  const deleteSelectedKeys = () => {
    const groups = /* @__PURE__ */ new Map();
    for (const id of selKeys) {
      const [clipId, path, t] = id.split("|");
      groups.set(clipId + "|" + path, [...groups.get(clipId + "|" + path) ?? [], Number(t)]);
    }
    beginTx();
    for (const [key, ts] of groups) {
      const [clipId, path] = key.split("|");
      updateClip(
        clipId,
        (c) => {
          const cur = getParam(c, path);
          if (!isAnim(cur)) return;
          const a = cur;
          const left = a.k.filter((k) => !ts.some((t) => Math.abs(k.t - t) < 1e-4));
          if (left.length) setParam(c, path, { k: left });
          else setParam(c, path, path.endsWith(".path") ? a.k[0].v : evalNum(cur, srcTime(c, useStore.getState().time)));
        },
        true
      );
    }
    endTx();
    setSelKeys(/* @__PURE__ */ new Set());
  };
  const applyEase = (mode) => {
    if (!activeParam) return;
    const { clipId, path } = activeParam;
    const chosen = [...selKeys].filter((id) => id.startsWith(clipId + "|" + path + "|")).map((id) => Number(id.split("|")[2]));
    editKeys(clipId, path, (keys) => {
      const targets = chosen.length ? keys.filter((k) => chosen.some((t) => Math.abs(k.t - t) < 1e-4)) : keys;
      for (const k of targets) {
        if (mode === "linear") k.interp = "linear";
        else if (mode === "hold") k.interp = "hold";
        else {
          k.interp = "bezier";
          if (mode === "ease" || mode === "easeOut") k.out = [...EASE_OUT];
          if (mode === "ease" || mode === "easeIn") k.in = [...EASE_IN];
          if (mode === "easeIn") {
            const i = keys.indexOf(k);
            if (i > 0 && keys[i - 1].interp === "linear") {
              keys[i - 1].interp = "bezier";
              keys[i - 1].out = [1 / 3, 1 / 3];
            }
          }
          if (mode === "easeOut") k.in = k.in ?? [...EASE_IN];
        }
      }
    });
  };
  const ticks = [];
  {
    const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const major = steps.find((s) => s * v.pps >= 80) ?? 300;
    for (let t = Math.max(0, Math.floor(v.t0 / major) * major); X(t) < areaW + 40; t += major) {
      ticks.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tick", style: { left: X(t) }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: timecode(t, seq.settings.fps) }) }, t.toFixed(3))
      );
    }
  }
  const rows = [];
  const lanes = [];
  for (const c of layers) {
    const open = expanded.has(c.id);
    const selected = selection.includes(c.id);
    rows.push(
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `cl-row layer${selected ? " on" : ""}`, style: { height: ROW }, onClick: () => select([c.id]), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "icon-btn sm",
            "aria-label": open ? "Collapse" : "Expand",
            "aria-expanded": open,
            onClick: (e) => {
              e.stopPropagation();
              const n = new Set(expanded);
              if (open) n.delete(c.id);
              else n.add(c.id);
              setExpanded(n);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: open ? "chevron" : "chevronR", size: 12, stroke: 2.4 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `icon-btn sm${c.disabled ? " off" : ""}`,
            "aria-label": "Toggle layer",
            title: "Toggle layer",
            onClick: (e) => {
              e.stopPropagation();
              updateClip(c.id, (x) => x.disabled = !x.disabled);
            },
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: c.disabled ? "eyeOff" : "eye", size: 13 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "cl-name", children: clipLabel(p, c) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select xs", "aria-label": "Blend mode", value: c.blendMode, onClick: (e) => e.stopPropagation(), onChange: (e) => updateClip(c.id, (x) => x.blendMode = e.target.value), children: ["normal", "add", "screen", "multiply", "overlay", "softLight", "lighten", "darken", "difference"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, m)) })
      ] }, c.id)
    );
    lanes.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cl-lane", style: { height: ROW }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `cl-bar${selected ? " on" : ""}`, style: { left: X(c.start), width: Math.max(2, c.duration * v.pps) } }) }, c.id)
    );
    if (!open) continue;
    for (const path of propsOf(c)) {
      const val = getParam(c, path);
      const animated = isAnim(val);
      const isActive = activeParam?.clipId === c.id && activeParam.path === path;
      const lt = srcTime(c, Math.max(c.start, Math.min(clipEnd(c), time)));
      const shown = path.endsWith(".path") ? "" : evalNum(val, lt).toFixed(1);
      rows.push(
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `cl-row prop${isActive ? " on" : ""}`, style: { height: ROW }, onClick: () => useStore.setState({ activeParam: { clipId: c.id, path } }), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `kbtn${animated ? " on" : ""}`,
              "aria-label": "Toggle animation",
              title: "Animate",
              onClick: (e) => {
                e.stopPropagation();
                select([c.id]);
                toggleStopwatch(c.id, path);
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stopwatch", size: 12 })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "cl-prop", children: paramLabel(c, path) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mono cl-val", children: shown })
        ] }, c.id + path)
      );
      lanes.push(
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `cl-lane prop${isActive ? " on" : ""}`, style: { height: ROW }, children: animKeys(c, path).map((k) => {
          const id = keyId({ clipId: c.id, path, t: k.t });
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: `dkey ${k.interp}${selKeys.has(id) ? " on" : ""}`,
              style: { left: X(seqTime(c, k.t)) },
              "aria-label": `Keyframe at ${timecode(seqTime(c, k.t), seq.settings.fps)}`,
              onPointerDown: (e) => startKeyDrag(e, c, path, k.t)
            },
            id
          );
        }) }, c.id + path)
      );
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "composite", "aria-label": "Composite", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cl-left", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cl-head", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Layers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: seq.name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk dim", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: allProps, onChange: (e) => setAllProps(e.target.checked) }),
          " All properties"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cl-rows", children: rows.length ? rows : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty", children: "No video layers in this sequence." }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cl-right", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cl-head", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn sm", disabled: !selKeys.size, onClick: deleteSelectedKeys, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "trash", size: 13 }),
          " Delete keys"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: selKeys.size ? `${selKeys.size} key${selKeys.size > 1 ? "s" : ""} selected` : "Click keys to select; drag to move; shift-click to add" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Zoom out", "aria-label": "Zoom out", onClick: () => setView({ t0: v.t0, pps: Math.max(2, v.pps / 1.5) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "zoomOut", size: 15 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Zoom in", "aria-label": "Zoom in", onClick: () => setView({ t0: v.t0, pps: Math.min(4e3, v.pps * 1.5) }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "zoomIn", size: 15 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Fit", "aria-label": "Fit", onClick: () => setView(null), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "guides", size: 15 }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "cl-area",
          ref: areaRef,
          onWheel: (e) => {
            if (e.ctrlKey) {
              e.preventDefault();
              const r = areaRef.current.getBoundingClientRect();
              const at = T(e.clientX - r.left);
              const pps = Math.max(2, Math.min(4e3, v.pps * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
              setView({ pps, t0: Math.max(0, at - (e.clientX - r.left) / pps) });
            } else if (e.shiftKey) setView({ pps: v.pps, t0: Math.max(0, v.t0 + e.deltaY / v.pps) });
          },
          onPointerMove: onMove,
          onPointerUp: onUp,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "cl-ruler",
                onPointerDown: (e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const r = areaRef.current.getBoundingClientRect();
                  useStore.setState({ playing: false });
                  setTime(T(e.clientX - r.left));
                },
                onPointerMove: (e) => {
                  if (e.buttons !== 1) return;
                  const r = areaRef.current.getBoundingClientRect();
                  setTime(T(e.clientX - r.left));
                },
                children: ticks
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `cl-split${activeParam ? " graph" : ""}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cl-lanes", onPointerDown: () => setSelKeys(/* @__PURE__ */ new Set()), children: lanes }),
              activeParam && /* @__PURE__ */ jsxRuntimeExports.jsx(GraphEditor, { clipId: activeParam.clipId, path: activeParam.path, X, T, selKeys, setSelKeys, onEase: applyEase })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "cl-playhead", style: { left: X(time) } })
          ]
        }
      )
    ] })
  ] });
}
function GraphEditor({ clipId, path, X, T, selKeys, setSelKeys, onEase }) {
  const seq = useStore((s) => activeSeq(s));
  const clip = seq.clips.find((c) => c.id === clipId);
  const ref = reactExports.useRef(null);
  const [size, setSize] = reactExports.useState({ w: 600, h: 200 });
  const drag = reactExports.useRef(null);
  const frozen = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const val = clip ? getParam(clip, path) : void 0;
  const keys = reactExports.useMemo(() => isAnim(val) ? val.k : [], [val]);
  if (!clip) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "graph-empty", children: "Layer not found." });
  if (path.endsWith(".path")) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "graph-empty", children: "Mask paths animate as shapes: edit their keys in the dope sheet above." });
  if (!keys.length) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "graph-empty", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: paramLabel(clip, path) }),
      " isn't animated. Click its stopwatch to add the first keyframe."
    ] });
  }
  let range;
  if (frozen.current) range = frozen.current;
  else {
    let lo = Infinity;
    let hi = -Infinity;
    const t0 = T(0);
    const t1 = T(size.w);
    for (let i = 0; i <= 200; i++) {
      const tt = t0 + (t1 - t0) * i / 200;
      const vv = evalNum(val, clip.in + (tt - clip.start) * clip.speed);
      lo = Math.min(lo, vv);
      hi = Math.max(hi, vv);
    }
    for (const k of keys) {
      lo = Math.min(lo, k.v);
      hi = Math.max(hi, k.v);
    }
    const hint = paramRange(clip, path);
    if (hi - lo < 1e-6) {
      const pad = hint ? (hint[1] - hint[0]) * 0.1 : Math.max(1, Math.abs(hi) * 0.2);
      lo -= pad;
      hi += pad;
    }
    const m = (hi - lo) * 0.12;
    range = [lo - m, hi + m];
  }
  const PADY = 14;
  const Y = (v2) => PADY + (1 - (v2 - range[0]) / (range[1] - range[0])) * (size.h - PADY * 2);
  const V = (y) => range[0] + (1 - (y - PADY) / (size.h - PADY * 2)) * (range[1] - range[0]);
  const st = (k) => clip.start + (k.t - clip.in) / clip.speed;
  const pts = [];
  const N = Math.max(60, Math.floor(size.w / 3));
  for (let i = 0; i <= N; i++) {
    const tt = T(size.w * i / N);
    const vv = evalNum(val, clip.in + (tt - clip.start) * clip.speed);
    pts.push(`${(size.w * i / N).toFixed(1)},${Y(vv).toFixed(1)}`);
  }
  const handlePos = (i, which) => {
    const a = keys[i];
    const b = which === "out" ? keys[i + 1] : keys[i - 1];
    if (!b) return null;
    const seg = which === "out" ? [a, b] : [b, a];
    if (seg[0].interp !== "bezier") return null;
    const span = seg[1].v - seg[0].v;
    const vs = Math.abs(span) < 1e-9 ? (range[1] - range[0]) * 0.25 : span;
    const h = which === "out" ? a.out : a.in;
    const tt = st(seg[0]) + h[0] * (st(seg[1]) - st(seg[0]));
    const vv = seg[0].v + h[1] * vs;
    return { x: X(tt), y: Y(vv) };
  };
  const onDown = (e, d) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    frozen.current = range;
    beginTx();
    drag.current = d;
    if (d.kind === "key") {
      const id = `${clipId}|${path}|${keys[d.i].t.toFixed(5)}`;
      if (!selKeys.has(id)) setSelKeys(/* @__PURE__ */ new Set([id]));
    }
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    editKeys(
      clipId,
      path,
      (ks) => {
        const k = ks[d.i];
        if (!k) return;
        if (d.kind === "key") {
          const fps = seq.settings.fps;
          const tt = Math.round(T(x) * fps) / fps;
          const prev = ks[d.i - 1];
          const next = ks[d.i + 1];
          const srcT = clip.in + (tt - clip.start) * clip.speed;
          const lo = prev ? prev.t + 1e-3 : -Infinity;
          const hi = next ? next.t - 1e-3 : Infinity;
          k.t = Math.max(lo, Math.min(hi, srcT));
          if (!e.altKey) k.v = V(y);
        } else {
          const other = d.kind === "out" ? ks[d.i + 1] : ks[d.i - 1];
          if (!other) return;
          const a = d.kind === "out" ? k : other;
          const b = d.kind === "out" ? other : k;
          const span = b.v - a.v;
          const vs = Math.abs(span) < 1e-9 ? (range[1] - range[0]) * 0.25 : span;
          const ta = st(a);
          const tb = st(b);
          const hx = Math.max(0, Math.min(1, (T(x) - ta) / Math.max(1e-6, tb - ta)));
          const hy = (V(y) - a.v) / vs;
          a.interp = "bezier";
          if (d.kind === "out") k.out = [hx, hy];
          else k.in = [hx, hy];
        }
      },
      true
    );
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    frozen.current = null;
    endTx();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "graph", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "graph-bar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: paramLabel(clip, path) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: "value graph" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => onEase("linear"), children: "Linear" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => onEase("ease"), children: "Easy Ease" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => onEase("easeIn"), children: "Ease In" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => onEase("easeOut"), children: "Ease Out" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => onEase("hold"), children: "Hold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", "aria-label": "Close graph", onClick: () => useStore.setState({ activeParam: null }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "x", size: 14 }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { ref, className: "graph-svg", onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, children: [
      [0.25, 0.5, 0.75].map((f) => {
        const yy = PADY + f * (size.h - PADY * 2);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: 0, x2: size.w, y1: yy, y2: yy, className: "gline" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: 4, y: yy - 3, className: "glabel", children: V(yy).toFixed(1) })
        ] }, f);
      }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: pts.join(" "), className: "gcurve" }),
      keys.map((k, i) => {
        const ho = handlePos(i, "out");
        const hi = handlePos(i, "in");
        const kx = X(st(k));
        const ky = Y(k.v);
        const on = selKeys.has(`${clipId}|${path}|${k.t.toFixed(5)}`);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
          ho && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: kx, y1: ky, x2: ho.x, y2: ho.y, className: "ghandle-line" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: ho.x, cy: ho.y, r: 5, className: "ghandle", onPointerDown: (e) => onDown(e, { kind: "out", i }) })
          ] }),
          hi && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: kx, y1: ky, x2: hi.x, y2: hi.y, className: "ghandle-line" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: hi.x, cy: hi.y, r: 5, className: "ghandle", onPointerDown: (e) => onDown(e, { kind: "in", i }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: kx - 5, y: ky - 5, width: 10, height: 10, transform: `rotate(45 ${kx} ${ky})`, className: `gkey${on ? " on" : ""}`, onPointerDown: (e) => onDown(e, { kind: "key", i, x: e.clientX, y: e.clientY, t0: k.t, v0: k.v }) })
        ] }, i);
      })
    ] })
  ] });
}
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const PRESETS = [
  { id: "h264_nvenc", label: "H.264 · NVENC (MP4)", gpu: "h264", note: "Fast GPU encode. Plays everywhere." },
  { id: "hevc_nvenc", label: "H.265 · NVENC (MP4)", gpu: "hevc", note: "Smaller files at the same quality. Good for 4K." },
  { id: "hevc_nvenc_10", label: "H.265 10-bit · NVENC (MP4)", gpu: "hevc", note: "10-bit output from the 16-bit float pipeline: no banding in skies and gradients." },
  { id: "libx264", label: "H.264 · CPU x264 (MP4)", gpu: null, note: "Slower, very efficient. Use if NVENC is unavailable." },
  { id: "prores", label: "ProRes 422 HQ (MOV)", gpu: null, note: "10-bit edit-grade master file. Large." },
  { id: "prores4444", label: "ProRes 4444 with alpha (MOV)", gpu: null, note: "Transparent background: for keyed elements and titles to use in other projects." }
];
function ExportDialog() {
  const open = useStore((s) => s.exportOpen);
  const caps = useStore((s) => s.caps);
  const seq = useStore((s) => activeSeq(s));
  const progress = useStore((s) => s.exportProgress);
  const name = useStore((s) => s.projectName);
  const [preset, setPreset] = reactExports.useState("libx264");
  const [quality, setQuality] = reactExports.useState(19);
  const [res, setRes] = reactExports.useState("seq");
  const [range, setRange] = reactExports.useState("all");
  const [audioOnly, setAudioOnly] = reactExports.useState(false);
  const [audioFmt, setAudioFmt] = reactExports.useState("wav");
  const [loud, setLoud] = reactExports.useState("off");
  const [tp, setTp] = reactExports.useState(-1);
  reactExports.useEffect(() => {
    if (caps?.nvenc) setPreset("h264_nvenc");
  }, [caps?.nvenc]);
  reactExports.useEffect(() => {
    if (open) setRange(seq.inPoint !== void 0 || seq.outPoint !== void 0 ? "inout" : "all");
  }, [open, seq.inPoint, seq.outPoint]);
  if (!open) return null;
  const running = progress && !progress.done;
  const p = PRESETS.find((x) => x.id === preset);
  const available = PRESETS.filter((x) => x.gpu === "h264" ? caps?.nvenc : x.gpu === "hevc" ? caps?.hevcNvenc : true);
  const S = seq.settings;
  const outH = res === "seq" ? S.height : Number(res);
  const outW = res === "seq" ? S.width : even(S.width * outH / S.height);
  const dur = sequenceDuration(seq);
  const r0 = range === "inout" ? seq.inPoint ?? 0 : 0;
  const r1 = range === "inout" ? seq.outPoint ?? dur : dur;
  const start = async () => {
    const s = useStore.getState();
    if (!s.caps?.ffmpeg) return;
    if (r1 - r0 <= 0) return toast("Nothing to export in that range.", "error");
    const ext = audioOnly ? audioFmt : presetInfo(preset).ext;
    const path = await window.cuttingfloor.exportDialog(range === "inout" ? `${name}-range` : name, ext);
    if (!path) return;
    const lutPaths = /* @__PURE__ */ new Set();
    for (const q of s.doc.sequences) for (const c of q.clips) for (const e of c.effects) if (e.type === "lut" && typeof e.params.path === "string" && e.params.path) lutPaths.add(e.params.path);
    for (const lp of lutPaths) await loadLut(lp);
    const fps = S.fps;
    useStore.setState({ exportProgress: { frame: 0, total: Math.round((r1 - r0) * fps), fps: 0, done: false, phase: "audio" } });
    window.cuttingfloor.startExport({
      doc: s.doc,
      sequenceId: seq.id,
      media: s.media,
      caps: s.caps,
      luts: useStore.getState().luts,
      settings: { outputPath: path, preset, quality, width: even(outW), height: even(outH), rangeStart: r0, rangeEnd: r1, audioOnly, loudness: loud === "off" ? null : { target: Number(loud), truePeak: tp } }
    });
  };
  const close = () => {
    if (running) return;
    useStore.setState({ exportOpen: false, exportProgress: null });
  };
  const pct = progress && progress.total ? progress.frame / progress.total : 0;
  const eta = progress && progress.fps > 0 ? (progress.total - progress.frame) / progress.fps : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrim", onMouseDown: (e) => e.target === e.currentTarget && close(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dialog", role: "dialog", "aria-modal": "true", "aria-label": "Export", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { children: [
      "Export · ",
      seq.name
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "body", children: [
      !progress && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Output" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: audioOnly ? "audio" : "video", onChange: (e) => setAudioOnly(e.target.value === "audio"), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "video", children: "Video + audio" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "audio", children: "Audio only" })
          ] })
        ] }),
        audioOnly ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Format" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: audioFmt, onChange: (e) => setAudioFmt(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "wav", children: "WAV 24-bit" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "flac", children: "FLAC" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "mp3", children: "MP3 320k" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "m4a", children: "AAC 320k (M4A)" })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Format" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: preset, onChange: (e) => setPreset(e.target.value), children: available.map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: x.id, children: x.label }, x.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "note", style: { margin: "-4px 0 0 130px" }, children: [
            p.note,
            !caps?.nvenc && " NVENC was not detected on this system."
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Resolution" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: res, onChange: (e) => setRes(e.target.value), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "seq", children: [
                "Sequence (",
                S.width,
                "×",
                S.height,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "2160", children: "2160p" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "1440", children: "1440p" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "1080", children: "1080p" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "720", children: "720p" })
            ] })
          ] }),
          !preset.startsWith("prores") && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Quality" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "slider", type: "range", min: 12, max: 32, step: 1, value: 44 - quality, onChange: (e) => setQuality(44 - Number(e.target.value)), "aria-label": "Quality" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "mono dim", style: { width: 80 }, children: [
                preset === "libx264" ? "CRF" : "CQ",
                " ",
                quality
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Loudness" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: loud, onChange: (e) => setLoud(e.target.value), "aria-label": "Loudness normalisation", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "off", children: "As mixed" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "-14", children: "Normalise to −14 LUFS (YouTube, Spotify)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "-16", children: "Normalise to −16 LUFS (podcasts, Apple)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "-23", children: "Normalise to −23 LUFS (EBU R128 broadcast)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "-24", children: "Normalise to −24 LUFS (ATSC A/85)" })
            ] }),
            loud !== "off" && /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: tp, onChange: (e) => setTp(Number(e.target.value)), "aria-label": "True peak ceiling", title: "True-peak ceiling", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -1, children: "−1 dBTP" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -2, children: "−2 dBTP" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: -0.5, children: "−0.5 dBTP" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Range" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: range, onChange: (e) => setRange(e.target.value), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "all", children: [
              "Entire sequence (",
              timecode(dur, S.fps),
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: "inout", disabled: seq.inPoint === void 0 && seq.outPoint === void 0, children: [
              "In to out (",
              timecode(Math.max(0, (seq.outPoint ?? dur) - (seq.inPoint ?? 0)), S.fps),
              ")"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", children: audioOnly ? "Sample-accurate mix of all audio tracks." : `${outW}×${outH} · ${fpsLabel(S.fps)} fps · rendered by the same GPU engine as the preview, from your original files (not proxies).` })
      ] }),
      progress && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "progress", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { style: { width: `${(progress.done && !progress.error && !progress.cancelled ? 1 : pct) * 100}%` } }) }),
        !progress.done && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note mono", children: progress.phase === "audio" ? `Mixing audio… ${Math.round(pct * 100)}%` : progress.phase === "loudness" ? "Measuring and normalising loudness…" : `Frame ${progress.frame} / ${progress.total} · ${progress.fps.toFixed(1)} fps · ${eta > 0 ? `${Math.ceil(eta)} s left` : "starting…"}` }),
        progress.done && progress.error && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "note err", children: [
          "Export failed: ",
          progress.error
        ] }),
        progress.done && progress.cancelled && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", children: "Export cancelled." }),
        progress.done && !progress.error && !progress.cancelled && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "note ok", children: [
          "Done",
          progress.fps > 0 ? ` in ${(progress.total / progress.fps).toFixed(1)} s (${progress.fps.toFixed(1)} fps)` : "",
          "."
        ] }),
        progress.done && !progress.error && progress.loudness && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note mono", children: Number.isFinite(progress.loudness.measured) ? `Loudness: measured ${progress.loudness.measured.toFixed(1)} LUFS → gain ${progress.loudness.gain >= 0 ? "+" : ""}${progress.loudness.gain.toFixed(1)} dB → ${progress.loudness.final.toFixed(1)} LUFS` : "Loudness: the mix is silent, nothing to normalise." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
      !progress && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-primary", onClick: () => void start(), disabled: !caps?.ffmpeg, children: "Choose file and export" })
      ] }),
      running && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => window.cuttingfloor.cancelExport(), children: "Cancel export" }),
      progress?.done && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        progress.outputPath && !progress.error && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => window.cuttingfloor.showItem(progress.outputPath), children: "Show in folder" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-primary", onClick: close, children: "Close" })
      ] })
    ] })
  ] }) });
}
function listenExport() {
  return window.cuttingfloor.onExportProgress((p) => {
    useStore.setState({ exportProgress: p });
    if (p.done && !p.error && !p.cancelled) toast("Export finished", "success");
  });
}
const RES = [
  { label: "3840×2160 (4K UHD)", w: 3840, h: 2160 },
  { label: "2560×1440 (QHD)", w: 2560, h: 1440 },
  { label: "1920×1080 (Full HD)", w: 1920, h: 1080 },
  { label: "1280×720 (HD)", w: 1280, h: 720 },
  { label: "1080×1920 (Vertical)", w: 1080, h: 1920 },
  { label: "1080×1080 (Square)", w: 1080, h: 1080 }
];
function SequenceDialog() {
  const open = useStore((s) => s.sequenceOpen);
  const seq = useStore((s) => activeSeq(s));
  const S = seq.settings;
  const [name, setName] = reactExports.useState(seq.name);
  const [w, setW] = reactExports.useState(S.width);
  const [h, setH] = reactExports.useState(S.height);
  const [fps, setFps] = reactExports.useState(S.fps);
  const [linear, setLinear] = reactExports.useState(S.linearBlend);
  const [bg, setBg] = reactExports.useState(S.background);
  reactExports.useEffect(() => {
    if (open) {
      setName(seq.name);
      setW(S.width);
      setH(S.height);
      setFps(S.fps);
      setLinear(S.linearBlend);
      setBg(S.background);
    }
  }, [open, seq.name, S]);
  if (!open) return null;
  const preset = RES.find((r) => r.w === w && r.h === h);
  const close = () => useStore.setState({ sequenceOpen: false });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrim", onMouseDown: (e) => e.target === e.currentTarget && close(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dialog", role: "dialog", "aria-modal": "true", "aria-label": "Sequence settings", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Sequence settings" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => e.stopPropagation() })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Frame size" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: preset ? `${w}x${h}` : "custom",
            onChange: (e) => {
              const r = RES.find((x) => `${x.w}x${x.h}` === e.target.value);
              if (r) {
                setW(r.w);
                setH(r.h);
              }
            },
            children: [
              RES.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: `${r.w}x${r.h}`, children: r.label }, r.label)),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "custom", children: "Custom" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Width × height" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", "aria-label": "Width", value: w, min: 16, max: 8192, step: 2, onChange: (e) => setW(Number(e.target.value)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", "aria-label": "Height", value: h, min: 16, max: 8192, step: 2, onChange: (e) => setH(Number(e.target.value)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Frame rate" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: FPS_CHOICES.find((f) => Math.abs(f - fps) < 1e-3) ?? fps, onChange: (e) => setFps(Number(e.target.value)), children: FPS_CHOICES.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: f, children: [
          fpsLabel(f),
          " fps"
        ] }, f)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Background" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", value: bg, onChange: (e) => setBg(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Compositing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: linear, onChange: (e) => setLinear(e.target.checked) }),
          " Blend in linear light (more natural dissolves, glows and blurs)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", children: "Dropping the first video clip onto an empty sequence matches its size and frame rate automatically." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn-primary",
          onClick: () => {
            setSequenceSettings({ width: even(w), height: even(h), fps, linearBlend: linear, background: bg });
            if (name.trim() && name !== seq.name) commitSeq((q) => q.name = name.trim());
            close();
          },
          children: "Apply"
        }
      )
    ] })
  ] }) });
}
function SpeedDialog() {
  const open = useStore((s) => s.speedOpen);
  const clip = useStore(primarySelection);
  const seq = useStore((s) => activeSeq(s));
  const [pct, setPct] = reactExports.useState(100);
  const [ripple, setRipple] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (open && clip) setPct(Math.round(clip.speed * 1e3) / 10);
  }, [open, clip]);
  if (!open) return null;
  const close = () => useStore.setState({ speedOpen: false });
  if (!clip) {
    close();
    return null;
  }
  const newDur = clip.duration * clip.speed / (pct / 100);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "scrim", onMouseDown: (e) => e.target === e.currentTarget && close(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dialog", role: "dialog", "aria-modal": "true", "aria-label": "Clip speed", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Speed / Duration" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "body", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Speed" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 5, max: 2e3, step: 1, value: pct, onChange: (e) => setPct(Math.max(5, Math.min(2e3, Number(e.target.value)))), onKeyDown: (e) => e.stopPropagation() }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: "%" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Duration" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mono", children: timecode(newDur, seq.settings.fps) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Following clips" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: ripple, onChange: (e) => setRipple(e.target.checked) }),
          " Ripple edit (shift later clips)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", children: "Audio keeps its pitch. Preview playback rate is limited to 6.25%–1600%." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: close, children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn-primary",
          onClick: () => {
            const ids = useStore.getState().selection.filter((id) => findClip(seq, id));
            for (const id of ids) setSpeed(id, pct / 100, ripple);
            close();
          },
          children: "Apply"
        }
      )
    ] })
  ] }) });
}
const BLEND_MODES = [
  ["normal", "Normal"],
  ["add", "Add"],
  ["screen", "Screen"],
  ["multiply", "Multiply"],
  ["overlay", "Overlay"],
  ["softLight", "Soft Light"],
  ["lighten", "Lighten"],
  ["darken", "Darken"],
  ["difference", "Difference"]
];
function Section({ title, tag, children, actions, defaultOpen = true, draggable, onDragStart }) {
  const [open, setOpen] = reactExports.useState(defaultOpen);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `ec-head${draggable ? " grab" : ""}`, draggable, onDragStart, title: draggable ? "Drag to reorder" : void 0, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", style: { width: 22, height: 22 }, "aria-label": open ? "Collapse" : "Expand", "aria-expanded": open, onClick: () => setOpen(!open), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: open ? "chevron" : "chevronR", size: 13, stroke: 2.4 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: title }),
      tag && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tag", children: tag }),
      actions
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-body", children })
  ] });
}
function ParamControl({ clip, fx: fx2, p }) {
  const eyedropper = useStore((s) => s.eyedropper);
  if (p.kind === "number") return /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `effects.${fx2.id}.${p.key}`, label: p.label, min: p.min, max: p.max, step: p.step, unit: p.unit });
  if (p.kind === "color") {
    const picking = eyedropper?.effectId === fx2.id;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": p.label, value: String(fx2.params[p.key] ?? p.default), onChange: (e) => updateEffect(clip.id, fx2.id, (x) => x.params[p.key] = e.target.value) }),
        fx2.type === "chromaKey" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: `btn sm${picking ? " on" : ""}`, onClick: () => useStore.setState({ eyedropper: picking ? null : { clipId: clip.id, effectId: fx2.id } }), title: "Click, then click the screen colour in the monitor", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "dropper", size: 13 }),
          " Pick"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] });
  }
  if (p.kind === "bool") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": p.label, checked: Boolean(fx2.params[p.key] ?? p.default), onChange: (e) => updateEffect(clip.id, fx2.id, (x) => x.params[p.key] = e.target.checked) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] });
  }
  if (p.kind === "enum") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": p.label, value: String(fx2.params[p.key] ?? p.default), onChange: (e) => updateEffect(clip.id, fx2.id, (x) => x.params[p.key] = e.target.value), children: p.options.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] });
  }
  if (p.kind === "file") {
    const v = String(fx2.params[p.key] ?? "");
    const isLut = p.extensions.includes("cube");
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: v, children: v ? v.split("/").pop() : "None" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn sm",
          onClick: async () => {
            const path = await window.cuttingfloor.openFileDialog(isLut ? "Choose a .cube LUT" : `Choose ${p.label.toLowerCase()}`, p.extensions);
            if (!path) return;
            if (isLut) await loadLut(path);
            updateEffect(clip.id, fx2.id, (x) => x.params[p.key] = path);
          },
          children: "Browse"
        }
      )
    ] });
  }
  if (p.kind === "curve") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-curve", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ec-curve-label", style: { color: p.tint }, children: p.label }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(CurveEditor, { label: p.label, size: 180, tint: p.tint, value: String(fx2.params[p.key] ?? p.default), onChange: (v, live) => updateEffect(clip.id, fx2.id, (x) => x.params[p.key] = v, live) })
    ] });
  }
  return null;
}
function CurveTabs({ clip, fx: fx2, curves }) {
  const [tab, setTab] = reactExports.useState(curves[0].key);
  const cur = curves.find((c) => c.key === tab) ?? curves[0];
  const val = (k, d) => String(fx2.params[k] ?? d);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-curve", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-tabs", role: "tablist", "aria-label": "Curve channel", children: curves.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": c.key === cur.key, className: val(c.key, c.default) !== "0,0;1,1" && val(c.key, c.default) !== c.default ? "mod" : "", style: { color: c.key === cur.key ? c.tint : void 0 }, onClick: () => setTab(c.key), children: c.label }, c.key)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(CurveEditor, { label: `${cur.label} curve`, size: 200, tint: cur.tint, value: val(cur.key, cur.default), onChange: (v, live) => updateEffect(clip.id, fx2.id, (x) => x.params[cur.key] = v, live) })
  ] });
}
function StabilizerStatus({ clip, fx: fx2 }) {
  const analysis = useStore((s) => s.analysis);
  const job = Object.entries(analysis).find(([, a]) => a.clipId === clip.id);
  const data = fx2.data?.stab;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Analysis" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { fontSize: 11 }, children: job ? `${job[1].label} · ${Math.round(job[1].progress * 100)}%` : data ? `${Math.round(data.path.length / 4)} frames analysed` : "Not analysed yet" }),
    job ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => cancelAnalysis(job[0]), children: "Cancel" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm on", onClick: () => analyseStabilizer(clip.id, fx2.id), children: data ? "Re-analyse" : "Analyse" })
  ] });
}
function SubjectStatus({ clip, fx: fx2 }) {
  const analysis = useStore((s) => s.analysis);
  const job = Object.entries(analysis).find(([, a]) => a.clipId === clip.id);
  const data = fx2.data?.subject;
  const step = Math.max(1, Number(fx2.params.detail) || 4);
  const stale = !!data && data.step !== step;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Analysis" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { fontSize: 11 }, children: job ? `${job[1].label} · ${Math.round(job[1].progress * 100)}%` : data ? stale ? "Detail changed: analyse again" : `${data.n} frames analysed` : "Not analysed yet" }),
    job ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => cancelAnalysis(job[0]), children: "Cancel" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm on", onClick: () => void analyseSubject(clip.id, fx2.id), children: data ? "Re-analyse" : "Analyse" })
  ] });
}
const DND_FXMOVE = "application/x-cuttingfloor-fxmove";
function EffectSection({ clip, fx: fx2, index, count }) {
  const def = effectDef(fx2.type);
  const showMatte = useStore((s) => s.showMatte);
  const [over, setOver] = reactExports.useState(null);
  const groups = [...new Set(def.params.map((p) => p.group ?? ""))];
  const same = clip.effects.filter((e) => e.type === fx2.type);
  const title = same.length > 1 ? `${def.name} ${same.indexOf(fx2) + 1}` : def.name;
  const menu = (e) => openContextMenu({ clientX: e.clientX, clientY: e.clientY + 10, preventDefault: () => {
  } }, [
    { label: "Duplicate", run: () => duplicateEffect(clip.id, fx2.id) },
    { label: "Copy", keys: "", run: () => copyEffects(clip.id, [fx2.id]) },
    {
      label: "Save as preset…",
      run: () => {
        const n = prompt("Preset name", def.name);
        if (n) void savePreset(clip.id, n, [fx2.id]);
      }
    },
    { label: "", sep: true },
    { label: "Move up", disabled: index === 0, run: () => moveEffect(clip.id, fx2.id, index - 1) },
    { label: "Move down", disabled: index === count - 1, run: () => moveEffect(clip.id, fx2.id, index + 2) },
    { label: "", sep: true },
    { label: "Reset", run: () => updateEffect(clip.id, fx2.id, (x) => def.params.forEach((p) => x.params[p.key] = p.default)) },
    { label: "Remove", run: () => removeEffect(clip.id, fx2.id) }
  ]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `fx-slot${over ? " drop-" + over : ""}`,
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(DND_FXMOVE)) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setOver(e.clientY < r.top + Math.min(40, r.height / 2) ? "above" : "below");
      },
      onDragLeave: () => setOver(null),
      onDrop: (e) => {
        const id = e.dataTransfer.getData(DND_FXMOVE);
        const where = over;
        setOver(null);
        if (!id || id === fx2.id) return;
        e.preventDefault();
        moveEffect(clip.id, id, where === "above" ? index : index + 1);
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Section,
        {
          title,
          tag: def.category,
          draggable: true,
          onDragStart: (e) => {
            e.dataTransfer.setData(DND_FXMOVE, fx2.id);
            e.dataTransfer.effectAllowed = "move";
          },
          actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            (fx2.type === "chromaKey" || fx2.type === "lumaKey" || fx2.type === "matteChoker") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${showMatte ? " on" : ""}`, title: "View matte (white = kept)", "aria-label": "View matte", onClick: () => useStore.setState({ showMatte: !showMatte }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "matte", size: 15 }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: `icon-btn${fx2.enabled ? "" : " off"}`,
                title: fx2.enabled ? "Bypass effect" : "Enable effect",
                "aria-label": fx2.enabled ? "Bypass effect" : "Enable effect",
                onClick: () => updateEffect(clip.id, fx2.id, (e) => e.enabled = !e.enabled),
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: fx2.enabled ? "eye" : "eyeOff", size: 15 })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "More", "aria-label": `${title} actions`, onClick: menu, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "more", size: 15 }) })
          ] }),
          children: [
            fx2.type === "stabilizer" && /* @__PURE__ */ jsxRuntimeExports.jsx(StabilizerStatus, { clip, fx: fx2 }),
            fx2.type === "subjectKey" && /* @__PURE__ */ jsxRuntimeExports.jsx(SubjectStatus, { clip, fx: fx2 }),
            groups.map((g) => {
              const ps = def.params.filter((p) => (p.group ?? "") === g);
              const curves = ps.filter((p) => p.kind === "curve");
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                g && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-group", children: g }),
                ps.filter((p) => p.kind !== "curve" || curves.length < 2).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx(ParamControl, { clip, fx: fx2, p }, p.key)),
                curves.length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(CurveTabs, { clip, fx: fx2, curves })
              ] }, g);
            })
          ]
        }
      )
    }
  );
}
function GeneratorEditor({ clip }) {
  if (clip.source.kind !== "generator") return null;
  const src = clip.source;
  let def;
  try {
    def = generatorDef(src.gen);
  } catch {
    return null;
  }
  const upd = (key, v) => updateClip(clip.id, (c) => {
    if (c.source.kind === "generator") c.source.params[key] = v;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: def.name, tag: "generator", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px" }, children: def.description }),
    def.params.map(
      (p) => p.kind === "number" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `gen.${p.key}`, label: p.label, min: p.min, max: p.max, step: p.step, unit: p.unit }, p.key) : p.kind === "color" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": p.label, value: String(src.params[p.key] ?? p.default), onChange: (e) => upd(p.key, e.target.value) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }, p.key) : p.kind === "bool" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": p.label, checked: Boolean(src.params[p.key] ?? p.default), onChange: (e) => upd(p.key, e.target.checked) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }, p.key) : p.kind === "enum" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": p.label, value: String(src.params[p.key] ?? p.default), onChange: (e) => upd(p.key, e.target.value), children: p.options.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }, p.key) : null
    )
  ] });
}
function TimeSection({ clip }) {
  if (clip.source.kind !== "media" && clip.source.kind !== "sequence") return null;
  const remap = clip.remap !== void 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Time", tag: clip.reverse ? "reversed" : clip.freeze !== void 0 ? "hold" : remap ? "remap" : void 0, defaultOpen: !!(clip.reverse || clip.freeze !== void 0 || remap), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Speed" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: remap ? "Time remapping" : `${Math.round(clip.speed * 100)}%` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", disabled: remap, onClick: () => useStore.setState({ speedOpen: true, selection: [clip.id] }), children: "Change…" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Reverse" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": "Reverse", checked: !!clip.reverse, onChange: (e) => setReverse([clip.id], e.target.checked) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Frame hold" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": "Frame hold", checked: clip.freeze !== void 0, onChange: (e) => setFreeze([clip.id], e.target.checked) }),
        clip.freeze !== void 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", title: "Hold the frame under the playhead instead", onClick: () => setFreeze([clip.id], true), children: "Hold at playhead" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Time remapping" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": "Time remapping", checked: remap, onChange: (e) => setRemap([clip.id], e.target.checked) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    remap && /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "remap", label: "Speed", min: -400, max: 1e3, step: 1, unit: "%" }),
    remap && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px" }, children: "Keyframe Speed for ramps (e.g. 100% → 400% → 100%). Negative plays backwards; 0% holds." })
  ] });
}
const MATTES = [
  ["none", "None"],
  ["alpha", "Alpha matte"],
  ["alphaInverted", "Alpha inverted"],
  ["luma", "Luma matte"],
  ["lumaInverted", "Luma inverted"]
];
function TrackerSection({ clip, seq, mt }) {
  const editing = useStore((s) => s.trackerEdit?.trackId === mt.id);
  const analysis = useStore((s) => s.analysis);
  const job = Object.entries(analysis).find(([, a]) => a.clipId === clip.id);
  const time = useStore((s) => s.time);
  const p0 = mt.points[0];
  const frames = new Set(p0.keys.filter((_, i) => i % 4 === 0)).size;
  const now = pointAt(p0, mediaTime(clip, Math.max(clip.start, Math.min(clip.start + clip.duration - 1e-3, time))));
  const others = seq.clips.filter((c) => c.id !== clip.id && seq.tracks.find((t) => t.id === c.trackId)?.kind === "video");
  const targets = [];
  for (const c of others) {
    const nm = clipLabel(project(), c);
    targets.push({ label: `${nm} · Position`, t: { clipId: c.id, mode: "position" } });
    if (mt.points.length >= 2) targets.push({ label: `${nm} · Position, rotation, scale`, t: { clipId: c.id, mode: "transform" } });
    if (mt.points.length >= 4) targets.push({ label: `${nm} · Corner Pin`, t: { clipId: c.id, mode: "cornerPin" } });
  }
  for (const c of [clip, ...others])
    for (const e of c.effects) {
      const pts = [...new Set(effectDef(e.type).params.flatMap((p) => p.kind === "number" && p.point ? [p.point.id] : []))];
      for (const id of pts) {
        if (e.type === "cornerPin") continue;
        const lab = effectDef(e.type).params.find((p) => p.kind === "number" && p.point?.id === id)?.label.replace(/ X$/, "") ?? id;
        targets.push({ label: `${clipLabel(project(), c)} · ${effectDef(e.type).name} · ${lab}`, t: { clipId: c.id, mode: "point", effectId: e.id, pointKey: id } });
      }
    }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Section,
    {
      title: mt.name,
      tag: "tracker",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${editing ? " on" : ""}`, title: "Show and move the track points in the monitor", "aria-label": "Edit track points", onClick: () => useStore.setState({ trackerEdit: editing ? null : { clipId: clip.id, trackId: mt.id } }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "target", size: 15 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Delete tracker", "aria-label": "Delete tracker", onClick: () => removeMotionTrack(clip.id, mt.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "trash", size: 15 }) })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Track" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", disabled: !!job, title: "Track backward from the playhead", onClick: () => startTracking(clip.id, mt.id, -1), children: "◀ Back" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm on", disabled: !!job, title: "Track forward from the playhead", onClick: () => startTracking(clip.id, mt.id, 1), children: "Forward ▶" }),
            job && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", onClick: () => cancelAnalysis(job[0]), children: "Stop" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px" }, children: job ? `${job[1].label}… ${Math.round(job[1].progress * 100)}%` : `${frames} frame${frames === 1 ? "" : "s"} tracked${now ? ` · confidence ${Math.round(now.conf * 100)}%` : ""}. Place the point${mt.points.length > 1 ? "s" : ""} on high-contrast detail, then track.` }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Feature box", value: p0.feature, min: 9, max: 121, step: 2, unit: " px", onChange: (v) => setTrackBoxes(clip.id, mt.id, Math.round(v) | 1, Math.max(p0.search, v + 8)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Search area", value: p0.search, min: 21, max: 301, step: 2, unit: " px", onChange: (v) => setTrackBoxes(clip.id, mt.id, p0.feature, Math.round(v)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Apply to" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "mini-select",
              "aria-label": "Apply track to",
              value: "",
              disabled: frames < 2 || !targets.length,
              onChange: (e) => {
                const t = targets[Number(e.target.value)];
                if (t) applyMotionTrack(clip.id, mt.id, t.t);
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: targets.length ? "Choose a target…" : "Add another clip or a point effect" }),
                targets.map((t, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: i, children: t.label }, i))
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] })
      ]
    }
  );
}
function TextEditor({ clip, props }) {
  const fonts = useStore((s) => s.fonts);
  const upd = (fn, live = false) => updateClip(
    clip.id,
    (c) => {
      if (c.source.kind === "text") fn(c.source.props);
    },
    live
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Text", tag: "title", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-pad", children: /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { className: "text-input", "aria-label": "Title text", rows: 3, defaultValue: props.text, onBlur: (e) => e.target.value !== props.text && upd((p) => p.text = e.target.value), onKeyDown: (e) => e.stopPropagation() }, clip.id) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Font" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "mini-input", list: "font-list", "aria-label": "Font", defaultValue: props.font, onBlur: (e) => e.target.value && e.target.value !== props.font && upd((p) => p.font = e.target.value), onKeyDown: (e) => e.stopPropagation() }, clip.id + props.font),
      /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "font-list", children: fonts.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: f }, f)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Style" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": "Weight", value: props.weight, onChange: (e) => upd((p) => p.weight = Number(e.target.value)), children: [300, 400, 500, 600, 700, 800, 900].map((w) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: w, children: w }, w)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: props.italic, onChange: (e) => upd((p) => p.italic = e.target.checked) }),
          " Italic"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Size", value: props.size, min: 8, max: 400, step: 1, unit: " px", onChange: (v, l) => upd((p) => p.size = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Fill" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": "Text colour", value: props.color, onChange: (e) => upd((p) => p.color = e.target.value) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "mini-select", "aria-label": "Alignment", value: props.align, onChange: (e) => upd((p) => p.align = e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "left", children: "Left" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "center", children: "Centre" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "right", children: "Right" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Line height", value: props.lineHeight, min: 0.7, max: 3, step: 0.01, onChange: (v, l) => upd((p) => p.lineHeight = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Tracking", value: props.tracking, min: -20, max: 100, step: 0.5, unit: " px", onChange: (v, l) => upd((p) => p.tracking = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Stroke" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": "Stroke colour", value: props.strokeColor, onChange: (e) => upd((p) => p.strokeColor = e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Stroke width", value: props.strokeWidth, min: 0, max: 40, step: 0.5, unit: " px", onChange: (v, l) => upd((p) => p.strokeWidth = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Background" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": "Background colour", value: props.boxColor, onChange: (e) => upd((p) => p.boxColor = e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Bg opacity", value: props.boxOpacity, min: 0, max: 100, step: 1, unit: "%", onChange: (v, l) => upd((p) => p.boxOpacity = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Bg padding", value: props.boxPadding, min: 0, max: 200, step: 1, unit: " px", onChange: (v, l) => upd((p) => p.boxPadding = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Bg corners", value: props.boxRadius, min: 0, max: 200, step: 1, unit: " px", onChange: (v, l) => upd((p) => p.boxRadius = v, l) })
  ] });
}
function ShapeEditor({ clip, props }) {
  const upd = (fn, live = false) => updateClip(
    clip.id,
    (c) => {
      if (c.source.kind === "shape") fn(c.source.props);
    },
    live
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Shape", tag: "graphic", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Type" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "mini-select", "aria-label": "Shape type", value: props.shape, onChange: (e) => upd((p) => p.shape = e.target.value), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rectangle", children: "Rectangle" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ellipse", children: "Ellipse" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "shape.width", label: "Width", min: 1, max: 4e3, step: 1 }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "shape.height", label: "Height", min: 1, max: 4e3, step: 1 }),
    props.shape === "rectangle" && /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "shape.radius", label: "Corners", min: 0, max: 1e3, step: 1 }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Fill" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": "Fill colour", value: props.fill, onChange: (e) => upd((p) => p.fill = e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Fill opacity", value: props.fillOpacity, min: 0, max: 100, step: 1, unit: "%", onChange: (v, l) => upd((p) => p.fillOpacity = v, l) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Stroke" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": "Stroke colour", value: props.strokeColor, onChange: (e) => upd((p) => p.strokeColor = e.target.value) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Stroke width", value: props.strokeWidth, min: 0, max: 100, step: 0.5, unit: " px", onChange: (v, l) => upd((p) => p.strokeWidth = v, l) })
  ] });
}
function MaskSection({ clip, m }) {
  const maskEdit = useStore((s) => s.maskEdit);
  const editing = maskEdit?.maskId === m.id;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    Section,
    {
      title: m.name,
      tag: "mask",
      actions: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${editing ? " on" : ""}`, title: "Edit path in the monitor", "aria-label": "Edit path", onClick: () => useStore.setState({ maskEdit: editing ? null : { clipId: clip.id, maskId: m.id } }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "pen", size: 15 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${m.enabled ? "" : " off"}`, title: m.enabled ? "Disable mask" : "Enable mask", "aria-label": "Toggle mask", onClick: () => updateMask(clip.id, m.id, (x) => x.enabled = !x.enabled), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: m.enabled ? "eye" : "eyeOff", size: 15 }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Delete mask", "aria-label": "Delete mask", onClick: () => removeMask(clip.id, m.id), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "trash", size: 15 }) })
      ] }),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Mode" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "mini-select", "aria-label": "Mask mode", value: m.mode, onChange: (e) => updateMask(clip.id, m.id, (x) => x.mode = e.target.value), children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "add", children: "Add" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "subtract", children: "Subtract" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "intersect", children: "Intersect" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: m.inverted, onChange: (e) => updateMask(clip.id, m.id, (x) => x.inverted = e.target.checked) }),
              " Invert"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Path" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(KeyControls, { clip, path: `masks.${m.id}.path` }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: m.closed ? `${Math.floor(((Array.isArray(m.path) ? m.path : m.path.k[0]?.v) ?? []).length / 6)} points` : "Open path: click the first point to close" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `masks.${m.id}.feather`, label: "Feather", min: 0, max: 300, step: 0.5, unit: " px" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `masks.${m.id}.expansion`, label: "Expansion", min: -300, max: 300, step: 0.5, unit: " px" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: `masks.${m.id}.opacity`, label: "Opacity", min: 0, max: 100, step: 1, unit: "%" })
      ]
    }
  );
}
const ALIGN = [
  ["center", "Centre on cut"],
  ["start", "Start at cut"],
  ["end", "End at cut"]
];
const EASE = [
  ["linear", "Linear"],
  ["easeInOut", "Ease in and out"],
  ["easeIn", "Ease in"],
  ["easeOut", "Ease out"]
];
const CATEGORIES = TRANSITION_CATEGORIES;
function TransitionEditor({ seq, clipId, edge }) {
  const defaults = useStore((s) => s.transitionDefaults);
  const c = findClip(seq, clipId);
  const tr = edge === "in" ? c?.transitionIn : c?.transitionOut;
  if (!c || !tr) return null;
  const def = transitionDef(tr.type);
  const isAudio = trackOf(seq, c)?.kind === "audio";
  const twoSided = edge === "in" && !!prevClip(seq, c);
  const fps = seq.settings.fps;
  const isDefault = Math.abs(defaults.duration - tr.duration) < 1e-3 && defaults.align === (tr.align ?? "center") && defaults.ease === (tr.ease ?? "linear");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Transition", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Transition" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", children: def.name })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "mini-select",
            "aria-label": "Transition type",
            value: tr.type,
            onChange: (e) => updateTransition(clipId, edge, (t) => {
              t.type = e.target.value;
              t.params = {};
              for (const p of transitionDef(t.type).params) t.params[p.key] = typeof p.default === "boolean" ? p.default ? 1 : 0 : p.default;
            }),
            children: CATEGORIES.filter((cat) => cat === "Audio" === isAudio).map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: cat, children: TRANSITIONS.filter((x) => x.category === cat).map((x) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: x.type, children: x.name }, x.type)) }, cat))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "0 12px" }, children: def.description }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: "Duration", value: tr.duration, min: 1 / fps, max: Math.max(1, c.duration), step: 1 / fps, unit: " s", onChange: (v, l) => updateTransition(clipId, edge, (t) => t.duration = Math.max(1 / fps, v), l) }),
      twoSided && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Alignment" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": "Alignment", value: tr.align ?? "center", onChange: (e) => updateTransition(clipId, edge, (t) => t.align = e.target.value), children: ALIGN.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Easing" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": "Easing", value: tr.ease ?? "linear", onChange: (e) => updateTransition(clipId, edge, (t) => t.ease = e.target.value), children: EASE.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }),
      !isAudio && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Reverse" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": "Reverse", checked: !!tr.reverse, onChange: (e) => updateTransition(clipId, edge, (t) => t.reverse = e.target.checked) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }),
      def.params.map(
        (p) => p.kind === "enum" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": p.label, value: String(tr.params[p.key] ?? p.default), onChange: (e) => updateTransition(clipId, edge, (t) => t.params[p.key] = e.target.value), children: p.options.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }, p.key) : p.kind === "color" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "color", className: "swatch", "aria-label": p.label, value: String(tr.params[p.key] ?? p.default), onChange: (e) => updateTransition(clipId, edge, (t) => t.params[p.key] = e.target.value) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }, p.key) : p.kind === "bool" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", "aria-label": p.label, checked: Number(tr.params[p.key] ?? (p.default ? 1 : 0)) > 0.5, onChange: (e) => updateTransition(clipId, edge, (t) => t.params[p.key] = e.target.checked ? 1 : 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }, p.key) : p.kind === "file" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: p.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: String(tr.params[p.key] ?? ""), children: String(tr.params[p.key] ?? "") ? String(tr.params[p.key]).split("/").pop() : "None" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn sm",
              onClick: async () => {
                const path = await window.cuttingfloor.openFileDialog(`Choose ${p.label.toLowerCase()}`, p.extensions);
                if (path)
                  updateTransition(clipId, edge, (t) => {
                    t.params[p.key] = path;
                    if (t.type === "gradientWipe") t.params.pattern = "image";
                  });
              },
              children: "Browse"
            }
          )
        ] }, p.key) : /* @__PURE__ */ jsxRuntimeExports.jsx(PlainRow, { label: p.label, value: Number(tr.params[p.key] ?? p.default), min: p.min, max: p.max, step: p.step, onChange: (v, l) => updateTransition(clipId, edge, (t) => t.params[p.key] = v, l) }, p.key)
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "6px 12px" }, children: twoSided ? "Blends this clip with the one before it." : edge === "in" ? "No clip before this one, so it fades in from nothing." : "Fades out to nothing at the end of the clip." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ec-group", children: "Defaults for new transitions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "note", style: { padding: "0 12px" }, children: [
        defaults.duration.toFixed(2),
        " s · ",
        ALIGN.find((a) => a[0] === defaults.align)?.[1],
        " · ",
        EASE.find((e) => e[0] === defaults.ease)?.[1]
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "add-fx", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", disabled: isDefault, onClick: () => setTransitionDefaults({ duration: tr.duration, align: tr.align ?? "center", ease: tr.ease ?? "linear" }), children: "Save as default" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "btn",
            onClick: () => {
              commitSeq((q) => {
                const cl = findClip(q, clipId);
                if (cl) {
                  if (edge === "in") cl.transitionIn = void 0;
                  else cl.transitionOut = void 0;
                }
              });
              useStore.setState({ selectedTransition: null });
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "trash", size: 14 }),
              " Remove"
            ]
          }
        )
      ] })
    ] })
  ] });
}
function AddEffect({ clip, kind }) {
  const allPresets = useStore((s) => s.presets);
  const presets = allPresets.filter((p) => p.kind === kind);
  const cats = kind === "video" ? VIDEO_CATEGORIES : AUDIO_CATEGORIES;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "add-fx", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "select",
      {
        className: "mini-select",
        style: { flex: 1 },
        "aria-label": kind === "video" ? "Add video effect" : "Add audio effect",
        value: "",
        onChange: (e) => {
          const v = e.target.value;
          if (v.startsWith("preset:")) applyPreset(v.slice(7), [clip.id]);
          else if (v) addEffect(clip.id, v);
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: kind === "video" ? "+ Add video effect…" : "+ Add audio effect…" }),
          cats.map((cat) => /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: cat, children: EFFECTS.filter((e) => e.category === cat).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: e.type, children: e.name }, e.type)) }, cat)),
          presets.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("optgroup", { label: "Presets", children: presets.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "preset:" + p.id, children: p.name }, p.id)) })
        ]
      }
    ),
    kind === "video" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn", title: "Add a rectangle mask", "aria-label": "Add rectangle mask", onClick: () => addMask(clip.id, "rect"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 14 }),
        " ▭"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn", title: "Add an ellipse mask", "aria-label": "Add ellipse mask", onClick: () => addMask(clip.id, "ellipse"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "plus", size: 14 }),
        " ◯"
      ] })
    ] })
  ] });
}
function EffectControls({ prefer } = {}) {
  const primary = useStore(primarySelection);
  const selection = useStore((s) => s.selection);
  const seqForPick = useStore((s) => activeSeq(s));
  const audioPick = prefer === "audio" ? selection.map((id) => findClip(seqForPick, id)).find((c) => c && trackOf(seqForPick, c)?.kind === "audio") : void 0;
  const clip = audioPick ?? primary;
  const seq = useStore((s) => activeSeq(s));
  const selTr = useStore((s) => s.selectedTransition);
  const doc = useStore((s) => s.doc);
  const media = useStore((s) => s.media);
  if (selTr) return /* @__PURE__ */ jsxRuntimeExports.jsx(TransitionEditor, { seq, clipId: selTr.clipId, edge: selTr.edge });
  if (!clip) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Effect controls", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "panel-head", children: /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Effect Controls" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty", children: [
        "Select a clip to adjust its motion, effects and masks.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
        "Drag effects from the Effects tab onto clips, and transitions onto clip edges."
      ] })
    ] });
  }
  const isVideo = trackOf(seq, clip)?.kind === "video";
  const uniform = clip.transform.scaleY === void 0;
  const p = { doc, media };
  const m = clip.source.kind === "media" ? media[clip.source.mediaId] : void 0;
  const trackable = isVideo && m?.kind === "video";
  const isAdjust = clip.source.kind === "adjustment";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel", "aria-label": "Effect controls", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Effect Controls" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dim", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        clipLabel(p, clip),
        clip.speed !== 1 ? ` · ${Math.round(clip.speed * 100)}%` : "",
        clip.reverse ? " · reversed" : ""
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "icon-btn",
          title: "Effect stack actions",
          "aria-label": "Effect stack actions",
          onClick: (e) => openContextMenu({ clientX: e.clientX, clientY: e.clientY + 10, preventDefault: () => {
          } }, [
            { label: "Copy all attributes", keys: "Ctrl+Alt+C", run: () => copyEffects(clip.id) },
            {
              label: "Save effects as preset…",
              disabled: !clip.effects.length,
              run: () => {
                const n = prompt("Preset name", clipLabel(p, clip) + " look");
                if (n) void savePreset(clip.id, n);
              }
            }
          ]),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "more", size: 15 })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "scroll", children: [
      clip.source.kind === "text" && /* @__PURE__ */ jsxRuntimeExports.jsx(TextEditor, { clip, props: clip.source.props }),
      clip.source.kind === "shape" && /* @__PURE__ */ jsxRuntimeExports.jsx(ShapeEditor, { clip, props: clip.source.props }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(GeneratorEditor, { clip }),
      isAdjust && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "note", style: { padding: "8px 12px 0" }, children: "Adjustment layer: its effects apply to everything on the tracks below. Use Opacity and masks to limit where." }),
      clip.source.kind === "solid" && /* @__PURE__ */ jsxRuntimeExports.jsx(Section, { title: "Color Matte", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Colour" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "color",
            className: "swatch",
            "aria-label": "Matte colour",
            value: clip.source.color,
            onChange: (e) => updateClip(clip.id, (c) => {
              if (c.source.kind === "solid") c.source.color = e.target.value;
            })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
      ] }) }),
      isVideo ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Section,
        {
          title: isAdjust ? "Opacity" : "Motion",
          actions: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", title: "Reset motion", "aria-label": "Reset motion", onClick: () => updateClip(clip.id, (c) => c.transform = { ...DEFAULT_TRANSFORM }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "reset", size: 15 }) }),
          children: [
            !isAdjust && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.x", label: "Position X", min: -seq.settings.width, max: seq.settings.width, step: 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.y", label: "Position Y", min: -seq.settings.height, max: seq.settings.height, step: 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.scale", label: uniform ? "Scale" : "Scale width", min: 0, max: 400, step: 0.1, unit: "%" }),
              !uniform && /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.scaleY", label: "Scale height", min: 0, max: 400, step: 0.1, unit: "%" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "chk", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: uniform,
                      onChange: (e) => updateClip(clip.id, (c) => {
                        if (e.target.checked) delete c.transform.scaleY;
                        else c.transform.scaleY = c.transform.scale;
                      })
                    }
                  ),
                  " ",
                  "Uniform scale"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.rotation", label: "Rotation", min: -360, max: 360, step: 0.1, unit: "°" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.anchorX", label: "Anchor X", min: -4e3, max: 4e3, step: 1, noSlider: true }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.anchorY", label: "Anchor Y", min: -4e3, max: 4e3, step: 1, noSlider: true })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "transform.opacity", label: "Opacity", min: 0, max: 100, step: 0.1, unit: "%" }),
            !isAdjust && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Blend mode" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": "Blend mode", value: clip.blendMode, onChange: (e) => updateClip(clip.id, (c) => c.blendMode = e.target.value), children: BLEND_MODES.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "ec-row", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Track matte" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "mini-select", "aria-label": "Track matte", title: "Use the clip on the track above as this clip's matte (that track is hidden)", value: clip.trackMatte ?? "none", onChange: (e) => setTrackMatte([clip.id], e.target.value), children: MATTES.map(([v, l]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, children: l }, v)) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
            ] })
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(Section, { title: "Audio", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "volume", label: "Volume", min: -60, max: 12, step: 0.1, unit: " dB" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ParamRow, { clip, path: "pan", label: "Pan", min: -100, max: 100, step: 1 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(TimeSection, { clip }),
      isVideo && clip.masks.map((mk) => /* @__PURE__ */ jsxRuntimeExports.jsx(MaskSection, { clip, m: mk }, mk.id)),
      clip.effects.map((fx2, i) => isEffectKind(fx2, isVideo ? "video" : "audio") ? /* @__PURE__ */ jsxRuntimeExports.jsx(EffectSection, { clip, fx: fx2, index: i, count: clip.effects.length }, fx2.id) : null),
      trackable && (clip.motionTracks ?? []).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(TrackerSection, { clip, seq, mt: t }, t.id)),
      /* @__PURE__ */ jsxRuntimeExports.jsx(AddEffect, { clip, kind: isVideo ? "video" : "audio" }),
      trackable && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "add-fx", style: { paddingTop: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dim", style: { fontSize: 11, alignSelf: "center" }, children: "Track motion:" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", disabled: !isLinearTime(clip), title: "One point: position", onClick: () => addMotionTrack(clip.id, 1), children: "1 point" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", disabled: !isLinearTime(clip), title: "Two points: position, rotation and scale", onClick: () => addMotionTrack(clip.id, 2), children: "2 points" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn sm", disabled: !isLinearTime(clip), title: "Four points: corner pin (screen replacement)", onClick: () => addMotionTrack(clip.id, 4), children: "Corner pin" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "note", style: { padding: "0 12px 12px" }, children: [
        "Click ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stopwatch", size: 11 }),
        " to animate a value; keys are added wherever you change it. Drag an effect's title to reorder the stack (it runs top to bottom)."
      ] })
    ] })
  ] });
}
function isEffectKind(fx2, kind) {
  try {
    return effectDef(fx2.type).kind === kind;
  } catch {
    return false;
  }
}
const HEADER = 64;
const CHUNK = 16;
const MAX_FRAMES = 360;
class MatteCache {
  constructor(url, onLoaded) {
    this.url = url;
    this.onLoaded = onLoaded;
  }
  url;
  onLoaded;
  frames = /* @__PURE__ */ new Map();
  // `${file}:${index}` → pixels (insertion order = age)
  loading = /* @__PURE__ */ new Set();
  // `${file}:${chunk}`
  failed = /* @__PURE__ */ new Set();
  get(d, index) {
    const key = `${d.file}:${index}`;
    const hit = this.frames.get(key);
    if (hit) {
      this.frames.delete(key);
      this.frames.set(key, hit);
      return hit;
    }
    void this.load(d, Math.floor(index / CHUNK));
    for (let r = 1; r <= CHUNK * 2; r++) {
      const a = this.frames.get(`${d.file}:${index - r}`) ?? this.frames.get(`${d.file}:${index + r}`);
      if (a) return a;
    }
    return null;
  }
  async load(d, chunk) {
    const lk = `${d.file}:${chunk}`;
    if (this.loading.has(lk) || this.failed.has(d.file)) return;
    this.loading.add(lk);
    const size = d.w * d.h * 2;
    const first = chunk * CHUNK;
    const count = Math.min(CHUNK, d.n - first);
    if (count <= 0) return;
    try {
      const start = HEADER + first * size;
      const res = await fetch(this.url(d.file), { headers: { Range: `bytes=${start}-${start + count * size - 1}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      for (let i = 0; i < count && (i + 1) * size <= buf.length; i++) this.frames.set(`${d.file}:${first + i}`, buf.slice(i * size, (i + 1) * size));
      while (this.frames.size > MAX_FRAMES) this.frames.delete(this.frames.keys().next().value);
      this.onLoaded();
    } catch {
      this.failed.add(d.file);
    } finally {
      this.loading.delete(lk);
    }
  }
}
const workletUrl = "" + new URL("worklet-MZEdrA2h.js", import.meta.url).href;
function timeSig(v) {
  return JSON.stringify([v.media.path, v.chain.map((c) => [c.start, c.in, c.duration, c.speed, c.reverse, c.freeze, c.remap])]);
}
const BROWSER_VIDEO_CODECS = /* @__PURE__ */ new Set(["h264", "vp8", "vp9", "av1"]);
function videoUrl(m) {
  if (m.offline) return null;
  if (m.kind === "image") return mediaUrl(m.path);
  if (m.proxyStatus === "ready" && m.proxyPath) return mediaUrl(m.proxyPath);
  if (BROWSER_VIDEO_CODECS.has(m.videoCodec) && /^(yuv420p|yuvj420p|nv12)$/.test(m.pixFmt)) return mediaUrl(m.path);
  return null;
}
function audioUrl(m) {
  if (m.offline) return null;
  if (m.kind === "audio") return mediaUrl(m.path);
  if (m.proxyStatus === "ready" && m.proxyPath) return mediaUrl(m.proxyPath);
  if (BROWSER_VIDEO_CODECS.has(m.videoCodec)) return mediaUrl(m.path);
  return null;
}
class PreviewEngine {
  comp;
  /** Bundled AudioWorklet module (effects + meter). */
  workletUrl = workletUrl;
  sources = /* @__PURE__ */ new Map();
  ctx;
  master;
  masterIn;
  masterInsert = {};
  masterAnalysers;
  fxReady = false;
  meter = null;
  reading = null;
  timeVoices = /* @__PURE__ */ new Map();
  buses = /* @__PURE__ */ new Map();
  raf = 0;
  needsRender = true;
  anchorPerf = 0;
  anchorTime = 0;
  lastTime = -1;
  lastPlaying = false;
  lastSeqId = "";
  unsub;
  levelBuf = new Float32Array(512);
  tick = 0;
  lastLayers = [];
  images = /* @__PURE__ */ new Map();
  onError = () => {
  };
  /** Called after each rendered frame (scopes hook). */
  onFrame = null;
  constructor(canvas) {
    this.comp = new Compositor(canvas);
    this.comp.onWarning = (m) => this.onError(m);
    this.ctx = new AudioContext({ latencyHint: "interactive", sampleRate: 48e3 });
    this.master = this.ctx.createGain();
    this.masterIn = this.ctx.createGain();
    this.masterIn.connect(this.master);
    this.masterAnalysers = this.splitAnalysers(this.master);
    this.master.connect(this.ctx.destination);
    this.ctx.audioWorklet.addModule(workletUrl).then(() => {
      this.fxReady = true;
      this.meter = new AudioWorkletNode(this.ctx, "cuttingfloor-meter", { numberOfInputs: 1, numberOfOutputs: 0 });
      this.meter.port.onmessage = (e) => this.reading = e.data;
      this.master.connect(this.meter);
    }).catch((e) => this.onError(`Audio effects unavailable: ${e.message}`));
    this.unsub = useStore.subscribe((s, prev) => {
      if (s.doc !== prev.doc || s.media !== prev.media || s.selection !== prev.selection || s.showMatte !== prev.showMatte || s.previewScale !== prev.previewScale || s.luts !== prev.luts || s.activeSeqId !== prev.activeSeqId) {
        this.needsRender = true;
      }
    });
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    document.fonts.addEventListener("loadingdone", this.onFonts);
  }
  onFonts = () => {
    this.comp.fontEpoch++;
    this.needsRender = true;
  };
  splitAnalysers(node) {
    const split = this.ctx.createChannelSplitter(2);
    const a = [this.ctx.createAnalyser(), this.ctx.createAnalyser()];
    for (const x of a) x.fftSize = 512;
    node.connect(split);
    split.connect(a[0], 0);
    split.connect(a[1], 1);
    return a;
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    document.fonts.removeEventListener("loadingdone", this.onFonts);
    this.unsub();
    for (const [id] of this.sources) this.dropSource(id);
    for (const [id] of this.timeVoices) this.dropTimeVoice(id);
    void this.ctx.close();
  }
  invalidate() {
    this.needsRender = true;
  }
  peak(a) {
    a.getFloatTimeDomainData(this.levelBuf);
    let m = 0;
    for (let k = 0; k < this.levelBuf.length; k++) m = Math.max(m, Math.abs(this.levelBuf[k]));
    return m;
  }
  /** Master peak per channel, 0..1. */
  levels() {
    return [this.peak(this.masterAnalysers[0]), this.peak(this.masterAnalysers[1])];
  }
  /** Loudness of what is playing (LUFS / dBTP), updated ~10× a second. */
  loudness() {
    return this.reading;
  }
  /** Restart the integrated loudness measurement. */
  resetLoudness() {
    this.meter?.port.postMessage({ reset: true });
  }
  /** Peak per channel for a top-level audio track. */
  trackLevels(trackId) {
    const b = this.buses.get(trackId);
    return b ? [this.peak(b.analysers[0]), this.peak(b.analysers[1])] : [0, 0];
  }
  // ---------- sources ----------
  dropSource(id) {
    const s = this.sources.get(id);
    if (!s) return;
    if (s.el instanceof HTMLMediaElement) {
      s.el.pause();
      s.el.removeAttribute("src");
      s.el.load();
    }
    s.node?.disconnect();
    s.fx?.disconnect();
    s.gain?.disconnect();
    s.panner?.disconnect();
    this.sources.delete(id);
  }
  bus(trackId) {
    let b = this.buses.get(trackId);
    if (!b) {
      const inp = this.ctx.createGain();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      inp.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterIn);
      b = { in: inp, gain, panner, analysers: this.splitAnalysers(panner) };
      this.buses.set(trackId, b);
    }
    return b;
  }
  /**
   * Keep an effect chain between `from` and `to`. The worklet is inserted the
   * first time the chain is non-empty and stays (as a pass-through) after.
   */
  applyChain(ins, from, to, items) {
    if (!this.fxReady) return;
    if (!ins.fx) {
      if (!items.length) return;
      const fx2 = new AudioWorkletNode(this.ctx, "cuttingfloor-fx", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], processorOptions: { items } });
      ins.fxJson = JSON.stringify(items);
      from.disconnect();
      from.connect(fx2);
      fx2.connect(to);
      ins.fx = fx2;
    }
    const json = JSON.stringify(items);
    if (json !== ins.fxJson) {
      ins.fxJson = json;
      ins.fx.port.postMessage({ items });
    }
  }
  videoSource(key, m) {
    const url = videoUrl(m);
    const id = "v:" + key;
    const existing = this.sources.get(id);
    if (existing && existing.url === url) {
      existing.lastUse = this.tick;
      return existing;
    }
    if (existing) this.dropSource(id);
    if (!url) return null;
    let el;
    if (m.kind === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => this.needsRender = true;
      img.src = url;
      el = img;
    } else {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.preload = "auto";
      v.muted = true;
      v.playsInline = true;
      v.addEventListener("seeked", () => this.needsRender = true);
      v.addEventListener("loadeddata", () => this.needsRender = true);
      v.addEventListener("error", () => this.onError(`Can't play ${m.name}${m.proxyStatus !== "ready" ? " (waiting for proxy)" : ""}`));
      v.src = url;
      el = v;
    }
    const s = { el, url, lastUse: this.tick };
    this.sources.set(id, s);
    return s;
  }
  audioSource(key, m, busId) {
    const url = audioUrl(m);
    const id = "a:" + key;
    const existing = this.sources.get(id);
    if (existing && existing.url === url && existing.bus === busId) {
      existing.lastUse = this.tick;
      return existing;
    }
    if (existing) this.dropSource(id);
    if (!url) return null;
    const el = new Audio();
    el.crossOrigin = "anonymous";
    el.preload = "auto";
    el.src = url;
    const node = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    node.connect(gain).connect(panner).connect(this.bus(busId).in);
    const s = { el, url, node, gain, panner, bus: busId, lastUse: this.tick };
    this.sources.set(id, s);
    return s;
  }
  // ---------- sync ----------
  /**
   * Keep a media element on `local` (source seconds). `smooth` sources play at
   * `speed`; others (reverse, freeze, posterize) are held paused and seeked
   * to every frame.
   */
  syncElement(el, local, speed, playing, fps, tolerance, smooth = true) {
    if (el.readyState < 1) return;
    const dur = Number.isFinite(el.duration) ? el.duration : Infinity;
    const target = Math.max(0, Math.min(local, dur - 0.5 / fps));
    const rate = Math.max(0.0625, Math.min(16, speed));
    if (smooth && Math.abs(el.playbackRate - rate) > 1e-3) el.playbackRate = rate;
    const outside = local < -0.5 / fps || local > dur;
    if (playing && !outside && smooth && speed >= 0.0625 && speed <= 16) {
      if (el.paused) {
        el.currentTime = target;
        void el.play().catch(() => {
        });
      } else if (Math.abs(el.currentTime - target) > tolerance * Math.max(1, rate)) {
        el.currentTime = target;
      }
    } else {
      if (!el.paused) el.pause();
      if (Math.abs(el.currentTime - target) > 0.5 / fps) el.currentTime = target;
    }
  }
  sync(p, seq, t, playing, layers) {
    this.tick++;
    const fps = seq.settings.fps;
    const used = /* @__PURE__ */ new Set();
    for (const { l, rate, smooth } of mediaUses(layers)) {
      const s = this.videoSource(l.key, l.media);
      if (!s) continue;
      used.add("v:" + l.key);
      if (s.el instanceof HTMLVideoElement) this.syncElement(s.el, l.mt, rate, playing, fps, 0.15, smooth);
    }
    for (const v of evaluateAudio(p, seq, t)) {
      if (!v.linear) {
        this.timeVoice(v, p, seq, t, playing, used);
        continue;
      }
      const s = this.audioSource(v.key, v.media, v.busTrackId);
      if (!s || !(s.el instanceof HTMLMediaElement)) continue;
      used.add("a:" + v.key);
      this.syncElement(s.el, v.src, v.speed, playing, fps, 0.08);
      this.applyChain(s, s.node, s.gain, voiceChain(v));
      s.gain.gain.setTargetAtTime(v.gain, this.ctx.currentTime, 0.01);
      s.panner.pan.value = v.pan;
    }
    for (const [id, tv] of this.timeVoices) {
      if (used.has(id)) continue;
      this.stopTimeVoice(tv);
      if (this.tick - tv.lastUse > 240) this.dropTimeVoice(id);
    }
    for (const tr of seq.tracks) {
      if (tr.kind !== "audio") continue;
      const b = this.bus(tr.id);
      this.applyChain(b, b.in, b.gain, trackChain(tr, t));
      b.gain.gain.setTargetAtTime(tr.muted ? 0 : dbToGain(tr.volume), this.ctx.currentTime, 0.01);
      b.panner.pan.value = tr.pan / 100;
    }
    this.applyChain(this.masterInsert, this.masterIn, this.master, masterChain(seq, t));
    this.master.gain.setTargetAtTime(dbToGain(seq.masterVolume), this.ctx.currentTime, 0.01);
    const horizon = playing ? 1.5 : 0.4;
    for (const { l, rate, smooth } of mediaUses(evaluateVideo(p, seq, t + horizon))) {
      if (used.has("v:" + l.key)) continue;
      const s = this.videoSource(l.key, l.media);
      if (!s || !(s.el instanceof HTMLVideoElement) || s.el.readyState < 1) continue;
      used.add("v:" + l.key);
      if (!s.el.paused) s.el.pause();
      const target = Math.max(0, smooth ? l.mt - horizon * rate : l.mt);
      if (Math.abs(s.el.currentTime - target) > 0.1) s.el.currentTime = target;
    }
    for (const [id, s] of this.sources) {
      if (used.has(id)) continue;
      if (s.el instanceof HTMLMediaElement && !s.el.paused) s.el.pause();
      if (this.tick - s.lastUse > 240) this.dropSource(id);
    }
  }
  // ---------- time-mapped audio (reverse / remap) ----------
  timeVoice(v, p, seq, t, playing, used) {
    const id = "t:" + v.key;
    used.add(id);
    const sig = timeSig(v);
    let tv = this.timeVoices.get(id);
    if (tv && (tv.sig !== sig || tv.bus !== v.busTrackId)) {
      this.dropTimeVoice(id);
      tv = void 0;
    }
    if (!tv) {
      const inp = this.ctx.createGain();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      inp.connect(gain).connect(panner).connect(this.bus(v.busTrackId).in);
      const made = { sig, bus: v.busTrackId, inp, gain, panner, buffer: null, t0: 0, startCtx: 0, startOff: 0, lastUse: this.tick };
      tv = made;
      this.timeVoices.set(id, made);
      void this.renderTimeVoice(made, v, p, seq);
    }
    tv.lastUse = this.tick;
    this.applyChain(tv, tv.inp, tv.gain, voiceChain(v));
    tv.gain.gain.setTargetAtTime(v.gain, this.ctx.currentTime, 0.01);
    tv.panner.pan.value = v.pan;
    const want = t - tv.t0;
    if (!playing || !tv.buffer || want < 0 || want >= tv.buffer.duration) {
      this.stopTimeVoice(tv);
      return;
    }
    const actual = tv.node ? tv.startOff + (this.ctx.currentTime - tv.startCtx) : NaN;
    if (!tv.node || !(Math.abs(actual - want) < 0.06)) {
      this.stopTimeVoice(tv);
      const node = this.ctx.createBufferSource();
      node.buffer = tv.buffer;
      node.connect(tv.inp);
      node.start(0, want);
      tv.node = node;
      tv.startCtx = this.ctx.currentTime;
      tv.startOff = want;
    }
  }
  /** Render the voice over its top-level clip's span, exactly like the export mixer. */
  async renderTimeVoice(tv, v, p, seq) {
    const top = seq.clips.find((c) => c.id === v.key.split("/")[0]);
    if (!top) return;
    const [t0, t1raw] = activeRange(seq, top);
    const t1 = Math.min(t1raw, t0 + 20 * 60);
    const [s0, s1] = sourceRange(v.seq, v.clip);
    let pcm;
    try {
      pcm = await window.cuttingfloor.pcm(v.media.path, s0, s1 - s0);
    } catch (e) {
      this.onError(`Can't decode audio of ${v.media.name}: ${e.message}`);
      return;
    }
    if (tv.dead) return;
    const SR = 48e3;
    const n = Math.max(1, Math.ceil((t1 - t0) * SR));
    const buf = this.ctx.createBuffer(2, n, SR);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const B = 1024;
    for (let o = 0, k = 0; o < n; o += B, k++) {
      const len = Math.min(B, n - o);
      const ta = t0 + o / SR;
      const va = evaluateAudio(p, seq, ta).find((x) => x.key === v.key);
      if (va && va.speed !== 0) {
        const vb = evaluateAudio(p, seq, ta + len / SR - 1e-7).find((x) => x.key === v.key);
        const srcB = va.src + (va.speed + (vb?.speed ?? va.speed)) / 2 * (len / SR);
        readVarispeed(pcm, s0, SR, va.src, srcB, len, L.subarray(o, o + len), R.subarray(o, o + len));
      }
      if (k % 200 === 199) {
        await new Promise((r) => setTimeout(r, 0));
        if (tv.dead) return;
      }
    }
    tv.buffer = buf;
    tv.t0 = t0;
  }
  stopTimeVoice(tv) {
    if (!tv.node) return;
    try {
      tv.node.stop();
    } catch {
    }
    tv.node.disconnect();
    tv.node = void 0;
  }
  dropTimeVoice(id) {
    const tv = this.timeVoices.get(id);
    if (!tv) return;
    tv.dead = true;
    this.stopTimeVoice(tv);
    tv.inp.disconnect();
    tv.fx?.disconnect();
    tv.gain.disconnect();
    tv.panner.disconnect();
    this.timeVoices.delete(id);
  }
  // ---------- frame loop ----------
  loop() {
    this.raf = requestAnimationFrame(this.loop);
    const s = useStore.getState();
    const seq = activeSeq(s);
    const now = performance.now();
    if (s.playing !== this.lastPlaying || s.time !== this.lastTime && this.lastTime >= 0 || seq.id !== this.lastSeqId) {
      this.anchorPerf = now;
      this.anchorTime = s.time;
      this.needsRender = true;
      if (s.playing && this.ctx.state !== "running") void this.ctx.resume();
    }
    this.lastPlaying = s.playing;
    this.lastSeqId = seq.id;
    let t = s.time;
    if (s.playing) {
      t = this.anchorTime + (now - this.anchorPerf) / 1e3;
      const end = seq.outPoint !== void 0 && s.time < seq.outPoint ? seq.outPoint : sequenceDuration(seq);
      if (t >= end) {
        t = end;
        useStore.setState({ playing: false, time: t });
        this.lastPlaying = false;
      } else {
        useStore.setState({ time: t });
      }
    }
    this.lastTime = useStore.getState().time;
    if (!s.playing && !this.needsRender) return;
    this.needsRender = false;
    const p = project(s);
    const layers = evaluateVideo(p, seq, t);
    this.lastLayers = layers;
    this.sync(p, seq, t, s.playing, layers);
    this.draw(seq, layers);
    if (!s.playing) {
      for (const { l } of mediaUses(layers)) {
        const src = this.sources.get("v:" + l.key);
        if (src?.el instanceof HTMLVideoElement && (src.el.seeking || src.el.readyState < 2)) this.needsRender = true;
      }
    }
  }
  mattes = new MatteCache(mediaUrl, () => this.needsRender = true);
  provider = {
    matte: (d, i) => this.mattes.get(d, i),
    media: (l) => {
      const src = this.sources.get("v:" + l.key);
      if (!src) return null;
      if (src.el instanceof HTMLVideoElement) return src.el.readyState >= 2 ? src.el : null;
      if (src.el instanceof HTMLImageElement) return src.el.complete && src.el.naturalWidth > 0 ? src.el : null;
      return null;
    },
    lut: (path) => {
      const text = useStore.getState().luts[path];
      if (!text) void loadLut(path);
      return text ?? null;
    },
    image: (path) => {
      let img = this.images.get(path);
      if (!img) {
        img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => this.needsRender = true;
        img.src = mediaUrl(path);
        this.images.set(path, img);
      }
      return img.complete && img.naturalWidth > 0 ? img : null;
    }
  };
  draw(seq, layers) {
    const s = useStore.getState();
    const sel = primarySelection(s);
    const matteKey = s.showMatte && sel && sel.effects.some((e) => (e.type === "chromaKey" || e.type === "lumaKey" || e.type === "subjectKey") && e.enabled) ? sel.id : null;
    try {
      this.comp.renderToCanvas(layers, seq, this.provider, s.previewScale, matteKey);
      this.onFrame?.();
    } catch (e) {
      this.onError(e.message);
    }
  }
  // ---------- picking & overlays ----------
  /** Top-level layer of a clip at the current time (if visible). */
  layerOf(clipId) {
    return expandPairs(this.lastLayers).find((l) => l.clip.id === clipId);
  }
  geomOf(clipId) {
    const l = this.layerOf(clipId);
    return l ? this.comp.geomOf(l) : null;
  }
  /** Topmost clip under a point in sequence pixels. */
  hitTest(px, py) {
    for (const l of [...expandPairs(this.lastLayers)].reverse()) {
      if (l.kind === "adjustment") continue;
      if (pickUV(px, py, this.comp.geomOf(l))) return l.clip;
    }
    return null;
  }
  /** Average source colour (before effects) around a point, for the key eyedropper. */
  sampleColor(clipId, px, py) {
    const l = this.layerOf(clipId);
    if (!l || l.kind !== "media") return null;
    const uv = pickUV(px, py, this.comp.geomOf(l));
    const src = this.sources.get("v:" + l.key);
    if (!uv || !src) return null;
    const el = src.el;
    const w = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
    const h = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
    if (!w || !h) return null;
    const cv = document.createElement("canvas");
    cv.width = 5;
    cv.height = 5;
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(el, Math.max(0, uv.u * w - 2), Math.max(0, uv.v * h - 2), 5, 5, 0, 0, 5, 5);
    const d = g.getImageData(0, 0, 5, 5).data;
    let r = 0;
    let gg = 0;
    let b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
    }
    const n = d.length / 4;
    return rgbToHex(r / n, gg / n, b / n);
  }
  /** Low-res RGBA of the last frame for scopes. */
  scopes(w, h) {
    return this.comp.readScopes(w, h);
  }
}
function jumpEdit(dir) {
  const s = useStore.getState();
  const pts = editPoints(activeSeq(s));
  const t = s.time;
  const target = dir > 0 ? pts.find((p) => p > t + 1e-4) : [...pts].reverse().find((p) => p < t - 1e-4);
  if (target !== void 0) {
    useStore.setState({ playing: false });
    setTime(target);
  }
}
function TimecodeField() {
  const time = useStore((s) => s.time);
  const fps = useStore((s) => activeSeq(s).settings.fps);
  const [edit, setEdit] = reactExports.useState(null);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      className: "tc",
      "aria-label": "Current time",
      value: edit ?? timecode(time, fps),
      onFocus: (e) => {
        setEdit(timecode(time, fps));
        requestAnimationFrame(() => e.target.select());
      },
      onChange: (e) => setEdit(e.target.value),
      onBlur: () => {
        if (edit !== null) {
          const t = parseTimecode(edit, fps);
          if (t !== null) setTime(t);
        }
        setEdit(null);
      },
      onKeyDown: (e) => {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === "Escape") {
          if (e.key === "Escape") setEdit(null);
          e.target.blur();
        }
      }
    }
  );
}
function geomFor(clipId) {
  const e = getEngine();
  if (!e || !clipId) return null;
  const s = useStore.getState();
  const l = expandPairs(evaluateVideo(project(s), activeSeq(s), s.time)).find((x) => x.clip.id === clipId);
  return l ? e.comp.geomOf(l) : null;
}
function Monitor() {
  const viewerRef = reactExports.useRef(null);
  const canvasRef = reactExports.useRef(null);
  const engineRef = reactExports.useRef(null);
  const [box, setBox] = reactExports.useState({ w: 640, h: 360 });
  const seq = useStore((s) => activeSeq(s));
  const S = seq.settings;
  const playing = useStore((s) => s.playing);
  const scale = useStore((s) => s.previewScale);
  const guides = useStore((s) => s.safeGuides);
  const showMatte = useStore((s) => s.showMatte);
  const eyedropper = useStore((s) => s.eyedropper);
  const tool = useStore((s) => s.tool);
  const maskEdit = useStore((s) => s.maskEdit);
  const time = useStore((s) => s.time);
  useStore((s) => s.doc);
  const primary = useStore(primarySelection);
  const duration = sequenceDuration(seq);
  const drag = reactExports.useRef(null);
  const [, force] = reactExports.useState(0);
  reactExports.useEffect(() => {
    try {
      const e = new PreviewEngine(canvasRef.current);
      e.onError = (m) => toast(m, "error");
      engineRef.current = e;
      setEngine(e);
      force((n) => n + 1);
      return () => {
        e.dispose();
        setEngine(null);
      };
    } catch (err) {
      toast(err.message, "error");
      return void 0;
    }
  }, []);
  reactExports.useLayoutEffect(() => {
    const el = viewerRef.current;
    const ro = new ResizeObserver(() => {
      const pad = 28;
      const W = el.clientWidth - pad;
      const H = el.clientHeight - pad;
      const k2 = Math.min(W / S.width, H / S.height);
      setBox({ w: Math.max(10, Math.floor(S.width * k2)), h: Math.max(10, Math.floor(S.height * k2)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [S.width, S.height]);
  const k = S.width / box.w;
  const toSeq = (e) => {
    const r = viewerRef.current.querySelector(".frame").getBoundingClientRect();
    return { px: (e.clientX - r.left) * k, py: (e.clientY - r.top) * k };
  };
  const sel = primary && seq.tracks.find((t) => t.id === primary.trackId)?.kind === "video" ? primary : void 0;
  const geom = !playing && sel ? geomFor(sel.id) : null;
  const maskClip = maskEdit && sel && sel.id === maskEdit.clipId ? sel : void 0;
  const mask = maskClip?.masks.find((m) => m.id === maskEdit.maskId);
  const maskPath = mask && maskClip ? evalPath(mask.path, clipLocalTime(maskClip, time)) : null;
  const onDown = (e) => {
    const engine2 = engineRef.current;
    if (!engine2 || e.button !== 0) return;
    const { px, py } = toSeq(e);
    const s = useStore.getState();
    if (s.eyedropper) {
      const { clipId, effectId } = s.eyedropper;
      const color = engine2.sampleColor(clipId, px, py);
      if (color) updateEffect(clipId, effectId, (fx2) => fx2.params.keyColor = color);
      else toast("Click inside the selected clip to sample its colour.", "error");
      useStore.setState({ eyedropper: null });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (s.tool === "pen" && sel) {
      const g = geomFor(sel.id);
      if (!g) return toast("The selected clip is not visible at the playhead.", "error");
      const uv = toUV(px, py, g);
      const open = sel.masks.find((m) => m.id === s.maskEdit?.maskId && !m.closed);
      beginTx();
      if (open) {
        const path = evalPath(open.path, clipLocalTime(sel));
        const first = fromUV(path[0], path[1], g);
        if (path.length >= 18 && Math.hypot(first.x - px, first.y - py) < 12 * k) {
          updateClip(sel.id, (c) => {
            const m = c.masks.find((x) => x.id === open.id);
            if (m) m.closed = true;
          }, true);
          endTx();
          useStore.setState({ tool: "select" });
          return;
        }
        const next = [...path, uv.u, uv.v, 0, 0, 0, 0];
        setMaskPath(sel.id, open.id, next, true);
        drag.current = { kind: "newVertex", id: sel.id, maskId: open.id, index: next.length / 6 - 1, path: next, geom: g, x: px, y: py };
      } else {
        const id = uid("mask");
        const path = [uv.u, uv.v, 0, 0, 0, 0];
        updateClip(sel.id, (c) => c.masks.push({ id, name: `Mask ${c.masks.length + 1}`, enabled: true, mode: "add", inverted: false, closed: false, path, feather: 0, expansion: 0, opacity: 100 }), true);
        useStore.setState({ maskEdit: { clipId: sel.id, maskId: id } });
        drag.current = { kind: "newVertex", id: sel.id, maskId: id, index: 0, path, geom: g, x: px, y: py };
      }
      return;
    }
    const hit = engine2.hitTest(px, py);
    if (!hit) {
      if (!maskEdit) select([]);
      return;
    }
    if (hit.id !== sel?.id) select([hit.id]);
    const tr = seq.tracks.find((t) => t.id === hit.trackId);
    if (tr?.locked) return;
    const lt = clipLocalTime(hit);
    beginTx();
    drag.current = { kind: "move", id: hit.id, x: e.clientX, y: e.clientY, tx: evalNum(hit.transform.x, lt), ty: evalNum(hit.transform.y, lt), k };
  };
  const startHandle = (e, kind) => {
    if (!sel || !geom) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { px, py } = toSeq(e);
    const lt = clipLocalTime(sel);
    beginTx();
    if (kind === "scale") {
      drag.current = { kind: "scale", id: sel.id, cx: geom.cx, cy: geom.cy, d0: Math.max(1, Math.hypot(px - geom.cx, py - geom.cy)), sx0: evalNum(sel.transform.scale, lt), sy0: evalNum(sel.transform.scaleY ?? sel.transform.scale, lt), uniform: sel.transform.scaleY === void 0 };
    } else {
      drag.current = { kind: "rotate", id: sel.id, cx: geom.cx, cy: geom.cy, a0: Math.atan2(py - geom.cy, px - geom.cx), r0: evalNum(sel.transform.rotation, lt) };
    }
  };
  const startMaskPoint = (e, kind, index) => {
    if (!maskClip || !mask || !maskPath) return;
    const g = geomFor(maskClip.id);
    if (!g) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kind === "vertex" && index === 0 && !mask.closed && maskPath.length >= 18 && tool === "pen") {
      updateClip(maskClip.id, (c) => {
        const m = c.masks.find((x) => x.id === mask.id);
        if (m) m.closed = true;
      });
      useStore.setState({ tool: "select" });
      return;
    }
    beginTx();
    drag.current = { kind, id: maskClip.id, maskId: mask.id, index, path: [...maskPath], geom: g, alt: e.altKey };
  };
  const startPoint = (e, d) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginTx();
    drag.current = d;
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const { px, py } = toSeq(e);
    if (d.kind === "fxPoint") {
      const uv = toUV(px, py, d.geom);
      setParamValue(d.id, `effects.${d.effectId}.${d.key}X`, Math.round(uv.u * 1e3) / 10, true);
      setParamValue(d.id, `effects.${d.effectId}.${d.key}Y`, Math.round(uv.v * 1e3) / 10, true);
      return;
    }
    if (d.kind === "trackPoint") {
      const uv = toUV(px, py, d.geom);
      setTrackPoint(d.id, d.trackId, d.pointId, Math.max(0, Math.min(1, uv.u)), Math.max(0, Math.min(1, uv.v)), true);
      return;
    }
    if (d.kind === "move") {
      setParamValue(d.id, "transform.x", Math.round(d.tx + (e.clientX - d.x) * d.k), true);
      setParamValue(d.id, "transform.y", Math.round(d.ty + (e.clientY - d.y) * d.k), true);
    } else if (d.kind === "scale") {
      const f = Math.hypot(px - d.cx, py - d.cy) / d.d0;
      setParamValue(d.id, "transform.scale", Math.round(d.sx0 * f * 10) / 10, true);
      if (!d.uniform) setParamValue(d.id, "transform.scaleY", Math.round(d.sy0 * f * 10) / 10, true);
    } else if (d.kind === "rotate") {
      let r = d.r0 + (Math.atan2(py - d.cy, px - d.cx) - d.a0) * 180 / Math.PI;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      setParamValue(d.id, "transform.rotation", Math.round(r * 10) / 10, true);
    } else {
      const uv = toUV(px, py, d.geom);
      const p = [...d.path];
      const i = d.index * 6;
      if (d.kind === "vertex") {
        p[i] = uv.u;
        p[i + 1] = uv.v;
      } else if (d.kind === "newVertex") {
        if (Math.hypot(px - d.x, py - d.y) > 3 * k) {
          p[i + 4] = uv.u - p[i];
          p[i + 5] = uv.v - p[i + 1];
          p[i + 2] = -p[i + 4];
          p[i + 3] = -p[i + 5];
        }
      } else {
        const hx = uv.u - p[i];
        const hy = uv.v - p[i + 1];
        const o = d.kind === "in" ? 2 : 4;
        const other = d.kind === "in" ? 4 : 2;
        p[i + o] = hx;
        p[i + o + 1] = hy;
        if (!d.alt && !e.altKey) {
          p[i + other] = -hx;
          p[i + other + 1] = -hy;
        }
      }
      setMaskPath(d.id, d.maskId, p, true);
    }
  };
  const onUp = () => {
    if (drag.current) {
      drag.current = null;
      endTx();
    }
  };
  const corners = geom ? [fromUV(0, 0, geom), fromUV(1, 0, geom), fromUV(1, 1, geom), fromUV(0, 1, geom)] : [];
  const topMid = geom ? fromUV(0.5, 0, geom) : null;
  const rotHandle = geom && topMid ? { x: topMid.x + Math.sin(geom.rot) * 40 * k, y: topMid.y - Math.cos(geom.rot) * 40 * k } : null;
  const hs = 5 * k;
  let maskSvg = null;
  if (maskPath && mask && maskClip) {
    const g = geomFor(maskClip.id);
    if (g) {
      const n = Math.floor(maskPath.length / 6);
      const P = (i, dx = 0, dy = 0) => fromUV(maskPath[i * 6] + dx, maskPath[i * 6 + 1] + dy, g);
      let dStr = "";
      for (let i = 0; i < n; i++) {
        const v = P(i);
        if (i === 0) dStr += `M${v.x},${v.y}`;
        else {
          const a = P(i - 1, maskPath[(i - 1) * 6 + 4], maskPath[(i - 1) * 6 + 5]);
          const b = P(i, maskPath[i * 6 + 2], maskPath[i * 6 + 3]);
          dStr += ` C${a.x},${a.y} ${b.x},${b.y} ${v.x},${v.y}`;
        }
      }
      if (mask.closed && n > 1) {
        const a = P(n - 1, maskPath[(n - 1) * 6 + 4], maskPath[(n - 1) * 6 + 5]);
        const b = P(0, maskPath[2], maskPath[3]);
        const v = P(0);
        dStr += ` C${a.x},${a.y} ${b.x},${b.y} ${v.x},${v.y} Z`;
      }
      maskSvg = /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: dStr, fill: "none", stroke: "#f2c94c", strokeWidth: 1.5 * k }),
        Array.from({ length: n }, (_, i) => {
          const v = P(i);
          const hi = P(i, maskPath[i * 6 + 2], maskPath[i * 6 + 3]);
          const ho = P(i, maskPath[i * 6 + 4], maskPath[i * 6 + 5]);
          const hasH = maskPath[i * 6 + 2] !== 0 || maskPath[i * 6 + 3] !== 0 || maskPath[i * 6 + 4] !== 0 || maskPath[i * 6 + 5] !== 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
            hasH && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: hi.x, y1: hi.y, x2: ho.x, y2: ho.y, stroke: "#f2c94c88", strokeWidth: k }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: hi.x, cy: hi.y, r: 4 * k, className: "mhandle", onPointerDown: (e) => startMaskPoint(e, "in", i) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: ho.x, cy: ho.y, r: 4 * k, className: "mhandle", onPointerDown: (e) => startMaskPoint(e, "out", i) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: v.x - hs, y: v.y - hs, width: hs * 2, height: hs * 2, className: `mvertex${i === 0 && !mask.closed ? " first" : ""}`, onPointerDown: (e) => startMaskPoint(e, "vertex", i) })
          ] }, i);
        })
      ] });
    }
  }
  let pointSvg = null;
  if (geom && sel && !maskSvg) {
    const lt = clipLocalTime(sel, time);
    const items = [];
    for (const fx2 of sel.effects) {
      if (!fx2.enabled || fx2.type === "cornerPin") continue;
      let def;
      try {
        def = effectDef(fx2.type);
      } catch {
        continue;
      }
      const ids = [...new Set(def.params.flatMap((p) => p.kind === "number" && p.point ? [p.point.id] : []))];
      for (const id of ids) {
        const vx = fx2.params[id + "X"];
        const vy = fx2.params[id + "Y"];
        const u = evalNum(vx ?? 50, lt) / 100;
        const v = evalNum(vy ?? 50, lt) / 100;
        const q = fromUV(u, v, geom);
        const label = def.params.find((p) => p.kind === "number" && p.point?.id === id)?.label.replace(/ X$/, "") ?? id;
        items.push(
          /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { className: "fxpt", onPointerDown: (e) => startPoint(e, { kind: "fxPoint", id: sel.id, effectId: fx2.id, key: id, geom }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `${def.name}: ${label}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: q.x, cy: q.y, r: 9 * k }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: `M${q.x - 14 * k},${q.y} h${10 * k} M${q.x + 4 * k},${q.y} h${10 * k} M${q.x},${q.y - 14 * k} v${10 * k} M${q.x},${q.y + 4 * k} v${10 * k}` })
          ] }, fx2.id + id)
        );
      }
    }
    for (const fx2 of sel.effects.filter((x) => x.enabled && x.type === "cornerPin")) {
      const pts = ["tl", "tr", "br", "bl"].map((c) => fromUV(evalNum(fx2.params[c + "X"] ?? 0, lt) / 100, evalNum(fx2.params[c + "Y"] ?? 0, lt) / 100, geom));
      items.push(/* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: pts.map((p) => `${p.x},${p.y}`).join(" "), className: "pinpoly" }, fx2.id + "poly"));
      ["tl", "tr", "br", "bl"].forEach(
        (c, i) => items.push(
          /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { className: "fxpt", onPointerDown: (e) => startPoint(e, { kind: "fxPoint", id: sel.id, effectId: fx2.id, key: c, geom }), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `Corner Pin: ${["top left", "top right", "bottom right", "bottom left"][i]}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: pts[i].x - 7 * k, y: pts[i].y - 7 * k, width: 14 * k, height: 14 * k })
          ] }, fx2.id + c)
        )
      );
    }
    if (items.length) pointSvg = /* @__PURE__ */ jsxRuntimeExports.jsx("g", { children: items });
  }
  const trackerEdit = useStore((s2) => s2.trackerEdit);
  let trackSvg = null;
  if (geom && sel && trackerEdit?.clipId === sel.id && sel.source.kind === "media") {
    const mtk = sel.motionTracks?.find((t) => t.id === trackerEdit.trackId);
    const m = project().media[sel.source.mediaId];
    if (mtk && m) {
      const aw = Math.min(640, m.width - m.width % 2);
      const pxPerAnalysis = geom.w * Math.abs(geom.sx) / aw;
      const mt = mediaTime(sel, Math.max(sel.start, Math.min(sel.start + sel.duration - 1e-3, time)));
      trackSvg = /* @__PURE__ */ jsxRuntimeExports.jsx("g", { children: mtk.points.map((p, i) => {
        const at = pointAt(p, mt);
        if (!at) return null;
        const q = fromUV(at.u, at.v, geom);
        const fh = p.feature * pxPerAnalysis / 2;
        const sh = p.search * pxPerAnalysis / 2;
        const path = [];
        for (let j = 0; j < p.keys.length; j += 4) {
          const pp = fromUV(p.keys[j + 1], p.keys[j + 2], geom);
          path.push(`${pp.x},${pp.y}`);
        }
        const lost = at.conf < 0.5;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { className: `trk${lost ? " lost" : ""}`, children: [
          path.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("polyline", { points: path.join(" "), className: "trk-path" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: q.x - sh, y: q.y - sh, width: sh * 2, height: sh * 2, className: "trk-search" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: q.x - fh, y: q.y - fh, width: fh * 2, height: fh * 2, className: "trk-feature", onPointerDown: (e) => startPoint(e, { kind: "trackPoint", id: sel.id, trackId: mtk.id, pointId: p.id, geom }), children: /* @__PURE__ */ jsxRuntimeExports.jsx("title", { children: `Track point ${i + 1}: drag onto detail with good contrast` }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: `M${q.x - 5 * k},${q.y} h${10 * k} M${q.x},${q.y - 5 * k} v${10 * k}`, className: "trk-cross" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("text", { x: q.x + fh + 4 * k, y: q.y - fh, className: "trk-label", style: { fontSize: 12 * k }, children: i + 1 })
        ] }, p.id);
      }) });
    }
  }
  const keyed = sel?.effects.some((x) => (x.type === "chromaKey" || x.type === "lumaKey") && x.enabled);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "panel monitor", "aria-label": "Program monitor", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "panel-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Program" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "dim", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: [
        seq.name,
        " · ",
        eyedropper ? "click the colour to key" : tool === "pen" ? "Pen: click to add points, drag for curves, click the first point to close" : playing ? "Playing" : "Paused"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${tool === "pen" ? " on" : ""}`, title: "Mask pen (P)", "aria-label": "Mask pen", onClick: () => useStore.setState({ tool: tool === "pen" ? "select" : "pen" }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "pen" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: `icon-btn${guides ? " on" : ""}`, title: "Safe-area guides", "aria-label": "Safe-area guides", onClick: () => useStore.setState({ safeGuides: !guides }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "guides" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { id: "pv-scale", "aria-label": "Preview resolution", className: "mini-select", value: scale, onChange: (e) => useStore.setState({ previewScale: Number(e.target.value) }), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 1, children: "Full" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0.5, children: "1/2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: 0.25, children: "1/4" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "viewer", ref: viewerRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `frame${eyedropper || tool === "pen" ? " pick" : ""}`, style: { width: box.w, height: box.h }, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("canvas", { ref: canvasRef }),
      guides && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "safe", style: { inset: "5%" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "safe", style: { inset: "10%", borderColor: "#ffffff26" } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { className: "overlay", viewBox: `0 0 ${S.width} ${S.height}`, preserveAspectRatio: "none", children: [
        geom && !maskSvg && corners.length === 4 && /* @__PURE__ */ jsxRuntimeExports.jsxs("g", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("polygon", { points: corners.map((c) => `${c.x},${c.y}`).join(" "), fill: "none", stroke: "#5aa9ff", strokeWidth: 1.2 * k }),
          topMid && rotHandle && /* @__PURE__ */ jsxRuntimeExports.jsx("line", { x1: topMid.x, y1: topMid.y, x2: rotHandle.x, y2: rotHandle.y, stroke: "#5aa9ff", strokeWidth: k }),
          rotHandle && /* @__PURE__ */ jsxRuntimeExports.jsx("circle", { cx: rotHandle.x, cy: rotHandle.y, r: 6 * k, className: "handle rot", onPointerDown: (e) => startHandle(e, "rotate") }),
          corners.map((c, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("rect", { x: c.x - hs, y: c.y - hs, width: hs * 2, height: hs * 2, className: "handle", onPointerDown: (e) => startHandle(e, "scale") }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: `M${geom.cx - 8 * k},${geom.cy} h${16 * k} M${geom.cx},${geom.cy - 8 * k} v${16 * k}`, stroke: "#5aa9ff", strokeWidth: k })
        ] }),
        !playing && maskSvg,
        !playing && pointSvg,
        !playing && trackSvg
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "overlay-chips", children: [
        keyed && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip key", children: "KEY" }),
        showMatte && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip", children: "MATTE" }),
        scale !== 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip", children: [
          scale === 0.5 ? "½" : "¼",
          " RES"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "transport", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TimecodeField, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", "aria-label": "Previous edit (Up)", title: "Previous edit (Up)", onClick: () => jumpEdit(-1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "prevEdit", size: 18 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", "aria-label": "Back one frame (Left)", title: "Back one frame (Left)", onClick: () => stepFrames(-1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stepBack", size: 18 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn play", "aria-label": "Play or pause (Space)", title: "Play / pause (Space)", onClick: togglePlay, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: playing ? "pause" : "play", size: 18, fill: true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", "aria-label": "Forward one frame (Right)", title: "Forward one frame (Right)", onClick: () => stepFrames(1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "stepFwd", size: 18 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", "aria-label": "Next edit (Down)", title: "Next edit (Down)", onClick: () => jumpEdit(1), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "nextEdit", size: 18 }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mono dim", style: { width: 140, textAlign: "right" }, children: timecode(duration, S.fps) })
    ] })
  ] });
}
const logoUrl = "" + new URL("logo-t37nMCHs.png", import.meta.url).href;
const WORKSPACES = [
  ["edit", "Edit"],
  ["composite", "Composite"],
  ["color", "Color"],
  ["audio", "Audio"]
];
function TopBar() {
  const [open, setOpen] = reactExports.useState(null);
  const ref = reactExports.useRef(null);
  const seq = useStore((s) => activeSeq(s));
  const name = useStore((s) => s.projectName);
  const dirty = useStore((s) => s.dirty);
  const ws = useStore((s) => s.workspace);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const hasSel = useStore((s) => s.selection.length > 0);
  const linkedSel = useStore((s) => s.linkedSelection);
  const primary = useStore(primarySelection);
  const sel = useStore((s) => s.selection);
  const hasClips = useStore((s) => !!s.clipClipboard?.length);
  const hasAttrs = useStore((s) => !!s.effectClipboard);
  const timeable = !!primary && (primary.source.kind === "media" || primary.source.kind === "sequence");
  const canExport = useStore((s) => activeSeq(s).clips.length > 0 && !!s.caps?.ffmpeg);
  reactExports.useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);
  const menus = {
    File: [
      { label: "New project", keys: "Ctrl+N", run: newProject },
      { label: "Open project…", keys: "Ctrl+O", run: () => void openProject() },
      { label: "Save", keys: "Ctrl+S", run: () => void saveProject() },
      { label: "Save as…", keys: "Ctrl+Shift+S", run: () => void saveProject(true) },
      { label: "", sep: true },
      { label: "Import media…", keys: "Ctrl+I", run: () => void importDialog() },
      { label: "Export…", keys: "Ctrl+M", run: () => useStore.setState({ exportOpen: true }), disabled: !canExport }
    ],
    Edit: [
      { label: "Undo", keys: "Ctrl+Z", run: undo, disabled: !canUndo },
      { label: "Redo", keys: "Ctrl+Shift+Z", run: redo, disabled: !canRedo },
      { label: "", sep: true },
      { label: "Copy", keys: "Ctrl+C", run: copyClips, disabled: !hasSel },
      { label: "Paste at playhead", keys: "Ctrl+V", run: pasteClips, disabled: !hasClips },
      { label: "Copy attributes", keys: "Ctrl+Alt+C", run: () => primary && copyEffects(primary.id), disabled: !primary },
      { label: "Paste attributes", keys: "Ctrl+Alt+V", run: () => pasteAttributes(), disabled: !hasSel || !hasAttrs },
      { label: "", sep: true },
      { label: "Select all", keys: "Ctrl+A", run: () => useStore.setState({ selection: activeSeq().clips.map((c) => c.id) }) },
      { label: "Delete", keys: "Del", run: () => deleteSelection(false), disabled: !hasSel },
      { label: "Ripple delete", keys: "Shift+Del", run: () => deleteSelection(true), disabled: !hasSel }
    ],
    Clip: [
      { label: "Split at playhead", keys: "Ctrl+K", run: () => splitAtPlayhead() },
      { label: "Split all tracks", keys: "Ctrl+Shift+K", run: () => splitAtPlayhead(true) },
      { label: "Speed / Duration…", keys: "Ctrl+R", run: () => useStore.setState({ speedOpen: true }), disabled: !hasSel },
      { label: "Enable / disable", keys: "Shift+E", run: toggleClipEnabled, disabled: !hasSel },
      { label: "Nest selection", run: nestSelection, disabled: !hasSel },
      { label: "", sep: true },
      { label: `${linkedSel ? "✓ " : "   "}Linked selection`, keys: "Ctrl+L", run: toggleLinkedSelection },
      { label: "Link audio and video", keys: "Ctrl+Alt+L", run: () => linkSelection(true), disabled: !hasSel },
      { label: "Unlink", keys: "Ctrl+Shift+L", run: () => linkSelection(false), disabled: !hasSel },
      { label: "", sep: true },
      { label: `${primary?.reverse ? "✓ " : "   "}Reverse`, run: () => setReverse(sel, !primary?.reverse), disabled: !timeable },
      { label: primary?.freeze !== void 0 ? "Release frame hold" : "Frame hold at playhead", run: () => setFreeze(sel, primary?.freeze === void 0), disabled: !timeable },
      { label: `${primary?.remap !== void 0 ? "✓ " : "   "}Time remapping`, run: () => setRemap(sel, primary?.remap === void 0), disabled: !timeable },
      { label: "", sep: true },
      { label: "Track matte: alpha", run: () => setTrackMatte(sel, "alpha"), disabled: !primary },
      { label: "Track matte: luma", run: () => setTrackMatte(sel, "luma"), disabled: !primary },
      { label: "Track matte: none", run: () => setTrackMatte(sel, "none"), disabled: !primary },
      { label: "", sep: true },
      { label: "Add rectangle mask", run: () => primary && addMask(primary.id, "rect"), disabled: !primary },
      { label: "Add ellipse mask", run: () => primary && addMask(primary.id, "ellipse"), disabled: !primary },
      { label: "Add effect…", run: () => useStore.setState({ workspace: "edit", binTab: "effects" }) }
    ],
    Sequence: [
      { label: "New sequence", run: () => newSequenceAction() },
      { label: "Sequence settings…", run: () => useStore.setState({ sequenceOpen: true }) },
      { label: "", sep: true },
      { label: "Add marker", keys: "M", run: addMarker },
      { label: "Mark in", keys: "I", run: () => setInOut("in") },
      { label: "Mark out", keys: "O", run: () => setInOut("out") },
      { label: "Clear in/out", keys: "Ctrl+Shift+X", run: () => setInOut("clear") },
      { label: "", sep: true },
      { label: "Add video track", run: () => addTrack("video") },
      { label: "Add audio track", run: () => addTrack("audio") }
    ],
    Graphics: [
      { label: "New title", keys: "Ctrl+T", run: () => addGenerator("text") },
      { label: "New shape", run: () => addGenerator("shape") },
      { label: "New colour matte", run: () => addGenerator("solid") },
      { label: "New adjustment layer", run: () => addGenerator("adjustment") },
      { label: "", sep: true },
      ...GENERATORS.map((g) => ({ label: `New ${g.name.toLowerCase()}`, run: () => addGenerator("generator", g.type) }))
    ]
  };
  const menuRef = reactExports.useRef(menus);
  menuRef.current = menus;
  const menuSig = JSON.stringify(Object.entries(menus).map(([t, items]) => [t, items.map((it) => it.sep ? null : [it.label, it.keys ?? "", !!it.disabled])]));
  reactExports.useEffect(() => {
    if (!window.cuttingfloor.palOS) return;
    window.cuttingfloor.setMenu(JSON.parse(menuSig));
  }, [menuSig]);
  reactExports.useEffect(() => {
    if (!window.cuttingfloor.palOS) return;
    return window.cuttingfloor.onMenu((title, index) => {
      const it = menuRef.current[title]?.[index];
      if (it && !it.sep && !it.disabled) it.run?.();
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "topbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "brand", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, alt: "", width: 24, height: 24, style: { display: "block" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Cutting Floor" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "menus", ref, "aria-label": "Menu", children: Object.entries(menus).map(([title, items]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "menu-btn", "aria-expanded": open === title, onClick: () => setOpen(open === title ? null : title), onMouseEnter: () => open && setOpen(title), children: title }),
      open === title && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu-pop", role: "menu", children: items.map(
        (it, i) => it.sep ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "menu-sep" }, i) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            role: "menuitem",
            className: "menu-item",
            disabled: it.disabled,
            onClick: () => {
              setOpen(null);
              it.run?.();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: it.label }),
              it.keys && /* @__PURE__ */ jsxRuntimeExports.jsx("kbd", { children: it.keys })
            ]
          },
          i
        )
      ) })
    ] }, title)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "seq-chip", onClick: () => useStore.setState({ sequenceOpen: true }), title: "Sequence settings", children: [
      name,
      dirty ? " •" : "",
      " · ",
      seq.name,
      " · ",
      seq.settings.width,
      "×",
      seq.settings.height,
      " · ",
      fpsLabel(seq.settings.fps),
      " fps"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "workspaces", role: "tablist", "aria-label": "Workspace", children: WORKSPACES.map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { role: "tab", "aria-selected": ws === id, onClick: () => useStore.setState({ workspace: id }), children: label }, id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn-primary", disabled: !canExport, onClick: () => useStore.setState({ exportOpen: true }), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { name: "export" }),
      "Export"
    ] })
  ] });
}
function StatusBar() {
  const caps = useStore((s) => s.caps);
  const media = useStore((s) => s.media);
  const list = Object.values(media).filter((m) => m.kind === "video");
  const ready = list.filter((m) => m.proxyStatus === "ready").length;
  const building = list.find((m) => m.proxyStatus === "building");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("footer", { className: "statusbar", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dot", style: { background: caps?.nvenc ? "var(--green)" : caps?.ffmpeg ? "var(--yellow)" : "var(--red)" } }),
      caps == null ? "Detecting GPU…" : caps.nvenc ? `NVIDIA · NVENC${caps.cudaDecode ? " · CUDA decode" : ""}` : caps.ffmpeg ? "CPU encode (NVENC not found)" : "FFmpeg missing"
    ] }),
    list.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      "Proxies: ",
      ready,
      " of ",
      list.length,
      " ready",
      building ? ` · building ${building.name} ${Math.round(building.proxyProgress * 100)}%` : ""
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "WebGL2 · 16-bit float pipeline · preview = export" }),
    caps?.version && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
      "FFmpeg ",
      caps.version
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spacer" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Space play · C razor · Ctrl+K split · Ctrl+D dissolve · Ctrl+Z undo" })
  ] });
}
function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "toasts", role: "status", "aria-live": "polite", children: toasts.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `toast ${t.tone}`, children: t.text }, t.id)) });
}
function quickDissolve() {
  const s = useStore.getState();
  const c = primarySelection(s);
  if (!c) return;
  const seq = activeSeq(s);
  const isAudio = seq.tracks.find((t) => t.id === c.trackId)?.kind === "audio";
  const edge = Math.abs(s.time - c.start) <= Math.abs(s.time - clipEnd(c)) ? "in" : "out";
  applyTransitionAction(c.id, edge, isAudio ? "crossfade" : "crossDissolve");
}
function useShortcuts() {
  reactExports.useEffect(() => {
    const onKey = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" && !["range", "checkbox", "color"].includes(target.type)) return;
      if (target.tagName === "SELECT" || target.tagName === "TEXTAREA") return;
      const s = useStore.getState();
      if (s.exportOpen || s.sequenceOpen || s.speedOpen) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const seq = activeSeq(s);
      let handled = true;
      if (ctrl && k === "z" && !e.shiftKey) undo();
      else if (ctrl && (k === "y" || k === "z" && e.shiftKey)) redo();
      else if (ctrl && k === "s") void saveProject(e.shiftKey);
      else if (ctrl && k === "o") void openProject();
      else if (ctrl && k === "n") newProject();
      else if (ctrl && k === "i") void importDialog();
      else if (ctrl && k === "m") seq.clips.length && useStore.setState({ exportOpen: true });
      else if (ctrl && k === "k") splitAtPlayhead(e.shiftKey);
      else if (ctrl && k === "d") quickDissolve();
      else if (ctrl && k === "r") s.selection.length && useStore.setState({ speedOpen: true });
      else if (ctrl && k === "t") addGenerator("text");
      else if (ctrl && k === "l" && e.shiftKey) linkSelection(false);
      else if (ctrl && k === "l" && e.altKey) linkSelection(true);
      else if (ctrl && k === "l") toggleLinkedSelection();
      else if (ctrl && k === "a") useStore.setState({ selection: seq.clips.map((c) => c.id) });
      else if (ctrl && e.altKey && k === "c") {
        const c = primarySelection(s);
        if (c) copyEffects(c.id);
      } else if (ctrl && e.altKey && k === "v") pasteAttributes();
      else if (ctrl && k === "c") copyClips();
      else if (ctrl && k === "v") pasteClips();
      else if (ctrl && e.shiftKey && k === "x") setInOut("clear");
      else if (ctrl) handled = false;
      else if (e.key === " ") togglePlay();
      else if (k === "l") useStore.setState({ playing: true });
      else if (k === "k") useStore.setState({ playing: false });
      else if (k === "j") stepFrames(-Math.round(seq.settings.fps));
      else if (e.key === "ArrowLeft") stepFrames(e.shiftKey ? -10 : -1);
      else if (e.key === "ArrowRight") stepFrames(e.shiftKey ? 10 : 1);
      else if (e.key === "ArrowUp") jumpEdit(-1);
      else if (e.key === "ArrowDown") jumpEdit(1);
      else if (e.key === "Home") setTime(seq.inPoint ?? 0);
      else if (e.key === "End") setTime(seq.outPoint ?? sequenceDuration(seq));
      else if (e.key === "Delete" || e.key === "Backspace") deleteSelection(e.shiftKey);
      else if (k === "v") useStore.setState({ tool: "select" });
      else if (k === "c") useStore.setState({ tool: "razor" });
      else if (k === "y") useStore.setState({ tool: "slip" });
      else if (k === "p") useStore.setState({ tool: "pen" });
      else if (k === "m") addMarker();
      else if (k === "i") setInOut("in");
      else if (k === "o") setInOut("out");
      else if (k === "s" && !e.shiftKey) useStore.setState({ snapping: !s.snapping });
      else if (k === "e" && e.shiftKey) toggleClipEnabled();
      else if (e.key === "=" || e.key === "+") zoomTimeline(1.5);
      else if (e.key === "-") zoomTimeline(1 / 1.5);
      else if (e.key === "Escape") useStore.setState({ eyedropper: null, selection: [], maskEdit: null, selectedTransition: null, tool: s.tool === "pen" ? "select" : s.tool });
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
function App() {
  const caps = useStore((s) => s.caps);
  const name = useStore((s) => s.projectName);
  const dirty = useStore((s) => s.dirty);
  const ws = useStore((s) => s.workspace);
  const [tlH, setTlH] = reactExports.useState(380);
  useShortcuts();
  reactExports.useEffect(() => {
    void window.cuttingfloor.caps().then((c) => useStore.setState({ caps: c }));
    void loadFonts();
    void loadPresets();
    const a = initMediaEvents();
    const b = listenExport();
    return () => {
      a();
      b();
    };
  }, []);
  reactExports.useEffect(() => {
    window.cuttingfloor.setTitle(`${dirty ? "• " : ""}${name} — Cutting Floor`);
  }, [name, dirty]);
  const left = ws === "color" ? /* @__PURE__ */ jsxRuntimeExports.jsx(Scopes, {}) : ws === "audio" ? /* @__PURE__ */ jsxRuntimeExports.jsx(EffectControls, { prefer: "audio" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Bin, {});
  const right = ws === "color" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ColorPanel, {}) : ws === "audio" ? /* @__PURE__ */ jsxRuntimeExports.jsx(AudioMixer, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(EffectControls, {});
  const lower = ws === "composite" ? /* @__PURE__ */ jsxRuntimeExports.jsx(CompositePanel, {}) : /* @__PURE__ */ jsxRuntimeExports.jsx(Timeline, { onResize: (dy) => setTlH((h) => Math.max(180, Math.min(window.innerHeight - 320, h + dy))) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `app ws-${ws}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(TopBar, {}),
    caps?.error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "banner", children: caps.error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "upper", children: [
      left,
      /* @__PURE__ */ jsxRuntimeExports.jsx(Monitor, {}),
      right
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lower", style: { height: tlH }, children: lower }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(StatusBar, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ExportDialog, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SequenceDialog, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(SpeedDialog, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ContextMenuHost, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Toasts, {})
  ] });
}
document.documentElement.classList.toggle("pal-os", !!window.cuttingfloor?.palOS);
if (new URLSearchParams(location.search).has("test")) {
  window.__cuttingfloor = { ...store, getEngine, ops, fx, evaluate, power };
  window.addEventListener("error", (e) => console.error("UNCAUGHT", e.message));
  window.addEventListener("unhandledrejection", (e) => console.error("UNHANDLED", String(e.reason)));
}
clientExports.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
