#include "ui/OrderDialog.h"
#include "ui/Theme.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QTabWidget>
#include <QLabel>
#include <QComboBox>
#include <QDoubleSpinBox>
#include <QPushButton>
#include <cmath>

namespace {
// Quick-volume chips, same ladder the web ticket offers. Each is clamped to the
// symbol's own min/max before it is applied, so a 100-lot chip on an instrument
// capped at 10 sets 10 rather than silently failing validation server-side.
const double kLotChips[] = {0.01, 0.1, 1.0, 10.0, 100.0};
}

OrderDialog::OrderDialog(const SymbolSpec& spec, double bid, double ask,
                         int leverage, double freeMargin, QWidget* parent)
    : QDialog(parent), m_spec(spec), m_bid(bid), m_ask(ask),
      m_leverage(leverage > 0 ? leverage : 100), m_freeMargin(freeMargin) {
    setWindowTitle(tr("Order — %1").arg(spec.symbol));
    setModal(true);
    setMinimumWidth(400);

    const auto& c = Theme::p();

    auto* title = new QLabel(tr("<b>%1</b>").arg(spec.displayName.isEmpty()
                                                 ? spec.symbol : spec.displayName));
    title->setStyleSheet(QString("font-size:15px; color:%1;").arg(c.textStrong));

    m_tabs = new QTabWidget;
    m_tabs->addTab(buildMarketTab(),  tr("Market"));
    m_tabs->addTab(buildPendingTab(), tr("Pending"));

    auto* lay = new QVBoxLayout(this);
    lay->setSpacing(9);
    lay->addWidget(title);
    lay->addWidget(m_tabs);

    refreshAll();
}

// ── Market ─────────────────────────────────────────────────────────
QWidget* OrderDialog::buildMarketTab() {
    const auto& c = Theme::p();
    auto* page = new QWidget;

    auto mkTile = [&](const QString& caption, QLabel** priceOut) {
        auto* b = new QPushButton;
        b->setMinimumHeight(54);
        b->setCursor(Qt::PointingHandCursor);
        auto* v = new QVBoxLayout(b);
        v->setContentsMargins(10, 6, 10, 6);
        v->setSpacing(0);
        auto* cap = new QLabel(caption);
        cap->setStyleSheet("color:rgba(255,255,255,0.85); font-size:10px; font-weight:800;"
                           "letter-spacing:1px; background:transparent;");
        auto* px = new QLabel("—");
        px->setStyleSheet("color:#ffffff; font-size:16px; font-weight:800;"
                          "font-family:Consolas,monospace; background:transparent;");
        v->addWidget(cap);
        v->addWidget(px);
        *priceOut = px;
        return b;
    };

    m_sellTile = mkTile(tr("SELL"), &m_sellPrice);
    m_buyTile  = mkTile(tr("BUY"),  &m_buyPrice);
    connect(m_sellTile, &QPushButton::clicked, this, [this]() { setMarketSide("sell"); });
    connect(m_buyTile,  &QPushButton::clicked, this, [this]() { setMarketSide("buy"); });

    m_spreadLbl = new QLabel("—");
    m_spreadLbl->setAlignment(Qt::AlignCenter);
    m_spreadLbl->setFixedWidth(56);
    m_spreadLbl->setStyleSheet(QString("color:%1; font-size:10px; font-weight:800;"
                                       "font-family:Consolas,monospace;").arg(c.muted));

    auto* tiles = new QHBoxLayout;
    tiles->setSpacing(6);
    tiles->addWidget(m_sellTile, 1);
    tiles->addWidget(m_spreadLbl);
    tiles->addWidget(m_buyTile, 1);

    const int digits = m_spec.digits;
    const double step = std::pow(10.0, -digits + 1);

    m_mktLots = new QDoubleSpinBox;
    m_mktLots->setDecimals(2);
    m_mktLots->setRange(m_spec.minLot > 0 ? m_spec.minLot : 0.01,
                        m_spec.maxLot > 0 ? m_spec.maxLot : 100.0);
    m_mktLots->setSingleStep(m_spec.lotStep > 0 ? m_spec.lotStep : 0.01);
    m_mktLots->setValue(m_mktLots->minimum());
    m_mktLots->setMinimumHeight(32);
    connect(m_mktLots, &QDoubleSpinBox::valueChanged, this, [this]() { refreshMarket(); });

    auto* chips = new QHBoxLayout;
    chips->setSpacing(4);
    for (double v : kLotChips) {
        auto* b = new QPushButton(QString::number(v, 'f', v < 1.0 ? 2 : (v < 10.0 ? 2 : 0)));
        b->setMinimumHeight(26);
        b->setCursor(Qt::PointingHandCursor);
        b->setStyleSheet(QString(
            "QPushButton{background:%1; color:%2; border:1px solid %3; border-radius:5px;"
            "font-size:11px; font-weight:700;}"
            "QPushButton:hover{border-color:%4; color:%5;}")
            .arg(c.btnBg, c.muted, c.btnBorder, c.accent, c.textStrong));
        connect(b, &QPushButton::clicked, this, [this, v]() {
            m_mktLots->setValue(qBound(m_mktLots->minimum(), v, m_mktLots->maximum()));
        });
        chips->addWidget(b, 1);
    }

    auto mkBracket = [&]() {
        auto* s = new QDoubleSpinBox;
        s->setDecimals(digits);
        s->setRange(0.0, 1e7);
        s->setSingleStep(step);
        s->setSpecialValueText(tr("none"));   // 0 => not set
        s->setValue(0.0);
        s->setMinimumHeight(32);
        return s;
    };
    m_mktSl = mkBracket();
    m_mktTp = mkBracket();

    auto cap = [&](const QString& t) {
        auto* l = new QLabel(t);
        l->setStyleSheet(QString("color:%1; font-size:10px; font-weight:800;"
                                 "letter-spacing:1px;").arg(c.muted));
        return l;
    };

    auto* form = new QGridLayout;
    form->setHorizontalSpacing(10);
    form->setVerticalSpacing(6);
    form->addWidget(cap(tr("STOP LOSS")),   0, 0);
    form->addWidget(cap(tr("TAKE PROFIT")), 0, 1);
    form->addWidget(m_mktSl,                1, 0);
    form->addWidget(m_mktTp,                1, 1);

    m_marginLbl = new QLabel;
    m_marginLbl->setStyleSheet(QString("color:%1; font-size:11px;"
                                       "font-family:Consolas,monospace;").arg(c.muted));

    m_mktSubmit = new QPushButton;
    m_mktSubmit->setMinimumHeight(38);
    m_mktSubmit->setCursor(Qt::PointingHandCursor);
    connect(m_mktSubmit, &QPushButton::clicked, this, &QDialog::accept);

    auto* cancel = new QPushButton(tr("Cancel"));
    cancel->setMinimumHeight(38);
    connect(cancel, &QPushButton::clicked, this, &QDialog::reject);

    auto* actions = new QHBoxLayout;
    actions->setSpacing(8);
    actions->addWidget(cancel, 1);
    actions->addWidget(m_mktSubmit, 2);

    auto* v = new QVBoxLayout(page);
    v->setSpacing(8);
    v->addLayout(tiles);
    v->addWidget(cap(tr("VOLUME")));
    v->addWidget(m_mktLots);
    v->addLayout(chips);
    v->addLayout(form);
    v->addWidget(m_marginLbl);
    v->addStretch(1);
    v->addLayout(actions);
    return page;
}

void OrderDialog::setMarketSide(const QString& side) {
    m_marketSide = side;
    refreshMarket();
}

void OrderDialog::refreshMarket() {
    const auto& c = Theme::p();
    const int digits = m_spec.digits;
    const bool buy = (m_marketSide == "buy");

    m_sellPrice->setText(m_bid > 0 ? QString::number(m_bid, 'f', digits) : QStringLiteral("—"));
    m_buyPrice->setText(m_ask > 0 ? QString::number(m_ask, 'f', digits) : QStringLiteral("—"));

    // Spread in points, the unit the rest of the terminal quotes it in.
    if (m_bid > 0 && m_ask > 0) {
        const double pts = (m_ask - m_bid) * std::pow(10.0, digits - 1);
        m_spreadLbl->setText(QString::number(pts, 'f', 1));
    } else {
        m_spreadLbl->setText(QStringLiteral("—"));
    }

    // The unselected tile is dimmed rather than hidden: both prices stay
    // readable, which is the point of showing them side by side.
    auto paint = [&](QPushButton* b, const QString& colour, bool on) {
        b->setStyleSheet(QString(
            "QPushButton{background:%1; border:2px solid %2; border-radius:8px;}"
            "QPushButton:hover{background:%3;}")
            .arg(on ? colour : c.panelAlt,
                 on ? colour : c.border,
                 colour));
    };
    paint(m_sellTile, c.down, !buy);
    paint(m_buyTile,  c.up,   buy);

    // Same formula the b-book engine uses server-side:
    //   margin = lots * contractSize * fillPrice / leverage
    // Shown before the order goes out so a rejection for insufficient margin is
    // visible here rather than coming back as a server error.
    const double refPx = buy ? m_ask : m_bid;
    const double margin = (refPx > 0)
        ? m_mktLots->value() * m_spec.contractSize * refPx / double(m_leverage)
        : 0.0;
    const bool affordable = (m_freeMargin <= 0.0) || (margin <= m_freeMargin);
    m_marginLbl->setText(tr("Margin ≈ %1    Free margin %2")
                         .arg(QString::number(margin, 'f', 2),
                              QString::number(m_freeMargin, 'f', 2)));
    m_marginLbl->setStyleSheet(QString("color:%1; font-size:11px;"
                                       "font-family:Consolas,monospace;")
                               .arg(affordable ? c.muted : c.warn));

    m_mktSubmit->setText(buy ? tr("BUY %1").arg(m_spec.symbol)
                             : tr("SELL %1").arg(m_spec.symbol));
    m_mktSubmit->setStyleSheet(QString(
        "QPushButton{background:%1; color:#ffffff; border:none; border-radius:8px;"
        "font-weight:800; letter-spacing:1px;}"
        "QPushButton:disabled{background:%2; color:%3;}")
        .arg(buy ? c.up : c.down, c.btnBg, c.muted));
    // No quote yet means no price to fill against; the server would reject it.
    m_mktSubmit->setEnabled(refPx > 0.0);
}

// ── Pending ────────────────────────────────────────────────────────
QWidget* OrderDialog::buildPendingTab() {
    const auto& c = Theme::p();
    auto* page = new QWidget;

    const int digits = m_spec.digits;
    const double step = std::pow(10.0, -digits + 1);

    m_live = new QLabel;
    m_live->setStyleSheet(QString("color:%1; font-size:11px; font-family:Consolas,monospace;")
                          .arg(c.muted));

    m_side = new QComboBox;
    m_side->addItem(tr("BUY"),  "buy");
    m_side->addItem(tr("SELL"), "sell");

    m_type = new QComboBox;
    m_type->addItem(tr("Limit"), "limit");
    m_type->addItem(tr("Stop"),  "stop");

    m_lots = new QDoubleSpinBox;
    m_lots->setDecimals(2);
    m_lots->setRange(m_spec.minLot > 0 ? m_spec.minLot : 0.01,
                     m_spec.maxLot > 0 ? m_spec.maxLot : 100.0);
    m_lots->setSingleStep(m_spec.lotStep > 0 ? m_spec.lotStep : 0.01);
    m_lots->setValue(m_lots->minimum());

    m_price = new QDoubleSpinBox;
    m_price->setDecimals(digits);
    m_price->setRange(0.0, 1e7);
    m_price->setSingleStep(step);
    // Seeded from the side's own side of the book, which is the price this
    // order would actually fill against.
    m_price->setValue(m_ask > 0 ? m_ask : m_bid);

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

    auto* v = new QVBoxLayout(page);
    v->setSpacing(9);
    v->addWidget(m_live);
    v->addLayout(form);
    v->addWidget(m_hint);
    v->addStretch(1);
    v->addLayout(actions);

    for (QComboBox* b : {m_side, m_type})
        connect(b, &QComboBox::currentIndexChanged, this, [this]() { refreshHint(); });
    connect(m_price, &QDoubleSpinBox::valueChanged, this, [this]() { refreshHint(); });
    return page;
}

void OrderDialog::refreshHint() {
    const auto& c = Theme::p();
    const int digits = m_spec.digits;
    const bool buy = side() == "buy";
    const bool limit = orderType() == "limit";
    const double ref = buy ? m_ask : m_bid;
    const double p = price();

    m_live->setText(tr("Bid %1   Ask %2")
                    .arg(m_bid > 0 ? QString::number(m_bid, 'f', digits) : QStringLiteral("—"),
                         m_ask > 0 ? QString::number(m_ask, 'f', digits) : QStringLiteral("—")));

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
                   buy ? tr("ask") : tr("bid"), QString::number(ref, 'f', digits))
        : tr("A %1 %2 must be %3 the current %4 (%5) — the server will reject this price.")
              .arg(buy ? tr("buy") : tr("sell"), limit ? tr("limit") : tr("stop"), rule,
                   buy ? tr("ask") : tr("bid"), QString::number(ref, 'f', digits)));
    m_hint->setStyleSheet(QString("color:%1; font-size:11px;").arg(ok ? c.muted : c.warn));

    m_place->setStyleSheet(QString(
        "QPushButton{background:%1; color:#ffffff; border:none; border-radius:8px;"
        "font-weight:800;}"
        "QPushButton:hover{background:%2;}")
        .arg(buy ? c.up : c.down, buy ? c.up : c.down));
}

// ── Shared ─────────────────────────────────────────────────────────
void OrderDialog::refreshAll() {
    refreshMarket();
    refreshHint();
}

void OrderDialog::updateQuote(const Quote& q) {
    if (!q.valid || q.symbol != m_spec.symbol) return;
    m_bid = q.bid;
    m_ask = q.ask;
    refreshAll();
}

QString OrderDialog::mode() const {
    return m_tabs->currentIndex() == 0 ? QStringLiteral("market")
                                       : QStringLiteral("pending");
}

QString OrderDialog::side() const {
    return mode() == "market" ? m_marketSide : m_side->currentData().toString();
}

QString OrderDialog::orderType() const { return m_type->currentData().toString(); }

double OrderDialog::lots() const {
    return mode() == "market" ? m_mktLots->value() : m_lots->value();
}

double OrderDialog::price() const { return m_price->value(); }

double OrderDialog::stopLoss() const {
    return mode() == "market" ? m_mktSl->value() : m_sl->value();
}

double OrderDialog::takeProfit() const {
    return mode() == "market" ? m_mktTp->value() : m_tp->value();
}
