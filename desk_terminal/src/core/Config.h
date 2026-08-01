#pragma once
#include <QString>

// Persists connection settings (API key/secret + endpoints) to a JSON file
// in the user's app-config directory. Plaintext — this is a local desktop
// terminal; keep the file private.
class Config {
public:
    // Terminal login (email/password → JWT). Preferred.
    QString token;         // JWT
    QString accountId;     // selected trading account id
    QString userName;      // display name from the login response
    QString email;         // the address signed in with (prefills the login form)
    QString accountsJson = "[]";   // [{account_id, account_number, is_demo, currency}]

    // UI preferences
    QString theme   = "light"; // "dark" | "light" — light mirrors the MT5 layout
    bool    privacy = false;   // mask balances / account numbers on screen

    // Legacy bot auth (still supported for a pasted API key).
    QString apiKey;
    QString apiSecret;

    // REST base, e.g. https://api.tuskaex.com/api/algo
    QString restBase = "https://api.tuskaex.com/api/algo";
    // WebSocket URL, e.g. wss://api.tuskaex.com/ws/algo/prices
    // WebSockets only work on the api. host — trade.tuskaex.com proxies REST
    // but its nginx block does not upgrade the connection.
    QString wsUrl    = "wss://api.tuskaex.com/ws/algo/prices";

    bool hasToken() const {
        return !token.trimmed().isEmpty() && !accountId.trimmed().isEmpty();
    }
    bool hasCredentials() const {
        return hasToken() ||
               (!apiKey.trimmed().isEmpty() && !apiSecret.trimmed().isEmpty());
    }

    static QString filePath();   // resolved config file location
    static Config  load();       // load from disk (defaults if missing)
    bool           save() const; // write to disk; returns success

    // There is deliberately NO migration from the Bull4x / SwissCresta builds
    // this terminal was forked from — see the note in Config.cpp before adding
    // one back.
};
