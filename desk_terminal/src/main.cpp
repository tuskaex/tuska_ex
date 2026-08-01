#include <QApplication>
#include <QStyleFactory>
#include <QIcon>
#include "core/Config.h"
#include "core/Models.h"
#include "ui/LoginDialog.h"
#include "ui/MainWindow.h"
#include "ui/Theme.h"

// Re-applies the active theme to the whole application. Called at startup and
// again whenever the user flips the light/dark switch.
static void applyTheme(QApplication& app) {
    app.setStyle(QStyleFactory::create("Fusion"));
    app.setPalette(Theme::qtPalette());
    app.setStyleSheet(Theme::styleSheet());
}

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    // These two also decide where Config writes its file (AppConfigLocation is
    // derived from them), so changing them relocates the saved session.
    app.setApplicationName("TuskaEx Terminal");
    app.setOrganizationName("TuskaEx");
    // Brand mark on the window title bar / taskbar, so it's obvious at a glance
    // which platform's terminal this is. (The EXE's own icon comes from
    // resources/app.rc, which is what Explorer and the desktop shortcut use.)
    app.setWindowIcon(QIcon(":/tuskaex-256.png"));

    qRegisterMetaType<Quote>("Quote");
    qRegisterMetaType<AccountInfo>("AccountInfo");
    qRegisterMetaType<TradeResult>("TradeResult");

    Config cfg = Config::load();
    Theme::setMode(Theme::fromName(cfg.theme));
    applyTheme(app);

    // Every mode switch re-applies the palette + global sheet; individual
    // widgets restyle their own inline styles off the same signal.
    QObject::connect(Theme::notifier(), &Theme::Notifier::changed,
                     &app, [&app]() { applyTheme(app); });

    // First run (or no creds) -> ask for credentials up front.
    if (!cfg.hasCredentials()) {
        LoginDialog dlg(cfg);
        if (dlg.exec() != QDialog::Accepted)
            return 0;
        cfg = dlg.config();
    }

    MainWindow w(cfg);
    w.show();
    return app.exec();
}
