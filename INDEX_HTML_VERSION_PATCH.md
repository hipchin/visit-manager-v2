# index.html バージョン置換メモ

`index.html` 内に次の文字列が残っている場合だけ置換してください。

置換前:

```text
20260630-location1
```

置換後:

```text
20260709-speed1
```

対象行:

```html
<link rel="stylesheet" href="css/style.css?v=20260630-location1">
<script src="js/db.js?v=20260630-location1"></script>
<script src="js/tags.js?v=20260630-location1"></script>
<script src="js/ui.js?v=20260630-location1"></script>
<script src="js/app.js?v=20260630-location1"></script>
```

置換後:

```html
<link rel="stylesheet" href="css/style.css?v=20260709-speed1">
<script src="js/db.js?v=20260709-speed1"></script>
<script src="js/tags.js?v=20260709-speed1"></script>
<script src="js/ui.js?v=20260709-speed1"></script>
<script src="js/app.js?v=20260709-speed1"></script>
```

HTML構造や既存コメントは変更しないでください。
