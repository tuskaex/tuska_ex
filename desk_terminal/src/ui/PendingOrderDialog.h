#pragma once
#include <QDialog>
#include "core/Models.h"

class QLabel;
class QComboBox;
class QDoubleSpinBox;
class QPushButton;

// Places a limit or stop order.
//
// The terminal could only ever fill at market: the one-click strip sends BUY
// or SELL and nothing else, and the blotter's Pending tab listed orders it had
// no way to create. This is the missing half.
//
// It goes to /api/v1/orders rather than the algo /trade endpoint, which only
// understands market fills.
class PendingOrderDialog : public QDialog {
    Q_OBJECT
public:
    PendingOrderDialog(const SymbolSpec& spec, double bid, double ask, QWidget* parent = nullptr);

    QString side() const;        // "buy" | "sell"
    QString orderType() const;   // "limit" | "stop"
    double  lots() const;
    double  price() const;
    double  stopLoss() const;    // 0 => not set
    double  takeProfit() const;

private:
    void refreshHint();

    SymbolSpec m_spec;
    double m_bid;
    double m_ask;
    QComboBox* m_side;
    QComboBox* m_type;
    QDoubleSpinBox* m_lots;
    QDoubleSpinBox* m_price;
    QDoubleSpinBox* m_sl;
    QDoubleSpinBox* m_tp;
    QLabel* m_hint;
    QPushButton* m_place;
};
