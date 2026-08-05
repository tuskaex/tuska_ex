#include "ui/PositionsPanel.h"
#include "ui/Theme.h"
#include "ui/Icons.h"
#include <QTabWidget>
#include <QTableWidget>
#include <QHeaderView>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QComboBox>
#include <QDateEdit>
#include <QLabel>
#include <QDateTime>
#include <QLocale>
#include <QApplication>
#include <QFont>
#include <QColor>

static const char* MASK = "••••";

static QTableWidget* makeTable(const QStringList& headers) {
    auto* t = new QTableWidget;
    t->setColumnCount(headers.size());
    t->setHorizontalHeaderLabels(headers);
    t->verticalHeader()->setVisible(false);
    t->verticalHeader()->setDefaultSectionSize(20);   // MT5-tight rows
    t->setEditTriggers(QAbstractItemView::NoEditTriggers);
    t->setSelectionBehavior(QAbstractItemView::SelectRows);
    t->setShowGrid(true);
    t->setAlternatingRowColors(true);
    t->setWordWrap(false);
    // Share the width across every column instead of sizing each to its content
    // and dumping all the slack into the last one — that left a wide empty band
    // down the right of the blotter.
    t->horizontalHeader()->setStretchLastSection(false);
    t->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    return t;
}

static QTableWidgetItem* cell(const QString& text, Qt::Alignment a = Qt::AlignLeft | Qt::AlignVCenter) {
    auto* it = new QTableWidgetItem(text);
    it->setTextAlignment(a);
    it->setFlags(it->flags() & ~Qt::ItemIsEditable);
    return it;
}

// An S/L or T/P cell the trader can type into. Carries the position id and the
// level it was rendered with, so a commit knows which position it belongs to
// and whether the value actually changed — the table is rebuilt every four
// seconds, and a rebuild must not read as an edit.
static QTableWidgetItem* bracketCell(double level, const QString& positionId, int digits) {
    auto* it = new QTableWidgetItem(level > 0 ? QString::number(level, 'f', digits) : QString());
    it->setTextAlignment(Qt::AlignRight | Qt::AlignVCenter);
    it->setData(Qt::UserRole, positionId);
    it->setData(Qt::UserRole + 1, level);
    it->setToolTip(QObject::tr("Double-click to edit. Clear the cell to remove "
                               "the level."));
    return it;
}

static QString fmt(double v, int d = 2) { return QString::number(v, 'f', d); }

static QString shortTime(const QString& iso) {
    // "2026-07-17T18:35:00+00:00" -> "2026.07.17 18:35" (MT5's format)
    if (iso.size() < 16) return iso;
    return iso.left(10).replace('-', '.') + " " + iso.mid(11, 5);
}

// MT5 writes the side in lower case in the Type column ("buy" / "sell").
static QString typeText(const QString& side) { return side.toLower(); }

// MT5 tickets are short numbers; this backend issues UUIDs, and showing one in
// full made the Ticket column wider than every other column combined. Show the
// tail (which is what distinguishes them) and keep the whole id in a tooltip.
static QTableWidgetItem* ticketCell(const QString& id) {
    auto* it = cell(id.size() > 12 ? "…" + id.right(8) : id);
    it->setToolTip(id);
    return it;
}

// The API sends "2026-07-17T18:35:00+00:00", sometimes with milliseconds.
// Qt::ISODate rejects the fractional-second form, so try both.
static QDateTime parseIso(const QString& iso) {
    QDateTime dt = QDateTime::fromString(iso, Qt::ISODate);
    if (!dt.isValid()) dt = QDateTime::fromString(iso, Qt::ISODateWithMs);
    return dt;
}

bool PositionsPanel::passes(int tab, const QString& iso) const {
    const QComboBox* box = m_range[tab];
    if (!box) return true;                       // called before the bar is built
    const int mode = box->currentIndex();
    if (mode == RangeAll) return true;

    const QDateTime dt = parseIso(iso);
    if (!dt.isValid()) return true;              // see the note in the header

    // Compared in UTC because the Time column displays the server's UTC string
    // verbatim. Filtering in local time would let "Today" hide a row whose
    // visible date is today, which reads as data loss rather than a filter.
    const QDate d     = dt.toUTC().date();
    const QDate today = QDateTime::currentDateTimeUtc().date();

    switch (mode) {
    case RangeToday: return d == today;
    case RangeWeek:  return d >= today.addDays(-(today.dayOfWeek() - 1)) && d <= today;
    case RangeDay:   return m_date[tab] && d == m_date[tab]->date();
    }
    return true;
}

QWidget* PositionsPanel::buildFilterBar(int tab) {
    auto* bar = new QWidget;
    auto* h = new QHBoxLayout(bar);
    h->setContentsMargins(6, 3, 6, 3);
    h->setSpacing(6);

    auto* label = new QLabel(tr("Period:"));

    auto* box = new QComboBox;
    box->setCursor(Qt::PointingHandCursor);
    box->addItems({tr("Today"), tr("This week"), tr("All"), tr("Date")});
    // Defaults to All, NOT Today. On the Trade tab a date filter hides open
    // positions, and a position opened yesterday is still very much open — a
    // blotter that silently omits live risk on first paint is not acceptable.
    box->setCurrentIndex(RangeAll);

    auto* date = new QDateEdit(QDate::currentDate());
    date->setCalendarPopup(true);
    date->setDisplayFormat(QStringLiteral("yyyy.MM.dd"));
    date->setVisible(false);                     // only meaningful for "Date"

    m_range[tab] = box;
    m_date[tab]  = date;

    auto rerender = [this, tab]() {
        // Re-render from the last snapshot: the stored data is unfiltered, so
        // widening the range never needs another round-trip.
        if (tab == 0)      setPositions(m_lastPositions);
        else if (tab == 1) setOrders(m_lastOrders);
        else               setHistory(m_lastHistory);
    };
    connect(box, &QComboBox::currentIndexChanged, this, [date, rerender](int i) {
        date->setVisible(i == RangeDay);
        rerender();
    });
    connect(date, &QDateEdit::dateChanged, this, [rerender]() { rerender(); });

    h->addWidget(label);
    h->addWidget(box);
    h->addWidget(date);
    h->addStretch();
    return bar;
}

QWidget* PositionsPanel::wrapTable(int tab, QTableWidget* table) {
    auto* page = new QWidget;
    auto* v = new QVBoxLayout(page);
    v->setContentsMargins(0, 0, 0, 0);
    v->setSpacing(0);
    v->addWidget(buildFilterBar(tab));
    v->addWidget(table, 1);
    return page;
}

PositionsPanel::PositionsPanel(QWidget* parent) : QWidget(parent) {
    m_tabs = new QTabWidget;
    m_tabs->setDocumentMode(true);

    m_posTable = makeTable({tr("Symbol"), tr("Ticket"), tr("Time"), tr("Type"), tr("Volume"),
                            tr("Price"), tr("S/L"), tr("T/P"), tr("Price"), tr("Swap"),
                            tr("Profit"), tr("Action")});
    m_orderTable = makeTable({tr("Symbol"), tr("Ticket"), tr("Time"), tr("Type"), tr("Volume"),
                              tr("Price"), tr("S/L"), tr("T/P"), tr("Action")});
    m_histTable = makeTable({tr("Symbol"), tr("Ticket"), tr("Time"), tr("Type"), tr("Volume"),
                             tr("Price"), tr("Price"), tr("Swap"), tr("Commission"), tr("Profit")});

    // Action holds a control, not data: pin it narrow so it does not take an
    // equal share of the width like the value columns do — just wide enough for
    // the header word and a centred button.
    // 92px, not 64: the cell now holds an S/L button beside the close ✕.
    const int closeCol = m_posTable->columnCount() - 1;
    m_posTable->horizontalHeader()->setSectionResizeMode(closeCol, QHeaderView::Fixed);
    m_posTable->setColumnWidth(closeCol, 92);
    const int cancelCol = m_orderTable->columnCount() - 1;
    m_orderTable->horizontalHeader()->setSectionResizeMode(cancelCol, QHeaderView::Fixed);
    m_orderTable->setColumnWidth(cancelCol, 64);

    // Only the open-positions table takes edits, and only its S/L and T/P
    // cells are marked editable — every other item has the flag cleared.
    m_posTable->setEditTriggers(QAbstractItemView::DoubleClicked
                                | QAbstractItemView::EditKeyPressed);
    connect(m_posTable, &QTableWidget::itemChanged, this, &PositionsPanel::onBracketEdited);

    // Each tab is table + its own filter bar, so a range chosen on History does
    // not silently reach into the open-positions tab.
    m_tabs->addTab(wrapTable(0, m_posTable),   tr("Trade"));
    m_tabs->addTab(wrapTable(1, m_orderTable), tr("Pending"));
    m_tabs->addTab(wrapTable(2, m_histTable),  tr("History"));

    auto* lay = new QVBoxLayout(this);
    lay->setContentsMargins(0, 0, 0, 0);
    lay->addWidget(m_tabs);

    connect(Theme::notifier(), &Theme::Notifier::changed, this, &PositionsPanel::applyTheme);
}

void PositionsPanel::applyTheme() {
    // Colours live in the row items, so the tables are simply re-rendered.
    setPositions(m_lastPositions);
    setOrders(m_lastOrders);
    setHistory(m_lastHistory);
}

void PositionsPanel::setPrivacy(bool on) {
    m_privacy = on;
    applyTheme();   // same path: re-render every table
}

void PositionsPanel::setCollapsed(bool collapsed) {
    m_collapsed = collapsed;
    // Hide the tab area → the splitter reclaims the space for the chart above.
    m_tabs->setVisible(!collapsed);
}

// Tab caption: plain count normally, "shown/total" while a filter is hiding
// rows — otherwise a filtered tab reads as "you have no positions".
static QString tabCaption(const QString& name, int shown, int total) {
    return shown == total ? QString("%1 (%2)").arg(name).arg(total)
                          : QString("%1 (%2/%3)").arg(name).arg(shown).arg(total);
}

// True while a cell editor is open on `t`.
//
// QAbstractItemView::state() would answer this directly but is protected. The
// editor the default delegate creates for a text item is a QLineEdit parented
// into the viewport and holding focus, so that is what is looked for — and the
// type is checked, not just the ancestry, because the Action column's buttons
// live in the same viewport and keep focus after a click. Treating those as
// "editing" would freeze the blotter permanently.
static bool editorOpen(QTableWidget* t) {
    QWidget* f = QApplication::focusWidget();
    return f && f->inherits("QLineEdit") && t->viewport()->isAncestorOf(f);
}

void PositionsPanel::onBracketEdited(QTableWidgetItem* item) {
    // itemChanged fires while the table is being filled too, so every
    // setPositions() run raises it once per cell. m_populating tells a real
    // edit from a repaint.
    if (m_populating || !item) return;
    const int col = item->column();
    if (col != 6 && col != 7) return;

    const QString id = item->data(Qt::UserRole).toString();
    if (id.isEmpty()) return;

    const double was = item->data(Qt::UserRole + 1).toDouble();
    const QString text = item->text().trimmed();
    bool parsed = false;
    // An empty cell is the instruction to remove the bracket; the server reads
    // 0 as "clear it".
    const double now = text.isEmpty() ? 0.0 : QLocale().toDouble(text, &parsed);

    // Clearing the cell removes the bracket. This used to be restored instead
    // of sent, because the endpoint could not clear one — it now can, so an
    // empty cell goes through as level 0 and ApiClient turns that into an
    // explicit JSON null.
    if (!text.isEmpty() && !parsed) {
        // Unparseable: put the old value back rather than sending nonsense.
        m_populating = true;
        item->setText(was > 0 ? QString::number(was, 'f', 5) : QString());
        m_populating = false;
        return;
    }
    if (qFuzzyCompare(now + 1.0, was + 1.0)) return;   // typed the same value

    item->setData(Qt::UserRole + 1, now);
    emit bracketEdited(id, col == 6 ? QStringLiteral("sl") : QStringLiteral("tp"), now);
}

void PositionsPanel::setPositions(const QVector<OpenPosition>& positions) {
    m_lastPositions = positions;
    // A 4s poll lands while someone is halfway through typing a stop loss. The
    // snapshot is kept, but the table is left alone until the editor closes —
    // otherwise the cell is rebuilt and the half-typed value disappears.
    if (editorOpen(m_posTable)) return;

    m_populating = true;
    QVector<OpenPosition> shown;
    for (const OpenPosition& p : positions)
        if (passes(0, p.openedAt)) shown.append(p);

    const auto& c = Theme::p();
    m_tabs->setTabText(0, tabCaption(tr("Trade"), shown.size(), positions.size()));
    m_posTable->setRowCount(shown.size());
    int r = 0;
    const auto R = Qt::AlignRight | Qt::AlignVCenter;
    // Money columns are masked in privacy mode; prices are not sensitive.
    auto cash = [this](double v) {
        return m_privacy ? QString::fromUtf8(MASK) : fmt(v);
    };
    for (const OpenPosition& p : shown) {
        m_posTable->setItem(r, 0, cell(p.symbol));
        m_posTable->setItem(r, 1, ticketCell(p.id));
        m_posTable->setItem(r, 2, cell(shortTime(p.openedAt)));
        auto* typeItem = cell(typeText(p.side));
        typeItem->setForeground(p.side.compare("sell", Qt::CaseInsensitive) == 0
                                ? QColor(c.down) : QColor(c.up));
        m_posTable->setItem(r, 3, typeItem);
        m_posTable->setItem(r, 4, cell(fmt(p.lots), R));
        m_posTable->setItem(r, 5, cell(fmt(p.openPrice, 5), R));
        m_posTable->setItem(r, 6, bracketCell(p.sl, p.id, 5));
        m_posTable->setItem(r, 7, bracketCell(p.tp, p.id, 5));
        m_posTable->setItem(r, 8, cell(p.currentPrice > 0 ? fmt(p.currentPrice, 5) : QString(), R));
        m_posTable->setItem(r, 9, cell(cash(p.swap), R));
        auto* pnl = cell(cash(p.profit), R);
        pnl->setForeground(p.profit >= 0 ? QColor(c.up) : QColor(c.down));
        QFont bf = pnl->font(); bf.setBold(true); pnl->setFont(bf);
        m_posTable->setItem(r, 10, pnl);

        // A real ✕ icon rather than the glyph: several UI fonts render "✕" as a
        // hairline that all but disappears at this size.
        auto* closeBtn = new QPushButton;
        closeBtn->setFixedSize(22, 18);
        closeBtn->setCursor(Qt::PointingHandCursor);
        closeBtn->setToolTip(tr("Close this %1 position (%2 lots)").arg(p.symbol).arg(fmt(p.lots)));
        closeBtn->setIcon(Icons::close(QColor(c.down), 12));
        closeBtn->setIconSize(QSize(12, 12));
        closeBtn->setStyleSheet(QString(
            "QPushButton{background:transparent; border:1px solid %1; border-radius:3px;}"
            "QPushButton:hover{background:%2; border-color:%2;}")
            .arg(c.btnBorder, c.down));
        // Capture this row's own position: it closes one position, not the symbol.
        const OpenPosition row = p;
        connect(closeBtn, &QPushButton::clicked, this,
                [this, row]() { emit closePosition(row); });

        auto* editBtn = new QPushButton(tr("S/L"));
        editBtn->setFixedSize(30, 18);
        editBtn->setCursor(Qt::PointingHandCursor);
        editBtn->setToolTip(tr("Modify stop loss / take profit"));
        editBtn->setStyleSheet(QString(
            "QPushButton{background:transparent; border:1px solid %1; border-radius:3px;"
            "color:%2; font-size:9px; font-weight:800; padding:0;}"
            "QPushButton:hover{border-color:%3; color:%3;}")
            .arg(c.btnBorder, c.muted, c.accent));
        connect(editBtn, &QPushButton::clicked, this,
                [this, row]() { emit modifyBrackets(row); });

        // Centred in the cell — a fixed-size widget handed straight to
        // setCellWidget() sticks to the left edge.
        auto* cellWrap = new QWidget;
        auto* wrapLay = new QHBoxLayout(cellWrap);
        wrapLay->setContentsMargins(0, 0, 0, 0);
        wrapLay->setSpacing(3);
        wrapLay->addStretch();
        wrapLay->addWidget(editBtn);
        wrapLay->addWidget(closeBtn);
        wrapLay->addStretch();
        m_posTable->setCellWidget(r, 11, cellWrap);
        ++r;
    }
    m_populating = false;
}

void PositionsPanel::setOrders(const QVector<PendingOrder>& orders) {
    m_lastOrders = orders;
    QVector<PendingOrder> shown;
    for (const PendingOrder& o : orders)
        if (passes(1, o.createdAt)) shown.append(o);

    const auto& c = Theme::p();
    m_tabs->setTabText(1, tabCaption(tr("Pending"), shown.size(), orders.size()));
    m_orderTable->setRowCount(shown.size());
    int r = 0;
    const auto R = Qt::AlignRight | Qt::AlignVCenter;
    for (const PendingOrder& o : shown) {
        m_orderTable->setItem(r, 0, cell(o.symbol));
        m_orderTable->setItem(r, 1, ticketCell(o.id));
        m_orderTable->setItem(r, 2, cell(shortTime(o.createdAt)));
        // Pending orders carry both a side and an order type (limit / stop);
        // MT5 shows them as one "buy limit"-style string.
        auto* typeItem = cell((typeText(o.side) + " " + o.type.toLower()).trimmed());
        typeItem->setForeground(o.side.compare("sell", Qt::CaseInsensitive) == 0
                                ? QColor(c.down) : QColor(c.up));
        m_orderTable->setItem(r, 3, typeItem);
        m_orderTable->setItem(r, 4, cell(fmt(o.lots), R));
        m_orderTable->setItem(r, 5, cell(o.price > 0 ? fmt(o.price, 5) : QString(), R));
        m_orderTable->setItem(r, 6, cell(o.sl > 0 ? fmt(o.sl, 5) : QString(), R));
        m_orderTable->setItem(r, 7, cell(o.tp > 0 ? fmt(o.tp, 5) : QString(), R));

        auto* cancelBtn = new QPushButton;
        cancelBtn->setFixedSize(22, 18);
        cancelBtn->setCursor(Qt::PointingHandCursor);
        cancelBtn->setToolTip(tr("Cancel this pending order"));
        cancelBtn->setIcon(Icons::close(QColor(c.down), 12));
        cancelBtn->setIconSize(QSize(12, 12));
        cancelBtn->setStyleSheet(QString(
            "QPushButton{background:transparent; border:1px solid %1; border-radius:3px;}"
            "QPushButton:hover{background:%2; border-color:%2;}")
            .arg(c.btnBorder, c.down));
        const PendingOrder ord = o;
        connect(cancelBtn, &QPushButton::clicked, this,
                [this, ord]() { emit cancelOrder(ord); });

        auto* wrap = new QWidget;
        auto* wl = new QHBoxLayout(wrap);
        wl->setContentsMargins(0, 0, 0, 0);
        wl->addWidget(cancelBtn, 0, Qt::AlignCenter);
        m_orderTable->setCellWidget(r, 8, wrap);
        ++r;
    }
}

void PositionsPanel::setHistory(const QVector<HistoryTrade>& history) {
    m_lastHistory = history;
    QVector<HistoryTrade> shown;
    for (const HistoryTrade& h : history)
        if (passes(2, h.closedAt)) shown.append(h);   // closed time, not open

    const auto& c = Theme::p();
    m_tabs->setTabText(2, tabCaption(tr("History"), shown.size(), history.size()));
    m_histTable->setRowCount(shown.size());
    int r = 0;
    const auto R = Qt::AlignRight | Qt::AlignVCenter;
    auto cash = [this](double v) {
        return m_privacy ? QString::fromUtf8(MASK) : fmt(v);
    };
    for (const HistoryTrade& h : shown) {
        m_histTable->setItem(r, 0, cell(h.symbol));
        m_histTable->setItem(r, 1, ticketCell(h.id));
        m_histTable->setItem(r, 2, cell(shortTime(h.closedAt)));
        auto* typeItem = cell(typeText(h.side));
        typeItem->setForeground(h.side.compare("sell", Qt::CaseInsensitive) == 0
                                ? QColor(c.down) : QColor(c.up));
        m_histTable->setItem(r, 3, typeItem);
        m_histTable->setItem(r, 4, cell(fmt(h.lots), R));
        m_histTable->setItem(r, 5, cell(fmt(h.openPrice, 5), R));
        m_histTable->setItem(r, 6, cell(fmt(h.closePrice, 5), R));
        m_histTable->setItem(r, 7, cell(cash(h.swap), R));
        m_histTable->setItem(r, 8, cell(cash(h.commission), R));
        auto* pnl = cell(cash(h.profit), R);
        pnl->setForeground(h.profit >= 0 ? QColor(c.up) : QColor(c.down));
        m_histTable->setItem(r, 9, pnl);
        ++r;
    }
}
