#include "ui/MainWindow.h"
#include "ui/WatchlistWidget.h"
#include "ui/WebChartWidget.h"
#include "ui/ChartArea.h"
#include "ui/OrderTicket.h"
#include "ui/AccountPanel.h"
#include "ui/PositionsPanel.h"
#include "ui/LoginDialog.h"
#include "ui/WalletDialog.h"
#include "core/ApiClient.h"
#include "core/PriceStream.h"

#include <QSplitter>
#include <QStatusBar>
#include <QMenuBar>
#include <QMenu>
#include <QAction>
#include <QActionGroup>
#include <QLabel>
#include <QTimer>
#include <QMessageBox>
#include <QApplication>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include <QFrame>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>
#include "ui/Theme.h"

static const char* MASK = "••••••";

MainWindow::MainWindow(const Config& cfg, QWidget* parent)
    : QMainWindow(parent), m_cfg(cfg) {
    setWindowTitle(tr("TuskaEx Terminal"));
    setMinimumSize(980, 600);
    resize(1360, 840);

    m_api    = new ApiClient(m_cfg, this);
    m_stream = new PriceStream(m_cfg, this);

    // --- widgets ---
    m_watch     = new WatchlistWidget;
    m_charts    = new ChartArea(m_api, m_stream);        // 1/2/4 TradingView panes
    m_ticket    = new OrderTicket;
    m_account   = new AccountPanel;
    m_positions = new PositionsPanel;

    m_account->setPrivacy(m_cfg.privacy);
    m_positions->setPrivacy(m_cfg.privacy);

    // The one-click strip floats in the chart's toolbar band, in the gap
    // between TradingView's Indicators/undo controls and its icon cluster.
    m_charts->setOverlayWidget(m_ticket);

    // ── blotter + the account line beneath it ──
    auto* bottom = new QWidget;
    auto* bl = new QVBoxLayout(bottom);
    bl->setContentsMargins(0, 0, 0, 0);
    bl->setSpacing(0);
    bl->addWidget(m_positions, 1);
    bl->addWidget(m_account);

    // ── centre column: chart over blotter ──
    m_centerSplit = new QSplitter(Qt::Vertical);
    m_centerSplit->addWidget(m_charts);
    m_centerSplit->addWidget(bottom);
    // Without explicit floors the web view reports a very large minimum width,
    // the outer splitter can no longer shrink this column, and the market watch
    // gets squeezed off the left edge.
    m_charts->setMinimumWidth(320);
    bottom->setMinimumWidth(320);
    // A floor, not a preference: the first sizing pass runs before the window
    // has a real height, and without this the blotter was handed 0px and the
    // chart simply swallowed the whole column.
    bottom->setMinimumHeight(150);
    m_charts->setMinimumHeight(200);
    m_centerSplit->setMinimumWidth(320);
    m_centerSplit->setStretchFactor(0, 1);   // chart takes the extra space
    m_centerSplit->setStretchFactor(1, 0);
    m_centerSplit->setCollapsible(0, false);
    m_centerSplit->setCollapsible(1, false);

    // ── main split: market watch | centre column ──
    m_watch->setMinimumWidth(210);
    auto* body = new QSplitter(Qt::Horizontal);
    body->addWidget(m_watch);
    body->addWidget(m_centerSplit);
    body->setStretchFactor(0, 0);
    body->setStretchFactor(1, 1);
    body->setCollapsible(0, false);
    body->setCollapsible(1, false);
    body->setSizes({330, 1000});   // fits the market watch's four columns
    setCentralWidget(body);

    // Give the blotter a sensible starting height once the window is really
    // sized. Guard the height: on the first pass it can still be 0, and
    // {0-200, 200} is not a meaningful split.
    QTimer::singleShot(0, this, [this]() {
        const int h = m_centerSplit->height();
        if (h > 400) m_centerSplit->setSizes({h - 200, 200});
    });

    buildMenuBar();

    // --- status bar ---
    // Transient messages only (trade results, errors, connection trouble). The
    // permanent stream-status label that used to sit bottom-left is gone.
    m_message = new QLabel;
    statusBar()->addPermanentWidget(m_message);

    connectServices();
    applyTheme();
    connect(Theme::notifier(), &Theme::Notifier::changed, this, &MainWindow::applyTheme);

    // Kick off: symbols + account, then start the live stream.
    refreshAll();
    m_api->fetchSymbols();
    m_stream->start();

    // Periodic refresh — account + open positions/orders carry live P/L and move
    // with the market; history changes only on a close so it isn't polled here.
    m_accountTimer = new QTimer(this);
    m_accountTimer->setInterval(4000);
    connect(m_accountTimer, &QTimer::timeout, this, [this]() {
        m_api->fetchAccount();
        m_api->fetchPositions();
        m_api->fetchOrders();
    });
    m_accountTimer->start();
}

// --- menu bar ---------------------------------------------------------------

void MainWindow::buildMenuBar() {
    QMenuBar* bar = menuBar();

    // ── File ──
    QMenu* file = bar->addMenu(tr("&File"));
    connect(file->addAction(tr("&Settings…")), &QAction::triggered,
            this, &MainWindow::openSettings);
    connect(file->addAction(tr("&Refresh")), &QAction::triggered,
            this, &MainWindow::refreshAll);
    file->addSeparator();
    connect(file->addAction(tr("&Log out")), &QAction::triggered,
            this, &MainWindow::logout);
    connect(file->addAction(tr("E&xit")), &QAction::triggered,
            qApp, &QApplication::quit);

    // ── Accounts — rebuilt each time it opens, so a fresh sign-in shows up ──
    m_accountsMenu = bar->addMenu(tr("&Accounts"));
    connect(m_accountsMenu, &QMenu::aboutToShow, this, &MainWindow::rebuildAccountsMenu);

    // ── View ──
    QMenu* view = bar->addMenu(tr("&View"));
    m_darkAction = view->addAction(tr("&Dark theme"));
    m_darkAction->setCheckable(true);
    m_darkAction->setChecked(Theme::isDark());
    connect(m_darkAction, &QAction::triggered, this, &MainWindow::toggleTheme);

    m_privacyAction = view->addAction(tr("&Hide balances"));
    m_privacyAction->setCheckable(true);
    m_privacyAction->setChecked(m_cfg.privacy);
    connect(m_privacyAction, &QAction::triggered, this, &MainWindow::togglePrivacy);

    // ── chart layout: 1 / 2 / 4 panes ──
    view->addSeparator();
    QMenu* layout = view->addMenu(tr("&Chart layout"));
    m_layoutGroup = new QActionGroup(this);
    m_layoutGroup->setExclusive(true);
    struct { const char* text; int count; } modes[] = {
        {QT_TR_NOOP("&1 chart"),           1},
        {QT_TR_NOOP("&2 charts (side by side)"), 2},
        {QT_TR_NOOP("&4 charts (2 x 2)"),  4},
    };
    for (const auto& m : modes) {
        QAction* a = layout->addAction(tr(m.text));
        a->setCheckable(true);
        a->setChecked(m.count == 1);
        a->setData(m.count);
        m_layoutGroup->addAction(a);
        connect(a, &QAction::triggered, this, [this, c = m.count]() {
            m_charts->setChartCount(c);
            // Extra panes are useless in a sliver of height; give the charts
            // room back from the blotter when the grid grows.
            if (c > 1 && m_centerSplit->height() > 500)
                m_centerSplit->setSizes({m_centerSplit->height() - 170, 170});
        });
    }

    view->addSeparator();
    m_bloterAction = view->addAction(tr("Show &trade panel"));
    m_bloterAction->setCheckable(true);
    m_bloterAction->setChecked(true);
    connect(m_bloterAction, &QAction::triggered, this, [this](bool on) {
        m_positions->setCollapsed(!on);
        const int h = m_centerSplit->height();
        m_centerSplit->setSizes(on ? QList<int>{h - 200, 200} : QList<int>{h, 1});
    });

    // ── who you are trading as, at the far left of the menu row ──
    // A TopLeftCorner widget is laid out before the menu items, so this reads
    // "Name | Type | Account   File  Accounts  View". The brand mark already
    // sits in the window title bar, so it is not repeated here.
    auto* leftBlock = new QWidget;
    auto* lb = new QHBoxLayout(leftBlock);
    lb->setContentsMargins(10, 0, 12, 0);
    lb->setSpacing(0);
    m_identity = new QLabel;
    lb->addWidget(m_identity);

    // Matching hairline between the identity and the first menu entry. A QFrame
    // is used rather than a border on leftBlock because a plain container
    // styled through the global sheet does not reliably paint its own border.
    m_identityDivider = new QFrame;
    m_identityDivider->setFrameShape(QFrame::VLine);
    // Text-height, not row-height: it should read like the "|" already sitting
    // between the name and the account number, not like a table rule.
    m_identityDivider->setFixedSize(1, 14);
    lb->addWidget(m_identityDivider, 0, Qt::AlignVCenter);

    bar->setCornerWidget(leftBlock, Qt::TopLeftCorner);

    // No sign-out button in the menu row — signing out lives in File -> Log out.
}

void MainWindow::rebuildAccountsMenu() {
    m_accountsMenu->clear();
    const QJsonArray accts = QJsonDocument::fromJson(m_cfg.accountsJson.toUtf8()).array();
    if (accts.isEmpty()) {
        connect(m_accountsMenu->addAction(tr("Sign in to switch accounts…")),
                &QAction::triggered, this, &MainWindow::openSettings);
    } else {
        for (const QJsonValue& v : accts) {
            const QJsonObject o = v.toObject();
            const QString id  = o.value("account_id").toString();
            const QString num = m_cfg.privacy ? QString::fromUtf8(MASK)
                                              : o.value("account_number").toString();
            QAction* a = m_accountsMenu->addAction(
                QString("%1  ·  %2").arg(num, o.value("is_demo").toBool() ? tr("DEMO")
                                                                          : tr("LIVE")));
            a->setCheckable(true);
            a->setChecked(id == m_cfg.accountId);
            connect(a, &QAction::triggered, this, [this, id]() { switchAccount(id); });
        }
    }
    m_accountsMenu->addSeparator();
    connect(m_accountsMenu->addAction(tr("&Wallet…")), &QAction::triggered, this, [this]() {
        WalletDialog dlg(m_cfg, this);
        connect(&dlg, &WalletDialog::transferred, this, [this]() { m_api->fetchAccount(); });
        dlg.exec();
    });
}

// --- theme / privacy --------------------------------------------------------

void MainWindow::applyTheme() {
    updateIdentity();
    setStatus(m_message->text(), false);
    if (m_darkAction) m_darkAction->setChecked(Theme::isDark());
    if (m_identityDivider)
        m_identityDivider->setStyleSheet(
            QString("background:%1; border:none;").arg(Theme::p().border));
}

void MainWindow::toggleTheme() {
    Theme::setMode(Theme::isDark() ? Theme::Mode::Light : Theme::Mode::Dark);
    m_cfg.theme = Theme::name();
    m_cfg.save();
    m_charts->setTheme(Theme::name());    // TradingView + the position overlay
}

void MainWindow::togglePrivacy() {
    m_cfg.privacy = !m_cfg.privacy;
    m_cfg.save();
    if (m_privacyAction) m_privacyAction->setChecked(m_cfg.privacy);
    m_account->setPrivacy(m_cfg.privacy);
    m_positions->setPrivacy(m_cfg.privacy);
    updateIdentity();
    setStatus(m_cfg.privacy ? tr("Balances hidden") : tr("Balances visible"));
}

QString MainWindow::money(double v, const QString& currency) const {
    if (m_cfg.privacy) return QString::fromUtf8(MASK);
    QString s = QString("%L1").arg(v, 0, 'f', 2);
    if (!currency.isEmpty()) s += " " + currency;
    return s;
}

// "Name | Type | Account number", shown beside the logo at the left of the
// menu row. The account number is masked in privacy mode; the name is not,
// since it is not a credential.
void MainWindow::updateIdentity() {
    if (!m_identity) return;
    const auto& c = Theme::p();

    // userName is the display name from the login response; fall back to the
    // address signed in with. An API-key sign-in has neither, so the account
    // number stands alone rather than being labelled "Not signed in".
    QString name = m_cfg.userName.trimmed();
    if (name.isEmpty()) name = m_cfg.email.trimmed();

    const QString acct = m_lastAccount.valid
        ? (m_cfg.privacy ? QString::fromUtf8(MASK) : m_lastAccount.account)
        : tr("—");

    const QString sep = QString("<span style='color:%1;'> &nbsp;|&nbsp; </span>").arg(c.dim);
    if (name.isEmpty())
        m_identity->setText(QString("<span style='color:%1;font-weight:600;'>%2</span>")
                            .arg(c.textStrong, acct));
    else
        m_identity->setText(QString("<span style='color:%1;font-weight:600;'>%2</span>%3"
                                    "<span style='color:%4;'>%5</span>")
                            .arg(c.textStrong, name, sep, c.text, acct));
    m_identity->setStyleSheet("background:transparent; font-size:11px;");
    // A menu-bar corner widget gets exactly its sizeHint, and a QLabel's hint
    // for rich text is unreliable right after setText, so the line used to get
    // clipped. Size it from the plain equivalent's font metrics, with real
    // headroom — the bold segment renders wider than those metrics suggest.
    const QString plain = name.isEmpty() ? acct : QString("%1  |  %2").arg(name, acct);
    m_identity->setFixedWidth(m_identity->fontMetrics().horizontalAdvance(plain) + 52);
}

// --- wiring -----------------------------------------------------------------

void MainWindow::refreshAll() {
    m_api->fetchAccount();
    m_api->fetchPositions();
    m_api->fetchOrders();
    m_api->fetchHistory();
}

void MainWindow::connectServices() {
    // REST responses
    connect(m_api, &ApiClient::symbolsReceived, this, &MainWindow::onSymbolsReceived);
    connect(m_api, &ApiClient::accountReceived, m_account, &AccountPanel::setAccount);
    connect(m_api, &ApiClient::accountReceived, this, [this](const AccountInfo& a) {
        if (!a.valid) return;
        setStatus(QString());   // a good poll clears any stale transient error
        m_lastAccount = a;
        updateIdentity();
    });
    connect(m_api, &ApiClient::tradeResult,     this, &MainWindow::onTradeResult);
    connect(m_api, &ApiClient::errorOccurred,   this, &MainWindow::onApiError);
    connect(m_api, &ApiClient::pricesReceived,  this, [this](const QVector<Quote>& qs) {
        // The REST snapshot must reach the strip too, not just the watch list.
        // Without it the SELL/BUY tiles sat on "—" until the symbol happened to
        // tick — which on a quiet or closed market could be a long wait.
        for (const Quote& q : qs) {
            m_watch->updateQuote(q);
            m_ticket->updateQuote(q);
        }
    });

    // Market watch selection
    connect(m_watch, &WatchlistWidget::symbolActivated, this, &MainWindow::onSymbolActivated);

    // The chart (TradingView) pulls bars + ticks itself via the ChartBridge,
    // so no bars/tick wiring is needed here for it.

    // One-click strip -> trade endpoints
    connect(m_ticket, &OrderTicket::buy, this,
            [this](const QString& s, double v, double sl, double tp) {
        m_api->placeOrder("BUY", s, v, sl, tp, "terminal");
    });
    connect(m_ticket, &OrderTicket::sell, this,
            [this](const QString& s, double v, double sl, double tp) {
        m_api->placeOrder("SELL", s, v, sl, tp, "terminal");
    });
    connect(m_ticket, &OrderTicket::closeAll, this, [this](const QString& s) {
        if (QMessageBox::question(this, tr("Close positions"),
                tr("Close ALL open %1 positions?").arg(s)) == QMessageBox::Yes)
            m_api->closePositions(s);
    });

    // Account line refresh button
    connect(m_account, &AccountPanel::refreshRequested, this, [this]() { m_api->fetchAccount(); });

    // Blotter (positions / pending / history)
    // Floating P/L is summed from the same snapshot the blotter draws rather
    // than derived from equity-minus-balance: those two come from different
    // reads and drift apart between polls, which shows up as a status strip
    // disagreeing with the Profit column right above it.
    connect(m_api, &ApiClient::positionsReceived, this,
            [this](const QVector<OpenPosition>& ps) {
        double pl = 0.0;
        for (const OpenPosition& p : ps) pl += p.profit;
        m_account->setFloatingPL(pl, ps.size());
    });
    connect(m_api, &ApiClient::positionsReceived, m_positions, &PositionsPanel::setPositions);
    connect(m_api, &ApiClient::positionsReceived, m_charts,    &ChartArea::setPositions);
    connect(m_api, &ApiClient::ordersReceived,    m_positions, &PositionsPanel::setOrders);
    connect(m_api, &ApiClient::historyReceived,   m_positions, &PositionsPanel::setHistory);
    // One row's ✕ closes THAT position. The symbol-wide close lives on the
    // one-click strip above, and is the only thing that should ever close more
    // than the trader pointed at.
    connect(m_positions, &PositionsPanel::closePosition, this,
            [this](const QString& id, const QString& sym, double lots) {
        // Closing one position goes through /api/v1/positions/{id}/close, which
        // authenticates with the JWT. A session signed in with a pasted API key
        // has no token, so say why instead of firing a request that 401s with a
        // message no trader can act on. Never silently fall back to the
        // symbol-wide close — that is the bug this replaced.
        if (m_cfg.token.trimmed().isEmpty()) {
            QMessageBox::information(this, tr("Close position"),
                tr("Closing a single position needs an email/password sign-in.\n\n"
                   "This session is authenticated with an API key, which can only "
                   "close every %1 position at once — use CLOSE on the one-click "
                   "strip if that is what you want.").arg(sym));
            return;
        }
        if (QMessageBox::question(this, tr("Close position"),
                tr("Close this %1 position (%2 lots)?")
                    .arg(sym).arg(QString::number(lots, 'f', 2))) == QMessageBox::Yes)
            m_api->closePositionById(id);
    });

    // A close moves a row from Trade to History, but the 4s poll only refreshes
    // positions and orders — History is otherwise fetched once at startup, so
    // the trade just closed would not appear there until the next restart.
    connect(m_api, &ApiClient::positionOpResult, this,
            [this](const QString&, const QString& op, bool ok, const QString& msg) {
        if (op != "close") return;
        if (!ok) { setStatus(msg, true); return; }
        m_api->fetchPositions();
        m_api->fetchHistory();
        m_api->fetchAccount();
    });

    // Live stream fan-out
    connect(m_stream, &PriceStream::tickReceived, m_watch,  &WatchlistWidget::updateQuote);
    connect(m_stream, &PriceStream::tickReceived, m_ticket, &OrderTicket::updateQuote);
    connect(m_stream, &PriceStream::statusChanged, this, [this](const QString& s) {
        const bool live = s.startsWith("Live");
        if (live == m_streamLive) return;
        m_streamLive = live;
        // The permanent status label is gone, but a dropped feed still has to be
        // visible — stale prices that look live are the one thing a trading UI
        // must not do. Surface only the trouble states, and clear on recovery.
        setStatus(live ? QString() : s, !live);
    });
}

void MainWindow::switchAccount(const QString& accountId) {
    if (accountId.isEmpty() || accountId == m_cfg.accountId) return;
    m_cfg.accountId = accountId;
    m_cfg.save();
    m_api->setAccountId(accountId);
    refreshAll();   // reload everything for the newly selected account
    setStatus(tr("Switched trading account"));
}

void MainWindow::onSymbolsReceived(const QVector<SymbolSpec>& symbols) {
    m_specs.clear();
    for (const SymbolSpec& s : symbols)
        m_specs.insert(s.symbol, s);

    m_watch->setSymbols(symbols);
    m_charts->setSymbols(symbols);  // feed symbol metadata to every pane's datafeed
    // Snapshot prices immediately (before first ticks arrive).
    m_api->fetchPrices({});

    setStatus(tr("%1 instruments loaded").arg(symbols.size()));

    // Auto-select a liquid, likely-active symbol so the chart isn't empty on
    // startup (the alphabetical first, e.g. AAPL, is often a closed market).
    if (!symbols.isEmpty()) {
        QString pick = symbols.front().symbol;
        for (const QString& pref : {"EURUSD", "BTCUSD", "XAUUSD", "GBPUSD", "ETHUSD"}) {
            if (m_specs.contains(pref)) { pick = pref; break; }
        }
        m_watch->selectSymbol(pick);   // moves selection -> triggers onSymbolActivated
        onSymbolActivated(pick);
    }
}

void MainWindow::onSymbolActivated(const QString& symbol) {
    if (symbol.isEmpty() || symbol == m_currentSymbol) return;
    m_currentSymbol = symbol;
    if (m_specs.contains(symbol))
        m_ticket->setSymbolSpec(m_specs.value(symbol));
    m_charts->showSymbol(symbol);   // active pane only
}

void MainWindow::onTradeResult(const TradeResult& r) {
    if (r.ok) {
        QString msg;
        if (r.status == "filled")
            msg = tr("✓ %1 %2 %3 lots @ %4")
                    .arg(r.action, r.symbol).arg(r.lots).arg(r.price);
        else if (r.status == "closed")
            msg = tr("✓ Closed %1 %2 position(s), P/L %3")
                    .arg(r.closedCount).arg(r.symbol).arg(money(r.totalProfit));
        else if (r.status == "no_positions")
            msg = tr("No open %1 positions to close").arg(r.symbol);
        setStatus(msg);
        refreshAll();   // reflect the new state everywhere
    } else {
        setStatus(tr("Trade failed: %1").arg(r.message), true);
    }
}

void MainWindow::onApiError(const QString& context, const QString& message) {
    // Auth failure (token expired / invalid) — always surface so the user
    // knows to sign in again, instead of silently showing stale data.
    if (message.contains("expired", Qt::CaseInsensitive)
        || message.contains("Invalid token", Qt::CaseInsensitive)
        || message.contains("Invalid API credentials", Qt::CaseInsensitive)
        || message.contains("Not authenticated", Qt::CaseInsensitive)) {
        setStatus(tr("Session expired — open Settings and sign in again"), true);
        return;
    }
    // The account / trades lists poll every few seconds — a transient network
    // or DNS blip on one poll shouldn't flash a scary error, the next poll
    // recovers. Only surface errors from user-initiated actions (trades).
    if (context.startsWith(tr("Loading positions"))
        || context.startsWith(tr("Loading orders"))
        || context.startsWith(tr("Loading history"))
        || context.startsWith(tr("Loading account"))
        || context.startsWith(tr("Loading prices"))
        || context.startsWith(tr("Loading symbols")))
        return;
    setStatus(tr("%1 — %2").arg(context, message), true);
}

void MainWindow::setStatus(const QString& text, bool error) {
    m_message->setText(text);
    m_message->setStyleSheet(QString("background:transparent; color:%1;")
                             .arg(error ? Theme::p().down : Theme::p().muted));
}

// Ends the session and shows the sign-in card again. Credentials are wiped from
// disk; endpoints and UI preferences (theme, privacy) survive, and the email is
// kept so the form prefills. Cancelling the sign-in closes the terminal — there
// is no signed-out state worth showing, only stale numbers.
void MainWindow::logout() {
    if (QMessageBox::question(this, tr("Log out"),
            tr("Sign out of this terminal?")) != QMessageBox::Yes)
        return;

    // Stop everything that talks to the server before the token goes away, so
    // no in-flight poll comes back and repaints a signed-out screen.
    m_accountTimer->stop();
    m_stream->stop();

    m_cfg.token.clear();
    m_cfg.accountId.clear();
    m_cfg.userName.clear();
    m_cfg.accountsJson = "[]";
    m_cfg.apiKey.clear();
    m_cfg.apiSecret.clear();
    m_cfg.save();   // the config file is the only store a token lives in
    m_api->setConfig(m_cfg);

    // Clear anything on screen that belonged to the account.
    m_lastAccount = AccountInfo{};
    m_account->clear();
    m_positions->setPositions({});
    m_positions->setOrders({});
    m_positions->setHistory({});
    updateIdentity();
    setStatus(QString());

    LoginDialog dlg(m_cfg, this);
    if (dlg.exec() != QDialog::Accepted) {
        close();
        return;
    }

    m_cfg = dlg.config();
    m_api->setConfig(m_cfg);
    m_stream->setConfig(m_cfg);
    m_stream->start();
    m_accountTimer->start();
    m_api->fetchSymbols();
    refreshAll();
    updateIdentity();
    setStatus(tr("Signed in"));
}

void MainWindow::openSettings() {
    LoginDialog dlg(m_cfg, this);
    if (dlg.exec() != QDialog::Accepted)
        return;
    m_cfg = dlg.config();
    m_api->setConfig(m_cfg);
    m_stream->setConfig(m_cfg);
    m_stream->stop();
    m_stream->start();
    m_api->fetchSymbols();
    m_api->fetchAccount();
    setStatus(tr("Reconnected with updated settings"));
}
