# Verification Commands

Run these from the project root. Each command's expected exit value is documented inline.

## a11y

```bash
# axe-core / Lighthouse: 0 critical
npx @axe-core/cli http://localhost:3000/components 2>&1 | tail -5
echo "EXIT=$?"
```

## Keyboard

```bash
# Manual Tab order + Enter/Space activation
# (no script substitute — manual keyboard walkthrough required)
```

## Design token

```bash
# Component file has no raw hex / no off-scale spacing
grep -nE "#[0-9a-fA-F]{3,8}" src/components/TaskList/*.tsx  # should return 0
grep -nE "(padding|margin|gap|width|height):\s*[0-9]+(\.[0-9]+)?(px|rem|em)\b" \
  src/components/TaskList/*.tsx  # 0 outside spacing scale
echo "EXIT=$?"
```

## img container

```bash
# No aspect-ratio lock / no width:min + padding-inline compound
grep -nE "aspect-ratio:\s*[0-9]+/[0-9]+|padding-bottom:\s*[0-9]+%" src/  # should return 0
echo "EXIT=$?"
```

## Component size

```bash
# Single component > 200 lines = split
find src/components -name "*.tsx" -exec wc -l {} \; | awk '$1 > 200 { print }'  # should return 0
echo "EXIT=$?"
```

## Interactive elements

```bash
# 0 <div onClick> / <span onClick>
grep -rnE "<(div|span)[^>]+\bonClick=" src/  # should return 0
echo "EXIT=$?"
```

## img alt

```bash
# 0 img without alt
grep -rnE "<img(?![^>]*\balt=)" src/  # should return 0
echo "EXIT=$?"
```