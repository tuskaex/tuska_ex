#pragma once
#include <QMainWindow>
#include <QHash>
#include "core/Config.h"
#include "core/Models.h"

class ApiClient;
class PriceStream;
class WatchlistWidget;
class WebChartWidget;
class OrderTicket;
class AccountPanel;
class PositionsPanel;
class QLabel;
class QTimer;
class QMenu;
class QAction;
class QSplitter;
class QFrame;

// MetaTrader-style shell:
//
//   ┌─ menu bar ─────────────────────────── account · connection ─┐
//   │ Market Watch │ chart (+ one-click strip floating on it)     │
//   │  Sym Bid Ask ├──────────────────────────────────────────────┤
//   │              │ Trade / Pending / History blotter            │
//   │              │ Balance: … Equity: … Margin: …               │
//   └─ status bar ────────────────────────────────────────────────┘
//
// The menu carries only actions this terminal actually has (no File/Insert/
// Charts stubs). Services stay off the UI: MainWindow owns ApiClient and
// PriceStream and connects their signals to the widgets.
class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(const Config& cfg, QWidget* parent = nullptr);

private slots:
    void onSymbolsReceived(const QVector<SymbolSpec>& symbols);
    void onSymbolActivated(const QString& symbol);
    void onTradeResult(const TradeResult& r);
    void onApiError(const QString& context, const QString& message);
    void openSettings();
    void logout();              // clear the session and return to the sign-in card
    void applyTheme();          // restyle the bits that carry inline style sheets

private:
    void connectServices();
    void buildMenuBar();
    void rebuildAccountsMenu();
    void setStatus(const QString& text, bool error = false);
    void toggleTheme();
    void togglePrivacy();
    void refreshAll();
    void updateIdentity();      // the "name | type | account no." line by the logo
    // Money as text, or a mask when privacy mode is on.
    QString money(double v, const QString& currency = QString()) const;
    void switchAccount(const QString& accountId);

    Config       m_cfg;
    ApiClient*   m_api;
    PriceStream* m_stream;

    WatchlistWidget* m_watch;
    WebChartWidget*  m_chart;
    OrderTicket*     m_ticket;
    AccountPanel*    m_account;
    PositionsPanel*  m_positions;

    QLabel*  m_message;
    QTimer*  m_accountTimer;
    QLabel*  m_identity = nullptr;     // menu-bar left: name | type | account no.
    QMenu*   m_accountsMenu = nullptr;
    QAction* m_darkAction   = nullptr;
    QAction* m_privacyAction = nullptr;
    QAction* m_bloterAction = nullptr;  // show/hide the trade blotter
    QFrame*  m_identityDivider = nullptr;  // hairline before the first menu
    QSplitter* m_centerSplit = nullptr;

    QHash<QString, SymbolSpec> m_specs;
    QString     m_currentSymbol;
    AccountInfo m_lastAccount;          // re-rendered when privacy/theme flips
    bool        m_streamLive = false;
};
