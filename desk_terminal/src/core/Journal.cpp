#include "core/Journal.h"
#include <QCoreApplication>

Journal* Journal::instance() {
    // Parented to the application so it is torn down with it rather than after
    // QCoreApplication is gone, which is when a static QObject would otherwise
    // be destroyed.
    static Journal* j = new Journal(QCoreApplication::instance());
    return j;
}

void Journal::log(const QString& source, const QString& message, Level level) {
    if (message.trimmed().isEmpty()) return;
    Entry e;
    e.at      = QDateTime::currentDateTimeUtc();
    e.level   = level;
    e.source  = source;
    e.message = message.trimmed();
    m_entries.prepend(e);
    if (m_entries.size() > kMax) m_entries.resize(kMax);
    emit appended(e);
}

void Journal::clear() {
    m_entries.clear();
    emit cleared();
}
