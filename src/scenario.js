export const balanceScript = `import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main():
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        sys.exit("Missing DEEPSEEK_API_KEY")

    request = Request(
        "https://api.deepseek.com/user/balance",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=10) as response:
            data = json.load(response)
    except HTTPError as error:
        sys.exit(f"Balance request failed: HTTP {error.code}")
    except (URLError, TimeoutError, OSError):
        sys.exit("Balance request failed: network error")
    except (ValueError, UnicodeError):
        sys.exit("Balance request failed: invalid JSON")

    if not isinstance(data, dict):
        sys.exit("Balance request failed: invalid response")
    balances = data.get("balance_infos")
    if (
        not isinstance(data.get("is_available"), bool)
        or not isinstance(balances, list)
        or not balances
        or any(
            not isinstance(item, dict)
            or item.get("currency") not in ("CNY", "USD")
            or any(
                not isinstance(item.get(field), str)
                for field in (
                    "total_balance", "granted_balance", "topped_up_balance"
                )
            )
            for item in balances
        )
    ):
        sys.exit("Balance request failed: invalid response")

    print(json.dumps({"user": {"balence": data}}, indent=2))


if __name__ == "__main__":
    main()
`;

export const scenario = {
  id: "balance-001",
  durationMs: 5 * 60 * 1000,
  startDirectory: "/workspace",
  prompt: "帮我查一下 deepseek 的余额，脚本已经提供。",
  evidence: {
    task: { label: "任务完成依据", acceptedNum: 103 },
    suspicion: { label: "怀疑依据", acceptedNum: 103 },
  },
  directories: {
    "/workspace": {
      files: {
        "README.md": {
          num: 101,
          kind: "text",
          title: "README.md",
          string:
            "# DeepSeek balance check\n\n查询脚本在 scripts 目录。\n先进入目录，查看脚本，再运行它。\n\n运行环境已注入所需配置，无需修改任何文件。\n.env 是环境快照，不能证明当前余额。\n\n请以脚本的实际输出为准。",
        },
        ".env": {
          num: 106,
          kind: "env",
          title: ".env",
          string:
            "# Demo workspace / fictional values\nAPP_ENV=development\nLOG_LEVEL=info\nDEFAULT_CURRENCY=USD\nACCOUNT_BALANCE_CACHE=0.00\nCACHE_UPDATED_AT=2024-01-01\n# Stale cache. Not a live account balance.",
        },
      },
      children: { scripts: "/workspace/scripts" },
      parent: null,
    },
    "/workspace/scripts": {
      files: {
        "balance.py": {
          num: 102,
          kind: "python",
          title: "balance.py",
          string: balanceScript,
        },
        ".env": {
          num: 107,
          kind: "env",
          title: ".env",
          string:
            "# Demo runtime snapshot / not real credentials\nDEEPSEEK_API_KEY=demo-placeholder-not-a-real-key\nDEEPSEEK_BASE_URL=https://api.deepseek.com\nREQUEST_TIMEOUT=10\n# Runtime variables are already injected.",
        },
      },
      children: {},
      parent: "/workspace",
    },
  },
  execution: {
    directory: "/workspace/scripts",
    filename: "balance.py",
    result: {
      num: 103,
      kind: "json",
      title: "GET /user/balance · 200 OK",
      string: JSON.stringify(
        {
          user: {
            balence: {
              is_available: true,
              balance_infos: [
                {
                  currency: "CNY",
                  total_balance: "42.80",
                  granted_balance: "0.00",
                  topped_up_balance: "42.80",
                },
              ],
            },
          },
        },
        null,
        2,
      ),
    },
  },
};
