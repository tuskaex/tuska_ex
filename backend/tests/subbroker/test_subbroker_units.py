"""TuskaEx-specific values in the ported white-label code."""
import asyncio
from types import SimpleNamespace

from packages.common.src import push, smtp_mail, tenant_brand
from packages.common.src.email_templates.welcome import render_welcome
from services.gateway.src.api.brokers import client_features
from services.gateway.src.services.tenant_resolver import platform_web_hosts


def test_platform_name_is_tuskaex():
    assert tenant_brand.PLATFORM_BRAND_NAME == "TuskaEx"
    assert smtp_mail.PLATFORM_BRAND_NAME == "TuskaEx"


def test_platform_web_hosts_default_to_tuskaex_and_its_terminal(monkeypatch):
    monkeypatch.delenv("PLATFORM_WEB_HOSTS", raising=False)
    assert platform_web_hosts() == {
        "tuskaex.com", "www.tuskaex.com", "trade.tuskaex.com",
        "speedtrade.tech", "www.speedtrade.tech",
    }


def test_client_features_default_on_and_only_false_switches_off():
    assert client_features(None) == {f: True for f in
                                     ("deposits", "withdrawals", "transfers", "copy_trading", "ib_program")}
    owner = SimpleNamespace(client_features={"deposits": False, "transfers": None})
    feats = client_features(owner)
    assert feats["deposits"] is False
    assert feats["transfers"] is True


def test_site_url_only_for_a_ready_domain():
    owner = SimpleNamespace(custom_domain="Broker.Example.", custom_domain_status="READY", app_subdomain="app")
    assert tenant_brand.site_url(owner) == "https://app.broker.example"
    owner.app_subdomain = None
    assert tenant_brand.site_url(owner) == "https://broker.example"
    owner.custom_domain_status = "PENDING_DNS"
    assert tenant_brand.site_url(owner) is None


def test_tenant_email_carries_no_trace_of_the_platform():
    subject, html, text = render_welcome(first_name="Ana", trader_app_url="https://trade.tuskaex.com")
    assert "TuskaEx" in html  # the platform template really does name the platform
    brand = smtp_mail.Brand(name="Alpha Markets", inline_logo=False,
                            site_url="https://alpha.example", admin_url=None, support_email=None)
    s2, h2, t2 = smtp_mail._rebrand(subject, html, text, brand)
    for out in (s2, h2, t2 or ""):
        low = out.lower()
        assert "tuskaex" not in low and "speedtrade" not in low
    assert "Alpha Markets" in h2
    assert "https://alpha.example" in h2
    assert "Trade without giving your money to any broker" not in h2


def test_tenant_email_uses_the_brokers_support_address():
    _, html, _ = render_welcome(first_name="Ana", trader_app_url="https://trade.tuskaex.com")
    brand = smtp_mail.Brand(name="Alpha Markets", inline_logo=False, site_url=None,
                            admin_url=None, support_email="help@alpha.example")
    _, h2, _ = smtp_mail._rebrand("x", html, None, brand)
    assert "support@tuskaex.com" not in h2
    assert "help@alpha.example" in h2


def test_push_scrubber_matches_platform_and_terminal_names():
    for name in ("TuskaEx", "TUSKAEX", "SpeedTrade", "SpeedTrader"):
        assert push._PLATFORM_NAME_RE.fullmatch(name), name
    assert push._PLATFORM_NAME_RE.sub("Alpha", "Your SpeedTrader order on TuskaEx") == "Your Alpha order on Alpha"


def test_tenant_branded_email_is_not_sent_while_tenant_email_is_off(monkeypatch):
    sent = []
    monkeypatch.setattr(smtp_mail, "_send_sync", lambda *a, **k: sent.append(a))
    brand = smtp_mail.Brand(name="Alpha Markets", inline_logo=False, site_url=None,
                            admin_url=None, support_email=None)
    ok = asyncio.run(smtp_mail.send_email("client@alpha.example", "Hi", "<p>x</p>", brand=brand))
    assert ok is False
    assert sent == []
