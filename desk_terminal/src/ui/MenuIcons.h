#pragma once
#include <QAction>
#include <QColor>
#include <QIcon>
#include <QPainter>
#include <QPixmap>
#include "ui/Icons.h"
#include "ui/Theme.h"

// Icons on menu entries, the way MT5 has them, in one place so every menu in
// the terminal draws them the same way.
//
// The catch with an icon on a menu entry: once it has one, the menu stops
// drawing the tick for an on/off entry. So a checkable entry gets a two-state
// icon, the glyph alone when off and the glyph in a highlighted box when on,
// which is how a checked toolbar button already looks.
namespace MenuIcons {

using Fn = QIcon (*)(const QColor&, int);

// The icon for `a`, drawn from the current theme. Call it AFTER setCheckable:
// whether the entry is a toggle decides which kind of icon it gets.
inline QIcon build(const QAction* a, Fn fn) {
    const auto& c = Theme::p();
    constexpr int px = 18;
    const QIcon plain = fn(QColor(c.text), px);
    if (!a || !a->isCheckable())
        return plain;

    const qreal dpr = qApp ? qApp->devicePixelRatio() : 1.0;
    QPixmap on(int(px * dpr), int(px * dpr));
    on.setDevicePixelRatio(dpr);
    on.fill(Qt::transparent);
    {
        QPainter p(&on);
        p.setRenderHint(QPainter::Antialiasing);
        p.setPen(QPen(QColor(c.accent), 1.0));
        p.setBrush(QColor(c.rowSel));
        p.drawRoundedRect(QRectF(0.5, 0.5, px - 1, px - 1), 3, 3);
        const QPixmap glyph = fn(QColor(c.rowSelText), 14).pixmap(QSize(14, 14), dpr);
        p.drawPixmap(QRectF(2, 2, 14, 14), glyph, QRectF(glyph.rect()));
    }
    const QPixmap off = plain.pixmap(QSize(px, px), dpr);
    QIcon icon;
    for (QIcon::Mode m : {QIcon::Normal, QIcon::Active, QIcon::Selected}) {
        icon.addPixmap(off, m, QIcon::Off);
        icon.addPixmap(on,  m, QIcon::On);
    }
    return icon;
}

// Sets the icon and makes sure it shows: macOS hides menu icons by default,
// and the .dmg has to look like the .exe. Returns `a` for chaining.
inline QAction* set(QAction* a, Fn fn) {
    a->setIcon(build(a, fn));
    a->setIconVisibleInMenu(true);
    return a;
}

} // namespace MenuIcons
