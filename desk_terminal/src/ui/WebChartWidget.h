#pragma once
#include <QWidget>
#include "core/Models.h"

class ApiClient;
class PriceStream;
class ChartBridge;
class QWebEngineView;
class QWebChannel;

// Hosts the TradingView Advanced Charts library inside a QWebEngineView.
// Data flows through a ChartBridge exposed over QWebChannel as `sc`.
class WebChartWidget : public QWidget {
    Q_OBJECT
public:
    WebChartWidget(ApiClient* api, PriceStream* stream, QWidget* parent = nullptr);

    void setSymbols(const QVector<SymbolSpec>& symbols);
    void showSymbol(const QString& symbol);
    void setPositions(const QVector<OpenPosition>& positions);   // feeds broker adapter
    void setTheme(const QString& theme);   // "dark" | "light" -> TradingView + overlay

    // Floats a widget over the top-left of the chart canvas — MT5 parks its
    // one-click trading panel there. The widget is reparented onto this one and
    // kept above the web view; it is NOT put in the layout, so it never steals
    // space from the chart.
    void setOverlayWidget(QWidget* w);

protected:
    void resizeEvent(QResizeEvent* e) override;

private:
    static QString resolveIndexHtml();   // locate web/index.html
    void positionOverlay();

    ChartBridge*    m_bridge;
    QWebEngineView* m_view;
    QWebChannel*    m_channel;
    QWidget*        m_overlay = nullptr;
};
