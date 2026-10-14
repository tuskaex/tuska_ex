#include "ui/OpenAccountDialog.h"
#include "ui/Theme.h"
#include "core/ApiError.h"

#include <QCheckBox>
#include <QClipboard>
#include <QComboBox>
#include <QDir>
#include <QFile>
#include <QFileDialog>
#include <QFrame>
#include <QGridLayout>
#include <QGuiApplication>
#include <QHBoxLayout>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLabel>
#include <QLineEdit>
#include <QLocale>
#include <QNetworkAccessManager>
#include <QNetworkCookie>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QProgressBar>
#include <QPushButton>
#include <QRadioButton>
#include <QRandomGenerator>
#include <QRegularExpression>
#include <QStackedWidget>
#include <QStandardPaths>
#include <QTextStream>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

#include <algorithm>

namespace {

// Every country Qt knows, by display name, so the list is neither hand-kept
// nor a freeform box the server has to guess at. The value sent is the ISO
// code, which is what the platform stores.
struct CountryEntry { QString name; QString code; };

QVector<CountryEntry> countries() {
    QVector<CountryEntry> out;
    for (const QLocale& l : QLocale::matchingLocales(QLocale::AnyLanguage,
                                                     QLocale::AnyScript,
                                                     QLocale::AnyTerritory)) {
        const QLocale::Territory t = l.territory();
        if (t == QLocale::AnyTerritory) continue;
        const QString code = QLocale::territoryToCode(t);
        if (code.isEmpty()) continue;
        out.append({QLocale::territoryToString(t), code});
    }
    std::sort(out.begin(), out.end(), [](const CountryEntry& a, const CountryEntry& b) {
        return a.name.localeAwareCompare(b.name) < 0;
    });
    out.erase(std::unique(out.begin(), out.end(),
                          [](const CountryEntry& a, const CountryEntry& b) {
                              return a.code == b.code;
                          }),
              out.end());
    return out;
}

// MT5's form layout: the caption to the left of its box, right-aligned.
QLabel* caption(const QString& text) {
    auto* l = new QLabel(text);
    l->setAlignment(Qt::AlignRight | Qt::AlignVCenter);
    return l;
}

// The leverages a trader can pick, capped at what the account type allows.
const int kLeverages[] = {1, 2, 5, 10, 20, 25, 30, 33, 50, 66, 100, 125, 200,
                          300, 400, 500, 1000, 2000};

}  // namespace

OpenAccountDialog::OpenAccountDialog(const Config& cfg, QWidget* parent)
    : QDialog(parent), m_cfg(cfg), m_net(new QNetworkAccessManager(this)) {
    setWindowTitle(tr("Open an Account"));
    setModal(true);
    setMinimumSize(760, 560);

    const auto& p = Theme::p();
    setStyleSheet(QString(
        "QDialog { background:%1; }"
        "QLabel, QRadioButton, QCheckBox { color:%2; }"
        "QLineEdit, QComboBox {"
        "  background:%3; color:%2; border:1px solid %4; border-radius:4px; padding:5px 7px; }"
        "QLineEdit:focus, QComboBox:focus { border-color:%5; }"
        "QLineEdit:disabled { color:%6; }"
        "QFrame#band { background:%7; border-bottom:1px solid %4; }")
        .arg(p.bg, p.text, p.inputBg, p.inputBorder, p.accent, p.muted, p.panel));

    auto* root = new QVBoxLayout(this);
    root->setContentsMargins(0, 0, 0, 0);
    root->setSpacing(0);

    // ── header band: page title and what it is for, as MT5 has it ──
    auto* band = new QFrame;
    band->setObjectName("band");
    auto* bandLay = new QVBoxLayout(band);
    bandLay->setContentsMargins(20, 12, 20, 12);
    bandLay->setSpacing(2);
    m_title = new QLabel;
    m_title->setStyleSheet(QString("color:%1; font-size:14px; font-weight:700;").arg(p.textStrong));
    m_subtitle = new QLabel;
    m_subtitle->setStyleSheet(QString("color:%1; padding-left:14px;").arg(p.text));
    bandLay->addWidget(m_title);
    bandLay->addWidget(m_subtitle);
    root->addWidget(band);

    auto* body = new QVBoxLayout;
    body->setContentsMargins(28, 18, 28, 10);
    m_pages = new QStackedWidget;
    m_pages->addWidget(buildTypePage());
    m_pages->addWidget(buildDetailsPage());
    m_pages->addWidget(buildOtpPage());
    m_pages->addWidget(buildDonePage());
    body->addWidget(m_pages, 1);
    m_status = new QLabel;
    m_status->setWordWrap(true);
    body->addWidget(m_status);
    root->addLayout(body, 1);

    // ── < Back   Next >   Cancel ──
    auto* line = new QFrame;
    line->setFrameShape(QFrame::HLine);
    line->setStyleSheet(QString("color:%1;").arg(p.border));
    root->addWidget(line);
    auto* btns = new QHBoxLayout;
    btns->setContentsMargins(20, 10, 20, 14);
    btns->addStretch(1);
    m_backBtn = new QPushButton(tr("< Back"));
    m_nextBtn = new QPushButton(tr("Next >"));
    m_cancelBtn = new QPushButton(tr("Cancel"));
    for (QPushButton* b : {m_backBtn, m_nextBtn, m_cancelBtn}) {
        b->setMinimumWidth(110);
        b->setCursor(Qt::PointingHandCursor);
        b->setAutoDefault(false);
    }
    m_nextBtn->setDefault(true);
    btns->addWidget(m_backBtn);
    btns->addWidget(m_nextBtn);
    btns->addSpacing(10);
    btns->addWidget(m_cancelBtn);
    root->addLayout(btns);

    connect(m_backBtn, &QPushButton::clicked, this, &OpenAccountDialog::goBack);
    connect(m_nextBtn, &QPushButton::clicked, this, &OpenAccountDialog::goNext);
    connect(m_cancelBtn, &QPushButton::clicked, this, &QDialog::reject);

    showPage(PageType);
}

// ── page 0: select account type ─────────────────────────────────────────────

QWidget* OpenAccountDialog::buildTypePage() {
    auto* w = new QWidget;
    auto* v = new QVBoxLayout(w);
    v->setContentsMargins(0, 0, 0, 0);
    v->setSpacing(14);

    auto* intro = new QLabel(tr("To start working, you need a valid trade account. If you "
                                "don't have it, you can create a demo or real account by "
                                "selecting the corresponding option below and pressing 'Next':"));
    intro->setWordWrap(true);
    v->addWidget(intro);
    v->addSpacing(8);

    m_rExisting = new QRadioButton(tr("Existing trade account"));
    m_rDemo     = new QRadioButton(tr("New demo account"));
    m_rReal     = new QRadioButton(tr("New real account"));

    auto* opts = new QVBoxLayout;
    opts->setContentsMargins(90, 0, 0, 0);
    opts->setSpacing(12);
    opts->addWidget(m_rExisting);

    m_existingBox = new QWidget;
    auto* g = new QGridLayout(m_existingBox);
    g->setContentsMargins(28, 0, 0, 0);
    g->setHorizontalSpacing(12);
    g->setVerticalSpacing(8);
    m_login = new QLineEdit(m_cfg.email.contains('@') ? QString() : m_cfg.email);
    m_login->setPlaceholderText(tr("Account number, e.g. PT12345678"));
    m_loginPw = new QLineEdit;
    m_loginPw->setEchoMode(QLineEdit::Password);
    m_loginPw->setPlaceholderText(tr("Master or investor password"));
    m_savePw = new QCheckBox(tr("Save password"));
    m_savePw->setChecked(m_cfg.rememberPassword);
    auto* server = new QLabel(QStringLiteral("TuskaEx"));
    server->setStyleSheet("font-weight:600;");
    g->addWidget(caption(tr("Login:")), 0, 0);
    g->addWidget(m_login, 0, 1);
    g->addWidget(caption(tr("Password:")), 1, 0);
    g->addWidget(m_loginPw, 1, 1);
    g->addWidget(m_savePw, 1, 2);
    g->addWidget(caption(tr("Server:")), 2, 0);
    g->addWidget(server, 2, 1);
    g->setColumnStretch(1, 1);
    opts->addWidget(m_existingBox);

    opts->addSpacing(6);
    opts->addWidget(m_rDemo);
    opts->addWidget(m_rReal);
    v->addLayout(opts);
    v->addStretch(1);

    auto sync = [this]() { m_existingBox->setEnabled(m_rExisting->isChecked()); };
    for (QRadioButton* r : {m_rExisting, m_rDemo, m_rReal})
        connect(r, &QRadioButton::toggled, this, sync);
    m_rDemo->setChecked(true);     // MT5's default
    sync();
    connect(m_loginPw, &QLineEdit::returnPressed, this, &OpenAccountDialog::goNext);
    return w;
}

// ── page 1: personal details ────────────────────────────────────────────────

QWidget* OpenAccountDialog::buildDetailsPage() {
    auto* w = new QWidget;
    auto* g = new QGridLayout(w);
    g->setContentsMargins(0, 0, 0, 0);
    g->setHorizontalSpacing(12);
    g->setVerticalSpacing(9);

    m_name = new QLineEdit;
    m_name->setPlaceholderText(tr("First and last name"));
    m_country = new QComboBox;
    for (const CountryEntry& c : countries())
        m_country->addItem(c.name, c.code);
    const int here = m_country->findData(QLocale::territoryToCode(QLocale::system().territory()));
    if (here >= 0) m_country->setCurrentIndex(here);
    m_state = new QLineEdit;
    m_city = new QLineEdit;
    m_zip = new QLineEdit;
    m_zip->setMaxLength(20);
    m_address = new QLineEdit;
    m_phone = new QLineEdit;
    m_phone->setPlaceholderText(tr("+91 9876543210"));
    m_emailIn = new QLineEdit;
    m_emailIn->setPlaceholderText(tr("you@example.com"));
    m_accountType = new QComboBox;
    m_deposit = new QComboBox;
    m_deposit->setEditable(true);
    for (int d : {1000, 3000, 5000, 10000, 25000, 50000, 100000})
        m_deposit->addItem(QString::number(d));
    m_deposit->setCurrentText(QStringLiteral("10000"));
    m_leverage = new QComboBox;
    m_newsletter = new QCheckBox(tr("I agree to subscribe to your newsletters"));

    int r = 0;
    g->addWidget(caption(tr("Name:")), r, 0);       g->addWidget(m_name, r, 1, 1, 3); ++r;
    g->addWidget(caption(tr("Country:")), r, 0);    g->addWidget(m_country, r, 1);
    g->addWidget(caption(tr("State:")), r, 2);      g->addWidget(m_state, r, 3); ++r;
    g->addWidget(caption(tr("City:")), r, 0);       g->addWidget(m_city, r, 1);
    g->addWidget(caption(tr("Zip code:")), r, 2);   g->addWidget(m_zip, r, 3); ++r;
    g->addWidget(caption(tr("Address:")), r, 0);    g->addWidget(m_address, r, 1, 1, 3); ++r;
    g->addWidget(caption(tr("Phone:")), r, 0);      g->addWidget(m_phone, r, 1);
    g->addWidget(caption(tr("Email:")), r, 2);      g->addWidget(m_emailIn, r, 3); ++r;
    g->addWidget(caption(tr("Account Type:")), r, 0); g->addWidget(m_accountType, r, 1); ++r;

    m_depositRow = new QWidget;
    auto* dr = new QHBoxLayout(m_depositRow);
    dr->setContentsMargins(0, 0, 0, 0);
    dr->addWidget(m_deposit);
    auto* usd = new QLabel(QStringLiteral("USD"));
    dr->addWidget(usd);
    dr->addStretch(1);
    auto* depCap = caption(tr("Deposit:"));
    g->addWidget(depCap, r, 0);  g->addWidget(m_depositRow, r, 1); ++r;
    // The row and its caption hide together (showPage reads this back).
    m_depositRow->setProperty("caption", QVariant::fromValue<QObject*>(depCap));

    g->addWidget(caption(tr("Leverage:")), r, 0);   g->addWidget(m_leverage, r, 1); ++r;

    // Real account without a session: the platform user needs a website
    // password and has to accept the terms. MT5 has no such rows because its
    // real accounts are made by the broker's back office afterwards.
    m_webBox = new QWidget;
    auto* wg = new QGridLayout(m_webBox);
    wg->setContentsMargins(0, 6, 0, 0);
    wg->setHorizontalSpacing(12);
    wg->setVerticalSpacing(9);
    m_webPw = new QLineEdit;
    m_webPw->setEchoMode(QLineEdit::Password);
    m_webPw->setPlaceholderText(tr("For the TuskaEx website"));
    m_webPw2 = new QLineEdit;
    m_webPw2->setEchoMode(QLineEdit::Password);
    m_webPw2->setPlaceholderText(tr("Repeat it"));
    m_terms = new QCheckBox(tr("I accept the Terms and Conditions and the Risk Disclosure"));
    wg->addWidget(caption(tr("Website password:")), 0, 0); wg->addWidget(m_webPw, 0, 1);
    wg->addWidget(caption(tr("Confirm:")), 0, 2);           wg->addWidget(m_webPw2, 0, 3);
    wg->addWidget(m_terms, 1, 1, 1, 3);
    wg->setColumnMinimumWidth(0, 110);
    g->addWidget(m_webBox, r, 0, 1, 4); ++r;

    g->addWidget(m_newsletter, r, 1, 1, 3); ++r;
    g->setRowStretch(r, 1);
    g->setColumnStretch(1, 1);
    g->setColumnStretch(3, 1);
    g->setColumnMinimumWidth(0, 110);

    // Leverage choices and the type's description follow the pick.
    connect(m_accountType, &QComboBox::currentIndexChanged, this, [this](int i) {
        if (i < 0) return;
        const QJsonObject t = QJsonDocument::fromJson(
            m_accountType->itemData(i).toString().toUtf8()).object();
        const int maxLev = qMax(1, t.value("max_leverage").toInt(100));
        const int want = t.value("leverage_default").toInt(100);
        m_leverage->clear();
        for (int l : kLeverages)
            if (l <= maxLev) m_leverage->addItem(QStringLiteral("1:%1").arg(l), l);
        int idx = m_leverage->findData(qMin(want, maxLev));
        m_leverage->setCurrentIndex(idx >= 0 ? idx : m_leverage->count() - 1);
        QStringList tip;
        if (!t.value("description").toString().isEmpty()) tip << t.value("description").toString();
        if (t.value("minimum_deposit").toDouble() > 0)
            tip << tr("Minimum deposit $%L1").arg(t.value("minimum_deposit").toDouble(), 0, 'f', 2);
        m_accountType->setToolTip(tip.join(QStringLiteral("\n")));
    });
    return w;
}

// ── page 2: email code (real account) ───────────────────────────────────────

QWidget* OpenAccountDialog::buildOtpPage() {
    auto* w = new QWidget;
    auto* g = new QGridLayout(w);
    g->setContentsMargins(0, 0, 0, 0);
    g->setHorizontalSpacing(12);
    g->setVerticalSpacing(12);
    m_otp = new QLineEdit;
    m_otp->setMaxLength(6);
    m_otp->setPlaceholderText(tr("6-digit code"));
    m_resendBtn = new QPushButton(tr("Resend code"));
    m_resendBtn->setAutoDefault(false);
    m_resendBtn->setCursor(Qt::PointingHandCursor);
    g->addWidget(caption(tr("Code:")), 0, 0);
    g->addWidget(m_otp, 0, 1);
    g->addWidget(m_resendBtn, 0, 2);
    g->setColumnStretch(1, 1);
    g->setRowStretch(1, 1);
    g->setColumnMinimumWidth(0, 110);
    connect(m_resendBtn, &QPushButton::clicked, this, &OpenAccountDialog::resendOtp);
    connect(m_otp, &QLineEdit::returnPressed, this, &OpenAccountDialog::goNext);
    return w;
}

// ── page 3: registration ────────────────────────────────────────────────────

QWidget* OpenAccountDialog::buildDonePage() {
    auto* w = new QWidget;
    auto* v = new QVBoxLayout(w);
    v->setContentsMargins(0, 0, 0, 0);
    v->setSpacing(12);

    m_regGrid = new QLabel;
    m_regGrid->setTextFormat(Qt::RichText);
    m_regGrid->setTextInteractionFlags(Qt::TextSelectableByMouse);
    v->addWidget(m_regGrid);

    m_progress = new QProgressBar;
    m_progress->setRange(0, 100);
    m_progress->setTextVisible(false);
    m_progress->setFixedHeight(18);
    m_progress->setStyleSheet(QString(
        "QProgressBar { border:1px solid %1; background:%2; border-radius:2px; }"
        "QProgressBar::chunk { background:#1f9d3a; }")
        .arg(Theme::p().border, Theme::p().inputBg));
    v->addWidget(m_progress);

    m_keepNote = new QLabel;
    m_keepNote->setTextFormat(Qt::RichText);
    m_keepNote->setTextInteractionFlags(Qt::TextSelectableByMouse);
    v->addWidget(m_keepNote);

    m_regActions = new QWidget;
    auto* h = new QHBoxLayout(m_regActions);
    h->setContentsMargins(0, 0, 0, 0);
    auto* copy = new QPushButton(tr("Copy details"));
    auto* save = new QPushButton(tr("Save to file…"));
    for (QPushButton* b : {copy, save}) {
        b->setAutoDefault(false);
        b->setCursor(Qt::PointingHandCursor);
        h->addWidget(b);
    }
    h->addStretch(1);
    connect(copy, &QPushButton::clicked, this, [this]() {
        QGuiApplication::clipboard()->setText(detailsText());
        setStatus(tr("Copied. Paste it somewhere safe."), false);
    });
    connect(save, &QPushButton::clicked, this, [this]() {
        const QString dir = QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation);
        const QString file = QFileDialog::getSaveFileName(
            this, tr("Save account details"),
            dir + QStringLiteral("/TuskaEx-%1.txt").arg(m_accountNumber), tr("Text files (*.txt)"));
        if (file.isEmpty()) return;
        QFile f(file);
        if (!f.open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Truncate)) {
            setStatus(tr("Could not save: %1").arg(f.errorString()), true);
            return;
        }
        QTextStream(&f) << detailsText();
        setStatus(tr("Saved to %1").arg(QDir::toNativeSeparators(file)), false);
    });
    m_regActions->hide();
    v->addWidget(m_regActions);
    v->addStretch(1);
    return w;
}

// ── navigation ──────────────────────────────────────────────────────────────

OpenAccountDialog::Path OpenAccountDialog::path() const {
    if (m_rExisting->isChecked()) return Path::Existing;
    if (m_rReal->isChecked())     return Path::Real;
    return Path::Demo;
}

bool OpenAccountDialog::haveSession() const {
    return !m_cfg.token.trimmed().isEmpty();
}

void OpenAccountDialog::showPage(Page p) {
    m_pages->setCurrentIndex(p);
    m_status->clear();
    switch (p) {
    case PageType:
        m_title->setText(tr("Select account type"));
        m_subtitle->setText(tr("To start working an account is required:"));
        break;
    case PageDetails: {
        const bool real = path() == Path::Real;
        m_title->setText(tr("Personal details"));
        m_subtitle->setText(tr("To open an account, please fill out all the following fields:"));
        m_depositRow->setVisible(!real);
        if (auto* c = qobject_cast<QWidget*>(m_depositRow->property("caption").value<QObject*>()))
            c->setVisible(!real);
        m_webBox->setVisible(real && !haveSession());
        // Signed in already: the account opens for that person, so their
        // email is the one on the session.
        if (real && haveSession() && m_emailIn->text().isEmpty()) m_emailIn->setText(m_cfg.email);
        if (!m_groupsLoaded || m_groupsLive != real) fetchGroups();
        m_name->setFocus();
        break;
    }
    case PageOtp:
        m_title->setText(tr("Confirm your email"));
        m_subtitle->setText(tr("We sent a 6-digit code to %1. Enter it to continue:").arg(m_email));
        m_otp->setFocus();
        break;
    case PageDone:
        m_title->setText(tr("Registration"));
        m_subtitle->setText(tr("Wait a little, please"));
        break;
    }
    m_backBtn->setEnabled(p != PageType && p != PageDone);
    m_nextBtn->setText(p == PageDone ? tr("Finish") : tr("Next >"));
    m_nextBtn->setEnabled(p != PageDone || m_finished);
}

void OpenAccountDialog::goBack() {
    if (m_busy) return;
    const int p = m_pages->currentIndex();
    if (p == PageDetails) showPage(PageType);
    else if (p == PageOtp) showPage(PageDetails);
}

void OpenAccountDialog::goNext() {
    if (m_busy) return;
    switch (m_pages->currentIndex()) {
    case PageType:
        if (path() == Path::Existing) loginExisting();
        else showPage(PageDetails);
        break;
    case PageDetails: {
        QString err;
        if (!validateDetails(&err)) { setStatus(err, true); return; }
        if (path() == Path::Demo) openDemo();
        else if (haveSession()) openReal();
        else startRealSignup();
        break;
    }
    case PageOtp:
        verifyOtp();
        break;
    case PageDone:
        if (m_finished) accept();
        break;
    }
}

// ── existing trade account ──────────────────────────────────────────────────

void OpenAccountDialog::loginExisting() {
    const QString login = m_login->text().trimmed();
    const QString pass  = m_loginPw->text();
    if (login.isEmpty() || pass.isEmpty()) {
        setStatus(tr("Enter the account number and its password."), true);
        return;
    }
    QJsonObject body;
    body["login"] = login;
    body["password"] = pass;
    body["label"] = QStringLiteral("Desktop terminal");
    setBusy(true);
    setStatus(tr("Connecting…"), false);
    QNetworkReply* r = post("/auth/account-login", body);
    connect(r, &QNetworkReply::finished, this, [this, r, login, pass]() {
        r->deleteLater();
        setBusy(false);
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) { setStatus(err, true); return; }
        m_accountNumber = o.value("account_number").toString(login.toUpper());
        m_cfg.token.clear();
        m_cfg.refreshToken.clear();
        m_cfg.apiKey    = o.value("api_key").toString();
        m_cfg.apiSecret = o.value("api_secret").toString();
        m_cfg.accountId = o.value("account_id").toString();
        m_cfg.readOnly  = o.value("read_only").toBool();
        m_cfg.userName  = m_accountNumber;
        m_cfg.email     = m_accountNumber;
        QJsonObject a;
        a["account_id"] = m_cfg.accountId;
        a["account_number"] = m_accountNumber;
        a["is_demo"] = o.value("is_demo").toBool();
        a["currency"] = o.value("currency").toString("USD");
        a["balance"] = o.value("balance").toDouble();
        m_cfg.accountsJson = QString::fromUtf8(QJsonDocument(QJsonArray{a}).toJson(QJsonDocument::Compact));
        m_cfg.rememberPassword = m_savePw->isChecked();
        m_cfg.savedPassword    = m_savePw->isChecked() ? pass : QString();
        accept();
    });
}

// ── personal details ────────────────────────────────────────────────────────

void OpenAccountDialog::fetchGroups() {
    const bool live = path() == Path::Real;
    m_accountType->clear();
    m_leverage->clear();
    m_groupsLoaded = false;
    m_groupsLive = live;
    setStatus(tr("Loading account types…"), false);

    QNetworkRequest req{QUrl(v1Base() + (live ? "/accounts/demo-groups?type=live"
                                              : "/accounts/demo-groups"))};
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute,
                     QNetworkRequest::NoLessSafeRedirectPolicy);
    QNetworkReply* r = m_net->get(req);
    connect(r, &QNetworkReply::finished, this, [this, r, live]() {
        r->deleteLater();
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) { setStatus(err, true); return; }
        if (live != (path() == Path::Real)) return;    // the trader went back and switched
        const QJsonArray items = o.value("items").toArray();
        if (items.isEmpty()) {
            setStatus(tr("No account types are open for this right now."), true);
            return;
        }
        for (const QJsonValue& v : items) {
            const QJsonObject t = v.toObject();
            m_accountType->addItem(t.value("name").toString(),
                                   QString::fromUtf8(QJsonDocument(t).toJson(QJsonDocument::Compact)));
        }
        m_accountType->setCurrentIndex(0);
        m_groupsLoaded = true;
        m_status->clear();
    });
}

bool OpenAccountDialog::validateDetails(QString* error) {
    auto fail = [error](const QString& m) { if (error) *error = m; return false; };
    const bool real = path() == Path::Real;

    const QString name = m_name->text().simplified();
    if (name.isEmpty()) return fail(tr("Enter your name."));
    if (real && !haveSession() && !name.contains(' '))
        return fail(tr("Enter your first and last name."));

    static const QRegularExpression emailRe(R"(^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$)");
    if (!emailRe.match(m_emailIn->text().trimmed()).hasMatch())
        return fail(tr("That email address does not look right."));

    const QString phone = m_phone->text().trimmed();
    if (!phone.isEmpty()) {
        static const QRegularExpression phoneRe(R"(^\+?[0-9 ()\-]{7,20}$)");
        if (!phoneRe.match(phone).hasMatch() || phone.count(QRegularExpression("[0-9]")) < 7)
            return fail(tr("That phone number does not look right."));
    }
    if (m_accountType->currentIndex() < 0) return fail(tr("Choose an account type."));
    if (m_leverage->currentIndex() < 0)    return fail(tr("Choose a leverage."));

    if (!real) {
        bool ok = false;
        const double dep = m_deposit->currentText().trimmed().toDouble(&ok);
        if (!ok || dep < 100 || dep > 1000000)
            return fail(tr("Deposit must be a number between 100 and 1,000,000."));
    }
    if (real && !haveSession()) {
        if (const QString why = passwordProblem(m_webPw->text()); !why.isEmpty())
            return fail(tr("Website password: %1").arg(why));
        if (m_webPw2->text() != m_webPw->text())
            return fail(tr("The two website passwords do not match."));
        if (!m_terms->isChecked())
            return fail(tr("You must accept the Terms and Conditions to open a real account."));
    }
    return true;
}

// ── demo ────────────────────────────────────────────────────────────────────

void OpenAccountDialog::openDemo() {
    const QJsonObject t = QJsonDocument::fromJson(
        m_accountType->currentData().toString().toUtf8()).object();
    QJsonObject body;
    body["full_name"]   = m_name->text().simplified();
    body["email"]       = m_emailIn->text().trimmed();
    body["phone"]       = m_phone->text().trimmed();
    body["country"]     = m_country->currentData().toString();
    body["state"]       = m_state->text().trimmed();
    body["city"]        = m_city->text().trimmed();
    body["postal_code"] = m_zip->text().trimmed();
    body["address"]     = m_address->text().trimmed();
    body["account_group_id"] = t.value("id").toString();
    body["leverage"]    = m_leverage->currentData().toInt();
    body["deposit"]     = m_deposit->currentText().trimmed().toDouble();
    body["newsletter"]  = m_newsletter->isChecked();

    setBusy(true);
    showPage(PageDone);
    m_progress->setValue(30);
    QNetworkReply* r = post("/accounts/demo", body);
    connect(r, &QNetworkReply::finished, this, [this, r]() {
        r->deleteLater();
        setBusy(false);
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) {
            showPage(PageDetails);
            setStatus(err, true);
            return;
        }
        // Signed straight in on the master password, as MT5 is after Finish.
        m_cfg.token.clear();
        m_cfg.refreshToken.clear();
        m_cfg.apiKey    = o.value("api_key").toString();
        m_cfg.apiSecret = o.value("api_secret").toString();
        m_cfg.accountId = o.value("account_id").toString();
        m_cfg.readOnly  = false;
        m_cfg.userName  = m_name->text().simplified();
        m_cfg.email     = o.value("account_number").toString();
        m_cfg.rememberPassword = false;
        m_cfg.savedPassword.clear();
        showRegistration(o);
    });
}

// ── real ────────────────────────────────────────────────────────────────────

void OpenAccountDialog::startRealSignup() {
    const QString full = m_name->text().simplified();
    const int cut = full.indexOf(' ');
    m_email = m_emailIn->text().trimmed();
    QJsonObject body;
    body["email"]      = m_email;
    body["password"]   = m_webPw->text();
    body["first_name"] = full.left(cut);
    body["last_name"]  = full.mid(cut + 1);
    if (!m_phone->text().trimmed().isEmpty()) body["phone"] = m_phone->text().trimmed();
    body["country"]    = m_country->currentData().toString();

    setBusy(true);
    setStatus(tr("Sending a code to %1…").arg(m_email), false);
    QNetworkReply* r = post("/auth/register/start", body);
    connect(r, &QNetworkReply::finished, this, [this, r]() {
        r->deleteLater();
        setBusy(false);
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) { setStatus(err, true); return; }
        showPage(PageOtp);
    });
}

void OpenAccountDialog::verifyOtp() {
    const QString code = m_otp->text().trimmed();
    if (code.size() != 6) { setStatus(tr("Enter the 6-digit code from your email."), true); return; }
    QJsonObject body;
    body["email"] = m_email;
    body["otp"]   = code;
    setBusy(true);
    setStatus(tr("Verifying…"), false);
    QNetworkReply* r = post("/auth/register/verify", body);
    connect(r, &QNetworkReply::finished, this, [this, r]() {
        r->deleteLater();
        setBusy(false);
        // The refresh credential only ever comes as a cookie. Kept, or the
        // new session would die 45 minutes after the account opened.
        const QVariant sc = r->header(QNetworkRequest::SetCookieHeader);
        for (const QNetworkCookie& ck : sc.value<QList<QNetworkCookie>>())
            if (ck.name() == "pt_refresh") m_refresh = QString::fromUtf8(ck.value());
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) { setStatus(err, true); return; }
        m_token = o.value("access_token").toString();
        if (m_token.isEmpty()) {
            setStatus(tr("Your login was created, but no session came back. Sign in from "
                         "File > Login to Trade Account and open the account from there."), true);
            return;
        }
        m_cfg.token        = m_token;
        m_cfg.refreshToken = m_refresh;
        m_cfg.email        = m_email;
        m_cfg.userName     = m_name->text().simplified();
        openReal();
    });
}

void OpenAccountDialog::resendOtp() {
    QJsonObject body;
    body["email"] = m_email;
    setBusy(true);
    QNetworkReply* r = post("/auth/register/resend", body);
    connect(r, &QNetworkReply::finished, this, [this, r]() {
        r->deleteLater();
        setBusy(false);
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) { setStatus(err, true); return; }
        setStatus(tr("A new code is on its way to %1.").arg(m_email), false);
    });
}

void OpenAccountDialog::openReal() {
    const QJsonObject t = QJsonDocument::fromJson(
        m_accountType->currentData().toString().toUtf8()).object();
    QJsonObject body;
    body["account_group_id"]   = t.value("id").toString();
    body["leverage"]           = m_leverage->currentData().toInt();
    body["is_demo"]            = false;
    body["generate_passwords"] = true;     // the server makes them, as MT5's does

    setBusy(true);
    const int from = m_pages->currentIndex();
    showPage(PageDone);
    m_progress->setValue(30);
    QNetworkReply* r = post("/accounts/open", body, /*auth=*/true);
    connect(r, &QNetworkReply::finished, this, [this, r, from]() {
        r->deleteLater();
        setBusy(false);
        QJsonObject o;
        QString err;
        if (!readReply(r, &o, &err)) {
            // A login made just now is kept: it works for the next try, and
            // the session is handed back so the trader is signed in either way.
            showPage(from == PageOtp ? PageDetails : Page(from));
            m_webBox->setVisible(false);
            setStatus(err, true);
            return;
        }
        m_cfg.accountId = o.value("id").toString();
        m_cfg.readOnly  = false;
        // On a user session: the Accounts menu lists every account of the
        // owner and refreshes on its own; this seeds it with the new one.
        QJsonArray accts = QJsonDocument::fromJson(m_cfg.accountsJson.toUtf8()).array();
        QJsonObject a;
        a["account_id"] = m_cfg.accountId;
        a["account_number"] = o.value("account_number").toString();
        a["is_demo"] = o.value("is_demo").toBool();
        a["currency"] = o.value("currency").toString("USD");
        a["balance"] = o.value("balance").toDouble();
        accts.append(a);
        m_cfg.accountsJson = QString::fromUtf8(QJsonDocument(accts).toJson(QJsonDocument::Compact));
        showRegistration(o);
    });
}

// ── registration page ───────────────────────────────────────────────────────

void OpenAccountDialog::showRegistration(const QJsonObject& o) {
    m_reg = o;
    m_reg["full_name"] = m_name->text().simplified();
    if (!m_reg.contains("server"))
        m_reg["server"] = o.value("is_demo").toBool() ? "TuskaEx-Demo" : "TuskaEx-Live";
    m_accountNumber = o.value("account_number").toString();
    m_finished = true;

    const auto& p = Theme::p();
    auto row = [&](const QString& k, const QString& v, const QString& note = QString(), bool mono = false) {
        return QString("<tr><td align='right' style='color:%1; padding:4px 16px 4px 0;'>%2</td>"
                       "<td style='color:%3; font-weight:700; %4'>%5</td>"
                       "<td style='color:%1; padding-left:24px;'>%6</td></tr>")
            .arg(p.muted, k.toHtmlEscaped(), p.textStrong,
                 mono ? "font-family:Consolas,\"Courier New\",monospace; font-size:14px;" : "",
                 v.toHtmlEscaped(), note.toHtmlEscaped());
    };
    const QString type = QStringLiteral("%1 (1:%2)").arg(o.value("account_group_name").toString(m_accountType->currentText()))
                                                    .arg(o.value("leverage").toInt(m_leverage->currentData().toInt()));
    m_regGrid->setText("<table cellspacing='0'>"
        + row(tr("Name:"), m_reg.value("full_name").toString())
        + row(tr("Account Type:"), type)
        + row(tr("Deposit:"), QStringLiteral("%L1 %2").arg(o.value("balance").toDouble(), 0, 'f', 2)
                                                     .arg(o.value("currency").toString("USD")))
        + row(tr("Server:"), m_reg.value("server").toString())
        + "</table>");

    m_progress->setValue(100);
    const bool havePw = o.contains("master_password");
    QString creds = "<table cellspacing='0'>"
        + row(tr("Login:"), m_accountNumber, QString(), true);
    if (havePw) {
        creds += row(tr("Password:"), o.value("master_password").toString(), QString(), true)
               + row(tr("Investor:"), o.value("investor_password").toString(), tr("(read only password)"), true);
    }
    creds += "</table>";
    m_keepNote->setText(creds + QString("<p style='color:%1; margin-left:110px;'>%2</p>")
        .arg(p.text, tr("Please keep your username and passwords in a safe place.").toHtmlEscaped()));
    m_regActions->setVisible(true);
    m_subtitle->setText(tr("Your account is ready"));
    showPage(PageDone);
    m_subtitle->setText(tr("Your account is ready"));
    m_nextBtn->setFocus();
}

QString OpenAccountDialog::detailsText() const {
    QString t = tr("TuskaEx trading account\n");
    t += tr("Name:      %1\n").arg(m_reg.value("full_name").toString());
    t += tr("Type:      %1 (1:%2)\n").arg(m_reg.value("account_group_name").toString())
                                     .arg(m_reg.value("leverage").toInt());
    t += tr("Server:    %1\n").arg(m_reg.value("server").toString());
    t += tr("Login:     %1\n").arg(m_accountNumber);
    if (m_reg.contains("master_password")) {
        t += tr("Password:  %1\n").arg(m_reg.value("master_password").toString());
        t += tr("Investor:  %1   (read only password)\n").arg(m_reg.value("investor_password").toString());
    }
    return t;
}

// ── plumbing ────────────────────────────────────────────────────────────────

QString OpenAccountDialog::v1Base() const {
    QString base = m_cfg.restBase.trimmed();
    base.replace("/api/algo", "/api/v1");
    return base;
}

QNetworkReply* OpenAccountDialog::post(const QString& path, const QJsonObject& body, bool auth) {
    QNetworkRequest req{QUrl(v1Base() + path)};
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    req.setAttribute(QNetworkRequest::RedirectPolicyAttribute,
                     QNetworkRequest::NoLessSafeRedirectPolicy);
    if (auth) req.setRawHeader("Authorization", ("Bearer " + m_cfg.token).toUtf8());
    return m_net->post(req, QJsonDocument(body).toJson(QJsonDocument::Compact));
}

void OpenAccountDialog::setStatus(const QString& text, bool error) {
    m_status->setStyleSheet(QString("font-size:12px; font-weight:600; color:%1;")
                            .arg(error ? Theme::p().down : Theme::p().up));
    m_status->setText(text);
}

void OpenAccountDialog::setBusy(bool busy) {
    m_busy = busy;
    m_nextBtn->setEnabled(!busy && (m_pages->currentIndex() != PageDone || m_finished));
    m_backBtn->setEnabled(!busy && m_pages->currentIndex() != PageType
                          && m_pages->currentIndex() != PageDone);
    m_resendBtn->setEnabled(!busy);
}

bool OpenAccountDialog::readReply(QNetworkReply* reply, QJsonObject* out, QString* error) {
    const QByteArray body = reply->readAll();
    const int status = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    const QJsonDocument doc = QJsonDocument::fromJson(body);
    if (reply->error() != QNetworkReply::NoError || status >= 400) {
        QString msg;
        if (doc.isObject()) {
            const QJsonValue detail = doc.object().value("detail");
            if (detail.isString()) {
                msg = detail.toString();
            } else if (detail.isArray()) {
                // FastAPI field errors, named by field so the trader knows which box.
                QStringList parts;
                for (const QJsonValue& v : detail.toArray()) {
                    const QJsonObject e = v.toObject();
                    const QJsonArray loc = e.value("loc").toArray();
                    const QString f = loc.isEmpty() ? QString() : loc.last().toString();
                    QString m = e.value("msg").toString();
                    m.remove(QStringLiteral("Value error, "));
                    parts << (f.isEmpty() ? m : QString("%1: %2").arg(f, m));
                }
                msg = parts.join("\n");
            }
        }
        if (msg.isEmpty()) msg = reply->errorString();
        if (error) *error = msg;
        return false;
    }
    if (out) *out = doc.object();
    return true;
}

QString OpenAccountDialog::generatePassword() {
    static const QString lower  = QStringLiteral("abcdefghijkmnpqrstuvwxyz");
    static const QString upper  = QStringLiteral("ABCDEFGHJKLMNPQRSTUVWXYZ");
    static const QString digits = QStringLiteral("23456789");
    static const QString symbol = QStringLiteral("!@#$%&*?");
    const QString all = lower + upper + digits + symbol;
    auto* rng = QRandomGenerator::system();
    auto pick = [rng](const QString& set) { return set.at(int(rng->bounded(set.size()))); };
    QString pw;
    pw += pick(lower); pw += pick(upper); pw += pick(digits); pw += pick(symbol);
    while (pw.size() < 10) pw += pick(all);
    for (int i = pw.size() - 1; i > 0; --i)
        std::swap(pw[i], pw[int(rng->bounded(i + 1))]);
    return pw;
}

QString OpenAccountDialog::passwordProblem(const QString& pw) {
    if (pw.size() < 8) return tr("use at least 8 characters.");
    int classes = 0;
    if (pw.contains(QRegularExpression("[a-z]"))) ++classes;
    if (pw.contains(QRegularExpression("[A-Z]"))) ++classes;
    if (pw.contains(QRegularExpression("[0-9]"))) ++classes;
    if (pw.contains(QRegularExpression("[^a-zA-Z0-9]"))) ++classes;
    if (classes < 3) return tr("mix at least 3 of lowercase, uppercase, number and symbol.");
    return QString();
}
