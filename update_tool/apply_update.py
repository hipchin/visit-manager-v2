#!/usr/bin/env python3
from pathlib import Path
import shutil, sys, re, json

OLD_BUILD = "20260709-update1"
NEW_BUILD = "20260711-mapfix1"
OLD_VERSION = "1.0.9"
NEW_VERSION = "1.0.10"

def fail(msg):
    print("\nエラー:", msg)
    input("\nEnterキーで終了します。")
    raise SystemExit(1)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(f"{label}: 置換対象が {count} 件でした。想定は1件です。ファイルが最新版と異なる可能性があります。")
    return text.replace(old, new, 1)

def append_section(text, marker, section):
    if marker in text:
        return text
    if not text.endswith("\n"):
        text += "\n"
    return text + "\n" + section.strip() + "\n"

base = Path(__file__).resolve().parent.parent
required = [
    base / "index.html",
    base / "sw.js",
    base / "version.json",
    base / "js" / "ui.js",
    base / "js" / "app.js",
    base / "README.md",
    base / "PROJECT_CONTEXT.md",
    base / "CHANGELOG.md",
    base / "TODO.md",
]
missing = [str(p.relative_to(base)) for p in required if not p.exists()]
if missing:
    fail("リポジトリのルートに update_tool フォルダを置いて実行してください。\n不足: " + ", ".join(missing))

backup = base / "_mapfix_backup"
if backup.exists():
    shutil.rmtree(backup)
for p in required:
    dest = backup / p.relative_to(base)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, dest)

# ui.js
p = base / "js" / "ui.js"
t = p.read_text(encoding="utf-8")
old = """  function toNumberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }"""
new = """  function toNumberOrNull(value) {
    if (value === null || value === undefined || String(value).trim() === '') {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }"""
t = replace_once(t, old, new, "js/ui.js toNumberOrNull")

old = """  function hasLatLng(entry) {
    return Number.isFinite(Number(entry && entry.lat)) && Number.isFinite(Number(entry && entry.lng));
  }"""
new = """  function hasLatLng(entry) {
    if (!entry || entry.lat === null || entry.lat === undefined || entry.lng === null || entry.lng === undefined) return false;
    if (String(entry.lat).trim() === '' || String(entry.lng).trim() === '') return false;
    const lat = Number(entry.lat);
    const lng = Number(entry.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  }"""
t = replace_once(t, old, new, "js/ui.js hasLatLng")
p.write_text(t, encoding="utf-8")

# app.js
p = base / "js" / "app.js"
t = p.read_text(encoding="utf-8")
t = t.replace(f"const APP_BUILD_ID = '{OLD_BUILD}';", f"const APP_BUILD_ID = '{NEW_BUILD}';", 1)

old = """    function hasLatLng(entry) {
      return Number.isFinite(Number(entry && entry.lat)) && Number.isFinite(Number(entry && entry.lng));
    }"""
new = """    function hasLatLng(entry) {
      if (!entry || entry.lat === null || entry.lat === undefined || entry.lng === null || entry.lng === undefined) return false;
      if (String(entry.lat).trim() === '' || String(entry.lng).trim() === '') return false;
      const lat = Number(entry.lat);
      const lng = Number(entry.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    }"""
t = replace_once(t, old, new, "js/app.js hasLatLng")

old = """  function openMap(address, lat, lng) {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(latNum + ',' + lngNum)}`, '_blank');
      return;
    }"""
new = """  function openMap(address, lat, lng) {
    const hasRawLat = lat !== null && lat !== undefined && String(lat).trim() !== '';
    const hasRawLng = lng !== null && lng !== undefined && String(lng).trim() !== '';
    const latNum = hasRawLat ? Number(lat) : NaN;
    const lngNum = hasRawLng ? Number(lng) : NaN;
    if (Number.isFinite(latNum) && Number.isFinite(lngNum) && !(latNum === 0 && lngNum === 0)) {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(latNum + ',' + lngNum)}`, '_blank');
      return;
    }"""
t = replace_once(t, old, new, "js/app.js openMap")
p.write_text(t, encoding="utf-8")

# index.html: cache busting
p = base / "index.html"
t = p.read_text(encoding="utf-8")
if OLD_BUILD not in t:
    fail("index.html: 現在のビルドIDが想定と異なります。")
t = t.replace(OLD_BUILD, NEW_BUILD)
p.write_text(t, encoding="utf-8")

# sw.js
p = base / "sw.js"
t = p.read_text(encoding="utf-8")
t = replace_once(t, f"const CACHE_VERSION = 'visit-manager-v{OLD_BUILD}';",
                 f"const CACHE_VERSION = 'visit-manager-v{NEW_BUILD}';", "sw.js")
p.write_text(t, encoding="utf-8")

# version.json
p = base / "version.json"
data = json.loads(p.read_text(encoding="utf-8"))
data.update({
    "buildId": NEW_BUILD,
    "appVersion": NEW_VERSION,
    "releasedAt": "2026-07-11",
    "notes": "住所手入力時に空座標が0,0としてGoogleマップへ渡される問題を修正"
})
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# db.js version if present
db = base / "js" / "db.js"
if db.exists():
    dt = db.read_text(encoding="utf-8")
    if OLD_VERSION in dt:
        dt = dt.replace(OLD_VERSION, NEW_VERSION, 1)
        db.write_text(dt, encoding="utf-8")

# README
p = base / "README.md"
t = p.read_text(encoding="utf-8")
section = """
## 住所手入力時のGoogleマップ連携

- 現在地または地図から取得した有効な座標がある場合は、座標を優先してGoogleマップを開きます。
- 住所を手入力した場合は座標をクリアし、入力された住所文字列をそのままGoogleマップへ渡します。
- `岸谷4-4-4` のような短縮住所は、Googleマップ側の検索・推測に任せます。
- 空欄座標および誤って保存された `0,0` は有効な座標として扱いません。
"""
t = append_section(t, "## 住所手入力時のGoogleマップ連携", section)
p.write_text(t, encoding="utf-8")

# PROJECT_CONTEXT
p = base / "PROJECT_CONTEXT.md"
t = p.read_text(encoding="utf-8")
section = """
## 住所手入力とGoogleマップ連携

- 住所の手入力時は、既存座標との不一致を避けるため緯度・経度を空欄にする。
- 空欄の緯度・経度は `null` として扱い、JavaScriptの `Number('') === 0` による誤判定を防ぐ。
- 緯度・経度が両方とも有効で、かつ `0,0` ではない場合だけ座標を優先する。
- 有効な座標がない場合は、住所欄または一覧表示名の文字列をそのままGoogleマップへ渡す。
- 短縮住所の地域補完はアプリ側で固定せず、Googleマップ側の検索・推測に任せる。
- 既存データに `lat: 0`、`lng: 0` が残っていても、ナビ時には住所へフォールバックする。
"""
t = append_section(t, "## 住所手入力とGoogleマップ連携", section)
p.write_text(t, encoding="utf-8")

# CHANGELOG
p = base / "CHANGELOG.md"
t = p.read_text(encoding="utf-8")
entry = """## 2026-07-11 住所手入力時のGoogleマップ連携修正

### Added

- 空欄座標と `0,0` を無効座標として扱う判定を追加
- 有効な座標がない場合に住所文字列へフォールバックする処理を追加

### Changed

- アプリ内部バージョンを `1.0.10` に更新
- ビルドIDを `20260711-mapfix1` に更新
- 短縮住所は地域を固定補完せず、Googleマップ側の検索・推測に任せる仕様を明文化

### Fixed

- 住所を手入力した際、空欄の緯度・経度が `0,0` として保存・判定され、Googleマップが誤った場所を開く問題を修正
- 既存データに `0,0` が保存されている場合も、住所検索へフォールバックするよう修正

### Removed

- なし

---
"""
if "## 2026-07-11 住所手入力時のGoogleマップ連携修正" not in t:
    marker = "## Unreleased"
    idx = t.find("---", t.find(marker))
    if idx != -1:
        idx = t.find("\n", idx) + 1
        t = t[:idx] + "\n" + entry + "\n" + t[idx:]
    else:
        t = entry + "\n" + t
p.write_text(t, encoding="utf-8")

# TODO
p = base / "TODO.md"
t = p.read_text(encoding="utf-8")
section = """
## Googleマップ連携

- [x] 住所手入力時の空欄座標を `null` として扱う
- [x] `0,0` を無効座標として扱う
- [x] 有効な座標がない場合は住所検索へフォールバックする
- [x] 短縮住所の地域補完を固定せずGoogleマップ側へ任せる
- [ ] iPhone Safariで完全住所・短縮住所・既存 `0,0` データの動作確認
"""
t = append_section(t, "## Googleマップ連携", section)
p.write_text(t, encoding="utf-8")

print("\n修正完了")
print("バックアップ:", backup)
print("更新ファイル:")
for rel in [
    "index.html", "sw.js", "version.json", "js/ui.js", "js/app.js",
    "js/db.js", "README.md", "PROJECT_CONTEXT.md", "CHANGELOG.md", "TODO.md"
]:
    if (base / rel).exists():
        print(" -", rel)
input("\nEnterキーで終了します。")
