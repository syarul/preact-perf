/******/ (function(modules) { // webpackBootstrap
/******/ 	function hotDisposeChunk(chunkId) {
/******/ 		delete installedChunks[chunkId];
/******/ 	}
/******/ 	var parentHotUpdateCallback = window["webpackHotUpdate"];
/******/ 	window["webpackHotUpdate"] = 
/******/ 	function webpackHotUpdateCallback(chunkId, moreModules) { // eslint-disable-line no-unused-vars
/******/ 		hotAddUpdateChunk(chunkId, moreModules);
/******/ 		if(parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
/******/ 	} ;
/******/ 	
/******/ 	function hotDownloadUpdateChunk(chunkId) { // eslint-disable-line no-unused-vars
/******/ 		var head = document.getElementsByTagName("head")[0];
/******/ 		var script = document.createElement("script");
/******/ 		script.type = "text/javascript";
/******/ 		script.charset = "utf-8";
/******/ 		script.src = __webpack_require__.p + "" + chunkId + "." + hotCurrentHash + ".hot-update.js";
/******/ 		;
/******/ 		head.appendChild(script);
/******/ 	}
/******/ 	
/******/ 	function hotDownloadManifest(requestTimeout) { // eslint-disable-line no-unused-vars
/******/ 		requestTimeout = requestTimeout || 10000;
/******/ 		return new Promise(function(resolve, reject) {
/******/ 			if(typeof XMLHttpRequest === "undefined")
/******/ 				return reject(new Error("No browser support"));
/******/ 			try {
/******/ 				var request = new XMLHttpRequest();
/******/ 				var requestPath = __webpack_require__.p + "" + hotCurrentHash + ".hot-update.json";
/******/ 				request.open("GET", requestPath, true);
/******/ 				request.timeout = requestTimeout;
/******/ 				request.send(null);
/******/ 			} catch(err) {
/******/ 				return reject(err);
/******/ 			}
/******/ 			request.onreadystatechange = function() {
/******/ 				if(request.readyState !== 4) return;
/******/ 				if(request.status === 0) {
/******/ 					// timeout
/******/ 					reject(new Error("Manifest request to " + requestPath + " timed out."));
/******/ 				} else if(request.status === 404) {
/******/ 					// no update available
/******/ 					resolve();
/******/ 				} else if(request.status !== 200 && request.status !== 304) {
/******/ 					// other failure
/******/ 					reject(new Error("Manifest request to " + requestPath + " failed."));
/******/ 				} else {
/******/ 					// success
/******/ 					try {
/******/ 						var update = JSON.parse(request.responseText);
/******/ 					} catch(e) {
/******/ 						reject(e);
/******/ 						return;
/******/ 					}
/******/ 					resolve(update);
/******/ 				}
/******/ 			};
/******/ 		});
/******/ 	}
/******/
/******/ 	
/******/ 	
/******/ 	var hotApplyOnUpdate = true;
/******/ 	var hotCurrentHash = "a34b76432d5c462e26fe"; // eslint-disable-line no-unused-vars
/******/ 	var hotRequestTimeout = 10000;
/******/ 	var hotCurrentModuleData = {};
/******/ 	var hotCurrentChildModule; // eslint-disable-line no-unused-vars
/******/ 	var hotCurrentParents = []; // eslint-disable-line no-unused-vars
/******/ 	var hotCurrentParentsTemp = []; // eslint-disable-line no-unused-vars
/******/ 	
/******/ 	function hotCreateRequire(moduleId) { // eslint-disable-line no-unused-vars
/******/ 		var me = installedModules[moduleId];
/******/ 		if(!me) return __webpack_require__;
/******/ 		var fn = function(request) {
/******/ 			if(me.hot.active) {
/******/ 				if(installedModules[request]) {
/******/ 					if(installedModules[request].parents.indexOf(moduleId) < 0)
/******/ 						installedModules[request].parents.push(moduleId);
/******/ 				} else {
/******/ 					hotCurrentParents = [moduleId];
/******/ 					hotCurrentChildModule = request;
/******/ 				}
/******/ 				if(me.children.indexOf(request) < 0)
/******/ 					me.children.push(request);
/******/ 			} else {
/******/ 				console.warn("[HMR] unexpected require(" + request + ") from disposed module " + moduleId);
/******/ 				hotCurrentParents = [];
/******/ 			}
/******/ 			return __webpack_require__(request);
/******/ 		};
/******/ 		var ObjectFactory = function ObjectFactory(name) {
/******/ 			return {
/******/ 				configurable: true,
/******/ 				enumerable: true,
/******/ 				get: function() {
/******/ 					return __webpack_require__[name];
/******/ 				},
/******/ 				set: function(value) {
/******/ 					__webpack_require__[name] = value;
/******/ 				}
/******/ 			};
/******/ 		};
/******/ 		for(var name in __webpack_require__) {
/******/ 			if(Object.prototype.hasOwnProperty.call(__webpack_require__, name) && name !== "e") {
/******/ 				Object.defineProperty(fn, name, ObjectFactory(name));
/******/ 			}
/******/ 		}
/******/ 		fn.e = function(chunkId) {
/******/ 			if(hotStatus === "ready")
/******/ 				hotSetStatus("prepare");
/******/ 			hotChunksLoading++;
/******/ 			return __webpack_require__.e(chunkId).then(finishChunkLoading, function(err) {
/******/ 				finishChunkLoading();
/******/ 				throw err;
/******/ 			});
/******/ 	
/******/ 			function finishChunkLoading() {
/******/ 				hotChunksLoading--;
/******/ 				if(hotStatus === "prepare") {
/******/ 					if(!hotWaitingFilesMap[chunkId]) {
/******/ 						hotEnsureUpdateChunk(chunkId);
/******/ 					}
/******/ 					if(hotChunksLoading === 0 && hotWaitingFiles === 0) {
/******/ 						hotUpdateDownloaded();
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		return fn;
/******/ 	}
/******/ 	
/******/ 	function hotCreateModule(moduleId) { // eslint-disable-line no-unused-vars
/******/ 		var hot = {
/******/ 			// private stuff
/******/ 			_acceptedDependencies: {},
/******/ 			_declinedDependencies: {},
/******/ 			_selfAccepted: false,
/******/ 			_selfDeclined: false,
/******/ 			_disposeHandlers: [],
/******/ 			_main: hotCurrentChildModule !== moduleId,
/******/ 	
/******/ 			// Module API
/******/ 			active: true,
/******/ 			accept: function(dep, callback) {
/******/ 				if(typeof dep === "undefined")
/******/ 					hot._selfAccepted = true;
/******/ 				else if(typeof dep === "function")
/******/ 					hot._selfAccepted = dep;
/******/ 				else if(typeof dep === "object")
/******/ 					for(var i = 0; i < dep.length; i++)
/******/ 						hot._acceptedDependencies[dep[i]] = callback || function() {};
/******/ 				else
/******/ 					hot._acceptedDependencies[dep] = callback || function() {};
/******/ 			},
/******/ 			decline: function(dep) {
/******/ 				if(typeof dep === "undefined")
/******/ 					hot._selfDeclined = true;
/******/ 				else if(typeof dep === "object")
/******/ 					for(var i = 0; i < dep.length; i++)
/******/ 						hot._declinedDependencies[dep[i]] = true;
/******/ 				else
/******/ 					hot._declinedDependencies[dep] = true;
/******/ 			},
/******/ 			dispose: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			addDisposeHandler: function(callback) {
/******/ 				hot._disposeHandlers.push(callback);
/******/ 			},
/******/ 			removeDisposeHandler: function(callback) {
/******/ 				var idx = hot._disposeHandlers.indexOf(callback);
/******/ 				if(idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 			},
/******/ 	
/******/ 			// Management API
/******/ 			check: hotCheck,
/******/ 			apply: hotApply,
/******/ 			status: function(l) {
/******/ 				if(!l) return hotStatus;
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			addStatusHandler: function(l) {
/******/ 				hotStatusHandlers.push(l);
/******/ 			},
/******/ 			removeStatusHandler: function(l) {
/******/ 				var idx = hotStatusHandlers.indexOf(l);
/******/ 				if(idx >= 0) hotStatusHandlers.splice(idx, 1);
/******/ 			},
/******/ 	
/******/ 			//inherit from previous dispose call
/******/ 			data: hotCurrentModuleData[moduleId]
/******/ 		};
/******/ 		hotCurrentChildModule = undefined;
/******/ 		return hot;
/******/ 	}
/******/ 	
/******/ 	var hotStatusHandlers = [];
/******/ 	var hotStatus = "idle";
/******/ 	
/******/ 	function hotSetStatus(newStatus) {
/******/ 		hotStatus = newStatus;
/******/ 		for(var i = 0; i < hotStatusHandlers.length; i++)
/******/ 			hotStatusHandlers[i].call(null, newStatus);
/******/ 	}
/******/ 	
/******/ 	// while downloading
/******/ 	var hotWaitingFiles = 0;
/******/ 	var hotChunksLoading = 0;
/******/ 	var hotWaitingFilesMap = {};
/******/ 	var hotRequestedFilesMap = {};
/******/ 	var hotAvailableFilesMap = {};
/******/ 	var hotDeferred;
/******/ 	
/******/ 	// The update info
/******/ 	var hotUpdate, hotUpdateNewHash;
/******/ 	
/******/ 	function toModuleId(id) {
/******/ 		var isNumber = (+id) + "" === id;
/******/ 		return isNumber ? +id : id;
/******/ 	}
/******/ 	
/******/ 	function hotCheck(apply) {
/******/ 		if(hotStatus !== "idle") throw new Error("check() is only allowed in idle status");
/******/ 		hotApplyOnUpdate = apply;
/******/ 		hotSetStatus("check");
/******/ 		return hotDownloadManifest(hotRequestTimeout).then(function(update) {
/******/ 			if(!update) {
/******/ 				hotSetStatus("idle");
/******/ 				return null;
/******/ 			}
/******/ 			hotRequestedFilesMap = {};
/******/ 			hotWaitingFilesMap = {};
/******/ 			hotAvailableFilesMap = update.c;
/******/ 			hotUpdateNewHash = update.h;
/******/ 	
/******/ 			hotSetStatus("prepare");
/******/ 			var promise = new Promise(function(resolve, reject) {
/******/ 				hotDeferred = {
/******/ 					resolve: resolve,
/******/ 					reject: reject
/******/ 				};
/******/ 			});
/******/ 			hotUpdate = {};
/******/ 			var chunkId = 0;
/******/ 			{ // eslint-disable-line no-lone-blocks
/******/ 				/*globals chunkId */
/******/ 				hotEnsureUpdateChunk(chunkId);
/******/ 			}
/******/ 			if(hotStatus === "prepare" && hotChunksLoading === 0 && hotWaitingFiles === 0) {
/******/ 				hotUpdateDownloaded();
/******/ 			}
/******/ 			return promise;
/******/ 		});
/******/ 	}
/******/ 	
/******/ 	function hotAddUpdateChunk(chunkId, moreModules) { // eslint-disable-line no-unused-vars
/******/ 		if(!hotAvailableFilesMap[chunkId] || !hotRequestedFilesMap[chunkId])
/******/ 			return;
/******/ 		hotRequestedFilesMap[chunkId] = false;
/******/ 		for(var moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				hotUpdate[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(--hotWaitingFiles === 0 && hotChunksLoading === 0) {
/******/ 			hotUpdateDownloaded();
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotEnsureUpdateChunk(chunkId) {
/******/ 		if(!hotAvailableFilesMap[chunkId]) {
/******/ 			hotWaitingFilesMap[chunkId] = true;
/******/ 		} else {
/******/ 			hotRequestedFilesMap[chunkId] = true;
/******/ 			hotWaitingFiles++;
/******/ 			hotDownloadUpdateChunk(chunkId);
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotUpdateDownloaded() {
/******/ 		hotSetStatus("ready");
/******/ 		var deferred = hotDeferred;
/******/ 		hotDeferred = null;
/******/ 		if(!deferred) return;
/******/ 		if(hotApplyOnUpdate) {
/******/ 			// Wrap deferred object in Promise to mark it as a well-handled Promise to
/******/ 			// avoid triggering uncaught exception warning in Chrome.
/******/ 			// See https://bugs.chromium.org/p/chromium/issues/detail?id=465666
/******/ 			Promise.resolve().then(function() {
/******/ 				return hotApply(hotApplyOnUpdate);
/******/ 			}).then(
/******/ 				function(result) {
/******/ 					deferred.resolve(result);
/******/ 				},
/******/ 				function(err) {
/******/ 					deferred.reject(err);
/******/ 				}
/******/ 			);
/******/ 		} else {
/******/ 			var outdatedModules = [];
/******/ 			for(var id in hotUpdate) {
/******/ 				if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 					outdatedModules.push(toModuleId(id));
/******/ 				}
/******/ 			}
/******/ 			deferred.resolve(outdatedModules);
/******/ 		}
/******/ 	}
/******/ 	
/******/ 	function hotApply(options) {
/******/ 		if(hotStatus !== "ready") throw new Error("apply() is only allowed in ready status");
/******/ 		options = options || {};
/******/ 	
/******/ 		var cb;
/******/ 		var i;
/******/ 		var j;
/******/ 		var module;
/******/ 		var moduleId;
/******/ 	
/******/ 		function getAffectedStuff(updateModuleId) {
/******/ 			var outdatedModules = [updateModuleId];
/******/ 			var outdatedDependencies = {};
/******/ 	
/******/ 			var queue = outdatedModules.slice().map(function(id) {
/******/ 				return {
/******/ 					chain: [id],
/******/ 					id: id
/******/ 				};
/******/ 			});
/******/ 			while(queue.length > 0) {
/******/ 				var queueItem = queue.pop();
/******/ 				var moduleId = queueItem.id;
/******/ 				var chain = queueItem.chain;
/******/ 				module = installedModules[moduleId];
/******/ 				if(!module || module.hot._selfAccepted)
/******/ 					continue;
/******/ 				if(module.hot._selfDeclined) {
/******/ 					return {
/******/ 						type: "self-declined",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				if(module.hot._main) {
/******/ 					return {
/******/ 						type: "unaccepted",
/******/ 						chain: chain,
/******/ 						moduleId: moduleId
/******/ 					};
/******/ 				}
/******/ 				for(var i = 0; i < module.parents.length; i++) {
/******/ 					var parentId = module.parents[i];
/******/ 					var parent = installedModules[parentId];
/******/ 					if(!parent) continue;
/******/ 					if(parent.hot._declinedDependencies[moduleId]) {
/******/ 						return {
/******/ 							type: "declined",
/******/ 							chain: chain.concat([parentId]),
/******/ 							moduleId: moduleId,
/******/ 							parentId: parentId
/******/ 						};
/******/ 					}
/******/ 					if(outdatedModules.indexOf(parentId) >= 0) continue;
/******/ 					if(parent.hot._acceptedDependencies[moduleId]) {
/******/ 						if(!outdatedDependencies[parentId])
/******/ 							outdatedDependencies[parentId] = [];
/******/ 						addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 						continue;
/******/ 					}
/******/ 					delete outdatedDependencies[parentId];
/******/ 					outdatedModules.push(parentId);
/******/ 					queue.push({
/******/ 						chain: chain.concat([parentId]),
/******/ 						id: parentId
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 	
/******/ 			return {
/******/ 				type: "accepted",
/******/ 				moduleId: updateModuleId,
/******/ 				outdatedModules: outdatedModules,
/******/ 				outdatedDependencies: outdatedDependencies
/******/ 			};
/******/ 		}
/******/ 	
/******/ 		function addAllToSet(a, b) {
/******/ 			for(var i = 0; i < b.length; i++) {
/******/ 				var item = b[i];
/******/ 				if(a.indexOf(item) < 0)
/******/ 					a.push(item);
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// at begin all updates modules are outdated
/******/ 		// the "outdated" status can propagate to parents if they don't accept the children
/******/ 		var outdatedDependencies = {};
/******/ 		var outdatedModules = [];
/******/ 		var appliedUpdate = {};
/******/ 	
/******/ 		var warnUnexpectedRequire = function warnUnexpectedRequire() {
/******/ 			console.warn("[HMR] unexpected require(" + result.moduleId + ") to disposed module");
/******/ 		};
/******/ 	
/******/ 		for(var id in hotUpdate) {
/******/ 			if(Object.prototype.hasOwnProperty.call(hotUpdate, id)) {
/******/ 				moduleId = toModuleId(id);
/******/ 				var result;
/******/ 				if(hotUpdate[id]) {
/******/ 					result = getAffectedStuff(moduleId);
/******/ 				} else {
/******/ 					result = {
/******/ 						type: "disposed",
/******/ 						moduleId: id
/******/ 					};
/******/ 				}
/******/ 				var abortError = false;
/******/ 				var doApply = false;
/******/ 				var doDispose = false;
/******/ 				var chainInfo = "";
/******/ 				if(result.chain) {
/******/ 					chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 				}
/******/ 				switch(result.type) {
/******/ 					case "self-declined":
/******/ 						if(options.onDeclined)
/******/ 							options.onDeclined(result);
/******/ 						if(!options.ignoreDeclined)
/******/ 							abortError = new Error("Aborted because of self decline: " + result.moduleId + chainInfo);
/******/ 						break;
/******/ 					case "declined":
/******/ 						if(options.onDeclined)
/******/ 							options.onDeclined(result);
/******/ 						if(!options.ignoreDeclined)
/******/ 							abortError = new Error("Aborted because of declined dependency: " + result.moduleId + " in " + result.parentId + chainInfo);
/******/ 						break;
/******/ 					case "unaccepted":
/******/ 						if(options.onUnaccepted)
/******/ 							options.onUnaccepted(result);
/******/ 						if(!options.ignoreUnaccepted)
/******/ 							abortError = new Error("Aborted because " + moduleId + " is not accepted" + chainInfo);
/******/ 						break;
/******/ 					case "accepted":
/******/ 						if(options.onAccepted)
/******/ 							options.onAccepted(result);
/******/ 						doApply = true;
/******/ 						break;
/******/ 					case "disposed":
/******/ 						if(options.onDisposed)
/******/ 							options.onDisposed(result);
/******/ 						doDispose = true;
/******/ 						break;
/******/ 					default:
/******/ 						throw new Error("Unexception type " + result.type);
/******/ 				}
/******/ 				if(abortError) {
/******/ 					hotSetStatus("abort");
/******/ 					return Promise.reject(abortError);
/******/ 				}
/******/ 				if(doApply) {
/******/ 					appliedUpdate[moduleId] = hotUpdate[moduleId];
/******/ 					addAllToSet(outdatedModules, result.outdatedModules);
/******/ 					for(moduleId in result.outdatedDependencies) {
/******/ 						if(Object.prototype.hasOwnProperty.call(result.outdatedDependencies, moduleId)) {
/******/ 							if(!outdatedDependencies[moduleId])
/******/ 								outdatedDependencies[moduleId] = [];
/******/ 							addAllToSet(outdatedDependencies[moduleId], result.outdatedDependencies[moduleId]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 				if(doDispose) {
/******/ 					addAllToSet(outdatedModules, [result.moduleId]);
/******/ 					appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Store self accepted outdated modules to require them later by the module system
/******/ 		var outdatedSelfAcceptedModules = [];
/******/ 		for(i = 0; i < outdatedModules.length; i++) {
/******/ 			moduleId = outdatedModules[i];
/******/ 			if(installedModules[moduleId] && installedModules[moduleId].hot._selfAccepted)
/******/ 				outdatedSelfAcceptedModules.push({
/******/ 					module: moduleId,
/******/ 					errorHandler: installedModules[moduleId].hot._selfAccepted
/******/ 				});
/******/ 		}
/******/ 	
/******/ 		// Now in "dispose" phase
/******/ 		hotSetStatus("dispose");
/******/ 		Object.keys(hotAvailableFilesMap).forEach(function(chunkId) {
/******/ 			if(hotAvailableFilesMap[chunkId] === false) {
/******/ 				hotDisposeChunk(chunkId);
/******/ 			}
/******/ 		});
/******/ 	
/******/ 		var idx;
/******/ 		var queue = outdatedModules.slice();
/******/ 		while(queue.length > 0) {
/******/ 			moduleId = queue.pop();
/******/ 			module = installedModules[moduleId];
/******/ 			if(!module) continue;
/******/ 	
/******/ 			var data = {};
/******/ 	
/******/ 			// Call dispose handlers
/******/ 			var disposeHandlers = module.hot._disposeHandlers;
/******/ 			for(j = 0; j < disposeHandlers.length; j++) {
/******/ 				cb = disposeHandlers[j];
/******/ 				cb(data);
/******/ 			}
/******/ 			hotCurrentModuleData[moduleId] = data;
/******/ 	
/******/ 			// disable module (this disables requires from this module)
/******/ 			module.hot.active = false;
/******/ 	
/******/ 			// remove module from cache
/******/ 			delete installedModules[moduleId];
/******/ 	
/******/ 			// when disposing there is no need to call dispose handler
/******/ 			delete outdatedDependencies[moduleId];
/******/ 	
/******/ 			// remove "parents" references from all children
/******/ 			for(j = 0; j < module.children.length; j++) {
/******/ 				var child = installedModules[module.children[j]];
/******/ 				if(!child) continue;
/******/ 				idx = child.parents.indexOf(moduleId);
/******/ 				if(idx >= 0) {
/******/ 					child.parents.splice(idx, 1);
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// remove outdated dependency from module children
/******/ 		var dependency;
/******/ 		var moduleOutdatedDependencies;
/******/ 		for(moduleId in outdatedDependencies) {
/******/ 			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
/******/ 				module = installedModules[moduleId];
/******/ 				if(module) {
/******/ 					moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 					for(j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 						dependency = moduleOutdatedDependencies[j];
/******/ 						idx = module.children.indexOf(dependency);
/******/ 						if(idx >= 0) module.children.splice(idx, 1);
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Not in "apply" phase
/******/ 		hotSetStatus("apply");
/******/ 	
/******/ 		hotCurrentHash = hotUpdateNewHash;
/******/ 	
/******/ 		// insert new code
/******/ 		for(moduleId in appliedUpdate) {
/******/ 			if(Object.prototype.hasOwnProperty.call(appliedUpdate, moduleId)) {
/******/ 				modules[moduleId] = appliedUpdate[moduleId];
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// call accept handlers
/******/ 		var error = null;
/******/ 		for(moduleId in outdatedDependencies) {
/******/ 			if(Object.prototype.hasOwnProperty.call(outdatedDependencies, moduleId)) {
/******/ 				module = installedModules[moduleId];
/******/ 				if(module) {
/******/ 					moduleOutdatedDependencies = outdatedDependencies[moduleId];
/******/ 					var callbacks = [];
/******/ 					for(i = 0; i < moduleOutdatedDependencies.length; i++) {
/******/ 						dependency = moduleOutdatedDependencies[i];
/******/ 						cb = module.hot._acceptedDependencies[dependency];
/******/ 						if(cb) {
/******/ 							if(callbacks.indexOf(cb) >= 0) continue;
/******/ 							callbacks.push(cb);
/******/ 						}
/******/ 					}
/******/ 					for(i = 0; i < callbacks.length; i++) {
/******/ 						cb = callbacks[i];
/******/ 						try {
/******/ 							cb(moduleOutdatedDependencies);
/******/ 						} catch(err) {
/******/ 							if(options.onErrored) {
/******/ 								options.onErrored({
/******/ 									type: "accept-errored",
/******/ 									moduleId: moduleId,
/******/ 									dependencyId: moduleOutdatedDependencies[i],
/******/ 									error: err
/******/ 								});
/******/ 							}
/******/ 							if(!options.ignoreErrored) {
/******/ 								if(!error)
/******/ 									error = err;
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// Load self accepted modules
/******/ 		for(i = 0; i < outdatedSelfAcceptedModules.length; i++) {
/******/ 			var item = outdatedSelfAcceptedModules[i];
/******/ 			moduleId = item.module;
/******/ 			hotCurrentParents = [moduleId];
/******/ 			try {
/******/ 				__webpack_require__(moduleId);
/******/ 			} catch(err) {
/******/ 				if(typeof item.errorHandler === "function") {
/******/ 					try {
/******/ 						item.errorHandler(err);
/******/ 					} catch(err2) {
/******/ 						if(options.onErrored) {
/******/ 							options.onErrored({
/******/ 								type: "self-accept-error-handler-errored",
/******/ 								moduleId: moduleId,
/******/ 								error: err2,
/******/ 								orginalError: err, // TODO remove in webpack 4
/******/ 								originalError: err
/******/ 							});
/******/ 						}
/******/ 						if(!options.ignoreErrored) {
/******/ 							if(!error)
/******/ 								error = err2;
/******/ 						}
/******/ 						if(!error)
/******/ 							error = err;
/******/ 					}
/******/ 				} else {
/******/ 					if(options.onErrored) {
/******/ 						options.onErrored({
/******/ 							type: "self-accept-errored",
/******/ 							moduleId: moduleId,
/******/ 							error: err
/******/ 						});
/******/ 					}
/******/ 					if(!options.ignoreErrored) {
/******/ 						if(!error)
/******/ 							error = err;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 	
/******/ 		// handle errors in accept handlers and self accepted module load
/******/ 		if(error) {
/******/ 			hotSetStatus("fail");
/******/ 			return Promise.reject(error);
/******/ 		}
/******/ 	
/******/ 		hotSetStatus("idle");
/******/ 		return new Promise(function(resolve) {
/******/ 			resolve(outdatedModules);
/******/ 		});
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {},
/******/ 			hot: hotCreateModule(moduleId),
/******/ 			parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),
/******/ 			children: []
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, hotCreateRequire(moduleId));
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// __webpack_hash__
/******/ 	__webpack_require__.h = function() { return hotCurrentHash; };
/******/
/******/ 	// Load entry module and return exports
/******/ 	return hotCreateRequire(14)(__webpack_require__.s = 14);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/**
 * Keetjs v3.2.4 Alpha release: https://github.com/keetjs/keet.js
 * Minimalist view layer for the web
 *
 * <<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Keetjs >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
 *
 * Copyright 2018, Shahrul Nizam Selamat
 * Released under the MIT License.
 */

var getId = __webpack_require__(3).getId
var parseStr = __webpack_require__(15)

var next = function (i, ele, els) {
  var self = this
  if (i < els.length) {
    ele.appendChild(els[i])
    i++
    next.apply(this, [ i, ele, els ])
  } else {
    // bind proxy to component methods
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(function (fn) { return fn !== 'constructor' })
      .map(function (fn) {
        self[fn] = self[fn].bind(self.__proxy__)
      })

    // component lifeCycle after mounting
    if (this.componentDidMount && typeof this.componentDidMount === 'function') {
      this.componentDidMount()
    }
  }
}

function Keet () {
  this.base = {}
  Object.defineProperty(this, '__proxy__', {
    enumerable: false,
    writable: true
  })
}

Keet.prototype.mount = function (instance) {
  this.base = instance
  return this
}

Keet.prototype.link = function (id) {
  this.el = id
  // component lifeCycle before mounting
  if (this.componentWillMount && typeof this.componentWillMount === 'function') {
    this.componentWillMount()
  }
  this.render()
  return this
}

Keet.prototype.render = function () {
  var ele = getId(this.el)
  var els = parseStr.apply(this, this.args)
  if (ele) {
    ele.innerHTML = ''
    next.apply(this, [ 0, ele, els ])
  }
  return this
}

Keet.prototype.cluster = function () {
  var args = [].slice.call(arguments)
  if (args.length > 0) {
    args.map(function (f) {
      if (typeof f === 'function') f()
    })
  }
}

module.exports = Keet


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var cov_2jzltxe3cx = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\app_new.js',
      hash = '0b212a63a61c45f268cfcbd0b9a2a999df2090b8',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\app_new.js',
    statementMap: {
      '0': {
        start: {
          line: 13,
          column: 10
        },
        end: {
          line: 13,
          column: 35
        }
      },
      '1': {
        start: {
          line: 17,
          column: 4
        },
        end: {
          line: 17,
          column: 11
        }
      },
      '2': {
        start: {
          line: 18,
          column: 4
        },
        end: {
          line: 18,
          column: 25
        }
      },
      '3': {
        start: {
          line: 21,
          column: 4
        },
        end: {
          line: 23,
          column: 6
        }
      },
      '4': {
        start: {
          line: 22,
          column: 6
        },
        end: {
          line: 22,
          column: 31
        }
      },
      '5': {
        start: {
          line: 27,
          column: 4
        },
        end: {
          line: 27,
          column: 49
        }
      },
      '6': {
        start: {
          line: 27,
          column: 22
        },
        end: {
          line: 27,
          column: 49
        }
      },
      '7': {
        start: {
          line: 28,
          column: 4
        },
        end: {
          line: 28,
          column: 70
        }
      },
      '8': {
        start: {
          line: 28,
          column: 37
        },
        end: {
          line: 28,
          column: 65
        }
      },
      '9': {
        start: {
          line: 31,
          column: 4
        },
        end: {
          line: 39,
          column: 5
        }
      },
      '10': {
        start: {
          line: 32,
          column: 6
        },
        end: {
          line: 32,
          column: 38
        }
      },
      '11': {
        start: {
          line: 33,
          column: 6
        },
        end: {
          line: 33,
          column: 40
        }
      },
      '12': {
        start: {
          line: 34,
          column: 6
        },
        end: {
          line: 34,
          column: 42
        }
      },
      '13': {
        start: {
          line: 35,
          column: 11
        },
        end: {
          line: 39,
          column: 5
        }
      },
      '14': {
        start: {
          line: 36,
          column: 6
        },
        end: {
          line: 36,
          column: 38
        }
      },
      '15': {
        start: {
          line: 37,
          column: 6
        },
        end: {
          line: 37,
          column: 40
        }
      },
      '16': {
        start: {
          line: 38,
          column: 6
        },
        end: {
          line: 38,
          column: 42
        }
      },
      '17': {
        start: {
          line: 41,
          column: 20
        },
        end: {
          line: 41,
          column: 66
        }
      },
      '18': {
        start: {
          line: 41,
          column: 38
        },
        end: {
          line: 41,
          column: 65
        }
      },
      '19': {
        start: {
          line: 43,
          column: 4
        },
        end: {
          line: 43,
          column: 38
        }
      },
      '20': {
        start: {
          line: 45,
          column: 4
        },
        end: {
          line: 45,
          column: 46
        }
      },
      '21': {
        start: {
          line: 45,
          column: 14
        },
        end: {
          line: 45,
          column: 46
        }
      },
      '22': {
        start: {
          line: 48,
          column: 4
        },
        end: {
          line: 53,
          column: 6
        }
      },
      '23': {
        start: {
          line: 49,
          column: 14
        },
        end: {
          line: 49,
          column: 16
        }
      },
      '24': {
        start: {
          line: 50,
          column: 6
        },
        end: {
          line: 50,
          column: 53
        }
      },
      '25': {
        start: {
          line: 51,
          column: 6
        },
        end: {
          line: 51,
          column: 61
        }
      },
      '26': {
        start: {
          line: 51,
          column: 38
        },
        end: {
          line: 51,
          column: 61
        }
      },
      '27': {
        start: {
          line: 52,
          column: 6
        },
        end: {
          line: 52,
          column: 32
        }
      },
      '28': {
        start: {
          line: 57,
          column: 4
        },
        end: {
          line: 63,
          column: 6
        }
      },
      '29': {
        start: {
          line: 58,
          column: 6
        },
        end: {
          line: 62,
          column: 7
        }
      },
      '30': {
        start: {
          line: 59,
          column: 18
        },
        end: {
          line: 59,
          column: 20
        }
      },
      '31': {
        start: {
          line: 60,
          column: 8
        },
        end: {
          line: 60,
          column: 64
        }
      },
      '32': {
        start: {
          line: 61,
          column: 8
        },
        end: {
          line: 61,
          column: 45
        }
      },
      '33': {
        start: {
          line: 65,
          column: 4
        },
        end: {
          line: 65,
          column: 31
        }
      },
      '34': {
        start: {
          line: 69,
          column: 15
        },
        end: {
          line: 69,
          column: 19
        }
      },
      '35': {
        start: {
          line: 83,
          column: 15
        },
        end: {
          line: 83,
          column: 19
        }
      },
      '36': {
        start: {
          line: 84,
          column: 4
        },
        end: {
          line: 89,
          column: 7
        }
      },
      '37': {
        start: {
          line: 85,
          column: 6
        },
        end: {
          line: 87,
          column: 31
        }
      },
      '38': {
        start: {
          line: 85,
          column: 65
        },
        end: {
          line: 85,
          column: 84
        }
      },
      '39': {
        start: {
          line: 86,
          column: 11
        },
        end: {
          line: 87,
          column: 31
        }
      },
      '40': {
        start: {
          line: 86,
          column: 73
        },
        end: {
          line: 86,
          column: 92
        }
      },
      '41': {
        start: {
          line: 87,
          column: 11
        },
        end: {
          line: 87,
          column: 31
        }
      },
      '42': {
        start: {
          line: 88,
          column: 6
        },
        end: {
          line: 88,
          column: 21
        }
      },
      '43': {
        start: {
          line: 90,
          column: 4
        },
        end: {
          line: 90,
          column: 43
        }
      },
      '44': {
        start: {
          line: 91,
          column: 4
        },
        end: {
          line: 91,
          column: 26
        }
      },
      '45': {
        start: {
          line: 92,
          column: 4
        },
        end: {
          line: 92,
          column: 17
        }
      },
      '46': {
        start: {
          line: 95,
          column: 15
        },
        end: {
          line: 95,
          column: 19
        }
      },
      '47': {
        start: {
          line: 96,
          column: 4
        },
        end: {
          line: 101,
          column: 5
        }
      },
      '48': {
        start: {
          line: 97,
          column: 6
        },
        end: {
          line: 97,
          column: 45
        }
      },
      '49': {
        start: {
          line: 99,
          column: 6
        },
        end: {
          line: 99,
          column: 32
        }
      },
      '50': {
        start: {
          line: 100,
          column: 6
        },
        end: {
          line: 100,
          column: 49
        }
      },
      '51': {
        start: {
          line: 103,
          column: 4
        },
        end: {
          line: 105,
          column: 5
        }
      },
      '52': {
        start: {
          line: 104,
          column: 6
        },
        end: {
          line: 104,
          column: 45
        }
      },
      '53': {
        start: {
          line: 108,
          column: 4
        },
        end: {
          line: 115,
          column: 7
        }
      },
      '54': {
        start: {
          line: 109,
          column: 6
        },
        end: {
          line: 109,
          column: 12
        }
      },
      '55': {
        start: {
          line: 119,
          column: 4
        },
        end: {
          line: 119,
          column: 47
        }
      },
      '56': {
        start: {
          line: 123,
          column: 12
        },
        end: {
          line: 123,
          column: 19
        }
      },
      '57': {
        start: {
          line: 125,
          column: 13
        },
        end: {
          line: 138,
          column: 1
        }
      },
      '58': {
        start: {
          line: 140,
          column: 0
        },
        end: {
          line: 140,
          column: 51
        }
      },
      '59': {
        start: {
          line: 142,
          column: 0
        },
        end: {
          line: 145,
          column: 5
        }
      },
      '60': {
        start: {
          line: 143,
          column: 2
        },
        end: {
          line: 143,
          column: 35
        }
      },
      '61': {
        start: {
          line: 144,
          column: 2
        },
        end: {
          line: 144,
          column: 20
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 16,
            column: 2
          },
          end: {
            line: 16,
            column: 3
          }
        },
        loc: {
          start: {
            line: 16,
            column: 15
          },
          end: {
            line: 19,
            column: 3
          }
        },
        line: 16
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 20,
            column: 2
          },
          end: {
            line: 20,
            column: 3
          }
        },
        loc: {
          start: {
            line: 20,
            column: 23
          },
          end: {
            line: 24,
            column: 3
          }
        },
        line: 20
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 21,
            column: 23
          },
          end: {
            line: 21,
            column: 24
          }
        },
        loc: {
          start: {
            line: 21,
            column: 32
          },
          end: {
            line: 23,
            column: 5
          }
        },
        line: 21
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 25,
            column: 2
          },
          end: {
            line: 25,
            column: 3
          }
        },
        loc: {
          start: {
            line: 25,
            column: 29
          },
          end: {
            line: 29,
            column: 3
          }
        },
        line: 25
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 28,
            column: 31
          },
          end: {
            line: 28,
            column: 32
          }
        },
        loc: {
          start: {
            line: 28,
            column: 37
          },
          end: {
            line: 28,
            column: 65
          }
        },
        line: 28
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 30,
            column: 2
          },
          end: {
            line: 30,
            column: 3
          }
        },
        loc: {
          start: {
            line: 30,
            column: 26
          },
          end: {
            line: 46,
            column: 3
          }
        },
        line: 30
      },
      '6': {
        name: '(anonymous_6)',
        decl: {
          start: {
            line: 41,
            column: 33
          },
          end: {
            line: 41,
            column: 34
          }
        },
        loc: {
          start: {
            line: 41,
            column: 38
          },
          end: {
            line: 41,
            column: 65
          }
        },
        line: 41
      },
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 47,
            column: 2
          },
          end: {
            line: 47,
            column: 3
          }
        },
        loc: {
          start: {
            line: 47,
            column: 21
          },
          end: {
            line: 55,
            column: 3
          }
        },
        line: 47
      },
      '8': {
        name: '(anonymous_8)',
        decl: {
          start: {
            line: 48,
            column: 21
          },
          end: {
            line: 48,
            column: 22
          }
        },
        loc: {
          start: {
            line: 48,
            column: 34
          },
          end: {
            line: 53,
            column: 5
          }
        },
        line: 48
      },
      '9': {
        name: '(anonymous_9)',
        decl: {
          start: {
            line: 56,
            column: 2
          },
          end: {
            line: 56,
            column: 3
          }
        },
        loc: {
          start: {
            line: 56,
            column: 16
          },
          end: {
            line: 67,
            column: 3
          }
        },
        line: 56
      },
      '10': {
        name: '(anonymous_10)',
        decl: {
          start: {
            line: 57,
            column: 25
          },
          end: {
            line: 57,
            column: 26
          }
        },
        loc: {
          start: {
            line: 57,
            column: 47
          },
          end: {
            line: 63,
            column: 5
          }
        },
        line: 57
      },
      '11': {
        name: '(anonymous_11)',
        decl: {
          start: {
            line: 68,
            column: 2
          },
          end: {
            line: 68,
            column: 3
          }
        },
        loc: {
          start: {
            line: 68,
            column: 20
          },
          end: {
            line: 81,
            column: 3
          }
        },
        line: 68
      },
      '12': {
        name: '(anonymous_12)',
        decl: {
          start: {
            line: 82,
            column: 2
          },
          end: {
            line: 82,
            column: 3
          }
        },
        loc: {
          start: {
            line: 82,
            column: 15
          },
          end: {
            line: 93,
            column: 3
          }
        },
        line: 82
      },
      '13': {
        name: '(anonymous_13)',
        decl: {
          start: {
            line: 84,
            column: 19
          },
          end: {
            line: 84,
            column: 20
          }
        },
        loc: {
          start: {
            line: 84,
            column: 38
          },
          end: {
            line: 89,
            column: 5
          }
        },
        line: 84
      },
      '14': {
        name: '(anonymous_14)',
        decl: {
          start: {
            line: 94,
            column: 2
          },
          end: {
            line: 94,
            column: 3
          }
        },
        loc: {
          start: {
            line: 94,
            column: 17
          },
          end: {
            line: 106,
            column: 3
          }
        },
        line: 94
      },
      '15': {
        name: '(anonymous_15)',
        decl: {
          start: {
            line: 103,
            column: 24
          },
          end: {
            line: 103,
            column: 25
          }
        },
        loc: {
          start: {
            line: 103,
            column: 36
          },
          end: {
            line: 105,
            column: 5
          }
        },
        line: 103
      },
      '16': {
        name: '(anonymous_16)',
        decl: {
          start: {
            line: 107,
            column: 2
          },
          end: {
            line: 107,
            column: 3
          }
        },
        loc: {
          start: {
            line: 107,
            column: 43
          },
          end: {
            line: 117,
            column: 3
          }
        },
        line: 107
      },
      '17': {
        name: '(anonymous_17)',
        decl: {
          start: {
            line: 108,
            column: 22
          },
          end: {
            line: 108,
            column: 23
          }
        },
        loc: {
          start: {
            line: 108,
            column: 32
          },
          end: {
            line: 115,
            column: 5
          }
        },
        line: 108
      },
      '18': {
        name: '(anonymous_18)',
        decl: {
          start: {
            line: 118,
            column: 2
          },
          end: {
            line: 118,
            column: 3
          }
        },
        loc: {
          start: {
            line: 118,
            column: 10
          },
          end: {
            line: 120,
            column: 3
          }
        },
        line: 118
      },
      '19': {
        name: '(anonymous_19)',
        decl: {
          start: {
            line: 142,
            column: 11
          },
          end: {
            line: 142,
            column: 12
          }
        },
        loc: {
          start: {
            line: 142,
            column: 17
          },
          end: {
            line: 145,
            column: 1
          }
        },
        line: 142
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 27,
            column: 4
          },
          end: {
            line: 27,
            column: 49
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 27,
            column: 4
          },
          end: {
            line: 27,
            column: 49
          }
        }, {
          start: {
            line: 27,
            column: 4
          },
          end: {
            line: 27,
            column: 49
          }
        }],
        line: 27
      },
      '1': {
        loc: {
          start: {
            line: 31,
            column: 4
          },
          end: {
            line: 39,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 31,
            column: 4
          },
          end: {
            line: 39,
            column: 5
          }
        }, {
          start: {
            line: 31,
            column: 4
          },
          end: {
            line: 39,
            column: 5
          }
        }],
        line: 31
      },
      '2': {
        loc: {
          start: {
            line: 31,
            column: 7
          },
          end: {
            line: 31,
            column: 54
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 31,
            column: 7
          },
          end: {
            line: 31,
            column: 38
          }
        }, {
          start: {
            line: 31,
            column: 42
          },
          end: {
            line: 31,
            column: 54
          }
        }],
        line: 31
      },
      '3': {
        loc: {
          start: {
            line: 35,
            column: 11
          },
          end: {
            line: 39,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 35,
            column: 11
          },
          end: {
            line: 39,
            column: 5
          }
        }, {
          start: {
            line: 35,
            column: 11
          },
          end: {
            line: 39,
            column: 5
          }
        }],
        line: 35
      },
      '4': {
        loc: {
          start: {
            line: 35,
            column: 14
          },
          end: {
            line: 35,
            column: 63
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 35,
            column: 14
          },
          end: {
            line: 35,
            column: 46
          }
        }, {
          start: {
            line: 35,
            column: 50
          },
          end: {
            line: 35,
            column: 63
          }
        }],
        line: 35
      },
      '5': {
        loc: {
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 45,
            column: 46
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 45,
            column: 46
          }
        }, {
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 45,
            column: 46
          }
        }],
        line: 45
      },
      '6': {
        loc: {
          start: {
            line: 50,
            column: 20
          },
          end: {
            line: 50,
            column: 53
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 50,
            column: 38
          },
          end: {
            line: 50,
            column: 48
          }
        }, {
          start: {
            line: 50,
            column: 51
          },
          end: {
            line: 50,
            column: 53
          }
        }],
        line: 50
      },
      '7': {
        loc: {
          start: {
            line: 51,
            column: 6
          },
          end: {
            line: 51,
            column: 61
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 51,
            column: 6
          },
          end: {
            line: 51,
            column: 61
          }
        }, {
          start: {
            line: 51,
            column: 6
          },
          end: {
            line: 51,
            column: 61
          }
        }],
        line: 51
      },
      '8': {
        loc: {
          start: {
            line: 58,
            column: 6
          },
          end: {
            line: 62,
            column: 7
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 58,
            column: 6
          },
          end: {
            line: 62,
            column: 7
          }
        }, {
          start: {
            line: 58,
            column: 6
          },
          end: {
            line: 62,
            column: 7
          }
        }],
        line: 58
      },
      '9': {
        loc: {
          start: {
            line: 60,
            column: 24
          },
          end: {
            line: 60,
            column: 64
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 60,
            column: 48
          },
          end: {
            line: 60,
            column: 59
          }
        }, {
          start: {
            line: 60,
            column: 62
          },
          end: {
            line: 60,
            column: 64
          }
        }],
        line: 60
      },
      '10': {
        loc: {
          start: {
            line: 85,
            column: 6
          },
          end: {
            line: 87,
            column: 31
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 85,
            column: 6
          },
          end: {
            line: 87,
            column: 31
          }
        }, {
          start: {
            line: 85,
            column: 6
          },
          end: {
            line: 87,
            column: 31
          }
        }],
        line: 85
      },
      '11': {
        loc: {
          start: {
            line: 85,
            column: 10
          },
          end: {
            line: 85,
            column: 63
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 85,
            column: 10
          },
          end: {
            line: 85,
            column: 32
          }
        }, {
          start: {
            line: 85,
            column: 36
          },
          end: {
            line: 85,
            column: 63
          }
        }],
        line: 85
      },
      '12': {
        loc: {
          start: {
            line: 86,
            column: 11
          },
          end: {
            line: 87,
            column: 31
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 86,
            column: 11
          },
          end: {
            line: 87,
            column: 31
          }
        }, {
          start: {
            line: 86,
            column: 11
          },
          end: {
            line: 87,
            column: 31
          }
        }],
        line: 86
      },
      '13': {
        loc: {
          start: {
            line: 86,
            column: 15
          },
          end: {
            line: 86,
            column: 71
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 86,
            column: 15
          },
          end: {
            line: 86,
            column: 40
          }
        }, {
          start: {
            line: 86,
            column: 44
          },
          end: {
            line: 86,
            column: 71
          }
        }],
        line: 86
      },
      '14': {
        loc: {
          start: {
            line: 96,
            column: 4
          },
          end: {
            line: 101,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 96,
            column: 4
          },
          end: {
            line: 101,
            column: 5
          }
        }, {
          start: {
            line: 96,
            column: 4
          },
          end: {
            line: 101,
            column: 5
          }
        }],
        line: 96
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0,
      '15': 0,
      '16': 0,
      '17': 0,
      '18': 0,
      '19': 0,
      '20': 0,
      '21': 0,
      '22': 0,
      '23': 0,
      '24': 0,
      '25': 0,
      '26': 0,
      '27': 0,
      '28': 0,
      '29': 0,
      '30': 0,
      '31': 0,
      '32': 0,
      '33': 0,
      '34': 0,
      '35': 0,
      '36': 0,
      '37': 0,
      '38': 0,
      '39': 0,
      '40': 0,
      '41': 0,
      '42': 0,
      '43': 0,
      '44': 0,
      '45': 0,
      '46': 0,
      '47': 0,
      '48': 0,
      '49': 0,
      '50': 0,
      '51': 0,
      '52': 0,
      '53': 0,
      '54': 0,
      '55': 0,
      '56': 0,
      '57': 0,
      '58': 0,
      '59': 0,
      '60': 0,
      '61': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0,
      '15': 0,
      '16': 0,
      '17': 0,
      '18': 0,
      '19': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0],
      '4': [0, 0],
      '5': [0, 0],
      '6': [0, 0],
      '7': [0, 0],
      '8': [0, 0],
      '9': [0, 0],
      '10': [0, 0],
      '11': [0, 0],
      '12': [0, 0],
      '13': [0, 0],
      '14': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _container = __webpack_require__(21);

var _main = __webpack_require__(11);

var _todoList = __webpack_require__(7);

var _footer = __webpack_require__(12);

var _filters = __webpack_require__(13);

var _model = __webpack_require__(22);

var _model2 = _interopRequireDefault(_model);

var _utils = __webpack_require__(2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var log = (cov_2jzltxe3cx.s[0]++, console.log.bind(console));

var App = function (_ref) {
  _inherits(App, _ref);

  function App() {
    _classCallCheck(this, App);

    cov_2jzltxe3cx.f[0]++;
    cov_2jzltxe3cx.s[1]++;

    var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this));

    cov_2jzltxe3cx.s[2]++;

    _this.updating = false;
    return _this;
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      cov_2jzltxe3cx.f[1]++;
      cov_2jzltxe3cx.s[3]++;

      _todoList.todoList.subscribe(function (todos) {
        cov_2jzltxe3cx.f[2]++;
        cov_2jzltxe3cx.s[4]++;

        _this2.intelliUpdate(todos);
      });
    }
  }, {
    key: 'intelliUpdate',
    value: function intelliUpdate(todos, store) {
      var _this3 = this;

      cov_2jzltxe3cx.f[3]++;
      cov_2jzltxe3cx.s[5]++;

      // only update when necessary
      if (this.updating) {
          cov_2jzltxe3cx.b[0][0]++;
          cov_2jzltxe3cx.s[6]++;
          clearTimeout(this.updating);
        } else {
        cov_2jzltxe3cx.b[0][1]++;
      }cov_2jzltxe3cx.s[7]++;
      this.updating = setTimeout(function () {
        cov_2jzltxe3cx.f[4]++;
        cov_2jzltxe3cx.s[8]++;
        return _this3.getActive(todos, store);
      }, 10);
    }
  }, {
    key: 'getActive',
    value: function getActive(todos, store) {
      cov_2jzltxe3cx.f[5]++;
      cov_2jzltxe3cx.s[9]++;

      if ((cov_2jzltxe3cx.b[2][0]++, _container.container.mainDisplay == 'none') && (cov_2jzltxe3cx.b[2][1]++, todos.length)) {
        cov_2jzltxe3cx.b[1][0]++;
        cov_2jzltxe3cx.s[10]++;

        _main.main.toggleDisplay(todos.length);
        cov_2jzltxe3cx.s[11]++;
        _container.container.toggleMain(todos.length);
        cov_2jzltxe3cx.s[12]++;
        _container.container.toggleFooter(todos.length);
      } else {
          cov_2jzltxe3cx.b[1][1]++;
          cov_2jzltxe3cx.s[13]++;
          if ((cov_2jzltxe3cx.b[4][0]++, _container.container.mainDisplay == 'block') && (cov_2jzltxe3cx.b[4][1]++, !todos.length)) {
            cov_2jzltxe3cx.b[3][0]++;
            cov_2jzltxe3cx.s[14]++;

            _main.main.toggleDisplay(todos.length);
            cov_2jzltxe3cx.s[15]++;
            _container.container.toggleMain(todos.length);
            cov_2jzltxe3cx.s[16]++;
            _container.container.toggleFooter(todos.length);
          } else {
            cov_2jzltxe3cx.b[3][1]++;
          }
        }var actives = (cov_2jzltxe3cx.s[17]++, todos.filter(function (f) {
        cov_2jzltxe3cx.f[6]++;
        cov_2jzltxe3cx.s[18]++;
        return f.completed !== 'completed';
      }));

      cov_2jzltxe3cx.s[19]++;
      _footer.footer.updateCount(actives.length);
      // only store if requested
      cov_2jzltxe3cx.s[20]++;
      if (store) {
          cov_2jzltxe3cx.b[5][0]++;
          cov_2jzltxe3cx.s[21]++;
          (0, _utils.store)('todos-keetjs', todos);
        } else {
        cov_2jzltxe3cx.b[5][1]++;
      }
    }
  }, {
    key: 'updateFilter',
    value: function updateFilter(hash) {
      var _this4 = this;

      cov_2jzltxe3cx.f[7]++;
      cov_2jzltxe3cx.s[22]++;

      _filters.filters.list.map(function (f, i, r) {
        cov_2jzltxe3cx.f[8]++;

        var c = (cov_2jzltxe3cx.s[23]++, {});
        cov_2jzltxe3cx.s[24]++;
        c.className = f.hash === hash ? (cov_2jzltxe3cx.b[6][0]++, 'selected') : (cov_2jzltxe3cx.b[6][1]++, '');
        cov_2jzltxe3cx.s[25]++;
        if (f.className === 'selected') {
            cov_2jzltxe3cx.b[7][0]++;
            cov_2jzltxe3cx.s[26]++;
            _this4.page = f.nodeValue;
          } else {
          cov_2jzltxe3cx.b[7][1]++;
        }cov_2jzltxe3cx.s[27]++;
        r[i] = Object.assign(f, c);
      });
      // this.updatePage();
    }
  }, {
    key: 'todoCheck',
    value: function todoCheck(id) {
      cov_2jzltxe3cx.f[9]++;
      cov_2jzltxe3cx.s[28]++;

      _todoList.todoList.list.filter(function (todo, idx, todos) {
        cov_2jzltxe3cx.f[10]++;
        cov_2jzltxe3cx.s[29]++;

        if (todo.id === id) {
          cov_2jzltxe3cx.b[8][0]++;

          var chg = (cov_2jzltxe3cx.s[30]++, {});
          cov_2jzltxe3cx.s[31]++;
          chg.completed = todo.completed === '' ? (cov_2jzltxe3cx.b[9][0]++, 'completed') : (cov_2jzltxe3cx.b[9][1]++, '');
          cov_2jzltxe3cx.s[32]++;
          todos[idx] = Object.assign(todo, chg);
        } else {
          cov_2jzltxe3cx.b[8][1]++;
        }
      });

      cov_2jzltxe3cx.s[33]++;
      this.intelliUpdate('store');
      // this.focus()
    }
  }, {
    key: 'destroy',
    value: function destroy(id, node) {
      cov_2jzltxe3cx.f[11]++;

      var self = (cov_2jzltxe3cx.s[34]++, this);
      // todoList.list = todoList.list.filter(function(todo, index){
      //   if(id == todo.id)
      //     node.remove()
      //   else
      //     return todo
      // })
      // this.intelliUpdate('store')
      // util.store('todos-keetjs', this.todos);
      // this.getActive();
      // this.updateCheckAll();
      // this.focus();
    }
  }, {
    key: 'updatePage',
    value: function updatePage() {
      cov_2jzltxe3cx.f[12]++;

      var self = (cov_2jzltxe3cx.s[35]++, this);
      cov_2jzltxe3cx.s[36]++;
      this.todos.map(function (f, i, r) {
        cov_2jzltxe3cx.f[13]++;
        cov_2jzltxe3cx.s[37]++;

        if ((cov_2jzltxe3cx.b[11][0]++, self.page === 'Active') && (cov_2jzltxe3cx.b[11][1]++, f.completed === 'completed')) {
            cov_2jzltxe3cx.b[10][0]++;
            cov_2jzltxe3cx.s[38]++;
            f.display = 'none';
          } else {
            cov_2jzltxe3cx.b[10][1]++;
            cov_2jzltxe3cx.s[39]++;
            if ((cov_2jzltxe3cx.b[13][0]++, self.page === 'Completed') && (cov_2jzltxe3cx.b[13][1]++, f.completed !== 'completed')) {
                cov_2jzltxe3cx.b[12][0]++;
                cov_2jzltxe3cx.s[40]++;
                f.display = 'none';
              } else {
                cov_2jzltxe3cx.b[12][1]++;
                cov_2jzltxe3cx.s[41]++;
                f.display = 'block';
              }
          }cov_2jzltxe3cx.s[42]++;
        r.update(i, f);
      });
      cov_2jzltxe3cx.s[43]++;
      util.store('todos-keetjs', this.todos);
      cov_2jzltxe3cx.s[44]++;
      this.updateCheckAll();
      cov_2jzltxe3cx.s[45]++;
      this.focus();
    }
  }, {
    key: 'renderFooter',
    value: function renderFooter() {
      cov_2jzltxe3cx.f[14]++;

      var self = (cov_2jzltxe3cx.s[46]++, this);
      cov_2jzltxe3cx.s[47]++;
      if (window.location.hash !== '') {
        cov_2jzltxe3cx.b[14][0]++;
        cov_2jzltxe3cx.s[48]++;

        this.updateFilter(window.location.hash);
      } else {
        cov_2jzltxe3cx.b[14][1]++;
        cov_2jzltxe3cx.s[49]++;

        this.updateFilter('#/all');
        cov_2jzltxe3cx.s[50]++;
        window.history.pushState({}, null, '#/all');
      }

      cov_2jzltxe3cx.s[51]++;
      window.onpopstate = function () {
        cov_2jzltxe3cx.f[15]++;
        cov_2jzltxe3cx.s[52]++;

        self.updateFilter(window.location.hash);
      };
    }
  }, {
    key: 'checkedAll',
    value: function checkedAll() /*todoList, state, initial*/{
      cov_2jzltxe3cx.f[16]++;
      cov_2jzltxe3cx.s[53]++;

      _todoList.todoList.list.map(function (f, i) {
        cov_2jzltxe3cx.f[17]++;
        cov_2jzltxe3cx.s[54]++;

        log(f);

        // log(todoList)
        // if (!initial && state && f.completed !== 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
        // else if (!initial && !state && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { click: true });
        // else if (initial && f.completed === 'completed') todoList.evented(i, 'class', 'toggle', { checked: true });
      });
      // this.focus()
    }
  }, {
    key: 'focus',
    value: function focus() {
      cov_2jzltxe3cx.f[18]++;
      cov_2jzltxe3cx.s[55]++;

      document.getElementById('new-todo').focus();
    }
  }]);

  return App;
}((_keet2.default));

var app = (cov_2jzltxe3cx.s[56]++, new App());

var todo = (cov_2jzltxe3cx.s[57]++, {
  todoapp: {
    tag: 'section',
    id: 'todoapp'
  },
  info: {
    tag: 'footer',
    id: 'info',
    template: '\n      <p>Double-click to edit a todo</p>\n      <p>Created by <a href="https://github.com/syarul">Shahrul Nizam Selamat</a></p>\n      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>'
  }
});

cov_2jzltxe3cx.s[58]++;
app.mount(todo).link('todo').cluster(_container.containerInit);

cov_2jzltxe3cx.s[59]++;
setTimeout(function () {
  cov_2jzltxe3cx.f[19]++;
  cov_2jzltxe3cx.s[60]++;

  app.getActive(_todoList.todoList.base.list);
  cov_2jzltxe3cx.s[61]++;
  app.renderFooter();
}, 0);

// log(app)

exports.default = app;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var cov_11xe43hgzf = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\utils\\index.js',
      hash = 'ef31c328f3dbf5cd8716a3195b0259147b27e20c',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\utils\\index.js',
    statementMap: {
      '0': {
        start: {
          line: 2,
          column: 2
        },
        end: {
          line: 2,
          column: 47
        }
      },
      '1': {
        start: {
          line: 6,
          column: 13
        },
        end: {
          line: 6,
          column: 15
        }
      },
      '2': {
        start: {
          line: 7,
          column: 2
        },
        end: {
          line: 13,
          column: 3
        }
      },
      '3': {
        start: {
          line: 8,
          column: 17
        },
        end: {
          line: 8,
          column: 39
        }
      },
      '4': {
        start: {
          line: 9,
          column: 4
        },
        end: {
          line: 11,
          column: 5
        }
      },
      '5': {
        start: {
          line: 10,
          column: 6
        },
        end: {
          line: 10,
          column: 18
        }
      },
      '6': {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 12,
          column: 81
        }
      },
      '7': {
        start: {
          line: 14,
          column: 2
        },
        end: {
          line: 14,
          column: 14
        }
      },
      '8': {
        start: {
          line: 18,
          column: 2
        },
        end: {
          line: 18,
          column: 41
        }
      },
      '9': {
        start: {
          line: 22,
          column: 2
        },
        end: {
          line: 24,
          column: 3
        }
      },
      '10': {
        start: {
          line: 23,
          column: 4
        },
        end: {
          line: 23,
          column: 65
        }
      },
      '11': {
        start: {
          line: 26,
          column: 14
        },
        end: {
          line: 26,
          column: 45
        }
      },
      '12': {
        start: {
          line: 27,
          column: 2
        },
        end: {
          line: 27,
          column: 44
        }
      },
      '13': {
        start: {
          line: 31,
          column: 2
        },
        end: {
          line: 31,
          column: 57
        }
      },
      '14': {
        start: {
          line: 35,
          column: 2
        },
        end: {
          line: 35,
          column: 36
        }
      }
    },
    fnMap: {
      '0': {
        name: 'camelCase',
        decl: {
          start: {
            line: 1,
            column: 16
          },
          end: {
            line: 1,
            column: 25
          }
        },
        loc: {
          start: {
            line: 1,
            column: 29
          },
          end: {
            line: 3,
            column: 1
          }
        },
        line: 1
      },
      '1': {
        name: 'uuid',
        decl: {
          start: {
            line: 5,
            column: 16
          },
          end: {
            line: 5,
            column: 20
          }
        },
        loc: {
          start: {
            line: 5,
            column: 23
          },
          end: {
            line: 15,
            column: 1
          }
        },
        line: 5
      },
      '2': {
        name: 'pluralize',
        decl: {
          start: {
            line: 17,
            column: 16
          },
          end: {
            line: 17,
            column: 25
          }
        },
        loc: {
          start: {
            line: 17,
            column: 39
          },
          end: {
            line: 19,
            column: 1
          }
        },
        line: 17
      },
      '3': {
        name: 'store',
        decl: {
          start: {
            line: 21,
            column: 16
          },
          end: {
            line: 21,
            column: 21
          }
        },
        loc: {
          start: {
            line: 21,
            column: 39
          },
          end: {
            line: 28,
            column: 1
          }
        },
        line: 21
      },
      '4': {
        name: 'selector',
        decl: {
          start: {
            line: 30,
            column: 16
          },
          end: {
            line: 30,
            column: 24
          }
        },
        loc: {
          start: {
            line: 30,
            column: 29
          },
          end: {
            line: 32,
            column: 1
          }
        },
        line: 30
      },
      '5': {
        name: 'getId',
        decl: {
          start: {
            line: 34,
            column: 16
          },
          end: {
            line: 34,
            column: 21
          }
        },
        loc: {
          start: {
            line: 34,
            column: 26
          },
          end: {
            line: 36,
            column: 1
          }
        },
        line: 34
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 9,
            column: 4
          },
          end: {
            line: 11,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 9,
            column: 4
          },
          end: {
            line: 11,
            column: 5
          }
        }, {
          start: {
            line: 9,
            column: 4
          },
          end: {
            line: 11,
            column: 5
          }
        }],
        line: 9
      },
      '1': {
        loc: {
          start: {
            line: 9,
            column: 8
          },
          end: {
            line: 9,
            column: 51
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 9,
            column: 8
          },
          end: {
            line: 9,
            column: 15
          }
        }, {
          start: {
            line: 9,
            column: 19
          },
          end: {
            line: 9,
            column: 27
          }
        }, {
          start: {
            line: 9,
            column: 31
          },
          end: {
            line: 9,
            column: 39
          }
        }, {
          start: {
            line: 9,
            column: 43
          },
          end: {
            line: 9,
            column: 51
          }
        }],
        line: 9
      },
      '2': {
        loc: {
          start: {
            line: 12,
            column: 13
          },
          end: {
            line: 12,
            column: 66
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 12,
            column: 24
          },
          end: {
            line: 12,
            column: 25
          }
        }, {
          start: {
            line: 12,
            column: 29
          },
          end: {
            line: 12,
            column: 65
          }
        }],
        line: 12
      },
      '3': {
        loc: {
          start: {
            line: 12,
            column: 29
          },
          end: {
            line: 12,
            column: 65
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 12,
            column: 41
          },
          end: {
            line: 12,
            column: 55
          }
        }, {
          start: {
            line: 12,
            column: 59
          },
          end: {
            line: 12,
            column: 65
          }
        }],
        line: 12
      },
      '4': {
        loc: {
          start: {
            line: 18,
            column: 9
          },
          end: {
            line: 18,
            column: 40
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 18,
            column: 23
          },
          end: {
            line: 18,
            column: 27
          }
        }, {
          start: {
            line: 18,
            column: 30
          },
          end: {
            line: 18,
            column: 40
          }
        }],
        line: 18
      },
      '5': {
        loc: {
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        }, {
          start: {
            line: 22,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        }],
        line: 22
      },
      '6': {
        loc: {
          start: {
            line: 27,
            column: 9
          },
          end: {
            line: 27,
            column: 43
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 27,
            column: 10
          },
          end: {
            line: 27,
            column: 15
          }
        }, {
          start: {
            line: 27,
            column: 19
          },
          end: {
            line: 27,
            column: 36
          }
        }, {
          start: {
            line: 27,
            column: 41
          },
          end: {
            line: 27,
            column: 43
          }
        }],
        line: 27
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0, 0, 0],
      '2': [0, 0],
      '3': [0, 0],
      '4': [0, 0],
      '5': [0, 0],
      '6': [0, 0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

exports.camelCase = camelCase;
exports.uuid = uuid;
exports.pluralize = pluralize;
exports.store = store;
exports.selector = selector;
exports.getId = getId;
function camelCase(s) {
  cov_11xe43hgzf.f[0]++;
  cov_11xe43hgzf.s[0]++;

  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uuid() {
  cov_11xe43hgzf.f[1]++;

  var uuid = (cov_11xe43hgzf.s[1]++, '');
  cov_11xe43hgzf.s[2]++;
  for (var i = 0; i < 32; i++) {
    var random = (cov_11xe43hgzf.s[3]++, Math.random() * 16 | 0);
    cov_11xe43hgzf.s[4]++;
    if ((cov_11xe43hgzf.b[1][0]++, i === 8) || (cov_11xe43hgzf.b[1][1]++, i === 12) || (cov_11xe43hgzf.b[1][2]++, i === 16) || (cov_11xe43hgzf.b[1][3]++, i === 20)) {
      cov_11xe43hgzf.b[0][0]++;
      cov_11xe43hgzf.s[5]++;

      uuid += '-';
    } else {
      cov_11xe43hgzf.b[0][1]++;
    }
    cov_11xe43hgzf.s[6]++;
    uuid += (i === 12 ? (cov_11xe43hgzf.b[2][0]++, 4) : (cov_11xe43hgzf.b[2][1]++, i === 16 ? (cov_11xe43hgzf.b[3][0]++, random & 3 | 8) : (cov_11xe43hgzf.b[3][1]++, random))).toString(16);
  }
  cov_11xe43hgzf.s[7]++;
  return uuid;
}

function pluralize(count, word) {
  cov_11xe43hgzf.f[2]++;
  cov_11xe43hgzf.s[8]++;

  return count === 1 ? (cov_11xe43hgzf.b[4][0]++, word) : (cov_11xe43hgzf.b[4][1]++, word + 's');
}

function store(namespace, data) {
  cov_11xe43hgzf.f[3]++;
  cov_11xe43hgzf.s[9]++;

  if (data) {
    cov_11xe43hgzf.b[5][0]++;
    cov_11xe43hgzf.s[10]++;

    return localStorage.setItem(namespace, JSON.stringify(data));
  } else {
    cov_11xe43hgzf.b[5][1]++;
  }

  var store = (cov_11xe43hgzf.s[11]++, localStorage.getItem(namespace));
  cov_11xe43hgzf.s[12]++;
  return (cov_11xe43hgzf.b[6][0]++, store) && (cov_11xe43hgzf.b[6][1]++, JSON.parse(store)) || (cov_11xe43hgzf.b[6][2]++, []);
}

function selector(id) {
  cov_11xe43hgzf.f[4]++;
  cov_11xe43hgzf.s[13]++;

  return document.querySelector('[data-id="' + id + '"]');
}

function getId(id) {
  cov_11xe43hgzf.f[5]++;
  cov_11xe43hgzf.s[14]++;

  return document.getElementById(id);
}

/***/ }),
/* 3 */
/***/ (function(module, exports) {

exports.getId = function (id) {
  return document.getElementById(id)
}

exports.genId = function () {
  return (Math.round(Math.random() * 0x1 * 1e12)).toString(32)
}

exports.selector = function (id) {
  return document.querySelector('[keet-id="' + id + '"]')
}


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var copy = __webpack_require__(8)
var tag = __webpack_require__(16)
var tmplHandler = __webpack_require__(9)
var tmplStylesHandler = __webpack_require__(17)
var tmplClassHandler = __webpack_require__(18)
var tmplAttrHandler = __webpack_require__(19)
var processEvent = __webpack_require__(5)
var updateElem = __webpack_require__(6).updateElem
var selector = __webpack_require__(3).selector
var getId = __webpack_require__(3).getId
var genTemplate = __webpack_require__(10)

var updateContext = function () {
  var self = this
  var key = [].shift.call(arguments)
  var obj = [].shift.call(arguments)

  Object.keys(this.base).map(function (handlerKey) {
    var tmplBase = self.base[handlerKey].template
    if (tmplBase) {
      var hasTmpl = tmplBase.match('{{' + key + '}}')
      if (hasTmpl && hasTmpl.length) {
        Object.assign(self, obj)
      }
    }

    var styleBase = self.base[handlerKey].style
    if (styleBase) {
      Object.keys(styleBase).map(function (style) {
        var hasStyleAttr = styleBase[style].match('{{' + key + '}}')
        if (hasStyleAttr) Object.assign(self, obj)
      })
    }

    var id = self.base[handlerKey]['keet-id']
    var ele = selector(id)
    var newElem

    if (self.hasOwnProperty(key)) self[key] = obj[key]

    var args = [].slice.call(arguments)

    newElem = genElement.apply(self, [self.base[handlerKey]].concat(args))

    updateElem(ele, newElem)
  })
}

var arrProtoUpdate = function (index, value) {
  var ele = getId(this.el)
  var child = ele.childNodes[index]
  if (child) {
    var replace = genTemplate.call(this, value)
    child.replaceWith(replace)
  } else {
    ele.appendChild(genTemplate.call(this, value))
  }
}

var proxy = function () {
  var self = this
  var watchObject = function (obj) {
    return new Proxy(obj, {
      set: function (target, key, value) {
        var obj = {}
        obj[key] = value
        var args = [].slice.call(arguments)
        args.unshift(obj)
        args.unshift(key)
        updateContext.apply(self, args)
        target[key] = value
        // ignore TypeError in strict mode
        return true
      }
    })
  }
  return watchObject(self)
}

var proxyList = function (list) {
  var self = this
  var watchObject = function (obj) {
    return new Proxy(obj, {
      set: function (target, key, value) {
        var num = parseInt(key)
        var intNum = Number.isInteger(num)
        if (intNum) {
          arrProtoUpdate.apply(self, [num, value])
        }
        target[key] = value
        // ignore TypeError in strict mode
        return true
      },
      deleteProperty: function (target, key) {
        // console.log(target[key])
        var ele = getId(self.el)
        var num = parseInt(key)
        var child = ele.childNodes[num]
        child.remove()
        // ignore TypeError in strict mode
        return true // target[key]
      }
    })
  }
  return watchObject(list)
}

var genElement = function () {
  var child = [].shift.call(arguments)
  var args = [].slice.call(arguments)
  var tempDiv = document.createElement('div')
  var cloneChild = copy(child)
  delete cloneChild.template
  delete cloneChild.tag
  delete cloneChild.style
  delete cloneChild.class
  // process template if has handlebars value
  var tpl = child.template ? tmplHandler.call(this, child.template) : null
  // process styles if has handlebars value
  var styleTpl = tmplStylesHandler.call(this, child.style)
  // process classes if has handlebars value
  var classTpl = tmplClassHandler.call(this, child)
  if (classTpl) cloneChild.class = classTpl
  // custom attributes handler
  if (args && args.length) {
    tmplAttrHandler.apply(this, [ cloneChild ].concat(args))
  }

  var s = child.tag
    ? tag(child.tag,            // html tag
      tpl || '',                // nodeValue
      cloneChild,               // attributes including classes
      styleTpl                  // styles
    ) : child.template          // fallback if non exist, render the template as string

  tempDiv.innerHTML = s
  if (child.tag === 'input') {
    if (cloneChild.checked) {
      tempDiv.childNodes[0].checked = true
    } else {
      tempDiv.childNodes[0].removeAttribute('checked')
    }
  }

  var proxyRes = proxy.apply(this, args)

  this.__proxy__ = proxyRes

  processEvent.apply(this, [ tempDiv, proxyRes ])
  return tempDiv.childNodes[0]
}

exports.proxy = proxy
exports.proxyList = proxyList
exports.genElement = genElement
exports.arrProtoUpdate = arrProtoUpdate


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var loopChilds = __webpack_require__(6).loopChilds

var next = function (i, c, rem, proxy) {
  var hask
  var evtName
  var evthandler
  var handler
  var isHandler
  var argv
  var v
  var atts = c.attributes

  if (i < atts.length) {
    hask = /^k-/.test(atts[i].nodeName)
    if (hask) {
      evtName = atts[i].nodeName.split('-')[1]
      evthandler = atts[i].nodeValue
      handler = evthandler.split('(')
      isHandler = this[handler[0]]
      if (typeof isHandler === 'function') {
        rem.push(atts[i].nodeName)
        argv = []
        v = handler[1].slice(0, -1).split(',').filter(function (f) { return f !== '' })
        if (v.length) v.map(function (v) { argv.push(v) })
        c.addEventListener(evtName, isHandler.bind.apply(isHandler.bind(proxy), [c].concat(argv)), false)
      }
    }
    i++
    next.apply(this, [ i, c, rem, proxy ])
  } else {
    rem.map(function (f) { c.removeAttribute(f) })
  }
}

module.exports = function (kNode, proxy) {
  var self = this
  var listKnodeChild = []
  var rem = []
  loopChilds(listKnodeChild, kNode)
  listKnodeChild.map(function (c) {
    if (c.nodeType === 1 && c.hasAttributes()) {
      next.apply(self, [ 0, c, rem, proxy ])
    }
  })
  listKnodeChild = []
}


/***/ }),
/* 6 */
/***/ (function(module, exports) {


var loopChilds = function (arr, elem) {
  if (!elem) return false
  for (var child = elem.firstChild; child !== null; child = child.nextSibling) {
    arr.push(child)
    if (child.hasChildNodes()) {
      loopChilds(arr, child)
    }
  }
}

exports.loopChilds = loopChilds

var nodeUpdate = function (newNode, oldNode) {
  if (!newNode) return
  var oAttr = newNode.attributes
  var output = {}

  for (var i = oAttr.length - 1; i >= 0; i--) {
    output[oAttr[i].name] = oAttr[i].value
  }
  for (var iAttr in output) {
    if (oldNode.attributes[iAttr] && oldNode.attributes[iAttr].name === iAttr && oldNode.attributes[iAttr].value !== output[iAttr]) {
      oldNode.setAttribute(iAttr, output[iAttr])
    }
  }
  if (oldNode.textContent === '' && newNode.textContent) {
    oldNode.textContent = newNode.textContent
  }
  if (oldNode.type === 'checkbox' && !oldNode.checked && newNode.checked) {
    oldNode.checked = true
  }
  if (oldNode.type === 'checkbox' && oldNode.checked && !newNode.checked) {
    oldNode.checked = false
  }
  output = {}
}

var nodeUpdateHTML = function (newNode, oldNode) {
  if (!newNode) return
  if (newNode.nodeValue !== oldNode.nodeValue) { oldNode.nodeValue = newNode.nodeValue }
}

exports.updateElem = function (oldElem, newElem) {
  var oldArr = []
  var newArr = []
  oldArr.push(oldElem)
  newArr.push(newElem)
  loopChilds(oldArr, oldElem)
  loopChilds(newArr, newElem)
  oldArr.map(function (ele, idx, arr) {
    if (ele && ele.nodeType === 1 && ele.hasAttributes()) {
      nodeUpdate(newArr[idx], ele)
    } else if (ele && ele.nodeType === 3) {
      nodeUpdateHTML(newArr[idx], ele)
    }
    if (idx === arr.length - 1) {
      oldArr.splice(0)
      newArr.splice(0)
    }
  })
}


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.todoList = exports.default = undefined;

var cov_gptjwulcm = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\todoList.js',
      hash = '142e33fed3aafc908298cf1adecb57ac906a676a',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\todoList.js',
    statementMap: {
      '0': {
        start: {
          line: 8,
          column: 10
        },
        end: {
          line: 8,
          column: 35
        }
      },
      '1': {
        start: {
          line: 10,
          column: 16
        },
        end: {
          line: 10,
          column: 18
        }
      },
      '2': {
        start: {
          line: 13,
          column: 2
        },
        end: {
          line: 15,
          column: 3
        }
      },
      '3': {
        start: {
          line: 14,
          column: 4
        },
        end: {
          line: 14,
          column: 36
        }
      },
      '4': {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 11
        }
      },
      '5': {
        start: {
          line: 21,
          column: 4
        },
        end: {
          line: 21,
          column: 20
        }
      },
      '6': {
        start: {
          line: 27,
          column: 13
        },
        end: {
          line: 27,
          column: 69
        }
      },
      '7': {
        start: {
          line: 28,
          column: 4
        },
        end: {
          line: 33,
          column: 6
        }
      },
      '8': {
        start: {
          line: 29,
          column: 6
        },
        end: {
          line: 32,
          column: 19
        }
      },
      '9': {
        start: {
          line: 30,
          column: 8
        },
        end: {
          line: 30,
          column: 49
        }
      },
      '10': {
        start: {
          line: 32,
          column: 8
        },
        end: {
          line: 32,
          column: 19
        }
      },
      '11': {
        start: {
          line: 34,
          column: 4
        },
        end: {
          line: 34,
          column: 12
        }
      },
      '12': {
        start: {
          line: 38,
          column: 13
        },
        end: {
          line: 38,
          column: 69
        }
      },
      '13': {
        start: {
          line: 40,
          column: 4
        },
        end: {
          line: 48,
          column: 6
        }
      },
      '14': {
        start: {
          line: 41,
          column: 6
        },
        end: {
          line: 46,
          column: 7
        }
      },
      '15': {
        start: {
          line: 42,
          column: 8
        },
        end: {
          line: 42,
          column: 65
        }
      },
      '16': {
        start: {
          line: 43,
          column: 8
        },
        end: {
          line: 43,
          column: 59
        }
      },
      '17': {
        start: {
          line: 45,
          column: 8
        },
        end: {
          line: 45,
          column: 86
        }
      },
      '18': {
        start: {
          line: 47,
          column: 6
        },
        end: {
          line: 47,
          column: 17
        }
      },
      '19': {
        start: {
          line: 53,
          column: 4
        },
        end: {
          line: 53,
          column: 12
        }
      },
      '20': {
        start: {
          line: 56,
          column: 14
        },
        end: {
          line: 62,
          column: 5
        }
      },
      '21': {
        start: {
          line: 63,
          column: 4
        },
        end: {
          line: 63,
          column: 55
        }
      },
      '22': {
        start: {
          line: 64,
          column: 4
        },
        end: {
          line: 64,
          column: 67
        }
      },
      '23': {
        start: {
          line: 65,
          column: 4
        },
        end: {
          line: 65,
          column: 12
        }
      },
      '24': {
        start: {
          line: 68,
          column: 4
        },
        end: {
          line: 68,
          column: 22
        }
      },
      '25': {
        start: {
          line: 71,
          column: 17
        },
        end: {
          line: 71,
          column: 40
        }
      },
      '26': {
        start: {
          line: 73,
          column: 15
        },
        end: {
          line: 83,
          column: 1
        }
      },
      '27': {
        start: {
          line: 85,
          column: 21
        },
        end: {
          line: 85,
          column: 67
        }
      },
      '28': {
        start: {
          line: 85,
          column: 27
        },
        end: {
          line: 85,
          column: 67
        }
      }
    },
    fnMap: {
      '0': {
        name: 'inform',
        decl: {
          start: {
            line: 12,
            column: 9
          },
          end: {
            line: 12,
            column: 15
          }
        },
        loc: {
          start: {
            line: 12,
            column: 18
          },
          end: {
            line: 16,
            column: 1
          }
        },
        line: 12
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 19,
            column: 3
          }
        },
        loc: {
          start: {
            line: 19,
            column: 24
          },
          end: {
            line: 22,
            column: 3
          }
        },
        line: 19
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 23,
            column: 2
          },
          end: {
            line: 23,
            column: 3
          }
        },
        loc: {
          start: {
            line: 23,
            column: 16
          },
          end: {
            line: 25,
            column: 3
          }
        },
        line: 23
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 26,
            column: 2
          },
          end: {
            line: 26,
            column: 3
          }
        },
        loc: {
          start: {
            line: 26,
            column: 16
          },
          end: {
            line: 35,
            column: 3
          }
        },
        line: 26
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 28,
            column: 51
          },
          end: {
            line: 28,
            column: 52
          }
        },
        loc: {
          start: {
            line: 28,
            column: 72
          },
          end: {
            line: 33,
            column: 5
          }
        },
        line: 28
      },
      '5': {
        name: '(anonymous_5)',
        decl: {
          start: {
            line: 36,
            column: 2
          },
          end: {
            line: 36,
            column: 3
          }
        },
        loc: {
          start: {
            line: 36,
            column: 21
          },
          end: {
            line: 54,
            column: 3
          }
        },
        line: 36
      },
      '6': {
        name: '(anonymous_6)',
        decl: {
          start: {
            line: 40,
            column: 48
          },
          end: {
            line: 40,
            column: 49
          }
        },
        loc: {
          start: {
            line: 40,
            column: 70
          },
          end: {
            line: 48,
            column: 5
          }
        },
        line: 40
      },
      '7': {
        name: '(anonymous_7)',
        decl: {
          start: {
            line: 55,
            column: 2
          },
          end: {
            line: 55,
            column: 3
          }
        },
        loc: {
          start: {
            line: 55,
            column: 16
          },
          end: {
            line: 66,
            column: 3
          }
        },
        line: 55
      },
      '8': {
        name: '(anonymous_8)',
        decl: {
          start: {
            line: 67,
            column: 2
          },
          end: {
            line: 67,
            column: 3
          }
        },
        loc: {
          start: {
            line: 67,
            column: 16
          },
          end: {
            line: 69,
            column: 3
          }
        },
        line: 67
      },
      '9': {
        name: '(anonymous_9)',
        decl: {
          start: {
            line: 85,
            column: 21
          },
          end: {
            line: 85,
            column: 22
          }
        },
        loc: {
          start: {
            line: 85,
            column: 27
          },
          end: {
            line: 85,
            column: 67
          }
        },
        line: 85
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 29,
            column: 6
          },
          end: {
            line: 32,
            column: 19
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 29,
            column: 6
          },
          end: {
            line: 32,
            column: 19
          }
        }, {
          start: {
            line: 29,
            column: 6
          },
          end: {
            line: 32,
            column: 19
          }
        }],
        line: 29
      },
      '1': {
        loc: {
          start: {
            line: 41,
            column: 6
          },
          end: {
            line: 46,
            column: 7
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 41,
            column: 6
          },
          end: {
            line: 46,
            column: 7
          }
        }, {
          start: {
            line: 41,
            column: 6
          },
          end: {
            line: 46,
            column: 7
          }
        }],
        line: 41
      },
      '2': {
        loc: {
          start: {
            line: 42,
            column: 25
          },
          end: {
            line: 42,
            column: 65
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 42,
            column: 49
          },
          end: {
            line: 42,
            column: 60
          }
        }, {
          start: {
            line: 42,
            column: 63
          },
          end: {
            line: 42,
            column: 65
          }
        }],
        line: 42
      },
      '3': {
        loc: {
          start: {
            line: 43,
            column: 23
          },
          end: {
            line: 43,
            column: 59
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 43,
            column: 47
          },
          end: {
            line: 43,
            column: 52
          }
        }, {
          start: {
            line: 43,
            column: 55
          },
          end: {
            line: 43,
            column: 59
          }
        }],
        line: 43
      },
      '4': {
        loc: {
          start: {
            line: 60,
            column: 15
          },
          end: {
            line: 60,
            column: 103
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 60,
            column: 87
          },
          end: {
            line: 60,
            column: 94
          }
        }, {
          start: {
            line: 60,
            column: 97
          },
          end: {
            line: 60,
            column: 103
          }
        }],
        line: 60
      },
      '5': {
        loc: {
          start: {
            line: 60,
            column: 15
          },
          end: {
            line: 60,
            column: 84
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 60,
            column: 15
          },
          end: {
            line: 60,
            column: 46
          }
        }, {
          start: {
            line: 60,
            column: 50
          },
          end: {
            line: 60,
            column: 84
          }
        }],
        line: 60
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0,
      '14': 0,
      '15': 0,
      '16': 0,
      '17': 0,
      '18': 0,
      '19': 0,
      '20': 0,
      '21': 0,
      '22': 0,
      '23': 0,
      '24': 0,
      '25': 0,
      '26': 0,
      '27': 0,
      '28': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0],
      '3': [0, 0],
      '4': [0, 0],
      '5': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _genTemplate = __webpack_require__(10);

var _genTemplate2 = _interopRequireDefault(_genTemplate);

var _elementUtils = __webpack_require__(6);

var _app = __webpack_require__(1);

var _app2 = _interopRequireDefault(_app);

var _utils = __webpack_require__(2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var log = (cov_gptjwulcm.s[0]++, console.log.bind(console));

var onChanges = (cov_gptjwulcm.s[1]++, []);

function inform() {
  cov_gptjwulcm.f[0]++;
  cov_gptjwulcm.s[2]++;

  for (var i = onChanges.length; i--;) {
    cov_gptjwulcm.s[3]++;

    onChanges[i](todoList.base.list);
  }
}

var TodoList = function (_ref) {
  _inherits(TodoList, _ref);

  function TodoList() {
    _classCallCheck(this, TodoList);

    cov_gptjwulcm.f[1]++;
    cov_gptjwulcm.s[4]++;

    var _this = _possibleConstructorReturn(this, (TodoList.__proto__ || Object.getPrototypeOf(TodoList)).call(this));

    cov_gptjwulcm.s[5]++;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this.args = args;
    return _this;
  }

  _createClass(TodoList, [{
    key: 'editMode',
    value: function editMode(id) {
      // app.editTodos(id, this)

      cov_gptjwulcm.f[2]++;
    }
  }, {
    key: 'destroy',
    value: function destroy(evt) {
      cov_gptjwulcm.f[3]++;

      var id = (cov_gptjwulcm.s[6]++, evt.target.parentNode.parentNode.getAttribute('data-id'));
      cov_gptjwulcm.s[7]++;
      todoList.base.list = todoList.base.list.filter(function (todo, index) {
        cov_gptjwulcm.f[4]++;
        cov_gptjwulcm.s[8]++;

        if (id == todo.id) {
            cov_gptjwulcm.b[0][0]++;
            cov_gptjwulcm.s[9]++;

            evt.target.parentNode.parentNode.remove();
          } else {
            cov_gptjwulcm.b[0][1]++;
            cov_gptjwulcm.s[10]++;

            return todo;
          }
      });
      cov_gptjwulcm.s[11]++;
      inform();
    }
  }, {
    key: 'completeTodo',
    value: function completeTodo(evt) {
      cov_gptjwulcm.f[5]++;


      var id = (cov_gptjwulcm.s[12]++, evt.target.parentNode.parentNode.getAttribute('data-id'));

      cov_gptjwulcm.s[13]++;
      todoList.base.list = todoList.base.list.map(function (todo, idx, todos) {
        cov_gptjwulcm.f[6]++;
        cov_gptjwulcm.s[14]++;

        if (todo.id === id) {
          cov_gptjwulcm.b[1][0]++;
          cov_gptjwulcm.s[15]++;

          todo.completed = todo.completed === '' ? (cov_gptjwulcm.b[2][0]++, 'completed') : (cov_gptjwulcm.b[2][1]++, '');
          cov_gptjwulcm.s[16]++;
          todo.checked = todo.completed === '' ? (cov_gptjwulcm.b[3][0]++, false) : (cov_gptjwulcm.b[3][1]++, true);
          // evt.target.parentNode.parentNode.replaceWith(genTemplate.call(todoList, todo))
          cov_gptjwulcm.s[17]++;
          (0, _elementUtils.updateElem)(evt.target.parentNode.parentNode, _genTemplate2.default.call(todoList, todo));
        } else {
          cov_gptjwulcm.b[1][1]++;
        }
        cov_gptjwulcm.s[18]++;
        return todo;
      });

      // todoList.base.list = todoList.base.list.map( todo => (
      //     todo !== todoToToggle ? todo : ({ ...todo, completed: !todo.completed })
      // ) )
      cov_gptjwulcm.s[19]++;
      inform();
    }
  }, {
    key: 'addTodo',
    value: function addTodo(value) {
      cov_gptjwulcm.f[7]++;

      var obj = (cov_gptjwulcm.s[20]++, {
        id: (0, _utils.uuid)(),
        title: value,
        completed: '',
        display: (cov_gptjwulcm.b[5][0]++, window.location.hash == '#/all') || (cov_gptjwulcm.b[5][1]++, window.location.hash == '#/active') ? (cov_gptjwulcm.b[4][0]++, 'block') : (cov_gptjwulcm.b[4][1]++, 'none'),
        checked: false
      });
      cov_gptjwulcm.s[21]++;
      todoList.base.list = todoList.base.list.concat(obj);
      cov_gptjwulcm.s[22]++;
      (0, _utils.getId)(todoList.el).appendChild(_genTemplate2.default.call(todoList, obj));
      cov_gptjwulcm.s[23]++;
      inform();
    }
  }, {
    key: 'subscribe',
    value: function subscribe(fn) {
      cov_gptjwulcm.f[8]++;
      cov_gptjwulcm.s[24]++;

      onChanges.push(fn);
    }
  }]);

  return TodoList;
}((_keet2.default));

var todoList = (cov_gptjwulcm.s[25]++, new TodoList('checked')); // assigned `checked` as custom attribute that we want to watch

var vmodel = (cov_gptjwulcm.s[26]++, {
  template: '\n    <li k-dblclick="editMode({{id}})" class="{{completed}}" data-id="{{id}}" style="display:{{display}}">\n      <div class="view"><input k-click="completeTodo()" class="toggle" type="checkbox" checked="{{checked}}">\n        <label>{{title}}</label>\n        <button k-click="destroy()" class="destroy"></button>\n      </div>\n      <input class="edit" value="{{title}}">\n    </li>',
  list: (0, _utils.store)('todos-keetjs')
});

cov_gptjwulcm.s[27]++;
var todoListInit = function todoListInit() {
  cov_gptjwulcm.f[9]++;
  cov_gptjwulcm.s[28]++;
  return todoList.mount(vmodel).link('todo-list');
};

exports.default = todoListInit;
exports.todoList = todoList;

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = function (argv) {
  var cop = function (v) {
    var o = {}
    if (typeof v !== 'object') {
      o.copy = v
      return o.copy
    } else {
      for (var attr in v) {
        o[attr] = v[attr]
      }
    }
    return o
  }
  return Array.isArray(argv) ? argv.map(function (v) { return v }) : cop(argv)
}


/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = function (str) {
  var self = this
  // clean up es6 backtick string including line spacing
  str = str.trim().replace(/\s+/g, ' ')
  var arrProps = str.match(/{{([^{}]+)}}/g)
  if (arrProps && arrProps.length) {
    arrProps.map(function (s) {
      var rep = s.replace(/{{([^{}]+)}}/g, '$1')
      if (self[rep] !== undefined) {
        str = str.replace(/{{([^{}]+)}}/, self[rep])
      }
    })
  }
  return str
}


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var processEvent = __webpack_require__(5)

module.exports = function (obj) {
  var args = this.args
  var arrProps = this.base.template.match(/{{([^{}]+)}}/g)
  var tmpl
  var tempDiv
  tmpl = this.base.template
  arrProps.map(function (s) {
    // console.log(s)
    var rep = s.replace(/{{([^{}]+)}}/g, '$1')
    tmpl = tmpl.replace(/{{([^{}]+)}}/, obj[rep])
    if (args && ~args.indexOf(rep) && !obj[rep]) {
      var re = new RegExp(' ' + rep + '="' + obj[rep] + '"', 'g')
      tmpl = tmpl.replace(re, '')
    }
  })
  tempDiv = document.createElement('div')
  tempDiv.innerHTML = tmpl
  var isevt = / k-/.test(tmpl)
  if (isevt) { processEvent.call(this, tempDiv) }
  return tempDiv.childNodes[0]
}


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.main = exports.default = undefined;

var cov_mv3h7iafv = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\main.js',
      hash = 'd49df84f730dbd4d928a70a1a4455d620162378e',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\main.js',
    statementMap: {
      '0': {
        start: {
          line: 8,
          column: 4
        },
        end: {
          line: 8,
          column: 11
        }
      },
      '1': {
        start: {
          line: 9,
          column: 4
        },
        end: {
          line: 9,
          column: 20
        }
      },
      '2': {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 25
        }
      },
      '3': {
        start: {
          line: 11,
          column: 4
        },
        end: {
          line: 11,
          column: 24
        }
      },
      '4': {
        start: {
          line: 14,
          column: 4
        },
        end: {
          line: 14,
          column: 45
        }
      },
      '5': {
        start: {
          line: 17,
          column: 4
        },
        end: {
          line: 17,
          column: 33
        }
      },
      '6': {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 23
        }
      },
      '7': {
        start: {
          line: 24,
          column: 13
        },
        end: {
          line: 24,
          column: 32
        }
      },
      '8': {
        start: {
          line: 26,
          column: 15
        },
        end: {
          line: 43,
          column: 1
        }
      },
      '9': {
        start: {
          line: 45,
          column: 17
        },
        end: {
          line: 45,
          column: 76
        }
      },
      '10': {
        start: {
          line: 45,
          column: 23
        },
        end: {
          line: 45,
          column: 76
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 7,
            column: 2
          },
          end: {
            line: 7,
            column: 3
          }
        },
        loc: {
          start: {
            line: 7,
            column: 24
          },
          end: {
            line: 12,
            column: 3
          }
        },
        line: 7
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 13,
            column: 2
          },
          end: {
            line: 13,
            column: 3
          }
        },
        loc: {
          start: {
            line: 13,
            column: 26
          },
          end: {
            line: 15,
            column: 3
          }
        },
        line: 13
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 16,
            column: 2
          },
          end: {
            line: 16,
            column: 3
          }
        },
        loc: {
          start: {
            line: 16,
            column: 22
          },
          end: {
            line: 18,
            column: 3
          }
        },
        line: 16
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 19,
            column: 3
          }
        },
        loc: {
          start: {
            line: 19,
            column: 20
          },
          end: {
            line: 21,
            column: 3
          }
        },
        line: 19
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 45,
            column: 17
          },
          end: {
            line: 45,
            column: 18
          }
        },
        loc: {
          start: {
            line: 45,
            column: 23
          },
          end: {
            line: 45,
            column: 76
          }
        },
        line: 45
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 14,
            column: 19
          },
          end: {
            line: 14,
            column: 45
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 14,
            column: 29
          },
          end: {
            line: 14,
            column: 36
          }
        }, {
          start: {
            line: 14,
            column: 39
          },
          end: {
            line: 14,
            column: 45
          }
        }],
        line: 14
      },
      '1': {
        loc: {
          start: {
            line: 17,
            column: 19
          },
          end: {
            line: 17,
            column: 33
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 17,
            column: 19
          },
          end: {
            line: 17,
            column: 24
          }
        }, {
          start: {
            line: 17,
            column: 28
          },
          end: {
            line: 17,
            column: 33
          }
        }],
        line: 17
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _app = __webpack_require__(1);

var _app2 = _interopRequireDefault(_app);

var _todoList = __webpack_require__(7);

var _todoList2 = _interopRequireDefault(_todoList);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Main = function (_ref) {
  _inherits(Main, _ref);

  function Main() {
    _classCallCheck(this, Main);

    cov_mv3h7iafv.f[0]++;
    cov_mv3h7iafv.s[0]++;

    var _this = _possibleConstructorReturn(this, (Main.__proto__ || Object.getPrototypeOf(Main)).call(this));

    cov_mv3h7iafv.s[1]++;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this.args = args;
    cov_mv3h7iafv.s[2]++;
    _this.display = 'none';
    cov_mv3h7iafv.s[3]++;
    _this.isCheck = false;
    return _this;
  }

  _createClass(Main, [{
    key: 'toggleDisplay',
    value: function toggleDisplay(display) {
      cov_mv3h7iafv.f[1]++;
      cov_mv3h7iafv.s[4]++;

      this.display = display ? (cov_mv3h7iafv.b[0][0]++, 'block') : (cov_mv3h7iafv.b[0][1]++, 'none');
    }
  }, {
    key: 'toggleCheck',
    value: function toggleCheck(check) {
      cov_mv3h7iafv.f[2]++;
      cov_mv3h7iafv.s[5]++;

      this.isCheck = (cov_mv3h7iafv.b[1][0]++, check) || (cov_mv3h7iafv.b[1][1]++, false);
    }
  }, {
    key: 'completeAll',
    value: function completeAll(evt) {
      cov_mv3h7iafv.f[3]++;
      cov_mv3h7iafv.s[6]++;

      _app2.default.checkedAll(evt);
    }
  }]);

  return Main;
}((_keet2.default));

var main = (cov_mv3h7iafv.s[7]++, new Main('checked'));

var vmodel = (cov_mv3h7iafv.s[8]++, {
  toggleAll: {
    tag: 'input',
    id: 'toggle-all',
    type: 'checkbox',
    checked: '{{isCheck}}',
    style: {
      display: '{{display}}'
    },
    'k-click': 'completeAll()'

  },
  toggleLabel: '<label for="toggle-all">Mark all as complete</label>',
  todoList: {
    tag: 'ul',
    id: 'todo-list'
  }
});

cov_mv3h7iafv.s[9]++;
var mainInit = function mainInit() {
  cov_mv3h7iafv.f[4]++;
  cov_mv3h7iafv.s[10]++;
  return main.mount(vmodel).link('main').cluster(_todoList2.default);
};

exports.default = mainInit;
exports.main = main;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.footer = exports.default = undefined;

var cov_1gnb88aemp = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\footer.js',
      hash = 'bd5866c00a263606882b8927f36dc7720f3ff799',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\footer.js',
    statementMap: {
      '0': {
        start: {
          line: 7,
          column: 4
        },
        end: {
          line: 7,
          column: 11
        }
      },
      '1': {
        start: {
          line: 8,
          column: 4
        },
        end: {
          line: 8,
          column: 20
        }
      },
      '2': {
        start: {
          line: 9,
          column: 4
        },
        end: {
          line: 9,
          column: 16
        }
      },
      '3': {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 39
        }
      },
      '4': {
        start: {
          line: 13,
          column: 4
        },
        end: {
          line: 13,
          column: 50
        }
      },
      '5': {
        start: {
          line: 16,
          column: 4
        },
        end: {
          line: 16,
          column: 33
        }
      },
      '6': {
        start: {
          line: 17,
          column: 4
        },
        end: {
          line: 17,
          column: 35
        }
      },
      '7': {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 32
        }
      },
      '8': {
        start: {
          line: 24,
          column: 15
        },
        end: {
          line: 24,
          column: 27
        }
      },
      '9': {
        start: {
          line: 26,
          column: 15
        },
        end: {
          line: 45,
          column: 1
        }
      },
      '10': {
        start: {
          line: 47,
          column: 19
        },
        end: {
          line: 47,
          column: 81
        }
      },
      '11': {
        start: {
          line: 47,
          column: 25
        },
        end: {
          line: 47,
          column: 81
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 6,
            column: 2
          },
          end: {
            line: 6,
            column: 3
          }
        },
        loc: {
          start: {
            line: 6,
            column: 17
          },
          end: {
            line: 11,
            column: 3
          }
        },
        line: 6
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 12,
            column: 2
          },
          end: {
            line: 12,
            column: 3
          }
        },
        loc: {
          start: {
            line: 12,
            column: 32
          },
          end: {
            line: 14,
            column: 3
          }
        },
        line: 12
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 15,
            column: 2
          },
          end: {
            line: 15,
            column: 3
          }
        },
        loc: {
          start: {
            line: 15,
            column: 22
          },
          end: {
            line: 18,
            column: 3
          }
        },
        line: 15
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 19,
            column: 3
          }
        },
        loc: {
          start: {
            line: 19,
            column: 30
          },
          end: {
            line: 21,
            column: 3
          }
        },
        line: 19
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 47,
            column: 19
          },
          end: {
            line: 47,
            column: 20
          }
        },
        loc: {
          start: {
            line: 47,
            column: 25
          },
          end: {
            line: 47,
            column: 81
          }
        },
        line: 47
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 13,
            column: 33
          },
          end: {
            line: 13,
            column: 50
          }
        },
        type: 'binary-expr',
        locations: [{
          start: {
            line: 13,
            column: 33
          },
          end: {
            line: 13,
            column: 40
          }
        }, {
          start: {
            line: 13,
            column: 44
          },
          end: {
            line: 13,
            column: 50
          }
        }],
        line: 13
      },
      '1': {
        loc: {
          start: {
            line: 17,
            column: 13
          },
          end: {
            line: 17,
            column: 35
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 17,
            column: 27
          },
          end: {
            line: 17,
            column: 29
          }
        }, {
          start: {
            line: 17,
            column: 32
          },
          end: {
            line: 17,
            column: 35
          }
        }],
        line: 17
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _app = __webpack_require__(1);

var _app2 = _interopRequireDefault(_app);

var _filters = __webpack_require__(13);

var _filters2 = _interopRequireDefault(_filters);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Footer = function (_ref) {
  _inherits(Footer, _ref);

  function Footer() {
    _classCallCheck(this, Footer);

    cov_1gnb88aemp.f[0]++;
    cov_1gnb88aemp.s[0]++;

    var _this = _possibleConstructorReturn(this, (Footer.__proto__ || Object.getPrototypeOf(Footer)).call(this));

    cov_1gnb88aemp.s[1]++;

    _this.count = ' ';
    cov_1gnb88aemp.s[2]++;
    _this.s = ' ';
    cov_1gnb88aemp.s[3]++;
    _this.clearCompletedDisplay = 'none';
    return _this;
  }

  _createClass(Footer, [{
    key: 'toggleClearComplete',
    value: function toggleClearComplete(display) {
      cov_1gnb88aemp.f[1]++;
      cov_1gnb88aemp.s[4]++;

      this.clearCompletedDisplay = (cov_1gnb88aemp.b[0][0]++, display) || (cov_1gnb88aemp.b[0][1]++, 'none');
    }
  }, {
    key: 'updateCount',
    value: function updateCount(count) {
      cov_1gnb88aemp.f[2]++;
      cov_1gnb88aemp.s[5]++;

      this.count = count.toString();
      cov_1gnb88aemp.s[6]++;
      this.s = count === 1 ? (cov_1gnb88aemp.b[1][0]++, '') : (cov_1gnb88aemp.b[1][1]++, 's');
    }
  }, {
    key: 'clearCompletedClicked',
    value: function clearCompletedClicked(evt) {
      cov_1gnb88aemp.f[3]++;
      cov_1gnb88aemp.s[7]++;

      _app2.default.clearCompleted.bind(_app2.default);
    }
  }]);

  return Footer;
}((_keet2.default));

var footer = (cov_1gnb88aemp.s[8]++, new Footer());

var vmodel = (cov_1gnb88aemp.s[9]++, {
  todoCount: {
    tag: 'span',
    id: 'todo-count',
    template: '<strong>{{count}}</strong> item{{s}} left'
  },
  filters: {
    tag: 'ul',
    id: 'filters'
  },
  clearCompleted: {
    tag: 'button',
    id: 'clear-completed',
    style: {
      display: '{{clearCompletedDisplay}}'
    },
    'k-click': 'clearCompletedClicked()',
    template: 'Clear completed'
  }
});

cov_1gnb88aemp.s[10]++;
var footerInit = function footerInit() {
  cov_1gnb88aemp.f[4]++;
  cov_1gnb88aemp.s[11]++;
  return footer.mount(vmodel).link('footer').cluster(_filters2.default);
};

exports.default = footerInit;
exports.footer = footer;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filters = exports.default = undefined;

var cov_1g1w2dlmxm = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\filters.js',
      hash = '58c390f4e1edd717b431e8e94cd59bdf0365f374',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\filters.js',
    statementMap: {
      '0': {
        start: {
          line: 5,
          column: 17
        },
        end: {
          line: 5,
          column: 47
        }
      },
      '1': {
        start: {
          line: 9,
          column: 4
        },
        end: {
          line: 9,
          column: 25
        }
      },
      '2': {
        start: {
          line: 13,
          column: 16
        },
        end: {
          line: 13,
          column: 29
        }
      },
      '3': {
        start: {
          line: 15,
          column: 15
        },
        end: {
          line: 27,
          column: 1
        }
      },
      '4': {
        start: {
          line: 21,
          column: 4
        },
        end: {
          line: 25,
          column: 5
        }
      },
      '5': {
        start: {
          line: 29,
          column: 20
        },
        end: {
          line: 29,
          column: 63
        }
      },
      '6': {
        start: {
          line: 29,
          column: 26
        },
        end: {
          line: 29,
          column: 63
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 8,
            column: 2
          },
          end: {
            line: 8,
            column: 3
          }
        },
        loc: {
          start: {
            line: 8,
            column: 18
          },
          end: {
            line: 10,
            column: 3
          }
        },
        line: 8
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 20,
            column: 23
          },
          end: {
            line: 20,
            column: 24
          }
        },
        loc: {
          start: {
            line: 20,
            column: 28
          },
          end: {
            line: 26,
            column: 3
          }
        },
        line: 20
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 29,
            column: 20
          },
          end: {
            line: 29,
            column: 21
          }
        },
        loc: {
          start: {
            line: 29,
            column: 26
          },
          end: {
            line: 29,
            column: 63
          }
        },
        line: 29
      }
    },
    branchMap: {},
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0
    },
    b: {},
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _app = __webpack_require__(1);

var _app2 = _interopRequireDefault(_app);

var _utils = __webpack_require__(2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var filterPage = (cov_1g1w2dlmxm.s[0]++, ['all', 'active', 'completed']);

var Filters = function (_ref) {
  _inherits(Filters, _ref);

  function Filters() {
    _classCallCheck(this, Filters);

    return _possibleConstructorReturn(this, (Filters.__proto__ || Object.getPrototypeOf(Filters)).apply(this, arguments));
  }

  _createClass(Filters, [{
    key: 'updateUrl',
    value: function updateUrl(uri) {
      cov_1g1w2dlmxm.f[0]++;
      cov_1g1w2dlmxm.s[1]++;

      _app2.default.updateFilter(uri);
    }
  }]);

  return Filters;
}((_keet2.default));

var filters = (cov_1g1w2dlmxm.s[2]++, new Filters());

var vmodel = (cov_1g1w2dlmxm.s[3]++, {
  template: '\n    <li k-click="updateUrl({{hash}})">\n      <a class="{{className}}" href="{{hash}}">{{nodeValue}}</a>\n    </li>'.trim(),
  list: filterPage.map(function (f) {
    cov_1g1w2dlmxm.f[1]++;
    cov_1g1w2dlmxm.s[4]++;

    return {
      className: '',
      hash: '#/' + f,
      nodeValue: (0, _utils.camelCase)(f)
    };
  })
});

cov_1g1w2dlmxm.s[5]++;
var filtersInit = function filtersInit() {
  cov_1g1w2dlmxm.f[2]++;
  cov_1g1w2dlmxm.s[6]++;
  return filters.mount(vmodel).link('filters');
};

exports.default = filtersInit;
exports.filters = filters;

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(1);


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

var genElement = __webpack_require__(4).genElement
var proxy = __webpack_require__(4).proxy
var tmplHandler = __webpack_require__(9)
var tmplArrayHandler = __webpack_require__(20)
var processEvent = __webpack_require__(5)
var genId = __webpack_require__(3).genId

module.exports = function () {
  if (typeof this.base !== 'object') throw new Error('instance is not an object')
  var self = this
  var elemArr = []
  var args = [].slice.call(arguments)
  if (Array.isArray(this.base.list)) {
    // do array base
    var tpl = tmplArrayHandler.apply(this, args)
    tpl.tmpl.map(function (ptmpl) {
      var tempDiv = document.createElement('div')
      tempDiv.innerHTML = ptmpl
      processEvent.apply(self, [ tempDiv, tpl.proxyRes ])
      elemArr.push(tempDiv.childNodes[0])
    })

    this.list = tpl.proxyRes
  } else {
    // do object base
    Object.keys(this.base).map(function (key) {
      var child = self.base[key]
      if (child && typeof child === 'object') {
        var id = genId()
        child['keet-id'] = id
        self.base[key]['keet-id'] = id
        var newElement = genElement.apply(self, [child].concat(args))
        elemArr.push(newElement)
      } else {
        var tpl = tmplHandler.call(self, child)
        var tempDiv = document.createElement('div')
        tempDiv.innerHTML = tpl
        var proxyRes = proxy.call(self)
        self.__proxy__ = proxyRes
        processEvent.apply(self, [ tempDiv, proxyRes ])
        elemArr.push(tempDiv.childNodes[0])
      }
    })
  }

  return elemArr
}


/***/ }),
/* 16 */
/***/ (function(module, exports) {

function ktag () {
  var args = [].slice.call(arguments)
  var attr
  var idx
  var te
  var ret = ['<', args[0], '>', args[1], '</', args[0], '>']
  if (args.length > 2 && typeof args[2] === 'object') {
    for (attr in args[2]) {
      if (typeof args[2][attr] === 'boolean' && args[2][attr]) {
        ret.splice(2, 0, ' ', attr)
      } else if (attr === 'class' && Array.isArray(args[2][attr])) {
        ret.splice(2, 0, ' ', attr, '="', args[2][attr].join(' ').trim(), '"')
      } else {
        ret.splice(2, 0, ' ', attr, '="', args[2][attr], '"')
      }
    }
  }
  if (args.length > 3 && typeof args[3] === 'object') {
    idx = ret.indexOf('>')
    te = [idx, 0, ' style="']
    for (attr in args[3]) {
      te.push(attr)
      te.push(':')
      te.push(args[3][attr])
      te.push(';')
    }
    te.push('"')
    ret.splice.apply(ret, te)
  }
  return ret
}

module.exports = function () {
  return ktag.apply(null, arguments).join('')
}


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

var copy = __webpack_require__(8)

module.exports = function (styles) {
  var self = this
  var copyStyles = copy(styles)
  if (styles) {
    Object.keys(copyStyles).map(function (style) {
      var arrProps = copyStyles[style].match(/{{([^{}]+)}}/g)
      if (arrProps && arrProps.length) {
        arrProps.map(function (s) {
          var rep = s.replace(/{{([^{}]+)}}/g, '$1')
          if (self[rep] !== undefined) {
            copyStyles[style] = copyStyles[style].replace(/{{([^{}]+)}}/, self[rep])
          }
        })
      }
    })
  }
  return copyStyles
}


/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = function (child) {
  var self = this
  if (child.class) {
    var c = child.class.match(/{{([^{}]+)}}/g)
    var classStr = ''
    if (c && c.length) {
      c.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        if (self[rep] !== undefined) {
          self[rep].cstore.map(function (c) {
            classStr += c + ' '
          })
        }
      })
    }
    return classStr.length ? classStr.trim() : child.class
  }
  return false
}


/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = function () {
  var self = this
  var cloneChild = [].shift.call(arguments)
  Object.keys(cloneChild).map(function (c) {
    var hdl = cloneChild[c].match(/{{([^{}]+)}}/g)
    if (hdl && hdl.length) {
      var str = ''
      hdl.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        if (self[rep] !== undefined) {
          if (self[rep] === false) {
            delete cloneChild[c]
          } else {
            str += self[rep]
            cloneChild[c] = str
          }
        }
      })
    }
  })
}


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

var proxyList = __webpack_require__(4).proxyList

module.exports = function () {
  var args = [].slice.call(arguments)
  var str = this.base.template
  // clean up es6 backtick string including line spacing
  str = str.trim().replace(/\s+/g, ' ')
  this.base.template = str
  var list = this.base.list
  var arrProps = str.match(/{{([^{}]+)}}/g)
  var tmpl
  var strList = []
  if (arrProps && arrProps.length) {
    list.map(function (r) {
      tmpl = str
      arrProps.map(function (s) {
        var rep = s.replace(/{{([^{}]+)}}/g, '$1')
        tmpl = tmpl.replace(/{{([^{}]+)}}/, r[rep])
        if (args && ~args.indexOf(rep) && !r[rep]) {
          var re = new RegExp(' ' + rep + '="' + r[rep] + '"', 'g')
          tmpl = tmpl.replace(re, '')
        }
      })
      strList.push(tmpl)
    })
  }

  var proxyRes = proxyList.call(this, list)

  return {
    tmpl: strList,
    proxyRes: proxyRes
  }
}


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var cov_cph76adff = function () {
  var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\container.js',
      hash = 'd71f07399c5b24a0c6d4db966bb8b679e49fc2bc',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\components\\container.js',
    statementMap: {
      '0': {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 11
        }
      },
      '1': {
        start: {
          line: 11,
          column: 4
        },
        end: {
          line: 11,
          column: 29
        }
      },
      '2': {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 12,
          column: 31
        }
      },
      '3': {
        start: {
          line: 15,
          column: 4
        },
        end: {
          line: 15,
          column: 46
        }
      },
      '4': {
        start: {
          line: 18,
          column: 4
        },
        end: {
          line: 18,
          column: 48
        }
      },
      '5': {
        start: {
          line: 21,
          column: 4
        },
        end: {
          line: 21,
          column: 33
        }
      },
      '6': {
        start: {
          line: 21,
          column: 27
        },
        end: {
          line: 21,
          column: 33
        }
      },
      '7': {
        start: {
          line: 22,
          column: 4
        },
        end: {
          line: 22,
          column: 60
        }
      },
      '8': {
        start: {
          line: 23,
          column: 4
        },
        end: {
          line: 23,
          column: 25
        }
      },
      '9': {
        start: {
          line: 27,
          column: 18
        },
        end: {
          line: 27,
          column: 33
        }
      },
      '10': {
        start: {
          line: 29,
          column: 15
        },
        end: {
          line: 51,
          column: 1
        }
      },
      '11': {
        start: {
          line: 53,
          column: 22
        },
        end: {
          line: 53,
          column: 89
        }
      },
      '12': {
        start: {
          line: 53,
          column: 28
        },
        end: {
          line: 53,
          column: 89
        }
      },
      '13': {
        start: {
          line: 55,
          column: 0
        },
        end: {
          line: 58,
          column: 1
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 9,
            column: 2
          },
          end: {
            line: 9,
            column: 3
          }
        },
        loc: {
          start: {
            line: 9,
            column: 17
          },
          end: {
            line: 13,
            column: 3
          }
        },
        line: 9
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 14,
            column: 2
          },
          end: {
            line: 14,
            column: 3
          }
        },
        loc: {
          start: {
            line: 14,
            column: 20
          },
          end: {
            line: 16,
            column: 3
          }
        },
        line: 14
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 17,
            column: 2
          },
          end: {
            line: 17,
            column: 3
          }
        },
        loc: {
          start: {
            line: 17,
            column: 22
          },
          end: {
            line: 19,
            column: 3
          }
        },
        line: 17
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 20,
            column: 2
          },
          end: {
            line: 20,
            column: 3
          }
        },
        loc: {
          start: {
            line: 20,
            column: 15
          },
          end: {
            line: 24,
            column: 3
          }
        },
        line: 20
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 53,
            column: 22
          },
          end: {
            line: 53,
            column: 23
          }
        },
        loc: {
          start: {
            line: 53,
            column: 28
          },
          end: {
            line: 53,
            column: 89
          }
        },
        line: 53
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 15,
            column: 23
          },
          end: {
            line: 15,
            column: 46
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 15,
            column: 30
          },
          end: {
            line: 15,
            column: 37
          }
        }, {
          start: {
            line: 15,
            column: 40
          },
          end: {
            line: 15,
            column: 46
          }
        }],
        line: 15
      },
      '1': {
        loc: {
          start: {
            line: 18,
            column: 25
          },
          end: {
            line: 18,
            column: 48
          }
        },
        type: 'cond-expr',
        locations: [{
          start: {
            line: 18,
            column: 32
          },
          end: {
            line: 18,
            column: 39
          }
        }, {
          start: {
            line: 18,
            column: 42
          },
          end: {
            line: 18,
            column: 48
          }
        }],
        line: 18
      },
      '2': {
        loc: {
          start: {
            line: 21,
            column: 4
          },
          end: {
            line: 21,
            column: 33
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 21,
            column: 4
          },
          end: {
            line: 21,
            column: 33
          }
        }, {
          start: {
            line: 21,
            column: 4
          },
          end: {
            line: 21,
            column: 33
          }
        }],
        line: 21
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
      '13': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0],
      '2': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _keet = __webpack_require__(0);

var _keet2 = _interopRequireDefault(_keet);

var _utils = __webpack_require__(2);

var _main = __webpack_require__(11);

var _main2 = _interopRequireDefault(_main);

var _footer = __webpack_require__(12);

var _footer2 = _interopRequireDefault(_footer);

var _todoList = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Container = function (_ref) {
  _inherits(Container, _ref);

  function Container() {
    _classCallCheck(this, Container);

    cov_cph76adff.f[0]++;
    cov_cph76adff.s[0]++;

    var _this = _possibleConstructorReturn(this, (Container.__proto__ || Object.getPrototypeOf(Container)).call(this));

    cov_cph76adff.s[1]++;

    _this.mainDisplay = 'none';
    cov_cph76adff.s[2]++;
    _this.footerDisplay = 'none';
    return _this;
  }

  _createClass(Container, [{
    key: 'toggleMain',
    value: function toggleMain(show) {
      cov_cph76adff.f[1]++;
      cov_cph76adff.s[3]++;

      this.mainDisplay = show ? (cov_cph76adff.b[0][0]++, 'block') : (cov_cph76adff.b[0][1]++, 'none');
    }
  }, {
    key: 'toggleFooter',
    value: function toggleFooter(show) {
      cov_cph76adff.f[2]++;
      cov_cph76adff.s[4]++;

      this.footerDisplay = show ? (cov_cph76adff.b[1][0]++, 'block') : (cov_cph76adff.b[1][1]++, 'none');
    }
  }, {
    key: 'create',
    value: function create(evt) {
      cov_cph76adff.f[3]++;
      cov_cph76adff.s[5]++;

      if (evt.keyCode !== 13) {
          cov_cph76adff.b[2][0]++;
          cov_cph76adff.s[6]++;
          return;
        } else {
        cov_cph76adff.b[2][1]++;
      }cov_cph76adff.s[7]++;
      _todoList.todoList.addTodo.call(_todoList.todoList, evt.target.value.trim());
      cov_cph76adff.s[8]++;
      evt.target.value = '';
    }
  }]);

  return Container;
}((_keet2.default));

var container = (cov_cph76adff.s[9]++, new Container());

var vmodel = (cov_cph76adff.s[10]++, {
  header: {
    tag: 'header',
    id: 'header',
    template: '\n      <h1>todos</h1>\n      <input id="new-todo" k-keydown="create()" placeholder="What needs to be done?" autofocus>'
  },
  main: {
    tag: 'section',
    id: 'main',
    style: {
      display: '{{mainDisplay}}'
    }
  },
  footer: {
    tag: 'footer',
    id: 'footer',
    style: {
      display: '{{footerDisplay}}'
    }
  }
});

cov_cph76adff.s[11]++;
var containerInit = function containerInit() {
  cov_cph76adff.f[4]++;
  cov_cph76adff.s[12]++;
  return container.mount(vmodel).link('todoapp').cluster(_main2.default, _footer2.default);
};

cov_cph76adff.s[13]++;
module.exports = {
  containerInit: containerInit,
  container: container
};

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});

var cov_1u9i3y6q90 = function () {
	var path = 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\model.js',
	    hash = 'abdb1bb1eaf2308ff5de9fc7dde5af69b65c4bdd',
	    global = new Function('return this')(),
	    gcv = '__coverage__',
	    coverageData = {
		path: 'C:\\Users\\User\\distro\\preact-perf\\todomvc\\keetjs\\js\\model.js',
		statementMap: {
			'0': {
				start: {
					line: 6,
					column: 17
				},
				end: {
					line: 6,
					column: 19
				}
			},
			'1': {
				start: {
					line: 9,
					column: 2
				},
				end: {
					line: 11,
					column: 3
				}
			},
			'2': {
				start: {
					line: 10,
					column: 3
				},
				end: {
					line: 10,
					column: 29
				}
			},
			'3': {
				start: {
					line: 14,
					column: 13
				},
				end: {
					line: 62,
					column: 2
				}
			},
			'4': {
				start: {
					line: 20,
					column: 3
				},
				end: {
					line: 20,
					column: 22
				}
			},
			'5': {
				start: {
					line: 24,
					column: 3
				},
				end: {
					line: 28,
					column: 6
				}
			},
			'6': {
				start: {
					line: 29,
					column: 3
				},
				end: {
					line: 29,
					column: 17
				}
			},
			'7': {
				start: {
					line: 33,
					column: 3
				},
				end: {
					line: 35,
					column: 5
				}
			},
			'8': {
				start: {
					line: 34,
					column: 13
				},
				end: {
					line: 34,
					column: 35
				}
			},
			'9': {
				start: {
					line: 36,
					column: 3
				},
				end: {
					line: 36,
					column: 12
				}
			},
			'10': {
				start: {
					line: 40,
					column: 3
				},
				end: {
					line: 42,
					column: 7
				}
			},
			'11': {
				start: {
					line: 41,
					column: 4
				},
				end: {
					line: 41,
					column: 76
				}
			},
			'12': {
				start: {
					line: 43,
					column: 3
				},
				end: {
					line: 43,
					column: 12
				}
			},
			'13': {
				start: {
					line: 47,
					column: 3
				},
				end: {
					line: 47,
					column: 55
				}
			},
			'14': {
				start: {
					line: 47,
					column: 42
				},
				end: {
					line: 47,
					column: 52
				}
			},
			'15': {
				start: {
					line: 48,
					column: 3
				},
				end: {
					line: 48,
					column: 12
				}
			},
			'16': {
				start: {
					line: 52,
					column: 3
				},
				end: {
					line: 54,
					column: 6
				}
			},
			'17': {
				start: {
					line: 53,
					column: 4
				},
				end: {
					line: 53,
					column: 53
				}
			},
			'18': {
				start: {
					line: 55,
					column: 3
				},
				end: {
					line: 55,
					column: 12
				}
			},
			'19': {
				start: {
					line: 59,
					column: 3
				},
				end: {
					line: 59,
					column: 63
				}
			},
			'20': {
				start: {
					line: 59,
					column: 45
				},
				end: {
					line: 59,
					column: 60
				}
			},
			'21': {
				start: {
					line: 60,
					column: 3
				},
				end: {
					line: 60,
					column: 12
				}
			},
			'22': {
				start: {
					line: 64,
					column: 1
				},
				end: {
					line: 64,
					column: 14
				}
			}
		},
		fnMap: {
			'0': {
				name: '(anonymous_0)',
				decl: {
					start: {
						line: 5,
						column: 15
					},
					end: {
						line: 5,
						column: 16
					}
				},
				loc: {
					start: {
						line: 5,
						column: 21
					},
					end: {
						line: 65,
						column: 1
					}
				},
				line: 5
			},
			'1': {
				name: 'inform',
				decl: {
					start: {
						line: 8,
						column: 10
					},
					end: {
						line: 8,
						column: 16
					}
				},
				loc: {
					start: {
						line: 8,
						column: 23
					},
					end: {
						line: 12,
						column: 2
					}
				},
				line: 8
			},
			'2': {
				name: '(anonymous_2)',
				decl: {
					start: {
						line: 34,
						column: 4
					},
					end: {
						line: 34,
						column: 5
					}
				},
				loc: {
					start: {
						line: 34,
						column: 13
					},
					end: {
						line: 34,
						column: 35
					}
				},
				line: 34
			},
			'3': {
				name: '(anonymous_3)',
				decl: {
					start: {
						line: 40,
						column: 34
					},
					end: {
						line: 40,
						column: 35
					}
				},
				loc: {
					start: {
						line: 41,
						column: 4
					},
					end: {
						line: 41,
						column: 76
					}
				},
				line: 41
			},
			'4': {
				name: '(anonymous_4)',
				decl: {
					start: {
						line: 47,
						column: 37
					},
					end: {
						line: 47,
						column: 38
					}
				},
				loc: {
					start: {
						line: 47,
						column: 42
					},
					end: {
						line: 47,
						column: 52
					}
				},
				line: 47
			},
			'5': {
				name: '(anonymous_5)',
				decl: {
					start: {
						line: 52,
						column: 34
					},
					end: {
						line: 52,
						column: 35
					}
				},
				loc: {
					start: {
						line: 53,
						column: 4
					},
					end: {
						line: 53,
						column: 53
					}
				},
				line: 53
			},
			'6': {
				name: '(anonymous_6)',
				decl: {
					start: {
						line: 59,
						column: 37
					},
					end: {
						line: 59,
						column: 38
					}
				},
				loc: {
					start: {
						line: 59,
						column: 45
					},
					end: {
						line: 59,
						column: 60
					}
				},
				line: 59
			}
		},
		branchMap: {
			'0': {
				loc: {
					start: {
						line: 41,
						column: 4
					},
					end: {
						line: 41,
						column: 76
					}
				},
				type: 'cond-expr',
				locations: [{
					start: {
						line: 41,
						column: 28
					},
					end: {
						line: 41,
						column: 32
					}
				}, {
					start: {
						line: 41,
						column: 36
					},
					end: {
						line: 41,
						column: 75
					}
				}],
				line: 41
			},
			'1': {
				loc: {
					start: {
						line: 53,
						column: 4
					},
					end: {
						line: 53,
						column: 53
					}
				},
				type: 'cond-expr',
				locations: [{
					start: {
						line: 53,
						column: 26
					},
					end: {
						line: 53,
						column: 30
					}
				}, {
					start: {
						line: 53,
						column: 34
					},
					end: {
						line: 53,
						column: 52
					}
				}],
				line: 53
			}
		},
		s: {
			'0': 0,
			'1': 0,
			'2': 0,
			'3': 0,
			'4': 0,
			'5': 0,
			'6': 0,
			'7': 0,
			'8': 0,
			'9': 0,
			'10': 0,
			'11': 0,
			'12': 0,
			'13': 0,
			'14': 0,
			'15': 0,
			'16': 0,
			'17': 0,
			'18': 0,
			'19': 0,
			'20': 0,
			'21': 0,
			'22': 0
		},
		f: {
			'0': 0,
			'1': 0,
			'2': 0,
			'3': 0,
			'4': 0,
			'5': 0,
			'6': 0
		},
		b: {
			'0': [0, 0],
			'1': [0, 0]
		},
		_coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
	},
	    coverage = global[gcv] || (global[gcv] = {});

	if (coverage[path] && coverage[path].hash === hash) {
		return coverage[path];
	}

	coverageData.hash = hash;
	return coverage[path] = coverageData;
}();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = __webpack_require__(2);

// note: copied from preact model.js

exports.default = function () {
	cov_1u9i3y6q90.f[0]++;

	var onChanges = (cov_1u9i3y6q90.s[0]++, []);

	function inform(type) {
		cov_1u9i3y6q90.f[1]++;
		cov_1u9i3y6q90.s[1]++;

		for (var i = onChanges.length; i--;) {
			cov_1u9i3y6q90.s[2]++;

			onChanges[i](model, type);
		}
	}

	var model = (cov_1u9i3y6q90.s[3]++, {
		todos: [],

		onChanges: [],

		subscribe: function subscribe(fn) {
			cov_1u9i3y6q90.s[4]++;

			onChanges.push(fn);
		},
		addTodo: function addTodo(title) {
			cov_1u9i3y6q90.s[5]++;

			model.todos = model.todos.concat({
				id: (0, _utils.uuid)(),
				title: title,
				completed: ''
			});
			cov_1u9i3y6q90.s[6]++;
			inform('add');
		},
		toggleAll: function toggleAll(completed) {
			cov_1u9i3y6q90.s[7]++;

			model.todos = model.todos.map(function (todo) {
				cov_1u9i3y6q90.f[2]++;
				cov_1u9i3y6q90.s[8]++;
				return _extends({}, todo, { completed: completed });
			});
			cov_1u9i3y6q90.s[9]++;
			inform();
		},
		toggle: function toggle(todoToToggle) {
			cov_1u9i3y6q90.s[10]++;

			model.todos = model.todos.map(function (todo) {
				cov_1u9i3y6q90.f[3]++;
				cov_1u9i3y6q90.s[11]++;
				return todo !== todoToToggle ? (cov_1u9i3y6q90.b[0][0]++, todo) : (cov_1u9i3y6q90.b[0][1]++, _extends({}, todo, { completed: !todo.completed }));
			});
			cov_1u9i3y6q90.s[12]++;
			inform();
		},
		destroy: function destroy(todo) {
			cov_1u9i3y6q90.s[13]++;

			model.todos = model.todos.filter(function (t) {
				cov_1u9i3y6q90.f[4]++;
				cov_1u9i3y6q90.s[14]++;
				return t !== todo;
			});
			cov_1u9i3y6q90.s[15]++;
			inform();
		},
		save: function save(todoToSave, title) {
			cov_1u9i3y6q90.s[16]++;

			model.todos = model.todos.map(function (todo) {
				cov_1u9i3y6q90.f[5]++;
				cov_1u9i3y6q90.s[17]++;
				return todo !== todoToSave ? (cov_1u9i3y6q90.b[1][0]++, todo) : (cov_1u9i3y6q90.b[1][1]++, _extends({}, todo, { title: title }));
			});
			cov_1u9i3y6q90.s[18]++;
			inform();
		},
		clearCompleted: function clearCompleted() {
			cov_1u9i3y6q90.s[19]++;

			model.todos = model.todos.filter(function (todo) {
				cov_1u9i3y6q90.f[6]++;
				cov_1u9i3y6q90.s[20]++;
				return !todo.completed;
			});
			cov_1u9i3y6q90.s[21]++;
			inform();
		}
	});

	cov_1u9i3y6q90.s[22]++;
	return model;
};

/***/ })
/******/ ]);
//# sourceMappingURL=build.js.map