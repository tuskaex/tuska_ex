/*
 * Custom indicators published from Admin → Indicators (pasted Pine Script /
 * MQL, converted server-side into Charting Library custom-indicator JS).
 *
 * C++ fetches GET /api/v1/indicators (ApiClient::fetchCustomIndicators) and
 * hands the JSON over the bridge; app.js passes the rows to the widget through
 * custom_indicators_getter, on every (re)build of the chart, so a newly
 * published indicator shows up the next time a chart is opened or rebuilt.
 *
 * Each row's `js` is the body of `function (PineJS) { ... }` returning
 * { name, metainfo, constructor }. The admin API parsed and checked it before
 * publishing; here it runs in strict mode, and one broken row is skipped
 * instead of taking the chart down.
 *
 * Same builder as frontend/trader/src/lib/chart/customIndicators.ts and the
 * admin preview's src/lib/customIndicators.ts; keep the three in step.
 */
(function () {
  "use strict";

  // Rows from C++ (ChartBridge::requestCustomIndicators -> customIndicatorsReady).
  // Resolves to [] on any failure or after a few seconds: the library waits on
  // this before it draws, and a chart without the custom indicators is better
  // than a chart that does not open.
  function load(bridge) {
    return new Promise(function (resolve) {
      if (!bridge || !bridge.customIndicatorsReady
        || typeof bridge.requestCustomIndicators !== "function") {
        resolve([]);
        return;
      }
      var done = false;
      function finish(rows) {
        if (done) return;
        done = true;
        try { bridge.customIndicatorsReady.disconnect(onReady); } catch (e) { /* already gone */ }
        resolve(rows);
      }
      function onReady(json) {
        try {
          var body = JSON.parse(json || "{}");
          finish(Array.isArray(body.indicators) ? body.indicators : []);
        } catch (e) {
          console.warn("custom indicators: bad JSON", e);
          finish([]);
        }
      }
      bridge.customIndicatorsReady.connect(onReady);
      setTimeout(function () { finish([]); }, 5000);
      try {
        bridge.requestCustomIndicators();
      } catch (e) {
        console.warn("custom indicators: bridge call failed", e);
        finish([]);
      }
    });
  }

  function build(PineJS, rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      try {
        var factory = new Function("PineJS", '"use strict";\n' + row.js);
        var ind = factory.call(undefined, PineJS);
        if (!ind || typeof ind !== "object" || !ind.metainfo
          || !Object.prototype.hasOwnProperty.call(ind, "constructor")
          || typeof ind.constructor !== "function") {
          throw new Error("factory did not return { name, metainfo, constructor }");
        }
        // The saved-layout identity comes from the row, never from the code.
        ind.name = row.name;
        ind.metainfo.id = row.study_id + "@tv-basicstudies-1";
        ind.metainfo.description = row.name;
        ind.metainfo.shortDescription = ind.metainfo.shortDescription || row.name;
        ind.metainfo.isCustomIndicator = true;
        ind.metainfo._metainfoVersion = ind.metainfo._metainfoVersion || 53;
        out.push(ind);
      } catch (e) {
        console.warn('custom indicator "' + row.name + '" skipped:', e);
      }
    });
    return out;
  }

  window.txIndicators = { load: load, build: build };
})();
