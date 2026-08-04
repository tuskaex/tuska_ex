#include "ui/PendingOrderDialog.h"
#include "ui/Theme.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QLabel>
#include <QComboBox>
#include <QDoubleSpinBox>
#include <QPushButton>
#include <cmath>

PendingOrderDialog::PendingOrderDialog(const SymbolSpec& spec, double bid, double ask,
                                       QWidget* parent)
    : QDialog(parent), m_spec(spec), m_bid(bid), m_ask(ask) {
    setWindowTitle(tr("Pending order — %1").arg(spec.symbol));
    setModal(true);
    setMinimumWidth(380);

    const auto& c = Theme::p();
    const int digits = spec.digits;
    const double step = std::pow(10.0, -digits + 1);

    auto* title = new QLabel(tr("<b>Pending order</b> · %1").arg(spec.symbol));
    title->setStyleSheet(QString("font-size:15px; color:%1;").arg(c.textStrong));

    auto* live = new QLabel(tr("Bid %1   Ask %2")
                            .arg(QString::number(bid, 'f', digits),
                                 QString::number(ask, 'f', digits)));
    live->setStyleSheet(QString("color:%1; font-size:11px; font-family:Consolas,monospace;")
                        .arg(c.muted));

    m_side = new QComboBox;
    m_side->addItem(tr("BUY"),  "buy");
    m_side->addItem(tr("SELL"), "sell");

    m_type = new QComboBox;
    m_type->addItem(tr("Limit"), "limit");
    m_type->addItem(tr("Stop"),  "stop");

    m_lots = new QDoubleSpinBox;
    m_lots->setDecimals(2);
    m_lots->setRange(spec.minLot > 0 ? spec.minLot : 0.01, spec.maxLot > 0 ? spec.maxLot : 100.0);
    m_lots->setSingleStep(spec.lotStep > 0 ? spec.lotStep : 0.01);
    m_lots->setValue(m_lots->minimum());

    m_price = new QDoubleSpinBox;
    m_price->setDecimals(digits);
    m_price->setRange(0.0, 1e7);
    m_price->setSingleStep(step);
    // Seeded from the side's own side of the book, which is the price this
    // order would actually fill against.
    m_price->setValue(ask > 0 ? ask : bid);

    auto mkBracket = [&]() {
        auto* s = new QDoubleSpinBox;
        s->setDecimals(digits);
        s->setRange(0.0, 1e7);
        s->setSingleStep(step);
        s->setSpecialValueText(tr("none"));   // 0 => not set
        s->setValue(0.0);
        return s;
    };
    m_sl = mkBracket();
    m_tp = mkBracket();

    for (QWidget* w : {(QWidget*)m_side, (QWidget*)m_type, (QWidget*)m_lots,
                       (QWidget*)m_price, (QWidget*)m_sl, (QWidget*)m_tp})
        w->setMinimumHeight(32);

    auto cap = [&](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color:%1; font-size:10px; font-weight:800;"
                                 "letter-spacing:1px;").arg(c.muted));
        return l;
    };
    auto* form = new QGridLayout;
    form->setHorizontalSpacing(10);
    form->setVerticalSpacing(6);
    form->addWidget(cap(tr("SIDE")),   0, 0);  form->addWidget(cap(tr("TYPE")),  0, 1);
    form->addWidget(m_side,            1, 0);  form->addWidget(m_type,           1, 1);
    form->addWidget(cap(tr("VOLUME")), 2, 0);  form->addWidget(cap(tr("PRICE")), 2, 1);
    form->addWidget(m_lots,            3, 0);  form->addWidget(m_price,          3, 1);
    form->addWidget(cap(tr("STOP LOSS")), 4, 0); form->addWidget(cap(tr("TAKE PROFIT")), 4, 1);
    form->addWidget(m_sl,              5, 0);  form->addWidget(m_tp,             5, 1);

    m_hint = new QLabel;
    m_hint->setWordWrap(true);
    m_hint->setStyleSheet(QString("color:%1; font-size:11px;").arg(c.muted));

    auto* cancel = new QPushButton(tr("Cancel"));
    cancel->setMinimumHeight(36);
    connect(cancel, &QPushButton::clicked, this, &QDialog::reject);

    m_place = new QPushButton(tr("Place order"));
    m_place->setMinimumHeight(36);
    m_place->setCursor(Qt::PointingHandCursor);
    connect(m_place, &QPushButton::clicked, this, &QDialog::accept);

    auto* actions = new QHBoxLayout;
    actions->setSpacing(8);
    actions->addWidget(cancel, 1);
    actions->addWidget(m_place, 1);

    auto* lay = new QVBoxLayout(this);
    lay->setSpacing(9);
    lay->addWidget(title);
    lay->addWidget(live);
    lay->addSpacing(2);
    lay->addLayout(form);
    lay->addWidget(m_hint);
    lay->addSpacing(2);
    lay->addLayout(actions);

    for (QComboBox* b : {m_side, m_type})
        connect(b, &QComboBox::currentIndexChanged, this, [this]() { refreshHint(); });
    connect(m_price, &QDoubleSpinBox::valueChanged, this, [this]() { refreshHint(); });
    refreshHint();
}

void PendingOrderDialog::refreshHint() {
    const auto& c = Theme::p();
    const bool buy = side() == "buy";
    const bool limit = orderType() == "limit";
    const double ref = buy ? m_ask : m_bid;
    const double p = price();

    // A limit buys below the market and a stop buys above it (mirrored for a
    // sell). Getting this backwards is the single most common way a pending
    // order is rejected, so it is stated before the order is sent rather than
    // coming back as a server error.
    const bool wantBelow = (buy && limit) || (!buy && !limit);
    const bool ok = ref <= 0.0 || (wantBelow ? p < ref : p > ref);

    const QString rule = wantBelow ? tr("below") : tr("above");
    m_hint->setText(ok
        ? tr("A %1 %2 sits %3 the current %4 (%5).")
              .arg(buy ? tr("buy") : tr("sell"), limit ? tr("limit") : tr("stop"), rule,
                   buy ? tr("ask") : tr("bid"), QString::number(ref, 'f', m_spec.digits))
        : tr("A %1 %2 must be %3 the current %4 (%5) — the server will reject this price.")
              .arg(buy ? tr("buy") : tr("sell"), limit ? tr("limit") : tr("stop"), rule,
                   buy ? tr("ask") : tr("bid"), QString::number(ref, 'f', m_spec.digits)));
    m_hint->setStyleSheet(QString("color:%1; font-size:11px;").arg(ok ? c.muted : c.warn));

    m_place->setStyleSheet(QString(
        "QPushButton{background:%1; color:#ffffff; border:none; border-radius:8px;"
        "font-weight:800;}"
        "QPushButton:hover{background:%2;}")
        .arg(buy ? c.up : c.down, buy ? c.up : c.down));
}

QString PendingOrderDialog::side() const      { return m_side->currentData().toString(); }
QString PendingOrderDialog::orderType() const { return m_type->currentData().toString(); }
double  PendingOrderDialog::lots() const      { return m_lots->value(); }
double  PendingOrderDialog::price() const     { return m_price->value(); }
double  PendingOrderDialog::stopLoss() const  { return m_sl->value(); }
double  PendingOrderDialog::takeProfit() const{ return m_tp->value(); }
