# Volleyball Quick Tagger

限定公開YouTube動画から、バレーボールの一部プレーだけをタグ付けして見返すための静的Webアプリです。

最初のMVPで対応しているタグは次の2つだけです。

- サーブ
- アタック

トス・セットのタグ付けは実装していません。YouTube Data APIは使わず、動画のダウンロード・編集・保存もしません。保存するのはタグデータだけです。

## macOSでローカル実行する

YouTube IFrame Player APIを安定して読み込むため、ファイルを直接開くのではなくローカルWebサーバー経由で開きます。

```sh
cd /Users/yoshikawat/Documents/Codex/2026-05-24/i-am-using-the-codex-desktop/volleyball-youtube-tagger
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで次を開きます。

```text
http://127.0.0.1:8000
```

停止するときは、Terminalで `Control-C` を押します。

## 基本的な使い方

1. 限定公開YouTube URL、または11文字の動画IDを入力します。
2. **動画読み込み** を押します。
3. 動画タイトルは動画読み込み後に自動取得されます。
4. チームA名、チームB名、各チームの背番号リストを設定します。
5. チームAまたはチームBを選びます。
6. 背番号をタップします。
7. 再生中の時刻で **サーブをタグ** または **アタックをタグ** を押します。
8. タグ一覧で時刻、チーム、プレー種別、背番号を編集できます。
9. プレー種別、チーム、背番号で絞り込めます。
10. タグの何秒前から何秒後まで再生するかを選びます。
11. **絞り込みタグを連続再生** で、該当タグを順番に再生します。
12. 必要に応じてJSONを書き出し、あとで読み込んで作業を続けます。

## iPadで使う

GitHub PagesなどにホストしたURLをiPad Safariで開きます。同じWi-Fi内でMacのローカルサーバーにアクセスすることもできます。

iPad操作を想定して、次のUIを大きめにしています。

- チーム選択ボタン
- 背番号ボタン
- サーブ・アタックのタグボタン
- 再生範囲の「前」「後」秒数ボタン

iPad Safariでは、YouTube iframeとブラウザの自動再生制限により、再生・一時停止や連続再生にユーザー操作が必要になる場合があります。

## GitHub Pagesで公開する

このプロジェクトはHTML、CSS、JavaScript、JSONだけでできているため、GitHub Pagesにそのまま置けます。

公開する場合は、リポジトリに次のアプリ本体だけを置くのがおすすめです。

- `index.html`
- `style.css`
- `app.js`
- `README.md`
- `sample-project.json`

実データ入りJSON、個人情報、非公開にしたいYouTube URLは公開リポジトリに入れないでください。実際のタグデータは、アプリ上のJSON書き出し・読み込みで手元管理するのが安全です。

## データ形式

JSONはおおむね次の形式です。

```json
{
  "projectName": "動画タイトル",
  "youtubeVideoId": "XXXXXXXXXXX",
  "teams": {
    "A": {
      "name": "チームA",
      "jerseyNumbers": [1, 2, 3, 4, 5, 6]
    },
    "B": {
      "name": "チームB",
      "jerseyNumbers": [7, 8, 9, 10, 11, 12]
    }
  },
  "tags": [
    {
      "id": "tag-001",
      "youtubeVideoId": "XXXXXXXXXXX",
      "time": 123.45,
      "team": "A",
      "play": "serve",
      "jerseyNumber": 8,
      "label": "A_serve_8"
    }
  ]
}
```

画面表示は日本語ですが、JSON内の `play` は `serve` / `attack` で保存します。古い `spike` のJSONは読み込み時に `attack` として扱います。

JSON内の `projectName` には、YouTube IFrame Player APIから取得した動画タイトルを保存します。

アプリは作業中のデータを `localStorage` にも保存します。ただし、確実な保存・バックアップ方法はJSON書き出しです。

## 制限

- YouTube IFrame Player APIで埋め込み再生を操作するだけです。
- YouTube Data APIは使いません。
- YouTube動画ファイルにはアクセスしません。
- 実際のMP4クリップ書き出しは初期版には含まれていません。
- 保存するのはタグデータだけで、動画ファイルは保存しません。
- ブラウザやiPad Safariの自動再生制限により、連続再生が完全自動で動かない場合があります。
