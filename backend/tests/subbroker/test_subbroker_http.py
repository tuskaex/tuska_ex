"""Sub-broker / white-label behaviour, end to end over HTTP."""
import pytest

from conftest import PASSWORD, admin_headers, sql, user_headers

FEATURE_OFF = "is not available for your account"

# One route per client feature that require_client_feature() must guard.
FEATURE_ROUTES = {
    "deposits": "/api/v1/wallet/deposit/manual",
    "withdrawals": "/api/v1/wallet/withdraw",
    "transfers": "/api/v1/wallet/transfer-internal",
    "copy_trading": "/api/v1/social/copy",
    "ib_program": "/api/v1/business/apply",
}


# ─── Schema ──────────────────────────────────────────────────────────────

def test_migrations_reach_head_with_tenant_columns():
    assert sql("SELECT version_num FROM alembic_version")[0][0] == "0065"
    cols = dict(sql(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name = 'users' AND column_name IN ('brand_color','client_features','admin_color')"
    ))
    assert cols == {
        "brand_color": "character varying",
        "client_features": "jsonb",
        "admin_color": "character varying",
    }


# ─── Public broker lookup (mobile app) ───────────────────────────────────

def test_broker_list_shows_active_brokers_only(gw, world):
    r = gw.get("/api/v1/public/brokers")
    assert r.status_code == 200
    items = {b["code"]: b for b in r.json()["items"]}
    assert world["broker_a_code"] in items
    assert world["broker_b_code"] in items
    assert world["broker_suspended_code"] not in items
    a = items[world["broker_a_code"]]
    assert set(a) == {"code", "brand_name", "logo_url", "brand_color"}
    assert a["brand_name"] == "Alpha Markets"
    assert a["brand_color"] == "#0A7C3E"
    assert a["logo_url"] == "/api/v1/public/broker-media/alpha.png"


def test_broker_without_logo_falls_back_to_platform_logo(gw, world):
    r = gw.get(f"/api/v1/public/broker/{world['broker_b_code']}")
    assert r.status_code == 200
    assert r.json()["logo_url"] == "/api/v1/public/broker-media/platform-logo.png"


def test_broker_lookup_payload_exposes_no_private_fields(gw, world):
    r = gw.get(f"/api/v1/public/broker/{world['broker_a_code'].lower()}")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == world["broker_a_code"]
    assert body["support_email"] == "help@alpha.example"
    assert body["features"] == {f: True for f in FEATURE_ROUTES}
    for private in ("id", "email", "smtp_host", "smtp_password", "custom_domain", "password_hash"):
        assert private not in body


def test_broker_lookup_reports_switched_off_features(gw, world):
    body = gw.get(f"/api/v1/public/broker/{world['broker_off_code']}").json()
    assert body["features"] == {f: False for f in FEATURE_ROUTES}


@pytest.mark.parametrize("bad", ["NOPE0000", "bad-code!", "X" * 21])
def test_broker_lookup_unknown_or_malformed_is_404(gw, bad):
    assert gw.get(f"/api/v1/public/broker/{bad}").status_code == 404


def test_suspended_broker_is_not_found(gw, world):
    assert gw.get(f"/api/v1/public/broker/{world['broker_suspended_code']}").status_code == 404


def test_broker_media_rejects_path_traversal(gw):
    for name in ("..%2F..%2Fetc%2Fpasswd", "....", "a..b"):
        r = gw.get(f"/api/v1/public/broker-media/{name}")
        assert r.status_code in (400, 404), (name, r.status_code)


# ─── Per-broker client features, enforced by the gateway ────────────────

@pytest.mark.parametrize("feature,path", FEATURE_ROUTES.items())
def test_switched_off_feature_is_refused(gw, world, feature, path):
    r = gw.post(path, json={}, headers=user_headers(world["client_off"]))
    assert r.status_code == 403
    assert FEATURE_OFF in r.json()["detail"]


@pytest.mark.parametrize("feature,path", FEATURE_ROUTES.items())
@pytest.mark.parametrize("who", ["client_a", "platform_client"])
def test_feature_left_on_is_not_refused_by_the_switch(gw, world, feature, path, who):
    r = gw.post(path, json={}, headers=user_headers(world[who]))
    # The request may fail validation or business rules, but never on the switch.
    assert FEATURE_OFF not in r.text, (who, feature, r.status_code, r.text[:200])


# ─── Admin: feature switches and colours ────────────────────────────────

def test_super_admin_switches_a_feature_off_and_on(gw, adm, world):
    b, client = world["broker_b"], world["client_b"]
    r = adm.put(f"/api/v1/admin/sub-admins/{b}/client-features",
                json={"features": {"deposits": False}}, headers=admin_headers(world["super"]))
    assert r.status_code == 200, r.text
    assert sql("SELECT client_features FROM users WHERE id = :i", i=b)[0][0] == {"deposits": False}
    refused = gw.post(FEATURE_ROUTES["deposits"], json={}, headers=user_headers(client))
    assert refused.status_code == 403 and FEATURE_OFF in refused.text
    # Other features of the same broker are untouched.
    assert FEATURE_OFF not in gw.post(FEATURE_ROUTES["withdrawals"], json={}, headers=user_headers(client)).text

    r = adm.put(f"/api/v1/admin/sub-admins/{b}/client-features",
                json={"features": {"deposits": True}}, headers=admin_headers(world["super"]))
    assert r.status_code == 200, r.text
    # Only switched-off features are stored; all-on is NULL.
    assert sql("SELECT client_features FROM users WHERE id = :i", i=b)[0][0] is None
    assert FEATURE_OFF not in gw.post(FEATURE_ROUTES["deposits"], json={}, headers=user_headers(client)).text


def test_unknown_feature_is_rejected(adm, world):
    r = adm.put(f"/api/v1/admin/sub-admins/{world['broker_b']}/client-features",
                json={"features": {"crypto_casino": False}}, headers=admin_headers(world["super"]))
    assert r.status_code == 400


def test_a_broker_cannot_change_its_own_feature_switches(adm, world):
    r = adm.put(f"/api/v1/admin/sub-admins/{world['broker_off']}/client-features",
                json={"features": {"withdrawals": True}}, headers=admin_headers(world["broker_off"]))
    assert r.status_code == 403
    assert sql("SELECT client_features->>'withdrawals' FROM users WHERE id = :i",
               i=world["broker_off"])[0][0] == "false"


def test_brand_and_admin_colours_are_normalised_and_kept_apart(adm, world):
    b = world["broker_b"]
    r = adm.put(f"/api/v1/admin/sub-admins/{b}/branding",
                json={"brand_color": "#abc", "admin_color": "123456"}, headers=admin_headers(world["super"]))
    assert r.status_code == 200, r.text
    assert sql("SELECT brand_color, admin_color, brand_name FROM users WHERE id = :i", i=b)[0] == \
        ("#AABBCC", "#123456", "Bravo FX")


@pytest.mark.parametrize("bad", ["red", "#12345", "#GGGGGG", "url(x)", "#123456;}"])
def test_non_hex_colour_is_rejected(adm, world, bad):
    r = adm.put(f"/api/v1/admin/sub-admins/{world['broker_b']}/branding",
                json={"brand_color": bad}, headers=admin_headers(world["super"]))
    assert r.status_code == 400


# ─── Sign-in isolation ──────────────────────────────────────────────────

def _login(gw, email, **extra):
    headers = extra.pop("headers", {})
    return gw.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD, **extra}, headers=headers)


def test_login_with_own_broker_code_succeeds(gw, world):
    assert _login(gw, world["client_a_email"], broker_code=world["broker_a_code"]).status_code == 200


def test_login_with_another_brokers_code_is_refused(gw, world):
    r = _login(gw, world["client_a_email"], broker_code=world["broker_b_code"])
    assert r.status_code == 403
    assert "not registered with the selected broker" in r.json()["detail"]


def test_broker_client_cannot_pick_the_platform_pool(gw, world):
    assert _login(gw, world["client_a_email"], broker_code="").status_code == 403


def test_platform_client_picks_the_platform_pool(gw, world):
    assert _login(gw, world["platform_client_email"], broker_code="").status_code == 200
    assert _login(gw, world["platform_client_email"], broker_code=world["broker_a_code"]).status_code == 403


def test_web_login_without_broker_code_is_unaffected(gw, world):
    assert _login(gw, world["client_b_email"]).status_code == 200


@pytest.mark.parametrize("host", ["tuskaex.com", "trade.tuskaex.com", "speedtrade.tech"])
def test_client_of_broker_with_live_domain_is_sent_home_from_platform_hosts(gw, world, host):
    r = _login(gw, world["client_a_email"], headers={"X-Forwarded-Host": host})
    assert r.status_code == 403
    assert "different broker" in r.json()["detail"]


def test_client_of_broker_without_domain_is_refused_on_platform_hosts_too(gw, world):
    # A broker's clients are the broker's alone, live domain or not. Until the
    # domain is live they sign in through the app with the broker's code.
    r = _login(gw, world["client_b_email"], headers={"X-Forwarded-Host": "tuskaex.com"})
    assert r.status_code == 403
    assert _login(gw, world["client_b_email"], broker_code=world["broker_b_code"]).status_code == 200


# ── The platform has no hand in a broker's clients ─────────────────────────

def test_super_admin_cannot_open_or_act_on_a_brokers_client(adm, world):
    h = admin_headers(world["super"])
    assert adm.get(f"/api/v1/admin/users/{world['client_a']}", headers=h).status_code == 404
    assert adm.post(f"/api/v1/admin/users/{world['client_a']}/ban", headers=h).status_code == 404
    assert sql("SELECT status FROM users WHERE id = :i", i=world["client_a"])[0][0] == "active"


def test_super_admin_still_manages_the_platforms_own_clients(adm, world):
    r = adm.get(f"/api/v1/admin/users/{world['platform_client']}", headers=admin_headers(world["super"]))
    assert r.status_code == 200, r.text


def test_platform_ib_screens_never_offer_a_brokers_client(adm, world):
    r = adm.get("/api/v1/admin/business/ib/users/unassigned",
                params={"per_page": 200}, headers=admin_headers(world["super"]))
    assert r.status_code == 200, r.text
    ids = {i["user_id"] for i in r.json()["items"]}
    assert str(world["platform_client"]) in ids
    assert not ids & {str(world[k]) for k in ("client_a", "client_b", "client_off")}


def test_me_reports_the_users_broker(gw, world):
    me = gw.get("/api/v1/auth/me", headers=user_headers(world["client_a"])).json()
    assert me["broker"]["code"] == world["broker_a_code"]
    assert me["broker"]["brand_name"] == "Alpha Markets"
    plat = gw.get("/api/v1/auth/me", headers=user_headers(world["platform_client"])).json()
    assert plat["broker"] is None


# ─── Tenant domains and CORS ─────────────────────────────────────────────

def _preflight(gw, origin):
    return gw.options("/api/v1/auth/me", headers={
        "Origin": origin, "Access-Control-Request-Method": "GET",
    })


def test_active_tenant_domain_passes_cors(gw, world):
    r = _preflight(gw, "https://alpha-sbt.example")
    assert r.headers.get("access-control-allow-origin") == "https://alpha-sbt.example"


def test_suspended_tenant_domain_is_not_allowed_by_cors(gw, world):
    r = _preflight(gw, "https://gone-sbt.example")
    assert r.headers.get("access-control-allow-origin") != "https://gone-sbt.example"
