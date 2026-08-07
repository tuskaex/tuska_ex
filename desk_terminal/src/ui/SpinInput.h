#pragma once
// Numeric-input helpers shared by the order/bracket dialogs.
//
// QDoubleSpinBox defaults to keyboardTracking = true, which re-interprets the
// text on EVERY keystroke: it validates the half-finished number, clamps it to
// the range, rewrites the field to a canonical form and leaves the cursor at
// the end. On a 5-digit price that leaves only the trailing characters
// realistically editable — reported from the desk as "only 2 digit we can
// change" while trying to retype 4438.50 over 4241.81.
//
// freeTyping() turns tracking off, which fixes the typing but moves
// valueChanged to the commit (Enter, focus-out, or a step). That opens a second
// hole in any dialog whose confirm button is enabled from that signal: a
// disabled button does not accept the mouse press, so clicking it never takes
// focus off the spin box, the text is never committed, and the button can never
// enable — the trader is stuck. typedValue() + onTyping() close it by working
// from what is on screen rather than from the last committed value.

#include <QDoubleSpinBox>
#include <QLineEdit>
#include <QLocale>
#include <QString>
#include <initializer_list>
#include <utility>

namespace SpinInput {

inline void freeTyping(std::initializer_list<QDoubleSpinBox*> boxes) {
    for (QDoubleSpinBox* b : boxes)
        if (b) b->setKeyboardTracking(false);
}

// QAbstractSpinBox::lineEdit() is protected, so the editor is fetched as a
// child instead. Every spin box built here is editable and therefore has one.
inline QLineEdit* editor(const QDoubleSpinBox* box) {
    return box->findChild<QLineEdit*>();
}

// What the field shows right now, committed or not. Prefix and suffix are
// stripped the way the box itself would. Text that is not yet a number — empty,
// a lone "-", or the specialValueText — reads as the minimum, which on every
// bracket field here is the "none" value.
inline double typedValue(const QDoubleSpinBox* box) {
    QLineEdit* le = editor(box);
    if (!le) return box->value();
    QString t = le->text().trimmed();
    if (!box->prefix().isEmpty() && t.startsWith(box->prefix())) t = t.mid(box->prefix().size());
    if (!box->suffix().isEmpty() && t.endsWith(box->suffix()))   t.chop(box->suffix().size());
    bool ok = false;
    const double v = QLocale().toDouble(t.trimmed(), &ok);
    if (!ok) return box->minimum();
    return qBound(box->minimum(), v, box->maximum());
}

// Run `fn` on every keystroke, not only on commit — see the note above.
template <typename F>
inline void onTyping(QDoubleSpinBox* box, QObject* ctx, F&& fn) {
    if (QLineEdit* le = editor(box))
        QObject::connect(le, &QLineEdit::textEdited, ctx, std::forward<F>(fn));
}

} // namespace SpinInput
