#pragma once
#include <QWidget>
#include "core/Models.h"

class QTabWidget;
class QTableWidget;

// MT5's bottom blotter. Three tabs — Trade (open positions with live P/L),
// Pending orders, and closed-trade History — using MT5's column set:
// Symbol | Ticket | Time | Type | Volume | Price | S/L | T/P | Price | Profit.
//
// MT5's third tab is Journal; there is no log store behind this terminal, so
// that tab is deliberately absent rather than faked. Data is pushed in by
// MainWindow, which polls the REST endpoints. The ✕ on an open position closes
// every position for that symbol (the endpoint is symbol-scoped).
class PositionsPanel : public QWidget {
    Q_OBJECT
public:
    explicit PositionsPanel(QWidget* parent = nullptr);

public slots:
    void setPositions(const QVector<OpenPosition>& positions);
    void setOrders(const QVector<PendingOrder>& orders);
    void setHistory(const QVector<HistoryTrade>& history);

    void setCollapsed(bool collapsed);
    bool isCollapsed() const { return m_collapsed; }
    void setPrivacy(bool on);                    // mask the money columns
    void applyTheme();

signals:
    void closeSymbol(const QString& symbol);   // close all positions for a symbol

private:
    QTabWidget*   m_tabs;
    QTableWidget* m_posTable;
    QTableWidget* m_orderTable;
    QTableWidget* m_histTable;
    bool m_collapsed = false;
    bool m_privacy = false;

    // Last snapshots, so a privacy/theme flip can re-render without a poll.
    QVector<OpenPosition> m_lastPositions;
    QVector<PendingOrder> m_lastOrders;
    QVector<HistoryTrade> m_lastHistory;
};
