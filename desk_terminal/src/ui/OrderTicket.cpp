#include "ui/OrderTicket.h"
#include "ui/Theme.h"
#include <QDoubleSpinBox>
#include <QPushButton>
#include <QLabel>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QPainter>
#include <QStyle>
#include <QStyleOption>
#include <cmath>

// Small uppercase caption used beside the bracket inputs.
static QLabel* caption(const QString& text, QList<QLabel*>& sink) {
    auto* l = new QLabel(text);
    sink << l;
    return l;
}

OrderTicket::Tile OrderTicket::makeTile(const QString& cap) {
    Tile t;
    t.btn = new QPushButton;
    // Sized to sit inside the chart's toolbar band rather than hang below it.
    t.btn->setFixedHeight(32);
    // A floor, not a cap: wide enough for a 7-character price ("1.14088" /
    // "4096.95") at the tile's font size, and the layout still grows it for
    // longer ones like "65430.27" rather than eliding the price it exists to
    // show.
    t.btn->setMinimumWidth(48);
    t.btn->setCursor(Qt::PointingHandCursor);

    auto* v = new QVBoxLayout(t.btn);
    v->setContentsMargins(4, 1, 4, 2);
    v->setSpacing(0);
    t.caption = new QLabel(cap);
    t.caption->setAlignment(Qt::AlignCenter);
    t.price = new QLabel("—");
    t.price->setAlignment(Qt::AlignCenter);
    v->addWidget(t.caption);
    v->addWidget(t.price);

    // Clicks must reach the button, not the labels sitting on top of it.
    for (QWidget* w : t.btn->findChildren<QWidget*>())
        w->setAttribute(Qt::WA_TransparentForMouseEvents, true);
    return t;
}

void OrderTicket::styleTile(const Tile& t, const QString& base, const QString& hover) {
    // padding:0 — the global sheet gives every QPushButton 4px/10px, which on
    // these tiles is dead space around a label that already carries its own
    // margins, and it made the strip ~40px wider than it needed to be.
    t.btn->setStyleSheet(QString(
        "QPushButton{background:%1; border:none; border-radius:3px; padding:0;}"
        "QPushButton:hover{background:%2;}"
        "QPushButton:pressed{background:%1;}"
        "QPushButton:disabled{background:%3;}")
        .arg(base, hover, Theme::p().panelAlt));
    t.caption->setStyleSheet("background:transparent; color:rgba(255,255,255,0.88);"
                             "font-size:9px; font-weight:800; letter-spacing:0.8px;");
    t.price->setStyleSheet("background:transparent; color:#ffffff; font-size:11px;"
                           "font-weight:800; font-family:Consolas,monospace;");
}

OrderTicket::OrderTicket(QWidget* parent) : QWidget(parent) {
    // Opaque, bordered card — it floats over the chart canvas and has to stay
    // legible against candles of any colour.
    setAutoFillBackground(true);

    // No symbol label: the chart legend sits immediately to the left and already
    // names the symbol. Carrying it here only widened the strip until it
    // overlapped that legend text. The spread stays — nothing else shows it.
    m_spreadLabel = new QLabel("—");

    auto* headRow = new QHBoxLayout;
    headRow->setContentsMargins(0, 0, 0, 0);
    headRow->setSpacing(6);
    headRow->addWidget(m_spreadLabel);
    headRow->addStretch();

    // ── the two price tiles + the volume stepper between them ──
    m_sell = makeTile(tr("SELL"));
    m_buy  = makeTile(tr("BUY"));
    connect(m_sell.btn, &QPushButton::clicked, this, [this]() {
        emit sell(m_spec.symbol, m_volume->value(), m_sl->value(), m_tp->value());
    });
    connect(m_buy.btn, &QPushButton::clicked, this, [this]() {
        emit buy(m_spec.symbol, m_volume->value(), m_sl->value(), m_tp->value());
    });

    m_volume = new QDoubleSpinBox;
    m_volume->setDecimals(2);
    m_volume->setRange(0.01, 100.0);
    m_volume->setSingleStep(0.01);
    m_volume->setValue(0.10);
    m_volume->setAlignment(Qt::AlignCenter);
    m_volume->setButtonSymbols(QAbstractSpinBox::NoButtons);
    // 36px clipped "0.10" to "0.1(" — a spin box needs room for the caret and
    // frame on top of the digits.
    m_volume->setFixedWidth(42);
    // No spin buttons: the wheel and the up/down keys already step the value,
    // and on a strip that floats over the chart the width matters more.
    m_volume->setToolTip(tr("Volume in lots — scroll or use ↑ / ↓ to step"));

    auto* tiles = new QHBoxLayout;
    tiles->setContentsMargins(0, 0, 0, 0);
    tiles->setSpacing(2);
    tiles->addWidget(m_sell.btn);
    tiles->addWidget(m_volume);
    tiles->addWidget(m_buy.btn);

    // ── collapsible S/L + T/P row ──
    m_sl = new QDoubleSpinBox;
    m_tp = new QDoubleSpinBox;
    for (QDoubleSpinBox* s : {m_sl, m_tp}) {
        s->setDecimals(5);
        // Capped at 1e6 so the box does not size itself for a 10-digit value it
        // will never hold — no instrument here comes near it.
        s->setRange(0.0, 1e6);
        s->setSpecialValueText(tr("none"));   // 0 => none
        s->setAlignment(Qt::AlignCenter);
        s->setButtonSymbols(QAbstractSpinBox::NoButtons);
        s->setFixedWidth(84);
    }

    m_closeBtn = new QPushButton(tr("Close all"));
    m_closeBtn->setCursor(Qt::PointingHandCursor);
    m_closeBtn->setToolTip(tr("Close every open position for this symbol"));
    connect(m_closeBtn, &QPushButton::clicked, this, [this]() { emit closeAll(m_spec.symbol); });

    auto* brackets = new QHBoxLayout;
    brackets->setContentsMargins(0, 0, 0, 0);
    brackets->setSpacing(5);
    brackets->addWidget(caption(tr("S/L"), m_formLabels));
    brackets->addWidget(m_sl);
    brackets->addWidget(caption(tr("T/P"), m_formLabels));
    brackets->addWidget(m_tp);
    brackets->addStretch();
    brackets->addWidget(m_closeBtn);
    m_bracketRow = new QWidget;
    m_bracketRow->setLayout(brackets);
    m_bracketRow->hide();

    m_moreBtn = new QPushButton(QStringLiteral("⌄"));
    m_moreBtn->setFixedSize(18, 14);
    m_moreBtn->setCursor(Qt::PointingHandCursor);
    m_moreBtn->setToolTip(tr("Show S/L and T/P"));
    connect(m_moreBtn, &QPushButton::clicked, this, [this]() {
        const bool show = m_bracketRow->isHidden();
        m_bracketRow->setVisible(show);
        m_moreBtn->setText(show ? QStringLiteral("⌃") : QStringLiteral("⌄"));
        m_moreBtn->setToolTip(show ? tr("Hide S/L and T/P") : tr("Show S/L and T/P"));
        adjustSize();
    });
    headRow->addWidget(m_moreBtn);

    auto* lay = new QVBoxLayout(this);
    lay->setContentsMargins(5, 2, 5, 3);
    lay->setSpacing(2);
    lay->addLayout(headRow);
    lay->addLayout(tiles);
    lay->addWidget(m_bracketRow);

    setEnabled(false); // enabled once a symbol is chosen

    applyTheme();
    connect(Theme::notifier(), &Theme::Notifier::changed, this, &OrderTicket::applyTheme);
}

void OrderTicket::paintEvent(QPaintEvent*) {
    QStyleOption opt;
    opt.initFrom(this);
    QPainter p(this);
    style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);
}

void OrderTicket::applyTheme() {
    const auto& c = Theme::p();

    setStyleSheet(QString("OrderTicket{background:%1; border:1px solid %2; border-radius:4px;}")
                  .arg(c.panel, c.border));
    // The global sheet paints every QWidget opaque; the inner container must be
    // transparent or it stamps a window-coloured block across the card.
    m_bracketRow->setStyleSheet("background:transparent;");
    m_spreadLabel->setStyleSheet(QString("background:transparent; color:%1; font-size:10px;"
                                         "font-weight:700;").arg(c.muted));

    styleTile(m_sell, c.down, Theme::isDark() ? "#f04148" : "#d92b38");
    styleTile(m_buy,  c.up,   Theme::isDark() ? "#2ec27e" : "#169342");

    for (QLabel* l : m_formLabels)
        l->setStyleSheet(QString("background:transparent; color:%1; font-size:10px;"
                                 "font-weight:700;").arg(c.muted));

    m_moreBtn->setStyleSheet(QString(
        "QPushButton{background:%1; color:%2; border:1px solid %3; border-radius:2px;"
        "font-size:8px; font-weight:800; padding:0;}"
        "QPushButton:hover{background:%4; color:%5;}")
        .arg(c.btnBg, c.text, c.btnBorder, c.btnHover, c.textStrong));

    const QString input = QString(
        "QDoubleSpinBox{background:%1; color:%2; border:1px solid %3; border-radius:3px;"
        "padding:3px 2px; font-size:11px; font-weight:700; font-family:Consolas,monospace;}"
        "QDoubleSpinBox:focus{border-color:%4;}")
        .arg(c.inputBg, c.textStrong, c.inputBorder, c.accent);
    m_volume->setStyleSheet(input);
    m_sl->setStyleSheet(input);
    m_tp->setStyleSheet(input);

    // Destructive — stays a quiet ghost button and only tints on hover, so a
    // mis-click next to BUY/SELL never looks inviting.
    m_closeBtn->setStyleSheet(QString(
        "QPushButton{background:transparent; color:%1; border:1px solid %2;"
        "border-radius:3px; font-size:10px; font-weight:700; padding:3px 8px;}"
        "QPushButton:hover{background:%3; color:%4; border-color:%4;}")
        .arg(c.muted, c.btnBorder,
             Theme::isDark() ? "rgba(224,27,36,0.16)" : "rgba(192,28,40,0.10)", c.down));
}

void OrderTicket::setSymbolSpec(const SymbolSpec& spec) {
    m_spec   = spec;
    m_digits = spec.digits;
    m_volume->setRange(spec.minLot, spec.maxLot);
    m_volume->setSingleStep(spec.lotStep);
    if (m_volume->value() < spec.minLot) m_volume->setValue(spec.minLot);
    m_sl->setDecimals(spec.digits);
    m_tp->setDecimals(spec.digits);
    m_sell.price->setText("—");
    m_buy.price->setText("—");
    m_spreadLabel->setText("—");
    setEnabled(true);
}

void OrderTicket::updateQuote(const Quote& q) {
    if (q.symbol != m_spec.symbol) return;
    // SELL fills at the bid, BUY at the ask — each tile shows the price you get.
    m_sell.price->setText(QString::number(q.bid, 'f', m_digits));
    m_buy.price->setText(QString::number(q.ask, 'f', m_digits));
    const double points = q.spread * std::pow(10.0, m_digits - 1);
    m_spreadLabel->setText(QString::number(points, 'f', 1));
}
