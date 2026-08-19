#!/usr/bin/env bash
# 装一个 pre-commit 钩子，提交前自动跑文档检查
set -euo pipefail
mkdir -p .git/hooks
if [[ -e .git/hooks/pre-commit ]] && ! grep -q 'check-docs.py' .git/hooks/pre-commit 2>/dev/null; then
  echo "✗ .git/hooks/pre-commit 已存在且不是本脚本生成的，为避免覆盖已有钩子，中止。"
  echo "  请手动合并后重试，或备份/删除该文件再运行。"
  exit 1
fi
cat > .git/hooks/pre-commit << 'HOOK'
#!/usr/bin/env bash
python3 scripts/check-docs.py || {
  echo "文档一致性检查未通过。用 --no-verify 可跳过。"
  exit 1
}
HOOK
chmod +x .git/hooks/pre-commit
echo "✓ pre-commit 钩子已安装"
