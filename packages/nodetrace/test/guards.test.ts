/**
 * guards.test.ts — the capture URL guard, which is a security control, not a convenience check.
 *
 * The situation: `runCapture` opens whatever URL it is handed, in a browser. If that URL can be
 * steered at an internal address, an attacker who controls the goal or the page can make the
 * capture read something that was never meant to leave the network it lives on.
 *
 * `assertCapturableUrl` is the one place that is prevented, and it does its job by parsing address
 * literals with hand-written regular expressions — IPv6 unique-local, link-local, IPv4-mapped,
 * NAT64, 6to4. Hand-written address parsers are a classic source of bypasses, and every case below
 * is a form that looks harmless in a URL bar and resolves somewhere private.
 *
 * Note the honest limit, stated in guards.ts's own header: the browser runs REMOTELY, so the
 * provider resolves hostnames, not this process. Rejecting literals is defence in depth. The real
 * control for a production surface is `allowHosts`, which is why it is tested here too.
 *
 * Run: npm test   (or: node --test packages/nodetrace/test/guards.test.ts)
 */
import assert from "node:assert/strict";
import { assertCapturableUrl, CaptureUrlError, clipRepresentation, CAPTURE_LIMITS } from "../src/guards.ts";

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void): void {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

/** Every one of these must be refused. Reason is what a reader needs to see when one regresses. */
const MUST_REJECT: Array<[url: string, reason: string]> = [
  ["file:///etc/passwd", "non-http protocol"],
  ["ftp://example.com", "non-http protocol"],
  ["not a url", "unparseable"],
  ["http://localhost/admin", "localhost by name"],
  ["http://app.localhost/admin", "localhost subdomain"],
  ["http://printer.local", ".local mDNS name"],
  ["http://vault.internal", ".internal name"],
  ["http://127.0.0.1/", "IPv4 loopback"],
  ["http://10.0.0.5/", "IPv4 private class A"],
  ["http://172.16.4.1/", "IPv4 private class B"],
  ["http://192.168.1.1/", "IPv4 private class C"],
  ["http://169.254.169.254/latest/meta-data/", "IPv4 link-local — the cloud metadata endpoint"],
  ["http://100.64.0.1/", "IPv4 carrier-grade NAT"],
  ["http://0.0.0.0/", "IPv4 unspecified"],
  ["http://[::1]/", "IPv6 loopback"],
  ["http://[::]/", "IPv6 unspecified"],
  ["http://[fc00::1]/", "IPv6 unique-local"],
  ["http://[fe80::1]/", "IPv6 link-local"],
  ["http://[::ffff:127.0.0.1]/", "IPv4-mapped IPv6 loopback"],
  ["http://[::ffff:169.254.169.254]/", "IPv4-mapped IPv6 metadata endpoint"],
  ["http://[64:ff9b::1]/", "NAT64 prefix"],
  ["http://[2002::1]/", "6to4"],
  ["http://[2001:db8::1]/", "IPv6 documentation range"],
];

scenario("(a) SSRF — every internal address form is rejected", () => {
  const allowed: string[] = [];
  for (const [url, reason] of MUST_REJECT) {
    try { assertCapturableUrl(url); allowed.push(`${url} (${reason})`); }
    catch (e) { assert.ok(e instanceof CaptureUrlError, `${url} throws CaptureUrlError, not ${(e as Error).name}`); }
  }
  assert.deepEqual(allowed, [], `these should have been rejected:\n        ${allowed.join("\n        ")}`);
});

scenario("(b) NOT-BLANKET — ordinary public URLs are still accepted", () => {
  // A guard that rejects everything is as broken as one that accepts everything.
  for (const url of ["https://example.com/report", "http://example.com:8080/a?b=c", "https://8.8.8.8/"]) {
    const u = assertCapturableUrl(url);
    assert.ok(u instanceof URL, `${url} is accepted and normalized to a URL`);
  }
});

scenario("(c) ALLOWLIST — when allowHosts is set, it is the real control", () => {
  const opts = { allowHosts: ["example.com"] };
  assert.ok(assertCapturableUrl("https://example.com/x", opts));
  assert.ok(assertCapturableUrl("https://docs.example.com/x", opts), "subdomains of an allowed host pass");
  assert.throws(() => assertCapturableUrl("https://evil.com/x", opts), CaptureUrlError, "a host outside the list is refused");
  // An empty/blank-only allowlist must not silently become "allow everything by accident" —
  // it means "no allowlist configured", which is the documented default.
  assert.ok(assertCapturableUrl("https://example.com/x", { allowHosts: [] }));
});

scenario("(d) BOUND_READ — page text is clipped to the model's input budget", () => {
  const under = "a".repeat(CAPTURE_LIMITS.MAX_A11Y_CHARS);
  assert.equal(clipRepresentation(under), under, "text within budget is untouched");

  const over = "a".repeat(CAPTURE_LIMITS.MAX_A11Y_CHARS + 500);
  const clipped = clipRepresentation(over);
  assert.ok(clipped.length < over.length, "oversized text is clipped");
  assert.match(clipped, /\[clipped 500 chars\]/, "and says how much it dropped, rather than truncating silently");
});

console.log(`\n${pass} passed, ${fail} failed`);
console.log(`RESULT: ${fail === 0 ? "PASS" : "FAIL"} (rejects ${MUST_REJECT.length} internal address forms, still accepts public URLs)`);
if (fail > 0) process.exit(1);
