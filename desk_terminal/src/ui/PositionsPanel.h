#pragma once
#include <QWidget>
#include <QDate>
#include "core/Models.h"

class QTabWidget;
class QTableWidget;
class QComboBox;
class QDateEdit;

// MT5's bottom blotter. Three tabs — Trade (open positions with live P/L),
// Pending orders, and closed-trade History — using MT5's column set:
// Symbol | Ticket | Time | Type | Volume | Price | S/L | T/P | Price | Profit.
//
// MT5's third tab is Journal; there is no log store behind this terminal, so
// that tab is deliberately absent rather than faked. Data is pushed in by
// MainWindow, which polls the REST endpoints.
//
// The ✕ on a row closes THAT position and nothing else. It used to emit a
// symbol and close every position for it, which meant a trader with two BTCUSD
// lots open lost both when they meant to close one.
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
    // One specific position. symbol/lots are carried only so the confirmation
    // can name what is about to be closed.
    void closePosition(const QString& positionId, const QString& symbol, double lots);

private:
    // Time filter, one per tab. Which timestamp it tests depends on the tab:
    // open time for Trade/Pending, close time for History.
    enum Range { RangeToday = 0, RangeWeek, RangeAll, RangeDay };

    // Tests an API timestamp against tab `tab`'s filter. Rows whose timestamp
    // cannot be parsed always pass: hiding a real trade because of an
    // unexpected date format is far worse than showing one the filter should
    // have excluded.
    bool passes(int tab, const QString& iso) const;
    QWidget* buildFilterBar(int tab);
    QWidget* wrapTable(int tab, QTableWidget* table);

    QTabWidget*   m_tabs;
    QTableWidget* m_posTable;
    QTableWidget* m_orderTable;
    QTableWidget* m_histTable;
    QComboBox*    m_range[3] = {nullptr, nullptr, nullptr};
    QDateEdit*    m_date[3]  = {nullptr, nullptr, nullptr};
    bool m_collapsed = false;
    bool m_privacy = false;

    // Last snapshots, so a privacy/theme/filter change can re-render without a
    // poll. These always hold the UNFILTERED server data — filtering happens on
    // the way into the table, so widening the range never needs a refetch.
    QVector<OpenPosition> m_lastPositions;
    QVector<PendingOrder> m_lastOrders;
    QVector<HistoryTrade> m_lastHistory;
};
