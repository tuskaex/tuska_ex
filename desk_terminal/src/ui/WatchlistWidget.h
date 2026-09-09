#pragma once
#include <QWidget>
#include <QHash>
#include "core/Models.h"

class QLineEdit;
class QPushButton;
class QLabel;
class QTableWidget;
class QTimer;

// MetaTrader-style Market Watch: a dense table of
// Symbol | Bid | Ask | Spread | High | Low | Time, with a live clock in its
// header, one row per instrument. The arrow in the
// symbol column and the bid/ask colours follow the last tick's direction, which
// is how MT5 signals movement without a separate change column.
//
// Search + market-group filter sit above the table; both hide rows rather than
// rebuilding it, so scroll position and selection survive filtering.
class WatchlistWidget : public QWidget {
    Q_OBJECT
public:
    explicit WatchlistWidget(QWidget* parent = nullptr);

    void setSymbols(const QVector<SymbolSpec>& symbols);
    // Columns the trader has switched off, by key: "spread", "high", "low",
    // "time". Empty means all of them are present — the panel opens narrow and
    // the rest are scrolled to. Symbol, Bid and Ask can never be hidden; they
    // are what the panel is for.
    void setHiddenColumns(const QStringList& keys);
    QStringList hiddenColumns() const { return m_hidden; }

    // Starred instruments. The list is the trader's, so the panel takes it in
    // and hands changes back rather than owning where it is stored.
    void setFavourites(const QStringList& symbols);
    QStringList favourites() const { return m_favourites; }
    // The day's high/low from the server, seeding the High and Low columns.
    // Ticks widen them from there, so a seed that never arrives costs the
    // session's own range rather than an empty column.
    void setDailyRange(const QString& symbol, double high, double low);
    QString currentSymbol() const { return m_selected; }
    void selectSymbol(const QString& symbol);

public slots:
    void updateQuote(const Quote& q);
    void applyTheme();

signals:
    void symbolActivated(const QString& symbol);
    // Double-click is the MT5 gesture for "trade this one" — it opens the
    // order window. Kept separate from symbolActivated, which also fires on a
    // plain selection change and must not pop a dialog on every arrow key.
    void symbolDoubleClicked(const QString& symbol);
    // Right-click -> "Specification", MT5's gesture for reading an
    // instrument's contract terms.
    void specificationRequested(const QString& symbol);
    // The hidden column set changed, so it can be persisted. The panel does
    // not own the Config and must not write it.
    void columnsChanged(const QStringList& hiddenKeys);
    // A symbol was starred or unstarred, so the set can be persisted.
    void favouritesChanged(const QStringList& symbols);

private:
    struct Row {
        int     row      = -1;
        int     digits   = 5;
        double  lastBid  = 0.0;
        int     dir      = 0;     // last tick direction: -1 down, 0 flat, +1 up
        bool    hasPrice = false; // a quote has arrived; until then the row hides
        // Day's range. Seeded from the server's daily bar where there is one,
        // then widened by every tick — which is also the only source for an
        // instrument the backend has no history for yet.
        double  high     = 0.0;
        double  low      = 0.0;
        bool    hasRange = false;
        QString group;
    };

    void openMarketMenu();
    // Right-click menu on a row. Acts on the row under the cursor, which it
    // selects first — acting on the previous selection instead is how a trader
    // ends up reading the wrong instrument's terms.
    void openRowMenu(const QPoint& pos);
    // Symbol in table row `row`, or empty if the row is not one. Rows map
    // straight into m_all, which applyFilter() only ever hides rows in.
    QString symbolAt(int row) const;
    void applyColumns();          // applies the hidden set to the table
    // "★ ▲  EURUSD" — the direction arrow, with a star in front when the
    // instrument is a favourite. One place builds it so the initial fill and
    // every tick agree.
    QString symbolLabel(const QString& symbol, const char* arrow) const;
    void toggleFavourite(const QString& symbol);
    // Column index for an optional column's key, or -1.
    static int columnForKey(const QString& key);
    void applyFilter();
    void setMarket(const QString& group);
    void onSelectionChanged();
    static QString marketGroup(const QString& category);

    QLineEdit*    m_search;
    QPushButton*  m_marketBtn;
    QLabel*       m_title;
    QTableWidget* m_table;
    QTimer*       m_clock;

    QVector<SymbolSpec>  m_all;
    QString              m_activeGroup;   // "" = all
    QString              m_selected;
    QStringList          m_hidden;        // columns switched off by the trader
    QStringList          m_favourites;    // starred instruments
    bool                 m_favOnly = false;   // the filter is showing only those
    QHash<QString, Row>  m_rows;
    bool                 m_selecting = false;   // guards programmatic selection
};
