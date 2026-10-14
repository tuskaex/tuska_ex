#pragma once
#include <QDialog>
#include <QJsonObject>
#include "core/Config.h"

class QLineEdit;
class QComboBox;
class QCheckBox;
class QPushButton;
class QLabel;
class QStackedWidget;
class QRadioButton;
class QProgressBar;
class QNetworkAccessManager;
class QNetworkReply;
class QWidget;

// File > Open an Account — MetaTrader 5's wizard, page for page:
//
//   0. Select account type   Existing trade account (login + password)
//                            New demo account
//                            New real account
//   1. Personal details      name, country, state, city, zip, address, phone,
//                            email, account type, deposit (demo), leverage,
//                            newsletter
//   2. Confirm your email    real account only, and only without a session:
//                            the platform opens no real account for an address
//                            nobody has proved they own
//   3. Registration          login, server, master password, investor
//                            (read-only) password — made by the SERVER and
//                            shown this once — then Finish signs in
//
// Where each path goes:
//   existing  POST /auth/account-login                     -> account key
//   demo      POST /accounts/demo                          -> account key
//   real      POST /auth/register/start + /register/verify -> user session,
//             then POST /accounts/open {generate_passwords} -> passwords
//             (signed in already: straight to /accounts/open on that session)
//
// Pre-auth work, so it talks to the API through its own network manager, as
// LoginDialog does.
class OpenAccountDialog : public QDialog {
    Q_OBJECT
public:
    explicit OpenAccountDialog(const Config& cfg, QWidget* parent = nullptr);

    // The session to adopt. Only meaningful after exec() returned Accepted.
    Config config() const { return m_cfg; }
    // The login of the account signed in to, for the caller's status line.
    QString accountNumber() const { return m_accountNumber; }

    // A password that passes the platform's policy: 10 characters with
    // lower, upper, digit and symbol, from the system's secure generator.
    static QString generatePassword();
    // The platform's password rule, checked here so a weak one costs no
    // round trip. Returns an empty string when the password is acceptable.
    static QString passwordProblem(const QString& pw);

private:
    enum Page { PageType = 0, PageDetails = 1, PageOtp = 2, PageDone = 3 };
    enum class Path { Existing, Demo, Real };

    QWidget* buildTypePage();
    QWidget* buildDetailsPage();
    QWidget* buildOtpPage();
    QWidget* buildDonePage();

    void showPage(Page p);
    void goNext();
    void goBack();
    Path path() const;
    // A real account on a session the terminal already holds skips the
    // website password and the email code: the owner is known.
    bool haveSession() const;

    void loginExisting();
    void fetchGroups();
    bool validateDetails(QString* error);
    void openDemo();
    void startRealSignup();
    void verifyOtp();
    void resendOtp();
    void openReal();
    // Fills the Registration page from what the server answered.
    void showRegistration(const QJsonObject& o);
    QString detailsText() const;

    QString v1Base() const;
    QNetworkReply* post(const QString& path, const QJsonObject& body, bool auth = false);
    bool readReply(QNetworkReply* reply, QJsonObject* out, QString* error);
    void setStatus(const QString& text, bool error);
    void setBusy(bool busy);

    Config  m_cfg;
    QString m_token;          // user session, real path
    QString m_refresh;        // its refresh cookie, so it outlives 45 minutes
    QString m_email;
    QString m_accountNumber;
    bool    m_finished = false;   // the Registration page has an account on it
    bool    m_busy = false;

    // header band
    QLabel* m_title;
    QLabel* m_subtitle;
    QStackedWidget* m_pages;
    QLabel* m_status;
    QPushButton* m_backBtn;
    QPushButton* m_nextBtn;
    QPushButton* m_cancelBtn;

    // page 0
    QRadioButton* m_rExisting;
    QRadioButton* m_rDemo;
    QRadioButton* m_rReal;
    QWidget*   m_existingBox;
    QLineEdit* m_login;
    QLineEdit* m_loginPw;
    QCheckBox* m_savePw;

    // page 1
    QLineEdit* m_name;
    QComboBox* m_country;
    QLineEdit* m_state;
    QLineEdit* m_city;
    QLineEdit* m_zip;
    QLineEdit* m_address;
    QLineEdit* m_phone;
    QLineEdit* m_emailIn;
    QComboBox* m_accountType;
    QWidget*   m_depositRow;
    QComboBox* m_deposit;
    QComboBox* m_leverage;
    QCheckBox* m_newsletter;
    QWidget*   m_webBox;          // real + no session: website password, terms
    QLineEdit* m_webPw;
    QLineEdit* m_webPw2;
    QCheckBox* m_terms;
    bool       m_groupsLive = false;   // which kind m_accountType holds
    bool       m_groupsLoaded = false;

    // page 2
    QLineEdit*   m_otp;
    QPushButton* m_resendBtn;

    // page 3
    QLabel*       m_regGrid;
    QProgressBar* m_progress;
    QLabel*       m_keepNote;
    QWidget*      m_regActions;
    QJsonObject   m_reg;          // the server's answer, for Copy / Save

    QNetworkAccessManager* m_net;
};
