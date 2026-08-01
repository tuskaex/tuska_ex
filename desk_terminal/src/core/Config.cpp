#include "core/Config.h"
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>

QString Config::filePath() {
    QString dir = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation);
    if (dir.isEmpty())
        dir = QDir::homePath() + "/.tuskaex-terminal";
    QDir().mkpath(dir);
    return dir + "/config.json";
}

// NO legacy config migration — deliberately.
//
// This terminal was forked from the Bull4x → SwissCresta build, which did carry
// its config forward on each rename because those were renames of the same
// broker: the same account, the same backend, only the host moved. TuskaEx is a
// *different platform*. A SwissCresta token or API key authenticates nothing
// here, and adopting one would also drag its endpoints in, pointing this build
// at another broker's API. So a TuskaEx install starts with a clean config and
// a real sign-in.
//
// For the same reason nothing deletes those files either: the SwissCresta
// terminal may still be installed on this machine and its config is its own.

Config Config::load() {
    Config c;
    QFile f(filePath());
    if (!f.open(QIODevice::ReadOnly))
        return c; // defaults

    const QJsonObject o = QJsonDocument::fromJson(f.readAll()).object();
    if (o.contains("token"))     c.token     = o.value("token").toString();
    if (o.contains("accountId")) c.accountId = o.value("accountId").toString();
    if (o.contains("userName"))  c.userName  = o.value("userName").toString();
    if (o.contains("email"))     c.email     = o.value("email").toString();
    if (o.contains("theme"))     c.theme     = o.value("theme").toString("dark");
    if (o.contains("privacy"))   c.privacy   = o.value("privacy").toBool();
    if (o.contains("accountsJson")) c.accountsJson = o.value("accountsJson").toString();
    if (o.contains("apiKey"))    c.apiKey    = o.value("apiKey").toString();
    if (o.contains("apiSecret")) c.apiSecret = o.value("apiSecret").toString();
    if (o.contains("restBase") && !o.value("restBase").toString().isEmpty())
        c.restBase = o.value("restBase").toString();
    if (o.contains("wsUrl") && !o.value("wsUrl").toString().isEmpty())
        c.wsUrl = o.value("wsUrl").toString();
    return c;
}

bool Config::save() const {
    QJsonObject o;
    o["token"]        = token;
    o["accountId"]    = accountId;
    o["userName"]     = userName;
    o["email"]        = email;
    o["theme"]        = theme;
    o["privacy"]      = privacy;
    o["accountsJson"] = accountsJson;
    o["apiKey"]       = apiKey;
    o["apiSecret"]    = apiSecret;
    o["restBase"]     = restBase;
    o["wsUrl"]        = wsUrl;

    QFile f(filePath());
    if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate))
        return false;
    f.write(QJsonDocument(o).toJson(QJsonDocument::Indented));
    return true;
}
