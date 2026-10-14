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
 *   Template                                    the template store beside
 *                                               config.json — every indicator
 *                                               and every drawing, shared by
 *                                               all four panes and by the
 *                                               chart's own template button
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
  // Icons for the entries, the same glyphs the terminal's own menus and
  // toolbar use (src/ui/Icons.h), so the chart menu reads as part of the same
  // program. currentColor lets the library's light and dark menus colour them.
  function svg(body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + body + "</svg>";
  }
  // The "on" look of a toggle. The library draws iconChecked INSTEAD of a tick
  // once an entry has an icon, so without this Grid and Volumes stopped
  // showing whether they were on. Same glyph, smaller, in a highlighted box:
  // what a checked toolbar button looks like in the terminal.
  function svgOn(body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round">' +
      '<rect x="0.5" y="0.5" width="23" height="23" rx="4" fill="currentColor" ' +
      'fill-opacity="0.16" stroke-opacity="0.7" stroke-width="1"/>' +
      '<g transform="translate(3.5 3.5) scale(0.71)">' + body + "</g></svg>";
  }
  var GRID_BODY = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>';
  var VOL_BODY = '<path d="M4 20V14M9 20V8M14 20v-9M19 20V4"/>';
  var ICON = {
    indicators: svg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'),
    timeframes: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    template:   svg('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'),
    refresh:    svg('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'),
    arrange:    svg('<path d="M12 3v18"/><path d="M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3"/>'),
    grid:       svg(GRID_BODY),
    gridOn:     svgOn(GRID_BODY),
    volumes:    svg(VOL_BODY),
    volumesOn:  svgOn(VOL_BODY),
    zoomIn:     svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>'),
    zoomOut:    svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M8 11h6"/>'),
    picture:    svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
    preview:    svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><circle cx="11.5" cy="14.5" r="2.5"/><path d="M13.5 16.5L16 19"/>'),
    print:      svg('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    properties: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    save:       svg('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
    trash:      svg('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>'),
  };
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
     * MetaTrader's Template menu: save this chart's setup under a name, and put
     * it back on another chart later.
     *
     * "Setup" means every indicator AND every drawing, which is what the desk
     * asked for. The library's study template carries only the indicators, so
     * the drawings travel beside it under the same name — see ChartBridge's
     * templateDrawings for the whole story.
     *
     * This is the SAME list the chart's own "Save Indicator template…" writes
     * to, deliberately. Two template systems in one terminal, each with its own
     * list and its own save button, is how a trader ends up unable to find the
     * one they made. Saving from either place produces a template the other can
     * apply.
     *
     * Applying one never changes the instrument or the timeframe. Both are
     * stripped when a template is written, in the one place templates are
     * written, so a template made on XAUUSD cannot drag a GBPUSD chart across.
     */
    function applyTemplate(name) {
      var c = chart();
      if (!c) return;
      // The drawings first, then the indicators. They touch different things,
      // so the order is not load-bearing; both simply have to happen.
      call(bridge, bridge.templateDrawings, name).then(function (text) {
        var drawings = parseJson(text, null);
        if (!drawings) return;
        try { return c.applyLineToolsState(drawings); }
        catch (e) { console.warn("chart menu: the chart refused the drawings", name, e); }
      }).then(function () {
        return call(bridge, bridge.studyTemplateContent, name);
      }).then(function (text) {
        var tpl = parseJson(text, null);
        if (!tpl) return;
        try { c.applyStudyTemplate(tpl); }
        catch (e) { console.warn("chart menu: the chart refused the template", name, e); }
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
        icon: ICON.save,
        onExecute: function () {
          var c = chart();
          if (!c) return;
          var study = "", drawings = "";
          try {
            // Neither the symbol nor the interval: a template is a setup, not
            // an instrument. C++ strips them again on the way in, so this is
            // belt and braces rather than the only guard.
            study = JSON.stringify(
              c.createStudyTemplate({ saveSymbol: false, saveInterval: false }));
          } catch (e) {
            console.warn("chart menu: could not capture the indicators", e);
            return;
          }
          try {
            drawings = JSON.stringify(c.getLineToolsState());
          } catch (e) {
            // An empty string is sent on purpose: saving from a chart with
            // nothing drawn has to clear whatever this name carried before.
            console.warn("chart menu: could not capture the drawings", e);
          }
          try { bridge.saveTemplateAs(study, drawings); }
          catch (e) { console.warn("chart menu: could not hand the template over", e); }
        },
      }));

      if (names.length) {
        items.push(f.createAction({
          actionId: "tx-tpl-delete",
          label: "Delete Template",
          icon: ICON.trash,
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
        icon: ICON.indicators,
        shortcutHint: "Ctrl+I",
        onExecute: act(function (ch) { ch.executeActionById("insertIndicator"); }),
      });

      sep();

      add({
        actionId: "tx-timeframes",
        label: "Timeframes",
        icon: ICON.timeframes,
        subItems: buildTimeframes(f, c),
        onExecute: function () {},
      });
      add({
        actionId: "tx-template",
        label: "Template",
        icon: ICON.template,
        subItems: buildTemplates(f, templateNames),
        onExecute: function () {},
      });
      add({
        actionId: "tx-refresh",
        label: "Refresh",
        icon: ICON.refresh,
        onExecute: act(function (ch) { ch.resetData(); }),
      });

      sep();

      // MT5's Auto Arrange puts the chart back to a sane default view, which is
      // what chartReset does here.
      add({
        actionId: "tx-autoarrange",
        label: "Auto Arrange",
        icon: ICON.arrange,
        onExecute: act(function (ch) { ch.executeActionById("chartReset"); }),
      });
      add({
        actionId: "tx-grid",
        label: "Grid",
        icon: ICON.grid,
        iconChecked: ICON.gridOn,
        shortcutHint: "Ctrl+G",
        checkable: true,
        checked: gridOn,
        onExecute: function () { setGrid(!gridOn); },
      });
      add({
        actionId: "tx-volumes",
        label: "Volumes",
        icon: ICON.volumes,
        iconChecked: ICON.volumesOn,
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

      add({ actionId: "tx-zoomin",  label: "Zoom In",  shortcutHint: "+", icon: ICON.zoomIn,
            onExecute: function () { zoom(1.25); } });
      add({ actionId: "tx-zoomout", label: "Zoom Out", shortcutHint: "−", icon: ICON.zoomOut,
            onExecute: function () { zoom(1 / 1.25); } });

      sep();

      add({
        actionId: "tx-savepic",
        label: "Save As Picture…",
        icon: ICON.picture,
        onExecute: function () { try { bridge.requestSaveImage(); } catch (e) {} },
      });
      add({
        actionId: "tx-printpreview",
        label: "Print Preview",
        icon: ICON.preview,
        onExecute: function () { try { bridge.requestPrint(true); } catch (e) {} },
      });
      add({
        actionId: "tx-print",
        label: "Print…",
        icon: ICON.print,
        onExecute: function () { try { bridge.requestPrint(false); } catch (e) {} },
      });

      sep();

      add({
        actionId: "tx-properties",
        label: "Properties…",
        icon: ICON.properties,
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

          return call(bridge, bridge.listStudyTemplates).then(function (text) {
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
