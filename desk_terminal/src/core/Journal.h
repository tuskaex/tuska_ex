#pragma once
#include <QDateTime>
#include <QObject>
#include <QString>
#include <QVector>

// MetaTrader's Journal: what the terminal itself did this session.
//
// Not the trade history — that comes from the server and has its own tab. This
// is the client-side record: connected, order sent, order filled, request
// rejected, session renewed. The web terminal has carried one for a while; the
// desktop told a trader the same things only through the status bar, where
// each message replaced the last and was gone the moment the next poll landed.
//
// In memory and NOT persisted, exactly like MetaTrader: a restart starts a new
// session. Capped, because a terminal left open all day on a chatty feed would
// otherwise grow without bound.
class Journal : public QObject {
    Q_OBJECT
public:
    enum Level { Info, Success, Error };

    struct Entry {
        QDateTime at;          // UTC
        Level     level = Info;
        QString   source;      // the subsystem that wrote it: "Trade", "Network"…
        QString   message;
    };

    // One per process. Every part of the terminal writes to the same journal,
    // and passing it down through every constructor would touch half the code
    // base for a log line.
    static Journal* instance();

    static void info(const QString& source, const QString& message)    { instance()->log(source, message, Info); }
    static void success(const QString& source, const QString& message) { instance()->log(source, message, Success); }
    static void error(const QString& source, const QString& message)   { instance()->log(source, message, Error); }

    void log(const QString& source, const QString& message, Level level = Info);
    void clear();
    // Newest first, as the tab draws it.
    const QVector<Entry>& entries() const { return m_entries; }

signals:
    void appended(const Journal::Entry& entry);
    void cleared();

private:
    explicit Journal(QObject* parent = nullptr) : QObject(parent) {}
    static constexpr int kMax = 500;   // MetaTrader caps its journal too
    QVector<Entry> m_entries;
};
