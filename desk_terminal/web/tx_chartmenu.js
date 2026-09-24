/*
 * MetaTrader's chart right-click menu, on the TradingView chart.
 *
 * The desk sent a screenshot of MT5's menu and asked for the same one here.
 * Right-clicking the candles used to raise the charting library's own menu,
 * which is a different set of entries in a different order — familiar to a
 * TradingView user and to nobody coming from MetaTrader.
 *
 * This replaces it through the library's `context_menu.items_processor` hook
 * rather than by intercepting the mouse. That matters: the chart renders in its
 * own iframe, so a menu of ours drawn in the host document would be a second
 * popup fighting the library's own for the same click, and anything we painted
 * over the iframe would sit above every dialog the chart opens. Going through
 * the hook means the menu IS the library's menu — right position, right theme,
 * right dismissal behaviour — with our items in it.
 *
 * Where each entry actually goes:
 *
 *   Indicators List, Auto Arrange, Properties   the library's own actions
 *   Timeframes, Grid, Volumes, Zoom             the library's chart API
 *   Template                                    a full chart state — every
 *                                               indicator and every drawing —
 *                                               in the store beside
 *                                               config.json, shared by all
 *                                               four panes
 *   Save As Picture, Print, Print Preview       C++ — a file dialog and a
 *                                               printer are not things the
 *                                               page has
 *
 * Nothing here is a placeholder. An entry that cannot do its job is not on the
 * menu, which is why MT5's Ctrl+P hint is absent from Print: Ctrl+P already
 * opens the order ticket in this terminal, and a hint that lies is worse than
 * no hint.
 */

(function () {
  // MetaTrader's label on the left, the charting library's resolution string on
  // the right. The datafeed maps those to the server's own timeframes, so
  // nothing here needs to know about either.
  var TIMEFRAMES = [
    ["M1", "1"],   ["M5", "5"],   ["M15", "15"], ["M30", "30"], ["H1", "60"],
    ["H4", "240"], ["D1", "1D"],  ["W1", "1W"],  ["MN", "1M"],
  ];

  // The menus the library raises for its own furniture — the price scale, the
  // legend, a selected drawing. Those are about the thing that was clicked and
  // have nothing to do with MT5's chart menu, so they are left exactly as they
  // are. Everything else is the candles, which is ours.
  var KEEP = /legend|scale|object|drawing|tool|source/i;

  // QWebChannel methods are asynchronous: they return undefined and deliver the
  // answer to a callback. Wrapping them makes the template list awaitable.
  function call(bridge, fn) {
    var args = Array.prototype.slice.call(arguments, 2);
    return new Promise(function (resolve) {
      try {
        fn.apply(bridge, args.concat([function (result) { resolve(result); }]));
      } catch (e) {
        console.warn("chart menu: bridge call failed", e);
        resolve(undefined);
      }
    });
  }

  function parseJson(text, fallback) {
    try { return text ? JSON.parse(text) : fallback; } catch (e) { return fallback; }
  }

  window.makeChartMenu = function (bridge, getWidget) {
    // Grid visibility is a property of the chart, and the library offers no way
    // to read it back — applyOverrides is write-only. So it is tracked here,
    // seeded to the library's own default of visible, and reset whenever the
    // chart is rebuilt (a theme or layout change throws the overrides away).
    var gridOn = true;

    function chart() {
      var w = getWidget();
      if (!w) return null;
      try { return w.activeChart(); } catch (e) { return null; }
    }

    function act(fn) {
      return function () {
        var c = chart();
        if (!c) return;
        try { fn(c, getWidget()); } catch (e) { console.warn("chart menu action failed", e); }
      };
    }

    // The Volume study, if it is on the chart. MT5 calls this "Volumes" and
    // treats it as a switch; here it is an indicator like any other, so the
    // switch adds and removes it.
    function volumeEntity(c) {
      try {
        var all = c.getAllStudies() || [];
        for (var i = 0; i < all.length; i++)
          if (String(all[i].name).toLowerCase() === "volume") return all[i];
      } catch (e) { /* chart not ready */ }
      return null;
    }

    function currentResolution(c) {
      try { return String(c.resolution()); } catch (e) { return ""; }
    }

    function setGrid(on) {
      var w = getWidget();
      if (!w) return;
      gridOn = on;
      try {
        w.applyOverrides({
          "paneProperties.vertGridProperties.style": on ? 0 : 1,
          "paneProperties.horzGridProperties.style": on ? 0 : 1,
          "paneProperties.vertGridProperties.visible": on,
          "paneProperties.horzGridProperties.visible": on,
        });
      } catch (e) {
        console.warn("chart menu: could not toggle the grid", e);
      }
    }

    // Zoom is bar spacing. The library exposes zoomOut() but no zoomIn(), and
    // mixing the two would make the steps asymmetric — zooming out and back in
    // would not return to where it started. Bar spacing does both by the same
    // factor, so it does.
    function zoom(factor) {
      var c = chart();
      if (!c) return;
      try {
        var ts = c.getTimeScale();
        var next = ts.barSpacing() * factor;
        // The library clamps internally, but a value it rejects outright leaves
        // the chart untouched rather than throwing.
        ts.setBarSpacing(Math.max(0.5, Math.min(next, 200)));
      } catch (e) {
        console.warn("chart menu: could not zoom", e);
      }
    }

    function buildTimeframes(f, c) {
      var current = currentResolution(c);
      return TIMEFRAMES.map(function (tf) {
        return f.createAction({
          actionId: "tx-tf-" + tf[1],
          label: tf[0],
          checkable: true,
          checked: current === tf[1],
          onExecute: act(function (ch) { ch.setResolution(tf[1]); }),
        });
      });
    }

    /*
     * MetaTrader's Template menu: save this chart's whole setup under a name,
     * and put it back on another chart later.
     *
     * "Whole setup" is the point, and it is what the desk asked for after the
     * first version of this menu shipped: every indicator AND every drawing,
     * plus the chart's style. The library's own study templates carry only the
     * indicators — createStudyTemplate has no option to include drawings, and
     * the Indicators dialog that writes them decides what goes in. So a
     * template here is a full chart state, the same serialisation a workspace
     * profile stores, kept in its own bucket beside config.json and shared by
     * all four panes.
     *
     * Applying one deliberately does NOT change the instrument. The saved state
     * always carries a symbol, because the library always writes one, but a
     * template is a setup rather than a thing to look at — applying it on
     * GBPUSD must not jump the pane to whatever was on screen when it was
     * saved. So the pane's own symbol goes back on once the load settles.
     */
    function applyTemplate(name) {
      call(bridge, bridge.templateContent, name).then(function (text) {
        var state = parseJson(text, null);
        var w = getWidget();
        var c = chart();
        if (!state || !w || !c) return;

        var symbol = "";
        try { symbol = c.symbol(); } catch (e) { /* not ready */ }

        var done;
        try {
          done = w.load(state);
        } catch (e) {
          console.warn("chart menu: the chart refused the template", name, e);
          return;
        }
        if (!done || typeof done.then !== "function" || !symbol) return;
        done.then(function () {
          try {
            var ch = w.activeChart();
            if (ch.symbol() !== symbol) ch.setSymbol(symbol);
          } catch (e) { /* torn down mid-load */ }
        }, function (e) {
          console.warn("chart menu: loading the template failed", name, e);
        });
      });
    }

    function buildTemplates(f, names) {
      var items = [];

      if (!names.length) {
        items.push(f.createAction({
          actionId: "tx-tpl-none",
          label: "No templates saved yet",
          disabled: true,
          onExecute: function () {},
        }));
      } else {
        names.forEach(function (name) {
          items.push(f.createAction({
            actionId: "tx-tpl-" + name,
            label: name,
            onExecute: function () { applyTemplate(name); },
          }));
        });
      }

      items.push(f.createSeparator());

      // Captured here rather than read from the state the terminal already
      // caches: that copy is refreshed a couple of seconds after a change, so a
      // drawing made a moment ago would be missing from the template that is
      // supposed to contain it.
      items.push(f.createAction({
        actionId: "tx-tpl-save",
        label: "Save Template…",
        onExecute: function () {
          var w = getWidget();
          if (!w) return;
          try {
            // includeDrawings defaults to true; named anyway, because it is the
            // entire reason this entry exists.
            w.save(function (state) {
              try { bridge.saveTemplateAs(JSON.stringify(state)); }
              catch (e) { console.warn("chart menu: could not hand the template over", e); }
            }, { includeDrawings: true });
          } catch (e) {
            console.warn("chart menu: could not capture the chart", e);
          }
        },
      }));

      if (names.length) {
        items.push(f.createAction({
          actionId: "tx-tpl-delete",
          label: "Delete Template",
          subItems: names.map(function (name) {
            return f.createAction({
              actionId: "tx-tpl-del-" + name,
              label: name,
              onExecute: function () {
                try { bridge.removeTemplate(name); } catch (e) {}
              },
            });
          }),
          onExecute: function () {},
        }));
      }

      return items;
    }

    function build(f, templateNames) {
      var c = chart();
      if (!c) return [];
      var vol = volumeEntity(c);

      var items = [];
      var add = function (o) { items.push(f.createAction(o)); };
      var sep = function () { items.push(f.createSeparator()); };

      add({
        actionId: "tx-indicators",
        label: "Indicators List",
        shortcutHint: "Ctrl+I",
        onExecute: act(function (ch) { ch.executeActionById("insertIndicator"); }),
      });

      sep();

      add({
        actionId: "tx-timeframes",
        label: "Timeframes",
        subItems: buildTimeframes(f, c),
        onExecute: function () {},
      });
      add({
        actionId: "tx-template",
        label: "Template",
        subItems: buildTemplates(f, templateNames),
        onExecute: function () {},
      });
      add({
        actionId: "tx-refresh",
        label: "Refresh",
        onExecute: act(function (ch) { ch.resetData(); }),
      });

      sep();

      // MT5's Auto Arrange puts the chart back to a sane default view, which is
      // what chartReset does here.
      add({
        actionId: "tx-autoarrange",
        label: "Auto Arrange",
        onExecute: act(function (ch) { ch.executeActionById("chartReset"); }),
      });
      add({
        actionId: "tx-grid",
        label: "Grid",
        shortcutHint: "Ctrl+G",
        checkable: true,
        checked: gridOn,
        onExecute: function () { setGrid(!gridOn); },
      });
      add({
        actionId: "tx-volumes",
        label: "Volumes",
        shortcutHint: "Ctrl+L",
        checkable: true,
        checked: !!vol,
        onExecute: act(function (ch) {
          var v = volumeEntity(ch);
          if (v) ch.removeEntity(v.id);
          else ch.createStudy("Volume");
        }),
      });

      sep();

      add({ actionId: "tx-zoomin",  label: "Zoom In",  shortcutHint: "+",
            onExecute: function () { zoom(1.25); } });
      add({ actionId: "tx-zoomout", label: "Zoom Out", shortcutHint: "−",
            onExecute: function () { zoom(1 / 1.25); } });

      sep();

      add({
        actionId: "tx-savepic",
        label: "Save As Picture…",
        onExecute: function () { try { bridge.requestSaveImage(); } catch (e) {} },
      });
      add({
        actionId: "tx-printpreview",
        label: "Print Preview",
        onExecute: function () { try { bridge.requestPrint(true); } catch (e) {} },
      });
      add({
        actionId: "tx-print",
        label: "Print…",
        onExecute: function () { try { bridge.requestPrint(false); } catch (e) {} },
      });

      sep();

      add({
        actionId: "tx-properties",
        label: "Properties…",
        shortcutHint: "F8",
        onExecute: act(function (ch) { ch.executeActionById("chartProperties"); }),
      });

      return items;
    }

    return {
      // Handed to the widget constructor as `context_menu`.
      options: {
        items_processor: function (items, actionsFactory, params) {
          var name = (params && params.menuName) || "";
          // Named once in the diagnostic log, because the library does not
          // document these names and the next person to touch this will want
          // to know what they actually are.
          if (!window.txMenuNamesSeen) window.txMenuNamesSeen = {};
          if (!window.txMenuNamesSeen[name]) {
            window.txMenuNamesSeen[name] = true;
            console.info("chart menu: context menu '" + name + "'");
          }
          if (KEEP.test(name)) return Promise.resolve(items);

          return call(bridge, bridge.listTemplates).then(function (text) {
            var names = parseJson(text, []);
            var built = build(actionsFactory, Array.isArray(names) ? names : []);
            // A chart that is not ready yet yields nothing; hand back the
            // library's own menu rather than an empty popup.
            return built.length ? built : items;
          });
        },
      },

      // A rebuilt chart is a fresh set of overrides, so the tracked grid state
      // has to go back to the library's default with it.
      reset: function () { gridOn = true; },

      // The four shortcuts from MetaTrader's menu that are free here. Ctrl+P is
      // deliberately absent — it already opens the order ticket — and so is
      // Ctrl+A, which the chart uses for select-all.
      bindShortcuts: function (doc) {
        if (!doc || doc.txMenuKeysBound) return;
        doc.txMenuKeysBound = true;
        doc.addEventListener("keydown", function (e) {
          // Never steal a key from a field the trader is typing in — the
          // library's symbol search is one.
          var t = e.target;
          if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
            return;
          var c = chart();
          if (!c) return;
          var key = (e.key || "").toLowerCase();
          if (e.ctrlKey && key === "i") {
            e.preventDefault();
            try { c.executeActionById("insertIndicator"); } catch (err) {}
          } else if (e.ctrlKey && key === "g") {
            e.preventDefault();
            setGrid(!gridOn);
          } else if (e.ctrlKey && key === "l") {
            e.preventDefault();
            var v = volumeEntity(c);
            try { v ? c.removeEntity(v.id) : c.createStudy("Volume"); } catch (err) {}
          } else if (e.key === "F8") {
            e.preventDefault();
            try { c.executeActionById("chartProperties"); } catch (err) {}
          }
        }, true);
      },
    };
  };
})();
