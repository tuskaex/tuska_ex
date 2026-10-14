#pragma once
#include <QIcon>
#include <QPixmap>
#include <QPainter>
#include <QColor>
#include <QString>
#include <QByteArray>
#include <QGuiApplication>
#include <QSvgRenderer>

// Real vector icons, drawn from SVG path data and tinted to the caller's colour.
//
// History: these started as emoji (👁 / 🙈 / ☀ / 🌙), which Windows rendered with
// its own colour font — they ignored the theme and read as blobs at button size.
// Replacing them with hand-rolled QPainter shapes fixed the colour but the
// geometry was crude (the "settings" and "refresh" glyphs in particular) AND the
// pixmaps were rasterised at logical size, so on a 125% display they were
// upscaled and blurry.
//
// Now each icon is proper SVG in the 24px / 2px-stroke / round-cap convention,
// rendered through QSvgRenderer at the screen's device pixel ratio, so it stays
// sharp at any scaling and takes the palette colour exactly.
namespace Icons {

namespace detail {

constexpr double PI = 3.14159265358979323846;

// Stroke-based icons share one wrapper; %1 is substituted with the colour.
inline QString wrap(const QString& body) {
    return QStringLiteral(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' "
        "stroke='%1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>")
        + body + QStringLiteral("</svg>");
}

inline QIcon render(const QString& svgTemplate, const QColor& color, int px) {
    const qreal dpr = qApp ? qApp->devicePixelRatio() : 1.0;
    QPixmap pm(int(px * dpr), int(px * dpr));
    pm.fill(Qt::transparent);
    pm.setDevicePixelRatio(dpr);          // keeps it crisp on scaled displays

    QSvgRenderer r(svgTemplate.arg(color.name()).toUtf8());
    QPainter p(&pm);
    p.setRenderHint(QPainter::Antialiasing);
    r.render(&p, QRectF(0, 0, px, px));
    p.end();
    return QIcon(pm);
}

} // namespace detail

// ☀ — core disc plus eight rays.
inline QIcon sun(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='4'/>"
        "<path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"
        "M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'/>"), c, px);
}

// 🌙 — crescent.
inline QIcon moon(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/>"), c, px);
}

// 👁 — lens with pupil.
inline QIcon eye(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z'/>"
        "<circle cx='12' cy='12' r='3'/>"), c, px);
}

// 👁 struck through — privacy mode on.
inline QIcon eyeOff(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M9.9 4.24A9.12 9.12 0 0 1 12 4c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"
        "M6.61 6.61A18.15 18.15 0 0 0 2 11s3.6 7 10 7a9 9 0 0 0 5.39-1.61'/>"
        "<path d='M14.12 14.12a3 3 0 1 1-4.24-4.24'/>"
        "<path d='M2 2l20 20'/>"), c, px);
}

namespace detail {

// Builds a cog outline: `teeth` flat-topped teeth alternating between an outer
// and an inner radius, centred on the 24px viewBox. Generated rather than
// hand-written so the geometry is exact — a mistyped coordinate in a long
// hand-authored gear path is invisible until it renders wrong.
inline QString cogPath(int teeth = 8, double rOut = 10.4, double rIn = 7.4) {
    const double cx = 12.0, cy = 12.0;
    const double step = 2.0 * PI / teeth;
    auto pt = [&](double r, double a) {
        return QString::number(cx + r * std::cos(a), 'f', 2) + " " +
               QString::number(cy + r * std::sin(a), 'f', 2);
    };
    QString d;
    for (int i = 0; i < teeth; ++i) {
        const double a = i * step - PI / 2.0;       // start at 12 o'clock
        d += (i == 0 ? "M" : "L") + pt(rIn,  a);
        d += "L" + pt(rOut, a + step * 0.16);
        d += "L" + pt(rOut, a + step * 0.34);
        d += "L" + pt(rIn,  a + step * 0.50);
    }
    d += "Z";
    return "<path d='" + d + "'/>";
}

} // namespace detail

// Settings — a cog. The previous "sliders" glyph was read as a filter/mixer
// rather than settings; a gear is the convention users already know.
inline QIcon settings(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        detail::cogPath() + "<circle cx='12' cy='12' r='3.1'/>"), c, px);
}

// Refresh — circular arrow with a clear head.
inline QIcon refresh(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M21 12a9 9 0 1 1-2.64-6.36'/>"
        "<path d='M21 3v6h-6'/>"), c, px);
}

// Wallet — body with a clasp.
inline QIcon wallet(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8"
        "a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5'/>"
        "<circle cx='17' cy='13' r='1.4'/>"), c, px);
}

// ✕ — close. Painted rather than the "✕" glyph, which several UI fonts don't
// carry: the button rendered all but empty.
inline QIcon close(const QColor& c, int px = 18) {
    return detail::render(detail::wrap("<path d='M6 6l12 12M18 6L6 18'/>"), c, px);
}

// Power — sign out. The near-closed arc with a stem through the top gap is the
// universal power glyph, so it needs no label.
inline QIcon power(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M18.36 6.64a9 9 0 1 1-12.73 0'/>"
        "<path d='M12 2v10'/>"), c, px);
}

// Pencil — edit. Used for "modify stop loss / take profit" in the blotter's
// Action column, where an "S/L" text button sat oddly beside an icon ✕ and
// only named half of what it opens (the dialog edits T/P too).
inline QIcon pencil(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 20h9'/>"
        "<path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'/>"), c, px);
}

// Accounts — stacked layers.
inline QIcon layers(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 2L2 7l10 5 10-5-10-5z'/>"
        "<path d='M2 17l10 5 10-5'/>"
        "<path d='M2 12l10 5 10-5'/>"), c, px);
}

// Share — the two-node graph with an outgoing arc, the glyph every platform
// uses for "send this somewhere else".
inline QIcon share(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='18' cy='5' r='3'/>"
        "<circle cx='6' cy='12' r='3'/>"
        "<circle cx='18' cy='19' r='3'/>"
        "<path d='M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'/>"), c, px);
}

// ── The two toolbars under the menu bar ────────────────────────────────
//
// MetaTrader puts a Standard row and a Line Studies row there, and the desk
// asked for the same. Drawn here in the same 24px / 2px-stroke convention as
// everything above, so they take the theme colour and stay sharp on a scaled
// display — a toolbar of mismatched glyphs is the first thing that reads as
// unfinished.

// Chart layout — the 2x2 grid.
inline QIcon gridFour(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='7' height='7' rx='1'/>"
        "<rect x='14' y='3' width='7' height='7' rx='1'/>"
        "<rect x='3' y='14' width='7' height='7' rx='1'/>"
        "<rect x='14' y='14' width='7' height='7' rx='1'/>"), c, px);
}

// Profiles — a folder, which is what a saved workspace reads as.
inline QIcon folder(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5"
        "a2 2 0 0 1-2-2z'/>"), c, px);
}

// Market Watch — a table with a leading column, not a hamburger: the panel is
// a quote table and the glyph should say so.
inline QIcon table(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='4' width='18' height='16' rx='2'/>"
        "<path d='M3 9h18M9 9v11'/>"), c, px);
}

// Data Window — the library's panel down the right-hand side.
inline QIcon sidePanel(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='4' width='18' height='16' rx='2'/>"
        "<path d='M15 4v16'/>"), c, px);
}

// Navigation — a compass, MT5's own Navigator metaphor.
inline QIcon compass(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='9'/>"
        "<path d='M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z'/>"), c, px);
}

// Symbols — a list whose rows are ticked, which is exactly what the browser is.
inline QIcon checklist(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M10 6h11M10 12h11M10 18h11'/>"
        "<path d='M3 6l1.4 1.4L7.2 4.6M3 12l1.4 1.4L7.2 10.6M3 18l1.4 1.4L7.2 16.6'/>"), c, px);
}

// New Order — a plus in a box, the one button on the row a trader must never
// have to hunt for.
inline QIcon plusBox(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/>"
        "<path d='M12 8v8M8 12h8'/>"), c, px);
}

// Scripts — angle brackets. The scripts here are JavaScript, and this is the
// glyph that says "code" without claiming to be MetaTrader's MQL.
inline QIcon code(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M9 18l-6-6 6-6M15 6l6 6-6 6'/>"), c, px);
}

// Strategy Tester — run.
inline QIcon play(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M6 4l14 8-14 8z'/>"), c, px);
}

// Reports — a sheet with bars on it.
inline QIcon report(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='4' y='3' width='16' height='18' rx='2'/>"
        "<path d='M8 17v-4M12 17v-7M16 17v-2'/>"), c, px);
}

// ── Line studies ──
// The drawing tools, in the order MetaTrader lays them out.

inline QIcon cursorArrow(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M5 3l6 16 2.2-6.2L19.4 11z'/>"), c, px);
}

inline QIcon crosshair(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 2v20M2 12h20'/>"), c, px);
}

inline QIcon verticalLine(const QColor& c, int px = 18) {
    return detail::render(detail::wrap("<path d='M12 3v18'/>"), c, px);
}

inline QIcon horizontalLine(const QColor& c, int px = 18) {
    return detail::render(detail::wrap("<path d='M3 12h18'/>"), c, px);
}

inline QIcon trendLine(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M5 19L19 5'/>"
        "<circle cx='5' cy='19' r='1.8'/>"
        "<circle cx='19' cy='5' r='1.8'/>"), c, px);
}

// A ray is a trend line with only one end — anchored, then running off.
inline QIcon ray(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M5 19L21 3'/>"
        "<circle cx='5' cy='19' r='1.8'/>"), c, px);
}

// Fibonacci retracement — its levels.
inline QIcon fib(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M3 5h18M3 10h18M3 14h18M3 19h18'/>"), c, px);
}

inline QIcon rectangle(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='5' width='18' height='14' rx='1'/>"), c, px);
}

// Text — the letter itself, drawn as strokes. A glyph from the UI font would
// not take the stroke weight of everything beside it.
inline QIcon textTool(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M5 20L12 4l7 16'/>"
        "<path d='M7.6 14.5h8.8'/>"), c, px);
}

inline QIcon brush(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M3 17q3-8 6.5 0t6.5-4 5 1'/>"), c, px);
}

inline QIcon eraser(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M20 20H9l-4.5-4.5a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 2.8 0l4.5 4.5"
        "a2 2 0 0 1 0 2.8z'/>"
        "<path d='M9 20l7.8-7.8'/>"), c, px);
}

// Show trade panel — a window with its bottom band picked out.
inline QIcon panelBottom(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/>"
        "<path d='M3 15h18'/>"), c, px);
}

// ── Menu entries ──

// Save — a floppy disk, still the one symbol everyone reads as "save".
inline QIcon save(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/>"
        "<path d='M17 21v-8H7v8M7 3v5h8'/>"), c, px);
}

// Delete — a bin.
inline QIcon trash(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>"
        "<path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6'/>"), c, px);
}

// Favourites — a star.
inline QIcon star(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25"
        "L7 14.14 2 9.27l6.91-1.01L12 2z'/>"), c, px);
}

// Specification / properties — an "i" in a circle.
inline QIcon info(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='10'/><path d='M12 16v-4M12 8h.01'/>"), c, px);
}

// Chart window — three candles.
inline QIcon candles(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M6 3v3M6 15v6M12 2v5M12 14v8M18 5v3M18 16v5'/>"
        "<rect x='4' y='6' width='4' height='9' rx='0.5'/>"
        "<rect x='10' y='7' width='4' height='7' rx='0.5'/>"
        "<rect x='16' y='8' width='4' height='8' rx='0.5'/>"), c, px);
}

// Risk report — a shield.
inline QIcon shield(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>"), c, px);
}

// Long & Short — an arrow up beside an arrow down.
inline QIcon longShort(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M7 20V4M3 8l4-4 4 4'/>"
        "<path d='M17 4v16M13 16l4 4 4-4'/>"), c, px);
}

// Per-symbol report — a price tag.
inline QIcon tag(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59"
        "a2 2 0 0 1 0 2.82z'/><path d='M7 7h.01'/>"), c, px);
}

// Export a statement — a sheet with an arrow coming down out of it.
inline QIcon fileDown(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/>"
        "<path d='M14 2v6h6M12 12v6M9 15l3 3 3-3'/>"), c, px);
}

// Indicators — a pulse line.
inline QIcon activity(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M22 12h-4l-3 9L9 3l-3 9H2'/>"), c, px);
}

// Expert Advisors — a chip: a program that trades.
inline QIcon cpu(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='4' y='4' width='16' height='16' rx='2'/>"
        "<rect x='9' y='9' width='6' height='6'/>"
        "<path d='M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3'/>"), c, px);
}

// Copying positions from another terminal — two screens with an arrow.
inline QIcon mirror(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='2' y='4' width='8' height='12' rx='1'/>"
        "<rect x='14' y='4' width='8' height='12' rx='1'/>"
        "<path d='M10 10h4M12 8l2 2-2 2M6 20h12'/>"), c, px);
}

// A table's grid lines.
inline QIcon gridLines(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/>"
        "<path d='M3 9h18M3 15h18M9 3v18M15 3v18'/>"), c, px);
}

// Auto Arrange — columns with arrows pushing them apart to fit.
inline QIcon arrange(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 3v18'/>"
        "<path d='M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3'/>"), c, px);
}

// Colour — a palette.
inline QIcon palette(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M12 22a10 10 0 1 1 10-10c0 2.5-2 3.5-4 3.5h-2a2 2 0 0 0-1.5 3.3"
        "A1.5 1.5 0 0 1 12 22z'/>"
        "<circle cx='7.5' cy='10.5' r='1'/><circle cx='12' cy='7' r='1'/>"
        "<circle cx='16.5' cy='10.5' r='1'/>"), c, px);
}

// Columns submenu — vertical bars of a table.
inline QIcon columns(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/><path d='M9 3v18M15 3v18'/>"), c, px);
}

// Time column — a clock.
inline QIcon clock(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='10'/><path d='M12 6v6l4 2'/>"), c, px);
}

// Crypto market group — a coin.
inline QIcon coin(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='10'/>"
        "<path d='M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 .8-3 2s1.3 1.6 3 2 3 .8 3 2-1.3 2-3 2"
        "a3 3 0 0 1-3-1.5M12 6v2M12 16v2'/>"), c, px);
}

// Commodities market group — a cut gem.
inline QIcon diamond(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M6 3h12l4 6-10 12L2 9z'/><path d='M2 9h20M12 21L8 9l4-6 4 6z'/>"), c, px);
}

// Chart layouts: one pane, and two side by side. Four is gridFour.
inline QIcon layoutOne(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/>"), c, px);
}
inline QIcon layoutTwo(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<rect x='3' y='3' width='18' height='18' rx='2'/><path d='M12 3v18'/>"), c, px);
}

// A filled colour sample for the row-colour menu. Not a glyph: the colour IS
// the content, so it is drawn rather than tinted.
inline QIcon swatch(const QColor& fill, const QColor& border, int px = 18) {
    const qreal dpr = qApp ? qApp->devicePixelRatio() : 1.0;
    QPixmap pm(int(px * dpr), int(px * dpr));
    pm.fill(Qt::transparent);
    pm.setDevicePixelRatio(dpr);
    QPainter p(&pm);
    p.setRenderHint(QPainter::Antialiasing);
    p.setPen(QPen(border, 1.0));
    p.setBrush(fill.isValid() ? fill : QColor(Qt::transparent));
    p.drawRoundedRect(QRectF(2.5, 2.5, px - 5, px - 5), 3, 3);
    if (!fill.isValid())   // "none": a slash through an empty box
        p.drawLine(QPointF(4, px - 4), QPointF(px - 4, 4));
    p.end();
    return QIcon(pm);
}

// ── File menu ──

// Open an Account — a person with a plus beside them.
inline QIcon userPlus(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'/>"
        "<circle cx='9' cy='7' r='4'/>"
        "<path d='M19 8v6M22 11h-6'/>"), c, px);
}

// Login to Trade Account — an arrow going in through a door.
inline QIcon logIn(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'/>"
        "<path d='M10 17l5-5-5-5M15 12H3'/>"), c, px);
}

// Log out — the same door, the arrow leaving.
inline QIcon logOut(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/>"
        "<path d='M16 17l5-5-5-5M21 12H9'/>"), c, px);
}

// Login to Web Trader — a globe: it opens the web terminal in the browser.
inline QIcon globe(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='12' cy='12' r='10'/>"
        "<path d='M2 12h20'/>"
        "<path d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"
        " 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/>"), c, px);
}

// Login to Web Service — a key: it signs in with an API key and secret.
inline QIcon key(const QColor& c, int px = 18) {
    return detail::render(detail::wrap(
        "<circle cx='7.5' cy='15.5' r='4.5'/>"
        "<path d='M10.7 12.3L21 2M16 7l3 3M18.5 4.5l2 2'/>"), c, px);
}

} // namespace Icons
