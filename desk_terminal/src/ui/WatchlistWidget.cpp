#include "ui/WatchlistWidget.h"
#include "ui/Theme.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QTableWidget>
#include <QHeaderView>
#include <QMenu>
#include <QMap>
#include <QPoint>
#include <QTimer>
#include <QTime>
#include <QDateTime>
#include <QFont>
#include <QColor>
#include <cmath>

// MT5 marks direction with a small arrow beside the symbol.
static const char* ARROW_UP   = "\xE2\x96\xB2";   // ▲
static const char* ARROW_DOWN = "\xE2\x96\xBC";   // ▼
static const char* ARROW_FLAT = "\xE2\x97\x8B";   // ○
static const char* STAR       = "\xE2\x98\x85";   // ★

QString WatchlistWidget::marketGroup(const QString& category) {
    const QString c = category.toLower();
    if (c.startsWith("forex"))                              return "Forex";
    if (c.contains("crypto"))                               return "Crypto";
    if (c.contains("commodit") || c.contains("metal"))      return "Commodities";
    if (c.contains("index") || c.contains("indices"))       return "Indices";
    if (c.contains("stock") || c.contains("equity") || c.contains("share")) return "Stocks";
    return "Other";
}

WatchlistWidget::WatchlistWidget(QWidget* parent) : QWidget(parent) {
    // "Market Watch: 16:22:00" — the clock is part of MT5's panel title and is
    // the quickest confirmation that the terminal is still ticking.
    m_title = new QLabel;
    m_clock = new QTimer(this);
    m_clock->setInterval(1000);
    connect(m_clock, &QTimer::timeout, this, [this]() {
        m_title->setText(tr("Market Watch: %1").arg(QTime::currentTime().toString("HH:mm:ss")));
    });
    m_clock->start();
    m_title->setText(tr("Market Watch: %1").arg(QTime::currentTime().toString("HH:mm:ss")));

    m_search = new QLineEdit;
    m_search->setPlaceholderText(tr("Search…"));
    m_search->setClearButtonEnabled(true);
    connect(m_search, &QLineEdit::textChanged, this, [this]() { applyFilter(); });

    m_marketBtn = new QPushButton(tr("All  ▾"));
    m_marketBtn->setCursor(Qt::PointingHandCursor);
    connect(m_marketBtn, &QPushButton::clicked, this, &WatchlistWidget::openMarketMenu);

    auto* controls = new QHBoxLayout;
    controls->setContentsMargins(4, 3, 4, 3);
    controls->setSpacing(4);
    controls->addWidget(m_search, 1);
    controls->addWidget(m_marketBtn);

    m_table = new QTableWidget;
    // MT5's column set. High / Low are the day's range and Time is the last
    // tick — a quote with no time on it gives a trader no way to tell a live
    // price from one frozen since the market closed.
    m_table->setColumnCount(7);
    m_table->setHorizontalHeaderLabels({tr("Symbol"), tr("Bid"), tr("Ask"), tr("Spread"),
                                        tr("High"), tr("Low"), tr("Time")});
    m_table->verticalHeader()->setVisible(false);
    m_table->verticalHeader()->setDefaultSectionSize(20);   // MT5-tight rows
    m_table->setEditTriggers(QAbstractItemView::NoEditTriggers);
    m_table->setSelectionBehavior(QAbstractItemView::SelectRows);
    m_table->setSelectionMode(QAbstractItemView::SingleSelection);
    m_table->setShowGrid(true);
    m_table->setAlternatingRowColors(true);
    m_table->setWordWrap(false);
    // The vertical bar stays off — the list is driven by the wheel and the
    // keyboard. The horizontal one appears when it is needed, which is the
    // whole point of the column set: the panel is sized for Symbol, Bid and
    // Ask, and Spread, High, Low and Time are scrolled to rather than dropped.
    m_table->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    m_table->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    // Per-pixel, so a sideways scroll can stop between columns instead of
    // jumping a whole one at a time.
    m_table->setHorizontalScrollMode(QAbstractItemView::ScrollPerPixel);
    // Plain interactive widths that add up to the default panel width, with
    // Spread taking the slack — and the user free to drag any of them.
    // Automatic modes were tried and both failed: Stretch-on-all elided symbols
    // to "EUR…", and Stretch-on-symbol + Fixed left the fixed widths unapplied
    // and collapsed the symbol column to "…".
    // Not stretched: the last column keeping its own width is what lets the
    // row overflow the panel and become scrollable. Stretching it instead
    // would squeeze every column back into the visible width.
    m_table->horizontalHeader()->setStretchLastSection(false);
    m_table->horizontalHeader()->setSectionResizeMode(QHeaderView::Interactive);
    m_table->setColumnWidth(0, 104);
    m_table->setColumnWidth(1, 84);
    m_table->setColumnWidth(2, 84);
    m_table->setColumnWidth(3, 56);
    m_table->setColumnWidth(4, 80);
    m_table->setColumnWidth(5, 80);
    // Time is last, so stretchLastSection owns its width.

    // Every column is present; the panel is simply narrower than the row. The
    // first three are what a trader watches all day, and the rest are one
    // sideways scroll away with their headers intact.
    applyColumns();
    connect(m_table, &QTableWidget::itemSelectionChanged,
            this, &WatchlistWidget::onSelectionChanged);
    // Row index maps straight into m_all — applyFilter() rebuilds the table in
    // that order, so the two stay aligned.
    connect(m_table, &QTableWidget::cellDoubleClicked, this, [this](int row, int) {
        const QString sym = symbolAt(row);
        if (!sym.isEmpty()) emit symbolDoubleClicked(sym);
    });
    // MT5 puts Specification / New order on the row's right-click menu, and it
    // is the first place a trader coming from there looks for them.
    m_table->setContextMenuPolicy(Qt::CustomContextMenu);
    connect(m_table, &QTableWidget::customContextMenuRequested,
            this, &WatchlistWidget::openRowMenu);

    auto* lay = new QVBoxLayout(this);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->setSpacing(0);
    lay->addWidget(m_title);
    lay->addLayout(controls);
    lay->addWidget(m_table, 1);

    applyTheme();
    connect(Theme::notifier(), &Theme::Notifier::changed, this, &WatchlistWidget::applyTheme);
}

void WatchlistWidget::applyTheme() {
    const auto& c = Theme::p();
    m_title->setStyleSheet(QString("background:%1; color:%2; font-weight:600; font-size:11px;"
                                   "padding:4px 6px; border-bottom:1px solid %3;")
                           .arg(c.panelAlt, c.text, c.border));
    m_search->setStyleSheet(QString(
        "QLineEdit{background:%1; border:1px solid %2; border-radius:3px;"
        "padding:3px 6px; color:%3;}"
        "QLineEdit:focus{border:1px solid %4;}")
        .arg(c.inputBg, c.inputBorder, c.textStrong, c.accent));
    m_marketBtn->setStyleSheet(QString(
        "QPushButton{background:%1; color:%2; border:1px solid %3;"
        "border-radius:3px; padding:3px 8px; font-weight:600;}"
        "QPushButton:hover{background:%4; color:%5;}")
        .arg(c.btnBg, c.text, c.btnBorder, c.btnHover, c.textStrong));

    // Row colours live in the items, so replay the last tick for each row.
    for (auto it = m_rows.begin(); it != m_rows.end(); ++it) {
        const Row& r = it.value();
        if (r.row < 0) continue;
        if (auto* bid = m_table->item(r.row, 1))
            bid->setForeground(QColor(r.dir > 0 ? c.up : r.dir < 0 ? c.down : c.text));
        if (auto* ask = m_table->item(r.row, 2))
            ask->setForeground(QColor(r.dir > 0 ? c.up : r.dir < 0 ? c.down : c.text));
        if (auto* sym = m_table->item(r.row, 0))
            sym->setForeground(QColor(r.dir > 0 ? c.up : r.dir < 0 ? c.down : c.muted));
    }
}

void WatchlistWidget::setSymbols(const QVector<SymbolSpec>& symbols) {
    m_all = symbols;
    m_rows.clear();
    m_selected.clear();

    const auto& c = Theme::p();
    QFont mono("Consolas");
    mono.setStyleHint(QFont::Monospace);

    m_selecting = true;
    m_table->setRowCount(symbols.size());
    int r = 0;
    for (const SymbolSpec& s : symbols) {
        auto* sym = new QTableWidgetItem(symbolLabel(s.symbol, ARROW_FLAT));
        sym->setForeground(QColor(c.muted));

        for (int col = 1; col < m_table->columnCount(); ++col) {
            auto* it = new QTableWidgetItem("—");
            it->setTextAlignment(Qt::AlignRight | Qt::AlignVCenter);
            it->setFont(mono);
            m_table->setItem(r, col, it);
        }
        m_table->setItem(r, 0, sym);

        Row row;
        row.row = r; row.digits = s.digits; row.group = marketGroup(s.category);
        m_rows.insert(s.symbol, row);
        ++r;
    }
    m_selecting = false;

    applyFilter();
    if (!symbols.isEmpty()) selectSymbol(symbols.front().symbol);
}

int WatchlistWidget::columnForKey(const QString& key) {
    if (key == "spread") return 3;
    if (key == "high")   return 4;
    if (key == "low")    return 5;
    if (key == "time")   return 6;
    return -1;
}

QString WatchlistWidget::symbolLabel(const QString& symbol, const char* arrow) const {
    const QString base = QStringLiteral("%1  %2").arg(QString::fromUtf8(arrow), symbol);
    return m_favourites.contains(symbol)
        ? QStringLiteral("%1 %2").arg(QString::fromUtf8(STAR), base)
        : base;
}

void WatchlistWidget::setFavourites(const QStringList& symbols) {
    m_favourites = symbols;
    // Repaint the stars now rather than on the next tick: an instrument whose
    // market is closed would otherwise stay unstarred until it moved again.
    for (auto it = m_rows.constBegin(); it != m_rows.constEnd(); ++it) {
        if (it->row < 0) continue;
        if (auto* cell = m_table->item(it->row, 0))
            cell->setText(symbolLabel(it.key(),
                it->dir > 0 ? ARROW_UP : it->dir < 0 ? ARROW_DOWN : ARROW_FLAT));
    }
    applyFilter();
}

void WatchlistWidget::toggleFavourite(const QString& symbol) {
    if (m_favourites.contains(symbol)) m_favourites.removeAll(symbol);
    else                               m_favourites << symbol;
    setFavourites(m_favourites);
    emit favouritesChanged(m_favourites);
}

void WatchlistWidget::applyColumns() {
    for (const char* key : {"spread", "high", "low", "time"}) {
        const int col = columnForKey(QString::fromLatin1(key));
        if (col >= 0) m_table->setColumnHidden(col, m_hidden.contains(QString::fromLatin1(key)));
    }
}

void WatchlistWidget::setHiddenColumns(const QStringList& keys) {
    m_hidden = keys;
    applyColumns();
}

QString WatchlistWidget::symbolAt(int row) const {
    if (row < 0 || row >= m_all.size()) return {};
    return m_all.at(row).symbol;
}

void WatchlistWidget::openRowMenu(const QPoint& pos) {
    const QString sym = symbolAt(m_table->rowAt(pos.y()));
    if (sym.isEmpty()) return;
    // Select first: the menu names this instrument, so the highlight has to
    // agree with it before either entry is chosen.
    selectSymbol(sym);

    const auto& c = Theme::p();
    QMenu menu(this);
    menu.setStyleSheet(QString(
        "QMenu{background:%1; border:1px solid %2; padding:3px;}"
        "QMenu::item{padding:5px 18px 5px 12px; color:%3;}"
        "QMenu::item:selected{background:%4; color:%5;}"
        "QMenu::separator{height:1px; background:%2; margin:3px 0;}")
        .arg(c.menuBg, c.menuBorder, c.text, c.menuSel, c.textStrong));

    const bool starred = m_favourites.contains(sym);
    connect(menu.addAction(starred ? tr("Remove from &favourites")
                                   : tr("Add to &favourites")),
            &QAction::triggered, this, [this, sym]() { toggleFavourite(sym); });
    menu.addSeparator();

    connect(menu.addAction(tr("&Specification…")), &QAction::triggered,
            this, [this, sym]() { emit specificationRequested(sym); });
    menu.addSeparator();

    // MT5 puts the column set on this same menu, and it is where a trader
    // looks for it. Symbol, Bid and Ask are not listed: hiding those would
    // leave the panel with nothing to say.
    QMenu* cols = menu.addMenu(tr("&Columns"));
    cols->setStyleSheet(menu.styleSheet());
    struct { const char* key; const char* text; } optional[] = {
        {"spread", QT_TR_NOOP("Spread")},
        {"high",   QT_TR_NOOP("High")},
        {"low",    QT_TR_NOOP("Low")},
        {"time",   QT_TR_NOOP("Time")},
    };
    for (const auto& oc : optional) {
        QAction* a = cols->addAction(tr(oc.text));
        a->setCheckable(true);
        const QString key = QString::fromLatin1(oc.key);
        // Checked means shown, which is the default for all four — unchecking
        // one removes it from the row entirely rather than leaving it to be
        // scrolled to.
        a->setChecked(!m_hidden.contains(key));
        connect(a, &QAction::triggered, this, [this, key](bool on) {
            if (on) m_hidden.removeAll(key);
            else if (!m_hidden.contains(key)) m_hidden << key;
            applyColumns();
            emit columnsChanged(m_hidden);
        });
    }

    connect(menu.addAction(tr("&New order…")), &QAction::triggered,
            this, [this, sym]() { emit symbolDoubleClicked(sym); });

    menu.exec(m_table->viewport()->mapToGlobal(pos));
}

void WatchlistWidget::onSelectionChanged() {
    if (m_selecting) return;
    const int r = m_table->currentRow();
    if (r < 0 || r >= m_all.size()) return;
    const QString sym = m_all.at(r).symbol;
    if (sym == m_selected) return;
    m_selected = sym;
    emit symbolActivated(sym);
}

void WatchlistWidget::selectSymbol(const QString& symbol) {
    auto it = m_rows.constFind(symbol);
    if (it == m_rows.constEnd() || it->row < 0) return;
    if (symbol == m_selected) return;
    m_selected = symbol;
    m_selecting = true;
    m_table->selectRow(it->row);
    m_selecting = false;
    emit symbolActivated(symbol);
}

void WatchlistWidget::openMarketMenu() {
    QMap<QString, int> counts;
    for (const SymbolSpec& s : m_all) counts[marketGroup(s.category)]++;

    const auto& c = Theme::p();
    QMenu menu(this);
    menu.setStyleSheet(QString(
        "QMenu{background:%1; border:1px solid %2; padding:3px;}"
        "QMenu::item{padding:5px 18px 5px 12px; color:%3;}"
        "QMenu::item:selected{background:%4; color:%5;}")
        .arg(c.menuBg, c.menuBorder, c.text, c.menuSel, c.textStrong));

    QAction* all = menu.addAction(tr("All Markets   (%1)").arg(m_all.size()));
    connect(all, &QAction::triggered, this, [this]() { setMarket(QString()); });

    // Favourites is a filter like any market group, so it belongs on the same
    // menu rather than in a control of its own. Listed even when empty, or the
    // way to use the feature would be invisible until it was already in use.
    QAction* fav = menu.addAction(tr("%1 Favourites   (%2)")
                                      .arg(QString::fromUtf8(STAR))
                                      .arg(m_favourites.size()));
    connect(fav, &QAction::triggered, this, [this]() {
        m_favOnly = true;
        m_activeGroup.clear();
        m_marketBtn->setText(QString::fromUtf8(STAR) + tr("  ▾"));
        applyFilter();
    });
    menu.addSeparator();

    const QStringList order = {"Forex", "Crypto", "Commodities", "Indices", "Stocks", "Other"};
    for (const QString& g : order) {
        if (!counts.contains(g)) continue;
        QAction* a = menu.addAction(QString("%1   (%2)").arg(g).arg(counts[g]));
        connect(a, &QAction::triggered, this, [this, g]() { setMarket(g); });
    }
    menu.exec(m_marketBtn->mapToGlobal(QPoint(0, m_marketBtn->height() + 2)));
}

void WatchlistWidget::setMarket(const QString& group) {
    m_favOnly = false;            // choosing a market is leaving favourites
    m_activeGroup = group;
    m_marketBtn->setText((group.isEmpty() ? tr("All") : group) + "  ▾");
    applyFilter();
}

void WatchlistWidget::applyFilter() {
    const QString q = m_search->text().trimmed().toUpper();
    for (const SymbolSpec& s : m_all) {
        auto it = m_rows.constFind(s.symbol);
        if (it == m_rows.constEnd() || it->row < 0) continue;
        const bool groupOk  = m_favOnly ? m_favourites.contains(s.symbol)
                                        : (m_activeGroup.isEmpty() || it->group == m_activeGroup);
        const bool searchOk = q.isEmpty()
            || s.symbol.toUpper().contains(q)
            || s.displayName.toUpper().contains(q);
        // Instruments the feed never quotes would sit here as a column of "—"
        // forever. Hide until a price arrives; updateQuote() reveals the row on
        // the first quote, so nothing tradable stays hidden.
        m_table->setRowHidden(it->row, !(groupOk && searchOk && it->hasPrice));
    }
}

void WatchlistWidget::setDailyRange(const QString& symbol, double high, double low) {
    auto it = m_rows.find(symbol);
    if (it == m_rows.end() || it->row < 0) return;
    Row& row = it.value();
    if (!(high > 0.0) || !(low > 0.0)) return;

    // Merge rather than overwrite. Ticks taken since the terminal opened can
    // already sit outside the bar the server aggregated, and a re-seed that
    // narrowed the range back would show a high the price has visibly passed.
    row.high = row.hasRange ? qMax(row.high, high) : high;
    row.low  = row.hasRange ? qMin(row.low,  low)  : low;
    row.hasRange = true;
    if (auto* h = m_table->item(row.row, 4)) h->setText(QString::number(row.high, 'f', row.digits));
    if (auto* l = m_table->item(row.row, 5)) l->setText(QString::number(row.low,  'f', row.digits));
}

void WatchlistWidget::updateQuote(const Quote& q) {
    auto it = m_rows.find(q.symbol);
    if (it == m_rows.end() || it->row < 0) return;
    Row& row = it.value();
    const auto& t = Theme::p();

    // First real quote for this symbol — it earns its place in the list.
    if (!row.hasPrice && (q.bid > 0.0 || q.ask > 0.0)) {
        row.hasPrice = true;
        applyFilter();
    }

    if (q.bid > row.lastBid)      row.dir = 1;
    else if (q.bid < row.lastBid) row.dir = -1;
    row.lastBid = q.bid;

    const QColor dirColor(row.dir > 0 ? t.up : row.dir < 0 ? t.down : t.text);

    if (auto* sym = m_table->item(row.row, 0)) {
        const char* arrow = row.dir > 0 ? ARROW_UP : row.dir < 0 ? ARROW_DOWN : ARROW_FLAT;
        sym->setText(symbolLabel(q.symbol, arrow));
        sym->setForeground(dirColor);
    }
    if (auto* bid = m_table->item(row.row, 1)) {
        bid->setText(QString::number(q.bid, 'f', row.digits));
        bid->setForeground(dirColor);
    }
    if (auto* ask = m_table->item(row.row, 2)) {
        ask->setText(QString::number(q.ask, 'f', row.digits));
        ask->setForeground(dirColor);
    }
    // Spread in points, the unit MT5 shows it in.
    if (auto* sp = m_table->item(row.row, 3)) {
        const double points = q.spread * std::pow(10.0, row.digits - 1);
        sp->setText(QString::number(points, 'f', 1));
    }

    // Day's range, tracked at BID so it agrees with the Bid column beside it.
    if (q.bid > 0.0) {
        if (!row.hasRange) { row.high = row.low = q.bid; row.hasRange = true; }
        else { row.high = qMax(row.high, q.bid); row.low = qMin(row.low, q.bid); }
        if (auto* h = m_table->item(row.row, 4))
            h->setText(QString::number(row.high, 'f', row.digits));
        if (auto* l = m_table->item(row.row, 5))
            l->setText(QString::number(row.low,  'f', row.digits));
    }

    // Tick time, in the same local clock as the panel's own header — a feed
    // timestamp shown in UTC next to a local-time title reads as a stopped
    // clock for anyone not on UTC. An unparseable timestamp falls back to
    // arrival time rather than blanking a column that says "is this live?".
    if (auto* tm = m_table->item(row.row, 6)) {
        const QDateTime stamp = q.timestamp.isValid() ? q.timestamp.toLocalTime()
                                                      : QDateTime::currentDateTime();
        tm->setText(stamp.time().toString("HH:mm:ss"));
    }
}
