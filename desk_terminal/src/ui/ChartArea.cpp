#include "ui/ChartArea.h"
#include "ui/WebChartWidget.h"
#include "ui/Theme.h"
#include <QGridLayout>
#include <QVBoxLayout>
#include <QFrame>
#include <QLabel>
#include <QApplication>
#include <QMouseEvent>

ChartArea::ChartArea(ApiClient* api, PriceStream* stream, QWidget* parent)
    : QWidget(parent), m_api(api), m_stream(stream) {
    m_grid = new QGridLayout(this);
    m_grid->setContentsMargins(0, 0, 0, 0);
    m_grid->setSpacing(2);

    m_panes.resize(4);
    ensurePane(0);
    relayout();

    connect(qApp, &QApplication::focusChanged, this,
            [this](QWidget*, QWidget* now) { onFocusChanged(now); });
    connect(Theme::notifier(), &Theme::Notifier::changed, this, &ChartArea::applyTheme);
}

ChartArea::Pane& ChartArea::ensurePane(int index) {
    Pane& p = m_panes[index];
    if (p.chart) return p;

    p.frame = new QFrame(this);
    auto* v = new QVBoxLayout(p.frame);
    v->setContentsMargins(1, 1, 1, 1);
    v->setSpacing(0);

    // A one-line header per pane: it names the chart, marks which one the
    // watchlist will drive, and gives a click target that is not the web view
    // (which never forwards clicks to the host).
    p.title = new QLabel(tr("Chart %1").arg(index + 1), p.frame);
    p.title->setFixedHeight(18);
    p.title->setContentsMargins(6, 0, 6, 0);
    p.title->installEventFilter(this);
    p.title->setProperty("paneIndex", index);

    p.chart = new WebChartWidget(m_api, m_stream, p.frame);
    p.chart->setMinimumSize(220, 160);

    v->addWidget(p.title);
    v->addWidget(p.chart, 1);

    // Panes built after startup have missed every fan-out so far; replay them.
    if (!m_symbols.isEmpty())   p.chart->setSymbols(m_symbols);
    if (!m_positions.isEmpty()) p.chart->setPositions(m_positions);
    p.chart->setTheme(Theme::name());
    // A new pane opens on whatever the active one is showing, which is almost
    // always what a trader comparing timeframes wants as a starting point.
    const QString seed = m_panes[m_active].symbol;
    if (!seed.isEmpty()) {
        p.symbol = seed;
        p.chart->showSymbol(seed);
        p.title->setText(tr("Chart %1 — %2").arg(index + 1).arg(seed));
    }
    return p;
}

bool ChartArea::eventFilter(QObject* o, QEvent* e) {
    if (e->type() == QEvent::MouseButtonPress) {
        const QVariant idx = o->property("paneIndex");
        if (idx.isValid()) setActive(idx.toInt());
    }
    return QWidget::eventFilter(o, e);
}

void ChartArea::setChartCount(int count) {
    const int n = count >= 4 ? 4 : count >= 2 ? 2 : 1;
    if (n == m_count) return;
    m_count = n;
    for (int i = 0; i < n; ++i) ensurePane(i);
    if (m_active >= n) setActive(0);
    relayout();
}

void ChartArea::relayout() {
    // Detach everything first: QGridLayout keeps an item at its old cell
    // otherwise, and 4 -> 2 would leave the bottom row occupying dead space.
    for (Pane& p : m_panes) {
        if (!p.frame) continue;
        m_grid->removeWidget(p.frame);
        p.frame->hide();
    }
    for (int i = 0; i < m_count; ++i) {
        Pane& p = m_panes[i];
        // 1 -> one cell; 2 -> side by side; 4 -> 2x2.
        const int row = (m_count == 4) ? i / 2 : 0;
        const int col = (m_count == 1) ? 0 : (m_count == 2 ? i : i % 2);
        m_grid->addWidget(p.frame, row, col);
        p.frame->show();
    }
    for (int r = 0; r < 2; ++r)
        m_grid->setRowStretch(r, (m_count == 4 || r == 0) ? 1 : 0);
    for (int c = 0; c < 2; ++c)
        m_grid->setColumnStretch(c, (m_count == 1 && c == 1) ? 0 : 1);

    // The header row is noise when there is only one chart.
    for (Pane& p : m_panes)
        if (p.title) p.title->setVisible(m_count > 1);

    paintPaneStates();
    if (m_overlay) setOverlayWidget(m_overlay);   // re-home it on the active pane
}

void ChartArea::setActive(int index) {
    if (index < 0 || index >= m_count || index == m_active) return;
    m_active = index;
    paintPaneStates();
    if (m_overlay) setOverlayWidget(m_overlay);
    emit activeChartChanged(index);
}

void ChartArea::onFocusChanged(QWidget* now) {
    for (QWidget* w = now; w; w = w->parentWidget()) {
        for (int i = 0; i < m_count; ++i) {
            if (m_panes[i].frame && w == m_panes[i].frame) { setActive(i); return; }
        }
    }
}

void ChartArea::paintPaneStates() {
    const auto& c = Theme::p();
    for (int i = 0; i < m_panes.size(); ++i) {
        Pane& p = m_panes[i];
        if (!p.frame) continue;
        const bool active = (i == m_active) && m_count > 1;
        p.frame->setStyleSheet(QString("QFrame{background:%1; border:1px solid %2;}")
                               .arg(c.bg, active ? c.accent : c.border));
        if (p.title)
            p.title->setStyleSheet(QString(
                "background:%1; border:none; color:%2; font-size:10px; font-weight:700;")
                .arg(active ? c.cardSelBg : c.panelAlt, active ? c.textStrong : c.muted));
    }
}

void ChartArea::applyTheme() { paintPaneStates(); }

WebChartWidget* ChartArea::activeChart() const {
    return m_panes[m_active].chart;
}

void ChartArea::setSymbols(const QVector<SymbolSpec>& symbols) {
    m_symbols = symbols;
    for (Pane& p : m_panes) if (p.chart) p.chart->setSymbols(symbols);
}

void ChartArea::setPositions(const QVector<OpenPosition>& positions) {
    m_positions = positions;
    // Every pane draws the position overlay, not just the active one: a
    // position on the symbol a background pane shows still has to be visible
    // and draggable there.
    for (Pane& p : m_panes) if (p.chart) p.chart->setPositions(positions);
}

void ChartArea::setTheme(const QString& theme) {
    for (Pane& p : m_panes) if (p.chart) p.chart->setTheme(theme);
}

void ChartArea::showSymbol(const QString& symbol) {
    Pane& p = m_panes[m_active];
    if (!p.chart) return;
    p.symbol = symbol;
    p.chart->showSymbol(symbol);
    if (p.title) p.title->setText(tr("Chart %1 — %2").arg(m_active + 1).arg(symbol));
}

void ChartArea::setOverlayWidget(QWidget* overlay) {
    m_overlay = overlay;
    if (!overlay) return;
    // setOverlayWidget() reparents, so handing it to the new pane is enough to
    // take it off the old one.
    if (WebChartWidget* c = activeChart()) c->setOverlayWidget(overlay);
}
