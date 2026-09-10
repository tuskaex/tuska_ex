#include "core/Config.h"
#include <QStandardPaths>
#include <QDir>
#include <QFile>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>

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
    if (o.contains("refreshToken")) c.refreshToken = o.value("refreshToken").toString();
    if (o.contains("accountId")) c.accountId = o.value("accountId").toString();
    if (o.contains("userName"))  c.userName  = o.value("userName").toString();
    if (o.contains("email"))     c.email     = o.value("email").toString();
    if (o.contains("theme"))     c.theme     = o.value("theme").toString("dark");
    if (o.contains("privacy"))   c.privacy   = o.value("privacy").toBool();
    if (o.contains("accountsJson")) c.accountsJson = o.value("accountsJson").toString();
    if (o.contains("apiKey"))    c.apiKey    = o.value("apiKey").toString();
    if (o.contains("apiSecret")) c.apiSecret = o.value("apiSecret").toString();
    // Clamped on the way in: a hand-edited or corrupt file must not put the
    // grid into a state setChartCount() would reject anyway.
    if (o.contains("chartCount"))
        c.chartCount = qBound(1, o.value("chartCount").toInt(1), 4);
    if (o.contains("chartSymbols")) {
        c.chartSymbols.clear();
        for (const QJsonValue& v : o.value("chartSymbols").toArray())
            c.chartSymbols << v.toString();
    }
    if (o.contains("windowGeometry")) c.windowGeometry = o.value("windowGeometry").toString();
    if (o.contains("watchGrid")) c.watchGrid = o.value("watchGrid").toBool(true);
    if (o.contains("watchSymbolColours")) {
        c.watchSymbolColours.clear();
        for (const QJsonValue& v : o.value("watchSymbolColours").toArray())
            c.watchSymbolColours << v.toString();
    }
    if (o.contains("watchHiddenSymbols")) {
        c.watchHiddenSymbols.clear();
        for (const QJsonValue& v : o.value("watchHiddenSymbols").toArray())
            c.watchHiddenSymbols << v.toString();
    }
    if (o.contains("tableFontFamily") && !o.value("tableFontFamily").toString().isEmpty())
        c.tableFontFamily = o.value("tableFontFamily").toString();
    // Clamped: a hand-edited file must not be able to set a size that renders
    // the blotter unreadable or taller than its rows.
    if (o.contains("tableFontSize"))
        c.tableFontSize = qBound(9, o.value("tableFontSize").toInt(12), 18);
    if (o.contains("ticketPosX")) c.ticketPosX = o.value("ticketPosX").toDouble(-1.0);
    if (o.contains("ticketPosY")) c.ticketPosY = o.value("ticketPosY").toDouble(-1.0);
    if (o.contains("watchFavourites")) {
        c.watchFavourites.clear();
        for (const QJsonValue& v : o.value("watchFavourites").toArray())
            c.watchFavourites << v.toString();
    }
    // Absent from the file means a first run, and a first run shows the three
    // columns a trader watches all day. An empty ARRAY is different: it is a
    // trader who has switched every column on, and must be left that way.
    if (o.contains("watchHiddenColumns")) {
        c.watchHiddenColumns.clear();
        for (const QJsonValue& v : o.value("watchHiddenColumns").toArray())
            c.watchHiddenColumns << v.toString();
    }
    if (o.contains("restBase") && !o.value("restBase").toString().isEmpty())
        c.restBase = o.value("restBase").toString();
    if (o.contains("wsUrl") && !o.value("wsUrl").toString().isEmpty())
        c.wsUrl = o.value("wsUrl").toString();
    return c;
}

bool Config::save() const {
    QJsonObject o;
    o["token"]        = token;
    o["refreshToken"] = refreshToken;
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
    o["chartCount"]   = chartCount;
    o["chartSymbols"] = QJsonArray::fromStringList(chartSymbols);
    o["watchHiddenColumns"] = QJsonArray::fromStringList(watchHiddenColumns);
    o["watchFavourites"]    = QJsonArray::fromStringList(watchFavourites);
    o["watchHiddenSymbols"] = QJsonArray::fromStringList(watchHiddenSymbols);
    o["watchGrid"]          = watchGrid;
    o["watchSymbolColours"] = QJsonArray::fromStringList(watchSymbolColours);
    o["tableFontFamily"]    = tableFontFamily;
    o["tableFontSize"]      = tableFontSize;
    o["ticketPosX"]         = ticketPosX;
    o["ticketPosY"]         = ticketPosY;
    o["windowGeometry"]    = windowGeometry;

    QFile f(filePath());
    if (!f.open(QIODevice::WriteOnly | QIODevice::Truncate))
        return false;
    f.write(QJsonDocument(o).toJson(QJsonDocument::Indented));
    return true;
}
