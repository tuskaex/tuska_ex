#pragma once
#include <QObject>
#include <QString>
#include <QQueue>
#include "core/Models.h"

class ApiClient;
class PriceStream;

// Bridge object exposed to the TradingView web layer over QWebChannel as `sc`.
// The JS datafeed calls requestBars() and listens to barsReady()/tick();
// the native side pushes symbol metadata and selection changes down.
class ChartBridge : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString symbolsJson    READ symbolsJson    NOTIFY symbolsChanged)
    Q_PROPERTY(QString currentSymbol  READ currentSymbol  NOTIFY symbolChanged)
    Q_PROPERTY(QString positionsJson  READ positionsJson  NOTIFY positionsChanged)
    Q_PROPERTY(QString theme          READ theme          NOTIFY themeChanged)
    // True while this pane is one of several. The web layer drops the drawing
    // toolbar and the bottom date-range bar in that state — in a quarter-sized
    // pane they cost more room than they earn.
    Q_PROPERTY(bool    compact        READ compact        NOTIFY compactChanged)
    // View > Data Window. The charting library's own panel, on the widget bar
    // down the right of the chart: OHLCV plus every indicator's value at the
    // crosshair. Off by default — it takes real width from the candles.
    Q_PROPERTY(bool    dataWindow     READ dataWindow     NOTIFY dataWindowChanged)
public:
    ChartBridge(ApiClient* api, PriceStream* stream, QObject* parent = nullptr);

    QString symbolsJson()   const { return m_symbolsJson; }
    QString currentSymbol() const { return m_currentSymbol; }
    QString positionsJson() const { return m_positionsJson; }
    QString theme()         const { return m_theme; }
    bool    compact()       const { return m_compact; }
    bool    dataWindow()    const { return m_dataWindow; }

    void setTheme(const QString& theme);   // "dark" | "light"
    // Rebuilds the chart with a reduced chrome set. Costly (the widget is torn
    // down and recreated), so it is only called when the value actually flips.
    void setCompact(bool compact);
    // Same cost as setCompact: the widget bar is a constructor option, so the
    // chart is torn down and rebuilt. Only emits on an actual change.
    void setDataWindow(bool on);

    void setSymbols(const QVector<SymbolSpec>& symbols);  // called by MainWindow
    void setCurrentSymbol(const QString& symbol);          // watchlist selection
    void setPositions(const QVector<OpenPosition>& positions);  // account poll

    // JS -> C++: ask for history. Answered asynchronously via barsReady().
    Q_INVOKABLE void requestBars(const QString& symbol, const QString& timeframe,
                                 double fromSec, double toSec, const QString& reqId);

    // JS (chart overlay) -> C++: set one bracket ("sl" | "tp") on a live
    // position, or close it. level <= 0 asks to remove. Answered via positionOp().
    Q_INVOKABLE void modifyBracket(const QString& positionId, const QString& kind, double level);
    Q_INVOKABLE void closePosition(const QString& positionId);

    // ── Saved chart layouts and templates ──────────────────────────────
    //
    // These back the charting library's save/load adapter, which is what puts
    // "Save chart", indicator templates and drawing templates in the chart
    // header. Without an adapter the library has nowhere to put any of it, so
    // a trader's fibs and indicators died with the window — the terminal even
    // disabled the header button rather than show one that could not work.
    //
    // Everything lives in ONE JSON file beside config.json, so a template
    // saved on one chart pane is offered on all four, and survives a restart.
    // Every call re-reads that file before writing: four panes share this
    // store, and a cached copy would let one pane's save wipe another's.
    //
    // Content is passed as opaque strings in both directions. The shapes are
    // the library's own and it is the only thing that reads them back.
    Q_INVOKABLE QString listCharts() const;
    Q_INVOKABLE QString chartContent(const QString& id) const;
    // Returns the id the chart was stored under — a new one when `id` is empty.
    Q_INVOKABLE QString saveChart(const QString& id, const QString& name,
                                  const QString& symbol, const QString& resolution,
                                  const QString& content);
    Q_INVOKABLE void removeChart(const QString& id);

    Q_INVOKABLE QString listStudyTemplates() const;
    Q_INVOKABLE QString studyTemplateContent(const QString& name) const;
    Q_INVOKABLE void saveStudyTemplate(const QString& name, const QString& content);
    Q_INVOKABLE void removeStudyTemplate(const QString& name);

    Q_INVOKABLE QString listChartTemplates() const;
    Q_INVOKABLE QString chartTemplateContent(const QString& name) const;
    Q_INVOKABLE void saveChartTemplate(const QString& name, const QString& content);
    Q_INVOKABLE void removeChartTemplate(const QString& name);

    Q_INVOKABLE QString listDrawingTemplates(const QString& tool) const;
    Q_INVOKABLE QString drawingTemplateContent(const QString& tool, const QString& name) const;
    Q_INVOKABLE void saveDrawingTemplate(const QString& tool, const QString& name,
                                         const QString& content);
    Q_INVOKABLE void removeDrawingTemplate(const QString& tool, const QString& name);

    // ── Workspace profiles (File > Profile) ────────────────────────────
    //
    // A profile has to bring a pane back as it was left: instrument, timeframe,
    // indicators, drawings and chart style. Only the charting library knows all
    // of that, and only through its own save() callback.
    //
    // Rather than a request/response round trip at save time — which would make
    // "Save Profile" asynchronous and racy across four panes — the web layer
    // pushes the state here whenever the library says something worth
    // persisting changed (its onAutoSaveNeeded event). C++ keeps the latest,
    // so writing a profile is a synchronous read of chartState().
    Q_INVOKABLE void pushChartState(const QString& stateJson);
    QString chartState() const { return m_chartState; }
    // C++ -> JS: put a pane back into a state captured earlier. A no-op on the
    // web side if the string is not something the library wrote.
    void loadChartState(const QString& stateJson);

    // ── View > Navigation: Indicators ────────────────────────────────
    //
    // The navigator lists the indicators this chart can draw and adds one on a
    // double-click, which is what MT5's Navigator does. The list belongs to the
    // charting library, so the web layer pushes it up once the chart is ready
    // rather than C++ keeping a copy that would go stale against the vendor
    // bundle.
    Q_INVOKABLE void pushStudies(const QString& namesJson);
    QString studies() const { return m_studies; }
    // C++ -> JS: add one to this pane. A name the library does not know is
    // ignored on the far side.
    void createStudy(const QString& name);

    // ── The timeframe and drawing toolbars ─────────────────────────────
    //
    // Both of these already exist inside the chart, and both are things a
    // trader coming from MetaTrader reaches for on a toolbar above the chart
    // instead. Neither can be driven by setting a property: the timeframe and
    // the active drawing tool belong to the charting library, so the native
    // buttons ask for them here and the web layer does the work.
    //
    // `res` is the library's own resolution string ("1", "60", "1D", …), not
    // the server timeframe the datafeed speaks — the datafeed already maps
    // between the two.
    void setResolution(const QString& res);
    QString resolution() const { return m_resolution; }
    // The library's own tool name ("trend_line", "fib_retracement", "cursor",
    // …). A name it does not know is ignored on the far side rather than
    // leaving the chart in a half-armed state.
    void selectLineTool(const QString& tool);

    // JS -> C++: the timeframe was changed from inside the chart, by its own
    // header or a keyboard shortcut. Without this the toolbar's M1…MN buttons
    // would keep the highlight on whichever one was last clicked and quietly
    // disagree with the chart underneath them.
    Q_INVOKABLE void chartResolutionPicked(const QString& res);

    // JS -> C++: a TradingView dialog (Indicators, settings, …) opened or
    // closed. Those render INSIDE the chart iframe, so the native one-click
    // strip floating over the web view would otherwise cover them permanently.
    Q_INVOKABLE void setOverlayHidden(bool hidden);

    // ── The chart's right-click menu: the entries only C++ can serve ───
    //
    // Everything else on that menu is the charting library's own business and
    // is done inside the page. These three are not: saving a picture needs a
    // file dialog and printing needs a printer, and the web layer has neither.
    // It asks here instead, and WebChartWidget — which owns the view being
    // captured — does the work.
    Q_INVOKABLE void requestSaveImage();
    // preview=true opens the print preview rather than the printer dialog.
    Q_INVOKABLE void requestPrint(bool preview);

    // JS -> C++: the trader picked a symbol inside the chart's own search box,
    // rather than from the Market Watch. Without this the native side never
    // learns, keeps filtering ticks to the old symbol, and the newly chosen one
    // draws its history and then sits frozen.
    Q_INVOKABLE void chartSymbolPicked(const QString& symbol);

signals:
    void symbolsChanged();
    void symbolChanged(const QString& symbol);
    // Raised only for an in-chart pick, so the pane can retitle itself. Kept
    // separate from symbolChanged, which is the C++ -> JS direction; reusing it
    // would send the symbol straight back to the chart that just set it.
    void symbolPickedInChart(const QString& symbol);
    void positionsChanged();
    void themeChanged(const QString& theme);
    void compactChanged(bool compact);
    void dataWindowChanged(bool on);
    void barsReady(const QString& reqId, const QString& barsJson);
    void tick(const QString& symbol, double bid, double ask, double tsMs);
    // Result of a modifyBrackets()/closePosition() call, back to the broker adapter.
    void positionOp(const QString& positionId, const QString& op, bool ok, const QString& message);
    // Raised when a chart dialog opens/closes, so the host can hide the strip.
    void overlayHiddenChanged(bool hidden);
    // C++ -> JS, for loadChartState(). Separate from any signal the chart
    // already listens to: this one rebuilds the whole pane.
    void chartStateLoad(const QString& stateJson);
    // C++ -> JS, for createStudy().
    void studyRequested(const QString& name);
    // Raised once the web layer has handed over the indicator list, so the
    // navigator can fill in a section that was empty when it opened.
    void studiesChanged();
    // C++ -> JS, for setResolution() and selectLineTool().
    void resolutionRequested(const QString& res);
    void lineToolRequested(const QString& tool);
    // The pane's timeframe actually changed, whoever asked for it. The toolbar
    // follows this rather than its own clicks, so a change made inside the
    // chart moves the highlight too.
    void resolutionChanged(const QString& res);
    // The chart's right-click menu asked for a picture or a print.
    void saveImageRequested();
    void printRequested(bool preview);

private slots:
    void onBarsReceived(const QString& symbol, const QString& timeframe, const QVector<Bar>& bars);
    void onTick(const Quote& q);

private:
    ApiClient*   m_api;
    PriceStream* m_stream;
    QString      m_symbolsJson = "[]";
    QString      m_positionsJson = "[]";
    QString      m_currentSymbol;
    bool         m_compact = false;
    bool         m_dataWindow = false;
    QString      m_theme = "dark";
    QString      m_chartState;   // latest state the web layer pushed up
    QString      m_studies = "[]";   // indicator names the library offers
    // The pane's current timeframe, as the library spells it.
    //
    // Starts EMPTY on purpose. It used to hold app.js's default of "5", and
    // chartResolutionPicked() ignores a value equal to the one it already has —
    // so a chart opening on 5m, which is the usual case, seeded the same string
    // and the change was swallowed. The toolbar then sat with no timeframe
    // highlighted until the trader changed one by hand. Empty can never match
    // what the chart reports, so the first seed always gets through.
    QString      m_resolution;

    // Correlate async /bars responses (which carry only symbol+tf) back to the
    // JS reqId that asked, FIFO per (symbol,timeframe).
    struct Pending { QString key; QString reqId; };
    QQueue<Pending> m_pending;
};
