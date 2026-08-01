#pragma once
#include <QWidget>
#include <QVector>
#include "core/Models.h"

class ApiClient;
class PriceStream;
class WebChartWidget;
class QGridLayout;
class QFrame;
class QLabel;

// Holds 1, 2 or 4 charts in a grid, MT5-style.
//
// Each WebChartWidget already builds its own ChartBridge, so the panes are
// genuinely independent: separate symbol, timeframe, drawings and datafeed. The
// watchlist drives only the ACTIVE pane, which is the one with the accent
// border — otherwise picking a symbol would overwrite every chart at once.
//
// Panes are created on demand and then kept, even when the layout shrinks back
// to one. Each is a full QWebEngineView with its own renderer process (~150 MB),
// so four charts cost real memory; they are kept rather than destroyed because
// rebuilding one throws away the symbol, timeframe and any drawings on it.
class ChartArea : public QWidget {
    Q_OBJECT
public:
    ChartArea(ApiClient* api, PriceStream* stream, QWidget* parent = nullptr);

    // 1, 2 (side by side) or 4 (2x2). Anything else is clamped.
    void setChartCount(int count);
    int  chartCount() const { return m_count; }

    WebChartWidget* activeChart() const;

    // Fan-outs — every pane needs the symbol table, the open positions and the
    // theme; only the active one follows the watchlist.
    void setSymbols(const QVector<SymbolSpec>& symbols);
    void setPositions(const QVector<OpenPosition>& positions);
    void setTheme(const QString& theme);
    void showSymbol(const QString& symbol);

    // The one-click strip floats over whichever pane is active and moves with it.
    void setOverlayWidget(QWidget* overlay);

    void applyTheme();

signals:
    void activeChartChanged(int index);

protected:
    // Clicks on a pane's header select it; the header carries a "paneIndex".
    bool eventFilter(QObject* watched, QEvent* event) override;

private:
    struct Pane {
        QFrame*         frame = nullptr;
        QLabel*         title = nullptr;
        WebChartWidget* chart = nullptr;
        QString         symbol;
    };

    Pane& ensurePane(int index);          // builds it the first time it is shown
    void  relayout();
    void  setActive(int index);
    void  paintPaneStates();
    // Walks up from the focused widget to find which pane it belongs to, so
    // clicking anywhere on a chart activates that pane. The web view swallows
    // mouse events, so focus is the only signal the host reliably sees.
    void  onFocusChanged(QWidget* now);

    ApiClient*   m_api;
    PriceStream* m_stream;
    QGridLayout* m_grid;
    QVector<Pane> m_panes;
    QWidget* m_overlay = nullptr;
    int m_count  = 1;
    int m_active = 0;
    QVector<SymbolSpec> m_symbols;      // replayed into panes built later
    QVector<OpenPosition> m_positions;
};
