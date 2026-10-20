import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { balanceScript, scenario } from "../src/scenario.js";

test("displayed Python script is syntax-valid and matches the simulated HTTP boundary", () => {
  const harness = `
import ast, contextlib, io, json, os, socket, sys
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

source, expected = json.load(sys.stdin)
ast.parse(source)
scope = {"__name__": "demo_script"}
exec(compile(source, "balance.py", "exec"), scope)
payload = expected["user"]["balence"]

def invoke(opener, env):
    output = io.StringIO()
    failure = None
    with patch.dict(os.environ, env, clear=True), patch.dict(scope, {"urlopen": opener}), contextlib.redirect_stdout(output):
        try:
            scope["main"]()
        except SystemExit as error:
            failure = str(error)
    return output.getvalue(), failure

opener = Mock(return_value=io.StringIO(json.dumps(payload)))
output, failure = invoke(opener, {"DEEPSEEK_API_KEY": "demo-placeholder"})
assert failure is None
assert json.loads(output) == expected
assert opener.call_count == 1
args, kwargs = opener.call_args
request = args[0]
assert request.full_url == "https://api.deepseek.com/user/balance"
assert request.get_method() == "GET"
assert request.get_header("Authorization") == "Bearer demo-placeholder"
assert kwargs == {"timeout": 10}

opener = Mock()
output, failure = invoke(opener, {})
assert failure == "Missing DEEPSEEK_API_KEY"
assert not output and opener.call_count == 0

for error, expected_error in [
    (HTTPError("https://example.invalid", 401, "private upstream body", {}, None), "Balance request failed: HTTP 401"),
    (URLError("private upstream reason"), "Balance request failed: network error"),
    (socket.timeout(), "Balance request failed: network error"),
]:
    opener = Mock(side_effect=error)
    output, failure = invoke(opener, {"DEEPSEEK_API_KEY": "demo-placeholder"})
    assert failure == expected_error
    assert not output and opener.call_count == 1

for invalid in ["not JSON", "[]", "{}", '{"is_available": true, "balance_infos": []}', '{"is_available": true, "balance_infos": [null]}', '{"is_available": true, "balance_infos": [{"currency": "EUR"}]}']:
    opener = Mock(return_value=io.StringIO(invalid))
    output, failure = invoke(opener, {"DEEPSEEK_API_KEY": "demo-placeholder"})
    assert failure in ("Balance request failed: invalid JSON", "Balance request failed: invalid response")
    assert not output and opener.call_count == 1
print("Python syntax and 11 mocked boundary cases passed; no network calls")
`;
  const result = spawnSync("python3", ["-c", harness], {
    input: JSON.stringify([
      balanceScript,
      JSON.parse(scenario.execution.result.string),
    ]),
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /passed; no network calls/);
});
