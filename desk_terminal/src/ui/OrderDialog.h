#pragma once
#include <QDialog>
#include "core/Models.h"

class QLabel;
class QComboBox;
class QDoubleSpinBox;
class QPushButton;
class QTabWidget;

// The terminal's order window: Market and Pending in one dialog, mirroring the
// web platform's ticket so a trader moving between the two is not relearning
// the layout.
//
// This replaces the old PendingOrderDialog, which could only place limit/stop
// orders. Market orders were reachable only from the one-click strip floating
// over the chart — and that strip is hidden whenever "Show trade panel" is off,
// which is how "we can't find the order window" happened in the first place.
// Order entry now has one obvious home, on F9 (the MT5 key traders expect) and
// on a double-click in Market Watch.
//
// Why one dialog with two tabs rather than two dialogs: the fields overlap
// almost entirely (symbol, volume, SL, TP) and only price/type differ, so the
// tab keeps the shared state when a trader changes their mind about how to
// enter — switching tabs does not lose the volume and brackets already typed.
//
// The dialog stays live while it is open: MainWindow feeds it ticks, so the
// prices, margin estimate and pending-price validation track the market. A
// market order confirmed against a frozen quote is a fill at a price the
// trader never actually saw.
class OrderDialog : public QDialog {
    Q_OBJECT
public:
    OrderDialog(const SymbolSpec& spec, double bid, double ask,
                int leverage, double freeMargin, QWidget* parent = nullptr);

    QString mode() const;        // "market" | "pending"  — which tab was used
    QString side() const;        // "buy" | "sell"
    QString orderType() const;   // "limit" | "stop"      — pending tab only
    double  lots() const;
    double  price() const;       // pending tab only
    double  stopLoss() const;    // 0 => not set
    double  takeProfit() const;

public slots:
    // Fed from PriceStream while the dialog is open.
    void updateQuote(const Quote& q);

private:
    QWidget* buildMarketTab();
    QWidget* buildPendingTab();
    void     setMarketSide(const QString& side);
    void     refreshMarket();     // tiles, margin estimate, action button
    void     refreshHint();       // pending-price validation
    void     refreshAll();

    SymbolSpec m_spec;
    double m_bid = 0.0;
    double m_ask = 0.0;
    int    m_leverage = 100;
    double m_freeMargin = 0.0;

    QTabWidget* m_tabs = nullptr;

    // ── Market tab ──
    QString         m_marketSide = QStringLiteral("buy");
    QPushButton*    m_sellTile = nullptr;
    QPushButton*    m_buyTile  = nullptr;
    QLabel*         m_sellPrice = nullptr;
    QLabel*         m_buyPrice  = nullptr;
    QLabel*         m_spreadLbl = nullptr;
    QDoubleSpinBox* m_mktLots = nullptr;
    QDoubleSpinBox* m_mktSl   = nullptr;
    QDoubleSpinBox* m_mktTp   = nullptr;
    QLabel*         m_marginLbl = nullptr;
    QPushButton*    m_mktSubmit = nullptr;

    // ── Pending tab ──
    QComboBox*      m_side  = nullptr;
    QComboBox*      m_type  = nullptr;
    QDoubleSpinBox* m_lots  = nullptr;
    QDoubleSpinBox* m_price = nullptr;
    QDoubleSpinBox* m_sl    = nullptr;
    QDoubleSpinBox* m_tp    = nullptr;
    QLabel*         m_hint  = nullptr;
    QLabel*         m_live  = nullptr;
    QPushButton*    m_place = nullptr;
};
