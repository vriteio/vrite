"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // ../../node_modules/.pnpm/event-source-polyfill@1.0.31/node_modules/event-source-polyfill/src/eventsource.js
  var require_eventsource = __commonJS({
    "../../node_modules/.pnpm/event-source-polyfill@1.0.31/node_modules/event-source-polyfill/src/eventsource.js"(exports, module) {
      (function(global) {
        "use strict";
        var setTimeout = global.setTimeout;
        var clearTimeout = global.clearTimeout;
        var XMLHttpRequest2 = global.XMLHttpRequest;
        var XDomainRequest = global.XDomainRequest;
        var ActiveXObject = global.ActiveXObject;
        var NativeEventSource = global.EventSource;
        var document = global.document;
        var Promise2 = global.Promise;
        var fetch = global.fetch;
        var Response = global.Response;
        var TextDecoder = global.TextDecoder;
        var TextEncoder = global.TextEncoder;
        var AbortController = global.AbortController;
        if (typeof window !== "undefined" && typeof document !== "undefined" && !("readyState" in document) && document.body == null) {
          document.readyState = "loading";
          window.addEventListener("load", function(event) {
            document.readyState = "complete";
          }, false);
        }
        if (XMLHttpRequest2 == null && ActiveXObject != null) {
          XMLHttpRequest2 = function() {
            return new ActiveXObject("Microsoft.XMLHTTP");
          };
        }
        if (Object.create == void 0) {
          Object.create = function(C2) {
            function F() {
            }
            F.prototype = C2;
            return new F();
          };
        }
        if (!Date.now) {
          Date.now = function now() {
            return (/* @__PURE__ */ new Date()).getTime();
          };
        }
        if (AbortController == void 0) {
          var originalFetch2 = fetch;
          fetch = function(url, options) {
            var signal = options.signal;
            return originalFetch2(url, { headers: options.headers, credentials: options.credentials, cache: options.cache }).then(function(response) {
              var reader = response.body.getReader();
              signal._reader = reader;
              if (signal._aborted) {
                signal._reader.cancel();
              }
              return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: {
                  getReader: function() {
                    return reader;
                  }
                }
              };
            });
          };
          AbortController = function() {
            this.signal = {
              _reader: null,
              _aborted: false
            };
            this.abort = function() {
              if (this.signal._reader != null) {
                this.signal._reader.cancel();
              }
              this.signal._aborted = true;
            };
          };
        }
        function TextDecoderPolyfill() {
          this.bitsNeeded = 0;
          this.codePoint = 0;
        }
        TextDecoderPolyfill.prototype.decode = function(octets) {
          function valid(codePoint2, shift, octetsCount2) {
            if (octetsCount2 === 1) {
              return codePoint2 >= 128 >> shift && codePoint2 << shift <= 2047;
            }
            if (octetsCount2 === 2) {
              return codePoint2 >= 2048 >> shift && codePoint2 << shift <= 55295 || codePoint2 >= 57344 >> shift && codePoint2 << shift <= 65535;
            }
            if (octetsCount2 === 3) {
              return codePoint2 >= 65536 >> shift && codePoint2 << shift <= 1114111;
            }
            throw new Error();
          }
          function octetsCount(bitsNeeded2, codePoint2) {
            if (bitsNeeded2 === 6 * 1) {
              return codePoint2 >> 6 > 15 ? 3 : codePoint2 > 31 ? 2 : 1;
            }
            if (bitsNeeded2 === 6 * 2) {
              return codePoint2 > 15 ? 3 : 2;
            }
            if (bitsNeeded2 === 6 * 3) {
              return 3;
            }
            throw new Error();
          }
          var REPLACER = 65533;
          var string = "";
          var bitsNeeded = this.bitsNeeded;
          var codePoint = this.codePoint;
          for (var i = 0; i < octets.length; i += 1) {
            var octet = octets[i];
            if (bitsNeeded !== 0) {
              if (octet < 128 || octet > 191 || !valid(codePoint << 6 | octet & 63, bitsNeeded - 6, octetsCount(bitsNeeded, codePoint))) {
                bitsNeeded = 0;
                codePoint = REPLACER;
                string += String.fromCharCode(codePoint);
              }
            }
            if (bitsNeeded === 0) {
              if (octet >= 0 && octet <= 127) {
                bitsNeeded = 0;
                codePoint = octet;
              } else if (octet >= 192 && octet <= 223) {
                bitsNeeded = 6 * 1;
                codePoint = octet & 31;
              } else if (octet >= 224 && octet <= 239) {
                bitsNeeded = 6 * 2;
                codePoint = octet & 15;
              } else if (octet >= 240 && octet <= 247) {
                bitsNeeded = 6 * 3;
                codePoint = octet & 7;
              } else {
                bitsNeeded = 0;
                codePoint = REPLACER;
              }
              if (bitsNeeded !== 0 && !valid(codePoint, bitsNeeded, octetsCount(bitsNeeded, codePoint))) {
                bitsNeeded = 0;
                codePoint = REPLACER;
              }
            } else {
              bitsNeeded -= 6;
              codePoint = codePoint << 6 | octet & 63;
            }
            if (bitsNeeded === 0) {
              if (codePoint <= 65535) {
                string += String.fromCharCode(codePoint);
              } else {
                string += String.fromCharCode(55296 + (codePoint - 65535 - 1 >> 10));
                string += String.fromCharCode(56320 + (codePoint - 65535 - 1 & 1023));
              }
            }
          }
          this.bitsNeeded = bitsNeeded;
          this.codePoint = codePoint;
          return string;
        };
        var supportsStreamOption = function() {
          try {
            return new TextDecoder().decode(new TextEncoder().encode("test"), { stream: true }) === "test";
          } catch (error) {
            console.debug("TextDecoder does not support streaming option. Using polyfill instead: " + error);
          }
          return false;
        };
        if (TextDecoder == void 0 || TextEncoder == void 0 || !supportsStreamOption()) {
          TextDecoder = TextDecoderPolyfill;
        }
        var k2 = function() {
        };
        function XHRWrapper(xhr) {
          this.withCredentials = false;
          this.readyState = 0;
          this.status = 0;
          this.statusText = "";
          this.responseText = "";
          this.onprogress = k2;
          this.onload = k2;
          this.onerror = k2;
          this.onreadystatechange = k2;
          this._contentType = "";
          this._xhr = xhr;
          this._sendTimeout = 0;
          this._abort = k2;
        }
        XHRWrapper.prototype.open = function(method, url) {
          this._abort(true);
          var that = this;
          var xhr = this._xhr;
          var state = 1;
          var timeout = 0;
          this._abort = function(silent) {
            if (that._sendTimeout !== 0) {
              clearTimeout(that._sendTimeout);
              that._sendTimeout = 0;
            }
            if (state === 1 || state === 2 || state === 3) {
              state = 4;
              xhr.onload = k2;
              xhr.onerror = k2;
              xhr.onabort = k2;
              xhr.onprogress = k2;
              xhr.onreadystatechange = k2;
              xhr.abort();
              if (timeout !== 0) {
                clearTimeout(timeout);
                timeout = 0;
              }
              if (!silent) {
                that.readyState = 4;
                that.onabort(null);
                that.onreadystatechange();
              }
            }
            state = 0;
          };
          var onStart = function() {
            if (state === 1) {
              var status = 0;
              var statusText = "";
              var contentType = void 0;
              if (!("contentType" in xhr)) {
                try {
                  status = xhr.status;
                  statusText = xhr.statusText;
                  contentType = xhr.getResponseHeader("Content-Type");
                } catch (error) {
                  status = 0;
                  statusText = "";
                  contentType = void 0;
                }
              } else {
                status = 200;
                statusText = "OK";
                contentType = xhr.contentType;
              }
              if (status !== 0) {
                state = 2;
                that.readyState = 2;
                that.status = status;
                that.statusText = statusText;
                that._contentType = contentType;
                that.onreadystatechange();
              }
            }
          };
          var onProgress = function() {
            onStart();
            if (state === 2 || state === 3) {
              state = 3;
              var responseText = "";
              try {
                responseText = xhr.responseText;
              } catch (error) {
              }
              that.readyState = 3;
              that.responseText = responseText;
              that.onprogress();
            }
          };
          var onFinish = function(type, event) {
            if (event == null || event.preventDefault == null) {
              event = {
                preventDefault: k2
              };
            }
            onProgress();
            if (state === 1 || state === 2 || state === 3) {
              state = 4;
              if (timeout !== 0) {
                clearTimeout(timeout);
                timeout = 0;
              }
              that.readyState = 4;
              if (type === "load") {
                that.onload(event);
              } else if (type === "error") {
                that.onerror(event);
              } else if (type === "abort") {
                that.onabort(event);
              } else {
                throw new TypeError();
              }
              that.onreadystatechange();
            }
          };
          var onReadyStateChange = function(event) {
            if (xhr != void 0) {
              if (xhr.readyState === 4) {
                if (!("onload" in xhr) || !("onerror" in xhr) || !("onabort" in xhr)) {
                  onFinish(xhr.responseText === "" ? "error" : "load", event);
                }
              } else if (xhr.readyState === 3) {
                if (!("onprogress" in xhr)) {
                  onProgress();
                }
              } else if (xhr.readyState === 2) {
                onStart();
              }
            }
          };
          var onTimeout = function() {
            timeout = setTimeout(function() {
              onTimeout();
            }, 500);
            if (xhr.readyState === 3) {
              onProgress();
            }
          };
          if ("onload" in xhr) {
            xhr.onload = function(event) {
              onFinish("load", event);
            };
          }
          if ("onerror" in xhr) {
            xhr.onerror = function(event) {
              onFinish("error", event);
            };
          }
          if ("onabort" in xhr) {
            xhr.onabort = function(event) {
              onFinish("abort", event);
            };
          }
          if ("onprogress" in xhr) {
            xhr.onprogress = onProgress;
          }
          if ("onreadystatechange" in xhr) {
            xhr.onreadystatechange = function(event) {
              onReadyStateChange(event);
            };
          }
          if ("contentType" in xhr || !("ontimeout" in XMLHttpRequest2.prototype)) {
            url += (url.indexOf("?") === -1 ? "?" : "&") + "padding=true";
          }
          xhr.open(method, url, true);
          if ("readyState" in xhr) {
            timeout = setTimeout(function() {
              onTimeout();
            }, 0);
          }
        };
        XHRWrapper.prototype.abort = function() {
          this._abort(false);
        };
        XHRWrapper.prototype.getResponseHeader = function(name) {
          return this._contentType;
        };
        XHRWrapper.prototype.setRequestHeader = function(name, value) {
          var xhr = this._xhr;
          if ("setRequestHeader" in xhr) {
            xhr.setRequestHeader(name, value);
          }
        };
        XHRWrapper.prototype.getAllResponseHeaders = function() {
          return this._xhr.getAllResponseHeaders != void 0 ? this._xhr.getAllResponseHeaders() || "" : "";
        };
        XHRWrapper.prototype.send = function() {
          if ((!("ontimeout" in XMLHttpRequest2.prototype) || !("sendAsBinary" in XMLHttpRequest2.prototype) && !("mozAnon" in XMLHttpRequest2.prototype)) && document != void 0 && document.readyState != void 0 && document.readyState !== "complete") {
            var that = this;
            that._sendTimeout = setTimeout(function() {
              that._sendTimeout = 0;
              that.send();
            }, 4);
            return;
          }
          var xhr = this._xhr;
          if ("withCredentials" in xhr) {
            xhr.withCredentials = this.withCredentials;
          }
          try {
            xhr.send(void 0);
          } catch (error1) {
            throw error1;
          }
        };
        function toLowerCase(name) {
          return name.replace(/[A-Z]/g, function(c) {
            return String.fromCharCode(c.charCodeAt(0) + 32);
          });
        }
        function HeadersPolyfill(all) {
          var map = /* @__PURE__ */ Object.create(null);
          var array = all.split("\r\n");
          for (var i = 0; i < array.length; i += 1) {
            var line = array[i];
            var parts = line.split(": ");
            var name = parts.shift();
            var value = parts.join(": ");
            map[toLowerCase(name)] = value;
          }
          this._map = map;
        }
        HeadersPolyfill.prototype.get = function(name) {
          return this._map[toLowerCase(name)];
        };
        if (XMLHttpRequest2 != null && XMLHttpRequest2.HEADERS_RECEIVED == null) {
          XMLHttpRequest2.HEADERS_RECEIVED = 2;
        }
        function XHRTransport() {
        }
        XHRTransport.prototype.open = function(xhr, onStartCallback, onProgressCallback, onFinishCallback, url, withCredentials, headers) {
          xhr.open("GET", url);
          var offset = 0;
          xhr.onprogress = function() {
            var responseText = xhr.responseText;
            var chunk = responseText.slice(offset);
            offset += chunk.length;
            onProgressCallback(chunk);
          };
          xhr.onerror = function(event) {
            event.preventDefault();
            onFinishCallback(new Error("NetworkError"));
          };
          xhr.onload = function() {
            onFinishCallback(null);
          };
          xhr.onabort = function() {
            onFinishCallback(null);
          };
          xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest2.HEADERS_RECEIVED) {
              var status = xhr.status;
              var statusText = xhr.statusText;
              var contentType = xhr.getResponseHeader("Content-Type");
              var headers2 = xhr.getAllResponseHeaders();
              onStartCallback(status, statusText, contentType, new HeadersPolyfill(headers2));
            }
          };
          xhr.withCredentials = withCredentials;
          for (var name in headers) {
            if (Object.prototype.hasOwnProperty.call(headers, name)) {
              xhr.setRequestHeader(name, headers[name]);
            }
          }
          xhr.send();
          return xhr;
        };
        function HeadersWrapper(headers) {
          this._headers = headers;
        }
        HeadersWrapper.prototype.get = function(name) {
          return this._headers.get(name);
        };
        function FetchTransport() {
        }
        FetchTransport.prototype.open = function(xhr, onStartCallback, onProgressCallback, onFinishCallback, url, withCredentials, headers) {
          var reader = null;
          var controller = new AbortController();
          var signal = controller.signal;
          var textDecoder = new TextDecoder();
          fetch(url, {
            headers,
            credentials: withCredentials ? "include" : "same-origin",
            signal,
            cache: "no-store"
          }).then(function(response) {
            reader = response.body.getReader();
            onStartCallback(response.status, response.statusText, response.headers.get("Content-Type"), new HeadersWrapper(response.headers));
            return new Promise2(function(resolve, reject) {
              var readNextChunk = function() {
                reader.read().then(function(result) {
                  if (result.done) {
                    resolve(void 0);
                  } else {
                    var chunk = textDecoder.decode(result.value, { stream: true });
                    onProgressCallback(chunk);
                    readNextChunk();
                  }
                })["catch"](function(error) {
                  reject(error);
                });
              };
              readNextChunk();
            });
          })["catch"](function(error) {
            if (error.name === "AbortError") {
              return void 0;
            } else {
              return error;
            }
          }).then(function(error) {
            onFinishCallback(error);
          });
          return {
            abort: function() {
              if (reader != null) {
                reader.cancel();
              }
              controller.abort();
            }
          };
        };
        function EventTarget() {
          this._listeners = /* @__PURE__ */ Object.create(null);
        }
        function throwError(e) {
          setTimeout(function() {
            throw e;
          }, 0);
        }
        EventTarget.prototype.dispatchEvent = function(event) {
          event.target = this;
          var typeListeners = this._listeners[event.type];
          if (typeListeners != void 0) {
            var length = typeListeners.length;
            for (var i = 0; i < length; i += 1) {
              var listener = typeListeners[i];
              try {
                if (typeof listener.handleEvent === "function") {
                  listener.handleEvent(event);
                } else {
                  listener.call(this, event);
                }
              } catch (e) {
                throwError(e);
              }
            }
          }
        };
        EventTarget.prototype.addEventListener = function(type, listener) {
          type = String(type);
          var listeners = this._listeners;
          var typeListeners = listeners[type];
          if (typeListeners == void 0) {
            typeListeners = [];
            listeners[type] = typeListeners;
          }
          var found = false;
          for (var i = 0; i < typeListeners.length; i += 1) {
            if (typeListeners[i] === listener) {
              found = true;
            }
          }
          if (!found) {
            typeListeners.push(listener);
          }
        };
        EventTarget.prototype.removeEventListener = function(type, listener) {
          type = String(type);
          var listeners = this._listeners;
          var typeListeners = listeners[type];
          if (typeListeners != void 0) {
            var filtered = [];
            for (var i = 0; i < typeListeners.length; i += 1) {
              if (typeListeners[i] !== listener) {
                filtered.push(typeListeners[i]);
              }
            }
            if (filtered.length === 0) {
              delete listeners[type];
            } else {
              listeners[type] = filtered;
            }
          }
        };
        function Event(type) {
          this.type = type;
          this.target = void 0;
        }
        function MessageEvent(type, options) {
          Event.call(this, type);
          this.data = options.data;
          this.lastEventId = options.lastEventId;
        }
        MessageEvent.prototype = Object.create(Event.prototype);
        function ConnectionEvent(type, options) {
          Event.call(this, type);
          this.status = options.status;
          this.statusText = options.statusText;
          this.headers = options.headers;
        }
        ConnectionEvent.prototype = Object.create(Event.prototype);
        function ErrorEvent(type, options) {
          Event.call(this, type);
          this.error = options.error;
        }
        ErrorEvent.prototype = Object.create(Event.prototype);
        var WAITING = -1;
        var CONNECTING = 0;
        var OPEN = 1;
        var CLOSED = 2;
        var AFTER_CR = -1;
        var FIELD_START = 0;
        var FIELD = 1;
        var VALUE_START = 2;
        var VALUE = 3;
        var contentTypeRegExp = /^text\/event\-stream(;.*)?$/i;
        var MINIMUM_DURATION = 1e3;
        var MAXIMUM_DURATION = 18e6;
        var parseDuration = function(value, def) {
          var n = value == null ? def : parseInt(value, 10);
          if (n !== n) {
            n = def;
          }
          return clampDuration(n);
        };
        var clampDuration = function(n) {
          return Math.min(Math.max(n, MINIMUM_DURATION), MAXIMUM_DURATION);
        };
        var fire = function(that, f2, event) {
          try {
            if (typeof f2 === "function") {
              f2.call(that, event);
            }
          } catch (e) {
            throwError(e);
          }
        };
        function EventSourcePolyfill(url, options) {
          EventTarget.call(this);
          options = options || {};
          this.onopen = void 0;
          this.onmessage = void 0;
          this.onerror = void 0;
          this.url = void 0;
          this.readyState = void 0;
          this.withCredentials = void 0;
          this.headers = void 0;
          this._close = void 0;
          start(this, url, options);
        }
        function getBestXHRTransport() {
          return XMLHttpRequest2 != void 0 && "withCredentials" in XMLHttpRequest2.prototype || XDomainRequest == void 0 ? new XMLHttpRequest2() : new XDomainRequest();
        }
        var isFetchSupported = fetch != void 0 && Response != void 0 && "body" in Response.prototype;
        function start(es, url, options) {
          url = String(url);
          var withCredentials = Boolean(options.withCredentials);
          var lastEventIdQueryParameterName = options.lastEventIdQueryParameterName || "lastEventId";
          var initialRetry = clampDuration(1e3);
          var heartbeatTimeout = parseDuration(options.heartbeatTimeout, 45e3);
          var lastEventId = "";
          var retry = initialRetry;
          var wasActivity = false;
          var textLength = 0;
          var headers = options.headers || {};
          var TransportOption = options.Transport;
          var xhr = isFetchSupported && TransportOption == void 0 ? void 0 : new XHRWrapper(TransportOption != void 0 ? new TransportOption() : getBestXHRTransport());
          var transport = TransportOption != null && typeof TransportOption !== "string" ? new TransportOption() : xhr == void 0 ? new FetchTransport() : new XHRTransport();
          var abortController = void 0;
          var timeout = 0;
          var currentState = WAITING;
          var dataBuffer = "";
          var lastEventIdBuffer = "";
          var eventTypeBuffer = "";
          var textBuffer = "";
          var state = FIELD_START;
          var fieldStart = 0;
          var valueStart = 0;
          var onStart = function(status, statusText, contentType, headers2) {
            if (currentState === CONNECTING) {
              if (status === 200 && contentType != void 0 && contentTypeRegExp.test(contentType)) {
                currentState = OPEN;
                wasActivity = Date.now();
                retry = initialRetry;
                es.readyState = OPEN;
                var event = new ConnectionEvent("open", {
                  status,
                  statusText,
                  headers: headers2
                });
                es.dispatchEvent(event);
                fire(es, es.onopen, event);
              } else {
                var message = "";
                if (status !== 200) {
                  if (statusText) {
                    statusText = statusText.replace(/\s+/g, " ");
                  }
                  message = "EventSource's response has a status " + status + " " + statusText + " that is not 200. Aborting the connection.";
                } else {
                  message = "EventSource's response has a Content-Type specifying an unsupported type: " + (contentType == void 0 ? "-" : contentType.replace(/\s+/g, " ")) + ". Aborting the connection.";
                }
                close();
                var event = new ConnectionEvent("error", {
                  status,
                  statusText,
                  headers: headers2
                });
                es.dispatchEvent(event);
                fire(es, es.onerror, event);
                console.error(message);
              }
            }
          };
          var onProgress = function(textChunk) {
            if (currentState === OPEN) {
              var n = -1;
              for (var i = 0; i < textChunk.length; i += 1) {
                var c = textChunk.charCodeAt(i);
                if (c === "\n".charCodeAt(0) || c === "\r".charCodeAt(0)) {
                  n = i;
                }
              }
              var chunk = (n !== -1 ? textBuffer : "") + textChunk.slice(0, n + 1);
              textBuffer = (n === -1 ? textBuffer : "") + textChunk.slice(n + 1);
              if (textChunk !== "") {
                wasActivity = Date.now();
                textLength += textChunk.length;
              }
              for (var position = 0; position < chunk.length; position += 1) {
                var c = chunk.charCodeAt(position);
                if (state === AFTER_CR && c === "\n".charCodeAt(0)) {
                  state = FIELD_START;
                } else {
                  if (state === AFTER_CR) {
                    state = FIELD_START;
                  }
                  if (c === "\r".charCodeAt(0) || c === "\n".charCodeAt(0)) {
                    if (state !== FIELD_START) {
                      if (state === FIELD) {
                        valueStart = position + 1;
                      }
                      var field = chunk.slice(fieldStart, valueStart - 1);
                      var value = chunk.slice(valueStart + (valueStart < position && chunk.charCodeAt(valueStart) === " ".charCodeAt(0) ? 1 : 0), position);
                      if (field === "data") {
                        dataBuffer += "\n";
                        dataBuffer += value;
                      } else if (field === "id") {
                        lastEventIdBuffer = value;
                      } else if (field === "event") {
                        eventTypeBuffer = value;
                      } else if (field === "retry") {
                        initialRetry = parseDuration(value, initialRetry);
                        retry = initialRetry;
                      } else if (field === "heartbeatTimeout") {
                        heartbeatTimeout = parseDuration(value, heartbeatTimeout);
                        if (timeout !== 0) {
                          clearTimeout(timeout);
                          timeout = setTimeout(function() {
                            onTimeout();
                          }, heartbeatTimeout);
                        }
                      }
                    }
                    if (state === FIELD_START) {
                      if (dataBuffer !== "") {
                        lastEventId = lastEventIdBuffer;
                        if (eventTypeBuffer === "") {
                          eventTypeBuffer = "message";
                        }
                        var event = new MessageEvent(eventTypeBuffer, {
                          data: dataBuffer.slice(1),
                          lastEventId: lastEventIdBuffer
                        });
                        es.dispatchEvent(event);
                        if (eventTypeBuffer === "open") {
                          fire(es, es.onopen, event);
                        } else if (eventTypeBuffer === "message") {
                          fire(es, es.onmessage, event);
                        } else if (eventTypeBuffer === "error") {
                          fire(es, es.onerror, event);
                        }
                        if (currentState === CLOSED) {
                          return;
                        }
                      }
                      dataBuffer = "";
                      eventTypeBuffer = "";
                    }
                    state = c === "\r".charCodeAt(0) ? AFTER_CR : FIELD_START;
                  } else {
                    if (state === FIELD_START) {
                      fieldStart = position;
                      state = FIELD;
                    }
                    if (state === FIELD) {
                      if (c === ":".charCodeAt(0)) {
                        valueStart = position + 1;
                        state = VALUE_START;
                      }
                    } else if (state === VALUE_START) {
                      state = VALUE;
                    }
                  }
                }
              }
            }
          };
          var onFinish = function(error) {
            if (currentState === OPEN || currentState === CONNECTING) {
              currentState = WAITING;
              if (timeout !== 0) {
                clearTimeout(timeout);
                timeout = 0;
              }
              timeout = setTimeout(function() {
                onTimeout();
              }, retry);
              retry = clampDuration(Math.min(initialRetry * 16, retry * 2));
              es.readyState = CONNECTING;
              var event = new ErrorEvent("error", { error });
              es.dispatchEvent(event);
              fire(es, es.onerror, event);
              if (error != void 0) {
                console.error(error);
              }
            }
          };
          var close = function() {
            currentState = CLOSED;
            if (abortController != void 0) {
              abortController.abort();
              abortController = void 0;
            }
            if (timeout !== 0) {
              clearTimeout(timeout);
              timeout = 0;
            }
            es.readyState = CLOSED;
          };
          var onTimeout = function() {
            timeout = 0;
            if (currentState !== WAITING) {
              if (!wasActivity && abortController != void 0) {
                onFinish(new Error("No activity within " + heartbeatTimeout + " milliseconds. " + (currentState === CONNECTING ? "No response received." : textLength + " chars received.") + " Reconnecting."));
                if (abortController != void 0) {
                  abortController.abort();
                  abortController = void 0;
                }
              } else {
                var nextHeartbeat = Math.max((wasActivity || Date.now()) + heartbeatTimeout - Date.now(), 1);
                wasActivity = false;
                timeout = setTimeout(function() {
                  onTimeout();
                }, nextHeartbeat);
              }
              return;
            }
            wasActivity = false;
            textLength = 0;
            timeout = setTimeout(function() {
              onTimeout();
            }, heartbeatTimeout);
            currentState = CONNECTING;
            dataBuffer = "";
            eventTypeBuffer = "";
            lastEventIdBuffer = lastEventId;
            textBuffer = "";
            fieldStart = 0;
            valueStart = 0;
            state = FIELD_START;
            var requestURL = url;
            if (url.slice(0, 5) !== "data:" && url.slice(0, 5) !== "blob:") {
              if (lastEventId !== "") {
                var i = url.indexOf("?");
                requestURL = i === -1 ? url : url.slice(0, i + 1) + url.slice(i + 1).replace(/(?:^|&)([^=&]*)(?:=[^&]*)?/g, function(p, paramName) {
                  return paramName === lastEventIdQueryParameterName ? "" : p;
                });
                requestURL += (url.indexOf("?") === -1 ? "?" : "&") + lastEventIdQueryParameterName + "=" + encodeURIComponent(lastEventId);
              }
            }
            var withCredentials2 = es.withCredentials;
            var requestHeaders = {};
            requestHeaders["Accept"] = "text/event-stream";
            var headers2 = es.headers;
            if (headers2 != void 0) {
              for (var name in headers2) {
                if (Object.prototype.hasOwnProperty.call(headers2, name)) {
                  requestHeaders[name] = headers2[name];
                }
              }
            }
            try {
              abortController = transport.open(xhr, onStart, onProgress, onFinish, requestURL, withCredentials2, requestHeaders);
            } catch (error) {
              close();
              throw error;
            }
          };
          es.url = url;
          es.readyState = CONNECTING;
          es.withCredentials = withCredentials;
          es.headers = headers;
          es._close = close;
          onTimeout();
        }
        EventSourcePolyfill.prototype = Object.create(EventTarget.prototype);
        EventSourcePolyfill.prototype.CONNECTING = CONNECTING;
        EventSourcePolyfill.prototype.OPEN = OPEN;
        EventSourcePolyfill.prototype.CLOSED = CLOSED;
        EventSourcePolyfill.prototype.close = function() {
          this._close();
        };
        EventSourcePolyfill.CONNECTING = CONNECTING;
        EventSourcePolyfill.OPEN = OPEN;
        EventSourcePolyfill.CLOSED = CLOSED;
        EventSourcePolyfill.prototype.withCredentials = void 0;
        var R2 = NativeEventSource;
        if (XMLHttpRequest2 != void 0 && (NativeEventSource == void 0 || !("withCredentials" in NativeEventSource.prototype))) {
          R2 = EventSourcePolyfill;
        }
        (function(factory) {
          if (typeof module === "object" && typeof module.exports === "object") {
            var v2 = factory(exports);
            if (v2 !== void 0)
              module.exports = v2;
          } else if (typeof define === "function" && define.amd) {
            define(["exports"], factory);
          } else {
            factory(global);
          }
        })(function(exports2) {
          exports2.EventSourcePolyfill = EventSourcePolyfill;
          exports2.NativeEventSource = NativeEventSource;
          exports2.EventSource = R2;
        });
      })(typeof globalThis === "undefined" ? typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : exports : globalThis);
    }
  });

  // ../../node_modules/.pnpm/@sanity+eventsource@5.0.0/node_modules/@sanity/eventsource/browser.js
  var require_browser = __commonJS({
    "../../node_modules/.pnpm/@sanity+eventsource@5.0.0/node_modules/@sanity/eventsource/browser.js"(exports, module) {
      module.exports = require_eventsource().EventSourcePolyfill;
    }
  });

  // ../../node_modules/.pnpm/unfetch@4.2.0/node_modules/unfetch/dist/unfetch.js
  var require_unfetch = __commonJS({
    "../../node_modules/.pnpm/unfetch@4.2.0/node_modules/unfetch/dist/unfetch.js"(exports, module) {
      module.exports = function(e, n) {
        return n = n || {}, new Promise(function(t, r) {
          var s = new XMLHttpRequest(), o = [], u2 = [], i = {}, a = function() {
            return { ok: 2 == (s.status / 100 | 0), statusText: s.statusText, status: s.status, url: s.responseURL, text: function() {
              return Promise.resolve(s.responseText);
            }, json: function() {
              return Promise.resolve(s.responseText).then(JSON.parse);
            }, blob: function() {
              return Promise.resolve(new Blob([s.response]));
            }, clone: a, headers: { keys: function() {
              return o;
            }, entries: function() {
              return u2;
            }, get: function(e2) {
              return i[e2.toLowerCase()];
            }, has: function(e2) {
              return e2.toLowerCase() in i;
            } } };
          };
          for (var l2 in s.open(n.method || "get", e, true), s.onload = function() {
            s.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm, function(e2, n2, t2) {
              o.push(n2 = n2.toLowerCase()), u2.push([n2, t2]), i[n2] = i[n2] ? i[n2] + "," + t2 : t2;
            }), t(a());
          }, s.onerror = r, s.withCredentials = "include" == n.credentials, n.headers)
            s.setRequestHeader(l2, n.headers[l2]);
          s.send(n.body || null);
        });
      };
    }
  });

  // ../../node_modules/.pnpm/isomorphic-unfetch@3.1.0/node_modules/isomorphic-unfetch/browser.js
  var require_browser2 = __commonJS({
    "../../node_modules/.pnpm/isomorphic-unfetch@3.1.0/node_modules/isomorphic-unfetch/browser.js"(exports, module) {
      module.exports = self.fetch || (self.fetch = require_unfetch().default || require_unfetch());
    }
  });

  // ../../packages/sdk/javascript/dist/api.mjs
  var api_exports = {};
  __export(api_exports, {
    createClient: () => M
  });
  var import_eventsource, l, U, E, S, f, h, L, m, D, O, R, T, x, C, I, u, v, k, j, q, G, A, b, z, y, B, M;
  var init_api = __esm({
    "../../packages/sdk/javascript/dist/api.mjs"() {
      import_eventsource = __toESM(require_browser(), 1);
      l = "/content-groups";
      U = (t) => ({ get: (e) => t("GET", `${l}`, { params: e }), list: (e) => t("GET", `${l}/list`, { params: e }), create: (e) => t("POST", `${l}`, { body: e }), update: (e) => t("PUT", `${l}`, { body: e }), delete: (e) => t("DELETE", `${l}`, { params: e }) });
      E = "/content-pieces";
      S = (t) => ({ get: (e) => t("GET", `${E}`, { params: e }), create: (e) => t("POST", `${E}`, { body: e }), update: (e) => t("PUT", `${E}`, { body: e }), delete: (e) => t("DELETE", `${E}`, { params: e }), list: (e) => t("GET", `${E}/list`, { params: e }) });
      f = (t) => {
        let e = t.baseURL || "https://api.vrite.io", c = t.extensionId || "", i = t.headers || {}, $ = null, { token: p } = t;
        return { sendRequest: async (s, a, n) => {
          try {
            const { default: o } = await Promise.resolve().then(() => __toESM(require_browser2(), 1)), d = await o(`${e}${a}/?${encodeURI(Object.entries(n?.params || {}).filter(([, g]) => g).map(([g, w]) => `${g}=${w}`).join("&"))}`, { headers: { Authorization: `Bearer ${p}`, Accept: "application/json", ...n?.body ? { "Content-Type": "application/json" } : {}, ...c ? { "X-Vrite-Extension-ID": c } : {}, ...i }, body: n?.body ? JSON.stringify(n.body) : null, signal: $, method: s });
            $ = null;
            let r = null;
            try {
              if (r = await d.json(), !r)
                return;
            } catch {
              return;
            }
            if (!d.ok)
              throw r;
            return r;
          } catch (o) {
            throw console.error(o), o;
          }
        }, reconfigure: (s) => {
          e = s.baseURL || e, p = s.token || p, c = s.extensionId || c, i = s.headers || i;
        }, useSignal: (s) => {
          $ = s;
        }, getConfig: () => ({ baseURL: e, token: p, extensionId: c, headers: i }), getSignal: () => $ };
      };
      h = "/user-settings";
      L = (t) => ({ get: () => t("GET", `${h}`), update: (e) => t("PUT", `${h}`, { body: e }) });
      m = "/tags";
      D = (t) => ({ get: (e) => t("GET", `${m}`, { params: e }), update: (e) => t("PUT", `${m}`, { body: e }), create: (e) => t("PUT", `${m}`, { body: e }), delete: (e) => t("DELETE", `${m}`, { params: e }), list: (e) => t("GET", `${m}/list`, { params: e }) });
      O = "/profile";
      R = (t) => ({ get: () => t("GET", `${O}`) });
      T = "/webhooks";
      x = (t) => ({ get: (e) => t("GET", `${T}`, { params: e }), create: (e) => t("POST", `${T}`, { body: e }), update: (e) => t("PUT", `${T}`, { body: e }), delete: (e) => t("DELETE", `${T}`, { params: e }), list: (e) => t("GET", `${T}/list`, { params: e }) });
      C = "/workspace";
      I = (t) => ({ get: () => t("GET", `${C}`) });
      u = "/roles";
      v = (t) => ({ get: (e) => t("GET", `${u}`, { params: e }), create: (e) => t("POST", `${u}`, { body: e }), update: (e) => t("PUT", `${u}`, { body: e }), delete: (e) => t("DELETE", `${u}`, { params: e }), list: (e) => t("GET", `${u}/list`, { params: e }) });
      k = "/workspace-settings";
      j = (t) => ({ get: () => t("GET", `${k}`), update: (e) => t("PUT", `${k}`, { body: e }) });
      q = (t) => ({ listMembers: (e) => t("GET", "/workspace-memberships/list-members", { params: e }), listWorkspaces: (e) => t("GET", "/workspace-memberships/list-workspaces", { params: e }), create: (e) => t("POST", "/workspace-memberships", { body: e }), update: (e) => t("PUT", "/workspace-memberships", { body: e }), delete: (e) => t("DELETE", "/workspace-memberships", { params: e }) });
      G = "/extension";
      A = (t) => ({ get: () => t("GET", `${G}`), updateContentPieceData: (e) => t("POST", `${G}/content-piece-data`, { body: e }) });
      b = "/variants";
      z = (t) => ({ create: (e) => t("POST", `${b}`, { body: e }), update: (e) => t("PUT", `${b}`, { body: e }), delete: (e) => t("DELETE", `${b}`, { params: e }), list: () => t("GET", `${b}/list`) });
      y = "/transformers";
      B = (t) => ({ create: (e) => t("POST", `${y}`, { body: e }), delete: (e) => t("DELETE", `${y}`, { params: e }), list: () => t("GET", `${y}/list`) });
      M = (t) => {
        const { sendRequest: e, reconfigure: c, getConfig: i, getSignal: $, useSignal: p } = f(t), s = { contentGroups: U(e), contentPieces: S(e), tags: D(e), profile: R(e), userSettings: L(e), webhooks: x(e), workspace: I(e), roles: v(e), workspaceSettings: j(e), workspaceMemberships: q(e), extension: A(e), variants: z(e), transformers: B(e), search(a) {
          return e("GET", "/search", { params: a });
        }, async ask(a) {
          let n = "";
          const o = new import_eventsource.default(`${i().baseURL}/search/ask?query=${encodeURIComponent(a.query)}`, { headers: { Authorization: `Bearer ${i().token}` } });
          o.addEventListener("error", (d) => {
            const r = d;
            return r.message ? a.onError?.(r.message) : (o.close(), a.onEnd?.(n));
          }), o.addEventListener("message", (d) => {
            const r = decodeURIComponent(d.data);
            n += r, a.onChunk?.(r, n);
          }), $()?.addEventListener("abort", () => {
            o.close();
          }), p(null);
        }, useSignal(a) {
          return p(a), s;
        }, reconfigure(a) {
          return c(a), s;
        } };
        return s;
      };
    }
  });

  // scripts/sandbox.ts
  (async () => {
    const { createClient } = await Promise.resolve().then(() => (init_api(), api_exports));
    const client = createClient({
      token: "",
      extensionId: ""
    });
    const context = {};
    const createSetterMethod = (contextKey) => {
      return (keyOrPartial, value) => {
        context[contextKey] = context[contextKey] || {};
        if (typeof keyOrPartial === "string" && typeof value !== "undefined") {
          context[contextKey][keyOrPartial] = value;
          if (keyOrPartial.startsWith("$")) {
            Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
          }
        } else {
          Object.assign(context[contextKey], keyOrPartial);
          const dynamic = Object.keys(keyOrPartial).some((key) => key.startsWith("$"));
          if (dynamic) {
            Websandbox.connection?.remote.forceUpdate(JSON.parse(JSON.stringify(context)));
          }
        }
      };
    };
    const contextMethods = {
      setConfig: createSetterMethod("config"),
      setTemp: createSetterMethod("temp"),
      setData: createSetterMethod("data")
    };
    const buildContext = ({ methods, ...inputContext }) => {
      Object.assign(context, {
        ...inputContext,
        ...methods && Object.fromEntries(
          methods.map((method) => [
            method,
            contextMethods[method]
          ])
        )
      });
    };
    Websandbox.connection?.setLocalApi({
      reload: () => {
        window.location.reload();
      },
      callFunction: async (func, inputContext, meta) => {
        client.reconfigure({
          token: meta.token,
          extensionId: meta.extensionId
        });
        buildContext(inputContext);
        const url = URL.createObjectURL(new Blob([func], { type: "text/javascript" }));
        const module = await import(
          /* @vite-ignore */
          `${url}`
        );
        URL.revokeObjectURL(url);
        await module.default(
          new Proxy(
            {
              ...context,
              client,
              token: meta.token,
              extensionId: meta.extensionId,
              notify: Websandbox.connection?.remote.notify
            },
            {
              get(target, prop) {
                if (prop in target && typeof target[prop] !== "undefined") {
                  return target[prop];
                }
                return (...args) => {
                  return Websandbox.connection?.remote.remoteFunction(prop, ...args);
                };
              }
            }
          )
        );
        return JSON.parse(JSON.stringify(context));
      }
    });
    Websandbox.connection?.remote.hasLoaded();
  })();
})();
/*! Bundled license information:

event-source-polyfill/src/eventsource.js:
  (** @license
   * eventsource.js
   * Available under MIT License (MIT)
   * https://github.com/Yaffle/EventSource/
   *)
*/
